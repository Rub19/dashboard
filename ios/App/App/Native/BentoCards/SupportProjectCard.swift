import SwiftUI

struct SupportProjectCard: View {
    @State private var tapped = false

    private let stripeURL = URL(string: "https://donate.stripe.com/test_fZu5kD8923u73gn3Bv4Ni00")!

    var body: some View {
        Button {
            tapped.toggle()
            HapticManager.shared.playGlassTap()
            UIApplication.shared.open(stripeURL, options: [:])
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Image(systemName: "heart.fill")
                    .font(.title2)
                    .foregroundStyle(.pink)

                Text("Soutenir")
                    .font(.headline)

                Text("Buy me a coffee")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()
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
                                LinearGradient(gradient: Gradient(colors: [Color.pink.opacity(0.18), Color.clear]), startPoint: .top, endPoint: .bottom)
                                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                            )
                    )
            )
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact(weight: .light), trigger: tapped)
    }
}
