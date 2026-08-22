import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct FocusControlProvider: ControlValueProvider {
    typealias Value = Bool

    var previewValue: Value { false }

    func currentValue() async throws -> Value {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        return shared?.bool(forKey: "ethone_focus_active") ?? false
    }
}

@available(iOS 18.0, *)
struct ToggleFocusIntent: SetValueIntent {
    typealias Value = Bool

    static var title: LocalizedStringResource = "Basculer ETHONE Focus"
    static var description = IntentDescription("Active ou désactive une session de concentration ETHONE.")

    @Parameter(title: "Actif")
    var value: Bool

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(value, forKey: "ethone_focus_active")

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

@available(iOS 18.0, *)
struct EthoneFocusControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "dev.ethone.app.ios.control.focus",
            provider: FocusControlProvider()
        ) { isActive in
            ControlWidgetToggle(
                "ETHONE Focus",
                isOn: isActive,
                action: ToggleFocusIntent()
            ) { on in
                Label(on ? "Focus actif" : "Lancer Focus", systemImage: on ? "target" : "target")
            }
        }
        .displayName("ETHONE Focus")
        .description("Active ou désactive la session de concentration.")
    }
}
