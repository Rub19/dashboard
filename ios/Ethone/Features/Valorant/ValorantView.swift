import SwiftUI

/// Agent portraits and map art from valorant-api.com, keyed by their English names (as returned by HenrikDev).
@MainActor
@Observable
final class ValorantAssets {
    static let shared = ValorantAssets()
    private(set) var agents: [String: URL] = [:]
    private(set) var maps: [String: URL] = [:]
    /// Grandes images de carte (bannières des matchs).
    private(set) var splashes: [String: URL] = [:]
    private var loaded = false

    func load() async {
        guard !loaded else { return }
        loaded = true
        struct Page<T: Decodable>: Decodable { let data: [T] }
        struct Agent: Decodable { let displayName: String; let displayIcon: String? }
        struct GameMap: Decodable { let displayName: String; let listViewIcon: String?; let splash: String? }
        let decoder = JSONDecoder()
        if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true")!),
           let page = try? decoder.decode(Page<Agent>.self, from: data) {
            agents = Dictionary(page.data.compactMap { a in a.displayIcon.flatMap(URL.init(string:)).map { (a.displayName.lowercased(), $0) } }, uniquingKeysWith: { a, _ in a })
        }
        if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/maps")!),
           let page = try? decoder.decode(Page<GameMap>.self, from: data) {
            maps = Dictionary(page.data.compactMap { m in m.listViewIcon.flatMap(URL.init(string:)).map { (m.displayName.lowercased(), $0) } }, uniquingKeysWith: { a, _ in a })
            splashes = Dictionary(page.data.compactMap { m in m.splash.flatMap(URL.init(string:)).map { (m.displayName.lowercased(), $0) } }, uniquingKeysWith: { a, _ in a })
        }
    }
}

struct ValorantView: View {
    @Environment(AppModel.self) private var model
    @State private var editing = false
    private let assets = ValorantAssets.shared

    private var store: ValorantStore { model.valorant }

    private var wins: Int { store.matches.filter(\.won).count }
    private var kd: Double {
        let kills = store.matches.reduce(0) { $0 + $1.kills }
        let deaths = store.matches.reduce(0) { $0 + $1.deaths }
        return deaths == 0 ? Double(kills) : Double(kills) / Double(deaths)
    }

