import SwiftUI

public struct SettingsView: View {
    @AppStorage("ethone_accent_color") private var accentColor = "emerald"
    @AppStorage("ethone_sound_enabled") private var soundEnabled = true
    @AppStorage("ethone_haptics_enabled") private var hapticsEnabled = true
    @AppStorage("ethone_brain_memory") private var brainMemoryEnabled = true
    @State private var showingSignOutAlert = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                List {
                    // Profile Header Card
                    Section {
                        HStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(ETHTheme.emerald.opacity(0.18))
                                    .frame(width: 54, height: 54)
                                Text("R")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundStyle(ETHTheme.emerald)
                            }

                            VStack(alignment: .leading, spacing: 3) {
                                HStack(spacing: 6) {
                                    Text("Rub")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundStyle(.primary)
                                    ETHStatusBadge(label: "Pro", tone: ETHTheme.emerald)
                                }
                                Text("rub19.mailpro@gmail.com")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.ultraThinMaterial)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.1), lineWidth: 0.8))
                    )

                    // Apparence
                    Section(header: Text("Apparence & Design")) {
                        Picker("Couleur d'accent", selection: $accentColor) {
                            Text("Émeraude (Défaut)").tag("emerald")
                            Text("Violet ETHONE").tag("violet")
                            Text("Cyan Électrique").tag("cyan")
                            Text("Ambre Solaire").tag("amber")
                            Text("Rose Néon").tag("rose")
                        }

                        HStack {
                            Text("Matériau Liquid Glass")
                            Spacer()
                            Text("Actif (iOS 26)")
                                .font(.system(size: 13))
                                .foregroundStyle(ETHTheme.emerald)
                        }
                    }
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(.ultraThinMaterial)
                    )

                    // Brain & IA
                    Section(header: Text("Brain & Intelligence")) {
                        Toggle("Mémoire contextuelle Brain", isOn: $brainMemoryEnabled)
                            .tint(ETHTheme.violet)

                        NavigationLink(destination: BrainSettingsDetailView()) {
                            HStack {
                                Text("Modèles & Fournisseurs")
                                Spacer()
                                Text("Claude 3.7 / GPT-5")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(.ultraThinMaterial)
                    )

                    // Audio & Haptics
                    Section(header: Text("Sensations & Audio")) {
                        Toggle("Effets sonores immersifs", isOn: $soundEnabled)
                            .tint(ETHTheme.cyan)
                        Toggle("Retours haptiques hifi", isOn: $hapticsEnabled)
                            .tint(ETHTheme.emerald)
                    }
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(.ultraThinMaterial)
                    )

                    // Sécurité & Données
                    Section(header: Text("Sécurité")) {
                        HStack {
                            Text("Protection biométrique Face ID")
                            Spacer()
                            Image(systemName: "faceid")
                                .foregroundStyle(ETHTheme.emerald)
                        }

                        Button(role: .destructive, action: { showingSignOutAlert = true }) {
                            Text("Se déconnecter")
                        }
                    }
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(.ultraThinMaterial)
                    )

                    // About
                    Section {
                        VStack(spacing: 4) {
                            Text("ETHONE OS pour iPhone")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.primary)
                            Text("Version 1.11.00 (Native Swift 6 / iOS 26)")
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                    .listRowBackground(Color.clear)
                }
                .scrollContentBackground(.hidden)
                .padding(.bottom, 80)
            }
            .navigationTitle("Réglages")
            .confirmationDialog("Voulez-vous vraiment vous déconnecter ?", isPresented: $showingSignOutAlert, titleVisibility: .visible) {
                Button("Déconnexion", role: .destructive) {}
                Button("Annuler", role: .cancel) {}
            }
        }
    }
}

struct BrainSettingsDetailView: View {
    var body: some View {
        ZStack {
            AmbientBackground()
            List {
                Section(header: Text("Fournisseurs Connectés")) {
                    HStack {
                        Text("Anthropic (Claude 3.7)")
                        Spacer()
                        ETHStatusBadge(label: "Connecté", tone: ETHTheme.emerald)
                    }
                    HStack {
                        Text("OpenAI (GPT-5 Omni)")
                        Spacer()
                        ETHStatusBadge(label: "Connecté", tone: ETHTheme.emerald)
                    }
                    HStack {
                        Text("DeepSeek (R1)")
                        Spacer()
                        ETHStatusBadge(label: "Connecté", tone: ETHTheme.emerald)
                    }
                }
                .listRowBackground(RoundedRectangle(cornerRadius: 14).fill(.ultraThinMaterial))
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Modèles IA")
        .navigationBarTitleDisplayMode(.inline)
    }
}
