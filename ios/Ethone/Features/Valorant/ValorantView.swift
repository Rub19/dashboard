import SwiftUI

/// Tracker Valorant : dernières parties via l'API HenrikDev. Depuis le patch 13.06 le score affiché est le score de
/// performance (0-500) tel que fourni par l'API ; il n'est jamais recalculé (« — » s'il est absent).
struct ValorantView: View {
    @Environment(AppModel.self) private var model
    @State private var editing = false

    private var store: ValorantStore { model.valorant }

    private var wins: Int { store.matches.filter(\.won).count }
    private var kd: Double {
        let kills = store.matches.reduce(0) { $0 + $1.kills }
        let deaths = store.matches.reduce(0) { $0 + $1.deaths }
        return deaths == 0 ? Double(kills) : Double(kills) / Double(deaths)
    }

    /// Moyenne du score de performance sur les parties qui le fournissent ; ACS seulement pour les anciennes parties.
    private var scoreSummary: (label: String, value: Int?) {
        let performance = store.matches.filter { $0.scoring == .performance }.compactMap(\.scoreValue)
        if !performance.isEmpty { return ("PERF moyen", performance.reduce(0, +) / performance.count) }
        let legacy = store.matches.filter { $0.scoring == .acs }.compactMap(\.scoreValue)
        if !legacy.isEmpty { return ("ACS moyen (ancien)", legacy.reduce(0, +) / legacy.count) }
        return ("PERF moyen", nil)
    }

    var body: some View {
        List {
            if !store.isConfigured {
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Renseignez votre pseudo Riot (nom + tag) pour afficher vos parties.").font(.subheadline)
                        Button("Configurer") { editing = true }.buttonStyle(.glassProminent)
                    }
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            } else {
                Section {
                    GlassEffectContainer(spacing: 12) {
                        HStack(spacing: 12) {
                            tile("\(store.matches.isEmpty ? 0 : wins * 100 / store.matches.count) %", "Victoires", "trophy.fill")
                            tile(String(format: "%.2f", kd), "K/D", "scope")
                            tile(scoreSummary.value.map(String.init) ?? "—", scoreSummary.label, "chart.bar.fill")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                } footer: {
                    Text("Depuis le patch 13.06, le score de performance (0-500) remplace l'ACS. Riot n'ayant pas publié sa formule, il n'est jamais recalculé : « — » signifie que l'API ne le fournit pas pour cette partie.")
                }
            }

            if let message = store.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(store.matches) { match in
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 3).fill(match.won ? Theme.success : Theme.danger).frame(width: 4, height: 44)
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(match.agent) · \(match.map)").font(.headline).lineLimit(1)
                            Text("\(match.mode) · \(match.teamRounds)-\(match.opponentRounds)").font(.caption).foregroundStyle(.secondary)
                            if let date = match.startedAt { Text(date, format: .relative(presentation: .named)).font(.caption2).foregroundStyle(.tertiary) }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 3) {
                            Text("\(match.kills)/\(match.deaths)/\(match.assists)").font(.subheadline.monospacedDigit())
                            Text("\(match.scoreLabel) \(match.scoreValue.map(String.init) ?? "—")")
                                .font(.caption.monospacedDigit().weight(.semibold))
                                .foregroundStyle(match.scoreValue == nil ? Color.secondary : Theme.accentSoft)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            } header: { if store.isConfigured { Text("\(store.playerName)#\(store.tag)").sectionTitle() } }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if store.isConfigured && store.matches.isEmpty && !store.isLoading && store.errorMessage == nil {
                ContentUnavailableView("Aucune partie", systemImage: "scope", description: Text("Aucune partie récente trouvée pour ce joueur."))
            } else if store.isLoading && store.matches.isEmpty {
                ProgressView()
            }
        }
        .navigationTitle("Valorant")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { editing = true } label: { Image(systemName: "gearshape") }
            }
        }
        .refreshable { await store.refresh() }
        .task {
            await store.adoptAccountIdentityIfNeeded()
            await store.refresh()
        }
        .sheet(isPresented: $editing) { ValorantSettingsSheet() }
    }

    private func tile(_ value: String, _ label: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).foregroundStyle(Theme.accentSoft)
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 18))
    }
}

struct ValorantSettingsSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var tag = ""
    @State private var key = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Compte Riot") {
                    TextField("Pseudo", text: $name).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Tag (sans #)", text: $tag).textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                Section {
                    SecureField("Clé API HenrikDev (facultatif)", text: $key)
                } footer: {
                    Text("Sans clé, l'API est limitée. La clé reste dans le trousseau de cet appareil.")
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Valorant")
            .ethoneScreen()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") {
                        model.valorant.save(name: name, tag: tag, apiKey: key)
                        dismiss()
                        Task { await model.valorant.refresh() }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || tag.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                name = model.valorant.playerName
                tag = model.valorant.tag
                key = model.valorant.apiKey
            }
        }
        .presentationDetents([.medium])
    }
}
