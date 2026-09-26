import Foundation

/// Accès authentifié au Worker Cloudflare, à l'API REST Supabase (RLS par utilisateur) et à l'API du bot Discord.
@MainActor
final class APIClient {
    let auth: AuthStore

    init(auth: AuthStore) {
        self.auth = auth
    }

    // MARK: Cœur

    private func authorized(_ make: (String) -> URLRequest) async throws -> (Data, HTTPURLResponse) {
        var token = try await auth.validAccessToken()
        var result = try await HTTP.send(make(token))
        if result.1.statusCode == 401 {
            // Jeton refusé (horloge, rotation) : un seul nouvel essai avec un jeton frais.
            if let refreshed = try? await auth.forceRefresh() {
                token = refreshed.accessToken
                result = try await HTTP.send(make(token))
            }
        }
        guard (200..<300).contains(result.1.statusCode) else {
            let failure = HTTP.failure(status: result.1.statusCode, data: result.0)
            auth.handle(failure)
            throw failure
        }
        return result
    }

    private func decode<T: Decodable>(_ data: Data, as type: T.Type) throws -> T {
        do {
            return try JSONDecoder.api.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    static func json(_ object: [String: JSONValue]) -> Data {
        (try? JSONEncoder.api.encode(object)) ?? Data("{}".utf8)
    }

    // MARK: Worker

    func worker<T: Decodable>(_ path: String, method: String = "GET", query: [URLQueryItem] = [], body: Data? = nil, as type: T.Type = T.self) async throws -> T {
        let (data, _) = try await authorized { WorkerHTTP.request(path: path, method: method, query: query, body: body, token: $0) }
        let envelope = try decode(data, as: WorkerEnvelope<T>.self)
        guard let value = envelope.data else { throw APIError.decoding("Réponse vide.") }
        return value
    }

    func workerVoid(_ path: String, method: String = "POST", query: [URLQueryItem] = [], body: Data? = nil) async throws {
        _ = try await authorized { WorkerHTTP.request(path: path, method: method, query: query, body: body, token: $0) }
    }

    // MARK: API du bot Discord

    func bot<T: Decodable>(_ path: String, method: String = "GET", query: [URLQueryItem] = [], body: Data? = nil, as type: T.Type = T.self) async throws -> T {
        let (data, _) = try await authorized { token in
            var components = URLComponents(url: Config.botURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
            if !query.isEmpty { components.queryItems = query }
            var request = URLRequest(url: components.url!)
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            if let body {
                request.httpBody = body
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            }
            return request
        }
        return try decode(data, as: T.self)
    }

    // MARK: Supabase REST

    private func restRequest(table: String, method: String, query: [URLQueryItem], body: Data?, prefer: String?, token: String) -> URLRequest {
        var components = URLComponents(url: Config.supabaseURL.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let prefer { request.setValue(prefer, forHTTPHeaderField: "Prefer") }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }

    func list<T: Decodable>(_ table: String, query: [URLQueryItem] = [], as type: T.Type = T.self) async throws -> [T] {
        let (data, _) = try await authorized { restRequest(table: table, method: "GET", query: query + [URLQueryItem(name: "select", value: "*")], body: nil, prefer: nil, token: $0) }
        return try decode(data, as: [T].self)
    }

    func insert<T: Decodable>(_ table: String, fields: [String: JSONValue], as type: T.Type = T.self) async throws -> T {
        var payload = fields
        if payload["user_id"] == nil, let userId = auth.user?.id { payload["user_id"] = .string(userId) }
        let body = Self.json(payload)
        let (data, _) = try await authorized { restRequest(table: table, method: "POST", query: [], body: body, prefer: "return=representation", token: $0) }
        guard let first = try decode(data, as: [T].self).first else { throw APIError.decoding("Ligne créée introuvable.") }
        return first
    }

    /// Insertion en ignorant les doublons (`on_conflict` avec contrainte unique).
    func upsert<T: Decodable>(_ table: String, fields: [String: JSONValue], conflict: String, as type: T.Type = T.self) async throws -> T? {
        var payload = fields
        if payload["user_id"] == nil, let userId = auth.user?.id { payload["user_id"] = .string(userId) }
        let body = Self.json(payload)
        let (data, _) = try await authorized {
            restRequest(table: table, method: "POST", query: [URLQueryItem(name: "on_conflict", value: conflict)], body: body,
                        prefer: "resolution=merge-duplicates,return=representation", token: $0)
        }
        return try decode(data, as: [T].self).first
    }

    func patch<T: Decodable>(_ table: String, id: String, fields: [String: JSONValue], as type: T.Type = T.self) async throws -> T? {
        var payload = fields
        payload["updated_at"] = .string(ISODate.string(Date()))
        let body = Self.json(payload)
        let (data, _) = try await authorized {
            restRequest(table: table, method: "PATCH", query: [URLQueryItem(name: "id", value: "eq.\(id)")], body: body, prefer: "return=representation", token: $0)
        }
        return try decode(data, as: [T].self).first
    }

    func remove(_ table: String, id: String) async throws {
        _ = try await authorized { restRequest(table: table, method: "DELETE", query: [URLQueryItem(name: "id", value: "eq.\(id)")], body: nil, prefer: nil, token: $0) }
    }

    func removeWhere(_ table: String, _ query: [URLQueryItem]) async throws {
        _ = try await authorized { restRequest(table: table, method: "DELETE", query: query, body: nil, prefer: nil, token: $0) }
    }
}
