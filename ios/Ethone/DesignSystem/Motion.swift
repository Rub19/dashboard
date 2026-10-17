import SwiftUI

/// ETHONE motion tokens, mirrored from the web (`lib/ease.ts`): snap for state changes, reveal for entrances.
enum Motion {
    static let snap = Animation.spring(response: 0.38, dampingFraction: 0.86)
    static let swap = Animation.spring(response: 0.3, dampingFraction: 0.9)
    static let reveal = Animation.spring(response: 0.62, dampingFraction: 0.9)
    static let stagger = 0.07
}

/// Staged entrance: rises out of a soft blur into focus, `order` steps after the first element.
private struct RevealModifier: ViewModifier {
    let order: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 14)
            .blur(radius: shown || reduceMotion ? 0 : 8)
            .onAppear {
                withAnimation(reduceMotion ? .easeOut(duration: 0.2) : Motion.reveal.delay(Double(order) * Motion.stagger)) {
                    shown = true
                }
            }
    }
}

extension View {
    func reveal(_ order: Int = 0) -> some View { modifier(RevealModifier(order: order)) }
}

/// The short accent stroke that opens every ETHONE headline; draws itself in from the left.
struct AccentRule: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drawn = false

    var body: some View {
        Capsule()
            .fill(LinearGradient(colors: [Theme.accent, Theme.accent.opacity(0)], startPoint: .leading, endPoint: .trailing))
            .frame(width: 48, height: 3)
            .scaleEffect(x: drawn ? 1 : 0, anchor: .leading)
            .onAppear {
                withAnimation(reduceMotion ? nil : .timingCurve(0.16, 1, 0.3, 1, duration: 0.8)) { drawn = true }
            }
            .accessibilityHidden(true)
    }
}

/// Two-line display headline: the second line fades from the text color into the theme accent, like the web hero.
struct EthoneHeadline: View {
    let first: String
    let second: String
    var size: Font.TextStyle = .largeTitle
    var alignment: HorizontalAlignment = .leading

    var body: some View {
        VStack(alignment: alignment, spacing: 0) {
            Text(first)
                .foregroundStyle(.primary)
            Text(second)
                .foregroundStyle(LinearGradient(colors: [.primary, Theme.accent], startPoint: .leading, endPoint: .trailing))
        }
        .font(.system(size, weight: .semibold))
        .multilineTextAlignment(alignment == .center ? .center : .leading)
        .tracking(-0.9)
        .lineSpacing(-2)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isHeader)
    }
}

/// "1 tâche" / "3 tâches": French count with the right noun form, instead of "tâche(s)".
func plural(_ count: Int, _ one: String, _ many: String) -> String {
    "\(count) \(abs(count) <= 1 ? one : many)"
}
