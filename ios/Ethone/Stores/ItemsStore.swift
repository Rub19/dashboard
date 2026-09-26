import Foundation
import Observation

/// Ligne de la table `tasks` : c'est celle que lit et écrit la page « Tâches » du site (`useTasks`), et non `ethone_items`.
struct CloudTaskRow: Codable {
    let id: String
    var title: String
    var description: String?
    var isCompleted: Bool
    var priority: String?
    var dueDate: Date?
    var createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, title, description, priority
        case isCompleted = "is_completed"
        case dueDate = "due_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// Les vues manipulent des `Item` : la priorité et l'échéance sont exposées dans `data`, comme sur le site.
    var item: Item {
        var data: [String: JSONValue] = ["priority": .string(priority ?? "medium")]
        if let dueDate { data["dueDate"] = .string(ISODate.string(dueDate)) }
        return Item(id: id, kind: "task", title: title, body: description, done: isCompleted, startAt: nil, endAt: nil,
                    data: .object(data), createdAt: createdAt, updatedAt: updatedAt)
    }
}

/// Notes, tâches ou événements avec cache disque et retour arrière en cas d'échec. Notes et événements sont les lignes
/// `ethone_items` du site ; les tâches sont les lignes de la table `tasks` (celle de la page Tâches du site).
@MainActor
@Observable
final class ItemsStore {
    let kind: ItemKind
    private let api: APIClient

    private(set) var items: [Item] = []
    private(set) var isLoading = false
    private(set) var hasLoaded = false
    var errorMessage: String?

    private var isTask: Bool { kind == .task }
    private var table: String { isTask ? "tasks" : "ethone_items" }

    private var cacheKey: String { "items-\(kind.rawValue)-\(api.auth.user?.id ?? "anon")" }

    init(kind: ItemKind, api: APIClient) {
        self.kind = kind
        self.api = api
    }

    func refresh() async {
        if items.isEmpty, let cached = DiskCache.read([Item].self, key: cacheKey) { items = cached }
        isLoading = true
        defer { isLoading = false }
        do {
            let fetched: [Item]
            if isTask {
                let rows: [CloudTaskRow] = try await api.list("tasks", query: [URLQueryItem(name: "order", value: "updated_at.desc")])
                fetched = rows.map(\.item)
            } else {
                fetched = try await api.list("ethone_items", query: [
                    URLQueryItem(name: "kind", value: "eq.\(kind.rawValue)"),
                    URLQueryItem(name: "order", value: "updated_at.desc"),
                ])
            }
            items = fetched
            hasLoaded = true
            errorMessage = nil
            DiskCache.write(fetched, key: cacheKey)
        } catch {
            if !hasLoaded && !items.isEmpty { hasLoaded = true }
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    @discardableResult
    func create(title: String, body: String? = nil, start: Date? = nil, end: Date? = nil, data: JSONValue? = nil) async -> Item? {
        var fields: [String: JSONValue] = ["kind": .string(kind.rawValue), "title": .string(title)]
        if let body { fields["body"] = .string(body) }
        if let start { fields["start_at"] = .string(ISODate.string(start)) }
        if let end { fields["end_at"] = .string(ISODate.string(end)) }
        if let data { fields["data"] = data }
        if isTask {
            // Table `tasks` : priorité limitée à low/medium/high (« urgent » du site devient « high »), échéance dans due_date.
            let requested = data?["priority"]?.stringValue ?? "medium"
            fields = [
                "title": .string(title),
                "is_completed": .bool(false),
                "priority": .string(requested == "urgent" ? "high" : (["low", "medium", "high"].contains(requested) ? requested : "medium")),
            ]
            if let body { fields["description"] = .string(body) }
            if let due = data?["dueDate"]?.stringValue { fields["due_date"] = .string(due) }
        }
        do {
            let created: Item
            if isTask {
                created = try await api.insert("tasks", fields: fields, as: CloudTaskRow.self).item
            } else {
                created = try await api.insert("ethone_items", fields: fields)
            }
            items.insert(created, at: 0)
            persist()
            errorMessage = nil
            return created
        } catch {
            errorMessage = message(error)
            return nil
        }
    }

    func update(_ item: Item, title: String, body: String?) async {
        var fields: [String: JSONValue] = ["title": .string(title)]
        if let body { fields[isTask ? "description" : "body"] = .string(body) }
        await apply(item, fields: fields) { updated in
            updated.title = title
            if let body { updated.body = body }
        }
    }

    func updateEvent(_ item: Item, title: String, start: Date, end: Date?) async {
        var fields: [String: JSONValue] = ["title": .string(title), "start_at": .string(ISODate.string(start))]
        fields["end_at"] = end.map { .string(ISODate.string($0)) } ?? .null
        await apply(item, fields: fields) { updated in
            updated.title = title
            updated.startAt = start
            updated.endAt = end
        }
    }

    func setDone(_ item: Item, _ done: Bool) async {
        await apply(item, fields: [isTask ? "is_completed" : "done": .bool(done)]) { $0.done = done }
    }

    func delete(_ item: Item) async {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        let removed = items.remove(at: index)
        persist()
        do {
            try await api.remove(table, id: item.id)
            errorMessage = nil
        } catch {
            items.insert(removed, at: min(index, items.count))
            persist()
            errorMessage = message(error)
        }
    }

    // MARK: Interne

    private func apply(_ item: Item, fields: [String: JSONValue], mutate: (inout Item) -> Void) async {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        let before = items[index]
        var after = before
        mutate(&after)
        after.updatedAt = Date()
        items[index] = after
        persist()
        do {
            let saved: Item?
            if isTask {
                let row: CloudTaskRow? = try await api.patch("tasks", id: item.id, fields: fields)
                saved = row?.item
            } else {
                saved = try await api.patch("ethone_items", id: item.id, fields: fields)
            }
            if let saved, let current = items.firstIndex(where: { $0.id == item.id }) {
                items[current] = saved
                persist()
            }
            errorMessage = nil
        } catch {
            if let current = items.firstIndex(where: { $0.id == item.id }) { items[current] = before }
            persist()
            errorMessage = message(error)
        }
    }

    private func persist() { DiskCache.write(items, key: cacheKey) }

    private func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
