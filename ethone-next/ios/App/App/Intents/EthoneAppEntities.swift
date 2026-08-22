import AppIntents
import Foundation
import UIKit

@available(iOS 17.0, *)
struct EthoneNoteEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Note ETHONE"
    static var defaultQuery = EthoneNoteQuery()

    var id: UUID
    var title: String
    var content: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOS 17.0, *)
struct EthoneTaskEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Tâche ETHONE"
    static var defaultQuery = EthoneTaskQuery()

    var id: UUID
    var title: String
    var isCompleted: Bool

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOS 17.0, *)
struct EthoneNoteQuery: EntityQuery {
    typealias Entity = EthoneNoteEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneNoteEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let notes = shared?.array(forKey: "ethone_notes") as? [[String: String]] ?? []
        return notes.compactMap { dict in
            guard let idString = dict["id"], let id = UUID(uuidString: idString),
                  let title = dict["title"],
                  let content = dict["content"] else { return nil }
            return EthoneNoteEntity(id: id, title: title, content: content)
        }
    }

    func suggestedEntities() async throws -> [EthoneNoteEntity] {
        try await entities(for: [])
    }
}

@available(iOS 17.0, *)
struct EthoneTaskQuery: EntityQuery {
    typealias Entity = EthoneTaskEntity

    func entities(for identifiers: [UUID]) async throws -> [EthoneTaskEntity] {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let tasks = shared?.array(forKey: "ethone_tasks") as? [[String: Any]] ?? []
        return tasks.compactMap { dict in
            guard let idString = dict["id"] as? String,
                  let id = UUID(uuidString: idString),
                  let title = dict["title"] as? String,
                  let isCompleted = dict["completed"] as? Bool else { return nil }
            return EthoneTaskEntity(id: id, title: title, isCompleted: isCompleted)
        }
    }

    func suggestedEntities() async throws -> [EthoneTaskEntity] {
        try await entities(for: [])
    }
}

@available(iOS 17.0, *)
struct ShowNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Afficher une note ETHONE"
    static var description = IntentDescription("Ouvre une note specifique dans ETHONE.")

    @Parameter(title: "Note")
    var note: EthoneNoteEntity

    func perform() async throws -> some IntentResult {
        let encoded = note.title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://notes?id=\(note.id)&title=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 17.0, *)
struct CompleteTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Marquer une tache ETHONE faite"
    static var description = IntentDescription("Marque une tache ETHONE comme terminee.")

    @Parameter(title: "Tache")
    var task: EthoneTaskEntity

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(true, forKey: "ethone_task_completed_\(task.id)")
        return .result()
    }
}
