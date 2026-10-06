import SwiftUI

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
        .overlay {
            Circle()
                .stroke(
                    LinearGradient(
                        stops: [
                            .init(color: .white.opacity(0.42), location: 0.0),
                            .init(color: .white.opacity(0.12), location: 0.4),
                            .init(color: .clear, location: 0.7),
                            .init(color: .white.opacity(0.20), location: 1.0)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 0.9
                )
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { breathing = true }
        }
    }
}

