import Foundation

/// One entry of the account's activity journal (Supabase `ethone_file_activity`, shared with the website).
struct CloudActivity: Decodable, Identifiable {
    let id: String
    let fileId: String?
    let eventType: String
    let details: JSONValue?
    let createdAt: String

    var type: String { details?["originalEventType"]?.stringValue ?? eventType }
    var title: String { details?["title"]?.stringValue ?? type }
    var date: Date? { ISODate.parse(createdAt) }

    /// Same grouping as the website's Interactions page.
    var category: String {
        let t = type
        if t.hasPrefix("route:") { return "Navigation" }
        if t.contains("theme") || t.contains("appearance") { return "Personnalisation" }
        if t.contains("brain") { return "Brain" }
        if t.contains("notes") || t.contains("tasks") || t.contains("calendar") || t.contains("files") || t.contains("habit") || t.contains("focus") || t.hasPrefix("derived:") { return "Productivité" }
        return "Synchronisation"
    }
}

private struct CloudActivityPage: Decodable { let events: [CloudActivity] }

/// Reads and writes the activity journal through the Worker, so the iPhone and the website show the same history.
enum ActivityLog {
    static func load(_ api: APIClient, limit: Int = 2000) async throws -> [CloudActivity] {
        let page: CloudActivityPage = try await api.worker("api/cloud/activity", query: [URLQueryItem(name: "limit", value: String(limit))])
        return page.events.filter { ($0.fileId ?? "").isEmpty }
    }

    static func record(_ api: APIClient, _ type: String, title: String) {
        let event: JSONValue = .object([
            "eventType": .string("shared"),
            "createdAt": .string(ISODate.string(Date())),
            "details": .object(["title": .string(title), "originalEventType": .string(type), "source": .string("ios")]),
        ])
        Task { try? await api.workerVoid("api/cloud/activity", body: APIClient.json(["events": .array([event])])) }
    }
}
