import Foundation
import Combine

struct TaskItem: Identifiable, Codable, Sendable {
    let id: String
    var title: String
    var done: Bool
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, done
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct NoteItem: Identifiable, Codable, Sendable {
    let id: String
    var title: String
    var body: String
    var createdAt: String?
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, body
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum SupabaseClientError: Error {
    case missingConfiguration
    case invalidURL
    case request(Error)
    case http(Int)
    case decoding(Error)
    case encoding
}

@MainActor
final class SupabaseManager: ObservableObject {
    @Published var tasks: [TaskItem] = []
    @Published var notes: [NoteItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let baseURL: URL?
    private let anonKey: String?
    private var userId: String

    init(userId: String = "") {
        self.userId = userId
        let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
        let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String

        if let urlString = urlString, let url = URL(string: urlString), !urlString.contains("placeholder"), let key = key, !key.contains("placeholder") {
            baseURL = url
            anonKey = key
        } else {
            baseURL = nil
            anonKey = nil
        }
    }

    func setUserId(_ userId: String) {
        self.tasks = []
        self.notes = []
        self.userId = userId
        Task { await syncAll() }
    }

    func syncAll() async {
        guard baseURL != nil, anonKey != nil, !userId.isEmpty else {
            errorMessage = "Configuration Supabase ou identifiant utilisateur manquant."
            return
        }

        isLoading = true
        errorMessage = nil

        async let t = fetchTasks()
        async let n = fetchNotes()

        do {
            let (fetchedTasks, fetchedNotes) = try (await t, await n)
            tasks = fetchedTasks
            notes = fetchedNotes
        } catch {
            errorMessage = "Erreur de synchronisation."
        }

        isLoading = false
    }

    private func fetchTasks() async throws -> [TaskItem] {
        try await fetchItems(kind: "task")
    }

    private func fetchNotes() async throws -> [NoteItem] {
        try await fetchItems(kind: "note")
    }

    private func fetchItems<T: Decodable>(kind: String) async throws -> [T] {
        guard let baseURL, !userId.isEmpty, let anonKey else {
            throw SupabaseClientError.missingConfiguration
        }

        var components = URLComponents(url: baseURL.appendingPathComponent("/rest/v1/ethone_items"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "user_id", value: "eq.\(userId)"),
            URLQueryItem(name: "kind", value: "eq.\(kind)"),
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "updated_at.desc")
        ]

        guard let url = components.url else { throw SupabaseClientError.invalidURL }

        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseClientError.http(http.statusCode)
        }

        do {
            return try JSONDecoder().decode([T].self, from: data)
        } catch {
            throw SupabaseClientError.decoding(error)
        }
    }

    func createTask(title: String) async {
        do {
            let body: [String: Any] = [
                "user_id": userId,
                "kind": "task",
                "title": title,
                "body": "",
                "done": false,
            ]
            try await insert(body)
            await syncAll()
            Haptic.success()
        } catch {
            errorMessage = "Impossible de créer la tâche."
        }
    }

    func toggleDone(_ task: TaskItem) async {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].done.toggle()
        do {
            try await patch(id: task.id, fields: ["done": tasks[index].done])
            await syncAll()
        } catch {
            tasks[index].done.toggle()
            errorMessage = "Erreur de mise à jour."
        }
    }

    func deleteTask(_ task: TaskItem) async {
        do {
            try await delete(id: task.id)
            await syncAll()
            Haptic.warning()
        } catch {
            errorMessage = "Erreur de suppression."
        }
    }

    private func insert(_ body: [String: Any]) async throws {
        guard let baseURL, let anonKey, !userId.isEmpty else { throw SupabaseClientError.missingConfiguration }
        guard let json = try? JSONSerialization.data(withJSONObject: body) else { throw SupabaseClientError.encoding }

        let url = baseURL.appendingPathComponent("/rest/v1/ethone_items")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.httpBody = json

        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseClientError.http(http.statusCode)
        }
    }

    private func patch(id: String, fields: [String: Any]) async throws {
        guard let baseURL, let anonKey, !userId.isEmpty else { throw SupabaseClientError.missingConfiguration }

        var components = URLComponents(url: baseURL.appendingPathComponent("/rest/v1/ethone_items"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(id)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]

        guard let url = components.url else { throw SupabaseClientError.invalidURL }

        guard let json = try? JSONSerialization.data(withJSONObject: fields) else { throw SupabaseClientError.encoding }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = json

        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseClientError.http(http.statusCode)
        }
    }

    private func delete(id: String) async throws {
        guard let baseURL, let anonKey, !userId.isEmpty else { throw SupabaseClientError.missingConfiguration }

        var components = URLComponents(url: baseURL.appendingPathComponent("/rest/v1/ethone_items"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(id)"),
            URLQueryItem(name: "user_id", value: "eq.\(userId)")
        ]

        guard let url = components.url else { throw SupabaseClientError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseClientError.http(http.statusCode)
        }
    }
}
