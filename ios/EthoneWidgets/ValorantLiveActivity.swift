import ActivityKit
import SwiftUI
import WidgetKit

private let valorantTint = Color(red: 1.0, green: 0.27, blue: 0.33)
private let allyTint = Color(red: 0.37, green: 0.79, blue: 0.65)

private extension ValorantActivityAttributes.ContentState {
    var title: String {
        switch phase {
        case "queue": "Recherche de partie"
        case "pregame": "Sélection d'agent"
        default: map.isEmpty ? "En partie" : map
        }
    }

    var symbol: String {
        switch phase {
        case "queue": "magnifyingglass"
        case "pregame": "person.crop.square"
        default: "scope"
        }
    }

    var subtitle: String {
        [mode, phase == "ingame" ? agent : map].filter { !$0.isEmpty }.joined(separator: " · ")
    }
}

private struct ValorantTrailing: View {
    let state: ValorantActivityAttributes.ContentState
    var large = false

    var body: some View {
        switch state.phase {
        case "queue":
            Text(timerInterval: state.since...Date.distantFuture, countsDown: false)
                .monospacedDigit()
                .foregroundStyle(valorantTint)
        case "pregame":
            if let end = state.phaseEnd, end > .now {
                Text(timerInterval: Date.now...end, countsDown: true)
                    .monospacedDigit()
                    .foregroundStyle(valorantTint)
            } else {
                Image(systemName: "lock.fill").foregroundStyle(valorantTint)
            }
        default:
            HStack(spacing: large ? 6 : 2) {
                Text("\(state.ally)").foregroundStyle(allyTint)
                Text("–").foregroundStyle(.secondary)
                Text("\(state.enemy)").foregroundStyle(valorantTint)
            }
            .monospacedDigit()
        }
    }
}

private struct ValorantLockScreenView: View {
    let state: ValorantActivityAttributes.ContentState

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: state.symbol)
                .font(.title2)
                .foregroundStyle(valorantTint)
                .frame(width: 44, height: 44)
                .background(valorantTint.opacity(0.18), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(state.title).font(.headline).lineLimit(1)
                Text(state.subtitle).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                if state.phase == "ingame" {
                    Text(state.attacking ? "Attaquants" : "Défenseurs")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(state.attacking ? valorantTint : allyTint)
                }
            }
            Spacer()
            ValorantTrailing(state: state, large: true)
                .font(.system(size: 30, weight: .semibold).monospacedDigit())
                .frame(maxWidth: 120, alignment: .trailing)
        }
        .padding(16)
    }
}

struct ValorantLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ValorantActivityAttributes.self) { context in
            ValorantLockScreenView(state: context.state)
                .activityBackgroundTint(Color.black.opacity(0.35))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(URL(string: "ethone://valorant"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("E:VAL", systemImage: context.state.symbol).font(.caption.weight(.bold)).foregroundStyle(valorantTint)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ValorantTrailing(state: context.state, large: true)
                        .font(.system(size: 28, weight: .semibold).monospacedDigit())
                        .frame(maxWidth: 120, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.subtitle).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
                }
            } compactLeading: {
                Image(systemName: context.state.symbol).foregroundStyle(valorantTint)
            } compactTrailing: {
                ValorantTrailing(state: context.state)
                    .font(.caption.weight(.semibold))
                    .frame(maxWidth: 52)
            } minimal: {
                Image(systemName: context.state.symbol).foregroundStyle(valorantTint)
            }
            .keylineTint(valorantTint)
            .widgetURL(URL(string: "ethone://valorant"))
        }
    }
}
