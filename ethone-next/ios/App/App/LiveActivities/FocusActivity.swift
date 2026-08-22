import Foundation
import ActivityKit

@available(iOS 26.0, *)
final class FocusActivityManager: ObservableObject {
    static let shared = FocusActivityManager()

    private var activity: Activity<EthoneActivityAttributes>?
    private var total: TimeInterval = 25 * 60
    private var endDate: Date?

    private init() {}

    func start(minutes: Double) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        total = minutes * 60
        endDate = Date().addingTimeInterval(total)

        let attributes = EthoneActivityAttributes(initialTitle: "Focus")
        let state = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: "Focus",
            subtitle: format(total),
            progress: "0.0",
            accent: "cyan",
            action: "pause"
        )

        do {
            activity = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: state, staleDate: endDate),
                pushType: nil,
                style: .standard
            )
        } catch {
            print("Focus activity start error: \(error)")
        }
    }

    func update(remaining: TimeInterval, isRunning: Bool) {
        guard let activity = activity else { return }
        let progress = 1.0 - (remaining / total)
        let state = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: "Focus",
            subtitle: format(remaining),
            progress: String(format: "%.2f", progress * 100),
            accent: "cyan",
            action: isRunning ? "pause" : "resume"
        )
        Task {
            await activity.update(ActivityContent(state: state, staleDate: endDate))
        }
    }

    func end() {
        guard let activity = activity else { return }
        Task {
            await activity.end(nil, dismissalPolicy: .default)
            self.activity = nil
        }
    }

    private func format(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}
