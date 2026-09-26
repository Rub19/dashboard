import AppIntents
import SwiftUI
import WidgetKit

/// Contrôles du Centre de contrôle, de l'écran verrouillé et du bouton Action (iOS 18+).
struct FocusControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.ethone.control.focus") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "ethone://focus")!)) {
                Label("Focus", systemImage: "timer")
            }
        }
        .displayName("Focus ETHONE")
        .description("Ouvre le minuteur de concentration.")
    }
}

struct NewTaskControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.ethone.control.task") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "ethone://tasks")!)) {
                Label("Tâches", systemImage: "checklist")
            }
        }
        .displayName("Tâches ETHONE")
        .description("Ouvre vos tâches.")
    }
}

struct NewNoteControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "dev.ethone.control.note") {
            ControlWidgetButton(action: OpenURLIntent(URL(string: "ethone://notes")!)) {
                Label("Notes", systemImage: "note.text")
            }
        }
        .displayName("Notes ETHONE")
        .description("Ouvre vos notes.")
    }
}
