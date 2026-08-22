import SwiftUI
import UIKit
import UserNotifications
import ActivityKit

@available(iOS 16.2, *)
struct FocusTimerAttributes: ActivityAttributes {
    struct ContentState: ActivityState {
        var progress: Double
        var remaining: String
    }

    var preset: String
    var duration: TimeInterval
}

final class FocusTimerModel: ObservableObject {
    @Published var remaining: TimeInterval = 25 * 60
    @Published var total: TimeInterval = 25 * 60
    @Published var isRunning = false
    @Published var progress: Double = 0

    private var timer: Timer?
    private var startDate: Date?
    private var endDate: Date?

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
        }
        if #available(iOS 16.2, *) {
            updateLiveActivity()
        }
    }

    private func complete() {
        pause()
        remaining = 0
        progress = 1
        Haptic.success()
        if #available(iOS 16.2, *) {
            endLiveActivity()
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

    @available(iOS 16.2, *)
    private func startLiveActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = FocusTimerAttributes(preset: "Focus", duration: total)
        let state = FocusTimerAttributes.ContentState(progress: 0, remaining: format(remaining))
        do {
            _ = try Activity.request(attributes: attributes, contentState: state, pushType: nil)
        } catch {
            print("Live activity error: \(error)")
        }
    }

    @available(iOS 16.2, *)
    private func updateLiveActivity() {
        let state = FocusTimerAttributes.ContentState(progress: progress, remaining: format(remaining))
        Task {
            for activity in Activity<FocusTimerAttributes>.activities {
                await activity.update(using: state)
            }
        }
    }

    @available(iOS 16.2, *)
    private func endLiveActivity() {
        Task {
            for activity in Activity<FocusTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .default)
            }
        }
    }

    private func format(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}

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
                        Haptic.rigid()
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
                        Haptic.warning()
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
            }
        }
    }

    private func format(_ interval: TimeInterval) -> String {
        let m = Int(interval) / 60
        let s = Int(interval) % 60
        return String(format: "%02d:%02d", m, s)
    }
}
