import SwiftUI
import UIKit
import UserNotifications
import ActivityKit

@available(iOS 26.0, *)
final class FocusTimerModel: ObservableObject {
    @Published var remaining: TimeInterval = 25 * 60
    @Published var total: TimeInterval = 25 * 60
    @Published var isRunning = false
    @Published var progress: Double = 0

    private var timer: Timer?
    private var startDate: Date?
    private var endDate: Date?
    private var activity: Activity<EthoneActivityAttributes>?

    func start(minutes: Double) {
        total = minutes * 60
        remaining = total
        isRunning = true
        startDate = Date()
        endDate = Date().addingTimeInterval(total)
        scheduleNotification()
        startLiveActivity()
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.tick()
        }
    }

    func pause() {
        isRunning = false
        timer?.invalidate()
        timer = nil
        cancelPendingNotification()
        endLiveActivity()
    }

    func reset() {
        pause()
        remaining = total
        progress = 0
    }

    private func tick() {
        guard isRunning else { return }
        remaining -= 1
        progress = 1.0 - (remaining / total)
        if remaining <= 0 {
            complete()
            return
        }
        updateLiveActivity()
    }

    private func complete() {
        pause()
        remaining = 0
        progress = 1
        Task { @MainActor in
            HapticManager.shared.playSuccessWave()
        }
    }

    private func scheduleNotification() {
        let content = UNMutableNotificationContent()
        content.title = "Session Focus terminée"
        content.body = "Prenez une pause."
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: remaining, repeats: false)
        let request = UNNotificationRequest(identifier: "ethone-focus-end", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    private func cancelPendingNotification() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["ethone-focus-end"])
    }

    @available(iOS 26.0, *)
    private func startLiveActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = EthoneActivityAttributes(initialTitle: "Focus")
        let contentState = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: "Focus",
            subtitle: format(remaining),
            progress: String(format: "%.2f", 0.0),
            accent: "cyan",
            action: "pause"
        )
        do {
            activity = try Activity.request(
                attributes: attributes,
                content: ActivityContent(state: contentState, staleDate: endDate),
                pushType: nil,
                style: .standard
            )
        } catch {
            print("Live activity error: \(error)")
        }
    }

    @available(iOS 26.0, *)
    private func updateLiveActivity() {
        guard let activity = activity else { return }
        let contentState = EthoneActivityAttributes.ContentState(
            mode: .focus,
            title: "Focus",
            subtitle: format(remaining),
            progress: String(format: "%.2f", progress * 100),
            accent: "cyan",
            action: isRunning ? "pause" : "resume"
        )
        Task {
            await activity.update(ActivityContent(state: contentState, staleDate: endDate))
        }
    }

    @available(iOS 26.0, *)
    private func endLiveActivity() {
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

@available(iOS 26.0, *)
struct FocusTimerCard: View {
    @StateObject private var model = FocusTimerModel()

    var body: some View {
        LiquidGlassContainer {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "target")
                        .font(.title2)
                    Spacer()
                    Text(format(model.remaining))
                        .font(.system(.title3, design: .rounded).monospacedDigit())
                        .fontWeight(.bold)
                }

                Text("Focus")
                    .font(.headline)

                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.12), lineWidth: 8)
                    Circle()
                        .trim(from: 0, to: model.progress)
                        .stroke(
                            AngularGradient(
                                gradient: Gradient(colors: [.cyan, .purple, .cyan]),
                                center: .center
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 0.5), value: model.progress)
                }
                .frame(height: 80)

                HStack(spacing: 12) {
                    Button {
                        if model.isRunning {
                            model.pause()
                        } else if model.remaining == 0 || model.remaining == model.total {
                            model.start(minutes: model.total / 60)
                        } else {
                            model.start(minutes: model.remaining / 60)
                        }
                    } label: {
                        Image(systemName: model.isRunning ? "pause.fill" : "play.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }

                    Button {
                        model.reset()
                    } label: {
                        Image(systemName: "arrow.counterclockwise")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .ethoneSensoryFeedback(.increase, trigger: model.total)
            }
        }
    }

    private func format(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}
