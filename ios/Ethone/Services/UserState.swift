import Foundation

/// État utilisateur du site (`ethone_user_state` : une ligne par compte, un JSON contenant plusieurs clés : scratchpad…).
/// Même lecture / écriture que `ethone-next/lib/user-state.ts` : on relit la ligne, on remplace la clé demandée, on réécrit.
@MainActor
struct UserStateClient {
    let api: APIClient

    private struct Row: Decodable { let payload: JSONValue? }

    func payload() async throws -> [String: JSONValue] {
        let rows: [Row] = try await api.list("ethone_user_state")
        if case .object(let dictionary)? = rows.first?.payload { return dictionary }
        return [:]
    }

    func value(_ key: String) async throws -> JSONValue? {
        try await payload()[key]
    }

    func set(_ key: String, _ value: JSONValue) async throws {
        var current = try await payload()
        current[key] = value
        _ = try await api.upsert(
            "ethone_user_state",
            fields: ["payload": .object(current), "updated_at": .string(ISODate.string(Date()))],
            conflict: "user_id",
            as: JSONValue.self
        )
    }
}
