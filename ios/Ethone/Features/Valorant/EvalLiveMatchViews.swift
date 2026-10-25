import SwiftUI
import Observation

enum RiotRankLookup {
    struct Rank: Equatable {
        let tier: Int
        let isCurrent: Bool
        let rr: Int
        let peakTier: Int
        let peakSeason: String
    }

    static func fetch(_ session: RiotSession, puuid: String, season: String?) async -> Rank? {
        guard let raw = try? await session.gameData("/mmr/v1/players/\(puuid)"),
              let json = try? JSONDecoder().decode(JSONValue.self, from: raw) else { return nil }
        let seasons = json["QueueSkills"]?["competitive"]?["SeasonalInfoBySeasonID"]?.objectValue ?? [:]
        var peakTier = 0
        var peakSeason = ""
        for (id, info) in seasons {
            let best = (info["WinsByTier"]?.objectValue ?? [:]).keys.compactMap(Int.init).max() ?? 0
            if best > peakTier { peakTier = best; peakSeason = id.lowercased() }
        }
        if let season = season?.lowercased(), let info = seasons.first(where: { $0.key.lowercased() == season })?.value,
           let tier = info["CompetitiveTier"]?.intValue, tier > 0 {
            return Rank(tier: tier, isCurrent: true, rr: info["RankedRating"]?.intValue ?? 0, peakTier: max(peakTier, tier), peakSeason: peakSeason)
        }
        let latest = json["LatestCompetitiveUpdate"]
        let tier = latest?["TierAfterUpdate"]?.intValue ?? 0
        return Rank(tier: tier, isCurrent: false, rr: latest?["RankedRatingAfterUpdate"]?.intValue ?? 0, peakTier: max(peakTier, tier), peakSeason: peakSeason)
    }
}

struct RiotLivePlayer: Identifiable, Equatable {
    struct Stats: Equatable { let kd: Double; let hs: Int; let kast: Int; let win: Int; let games: Int }

    let id: String
    var name = ""
    var tag = ""
    let team: String
    let agentID: String
    let cardID: String
    let level: Int
    let hideLevel: Bool
    var rank: RiotRankLookup.Rank?
    var group = -1
    var stats: Stats?

    var agentIconURL: URL? { agentID.isEmpty ? nil : URL(string: "https://media.valorant-api.com/agents/\(agentID)/displayicon.png") }
}

struct RiotLiveMatch: Equatable {
    let id: String
    let isPregame: Bool
    let mapPath: String
    let queueID: String
    let pod: String
    let myTeam: String
    let phaseEnd: Date?
    var players: [RiotLivePlayer]
}

@MainActor
@Observable
final class RiotLiveMatchModel {
    private(set) var match: RiotLiveMatch?
    private(set) var loadouts: [String: [String: String]] = [:]
    var currentSeason: String?
    private var ranks: [String: RiotRankLookup.Rank] = [:]
    private var stats: [String: RiotLivePlayer.Stats] = [:]
    private var parties: [String: Set<String>] = [:]
    private var names: [String: (name: String, tag: String)] = [:]
    private var statsMatchID = ""

    func load(_ session: RiotSession, ownParty: [String]) async {
        guard session.isLinked, let puuid = session.credentials?.puuid.lowercased() else { match = nil; return }
        guard var live = await fetch(session, puuid: puuid) else { match = nil; return }
        let ids = live.players.map(\.id)
        let unnamed = ids.filter { names[$0] == nil }
        if !unnamed.isEmpty {
            for (id, value) in await RiotMatches.names(session, puuids: unnamed) { names[id] = value }
        }
        let season = currentSeason
        let missing = ids.filter { ranks[$0] == nil }
        await withTaskGroup(of: (String, RiotRankLookup.Rank?).self) { group in
            for id in missing { group.addTask { (id, await RiotRankLookup.fetch(session, puuid: id, season: season)) } }
            for await (id, rank) in group { if let rank { ranks[id] = rank } }
        }
        let own = Set(ownParty.map { $0.lowercased() })
        for index in live.players.indices {
            let id = live.players[index].id
            live.players[index].name = names[id]?.name ?? ""
            live.players[index].tag = names[id]?.tag ?? ""
            live.players[index].rank = ranks[id]
            live.players[index].stats = stats[id]
            if own.count > 1, own.contains(id) { parties[id, default: []].insert("own") }
        }
        assignGroups(&live)
        match = live
        if statsMatchID != live.id {
            statsMatchID = live.id
            loadouts = [:]
            Task { await loadStats(session, players: ids) }
            Task { await loadLoadouts(session, matchID: live.id, pregame: live.isPregame) }
        }
    }

