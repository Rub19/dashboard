import Foundation
import ActivityKit

@available(iOS 16.2, *)
struct FocusLiveActivityAttributes: ActivityAttributes {
    struct ContentState: ActivityState {
        var progress: Double
        var remainingText: String
    }

    var presetName: String
    var totalDuration: TimeInterval
}

@available(iOS 16.2, *)
final class FocusLiveActivityManager: ObservableObject {
    static let shared = FocusLiveActivityManager()

    private var activity: Activity<FocusLiveActivityAttributes>?

    private init() {}

    func isAuthorized() -> Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    func start(preset: String, totalDuration: TimeInterval) {
        guard isAuthorized() else { return }

        let attributes = FocusLiveActivityAttributes(presetName: preset, totalDuration: totalDuration)
        let state = FocusLiveActivityAttributes.ContentState(progress: 0, remainingText: format(totalDuration))

        do {
            activity = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
        } catch {
            print("Live activity start error: \(error)")
        }
    }

    func update(progress: Double, remaining: TimeInterval) {
        guard let activity else { return }
        let state = FocusLiveActivityAttributes.ContentState(progress: progress, remainingText: format(remaining))
        Task {
            await activity.update(using: state)
        }
    }

    func end() {
        guard let activity else { return }
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
