import Foundation
import ActivityKit

@available(iOS 26.0, *)
final class FocusLiveActivityManager: ObservableObject {
    static let shared = FocusLiveActivityManager()

    private var activity: Activity<EthoneActivityAttributes>?

    private init() {}

    func isAuthorized() -> Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    func start(preset: String, totalDuration: TimeInterval, endDate: Date) {
        guard isAuthorized() else { return }

        let attributes = EthoneActivityAttributes(initialTitle: preset)
        let state = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: preset,
            subtitle: format(totalDuration),
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
            print("Live activity start error: \(error)")
        }
    }

    func update(progress: Double, remaining: TimeInterval, isRunning: Bool) {
        guard let activity = activity else { return }
        let state = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: "Focus",
            subtitle: format(remaining),
            progress: String(format: "%.2f", progress * 100),
            accent: "cyan",
            action: isRunning ? "pause" : "resume"
        )
        Task {
            await activity.update(ActivityContent(state: state, staleDate: nil))
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
