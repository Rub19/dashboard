import Foundation

/// Ligne de `ethone_items` : notes (`note`), tâches (`task`) et événements (`event`) partagent la même table que le site.
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

    /// Le corps des notes du site est du HTML (éditeur riche) : on en tire du texte lisible pour l'aperçu.
    var plainBody: String { HTMLText.plain(from: body ?? "") }
}

enum ItemKind: String {
    case note, task, event
}

/// Habitude (`ethone_habits`) et validation d'un jour (`ethone_habit_completions`).
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

/// Session de concentration terminée (`ethone_focus_sessions`).
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
    /// Retire les balises et décode les entités les plus courantes ; suffisant pour un aperçu de note.
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

    /// Texte brut → HTML minimal compatible avec l'éditeur du site (un paragraphe par ligne).
    static func html(from text: String) -> String {
        let escaped = text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        return escaped.components(separatedBy: "\n").map { "<p>\($0)</p>" }.joined()
    }
}

/// Date locale au format `yyyy-MM-dd` (jour d'une habitude), identique au calcul du site.
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

    /// Date locale décalée de `n` jours (sûr vis-à-vis des changements d'heure).
    static func daysAgo(_ n: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: -n, to: Date()) ?? Date()
    }
}