    private var scoreSummary: (label: String, value: Int?) {
        let performance = store.matches.filter { $0.scoring == .performance }.compactMap(\.scoreValue)
        if !performance.isEmpty { return ("PERF moyen", performance.reduce(0, +) / performance.count) }
        let legacy = store.matches.filter { $0.scoring == .acs }.compactMap(\.scoreValue)
        if !legacy.isEmpty { return ("ACS moyen", legacy.reduce(0, +) / legacy.count) }
        return ("PERF moyen", nil)
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if !store.isConfigured {
                    GlassCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Renseignez votre pseudo Riot (nom + tag) pour afficher vos parties.").font(.subheadline)
                            Button("Configurer") { editing = true }.buttonStyle(.glassProminent)
                        }
                    }
                } else {
                    profileCard
                    StatStrip(items: [
                        ("\(store.matches.isEmpty ? 0 : wins * 100 / store.matches.count) %", "Victoires"),
                        ("\(wins)/\(store.matches.count)", "Parties"),
                        (String(format: "%.2f", kd), "K/D"),
                        (scoreSummary.value.map(String.init) ?? "—", scoreSummary.label),
                    ])
                }
                if let message = store.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger).frame(maxWidth: .infinity, alignment: .leading)
                }
                if !store.matches.isEmpty {
                    Text("Parties").sectionTitle().frame(maxWidth: .infinity, alignment: .leading).padding(.top, 4)
                }
                ForEach(store.matches) { match in
                    NavigationLink(value: match) {
                        matchCard(match)
                    }
                    .buttonStyle(PressScaleStyle())
                }
                if !store.matches.isEmpty {
                    Text("Depuis le patch 13.06, le score de performance (0-500) remplace l'ACS. « — » signifie que l'API ne le fournit pas pour cette partie.")
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .navigationDestination(for: ValorantMatch.self) { match in
            ValorantMatchDetailView(match: match)
        }
        .overlay {
            if store.isConfigured && store.matches.isEmpty && !store.isLoading && store.errorMessage == nil {
                ContentUnavailableView("Aucune partie", systemImage: "scope", description: Text("Aucune partie récente trouvée pour ce joueur."))
            } else if store.isLoading && store.matches.isEmpty {
                ProgressView()
            }
        }
        .navigationTitle("Valorant")
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { editing = true } label: { Image(systemName: "gearshape") }
            }
        }
        .refreshable { await store.refresh() }
        .task {
            await store.adoptAccountIdentityIfNeeded()
            async let art: Void = assets.load()
            async let data: Void = store.refresh()
            _ = await (art, data)
        }
        .sheet(isPresented: $editing) { ValorantSettingsSheet() }
    }

    private var profileCard: some View {
        let profile = store.profile
        let tier = profile?.tier ?? 0
        let peak = profile?.peakTier ?? 0
        return VStack(spacing: 0) {
            HStack {
                Text(profile?.handle ?? "\(store.playerName)#\(store.tag)").font(.headline)
                Spacer()
                if let level = profile?.level, level > 0 {
                    Text("Niv. \(level)").font(.caption.weight(.semibold))
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .glassEffect(.regular, in: .capsule)
                }
            }
            .padding(14)
            if let banner = profile?.bannerURL {
                AsyncImage(url: banner) { image in
                    image.resizable().scaledToFill()
                } placeholder: { Color.primary.opacity(0.06) }
                .frame(height: 96)
                .frame(maxWidth: .infinity)
                .clipped()
            }
            HStack(alignment: .top, spacing: 12) {
                rankColumn(tier: tier, title: tier > 0 ? (profile?.rank ?? "") : "Non classé", detail: tier > 0 ? "\(profile?.rr ?? 0) RR" : "Rang actuel")
                Divider().frame(height: 90)
                rankColumn(tier: peak, title: peak > 0 ? (profile?.peakRank ?? "") : "—", detail: "Plus haut rang atteint")
            }
            .padding(14)
        }
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
    }

    private func rankColumn(tier: Int, title: String, detail: String) -> some View {
        VStack(spacing: 6) {
            AsyncImage(url: ValorantProfile.tierIcon(tier)) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                Image(systemName: "shield").font(.largeTitle).foregroundStyle(.tertiary)
            }
            .frame(width: 58, height: 58)
            Text(title.uppercased())
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(Color(hex: 0xF5D78E))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(LocalizedStringKey(detail)).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func matchCard(_ match: ValorantMatch) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "desktopcomputer").font(.footnote).foregroundStyle(.secondary)
                VStack(alignment: .leading, spacing: 1) {
                    Text(match.mode).font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                    if let date = match.startedAt {
                        Text(date, format: .relative(presentation: .named)).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)

            ZStack(alignment: .leading) {
                AsyncImage(url: assets.maps[match.map.lowercased()]) { image in
                    image.resizable().scaledToFill()
                } placeholder: { Color.primary.opacity(0.06) }
                .frame(height: 84)
                .frame(maxWidth: .infinity)
                .clipped()
                .overlay(LinearGradient(colors: [.black.opacity(0.75), .black.opacity(0.15)], startPoint: .leading, endPoint: .trailing))
                HStack(spacing: 10) {
                    AsyncImage(url: assets.agents[match.agent.lowercased()]) { image in
                        image.resizable().scaledToFill()
                    } placeholder: { Color.clear }
                    .frame(width: 84, height: 84)
                    .clipped()
                    VStack(alignment: .leading, spacing: 4) {
                        Text(match.agent).font(.title3.weight(.bold)).foregroundStyle(.white)
                        Text(match.map).font(.caption.weight(.semibold)).foregroundStyle(.white.opacity(0.85))
                            .padding(.horizontal, 7).padding(.vertical, 2)
                            .background(.white.opacity(0.18), in: .capsule)
                    }
                    Spacer()
                    Text(match.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background((match.won ? Theme.success : Theme.danger).gradient, in: .capsule)
                        .padding(.trailing, 12)
                }
            }
            .frame(height: 84)

            HStack {
                Label("\(match.kills) / \(match.deaths) / \(match.assists)", systemImage: "scope")
                Spacer()
                Label(match.scoreValue.map(String.init) ?? "—", systemImage: "chart.bar.fill")
                Spacer()
                Label("\(match.teamRounds) — \(match.opponentRounds)", systemImage: "flag.checkered")
            }
            .font(.subheadline.monospacedDigit())
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(match.agent), \(match.map), \(match.won ? "victoire" : "défaite"), \(match.kills) éliminations, \(match.deaths) morts, \(match.assists) assistances, \(match.scoreLabel) \(match.scoreValue.map(String.init) ?? "—")")
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

                if model.valorant.isConfigured {
                    Section {
                        Button(role: .destructive) {
                            model.valorant.disconnect()
                            dismiss()
                        } label: {
                            HStack {
                                Spacer()
                                Text("Se déconnecter de ce compte")
                                    .foregroundStyle(Theme.danger)
                                Spacer()
                            }
                        }
                    }
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

