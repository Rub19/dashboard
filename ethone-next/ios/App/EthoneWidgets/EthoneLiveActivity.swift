import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents
import UIKit

enum ActivityMode: String, Codable {
    case focus
    case task
    case sound
    case sync
}

@available(iOS 16.1, *)
struct EthoneActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var mode: ActivityMode
        var title: String
        var subtitle: String
        var progress: String
        var accent: String
        var action: String
    }

    var initialTitle: String
}

@available(iOS 17.0, *)
struct EthoneLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: EthoneActivityAttributes.self) { context in
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    leadingExpanded(context: context)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    trailingExpanded(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    bottomExpanded(context: context)
                }
            } compactLeading: {
                compactLeading(context: context)
            } compactTrailing: {
                compactTrailing(context: context)
            } minimal: {
                minimalView(context: context)
            }
        }
    }

    @ViewBuilder
    func leadingExpanded(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        switch context.state.mode {
        case .focus:
            Image(systemName: "target")
                .foregroundColor(.accentColor)
        case .task:
            Image(systemName: "checkmark.circle")
                .foregroundColor(.green)
        case .sound:
            SoundWaveView()
        case .sync:
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.green)
        }
    }

    @ViewBuilder
    func trailingExpanded(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        switch context.state.mode {
        case .focus:
            Text(context.state.subtitle)
                .font(.callout.bold())
                .foregroundColor(.white)
        case .task:
            Text(context.state.subtitle)
                .font(.callout.bold())
                .foregroundColor(.green)
        case .sound:
            Text(context.state.subtitle)
                .font(.caption)
                .foregroundColor(.secondary)
        case .sync:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
        }
    }

    @ViewBuilder
    func bottomExpanded(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(context.state.title)
                .font(.headline)
            if context.state.mode == .sound {
                SoundWaveView()
                    .frame(height: 12)
            } else {
                ProgressView(value: Double(context.state.progress) ?? 0, total: 100)
                    .tint(tintColor(for: context.state.mode))
            }
            HStack(spacing: 12) {
                if !context.state.action.isEmpty {
                    Button(intent: EthoneLiveActivityIntent(action: context.state.action)) {
                        Text(actionLabel(context.state.action))
                            .font(.caption.bold())
                    }
                    .buttonStyle(.bordered)
                    .tint(tintColor(for: context.state.mode))
                }
            }
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    func compactLeading(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        switch context.state.mode {
        case .focus:
            Image(systemName: "target")
                .foregroundColor(.accentColor)
        case .task:
            Image(systemName: "checkmark.circle")
                .foregroundColor(.green)
        case .sound:
            SoundWaveView()
        case .sync:
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.green)
        }
    }

    @ViewBuilder
    func compactTrailing(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        Text(context.state.subtitle)
            .font(.caption2)
            .foregroundColor(.white)
    }

    @ViewBuilder
    func minimalView(context: ActivityViewContext<EthoneActivityAttributes>) -> some View {
        Image(systemName: context.state.mode == .sound ? "waveform" : "target")
            .foregroundColor(tintColor(for: context.state.mode))
    }

    func actionLabel(_ action: String) -> String {
        switch action {
        case "pause": return "Pause"
        case "resume": return "Reprendre"
        case "stop": return "Terminer"
        case "complete": return "Valider"
        default: return action
        }
    }
}

@available(iOS 17.0, *)
func tintColor(for mode: ActivityMode) -> Color {
    switch mode {
    case .focus: return .accentColor
    case .task: return .green
    case .sound: return .cyan
    case .sync: return .green
    }
}

@available(iOS 17.0, *)
func iconName(for mode: ActivityMode) -> String {
    switch mode {
    case .focus: return "target"
    case .task: return "checkmark.circle"
    case .sound: return "waveform"
    case .sync: return "arrow.clockwise"
    }
}

@available(iOS 17.0, *)
struct SoundWaveView: View {
    @State private var phase: Double = 0

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<5, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.cyan)
                    .frame(width: 3, height: 8 + 10 * abs(sin(phase + Double(i) * 0.8)))
                    .animation(.easeInOut(duration: 0.35).repeatForever(autoreverses: true), value: phase)
            }
        }
        .onAppear {
            phase = .pi
        }
    }
}

@available(iOS 17.0, *)
struct LockScreenView: View {
    let context: ActivityViewContext<EthoneActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconName(for: context.state.mode))
                    .foregroundColor(tintColor(for: context.state.mode))
                    .scaleEffect(1.2)
                Text(context.state.title)
                    .font(.headline)
                Spacer()
                Text(context.state.subtitle)
                    .font(.caption2)
                    .foregroundColor(.white)
            }
            if context.state.mode != .sound {
                ProgressView(value: Double(context.state.progress) ?? 0, total: 100)
                    .tint(tintColor(for: context.state.mode))
            } else {
                SoundWaveView()
                    .frame(height: 16)
            }
        }
        .padding()
    }

    func iconName(for mode: ActivityMode) -> String {
        switch mode {
        case .focus: return "target"
        case .task: return "checkmark.circle"
        case .sound: return "waveform"
        case .sync: return "arrow.clockwise"
        }
    }
}

@available(iOS 17.0, *)
struct EthoneLiveActivityIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Action ETHONE Live Activity"
    static var description: IntentDescription? = IntentDescription("Action declenchee depuis la Dynamic Island ETHONE.")

    var action: String

    init() {
        self.action = ""
    }

    init(action: String) {
        self.action = action
    }

    func perform() async throws -> some IntentResult {
        await MainActor.run {
            if let url = URL(string: "ethone://live-activity?action=\(action)") {
                UIApplication.shared.open(url, options: [:])
            }
        }
        return .result()
    }
}
