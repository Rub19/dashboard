import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct CaptureBrainIdeaIntent: AppIntent {
    static var title: LocalizedStringResource = "Capturer une idée"
    static var description = IntentDescription("Enregistre une idée rapide dans Brain ETHONE.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Idée", requestValueDialog: "Quelle est votre idée ?")
    var idea: String?

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(idea ?? "", forKey: "ethone_brain_idea")
        return .result()
    }
}

@available(iOS 18.0, *)
struct EthoneBrainIdeaControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "dev.ethone.app.ios.control.brain",
            provider: BoolControlValueProvider(value: false)
        ) { _ in
            ControlWidgetButton(action: CaptureBrainIdeaIntent()) {
                Label("Idée Brain", systemImage: "brain")
            }
        }
        .displayName("ETHONE Brain")
        .description("Capture une idée rapide.")
    }
}
