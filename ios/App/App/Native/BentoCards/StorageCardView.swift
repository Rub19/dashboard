import SwiftUI

struct StorageCardView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: "internaldrive")
                .font(.title2)

            Text("Stockage")
                .font(.headline)

            Text("12 % utilisé")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            GeometryReader { geo in
                RoundedRectangle(cornerRadius: 4)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        HStack {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.cyan)
                                .frame(width: geo.size.width * 0.12)
                            Spacer()
                        }
                    )
            }
            .frame(height: 8)
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
