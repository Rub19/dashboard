import SwiftUI

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
                        Text("Thème").sectionTitle()
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 14) {
                            ForEach(ThemePreset.allCases) { preset in
                                Button {
                                    model.setTheme(preset)
                                } label: {
                                    VStack(spacing: 6) {
                                        themeSwatch(preset)
                                        Text(preset.label).font(.caption2).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.8)
                                    }
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(preset.label)
                                .accessibilityAddTraits(model.themePreset == preset ? [.isSelected] : [])
                                .sensoryFeedback(.selection, trigger: model.themePreset)
                            }
                        }
                    }
                }

                GlassCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Couleur d'accent").sectionTitle()
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 4), spacing: 14) {
                            Button {
                                model.setAccent(nil)
                            } label: {
                                VStack(spacing: 6) {
                                    Circle()
                                        .fill(Color(hex: model.themePreset.accent).gradient)
                                        .frame(width: 44, height: 44)
                                        .overlay {
                                            Image(systemName: model.chosenAccentHex == nil ? "checkmark" : "wand.and.stars")
                                                .font(.headline)
                                                .foregroundStyle(Theme.luminance(model.themePreset.accent) > 0.4 ? Color.black : Color.white)
                                        }
                                    Text("Auto").font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Accent automatique, celui du thème")
                            .accessibilityAddTraits(model.chosenAccentHex == nil ? [.isSelected] : [])

                            ForEach(palette, id: \.hex) { entry in
                                Button {
                                    model.setAccent(entry.hex)
                                } label: {
                                    VStack(spacing: 6) {
                                        Circle()
                                            .fill(Color(hex: entry.hex).gradient)
                                            .frame(width: 44, height: 44)
                                            .overlay {
                                                if model.chosenAccentHex == entry.hex {
                                                    Image(systemName: "checkmark").font(.headline)
                                                        .foregroundStyle(Theme.luminance(entry.hex) > 0.4 ? Color.black : Color.white)
                                                }
                                            }
                                        Text(entry.name).font(.caption2).foregroundStyle(.secondary)
                                    }
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(entry.name)
                                .accessibilityAddTraits(model.chosenAccentHex == entry.hex ? [.isSelected] : [])
                            }
                        }
                        .sensoryFeedback(.selection, trigger: model.accentHex)
                        Text("« Auto » reprend l'accent du thème. Les boutons pleins s'assombrissent automatiquement si la couleur choisie est trop claire pour un texte blanc.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }

                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Aperçu").sectionTitle()
                        HStack(spacing: 12) {
                            Button("Principal") {}.buttonStyle(.glassProminent)
                            Button("Secondaire") {}.buttonStyle(.glass)
                        }
                        Text("Le fond animé et le verre Liquid Glass s'adaptent au thème, clair ou sombre.").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .navigationTitle("Apparence")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
    }

    private func themeSwatch(_ preset: ThemePreset) -> some View {
        let base = Color(hex: preset.base)
        return RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [base, base.mix(with: Color(hex: preset.secondary), by: preset.isLight ? 0.25 : 0.4 * preset.glow)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .frame(height: 56)
            .overlay(alignment: .bottomTrailing) {
                Circle().fill(Color(hex: preset.accent)).frame(width: 16, height: 16)
                    .overlay(Circle().stroke(preset.isLight ? Color.black.opacity(0.2) : Color.white.opacity(0.35), lineWidth: 1))
                    .padding(8)
            }
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(model.themePreset == preset ? Color(hex: model.accentHex) : Color.primary.opacity(0.12), lineWidth: model.themePreset == preset ? 3 : 1)
            }
    }
}