    private func fetch(_ session: RiotSession, puuid: String) async -> RiotLiveMatch? {
        if let player = try? await json(session, "/core-game/v1/players/\(puuid)"), let id = player["MatchID"]?.stringValue,
           let data = try? await json(session, "/core-game/v1/matches/\(id)") {
            let players = (data["Players"]?.arrayValue ?? []).map { Self.player($0, team: $0["TeamID"]?.stringValue ?? "") }
            let mine = players.first { $0.id == puuid }?.team ?? "Blue"
            return RiotLiveMatch(id: id, isPregame: false, mapPath: data["MapID"]?.stringValue ?? "",
                                 queueID: data["MatchmakingData"]?["QueueID"]?.stringValue ?? "", pod: data["GamePodID"]?.stringValue ?? "",
                                 myTeam: mine, phaseEnd: nil, players: players)
        }
        if let player = try? await json(session, "/pregame/v1/players/\(puuid)"), let id = player["MatchID"]?.stringValue,
           let data = try? await json(session, "/pregame/v1/matches/\(id)") {
            let ally = data["AllyTeam"]
            let team = ally?["TeamID"]?.stringValue ?? "Blue"
            var players = (ally?["Players"]?.arrayValue ?? []).map { Self.player($0, team: team) }
            if let enemy = data["EnemyTeam"], let enemyTeam = enemy["TeamID"]?.stringValue {
                players += (enemy["Players"]?.arrayValue ?? []).map { Self.player($0, team: enemyTeam) }
            }
            let remaining = Double(data["PhaseTimeRemainingNS"]?.intValue ?? 0) / 1_000_000_000
            return RiotLiveMatch(id: id, isPregame: true, mapPath: data["MapID"]?.stringValue ?? "",
                                 queueID: data["QueueID"]?.stringValue ?? "", pod: data["GamePodID"]?.stringValue ?? "",
                                 myTeam: team, phaseEnd: remaining > 0 ? Date().addingTimeInterval(remaining) : nil, players: players)
        }
        return nil
    }

    private func json(_ session: RiotSession, _ path: String) async throws -> JSONValue {
        try JSONDecoder().decode(JSONValue.self, from: try await session.gameData(path, host: .glz))
    }

    private static func player(_ p: JSONValue, team: String) -> RiotLivePlayer {
        let identity = p["PlayerIdentity"]
        let locked = (p["CharacterSelectionState"]?.stringValue ?? "locked").lowercased()
        return RiotLivePlayer(
            id: (p["Subject"]?.stringValue ?? "").lowercased(),
            team: team,
            agentID: locked.isEmpty ? "" : (p["CharacterID"]?.stringValue ?? "").lowercased(),
            cardID: (identity?["PlayerCardID"]?.stringValue ?? "").lowercased(),
            level: identity?["AccountLevel"]?.intValue ?? 0,
            hideLevel: identity?["HideAccountLevel"]?.boolValue ?? false
        )
    }

    private func assignGroups(_ live: inout RiotLiveMatch) {
        var next = 0
        for index in live.players.indices where live.players[index].group < 0 {
            let keys = parties[live.players[index].id] ?? []
            guard !keys.isEmpty else { continue }
            let mates = live.players.indices.filter { other in
                live.players[other].team == live.players[index].team && !(parties[live.players[other].id] ?? []).isDisjoint(with: keys)
            }
            guard mates.count > 1 else { continue }
            for mate in mates { live.players[mate].group = next }
            next += 1
        }
    }

