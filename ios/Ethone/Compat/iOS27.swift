import SwiftUI

/// Nouveautés d'iOS 27 utilisées avec repli sur iOS 26.
/// Le code iOS 27 n'est compilé qu'avec le SDK d'Xcode 27 (Swift 6.4+) et n'est exécuté que sur iOS 27.
extension DynamicViewContent {
    /// Glisser-déposer pour réordonner les lignes d'un `ForEach` (iOS 27).
    @ViewBuilder
    func ethoneReorderable() -> some View {
        #if compiler(>=6.4)
        if #available(iOS 27.0, *) {
            self.reorderable()
        } else {
            self
        }
        #else
        self
        #endif
    }
}

extension View {
    /// Conteneur qui reçoit les réordonnancements : `before` est l'identifiant de l'élément devant lequel insérer, `nil` pour la fin.
    @ViewBuilder
    func ethoneReorderContainer<Item: Identifiable>(for type: Item.Type, move: @escaping (_ sources: [Item.ID], _ before: Item.ID?) -> Void) -> some View {
        #if compiler(>=6.4)
        if #available(iOS 27.0, *) {
            self.reorderContainer(for: type) { difference in
                switch difference.destination.position {
                case .before(let id): move(difference.sources, id)
                case .end: move(difference.sources, nil)
                }
            }
        } else {
            self
        }
        #else
        self
        #endif
    }
}
