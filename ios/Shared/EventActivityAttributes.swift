import ActivityKit
import Foundation

/// Données de la Live Activity « Prochain événement » (écran verrouillé, Dynamic Island). Partagé entre l'app et l'extension Widgets.
struct EventActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var startDate: Date
        var endDate: Date
    }

    var eventId: String
    var title: String
}
