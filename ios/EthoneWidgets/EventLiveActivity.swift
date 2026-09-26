import ActivityKit
import SwiftUI
import WidgetKit

private let eventTint = Color(red: 0.36, green: 0.55, blue: 1.0)

/// Compte à rebours jusqu'au début (géré par le système) ; se fige à 00:00 quand l'événement commence.
private struct EventCountdown: View {
    let state: EventActivityAttributes.ContentState

    var body: some View {
        Text(timerInterval: Date.now...max(state.startDate, Date.now.addingTimeInterval(1)), countsDown: true)
            .monospacedDigit()
    }
}

private struct EventLockScreenView: View {
    let state: EventActivityAttributes.ContentState
    let attributes: EventActivityAttributes

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "calendar")
                .font(.title2)
                .foregroundStyle(eventTint)
                .frame(width: 44, height: 44)
                .background(eventTint.opacity(0.18), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(attributes.title).font(.headline).lineLimit(1)
                Text("\(state.startDate, format: .dateTime.hour().minute()) – \(state.endDate, format: .dateTime.hour().minute())")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            EventCountdown(state: state)
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundStyle(eventTint)
        }
        .padding(16)
    }
}

struct EventLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: EventActivityAttributes.self) { context in
            EventLockScreenView(state: context.state, attributes: context.attributes)
                .activityBackgroundTint(Color.black.opacity(0.35))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "ethone://calendar"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("Événement", systemImage: "calendar").font(.caption.weight(.bold)).foregroundStyle(eventTint)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    EventCountdown(state: context.state)
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .frame(maxWidth: 110, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.title).font(.subheadline).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("\(context.state.startDate, format: .dateTime.hour().minute()) – \(context.state.endDate, format: .dateTime.hour().minute())")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            } compactLeading: {
                Image(systemName: "calendar").foregroundStyle(eventTint)
            } compactTrailing: {
                EventCountdown(state: context.state)
                    .font(.caption.weight(.semibold))
                    .frame(width: 46)
                    .foregroundStyle(eventTint)
            } minimal: {
                Image(systemName: "calendar").foregroundStyle(eventTint)
            }
            .keylineTint(eventTint)
            .widgetURL(URL(string: "ethone://calendar"))
        }
    }
}
