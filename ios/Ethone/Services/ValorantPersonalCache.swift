import Foundation

@MainActor
final class ValorantPersonalCache {
    struct Entry: Codable {
        let fetchedAt: Date
        let payload: JSONValue
    }

    struct RemoteRow: Decodable {
        let payload: JSONValue?
        let fetched_at: String?
    }

    struct ReadResult {
        let payload: JSONValue
        let isStale: Bool
    }

    private let api: APIClient
    private let accountName: String
    private let accountTag: String
    private let localPrefix: String

    init(api: APIClient, accountName: String, accountTag: String) {
        self.api = api
        self.accountName = accountName
        self.accountTag = accountTag
        let userID = api.auth.user?.id ?? "anonymous"
        let identity = "\(userID)|\(accountName)#\(accountTag)".lowercased()
        let encoded = Data(identity.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "=", with: "")
        localPrefix = "valorant-personal-cache.\(encoded)."
    }

    func read(_ key: String, ttl: TimeInterval) async -> ReadResult? {
        let local = DiskCache.read(Entry.self, key: localPrefix + key)
        if let local, Date().timeIntervalSince(local.fetchedAt) <= ttl {
            return ReadResult(payload: local.payload, isStale: false)
        }

        let remote = await readRemote(key)
        if let remote {
            if let local, remote.fetchedAt <= local.fetchedAt {
                return ReadResult(payload: local.payload, isStale: Date().timeIntervalSince(local.fetchedAt) > ttl)
            }
            let entry = Entry(fetchedAt: remote.fetchedAt, payload: remote.payload)
            DiskCache.write(entry, key: localPrefix + key)
            return ReadResult(payload: remote.payload, isStale: Date().timeIntervalSince(remote.fetchedAt) > ttl)
        }

        guard let local else { return nil }
        return ReadResult(payload: local.payload, isStale: true)
    }

    func save(_ payload: JSONValue, key: String, fetchedAt: Date = Date()) async {
        let entry = Entry(fetchedAt: fetchedAt, payload: payload)
        DiskCache.write(entry, key: localPrefix + key)
        do {
            _ = try await api.upsert(
                "ethone_valorant_personal_cache",
                fields: [
                    "account_name": .string(accountName),
                    "account_tag": .string(accountTag),
                    "cache_key": .string(key),
                    "payload": payload,
                    "fetched_at": .string(ISODate.string(fetchedAt)),
                    "updated_at": .string(ISODate.string(Date()))
                ],
                conflict: "user_id,account_name,account_tag,cache_key",
                as: RemoteRow.self
            )
        } catch {
            // Local cache remains available when Supabase is offline.
        }
    }

    static func encode<T: Encodable>(_ value: T) -> JSONValue? {
        guard let data = try? JSONEncoder.api.encode(value) else { return nil }
        return try? JSONDecoder.api.decode(JSONValue.self, from: data)
    }

    static func decode<T: Decodable>(_ type: T.Type, from payload: JSONValue) -> T? {
        guard let data = try? JSONEncoder.api.encode(payload) else { return nil }
        return try? JSONDecoder.api.decode(type, from: data)
    }

    private func readRemote(_ key: String) async -> (payload: JSONValue, fetchedAt: Date)? {
        do {
            let rows: [RemoteRow] = try await api.list("ethone_valorant_personal_cache", query: [
                URLQueryItem(name: "account_name", value: "eq.\(accountName)"),
                URLQueryItem(name: "account_tag", value: "eq.\(accountTag)"),
                URLQueryItem(name: "cache_key", value: "eq.\(key)"),
                URLQueryItem(name: "limit", value: "1")
            ])
            guard let row = rows.first,
                  let payload = row.payload,
                  let fetchedAt = row.fetched_at.flatMap(ISODate.parse) else { return nil }
            return (payload, fetchedAt)
        } catch {
            return nil
        }
    }
}
