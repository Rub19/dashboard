import ActivityKit
import WidgetKit
import SwiftUI

struct FocusSessionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var focusTitle: String
        var timeRemaining: String
        var progress: String
        var aura: String
    }

    var focusTitle: String
    var aura: String
}

struct FocusSessionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusSessionAttributes.self) { context in
            LockScreenFocusView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "target")
                        .foregroundColor(.accentColor)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.timeRemaining)
                        .font(.callout.bold())
                        .foregroundColor(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.attributes.focusTitle)
                            .font(.headline)
                        ProgressView(value: Double(context.state.progress) ?? 0, total: 100)
                            .tint(.accentColor)
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                Image(systemName: "target")
                    .foregroundColor(.accentColor)
            } compactTrailing: {
                Text(context.state.timeRemaining)
                    .font(.caption2)
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "target")
                    .foregroundColor(.accentColor)
            }
        }
    }
}

struct LockScreenFocusView: View {
    let context: ActivityViewContext<FocusSessionAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "target")
                    .foregroundColor(.accentColor)
                Text(context.attributes.focusTitle)
                    .font(.headline)
                Spacer()
                Text(context.state.timeRemaining)
                    .font(.title3.bold())
            }
            ProgressView(value: Double(context.state.progress) ?? 0, total: 100)
                .tint(.accentColor)
        }
        .padding()
    }
}

@main
struct EthoneLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        FocusSessionLiveActivity()
    }
}
