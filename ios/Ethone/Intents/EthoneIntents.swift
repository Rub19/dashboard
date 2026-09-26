import AppIntents
import Foundation

/// Raccourcis Siri, Spotlight, Action Button et app Raccourcis. Les intents s'exécutent dans le processus de l'app
/// (même en arrière-plan) : la session est donc restaurée avant tout appel réseau.
@MainActor
private func signedInModel() async throws -> AppModel {
    let model = AppModel.shared
    if model.auth.session == nil { await model.auth.restore() }
    guard model.auth.session != nil else { throw EthoneIntentError.notSignedIn }
    return model
}

enum EthoneIntentError: Error, CustomLocalizedStringResourceConvertible {
    case notSignedIn
    case failed(String)

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notSignedIn: return "Ouvrez ETHONE et connectez-vous d'abord."
        case .failed(let message): return "\(message)"
        }
    }
}

struct AddTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Ajouter une tâche"
    static let description = IntentDescription("Crée une nouvelle tâche dans ETHONE.")

    @Parameter(title: "Titre", requestValueDialog: "Quelle tâche voulez-vous ajouter ?")
    var taskTitle: String

    static var parameterSummary: some ParameterSummary {
        Summary("Ajouter la tâche \(\.$taskTitle)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = try await signedInModel()
        guard await model.tasks.create(title: taskTitle) != nil else {
            throw EthoneIntentError.failed(model.tasks.errorMessage ?? "La tâche n'a pas pu être créée.")
        }
        model.publishSnapshot()
        return .result(dialog: "C'est fait : « \(taskTitle) » est ajoutée.")
    }
}

struct AddNoteIntent: AppIntent {
    static let title: LocalizedStringResource = "Créer une note"
    static let description = IntentDescription("Enregistre une note rapide dans ETHONE.")

    @Parameter(title: "Titre", requestValueDialog: "Quel est le titre de la note ?")
    var noteTitle: String

    @Parameter(title: "Texte")
    var text: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Créer la note \(\.$noteTitle)") {
            \.$text
        }
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = try await signedInModel()
        guard await model.notes.create(title: noteTitle, body: HTMLText.html(from: text ?? "")) != nil else {
            throw EthoneIntentError.failed(model.notes.errorMessage ?? "La note n'a pas pu être créée.")
        }
        model.publishSnapshot()
        return .result(dialog: "Note « \(noteTitle) » enregistrée.")
    }
}

enum FocusPresetOption: String, AppEnum {
    case pomodoro, deepWork, sprint, flow, study, quick

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Préréglage de concentration"
    static let caseDisplayRepresentations: [FocusPresetOption: DisplayRepresentation] = [
        .pomodoro: "Pomodoro (25 min)",
        .deepWork: "Travail profond (50 min)",
        .sprint: "Sprint (15 min)",
        .flow: "Flow (90 min)",
        .study: "Étude (45 min)",
        .quick: "Éclair (10 min)",
    ]

    var preset: FocusPreset {
        switch self {
        case .pomodoro: return .pomodoro
        case .deepWork: return .deepWork
        case .sprint: return .sprint
        case .flow: return .flow
        case .study: return .study
        case .quick: return .quick
        }
    }
}

struct StartFocusIntent: AppIntent {
    static let title: LocalizedStringResource = "Démarrer une session de focus"
    static let description = IntentDescription("Lance le minuteur de concentration (Live Activity et Dynamic Island).")

    @Parameter(title: "Préréglage", default: .pomodoro)
    var preset: FocusPresetOption

    @Parameter(title: "Objectif")
    var goal: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Démarrer \(\.$preset)") {
            \.$goal
        }
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = try await signedInModel()
        model.focus.start(preset: preset.preset, goal: goal ?? "")
        return .result(dialog: "Session de \(preset.preset.work) minutes lancée. Bonne concentration !")
    }
}

struct StopFocusIntent: AppIntent {
    static let title: LocalizedStringResource = "Arrêter la session de focus"

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = try await signedInModel()
        model.focus.stop()
        return .result(dialog: "Session arrêtée.")
    }
}

enum SectionOption: String, AppEnum {
    case home, notes, tasks, focus, habits, calendar, weather

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Section d'ETHONE"
    static let caseDisplayRepresentations: [SectionOption: DisplayRepresentation] = [
        .home: "Accueil", .notes: "Notes", .tasks: "Tâches", .focus: "Focus",
        .habits: "Habitudes", .calendar: "Calendrier", .weather: "Météo",
    ]
}

struct OpenSectionIntent: AppIntent {
    static let title: LocalizedStringResource = "Ouvrir une section d'ETHONE"
    static let openAppWhenRun = true

    @Parameter(title: "Section", default: .home)
    var section: SectionOption

    static var parameterSummary: some ParameterSummary {
        Summary("Ouvrir \(\.$section)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "ethone://\(section.rawValue)") { AppModel.shared.handle(url: url) }
        return .result()
    }
}

// MARK: - Entités (Siri, Spotlight, Raccourcis)

struct TaskEntity: AppEntity {
    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Tâche"
    static let defaultQuery = TaskEntityQuery()

    let id: String
    let title: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(title)") }
}

struct TaskEntityQuery: EntityQuery {
    @MainActor
    func entities(for identifiers: [String]) async throws -> [TaskEntity] {
        let model = try await signedInModel()
        if model.tasks.items.isEmpty { await model.tasks.refresh() }
        return model.tasks.items.filter { identifiers.contains($0.id) }.map { TaskEntity(id: $0.id, title: $0.title) }
    }

    @MainActor
    func suggestedEntities() async throws -> [TaskEntity] {
        let model = try await signedInModel()
        if model.tasks.items.isEmpty { await model.tasks.refresh() }
        return model.tasks.items.filter { !$0.isDone }.prefix(10).map { TaskEntity(id: $0.id, title: $0.title) }
    }
}

struct CompleteTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Terminer une tâche"

    @Parameter(title: "Tâche")
    var task: TaskEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Terminer \(\.$task)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let model = try await signedInModel()
        await model.completeTask(id: task.id)
        NotificationManager.cancelTask(id: task.id)
        model.publishSnapshot()
        return .result(dialog: "« \(task.title) » est terminée.")
    }
}

// MARK: - Phrases Siri

struct EthoneShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: ["Ajoute une tâche dans \(.applicationName)", "Nouvelle tâche \(.applicationName)"],
            shortTitle: "Nouvelle tâche",
            systemImageName: "checklist"
        )
        AppShortcut(
            intent: AddNoteIntent(),
            phrases: ["Crée une note dans \(.applicationName)", "Nouvelle note \(.applicationName)"],
            shortTitle: "Nouvelle note",
            systemImageName: "note.text.badge.plus"
        )
        AppShortcut(
            intent: StartFocusIntent(),
            phrases: ["Démarre un focus \(.applicationName)", "Lance une session de concentration dans \(.applicationName)"],
            shortTitle: "Démarrer un focus",
            systemImageName: "timer"
        )
        AppShortcut(
            intent: StopFocusIntent(),
            phrases: ["Arrête le focus \(.applicationName)"],
            shortTitle: "Arrêter le focus",
            systemImageName: "stop.circle"
        )
        AppShortcut(
            intent: OpenSectionIntent(),
            phrases: ["Ouvre \(.applicationName)"],
            shortTitle: "Ouvrir ETHONE",
            systemImageName: "sparkles"
        )
    }
}
