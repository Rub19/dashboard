import SwiftUI

/// Apparence : couleur d'accent de l'app (boutons, verre teinté, sélection).
struct AppearanceView: View {
    @Environment(AppModel.self) private var model

    private let palette: [(name: String, hex: UInt32)] = [
        ("Rose", 0xE11D5A), ("Violet", 0x8B5CF6), ("Indigo", 0x6366F1), ("Bleu", 0x3B82F6),
        ("Cyan", 0x06B6D4), ("Vert", 0x10B981), ("Orange", 0xF59E0B), ("Rouge", 0xEF4444),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                GlassCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Couleur d'accent").sectionTitle()
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 4), spacing: 14) {
                            ForEach(palette, id: \.hex) { entry in
                                Button {
                                    model.setAccent(entry.hex)
                                } label: {
                                    VStack(spacing: 6) {
                                        Circle()
                                            .fill(Color(hex: entry.hex).gradient)
                                            .frame(width: 44, height: 44)
                                            .overlay {
                                                if model.accentHex == entry.hex {
                                                    Image(systemName: "checkmark").font(.headline).foregroundStyle(.white)
                                                }
                                            }
                                        Text(entry.name).font(.caption2).foregroundStyle(.secondary)
                                    }
                                }
                                .buttonStyle(.plain)
                                .sensoryFeedback(.selection, trigger: model.accentHex)
                            }
                        }
                    }
                }
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Aperçu").sectionTitle()
                        HStack(spacing: 12) {
                            Button("Principal") {}.buttonStyle(.glassProminent)
                            Button("Secondaire") {}.buttonStyle(.glass)
                        }
                        Text("Le fond animé et le verre Liquid Glass s'adaptent automatiquement.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .navigationTitle("Apparence")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
    }
}
