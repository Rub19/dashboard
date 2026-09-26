import ActivityKit
import Foundation

/// Données de la Live Activity « Focus » (écran verrouillé, Dynamic Island, StandBy). Partagé entre l'app et l'extension Widgets.
struct FocusActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// `focus`, `shortBreak` ou `longBreak`.
        var phase: String
        var startDate: Date
        var endDate: Date
        var isPaused: Bool
        /// Temps restant figé quand la session est en pause.
        var remaining: TimeInterval
    }

    var preset: String
    var goal: String?
    var totalSeconds: TimeInterval
}

extension FocusActivityAttributes.ContentState {
    var isBreak: Bool { phase != "focus" }

    var phaseTitle: String {
        switch phase {
        case "shortBreak": return "Pause courte"
        case "longBreak": return "Pause longue"
        default: return "Concentration"
        }
    }

    var symbol: String { isBreak ? "cup.and.saucer.fill" : "brain.head.profile" }
}
