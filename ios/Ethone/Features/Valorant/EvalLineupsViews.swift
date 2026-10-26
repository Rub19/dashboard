import SwiftUI

struct EvalLineup: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let agent: Int
    let ability: Int
    let mapId: Int
    let tags: [Int]
    let images: [String]
    let video: String
    let credits: String

    var videoURL: URL? {
        let parts = video.split(separator: "?", maxSplits: 1)
        guard let id = parts.first, !id.isEmpty else { return nil }
        let start = parts.count > 1 ? "&" + parts[1].replacingOccurrences(of: "start=", with: "t=") : ""
        return URL(string: "https://www.youtube.com/watch?v=\(id)\(start)")
    }

    var thumbnailURL: URL? {
        if let first = images.first { return URL(string: first) }
        guard let id = video.split(separator: "?").first, !id.isEmpty else { return nil }
        return URL(string: "https://img.youtube.com/vi/\(id)/hqdefault.jpg")
    }
}

enum EvalLineupCatalog {
    static let source = URL(string: "https://uh5it8zn19.execute-api.us-east-1.amazonaws.com/development")!

    static let agents: [Int: String] = [2: "Breach", 3: "Brimstone", 4: "Cypher", 6: "Killjoy", 11: "Sage", 13: "Sova",
                                        14: "Viper", 16: "KAY/O", 18: "Fade", 20: "Gekko"]
    static let abilities: [Int: [Int: String]] = [
        2: [1: "Aftershock"], 3: [1: "Incendiary"], 4: [1: "Trapwire", 2: "Cyber Cage", 3: "Spycam"],
        18: [1: "Haunt", 2: "Seize"], 20: [1: "Mosh Pit", 2: "Wingman", 3: "Dizzy"], 6: [1: "Nanoswarm"],
        16: [1: "FRAG/ment", 2: "ZERO/point", 3: "FLASH/DRIVE"], 11: [1: "Barrier Orb", 2: "Slow Orb"],
        13: [1: "Recon Bolt", 2: "Shock Bolt"], 14: [1: "Snake Bite", 2: "Poison Cloud"],
    ]
    static let maps: [Int: String] = [11: "Abyss", 1: "Ascent", 2: "Bind", 3: "Breeze", 7: "Fracture", 4: "Haven",
                                      5: "Icebox", 9: "Lotus", 8: "Pearl", 6: "Split", 12: "Summit", 10: "Sunset"]
    static let tags: [Int: String] = [1: "Attaque", 2: "Défense", 3: "Post-plant", 4: "Retake", 16: "Feinte", 5: "Site A",
                                      6: "Site B", 7: "Site C", 8: "Mid", 9: "Facile", 10: "Moyen", 11: "Difficile",
                                      12: "Viseur", 13: "Repère HUD", 14: "Double rebond", 15: "Simple rebond"]

    struct Icons: Codable {
        var agents: [String: String] = [:]
        var abilities: [String: String] = [:]
        var maps: [String: String] = [:]
    }

    private struct Cached: Codable { let fetchedAt: Date; let lineups: [EvalLineup] }

    static func key(_ name: String) -> String { name.lowercased().filter(\.isLetter) }

    static func load(force: Bool = false) async -> [EvalLineup]? {
        let cacheKey = "valorant-lineups"
        let cached = DiskCache.read(Cached.self, key: cacheKey)
        if !force, let cached, Date().timeIntervalSince(cached.fetchedAt) < 6 * 3600 { return cached.lineups }
        guard let (data, response) = try? await URLSession.shared.data(from: source),
              let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let lineups = try? JSONDecoder().decode([EvalLineup].self, from: data) else { return cached?.lineups }
        DiskCache.write(Cached(fetchedAt: Date(), lineups: lineups), key: cacheKey)
        return lineups
    }

    static func icons() async -> Icons {
        let cacheKey = "valorant-lineups-icons"
        if let cached = DiskCache.read(Icons.self, key: cacheKey), !cached.agents.isEmpty { return cached }
        struct Page<T: Decodable>: Decodable { let data: [T] }
        struct Ability: Decodable { let displayName: String; let displayIcon: String? }
        struct Agent: Decodable { let displayName: String; let displayIcon: String; let abilities: [Ability] }
        struct GameMap: Decodable { let displayName: String; let listViewIcon: String? }
        var icons = Icons()
        if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true")!),
           let page = try? JSONDecoder().decode(Page<Agent>.self, from: data) {
            for agent in page.data {
                icons.agents[key(agent.displayName)] = agent.displayIcon
                for ability in agent.abilities { if let icon = ability.displayIcon { icons.abilities[key(ability.displayName)] = icon } }
            }
        }
        if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/maps")!),
           let page = try? JSONDecoder().decode(Page<GameMap>.self, from: data) {
            for map in page.data { if let icon = map.listViewIcon { icons.maps[key(map.displayName)] = icon } }
        }
        if !icons.agents.isEmpty { DiskCache.write(icons, key: cacheKey) }
        return icons
    }
}

