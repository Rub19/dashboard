import SwiftUI

/// Orbe animée de l'assistant Brain.
struct ETHBrainOrb: View {
    @State private var breathing = false

    var body: some View {
        ZStack {
            Circle()
                .fill(RadialGradient(colors: [Theme.accentSoft, Theme.violet, Theme.indigo], center: .topLeading, startRadius: 4, endRadius: 110))
                .scaleEffect(breathing ? 1.05 : 0.95)
            Image(systemName: "sparkles")
                .font(.system(size: 38, weight: .semibold))
                .foregroundStyle(.white)
        }
        .glassEffect(.regular, in: .circle)
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { breathing = true }
        }
    }
}
