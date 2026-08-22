import SwiftUI

struct BentoGridView<Content: View>: View {
    let columns: [GridItem]
    @ViewBuilder let content: Content

    var body: some View {
        LazyVGrid(columns: columns, spacing: 14) {
            content
        }
    }
}

struct BentoPressable<Content: View>: View {
    let id: String
    var namespace: Namespace.ID?
    var onTap: (() -> Void)?
    @ViewBuilder let content: Content

    @State private var isPressed = false

    var body: some View {
        let view = content
            .scaleEffect(isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.35, dampingFraction: 0.75), value: isPressed)
            .onTapGesture {
                onTap?()
            }
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                    }
            )

        if let namespace = namespace {
            view.matchedGeometryEffect(id: id, in: namespace, properties: .position, anchor: .center, isSource: true)
        } else {
            view
        }
    }
}
