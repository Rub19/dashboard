import ActivityKit
import SwiftUI
import WidgetKit

private let focusTint = Color(red: 0.88, green: 0.11, blue: 0.35)
private let breakTint = Color(red: 0.20, green: 0.83, blue: 0.60)

private extension FocusActivityAttributes.ContentState {
    var tint: Color { isBreak ? breakTint : focusTint }
    var total: TimeInterval { max(1, endDate.timeIntervalSince(startDate)) }
}

/// Décompte : géré par le système (pas de mise à jour à chaque seconde), figé quand la session est en pause.
struct FocusTimerText: View {
    let state: FocusActivityAttributes.ContentState

    var body: some View {
        if state.isPaused {
            Text(format(state.remaining)).monospacedDigit()
        } else {
            Text(timerInterval: Date.now...max(state.endDate, Date.now.addingTimeInterval(1)), countsDown: true)
                .monospacedDigit()
        }
    }

    private func format(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded(.up))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }
}

struct FocusProgressBar: View {
    let state: FocusActivityAttributes.ContentState

    var body: some View {
        if state.isPaused {
            ProgressView(value: min(1, max(0, 1 - state.remaining / state.total)))
                .tint(state.tint)
        } else {
            ProgressView(timerInterval: state.startDate...max(state.endDate, state.startDate.addingTimeInterval(1)), countsDown: false) {
                EmptyView()
            } currentValueLabel: {
                EmptyView()
            }
            .tint(state.tint)
        }
    }
}

struct FocusLockScreenView: View {
    let state: FocusActivityAttributes.ContentState
    let attributes: FocusActivityAttributes

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: state.symbol)
                    .font(.title2)
                    .foregroundStyle(state.tint)
                    .frame(width: 44, height: 44)
                    .background(state.tint.opacity(0.18), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text(state.isPaused ? "En pause" : state.phaseTitle).font(.headline)
                    if let goal = attributes.goal, !goal.isEmpty {
                        Text(goal).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                    }
                }
                Spacer()
                FocusTimerText(state: state)
                    .font(.system(size: 34, weight: .bold, design: .rounded))
            }
            FocusProgressBar(state: state)
        }
        .padding(16)
    }
}

struct FocusLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusActivityAttributes.self) { context in
            FocusLockScreenView(state: context.state, attributes: context.attributes)
                .activityBackgroundTint(Color.black.opacity(0.35))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "ethone://focus"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.state.isPaused ? "Pause" : context.state.phaseTitle, systemImage: context.state.symbol)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(context.state.tint)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    FocusTimerText(state: context.state)
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .frame(maxWidth: 110, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.center) {
                    if let goal = context.attributes.goal, !goal.isEmpty {
                        Text(goal).font(.subheadline).lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    FocusProgressBar(state: context.state).padding(.top, 4)
                }
            } compactLeading: {
                Image(systemName: context.state.symbol).foregroundStyle(context.state.tint)
            } compactTrailing: {
                FocusTimerText(state: context.state)
                    .font(.caption.weight(.semibold))
                    .frame(width: 46)
                    .foregroundStyle(context.state.tint)
            } minimal: {
                Image(systemName: context.state.symbol).foregroundStyle(context.state.tint)
            }
            .keylineTint(context.state.tint)
            .widgetURL(URL(string: "ethone://focus"))
        }
    }
}
