import Foundation

struct ValorantWidgetSnapshot: Codable {
    struct Offer: Codable, Hashable {
        let name: String
        let price: Int
        let colorHex: UInt32
    }

    var updatedAt: Date
    var name: String
    var tag: String
    var tier: Int
    var rankName: String
    var rankColor: UInt32
    var rr: Int
    var rankIcon: Data?
    var battlepassLevel: Int
    var battlepassMax: Int
    var battlepassProgress: Double
    var offers: [Offer]
    var offersEnd: Date?

    private static let key = "ethone.valorant.widget.v1"

    static func load() -> ValorantWidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: SharedSnapshot.suite), let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(ValorantWidgetSnapshot.self, from: data)
    }

    func save() {
        guard let defaults = UserDefaults(suiteName: SharedSnapshot.suite), let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: Self.key)
    }
}
