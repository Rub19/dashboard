import SwiftUI
import Charts

enum MatchDetailTab: String, CaseIterable, Identifiable {
    case summary = "Résumé"
    case scoreboard = "Tableau des scores"
    case rounds = "Manches"
    case duels = "Duels"
    case performance = "Performance"
    case economy = "Économie"

    var id: String { rawValue }
}

enum PlayerSortCriteria: String, CaseIterable, Identifiable {
    case acs = "ACS"
    case kd = "K/D"
    case kills = "Kills"
    case damage = "ADR"
    case headshot = "HS%"

    var id: String { rawValue }
    var label: String { rawValue }
}

private enum EvalPalette {
    static let ally = Color(hex: 0x2DD4BF)
    static let enemy = EvalAccent.color
    static let accent = EvalAccent.color
    static let card = EvalColors.card
    static let chip = EvalColors.card2
    static let secondary = Color(hex: 0x8E8E93)
    static let gold = Color(hex: 0xF5D78E)
    static let up = Color(hex: 0x35C26B)
    static let target = Color(hex: 0xF3E9A6)
    static let party = Color(hex: 0xF5A524)
}

/// Détail d'un match : chaque valeur affichée est calculée depuis le match réel
/// (EvalMatch stocké dans Supabase). Aucun chiffre n'est codé en dur.
struct ValorantMatchDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let match: ValorantMatch
    /// Joueur ciblé au départ (profil d'un autre joueur) ; nil = compte suivi.
    var initialTarget: String? = nil

    @State private var evalMatch: EvalMatch?
    @State private var loadFailed = false
    @State private var selectedTab: MatchDetailTab = .summary
    @State private var sortBy: PlayerSortCriteria = .acs
    @State private var targetPUUID: String = ""
    @State private var expandedPlayerIDs: Set<String> = []
    @State private var performanceSide = 0
    @State private var showRoundDetails = false

    private var analysis: EvalMatchAnalysis? {
        guard let evalMatch else { return nil }
        return EvalMatchAnalysis(match: evalMatch, targetPUUID: targetPUUID)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                navBar
                if let analysis {
                    if selectedTab == .summary { summaryHeader(analysis).padding(.horizontal, 16).padding(.top, 4) }
                    tabsSelector.padding(.vertical, 8)
                    ScrollView {
                        VStack(spacing: 18) {
                            tabContent(analysis)
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 170)
                    }
                    .scrollIndicators(.hidden)
                } else if loadFailed {
                    ContentUnavailableView("Match indisponible", systemImage: "wifi.exclamationmark",
                                           description: Text("Les données de ce match n'ont pas pu être chargées."))
                        .frame(maxHeight: .infinity)
                } else {
                    ProgressView().tint(.white).frame(maxHeight: .infinity)
                }
            }

            if let analysis {
                targetBar(analysis)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 86)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await ValorantAssets.shared.load()
            guard evalMatch == nil else { return }
            let store = model.valorant
            if let loaded = await store.evalMatch(id: match.id) {
                targetPUUID = targetPUUID.isEmpty ? (initialTarget ?? loaded.player(store.puuid)?.puuid ?? match.myPlayer?.id ?? "") : targetPUUID
                evalMatch = loaded
            } else {
                loadFailed = true
            }
        }
    }

    @ViewBuilder
    private func tabContent(_ a: EvalMatchAnalysis) -> some View {
        switch selectedTab {
        case .summary: summaryTab(a)
        case .scoreboard: scoreboardTab(a)
        case .rounds: roundsTab(a)
        case .duels: duelsTab(a)
        case .performance: performanceTab(a)
        case .economy: economyTab(a)
        }
    }

    // MARK: - Barre de navigation

    private var navBar: some View {
        HStack(spacing: 12) {
            circleButton(systemImage: "chevron.left") { dismiss() }
            Spacer()
            if selectedTab == .summary {
                Text("Détails du match").font(.system(size: 22, weight: .bold)).foregroundStyle(EvalColors.text)
            } else {
            HStack(spacing: 8) {
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 16))
                    .foregroundStyle(.white.opacity(0.8))
                Text(match.map)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(EvalColors.text)
                Text("\(analysis?.teamRounds ?? match.teamRounds)").foregroundStyle(EvalPalette.ally)
                Text("–").foregroundStyle(EvalPalette.secondary)
                Text("\(analysis?.opponentRounds ?? match.opponentRounds)").foregroundStyle(EvalPalette.enemy)
            }
            .font(.system(size: 22, weight: .bold).monospacedDigit())
            }
            Spacer()
            ShareLink(item: "Partie Valorant sur \(match.map) : \(match.won ? "Victoire" : "Défaite") \(match.teamRounds)-\(match.opponentRounds)") {
                Circle().fill(EvalPalette.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: "square.and.arrow.up").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalPalette.accent))
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private func circleButton(systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Circle().fill(EvalPalette.card).frame(width: 51, height: 51)
                .overlay(Image(systemName: systemImage).font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text))
        }
        .buttonStyle(PressScaleStyle())
    }

    private var tabsSelector: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(MatchDetailTab.allCases) { tab in
                        let selected = selectedTab == tab
                        Button {
                            withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                                selectedTab = tab
                                proxy.scrollTo(tab.id, anchor: .center)
                            }
                        } label: {
                            Text(tab.rawValue)
                                .font(.system(size: 18, weight: selected ? .semibold : .regular))
                                .foregroundStyle(selected ? EvalPalette.accent : EvalPalette.secondary)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(selected ? EvalPalette.chip : .clear, in: .capsule)
                        }
                        .buttonStyle(.plain)
                        .id(tab.id)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func sectionTitle(_ text: String, trailing: String? = nil) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 15, weight: .semibold))
                .tracking(1.2)
                .foregroundStyle(EvalPalette.secondary)
            Spacer()
            if let trailing {
                HStack(spacing: 4) {
                    Text(trailing)
                    Image(systemName: "chevron.up.chevron.down").font(.system(size: 13, weight: .bold))
                }
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(EvalPalette.accent)
            }
        }
        .padding(.horizontal, 4)
    }

    // MARK: - Résumé

    private func summaryTab(_ a: EvalMatchAnalysis) -> some View {
        let me = a.targetSummary
        let lobby = a.lobbySummary
        let halves = a.halves()
        return VStack(spacing: 18) {
            HStack(spacing: 12) {
                remoteImage(a.target.agentIconURL)
                    .frame(width: 53, height: 53)
                    .clipShape(.rect(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 3) {
                    handleText(a.target.name, a.target.tag, size: 17)
                    Text(EvalRanks.name(a.target.tier).uppercased())
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundStyle(EvalPalette.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text(a.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(a.won ? EvalPalette.ally : EvalPalette.enemy)
                    Text("\(a.target.kills) / \(a.target.deaths) / \(a.target.assists)")
                        .font(.system(size: 15, weight: .semibold).monospacedDigit())
                        .foregroundStyle(EvalPalette.secondary)
                }
            }
            .padding(16)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("VS MOYENNE DU LOBBY (N=\(a.lobby.count))")
                VStack(spacing: 0) {
                    metricRow("ACS", "\(me.acs)", delta: Double(me.acs - lobby.acs), format: { "\(Int(abs($0)))" })
                    divider
                    metricRow("ADR", "\(me.adr)", delta: Double(me.adr - lobby.adr), format: { "\(Int(abs($0)))" })
                    divider
                    metricRow("HS%", "\(me.hsPercent)%", delta: Double(me.hsPercent - lobby.hsPercent), format: { "\(Int(abs($0)))%" })
                    divider
                    metricRow("KAST", "\(me.kast)%", delta: Double(me.kast - lobby.kast), format: { "\(Int(abs($0)))%" })
                    divider
                    metricRow("K/D", String(format: "%.2f", me.kd), delta: me.kd - lobby.kd, format: { String(format: "%.2f", abs($0)) })
                    divider
                    metricRow("FK / manche", String(format: "%.2f", me.fkPerRound), delta: me.fkPerRound - lobby.fkPerRound, format: { String(format: "%.2f", abs($0)) })
                }
                .padding(.horizontal, 18)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("MI-TEMPS")
                HStack(spacing: 12) {
                    halfCard("ATQ", halves.attack)
                    halfCard("DÉF", halves.defense)
                }
            }

            if !a.highlights.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    sectionTitle("MOMENTS FORTS DU MATCH")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(a.highlights, id: \.self) { label in
                                Text(label)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(EvalColors.text)
                                    .padding(.horizontal, 14).padding(.vertical, 8)
                                    .background(EvalPalette.chip, in: .capsule)
                            }
                        }
                    }
                }
            }
        }
    }

    private func summaryHeader(_ a: EvalMatchAnalysis) -> some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "shield.lefthalf.filled").font(.system(size: 32)).foregroundStyle(.white.opacity(0.75))
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Image(systemName: "desktopcomputer").font(.system(size: 16))
                        Text(EvalProfileView.modeName(a.match.mode)).font(.system(size: 20, weight: .semibold))
                    }
                    .foregroundStyle(EvalColors.text)
                    if let cluster = a.match.cluster, !cluster.isEmpty {
                        Text(cluster).font(.system(size: 15)).foregroundStyle(EvalPalette.secondary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    if let date = a.match.startedAt {
                        Text(date.formatted(.dateTime.day(.twoDigits).month(.twoDigits).year(.twoDigits).locale(Locale(identifier: "fr_FR")))
                             + " · " + date.formatted(.dateTime.hour().minute().locale(Locale(identifier: "fr_FR"))))
                            .font(.system(size: 16)).foregroundStyle(.white.opacity(0.85))
                    }
                    if a.match.lengthSec > 0 {
                        Text("\(a.match.lengthSec / 60)min \(a.match.lengthSec % 60)s").font(.system(size: 15)).foregroundStyle(EvalPalette.secondary)
                    }
                }
            }
            .padding(14)
            ZStack {
                remoteImage(ValorantAssets.shared.splashes[a.match.map.lowercased()] ?? ValorantAssets.shared.maps[a.match.map.lowercased()])
                    .frame(height: 96)
                    .clipped()
                HStack(spacing: 8) {
                    Text("\(a.teamRounds)").foregroundStyle(EvalPalette.ally)
                    Text("–").foregroundStyle(.white.opacity(0.6))
                    Text("\(a.opponentRounds)").foregroundStyle(EvalPalette.enemy)
                }
                .font(.system(size: 21, weight: .bold).monospacedDigit())
                .padding(.horizontal, 20).padding(.vertical, 8)
                .background(.ultraThinMaterial, in: .capsule)
            }
            .frame(height: 96)
            .clipped()
        }
        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        .clipShape(.rect(cornerRadius: 22))
    }

    private var divider: some View { Divider().overlay(EvalColors.text.opacity(0.06)) }

    /// delta > 0 = mieux que le lobby, sauf si `higherIsBetter` est faux.
    private func metricRow(_ title: String, _ value: String, delta: Double, higherIsBetter: Bool = true, format: (Double) -> String) -> some View {
        let isEqual = abs(delta) < 0.005
        let good = (delta > 0) == higherIsBetter
        return HStack {
            Text(title).font(.system(size: 20)).foregroundStyle(EvalColors.text)
            Spacer()
            VStack(alignment: .trailing, spacing: 1) {
                Text(value).font(.system(size: 20, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                if isEqual {
                    Text("=").font(.system(size: 15, weight: .bold)).foregroundStyle(EvalPalette.secondary)
                } else {
                    HStack(spacing: 2) {
                        Image(systemName: delta > 0 ? "arrow.up" : "arrow.down").font(.system(size: 13, weight: .bold))
                        Text(format(delta)).font(.system(size: 15, weight: .semibold).monospacedDigit())
                    }
                    .foregroundStyle(good ? EvalPalette.up : EvalPalette.enemy)
                }
            }
        }
        .padding(.vertical, 12)
    }

    private func halfCard(_ title: String, _ half: EvalHalf) -> some View {
        VStack(spacing: 12) {
            Text(title).font(.system(size: 14, weight: .bold)).foregroundStyle(EvalPalette.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(half.won)").font(.system(size: 51, weight: .semibold).monospacedDigit())
                Text("/ \(half.played)").font(.system(size: 25, weight: .medium).monospacedDigit()).foregroundStyle(EvalPalette.secondary)
            }
            .foregroundStyle(EvalColors.text)
            VStack(spacing: 6) {
                halfRow("Éliminations", half.kills)
                halfRow("Morts", half.deaths)
                halfRow("Assistances", half.assists)
                halfRow("Poses", half.plants)
                halfRow("Désamorçages", half.defuses)
                halfRow("Premiers sangs", half.firstKills)
                halfRow("Premières morts", half.firstDeaths)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
    }

    private func halfRow(_ label: String, _ value: Int) -> some View {
        HStack {
            Text(label).font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
            Spacer()
            Text("\(value)").font(.system(size: 14, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
        }
    }

    // MARK: - Tableau des scores

    private func sorted(_ list: [EvalMatch.Player], _ a: EvalMatchAnalysis) -> [EvalMatch.Player] {
        let rounds = Double(a.match.roundCount)
        func kd(_ p: EvalMatch.Player) -> Double { p.deaths == 0 ? Double(p.kills) : Double(p.kills) / Double(p.deaths) }
        return list.sorted { x, y in
            switch sortBy {
            case .acs: return x.score > y.score
            case .kd: return kd(x) > kd(y)
            case .kills: return x.kills > y.kills
            case .damage: return Double(x.dmg) / rounds > Double(y.dmg) / rounds
            case .headshot: return x.headshotPercent > y.headshotPercent
            }
        }
    }

    private func scoreboardTab(_ a: EvalMatchAnalysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionTitle("VOTRE ÉQUIPE")
            ForEach(sorted(a.allies, a)) { scoreboardCard($0, ally: true, a) }
            sectionTitle("ÉQUIPE ENNEMIE").padding(.top, 12)
            ForEach(sorted(a.enemies, a)) { scoreboardCard($0, ally: false, a) }
        }
    }

    /// Bande droite : joueurs groupés (même party). Couleur de l'équipe pour les alliés, orange en face.
    private func partyColor(_ p: EvalMatch.Player, _ a: EvalMatchAnalysis) -> Color? {
        guard !p.party.isEmpty, a.match.players.filter({ $0.party == p.party }).count > 1 else { return nil }
        return p.team == a.target.team ? EvalPalette.ally : EvalPalette.party
    }

    private func scoreboardCard(_ p: EvalMatch.Player, ally: Bool, _ a: EvalMatchAnalysis) -> some View {
        let expanded = expandedPlayerIDs.contains(p.puuid)
        let isTarget = p.puuid == a.target.puuid
        let s = a.summary(for: p.puuid)
        let leftColor = isTarget ? EvalPalette.target : (ally ? EvalPalette.ally : EvalPalette.enemy)
        return HStack(spacing: 0) {
            Rectangle().fill(leftColor).frame(width: 4)
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    remoteImage(p.agentIconURL).frame(width: 53, height: 53).clipShape(.rect(cornerRadius: 12))
                    VStack(alignment: .leading, spacing: 3) {
                        (Text(p.name).foregroundStyle(isTarget ? EvalPalette.target : .white)
                         + Text(p.tag.isEmpty ? "" : "#\(p.tag)").foregroundStyle(EvalPalette.secondary))
                            .font(.system(size: 20, weight: .semibold))
                            .lineLimit(1)
                        if p.tier > 0 {
                            HStack(spacing: 4) {
                                remoteImage(ValorantProfile.tierIcon(p.tier), fit: true).frame(width: 18, height: 18)
                                Text(EvalRanks.name(p.tier).uppercased())
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(EvalPalette.secondary)
                            }
                        }
                    }
                    Spacer(minLength: 6)
                    VStack(spacing: 1) {
                        Text("\(p.kills) / \(p.deaths) / \(p.assists)").font(.system(size: 21, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                        Text("K/D/A").font(.system(size: 14, weight: .medium)).foregroundStyle(EvalPalette.secondary)
                    }
                    VStack(spacing: 1) {
                        Text("\(s.acs)").font(.system(size: 21, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                        Text("ACS").font(.system(size: 14, weight: .medium)).foregroundStyle(EvalPalette.secondary)
                    }
                    .frame(minWidth: 40)
                    Button {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                            if expanded { expandedPlayerIDs.remove(p.puuid) } else { expandedPlayerIDs.insert(p.puuid) }
                        }
                    } label: {
                        Image(systemName: expanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(EvalPalette.secondary)
                            .frame(width: 28, height: 37)
                    }
                    .buttonStyle(.plain)
                }
                if expanded {
                    VStack(spacing: 10) {
                        divider
                        HStack(spacing: 0) {
                            statColumn(String(format: "%.2f", s.kd), "K/D", color: s.kd >= 1 ? EvalPalette.up : EvalPalette.enemy)
                            statColumn("\(s.hsPercent)%", "HS%")
                            statColumn("\(s.adr)", "ADR")
                            statColumn("\(s.kast)%", "KAST")
                        }
                        statLine("Premières éliminations", "\(s.firstKills)")
                        statLine("Premières morts", "\(s.firstDeaths)")
                        statLine("Poses", "\(s.plants)")
                        statLine("Désamorçages", "\(s.defuses)")
                        HStack {
                            Button("Cibler ce joueur") { targetPUUID = p.puuid }
                            Spacer()
                            NavigationLink("Voir le profil") { EvalPlayerProfileView(name: p.name, tag: p.tag) }
                        }
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(EvalPalette.accent)
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            Rectangle().fill(partyColor(p, a) ?? .clear).frame(width: 4)
        }
        .background(EvalPalette.card, in: .rect(cornerRadius: 18))
        .clipShape(.rect(cornerRadius: 18))
    }

    private func statColumn(_ value: String, _ label: String, color: Color = .white) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(color)
            Text(label).font(.system(size: 13, weight: .medium)).foregroundStyle(EvalPalette.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func statLine(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title).font(.system(size: 15)).foregroundStyle(EvalPalette.secondary)
            Spacer()
            Text(value).font(.system(size: 15, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
        }
    }

    // MARK: - Manches

    private func roundsTab(_ a: EvalMatchAnalysis) -> some View {
        let maxKills = max(1, a.match.rounds.map { a.roundKillers($0).ally.count }.max() ?? 1,
                           a.match.rounds.map { a.roundKillers($0).enemy.count }.max() ?? 1)
        let laneHeight = CGFloat(maxKills) * 44 + 8
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Tués par Round").font(.system(size: 23, weight: .bold)).foregroundStyle(EvalColors.text)
                Spacer()
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 1) {
                    ForEach(a.match.rounds) { round in
                        let killers = a.roundKillers(round)
                        let won = round.winner == a.target.team
                        VStack(spacing: 0) {
                            VStack(spacing: 8) {
                                ForEach(Array(killers.ally.reversed().enumerated()), id: \.offset) { _, p in
                                    agentBubble(p.agentIconURL, color: EvalPalette.ally, size: 36)
                                }
                            }
                            .padding(.vertical, 4)
                            .frame(width: 54, height: laneHeight, alignment: .bottom)
                            .background(LinearGradient(colors: [.clear, EvalPalette.ally.opacity(0.22)], startPoint: .top, endPoint: .bottom))

                            Text("\(round.n)")
                                .font(.system(size: 23, weight: .semibold).monospacedDigit())
                                .foregroundStyle(won ? EvalPalette.ally : EvalPalette.enemy)
                                .frame(width: 62, height: 53)
                                .background(won ? Color(hex: 0x1F3D36) : Color(hex: 0x4A1E22))

                            VStack(spacing: 8) {
                                ForEach(Array(killers.enemy.enumerated()), id: \.offset) { _, p in
                                    agentBubble(p.agentIconURL, color: EvalPalette.enemy, size: 36)
                                }
                            }
                            .padding(.vertical, 4)
                            .frame(width: 54, height: laneHeight, alignment: .top)
                            .background(LinearGradient(colors: [EvalPalette.enemy.opacity(0.22), .clear], startPoint: .top, endPoint: .bottom))
                        }
                    }
                }
            }

            Button { showRoundDetails = true } label: {
                HStack(spacing: 14) {
                    Image(systemName: "map").font(.system(size: 28)).foregroundStyle(EvalPalette.accent)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Détails par Round").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                        Text("Consultez la chronologie et les événements de chaque manche.")
                            .font(.system(size: 16)).foregroundStyle(EvalPalette.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold)).foregroundStyle(EvalPalette.secondary)
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
            .buttonStyle(.plain)
            .padding(.top, 8)
        }
        .sheet(isPresented: $showRoundDetails) {
            EvalRoundTimelineView(match: a.match, team: a.target.team)
        }
    }

    private func agentBubble(_ url: URL?, color: Color, size: CGFloat = 26) -> some View {
        remoteImage(url)
            .frame(width: size, height: size)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(color, lineWidth: 1.5))
    }

    // MARK: - Duels

    private func duelsTab(_ a: EvalMatchAnalysis) -> some View {
        let totals = a.duelTotals
        return VStack(spacing: 18) {
            HStack(spacing: 12) {
                if let rival = a.mainRival { duelCard("flame.fill", "RIVAL PRINCIPAL", rival, a) }
                if let traded = a.mostTraded { duelCard("arrow.triangle.2.circlepath", "LE PLUS ÉCHANGÉ", traded, a) }
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Matrice des duels").font(.system(size: 23, weight: .bold)).foregroundStyle(EvalColors.text)
                duelMatrix(a)
                    .padding(14)
                    .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            HStack(spacing: 0) {
                bigStat("TOTAL\nDE DUELS", "\(totals.total)")
                bigStat("PREMIERS\nSANGS", "\(totals.firstBloods)")
                bigStat("TAUX DE VICTOIRE", "\(totals.winRate)%", color: totals.winRate >= 50 ? EvalPalette.up : EvalPalette.enemy)
            }
            .padding(18)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
    }

    private func duelCard(_ icon: String, _ title: String, _ duel: EvalDuel, _ a: EvalMatchAnalysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 14))
                Text(title).font(.system(size: 14, weight: .semibold)).tracking(1)
            }
            .foregroundStyle(EvalPalette.secondary)
            HStack(spacing: 10) {
                remoteImage(a.match.player(duel.ally)?.agentIconURL).frame(width: 44, height: 44).clipShape(Circle())
                VStack(spacing: 2) {
                    Text("\(duel.won) : \(duel.lost)").font(.system(size: 23, weight: .heavy).monospacedDigit()).foregroundStyle(EvalColors.text)
                    Text("\(duel.total) duels").font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                }
                remoteImage(a.match.player(duel.enemy)?.agentIconURL).frame(width: 44, height: 44).clipShape(Circle())
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
    }

    private func duelMatrix(_ a: EvalMatchAnalysis) -> some View {
        let allies = a.allies
        let enemies = a.enemies
        return VStack(spacing: 6) {
            HStack(spacing: 6) {
                Color.clear.frame(width: 51, height: 51)
                ForEach(enemies) { p in
                    remoteImage(p.agentIconURL)
                        .frame(width: 51, height: 51)
                        .clipShape(.rect(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(EvalPalette.enemy.opacity(0.5), lineWidth: 1.5))
                        .frame(maxWidth: .infinity)
                }
            }
            ForEach(allies) { ally in
                HStack(spacing: 6) {
                    remoteImage(ally.agentIconURL)
                        .frame(width: 51, height: 51)
                        .clipShape(.rect(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(EvalPalette.ally.opacity(0.5), lineWidth: 1.5))
                    ForEach(enemies) { enemy in
                        duelCell(a.duel(ally.puuid, enemy.puuid))
                    }
                }
            }
        }
    }

    private func duelCell(_ duel: EvalDuel) -> some View {
        let zero = duel.total == 0
        let won = duel.won > duel.lost
        let lost = duel.won < duel.lost
        let background: Color = won ? Color(hex: 0x163328) : lost ? Color(hex: 0x36181C) : zero ? Color(hex: 0x1B1B1E) : Color(hex: 0x2A2A2E)
        return HStack(spacing: 2) {
            Text("\(duel.won)").foregroundStyle(zero ? Color(hex: 0x545458) : won ? EvalPalette.up : .white)
            Text(":").foregroundStyle(zero ? Color(hex: 0x545458) : .white)
            Text("\(duel.lost)").foregroundStyle(zero ? Color(hex: 0x545458) : lost ? EvalPalette.enemy : .white)
        }
        .font(.system(size: 17, weight: .bold).monospacedDigit())
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background(background, in: .rect(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(EvalColors.text.opacity(zero ? 0 : 0.06), lineWidth: 1))
    }

    private func bigStat(_ label: String, _ value: String, color: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.system(size: 14, weight: .semibold)).tracking(1).foregroundStyle(EvalPalette.secondary)
            Text(value).font(.system(size: 32, weight: .bold).monospacedDigit()).foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Performance

    private func performanceTab(_ a: EvalMatchAnalysis) -> some View {
        let all = a.playerRounds
        let rounds = all.filter { performanceSide == 0 || (performanceSide == 1) == $0.attacking }
        let best = rounds.max { $0.score < $1.score }
        let worst = rounds.min { $0.score < $1.score }
        let lobbyAvg = a.lobbyAverageRoundScore
        return VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("ACS PAR MANCHE")
                VStack(spacing: 12) {
                    Picker("Camp", selection: $performanceSide) {
                        Text("Tous").tag(0)
                        Text("Attaque").tag(1)
                        Text("Défense").tag(2)
                    }
                    .pickerStyle(.segmented)

                    roundsStrip(all)

                    Chart {
                        ForEach(rounds) { r in
                            AreaMark(x: .value("Manche", r.n), y: .value("ACS", r.score))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(LinearGradient(colors: [EvalPalette.accent.opacity(0.3), .clear], startPoint: .top, endPoint: .bottom))
                            LineMark(x: .value("Manche", r.n), y: .value("ACS", r.score))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(EvalPalette.accent)
                            PointMark(x: .value("Manche", r.n), y: .value("ACS", r.score))
                                .foregroundStyle(r.n == best?.n ? EvalPalette.gold : EvalPalette.accent)
                                .symbolSize(r.n == best?.n || r.n == worst?.n ? 90 : 30)
                        }
                        RuleMark(y: .value("Lobby", lobbyAvg))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .foregroundStyle(EvalPalette.accent.opacity(0.6))
                            .annotation(position: .top, alignment: .trailing) {
                                Text("Moyenne du lobby \(lobbyAvg)").font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                            }
                    }
                    .chartXAxis(.hidden)
                    .chartYAxis(.hidden)
                    .frame(height: 170)
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            VStack(alignment: .leading, spacing: 12) {
                sectionTitle("MANCHES")
                VStack(spacing: 0) {
                    ForEach(rounds) { r in
                        performanceRow(r, pistol: a.match.isPistol(round: r.n))
                        if r.n != rounds.last?.n { divider }
                    }
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func roundsStrip(_ rounds: [EvalPlayerRound]) -> some View {
        HStack(spacing: 4) {
            ForEach(rounds) { r in
                Capsule().fill(r.won ? EvalPalette.ally : EvalPalette.enemy).frame(height: 4)
            }
        }
    }

    private func performanceRow(_ r: EvalPlayerRound, pistol: Bool) -> some View {
        HStack(spacing: 12) {
            Text("\(r.n)")
                .font(.system(size: 20, weight: .bold).monospacedDigit())
                .foregroundStyle(r.won ? EvalPalette.ally : EvalPalette.enemy)
                .frame(width: 24)
            remoteImage(EvalAssets.weaponIcon(r.weapon), fit: true)
                .frame(width: 51, height: 21)
                .opacity(0.8)
            HStack(spacing: -6) {
                ForEach(Array(r.victims.enumerated()), id: \.offset) { _, agent in
                    remoteImage(EvalAssets.agentIcon(agent))
                        .frame(width: 28, height: 28)
                        .clipShape(.rect(cornerRadius: 5))
                        .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(EvalPalette.card, lineWidth: 1.5))
                }
            }
            Spacer()
            Text("\(r.kills) / \(r.deaths) / \(r.assists)")
                .font(.system(size: 18, weight: .semibold).monospacedDigit())
                .foregroundStyle(EvalColors.text)
        }
        .padding(.vertical, 12)
    }

    // MARK: - Économie

    private func economyTab(_ a: EvalMatchAnalysis) -> some View {
        let me = a.economy(for: a.target.puuid)
        let lobby = a.lobbyEconomy
        let loadouts = a.teamLoadouts
        let damage = a.damageTotals
        let points = a.playerRounds
        return VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("ÉCONOMIE VS LOBBY (N=\(a.lobby.count))")
                VStack(spacing: 0) {
                    metricRow("Dépense moyenne", credits(me.avgSpent), delta: Double(me.avgSpent - lobby.avgSpent), format: { credits(Int(abs($0))) })
                    divider
                    metricRow("Équipement moyen", credits(me.avgLoadout), delta: Double(me.avgLoadout - lobby.avgLoadout), format: { credits(Int(abs($0))) })
                    divider
                    metricRow("Dégâts / 1 k dépensés", "\(me.damagePer1k)", delta: Double(me.damagePer1k - lobby.damagePer1k), format: { "\(Int(abs($0)))" })
                    divider
                    metricRow("Mort avec en réserve", credits(me.bankAtDeath), delta: Double(me.bankAtDeath - lobby.bankAtDeath), higherIsBetter: false, format: { credits(Int(abs($0))) })
                }
                .padding(.horizontal, 18)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("ÉQUIPEMENT DE L'ÉQUIPE PAR MANCHE")
                VStack(spacing: 12) {
                    roundsStrip(points)
                    Chart {
                        ForEach(loadouts) { r in
                            LineMark(x: .value("Manche", r.n), y: .value("Équipement", r.ally), series: .value("Équipe", "Le vôtre"))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(EvalPalette.ally)
                                .symbol(.circle)
                            LineMark(x: .value("Manche", r.n), y: .value("Équipement", r.enemy), series: .value("Équipe", "Ennemi"))
                                .interpolationMethod(.catmullRom)
                                .foregroundStyle(EvalPalette.enemy)
                                .symbol(.circle)
                        }
                    }
                    .chartXAxis(.hidden)
                    .chartYAxis {
                        AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { value in
                            AxisGridLine().foregroundStyle(EvalColors.text.opacity(0.08))
                            AxisValueLabel {
                                if let v = value.as(Int.self) { Text(v >= 1000 ? "\(v / 1000)k" : "\(v)").foregroundStyle(EvalPalette.secondary) }
                            }
                        }
                    }
                    .frame(height: 180)
                    HStack(spacing: 18) {
                        legend(EvalPalette.ally, "Le vôtre")
                        legend(EvalPalette.enemy, "Ennemi")
                    }
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("DÉGÂTS · VS ÉQUIPEMENT")
                VStack(spacing: 14) {
                    HStack(spacing: 0) {
                        statColumnLarge("\(damage.dealt)", "MOY. INFLIGÉS")
                        statColumnLarge("\(damage.received)", "MOY. SUBIS")
                        statColumnLarge("\(damage.net)", "NET MOY.", color: damage.net >= 0 ? EvalPalette.up : EvalPalette.enemy)
                        statColumnLarge("\(damage.per1k)", "DÉGÂTS / 1 K")
                    }
                    Chart {
                        ForEach(points) { r in
                            PointMark(x: .value("Équipement", r.loadout), y: .value("Dégâts", r.damage))
                                .foregroundStyle(r.won ? EvalPalette.ally : EvalPalette.enemy)
                        }
                        RuleMark(y: .value("Moyenne", damage.dealt))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .foregroundStyle(EvalColors.text.opacity(0.3))
                            .annotation(position: .top, alignment: .trailing) {
                                Text("Moy. \(damage.dealt)").font(.system(size: 13)).foregroundStyle(EvalPalette.secondary)
                            }
                    }
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                            AxisGridLine().foregroundStyle(EvalColors.text.opacity(0.06))
                            AxisValueLabel().foregroundStyle(EvalPalette.secondary)
                        }
                    }
                    .chartYAxis {
                        AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { _ in
                            AxisGridLine().foregroundStyle(EvalColors.text.opacity(0.06))
                            AxisValueLabel().foregroundStyle(EvalPalette.secondary)
                        }
                    }
                    .frame(height: 200)
                    Text("Valeur de l'équipement (crédits)").font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func credits(_ value: Int) -> String {
        value.formatted(.number.grouping(.automatic).locale(Locale(identifier: "fr_FR")))
    }

    private func legend(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 9, height: 9)
            Text(label).font(.system(size: 16)).foregroundStyle(.white.opacity(0.8))
        }
    }

    private func statColumnLarge(_ value: String, _ label: String, color: Color = .white) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 22, weight: .bold).monospacedDigit()).foregroundStyle(color)
            Text(label).font(.system(size: 13, weight: .semibold)).tracking(0.8).foregroundStyle(EvalPalette.secondary).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Joueur ciblé

    private func targetBar(_ a: EvalMatchAnalysis) -> some View {
        Menu {
            Picker("Joueur ciblé", selection: $targetPUUID) {
                ForEach(a.match.players) { p in Text(p.handle).tag(p.puuid) }
            }
        } label: {
            HStack(spacing: 12) {
                remoteImage(a.target.agentIconURL).frame(width: 41, height: 41).clipShape(.rect(cornerRadius: 8))
                VStack(alignment: .leading, spacing: 1) {
                    Text("JOUEUR CIBLÉ").font(.system(size: 14, weight: .semibold)).tracking(1.2).foregroundStyle(EvalPalette.secondary)
                    handleText(a.target.name, a.target.tag, size: 17)
                }
                Spacer()
                if selectedTab != .scoreboard {
                    Image(systemName: "chevron.up.chevron.down").font(.system(size: 15, weight: .semibold)).foregroundStyle(EvalPalette.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .trailing) {
            if selectedTab == .scoreboard {
                Menu {
                    Picker("Trier par", selection: $sortBy) {
                        ForEach(PlayerSortCriteria.allCases) { Text($0.label).tag($0) }
                    }
                } label: {
                    HStack(spacing: 10) {
                        Rectangle().fill(EvalColors.text.opacity(0.15)).frame(width: 1, height: 41)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("TRIER").font(.system(size: 14, weight: .semibold)).tracking(1.2).foregroundStyle(EvalPalette.secondary)
                            Text(sortBy.label).font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                        }
                        Image(systemName: "chevron.up.chevron.down").font(.system(size: 15, weight: .semibold)).foregroundStyle(EvalPalette.secondary)
                    }
                    .padding(.trailing, 16)
                }
            }
        }
        .background(.ultraThinMaterial, in: .capsule)
        .overlay(Capsule().strokeBorder(EvalColors.text.opacity(0.12), lineWidth: 1))
    }

    // MARK: - Utilitaires

    private func handleText(_ name: String, _ tag: String, size: CGFloat) -> some View {
        (Text(name).foregroundStyle(EvalColors.text) + Text(tag.isEmpty ? "" : "#\(tag)").foregroundStyle(EvalPalette.secondary))
            .font(.system(size: size, weight: .semibold))
            .lineLimit(1)
    }

    private func remoteImage(_ url: URL?, fit: Bool = false) -> some View {
        AsyncImage(url: url) { phase in
            if let image = phase.image {
                if fit { image.resizable().scaledToFit() } else { image.resizable().scaledToFill() }
            } else {
                Color(hex: 0x2A2A2E)
            }
        }
    }
}

/// Chronologie réelle de chaque manche : qui a tué qui, avec quoi et quand.
struct EvalRoundTimelineView: View {
    @Environment(\.dismiss) private var dismiss
    let match: EvalMatch
    let team: String

    private static func endLabel(_ end: String) -> String {
        switch end.lowercased() {
        case "eliminated": return "Élimination"
        case "bomb detonated": return "Spike explosé"
        case "bomb defused": return "Spike désamorcé"
        case "round timer expired": return "Temps écoulé"
        case "surrendered": return "Abandon"
        default: return end
        }
    }

    var body: some View {
        NavigationStack {
            List(match.rounds) { round in
                Section {
                    ForEach(Array(match.kills.filter { $0.r == round.n }.sorted { $0.t < $1.t }.enumerated()), id: \.offset) { _, kill in
                        killRow(kill)
                    }
                } header: {
                    HStack {
                        Text("Manche \(round.n)").foregroundStyle(round.winner == team ? Color(hex: 0x2DD4BF) : EvalAccent.color)
                        Spacer()
                        Text(Self.endLabel(round.end))
                    }
                    .font(.system(size: 15, weight: .semibold))
                }
            }
            .navigationTitle("Détails par Round")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { dismiss() } } }
        }
        .presentationDragIndicator(.visible)
    }

    private func killRow(_ kill: EvalMatch.Kill) -> some View {
        let killer = match.player(kill.k)
        let victim = match.player(kill.v)
        let allyKill = killer?.team == team
        return HStack(spacing: 8) {
            Text(String(format: "%d:%02d", kill.t / 60000, (kill.t / 1000) % 60))
                .font(.system(size: 14).monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 34, alignment: .leading)
            icon(killer?.agentIconURL)
            Text(killer?.name ?? "?").font(.system(size: 16, weight: .semibold))
                .foregroundStyle(allyKill ? Color(hex: 0x2DD4BF) : EvalAccent.color).lineLimit(1)
            AsyncImage(url: EvalAssets.weaponIcon(kill.w)) { $0.image?.resizable().scaledToFit() }
                .frame(width: 51, height: 16)
            icon(victim?.agentIconURL)
            Text(victim?.name ?? "?").font(.system(size: 16)).lineLimit(1)
            Spacer(minLength: 0)
        }
    }

    private func icon(_ url: URL?) -> some View {
        AsyncImage(url: url) { $0.image?.resizable().scaledToFill() }
            .frame(width: 28, height: 28)
            .clipShape(.rect(cornerRadius: 6))
    }
}
