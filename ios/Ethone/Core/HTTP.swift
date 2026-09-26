import Foundation

// MARK: - Erreurs

enum APIError: LocalizedError {
    case notSignedIn
    case mfaRequired
    case sessionRevoked
    case http(status: Int, code: String?, message: String?)
    case network(String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .notSignedIn: return "Vous n'êtes pas connecté."
        case .mfaRequired: return "Un code de vérification en deux étapes est requis."
        case .sessionRevoked: return "Cette session a été révoquée. Reconnectez-vous."
        case .http(let status, _, let message):
            if let message, !message.isEmpty { return message }
            return "Le serveur a répondu avec une erreur (\(status))."
        case .network(let detail): return "Impossible de joindre le serveur. \(detail)"
        case .decoding(let detail): return "Réponse inattendue du serveur. \(detail)"
        }
    }

    var statusCode: Int? {
        if case .http(let status, _, _) = self { return status }
        return nil
    }
}

// MARK: - Dates ISO 8601 (Postgres renvoie des microsecondes)

enum ISODate {
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func parse(_ raw: String) -> Date? {
        var value = raw
        if let dot = value.firstIndex(of: ".") {
            // Ne garde que trois chiffres de fraction (les microsecondes ne sont pas toujours acceptées).
            var end = value.index(after: dot)
            var digits = 0
            while end < value.endIndex, value[end].isNumber {
                digits += 1
                end = value.index(after: end)
            }
            if digits > 3 {
                let keepEnd = value.index(dot, offsetBy: 4)
                value = String(value[..<keepEnd]) + String(value[end...])
            }
        }
        if value.hasSuffix("+00") { value += ":00" }
        return withFraction.date(from: value) ?? plain.date(from: value)
    }

    static func string(_ date: Date) -> String {
        withFraction.string(from: date)
    }
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let raw = try container.decode(String.self)
            if let date = ISODate.parse(raw) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Date invalide : \(raw)")
        }
        return decoder
    }()
}

extension JSONEncoder {
    static let api: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(ISODate.string(date))
        }
        return encoder
    }()
}

// MARK: - Transport bas niveau

enum HTTP {
    static let userAgent = "ETHONE/2.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) EthoneIOS"

    static let session: URLSession = {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 20
        configuration.waitsForConnectivity = true
        return URLSession(configuration: configuration)
    }()

    static func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw APIError.network("Réponse invalide.") }
            return (data, http)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.network(error.localizedDescription)
        }
    }

    /// Erreur normalisée à partir du corps `{ ok:false, error:{ code, message } }` du Worker ou de Supabase.
    static func failure(status: Int, data: Data) -> APIError {
        var code: String?
        var message: String?
        if let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let error = object["error"] as? [String: Any] {
                code = error["code"] as? String
                message = error["message"] as? String
            } else {
                code = (object["error_code"] as? String) ?? (object["code"] as? String)
                message = (object["msg"] as? String) ?? (object["message"] as? String) ?? (object["error_description"] as? String)
                if code == nil { code = object["error"] as? String }
            }
        }
        if code == "MFA_REQUIRED" { return .mfaRequired }
        if code == "SESSION_REVOKED" { return .sessionRevoked }
        return .http(status: status, code: code, message: message)
    }
}

// MARK: - Worker Cloudflare (`{ ok, data }`)

struct WorkerEnvelope<T: Decodable>: Decodable {
    let data: T?
}

enum WorkerHTTP {
    static func request(path: String, method: String = "GET", query: [URLQueryItem] = [], body: Data? = nil, token: String?) -> URLRequest {
        var components = URLComponents(url: Config.workerURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue(HTTP.userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return request
    }
}
