import SwiftUI

struct FocusCardView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "target")
                .font(.title2)
                .foregroundStyle(.primary)

            Text("Focus")
                .font(.headline)

            Text("Session prête")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Button("Démarrer") {
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
            }
            .font(.caption.weight(.semibold))
            .padding(.vertical, 6)
            .padding(.horizontal, 12)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        .overlay(
                            LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.18), Color.clear]), startPoint: .top, endPoint: .bottom)
                                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        )
                )
        )
    }
}
