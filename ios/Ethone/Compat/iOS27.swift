import SwiftUI

extension DynamicViewContent {
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