    private func loadStats(_ session: RiotSession, players: [String]) async {
        guard let catalog = await RiotMatches.catalog() else { return }
        var fetched: [String: EvalMatch] = [:]
        for id in players where stats[id] == nil {
            guard let history = try? await RiotMatches.history(session, puuid: id, count: 3) else { continue }
            var games: [EvalMatch] = []
            for matchID in history {
                if let hit = fetched[matchID] { games.append(hit); continue }
                guard let game = try? await RiotMatches.match(session, id: matchID, catalog: catalog) else { continue }
                fetched[matchID] = game
                games.append(game)
            }
            var kills = 0, deaths = 0, hs = 0, shots = 0, kast = 0, wins = 0
            for game in games {
                guard let me = game.player(id) else { continue }
                kills += me.kills; deaths += me.deaths; hs += me.hs; shots += me.hs + me.bs + me.ls
                kast += EvalMatchAnalysis(match: game, targetPUUID: id)?.kast(for: id) ?? 0
                if game.team(me.team).won { wins += 1 }
                if !me.party.isEmpty { parties[id, default: []].insert("\(game.id)-\(me.party)") }
            }
            guard !games.isEmpty else { continue }
            stats[id] = .init(kd: deaths == 0 ? Double(kills) : Double(kills) / Double(deaths),
                              hs: shots == 0 ? 0 : hs * 100 / shots, kast: kast / games.count,
                              win: wins * 100 / games.count, games: games.count)
            guard var live = match else { continue }
            for index in live.players.indices {
                live.players[index].stats = stats[live.players[index].id]
                live.players[index].group = -1
            }
            assignGroups(&live)
            match = live
        }
    }

    private func loadLoadouts(_ session: RiotSession, matchID: String, pregame: Bool) async {
        guard let data = try? await json(session, pregame ? "/pregame/v1/matches/\(matchID)/loadouts" : "/core-game/v1/matches/\(matchID)/loadouts") else { return }
        let skinChroma = "3ad1b2b2-acdb-4524-852f-954a76ddae0a"
        var out: [String: [String: String]] = [:]
        for entry in data["Loadouts"]?.arrayValue ?? [] {
            let loadout = entry["Loadout"] ?? entry
            guard let subject = loadout["Subject"]?.stringValue?.lowercased() else { continue }
            var guns: [String: String] = [:]
            for (weapon, item) in loadout["Items"]?.objectValue ?? [:] {
                if let chroma = item["Sockets"]?[skinChroma]?["Item"]?["ID"]?.stringValue { guns[weapon.lowercased()] = chroma.lowercased() }
            }
            out[subject] = guns
        }
        loadouts = out
    }
}

