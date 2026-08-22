import AppIntents
import Foundation

@available(iOS 26.0, *)
struct StartFocusTimerIntent: AppIntent {
    static var title: LocalizedStringResource = "Démarrer une session Focus"
    static var description: IntentDescription? = IntentDescription("Lance un minuteur Pomodoro ETHONE.")

    @Parameter(title: "Durée", default: 25)
    var duration: Int

    func perform() async throws -> some IntentResult {
        // In a real app, this would trigger the FocusTimerCard state.
        print("StartFocusTimerIntent: \(duration) minutes")
        return .result()
    }
}

@available(iOS 26.0, *)
struct AddQuickTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Ajouter une tâche rapide"
    static var description: IntentDescription? = IntentDescription("Ajoute une tâche à ETHONE.")

    @Parameter(title: "Titre")
    var title: String

    func perform() async throws -> some IntentResult {
        print("AddQuickTaskIntent: \(title)")
        return .result()
    }
}

@available(iOS 26.0, *)
struct DashboardStatusIntent: AppIntent {
    static var title: LocalizedStringResource = "Consulter le statut du Dashboard"
    static var description: IntentDescription? = IntentDescription("Retourne le nombre de tâches et de notes.")

    func perform() async throws -> some IntentResult & ReturnsValue {
        return .result(value: "Dashboard actif")
    }
}

@available(iOS 26.0, *)
struct CaptureBrainIdeaIntent: AppIntent {
    static var title: LocalizedStringResource = "Capturer une idée Brain"
    static var description: IntentDescription? = IntentDescription("Enregistre une idée rapide dans ETHONE.")

    @Parameter(title: "Idée")
    var idea: String

    func perform() async throws -> some IntentResult {
        print("CaptureBrainIdeaIntent: \(idea)")
        return .result()
    }
}
