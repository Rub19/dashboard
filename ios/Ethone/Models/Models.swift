import Foundation

struct Item: Identifiable, Codable, Hashable {
    let id: String
    var kind: String
    var title: String
    var body: String?
    var done: Bool?
    var startAt: Date?
    var endAt: Date?
    var data: JSONValue?
    var createdAt: Date
    var updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, kind, title, body, done, data
        case startAt = "start_at"
        case endAt = "end_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var isDone: Bool { done ?? false }

    var dueDate: Date? { data?["dueDate"]?.stringValue.flatMap(ISODate.parse) }

    var plainBody: String { HTMLText.plain(from: body ?? "") }
}

enum ItemKind: String {
    case note, task, event
}

struct Habit: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var description: String?
    var emoji: String?
    var color: String?
    var targetPerWeek: Int
    var archived: Bool
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, description, emoji, color, archived
        case targetPerWeek = "target_per_week"
        case createdAt = "created_at"
    }
}

struct HabitCompletion: Identifiable, Codable, Hashable {
    let id: String
    var habitId: String
    var completedOn: String

    enum CodingKeys: String, CodingKey {
        case id
        case habitId = "habit_id"
        case completedOn = "completed_on"
    }
}

struct FocusSessionRecord: Identifiable, Codable, Hashable {
    let id: String
    var duration: Int
    var preset: String
    var goal: String?
    var completedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, duration, preset, goal
        case completedAt = "completed_at"
    }
}

enum HTMLText {
    static func plain(from html: String) -> String {
        var text = html
            .replacingOccurrences(of: "</p>", with: "\n")
            .replacingOccurrences(of: "<br>", with: "\n")
            .replacingOccurrences(of: "<br/>", with: "\n")
            .replacingOccurrences(of: "</li>", with: "\n")
            .replacingOccurrences(of: "</div>", with: "\n")
        text = text.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        let entities = ["&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&apos;": "'"]
        for (entity, value) in entities { text = text.replacingOccurrences(of: entity, with: value) }
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func html(from text: String) -> String {
        let escaped = text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        return escaped.components(separatedBy: "\n").map { "<p>\($0)</p>" }.joined()
    }
}

enum DayKey {
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func string(_ date: Date = Date()) -> String { formatter.string(from: date) }
    static func date(_ key: String) -> Date? { formatter.date(from: key) }

    static func daysAgo(_ n: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: -n, to: Date()) ?? Date()
    }
}

struct LibraryAvatar: Identifiable, Hashable {
    let id: String
    let name: String
    let category: String
    let path: String

    var fullURL: URL? {
        URL(string: "https://ethone.dev" + path)
    }
}

enum AvatarCatalog {
    static let ethoneOriginals: [LibraryAvatar] = [
        .init(id: "ethone-ethone-quantum", name: "Quantum", category: "ETHONE Originals", path: "/avatars/library/ethone/ethone-quantum.webp"),
        .init(id: "ethone-ethone-solid", name: "Solid", category: "ETHONE Originals", path: "/avatars/library/ethone/ethone-solid.webp"),
        .init(id: "ethone-ethone-classic", name: "Classic", category: "ETHONE Originals", path: "/avatars/library/ethone/ethone-classic.webp"),
        .init(id: "ethone-dyno-rose", name: "Dyno Rose", category: "ETHONE Originals", path: "/avatars/library/ethone/dyno-rose.webp"),
        .init(id: "ethone-obsidian", name: "Obsidian", category: "ETHONE Originals", path: "/avatars/library/ethone/obsidian.webp"),
        .init(id: "ethone-aurora", name: "Aurora", category: "ETHONE Originals", path: "/avatars/library/ethone/aurora.webp"),
        .init(id: "ethone-arctic", name: "Arctic", category: "ETHONE Originals", path: "/avatars/library/ethone/arctic.webp"),
        .init(id: "ethone-cyber-neon", name: "Cyber Neon", category: "ETHONE Originals", path: "/avatars/library/ethone/cyber-neon.webp"),
        .init(id: "ethone-sunset", name: "Sunset", category: "ETHONE Originals", path: "/avatars/library/ethone/sunset.webp"),
    ]

    static let popularPicks: [LibraryAvatar] = [
        .init(id: "lol-jinx", name: "Jinx", category: "League of Legends", path: "/avatars/library/lol/jinx.webp"),
        .init(id: "valorant-jett", name: "Jett", category: "Valorant", path: "/avatars/library/valorant/jett.webp"),
        .init(id: "valorant-reyna", name: "Reyna", category: "Valorant", path: "/avatars/library/valorant/reyna.webp"),
        .init(id: "anime-gojou", name: "Satoru Gojou", category: "Anime", path: "/avatars/library/anime/jujutsu-kaisen-satoru-gojou.webp"),
    ]
}
