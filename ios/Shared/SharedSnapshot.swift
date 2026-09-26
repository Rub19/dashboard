import Foundation

/// Instantané des données affichées par les widgets, écrit par l'app dans le conteneur App Group et lu par l'extension.
/// (Avec un IPA non signé installé via un compte gratuit, l'App Group peut être indisponible : les widgets affichent alors un état vide.)
struct SharedSnapshot: Codable {
    var updatedAt: Date
    var userName: String
    var openTaskCount: Int
    var nextTasks: [String]
    var habitsDone: Int
    var habitsTotal: Int
    var bestStreak: Int
    var noteCount: Int
    var focusMinutesToday: Int

    static let empty = SharedSnapshot(updatedAt: .distantPast, userName: "", openTaskCount: 0, nextTasks: [], habitsDone: 0, habitsTotal: 0, bestStreak: 0, noteCount: 0, focusMinutesToday: 0)

    static let suite = "group.dev.ethone.app"
    private static let key = "ethone.snapshot.v1"

    static func load() -> SharedSnapshot? {
        guard let defaults = UserDefaults(suiteName: suite), let data = defaults.data(forKey: key) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return try? decoder.decode(SharedSnapshot.self, from: data)
    }

    func save() {
        guard let defaults = UserDefaults(suiteName: Self.suite) else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        if let data = try? encoder.encode(self) { defaults.set(data, forKey: Self.key) }
    }
}