struct EvalLiveMatchCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.evalSurface) private var surface
    @State private var showing = false
    @State private var openedFor = ""

    var body: some View {
        content
            .navigationDestination(isPresented: $showing) { EvalLiveMatchView() }
            .onChange(of: model.valorant.live.match?.id) { _, id in
                guard let id, model.valorant.live.match?.isPregame == true, openedFor != id else { return }
                openedFor = id
                showing = true
            }
    }

    @ViewBuilder
    private var content: some View {
        if let match = model.valorant.live.match {
            Button { showing = true } label: {
                HStack(spacing: 14) {
                    Image(systemName: match.isPregame ? "person.crop.square.badge.camera" : "list.bullet.rectangle")
                        .font(.system(size: 24))
                        .foregroundStyle(EvalAccent.color)
                    VStack(alignment: .leading, spacing: 3) {
                        (Text("Actuellement en ") + Text(match.isPregame ? "Sélection d'agent" : "Match").bold())
                            .font(.system(size: 18))
                            .foregroundStyle(EvalColors.text)
                        Text("Appuyez pour voir").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 17, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(16)
                .background(surface, in: .rect(cornerRadius: 18))
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
        }
    }
}

struct EvalLiveMatchView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var expanded: Set<String> = []
    @State private var loadoutPlayer: RiotLivePlayer?

    private var store: ValorantStore { model.valorant }
    private static let groupColors: [UInt32] = [0x33D1E0, 0x4CD964, 0xFF9F0A, 0xFF5FA2, 0xBF5AF2]

    var body: some View {
        VStack(spacing: 12) {
            topBar
            if let match = store.live.match {
                header(match)
                ScrollView {
                    VStack(spacing: 12) {
                        if match.isPregame { loadoutLinks }
                        let allies = match.players.filter { $0.team == match.myTeam }
                        let enemies = match.players.filter { $0.team != match.myTeam }
                        ForEach(allies) { row($0, ally: true) }
                        if !enemies.isEmpty {
                            Divider().overlay(EvalColors.text.opacity(0.1)).padding(.vertical, 4)
                            ForEach(enemies) { row($0, ally: false) }
                        }
                    }
                    .padding(.bottom, 110)
                }
                .scrollIndicators(.hidden)
            } else {
                ContentUnavailableView("Aucune partie en cours", systemImage: "gamecontroller")
                Spacer()
            }
        }
        .padding(.horizontal, 16)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $loadoutPlayer) { player in EvalLiveLoadoutSheet(player: player).presentationDetents([.medium, .large]) }
        .task {
            await store.connectChat()
            while !Task.isCancelled {
                await store.refreshLive()
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private var loadoutLinks: some View {
        HStack(spacing: 10) {
            NavigationLink { EvalWeaponLoadoutView() } label: { loadoutChip("Armes", "scope") }
            NavigationLink { EvalSprayLoadoutView() } label: { loadoutChip("Expressions", "circle.grid.cross") }
            NavigationLink { EvalCardPickerView() } label: { loadoutChip("Carte", "rectangle.portrait") }
        }
        .buttonStyle(.plain)
    }

    private func loadoutChip(_ title: String, _ symbol: String) -> some View {
        Label(title, systemImage: symbol)
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(EvalAccent.color)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(EvalColors.card, in: .capsule)
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text))
            }
            .buttonStyle(.plain)
            Spacer()
            if store.live.match?.isPregame == true {
                Text("Sélection d'agent").font(.system(size: 22, weight: .bold)).foregroundStyle(EvalColors.text)
                Spacer()
                TimelineView(.periodic(from: .now, by: 1)) { ctx in
                    HStack(spacing: 6) {
                        Text("\(max(0, Int((store.live.match?.phaseEnd ?? ctx.date).timeIntervalSince(ctx.date))))")
                        Image(systemName: "timer")
                    }
                    .font(.system(size: 20, weight: .medium).monospacedDigit())
                    .foregroundStyle(EvalColors.text)
                    .padding(.horizontal, 14)
                    .frame(height: 51)
                    .background(EvalColors.card, in: .capsule)
                }
            }
        }
        .padding(.top, 4)
    }

    private func header(_ match: RiotLiveMatch) -> some View {
        let attacking = match.myTeam == "Red"
        let presence = store.chat.selfPresence
        let mapInfo = store.mapName(forPath: match.mapPath)
        return VStack(spacing: 0) {
            HStack(spacing: 12) {
                EvalModeIcon(mode: match.queueID).frame(width: 34, height: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(RiotPartyModel.queueName(match.queueID)).font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                    Text(RiotPartyModel.podName(match.pod)).font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(attacking ? "Attaquants" : "Défenseurs").font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color(hex: attacking ? 0xFF5A5F : 0x5EC9A5))
                    Text(match.isPregame ? "Commencer en tant que" : "Commencé en tant que").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .padding(16)
            ZStack {
                AsyncImage(url: mapImage(match.mapPath)) { $0.image?.resizable().scaledToFill() }
                    .frame(height: 90)
                    .frame(maxWidth: .infinity)
                    .clipped()
                Group {
                    if match.isPregame || presence == nil {
                        Text(mapInfo ?? "").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                    } else {
                        HStack(spacing: 8) {
                            Text("\(presence?.allyScore ?? 0)").foregroundStyle(Color(hex: 0x5EC9A5))
                            Text("–").foregroundStyle(.white.opacity(0.6))
                            Text("\(presence?.enemyScore ?? 0)").foregroundStyle(Color(hex: 0xFF5A5F))
                        }
                        .font(.system(size: 22, weight: .bold).monospacedDigit())
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial, in: .capsule)
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 26))
        .clipShape(.rect(cornerRadius: 26))
    }

    private func mapImage(_ path: String) -> URL? {
        guard let uuid = store.mapUUID(forPath: path) else { return nil }
        return URL(string: "https://media.valorant-api.com/maps/\(uuid)/listviewicon.png")
    }

    private func row(_ player: RiotLivePlayer, ally: Bool) -> some View {
        let me = player.id == store.riot.credentials?.puuid.lowercased()
        let edge = Color(hex: me ? 0xF0E6A8 : (ally ? 0x5EC9A5 : 0xFF5A5F))
        let group = player.group >= 0 ? Color(hex: Self.groupColors[player.group % Self.groupColors.count]) : Color.clear
        let isOpen = expanded.contains(player.id)
        return VStack(spacing: 14) {
            HStack(spacing: 14) {
                agent(player)
                VStack(alignment: .leading, spacing: 3) {
                    (Text(player.name).foregroundStyle(me ? Color(hex: 0xF0E6A8) : EvalColors.text) + Text(" #\(player.tag)").foregroundStyle(Color(hex: 0x8E8E93)))
                        .font(.system(size: 19, weight: .semibold))
                        .lineLimit(1)
                    if !player.hideLevel, player.level > 0, !me {
                        Text("Niveau \(player.level)").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                Spacer(minLength: 6)
                rankDisc(player.rank, size: 46)
                Menu {
                    Section(player.name) {
                        if !player.name.isEmpty {
                            NavigationLink { EvalPlayerProfileView(name: player.name, tag: player.tag) } label: { Label("Ouvrir le profil", systemImage: "person.crop.circle") }
                        }
                        Button { loadoutPlayer = player } label: { Label("Voir l’équipement", systemImage: "eye") }
                        Button { UIPasteboard.general.string = "\(player.name)#\(player.tag)" } label: { Label("Copier le nom du joueur", systemImage: "doc.on.doc") }
                    }
                    if !me, store.party.party != nil {
                        Button { Task { await store.party.invite(store.riot, riotID: "\(player.name)#\(player.tag)") } } label: {
                            Label("Inviter dans le groupe", systemImage: "person.badge.plus")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis").font(.system(size: 18, weight: .bold)).foregroundStyle(ally ? Color(hex: 0x5EC9A5) : Color(hex: 0xFF5A5F))
                        .frame(width: 32, height: 40)
                }
                Button { withAnimation(.snappy) { if isOpen { expanded.remove(player.id) } else { expanded.insert(player.id) } } } label: {
                    Image(systemName: isOpen ? "chevron.up" : "chevron.down").font(.system(size: 16, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
                        .frame(width: 28, height: 40)
                }
                .buttonStyle(.plain)
            }
            HStack {
                stat(player.stats.map { String(format: "%.2f", $0.kd) }, "K/D")
                stat(player.stats.map { "\($0.hs)%" }, "HS%")
                stat(player.stats.map { "\($0.kast)%" }, "KAST")
                stat(player.stats.map { "\($0.win)%" }, "WIN%")
            }
            if isOpen { details(player) }
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 22))
        .overlay(alignment: .leading) { UnevenRoundedRectangle(topLeadingRadius: 22, bottomLeadingRadius: 22).fill(edge).frame(width: 4) }
        .overlay(alignment: .trailing) { UnevenRoundedRectangle(bottomTrailingRadius: 22, topTrailingRadius: 22).fill(group).frame(width: 4) }
    }

    private func agent(_ player: RiotLivePlayer) -> some View {
        Group {
            if let url = player.agentIconURL {
                AsyncImage(url: url) { $0.image?.resizable().scaledToFill() }
            } else {
                Image(systemName: "questionmark").font(.system(size: 22, weight: .bold)).foregroundStyle(Color(hex: 0x5EC9A5))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Color(hex: 0x5EC9A5).opacity(0.6), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4])))
            }
        }
        .frame(width: 50, height: 50)
        .background(EvalColors.card2)
        .clipShape(.rect(cornerRadius: 12))
    }

    private func rankDisc(_ rank: RiotRankLookup.Rank?, size: CGFloat) -> some View {
        ZStack {
            if let rank, rank.tier > 0 {
                EvalRankDisc(tier: rank.tier, size: size, progress: Double(rank.rr) / 100)
            } else {
                Circle().fill(Color.black)
                Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 2)
                Image(systemName: "questionmark.circle.fill").font(.system(size: size * 0.5)).foregroundStyle(.white.opacity(0.8))
            }
            if let rank, !rank.isCurrent, rank.tier > 0 {
                Image(systemName: "clock").font(.system(size: 10, weight: .semibold)).foregroundStyle(.white)
                    .padding(2).background(Color.black, in: .circle).offset(y: size * 0.3)
            }
        }
        .frame(width: size, height: size)
    }

    private func stat(_ value: String?, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(value ?? "—").font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
            Text(label).font(.system(size: 14, weight: .semibold)).tracking(1).foregroundStyle(Color(hex: 0x8E8E93))
        }
        .frame(maxWidth: .infinity)
    }

    private func details(_ player: RiotLivePlayer) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider().overlay(EvalColors.text.opacity(0.08))
            HStack {
                Text("Rang")
                Spacer()
                Text("Peak")
            }
            .font(.system(size: 19, weight: .semibold))
            .foregroundStyle(Color(hex: 0x8E8E93))
            HStack(spacing: 0) {
                VStack(spacing: 6) {
                    rankDisc(player.rank, size: 64)
                    Text(EvalRanks.name(player.rank?.tier ?? 0).uppercased())
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color(hex: EvalRanks.color(player.rank?.tier ?? 0)))
                    if let rank = player.rank, rank.tier > 0 {
                        (Text("\(rank.rr)").foregroundStyle(EvalColors.text) + Text(" RR").foregroundStyle(Color(hex: 0x8E8E93))).font(.system(size: 15, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                Divider().overlay(EvalColors.text.opacity(0.08))
                VStack(spacing: 6) {
                    let peak = player.rank?.peakTier ?? 0
                    Text(store.actName(id: player.rank?.peakSeason ?? "")?.uppercased() ?? " ")
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(hex: 0x636366)).lineLimit(1)
                    if let url = ValorantProfile.tierIcon(peak) {
                        AsyncImage(url: url) { $0.image?.resizable().scaledToFit() }.frame(width: 48, height: 48)
                    }
                    Text(EvalRanks.name(peak).uppercased()).font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(hex: EvalRanks.color(peak)))
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 14)
            .background(EvalColors.card2, in: .rect(cornerRadius: 18))
            if let stats = player.stats {
                Text("Basé sur ses \(stats.games) dernières parties.").font(.system(size: 14)).foregroundStyle(Color(hex: 0x636366))
            }
        }
    }
}

struct EvalLiveLoadoutSheet: View {
    @Environment(AppModel.self) private var model
    let player: RiotLivePlayer

    var body: some View {
        let guns = model.valorant.live.loadouts[player.id] ?? [:]
        let weapons = model.valorant.loadout.catalog.weapons.filter { guns[$0.uuid.lowercased()] != nil }
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if weapons.isEmpty {
                        ContentUnavailableView("Équipement indisponible", systemImage: "scope")
                    }
                    ForEach(weapons) { weapon in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(weapon.displayName).font(.system(size: 17, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
                            AsyncImage(url: URL(string: "https://media.valorant-api.com/weaponskinchromas/\(guns[weapon.uuid.lowercased()] ?? "")/fullrender.png")) {
                                $0.image?.resizable().scaledToFit()
                            }
                            .frame(height: 70)
                            .frame(maxWidth: .infinity)
                        }
                        .padding(16)
                        .background(EvalColors.card, in: .rect(cornerRadius: 20))
                    }
                }
                .padding(16)
            }
            .background(EvalColors.background.ignoresSafeArea())
            .navigationTitle(player.name)
            .navigationBarTitleDisplayMode(.inline)
        }
        .task { await model.valorant.loadout.load(model.valorant.riot) }
    }
}