struct EvalLineupsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var lineups: [EvalLineup] = []
    @State private var icons = EvalLineupCatalog.Icons()
    @State private var loading = true
    @State private var failed = false
    @State private var query = ""
    @State private var agent: Int?
    @State private var map: Int?
    @State private var side: Int?

    private var filtered: [EvalLineup] {
        lineups.filter { l in
            (agent == nil || l.agent == agent) && (map == nil || l.mapId == map) && (side == nil || l.tags.contains(side!))
                && (query.isEmpty || l.name.localizedCaseInsensitiveContains(query) || l.description.localizedCaseInsensitiveContains(query))
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            EvalNavHeader(title: "Line-Ups") { dismiss() }
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                TextField("Rechercher des line-ups…", text: $query).autocorrectionDisabled()
            }
            .foregroundStyle(EvalUI.secondary)
            .padding(.horizontal, 16)
            .frame(height: 50)
            .background(EvalUI.card, in: .capsule)
            filters
            content
        }
        .padding(.horizontal, 16)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await load(force: false) }
    }

    @ViewBuilder
    private var content: some View {
        if loading && lineups.isEmpty {
            ProgressView().tint(.white).frame(maxHeight: .infinity)
        } else if failed && lineups.isEmpty {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle").font(.system(size: 40)).foregroundStyle(EvalUI.secondary)
                Text("Échec du chargement des Line-ups").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                Button("Réessayer") { Task { await load(force: true) } }
                    .buttonStyle(.borderedProminent).tint(EvalAccent.color.opacity(0.3)).foregroundStyle(EvalAccent.color)
            }
            .frame(maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(spacing: 12) {
                    if filtered.isEmpty {
                        Text("Aucun line-up pour ces filtres.").font(.system(size: 17)).foregroundStyle(EvalUI.secondary).padding(.top, 40)
                    }
                    ForEach(filtered) { lineup in
                        NavigationLink { EvalLineupDetailView(lineup: lineup, icons: icons) } label: { card(lineup) }
                            .buttonStyle(.plain)
                    }
                    Link(destination: URL(string: "https://valorant-lineups.com")!) {
                        Text("Line-ups de la communauté valorant-lineups.com").font(.system(size: 14)).foregroundStyle(EvalUI.secondary)
                    }
                    .padding(.vertical, 8)
                }
                .padding(.bottom, 110)
            }
            .scrollIndicators(.hidden)
            .refreshable { await load(force: true) }
        }
    }

    private var filters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                Menu {
                    Button("Tous les agents") { agent = nil }
                    ForEach(EvalLineupCatalog.agents.sorted { $0.value < $1.value }, id: \.key) { id, name in
                        Button(name) { agent = id }
                    }
                } label: {
                    chip(agent.flatMap { EvalLineupCatalog.agents[$0] } ?? "Agent",
                         icon: agent.flatMap { EvalLineupCatalog.agents[$0] }.flatMap { icons.agents[EvalLineupCatalog.key($0)] },
                         symbol: "person", active: agent != nil)
                }
                Menu {
                    Button("Toutes les cartes") { map = nil }
                    ForEach(EvalLineupCatalog.maps.sorted { $0.value < $1.value }, id: \.key) { id, name in
                        Button(name) { map = id }
                    }
                } label: {
                    chip(map.flatMap { EvalLineupCatalog.maps[$0] } ?? "Carte", icon: nil, symbol: "map", active: map != nil)
                }
                Menu {
                    Button("Attaque et défense") { side = nil }
                    Button("Attaque") { side = 1 }
                    Button("Défense") { side = 2 }
                } label: {
                    chip(side.flatMap { EvalLineupCatalog.tags[$0] } ?? "Camp", icon: nil,
                         symbol: side == 2 ? "shield" : "circle.fill", active: side != nil)
                }
                if agent != nil || map != nil || side != nil {
                    Button { agent = nil; map = nil; side = nil } label: { chip("Effacer", icon: nil, symbol: "xmark", active: false) }
                }
            }
        }
    }

    private func chip(_ title: String, icon: String?, symbol: String, active: Bool) -> some View {
        HStack(spacing: 8) {
            if let icon, let url = URL(string: icon) {
                AsyncImage(url: url) { $0.image?.resizable().scaledToFit() }.frame(width: 22, height: 22)
            } else {
                Image(systemName: symbol).foregroundStyle(symbol == "circle.fill" ? EvalAccent.color : EvalColors.text)
                    .font(.system(size: symbol == "circle.fill" ? 12 : 16))
            }
            Text(title).foregroundStyle(EvalColors.text)
        }
        .font(.system(size: 17))
        .padding(.horizontal, 16)
        .frame(height: 40)
        .background(EvalUI.card, in: .capsule)
        .overlay(Capsule().strokeBorder(EvalAccent.color.opacity(active ? 0.7 : 0), lineWidth: 1.5))
    }

    private func card(_ lineup: EvalLineup) -> some View {
        let agentName = EvalLineupCatalog.agents[lineup.agent] ?? ""
        let abilityName = EvalLineupCatalog.abilities[lineup.agent]?[lineup.ability] ?? ""
        return VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: lineup.thumbnailURL) { $0.image?.resizable().scaledToFill() }
                .frame(height: 160)
                .frame(maxWidth: .infinity)
                .background(EvalUI.card)
                .clipped()
                .overlay(alignment: .topLeading) {
                    HStack(spacing: 6) {
                        icon(icons.agents[EvalLineupCatalog.key(agentName)], size: 26)
                        icon(icons.abilities[EvalLineupCatalog.key(abilityName)], size: 22)
                    }
                    .padding(6)
                    .background(.ultraThinMaterial, in: .capsule)
                    .padding(10)
                }
            VStack(alignment: .leading, spacing: 8) {
                Text(lineup.name).font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalColors.text).lineLimit(2)
                Text([EvalLineupCatalog.maps[lineup.mapId], abilityName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                    .font(.system(size: 15)).foregroundStyle(EvalUI.secondary)
                EvalLineupTags(tags: lineup.tags)
            }
            .padding(14)
        }
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
        .clipShape(.rect(cornerRadius: 22))
    }

    private func icon(_ url: String?, size: CGFloat) -> some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }.frame(width: size, height: size)
    }

    private func load(force: Bool) async {
        loading = true
        async let fetched = EvalLineupCatalog.load(force: force)
        async let fetchedIcons = EvalLineupCatalog.icons()
        let result = await fetched
        icons = await fetchedIcons
        if let result { lineups = result; failed = false } else { failed = true }
        loading = false
    }
}

