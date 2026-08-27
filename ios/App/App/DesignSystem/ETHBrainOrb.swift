import SwiftUI

public enum BrainOrbState {
    case idle
    case listening
    case thinking
    case speaking
}

public struct ETHBrainOrb: View {
    let state: BrainOrbState
    let size: CGFloat

    @State private var rotate = false
    @State private var pulse = false

    public init(state: BrainOrbState = .idle, size: CGFloat = 64) {
        self.state = state
        self.size = size
    }

    public var body: some View {
        ZStack {
            // Glow layer
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            state == .thinking ? ETHTheme.violet.opacity(0.6) : ETHTheme.emerald.opacity(0.4),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: size * 0.8
                    )
                )
                .frame(width: size * 1.5, height: size * 1.5)
                .scaleEffect(pulse ? 1.15 : 0.95)
                .blur(radius: 12)

            // Inner Orb gradient
            Circle()
                .fill(
                    AngularGradient(
                        colors: [
                            ETHTheme.violet,
                            ETHTheme.cyan,
                            ETHTheme.emerald,
                            ETHTheme.teal,
                            ETHTheme.violet
                        ],
                        center: .center
                    )
                )
                .frame(width: size, height: size)
                .rotationEffect(.degrees(rotate ? 360 : 0))
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.35), lineWidth: 1)
                )
                .overlay(
                    // Specular highlight
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [Color.white.opacity(0.4), Color.clear],
                                startPoint: .topLeading,
                                endPoint: .center
                            )
                        )
                        .padding(4)
                )
                .shadow(color: ETHTheme.violet.opacity(0.5), radius: 10, x: 0, y: 4)
        }
        .onAppear {
            withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                rotate = true
            }
            withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}
