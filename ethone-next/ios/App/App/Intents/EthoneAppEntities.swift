import AppIntents
import CoreSpotlight
import Foundation
import UIKit

// MARK: - iOS 26 Indexed Entities

@available(iOS 26.0, *)
struct EthoneNoteEntity: AppEntity, IndexedEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Note ETHONE"
    static var defaultQuery = EthoneNoteQuery()

    var id: UUID

    @Property(indexingKey: \.displayName)
    var title: String

    @Property(indexingKey: \.contentDescription)
    var content: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOS 26.0, *)
struct EthoneTaskEntity: AppEntity, IndexedEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Tâche ETHONE"
    static var defaultQuery = EthoneTaskQuery()

    var id: UUID

    @Property(indexingKey: \.displayName)
    var title: String

    @Property(indexingKey: \.contentDescription)
    var summary: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOS 26.0, *)
struct EthoneProjectEntity: AppEntity, IndexedEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Projet ETHONE"
    static var defaultQuery = EthoneProjectQuery()

    var id: UUID

    @Property(indexingKey: \.displayName)
    var name: String

    @Property(indexingKey: \.contentDescription)
    var summary: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

@available(iOS 26.0, *)
struct EthoneFocusSessionEntity: AppEntity, IndexedEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Session Focus ETHONE"
    static var defaultQuery = EthoneFocusSessionQuery()

    var id: UUID

    @Property(indexingKey: \.displayName)
    var name: String

    @Property(indexingKey: \.contentDescription)
    var duration: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

// MARK: - Queries

@available(iOS 26.0, *)
struct EthoneNoteQuery: EntityQuery {
    typealias Entity = EthoneNoteEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneNoteEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let notes = shared?.array(forKey: "ethone_notes") as? [[String: String]] ?? []
        return notes.compactMap { dict in
            guard let idString = dict["id"], let id = UUID(uuidString: idString),
                  let title = dict["title"] else { return nil }
            return EthoneNoteEntity(id: id, title: title, content: dict["content"] ?? "")
        }
    }

    func suggestedEntities() async throws -> [EthoneNoteEntity] {
        try await entities(for: [])
    }
}

@available(iOS 26.0, *)
struct EthoneTaskQuery: EntityQuery {
    typealias Entity = EthoneTaskEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneTaskEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let tasks = shared?.array(forKey: "ethone_tasks") as? [[String: Any]] ?? []
        return tasks.compactMap { dict in
            guard let idString = dict["id"] as? String,
                  let id = UUID(uuidString: idString),
                  let title = dict["title"] as? String else { return nil }
            return EthoneTaskEntity(id: id, title: title, summary: "")
        }
    }

    func suggestedEntities() async throws -> [EthoneTaskEntity] {
        try await entities(for: [])
    }
}

@available(iOS 26.0, *)
struct EthoneProjectQuery: EntityQuery {
    typealias Entity = EthoneProjectEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneProjectEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let projects = shared?.array(forKey: "ethone_projects") as? [[String: String]] ?? []
        return projects.compactMap { dict in
            guard let idString = dict["id"], let id = UUID(uuidString: idString),
                  let name = dict["name"] else { return nil }
            return EthoneProjectEntity(id: id, name: name, summary: dict["summary"] ?? "")
        }
    }

    func suggestedEntities() async throws -> [EthoneProjectEntity] {
        try await entities(for: [])
    }
}

@available(iOS 26.0, *)
struct EthoneFocusSessionQuery: EntityQuery {
    typealias Entity = EthoneFocusSessionEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneFocusSessionEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let sessions = shared?.array(forKey: "ethone_focus_sessions") as? [[String: String]] ?? []
        return sessions.compactMap { dict in
            guard let idString = dict["id"], let id = UUID(uuidString: idString),
                  let name = dict["name"] else { return nil }
            return EthoneFocusSessionEntity(id: id, name: name, duration: dict["duration"] ?? "25")
        }
    }

    func suggestedEntities() async throws -> [EthoneFocusSessionEntity] {
        try await entities(for: [])
    }
}

// MARK: - iOS 26 App Intents

@available(iOS 26.0, *)
struct CreateNoteIntent26: AppIntent {
    static var title: LocalizedStringResource = "Créer une note ETHONE"
    static var description = IntentDescription("Crée une note indexée dans ETHONE.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Titre")
    var title: String

    @Parameter(title: "Contenu")
    var body: String

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let note: [String: String] = [
            "id": UUID().uuidString,
            "title": title,
            "content": body
        ]
        var notes = shared?.array(forKey: "ethone_notes") as? [[String: String]] ?? []
        notes.append(note)
        shared?.set(notes, forKey: "ethone_notes")

        let encodedTitle = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let encodedBody = body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://notes/new?title=\(encodedTitle)&body=\(encodedBody)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 26.0, *)
struct StartFocusSessionIntent: AppIntent {
    static var title: LocalizedStringResource = "Démarrer une session Focus ETHONE"
    static var description = IntentDescription("Lance une session de concentration avec une durée.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Durée", default: 25)
    var minutes: Int

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(true, forKey: "ethone_focus_active")
        shared?.set(minutes, forKey: "ethone_focus_minutes")

        let url = URL(string: "ethone://focus?minutes=\(minutes)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 26.0, *)
struct ChangePresenceIntent26: AppIntent {
    static var title: LocalizedStringResource = "Changer ma présence ETHONE"
    static var description = IntentDescription("Change le statut de présence.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Statut")
    var status: String

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(status, forKey: "ethone_presence")

        let encoded = status.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://system?status=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 26.0, *)
struct OpenProjectIntent: AppIntent {
    static var title: LocalizedStringResource = "Ouvrir un projet ETHONE"
    static var description = IntentDescription("Ouvre un projet spécifique dans ETHONE.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Projet")
    var project: EthoneProjectEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        let encoded = project.name.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://projects?id=\(project.id)&name=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 26.0, *)
struct OpenTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Ouvrir une tâche ETHONE"
    static var description = IntentDescription("Ouvre une tâche spécifique dans ETHONE.")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Tâche")
    var task: EthoneTaskEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        let encoded = task.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://tasks?id=\(task.id)&title=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 26.0, *)
struct CompleteTaskIntent26: AppIntent {
    static var title: LocalizedStringResource = "Marquer une tâche ETHONE terminée"
    static var description = IntentDescription("Marque une tâche comme terminée.")

    @Parameter(title: "Tâche")
    var task: EthoneTaskEntity

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(true, forKey: "ethone_task_completed_\(task.id)")

        let encoded = task.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://tasks?id=\(task.id)&title=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}
