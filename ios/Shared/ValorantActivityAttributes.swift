import ActivityKit
import Foundation

struct ValorantActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var phase: String
        var since: Date
        var phaseEnd: Date?
        var mode: String
        var map: String
        var agent: String
        var ally: Int
        var enemy: Int
        var attacking: Bool
    }

    var startedAt: Date
}
