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
    @ViewBuilder let content: Content
    @State private var isPressed = false

    var body: some View {
        content
            .scaleEffect(isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.35, dampingFraction: 0.75), value: isPressed)
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
    }
}
