import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct QuickNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Nouvelle note rapide"
    static var description = IntentDescription("Crée une nouvelle note dans ETHONE.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Contenu")
    var content: String?

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(content ?? "", forKey: "ethone_pending_note")
        return .result()
    }
}

@available(iOS 18.0, *)
struct EthoneNewNoteControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: "dev.ethone.app.ios.control.note",
            provider: BoolControlValueProvider(value: false)
        ) { _ in
            ControlWidgetButton(action: QuickNoteIntent()) {
                Label("Note rapide", systemImage: "doc.text")
            }
        }
        .displayName("ETHONE Note")
        .description("Crée une note rapide.")
    }
}

@available(iOS 18.0, *)
struct BoolControlValueProvider: ControlValueProvider {
    typealias Value = Bool

    var value: Bool
    var previewValue: Value { value }

    func currentValue() async throws -> Value {
        value
    }
}
