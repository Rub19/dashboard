import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct EthoneFocusControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.ethone.app.control.focus") {
            ControlWidgetButton(action: StartFocusTimerIntent()) {
                Label("Focus", systemImage: "target")
            }
        }
        .displayName("ETHONE Focus")
        .description("Démarrer une session Focus")
    }
}

@available(iOS 18.0, *)
struct EthoneBrainControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.ethone.app.control.brain") {
            let intent = CaptureBrainIdeaIntent()
            intent.idea = "Nouvelle idée"
            return ControlWidgetButton(action: intent) {
                Label("Brain", systemImage: "sparkles")
            }
        }
        .displayName("ETHONE Brain")
        .description("Capturer une idée")
    }
}
