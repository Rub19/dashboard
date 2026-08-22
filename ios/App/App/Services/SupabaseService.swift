import Foundation
import Combine

struct EthoneItem: Identifiable, Codable {
    let id: String
    let title: String
    let body: String
    let done: Bool
    let createdAt: String?
    let updatedAt: String?
    let startAt: String?
    let endAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, body, done
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case startAt = "start_at"
        case endAt = "end_at"
    }
}

enum SupabaseError: Error {
    case missingConfig
    case invalidURL
    case network(Error)
    case decoding(Error)
    case status(Int)
}

final class SupabaseService: ObservableObject {
    @Published var tasks: [EthoneItem] = []
    @Published var notes: [EthoneItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var baseURL: URL?
    private var anonKey: String?
    private var userId: String?

    init() {
        let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
        let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String

        if let urlString = urlString, let url = URL(string: urlString), !urlString.contains("placeholder") {
            baseURL = url
            anonKey = key
        } else {
            baseURL = nil
            anonKey = nil
        }
    }

    func setUserId(_ userId: String) {
        self.userId = userId
    }

    func fetchAll() async {
        guard baseURL != nil, anonKey != nil else {
            errorMessage = "Configuration Supabase absente."
            return
        }

        await MainActor.run { isLoading = true; errorMessage = nil }

        async let tasksFetch = fetchItems(kind: "task")
        async let notesFetch = fetchItems(kind: "note")

        do {
            let fetchedTasks = try await tasksFetch
            let fetchedNotes = try await notesFetch

            await MainActor.run {
                self.tasks = fetchedTasks
                self.notes = fetchedNotes
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.isLoading = false
                self.errorMessage = "Erreur de synchronisation."
            }
        }
    }

    private func fetchItems(kind: String) async throws -> [EthoneItem] {
        guard let baseURL = baseURL, let userId = userId, !userId.isEmpty else { return [] }

        let encodedUserId = userId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? userId
        let encodedKind = kind.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? kind

        var components = URLComponents(url: baseURL.appendingPathComponent("/rest/v1/ethone_items"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "user_id", value: "eq.\(encodedUserId)"),
            URLQueryItem(name: "kind", value: "eq.\(encodedKind)"),
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "updated_at.desc")
        ]

        guard let url = components.url else { throw SupabaseError.invalidURL }

        var request = URLRequest(url: url)
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey ?? "")", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseError.status(http.statusCode)
        }

        return try JSONDecoder().decode([EthoneItem].self, from: data)
    }

    func toggleTask(_ item: EthoneItem) async throws {
        try await patchItem(id: item.id, fields: ["done": !item.done])
        await fetchAll()
    }

    private func patchItem(id: String, fields: [String: Any]) async throws {
        guard let baseURL = baseURL, let userId = userId, let anonKey = anonKey else { throw SupabaseError.missingConfig }

        let encodedUserId = userId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? userId

        var components = URLComponents(url: baseURL.appendingPathComponent("/rest/v1/ethone_items"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(id)"),
            URLQueryItem(name: "user_id", value: "eq.\(encodedUserId)")
        ]

        guard let url = components.url else { throw SupabaseError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONSerialization.data(withJSONObject: fields)

        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, http.statusCode >= 400 {
            throw SupabaseError.status(http.statusCode)
        }
    }
}