struct EvalLineupTags: View {
    let tags: [Int]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tags.compactMap { id in EvalLineupCatalog.tags[id].map { (id, $0) } }, id: \.0) { id, label in
                    Text(label)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(id == 1 ? Color(hex: 0xFF5A5F) : id == 2 ? Color(hex: 0x5EC9A5) : EvalColors.text)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(EvalColors.text.opacity(0.08), in: .capsule)
                }
            }
        }
    }
}

struct EvalLineupDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    let lineup: EvalLineup
    let icons: EvalLineupCatalog.Icons

    var body: some View {
        let agentName = EvalLineupCatalog.agents[lineup.agent] ?? ""
        let abilityName = EvalLineupCatalog.abilities[lineup.agent]?[lineup.ability] ?? ""
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                EvalNavHeader(title: EvalLineupCatalog.maps[lineup.mapId] ?? "Line-up") { dismiss() }
                Text(lineup.name).font(.system(size: 24, weight: .bold)).foregroundStyle(EvalColors.text)
                HStack(spacing: 10) {
                    AsyncImage(url: icons.agents[EvalLineupCatalog.key(agentName)].flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }
                        .frame(width: 36, height: 36)
                        .clipShape(.rect(cornerRadius: 8))
                    AsyncImage(url: icons.abilities[EvalLineupCatalog.key(abilityName)].flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }
                        .frame(width: 28, height: 28)
                    Text("\(agentName) · \(abilityName)").font(.system(size: 17)).foregroundStyle(EvalUI.secondary)
                }
                EvalLineupTags(tags: lineup.tags)
                if let url = lineup.videoURL {
                    Button { openURL(url) } label: {
                        Label("Voir la vidéo", systemImage: "play.rectangle.fill")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(EvalAccent.color)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(EvalUI.card, in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
                if !lineup.description.isEmpty {
                    Text(lineup.description).font(.system(size: 17)).foregroundStyle(EvalColors.text)
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(EvalUI.card, in: .rect(cornerRadius: 18))
                }
                ForEach(Array(lineup.images.enumerated()), id: \.offset) { index, image in
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Étape \(index + 1)").font(.system(size: 16, weight: .semibold)).foregroundStyle(EvalUI.secondary)
                        AsyncImage(url: URL(string: image)) { phase in
                            if let img = phase.image { img.resizable().scaledToFit() } else { EvalUI.card.frame(height: 200) }
                        }
                        .clipShape(.rect(cornerRadius: 16))
                    }
                }
                if !lineup.credits.isEmpty {
                    if let url = URL(string: lineup.credits), url.scheme?.hasPrefix("http") == true {
                        Link(destination: url) { Text("Crédits : \(lineup.credits)").lineLimit(1) }
                            .font(.system(size: 14)).foregroundStyle(EvalUI.secondary)
                    } else {
                        Text("Crédits : \(lineup.credits)").font(.system(size: 14)).foregroundStyle(EvalUI.secondary)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}
