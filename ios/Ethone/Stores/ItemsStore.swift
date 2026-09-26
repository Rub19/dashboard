import Foundation
import Observation

/// Notes, tâches ou événements : mêmes lignes `ethone_items` que le site, avec cache disque et retour arrière en cas d'échec.
@MainActor
@Observable
final class ItemsStore {
    let kind: ItemKind
    private let api: APIClient

    private(set) var items: [Item] = []
    private(set) var isLoading = false
    private(set) var hasLoaded = false
    var errorMessage: String?

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
            let fetched: [Item] = try await api.list("ethone_items", query: [
                URLQueryItem(name: "kind", value: "eq.\(kind.rawValue)"),
                URLQueryItem(name: "order", value: "updated_at.desc"),
            ])
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
        if kind == .task { fields["done"] = .bool(false) }
        if let start { fields["start_at"] = .string(ISODate.string(start)) }
        if let end { fields["end_at"] = .string(ISODate.string(end)) }
        if let data { fields["data"] = data }
        do {
            let created: Item = try await api.insert("ethone_items", fields: fields)
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
        if let body { fields["body"] = .string(body) }
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
        await apply(item, fields: ["done": .bool(done)]) { $0.done = done }
    }

    func delete(_ item: Item) async {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        let removed = items.remove(at: index)
        persist()
        do {
            try await api.remove("ethone_items", id: item.id)
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
            if let saved: Item = try await api.patch("ethone_items", id: item.id, fields: fields),
               let current = items.firstIndex(where: { $0.id == item.id }) {
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
