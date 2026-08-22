import WidgetKit
import SwiftUI
import AppIntents

enum PresenceValue: String, AppEnum {
    case online = "En ligne"
    case busy = "Occupé"
    case away = "Absent"

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Présence ETHONE"

    static var caseDisplayRepresentations: [PresenceValue: DisplayRepresentation] = [
        .online: DisplayRepresentation(title: "En ligne"),
        .busy: DisplayRepresentation(title: "Occupé"),
        .away: DisplayRepresentation(title: "Absent"),
    ]
}

struct SetPresenceIntent: SetValueIntent {
    static var title: LocalizedStringResource = "Changer présence"
    static var description = IntentDescription("Change le statut de présence ETHONE.")

    @Parameter(title: "Présence")
    var value: PresenceValue

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(value.rawValue, forKey: "ethone_presence")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

struct EthonePresenceControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "dev.ethone.app.ios.control.presence",
            provider: PresenceControlProvider()
        ) { presence in
            ControlWidgetButton(action: SetPresenceIntent()) {
                Label(presence, systemImage: "person.fill")
            }
        }
        .displayName("ETHONE Présence")
        .description("Change le statut de présence.")
    }
}

struct PresenceControlProvider: ControlValueProvider {
    func currentValue() async throws -> String {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        return shared?.string(forKey: "ethone_presence") ?? "En ligne"
    }

    func previewValue() -> String {
        "En ligne"
    }
}
