import CoreSpotlight
import Foundation
import UniformTypeIdentifiers

/// Indexe notes et tâches dans Spotlight (recherche système) ; un appui ouvre la section correspondante.
enum SpotlightIndexer {
    static func index(notes: [Item], tasks: [Item]) {
        let searchable = (notes + tasks).map { item -> CSSearchableItem in
            let attributes = CSSearchableItemAttributeSet(contentType: .text)
            attributes.title = item.title
            attributes.contentDescription = item.kind == "task" ? (item.isDone ? "Tâche terminée" : "Tâche à faire") : item.plainBody
            attributes.contentModificationDate = item.updatedAt
            return CSSearchableItem(uniqueIdentifier: "\(item.kind)-\(item.id)", domainIdentifier: "dev.ethone.\(item.kind)", attributeSet: attributes)
        }
        CSSearchableIndex.default().indexSearchableItems(searchable) { _ in }
    }

    static func clear() {
        CSSearchableIndex.default().deleteAllSearchableItems { _ in }
    }

    /// Onglet à ouvrir pour un identifiant Spotlight (`note-…` ou `task-…`).
    static func tab(for identifier: String) -> AppTab? {
        if identifier.hasPrefix("task-") { return .tasks }
        if identifier.hasPrefix("note-") { return .notes }
        return nil
    }
}
