import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
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

@available(iOS 18.0, *)
struct OpenPresenceIntent: AppIntent {
    static var title: LocalizedStringResource = "Ouvrir ETHONE Présence"
    static var description = IntentDescription("Ouvre la page de présence ETHONE.")
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        return .result()
    }
}

@available(iOS 18.0, *)
struct EthonePresenceControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "dev.ethone.app.ios.control.presence",
            provider: PresenceControlProvider()
        ) { presence in
            ControlWidgetButton(action: OpenPresenceIntent()) {
                Label(presence, systemImage: "person.fill")
            }
        }
        .displayName("ETHONE Présence")
        .description("Change le statut de présence.")
    }
}

@available(iOS 18.0, *)
struct PresenceControlProvider: ControlValueProvider {
    typealias Value = String

    var previewValue: Value { "En ligne" }

    func currentValue() async throws -> Value {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        return shared?.string(forKey: "ethone_presence") ?? "En ligne"
    }
}
