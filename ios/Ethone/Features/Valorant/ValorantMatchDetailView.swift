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
    static let targetRing = Color(hex: 0xDADDA4)
    static let allyParties: [Color] = [Color(hex: 0x22D3EE), Color(hex: 0x4ADE80), Color(hex: 0xA78BFA)]
    static let enemyParties: [Color] = [Color(hex: 0xF59E0B), Color(hex: 0xF472B6), Color(hex: 0xFACC15)]
}

private enum RoundMetric: String, CaseIterable, Identifiable {
    case acs = "ACS"
    case damage = "Dégâts"
    case kills = "Éliminations"
    var id: String { rawValue }
}

private enum TeamMetric: String, CaseIterable, Identifiable {
    case loadout = "Équipement"
    case spent = "Dépense"
    case bank = "Crédits"
    var id: String { rawValue }
}

private enum DamageAxis: String, CaseIterable, Identifiable {
    case loadout = "vs Équipement"
    case spent = "vs Dépense"
    var id: String { rawValue }
}

private enum BuyType: String, CaseIterable {
    case pistol = "PISTOL"
    case eco = "ÉCO"
    case semi = "SEMI-BUY"
    case bonus = "BONUS"
    case full = "FULL BUY"

    var color: Color {
        switch self {
        case .pistol: return Color(hex: 0xC97B2E)
        case .eco: return Color(hex: 0x8E8E93)
        case .semi: return Color(hex: 0xE8C15A)
        case .bonus: return Color(hex: 0x1FA6B8)
        case .full: return Color(hex: 0x34A853)
        }
    }
}

private struct MetricPoint: Identifiable {
    let n: Int
    let value: Double
    var id: Int { n }
}

private struct AdvantageBucket: Identifiable {
    let k: Int
    let won: Int
    let total: Int
    let label: String
    var id: Int { k }
    var rate: Double { total == 0 ? 0 : Double(won) / Double(total) * 100 }
}

private struct WeaponRow {
    let uuid: String
    let name: String
    let kills: Int
    let damage: Int
}

private struct EvalDuelSelection: Identifiable, Hashable {
    let ally: String
    let enemy: String
    var id: String { ally + enemy }
}

struct ValorantMatchDetailView: View {
    @State private var expandedMetric: String?
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let match: ValorantMatch
    var initialTarget: String? = nil

    @State private var evalMatch: EvalMatch?
    @State private var loadFailed = false
    @State private var selectedTab: MatchDetailTab = .summary
    @State private var sortBy: PlayerSortCriteria = .acs
    @State private var targetPUUID: String = ""
    @State private var expandedPlayerIDs: Set<String> = []
    @State private var performanceSide = 0
    @State private var showRoundDetails = false
    @State private var roundMetric: RoundMetric = .acs
    @State private var teamMetric: TeamMetric = .loadout
    @State private var damageAxis: DamageAxis = .loadout
    @State private var expandedRounds: Set<Int> = []
    @State private var expandedEconomyRounds: Set<Int> = []
    @State private var expandedMatchups: Set<String> = []
    @State private var expandedSites: Set<String> = []
    @State private var duelSelection: EvalDuelSelection?

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
                        .padding(.bottom, 96)
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
                    .padding(.bottom, 8)
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

    private var navBar: some View {
        HStack(spacing: 12) {
            circleButton(systemImage: "chevron.left") { dismiss() }
            Spacer()
            if selectedTab == .summary {
                Text("Détails du match").font(.system(size: 22, weight: .bold)).foregroundStyle(EvalColors.text)
            } else {
                HStack(spacing: 8) {
                    EvalModeIcon(mode: match.mode, tier: match.myPlayer?.tierNumber ?? 0)
                        .frame(width: 22, height: 22)
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
                                .overlay(Capsule().strokeBorder(EvalColors.text.opacity(selected ? 0.14 : 0), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .id(tab.id)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        sectionTitle(text) { EmptyView() }
    }

    private func sectionTitle<Trailing: View>(_ text: String, @ViewBuilder trailing: () -> Trailing) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 13, weight: .semibold))
                .tracking(1.5)
                .foregroundStyle(EvalPalette.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 8)
            trailing()
        }
        .padding(.horizontal, 4)
    }

    private func pickerMenu<T: Hashable & Identifiable & RawRepresentable>(_ selection: Binding<T>, _ all: [T]) -> some View where T.RawValue == String {
        Menu {
            Picker(selection.wrappedValue.rawValue, selection: selection) {
                ForEach(all) { Text($0.rawValue).tag($0) }
            }
        } label: {
            HStack(spacing: 4) {
                Text(selection.wrappedValue.rawValue)
                Image(systemName: "chevron.up.chevron.down").font(.system(size: 12, weight: .bold))
            }
            .font(.system(size: 16, weight: .medium))
            .foregroundStyle(EvalPalette.accent)
        }
    }

    private func expandChevron(_ open: Bool) -> some View {
        Image(systemName: "chevron.down")
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(EvalPalette.secondary)
            .rotationEffect(.degrees(open ? 180 : 0))
            .frame(width: 22)
    }

    private func summaryTab(_ a: EvalMatchAnalysis) -> some View {
        let me = a.targetSummary
        let lobby = a.lobbySummary
        let halves = a.halves()
        return VStack(spacing: 18) {
            HStack(spacing: 14) {
                remoteImage(a.target.agentIconURL)
                    .frame(width: 44, height: 44)
                    .clipShape(.rect(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 2) {
                    (Text(a.target.name).foregroundStyle(EvalColors.text)
                     + Text(a.target.tag.isEmpty ? "" : "#\(a.target.tag)").foregroundStyle(EvalPalette.secondary))
                        .font(.system(size: 20, weight: .medium))
                        .lineLimit(1)
                    rankLabel(tier(of: a.target), size: 15)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text(a.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.system(size: 14, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(a.won ? EvalPalette.up : EvalPalette.enemy)
                    HStack(spacing: 6) {
                        Text("\(a.teamRounds)").foregroundStyle(EvalColors.text)
                        Text("–").foregroundStyle(EvalPalette.secondary)
                        Text("\(a.opponentRounds)").foregroundStyle(EvalPalette.secondary)
                    }
                    .font(.system(size: 15, weight: .semibold).monospacedDigit())
                }
            }
            .padding(16)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("VS MOYENNE DU LOBBY (N=\(a.lobby.count))")
                VStack(spacing: 0) {
                    metricRow("ACS", "\(me.acs)", delta: Double(me.acs - lobby.acs), format: { "\(Int(abs($0)))" })
                    lobbyBreakdown("ACS", a, value: { Double(a.summary(for: $0).acs) }, text: { "\(Int($0.rounded()))" })
                    divider
                    metricRow("ADR", "\(me.adr)", delta: Double(me.adr - lobby.adr), format: { "\(Int(abs($0)))" })
                    lobbyBreakdown("ADR", a, value: { Double(a.summary(for: $0).adr) }, text: { "\(Int($0.rounded()))" })
                    divider
                    metricRow("HS%", "\(me.hsPercent)%", delta: Double(me.hsPercent - lobby.hsPercent), format: { "\(Int(abs($0)))%" })
                    lobbyBreakdown("HS%", a, value: { Double(a.summary(for: $0).hsPercent) }, text: { "\(Int($0.rounded()))%" })
                    divider
                    metricRow("KAST", "\(me.kast)%", delta: Double(me.kast - lobby.kast), format: { "\(Int(abs($0)))%" })
                    lobbyBreakdown("KAST", a, value: { Double(a.summary(for: $0).kast) }, text: { "\(Int($0.rounded()))%" })
                    divider
                    metricRow("K/D", String(format: "%.2f", me.kd), delta: me.kd - lobby.kd, format: { String(format: "%.2f", abs($0)) })
                    lobbyBreakdown("K/D", a, value: { a.summary(for: $0).kd }, text: { String(format: "%.2f", $0) })
                    divider
                    metricRow("FK / manche", String(format: "%.2f", me.fkPerRound), delta: me.fkPerRound - lobby.fkPerRound, format: { String(format: "%.2f", abs($0)) })
                    lobbyBreakdown("FK / manche", a, value: { a.summary(for: $0).fkPerRound }, text: { String(format: "%.2f", $0) })
                }
                .padding(.horizontal, 16)
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
                EvalModeIcon(mode: match.mode, tier: match.myPlayer?.tierNumber ?? 0).frame(width: 40, height: 40).foregroundStyle(.white.opacity(0.75))
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
                remoteImage(ValorantAssets.shared.maps[a.match.map.lowercased()] ?? ValorantAssets.shared.splashes[a.match.map.lowercased()])
                    .frame(height: 89)
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
            .frame(height: 89)
            .clipped()
            Color.clear.frame(height: 16)
        }
        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        .clipShape(.rect(cornerRadius: 22))
    }

    private var divider: some View { Divider().overlay(EvalColors.text.opacity(0.06)) }

    private func tier(of p: EvalMatch.Player) -> Int {
        if p.tier > 0 { return p.tier }
        return p.puuid == model.valorant.puuid ? model.valorant.currentTier : 0
    }

    @ViewBuilder
    private func rankLabel(_ tier: Int, size: CGFloat) -> some View {
        HStack(spacing: 5) {
            if tier > 0 {
                remoteImage(ValorantProfile.tierIcon(tier), fit: true).frame(width: size + 4, height: size + 4)
            } else {
                Image(systemName: "questionmark.circle.fill").font(.system(size: size - 1)).foregroundStyle(EvalPalette.secondary)
            }
            Text((tier > 0 ? EvalRanks.name(tier) : "Non classé").uppercased())
                .font(.system(size: size, weight: .medium))
                .tracking(0.5)
                .foregroundStyle(tier > 0 ? Color(hex: EvalRanks.color(tier)) : EvalPalette.secondary)
                .lineLimit(1)
        }
    }

    private func metricRow(_ title: String, _ value: String, delta: Double, higherIsBetter: Bool = true, neutral: Bool = false, format: (Double) -> String) -> some View {
        let isEqual = abs(delta) < 0.005
        let good = (delta > 0) == higherIsBetter
        let deltaColor: Color = neutral ? EvalPalette.secondary : (good ? EvalPalette.up : EvalPalette.enemy)
        return Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) { expandedMetric = expandedMetric == title ? nil : title }
        } label: {
            HStack {
                Text(title).font(.system(size: 17)).foregroundStyle(EvalColors.text)
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text(value).font(.system(size: 17, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                    if isEqual {
                        Image(systemName: "equal").font(.system(size: 12, weight: .bold)).foregroundStyle(EvalPalette.secondary)
                    } else {
                        HStack(spacing: 2) {
                            Image(systemName: delta > 0 ? "arrow.up" : "arrow.down").font(.system(size: 11, weight: .bold))
                            Text(format(delta)).font(.system(size: 13, weight: .semibold).monospacedDigit())
                        }
                        .foregroundStyle(deltaColor)
                    }
                }
                expandChevron(expandedMetric == title).padding(.leading, 8)
            }
            .padding(.vertical, 9)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func lobbyBreakdown(_ title: String, _ a: EvalMatchAnalysis, value: @escaping (String) -> Double, text: @escaping (Double) -> String) -> some View {
        if expandedMetric == title {
            let rows = a.match.players
                .map { player in (player: player, value: value(player.puuid)) }
                .sorted { $0.value > $1.value }
            let others = rows.filter { $0.player.puuid != a.target.puuid }
            let average = others.isEmpty ? 0 : others.reduce(0) { $0 + $1.value } / Double(others.count)
            let top = max(rows.map(\.value).max() ?? 0, 0.0001)
            VStack(spacing: 10) {
                divider
                ForEach(rows, id: \.player.puuid) { row in
                    let isTarget = row.player.puuid == a.target.puuid
                    let color: Color = isTarget ? EvalPalette.targetRing : (row.player.team == a.target.team ? Color(hex: 0x3F8F7C) : Color(hex: 0xB34A4A))
                    HStack(spacing: 10) {
                        remoteImage(row.player.agentIconURL)
                            .frame(width: 26, height: 26)
                            .clipShape(.rect(cornerRadius: 6))
                        Text(row.player.name)
                            .font(.system(size: 16, weight: isTarget ? .semibold : .regular))
                            .foregroundStyle(isTarget ? EvalPalette.targetRing : EvalColors.text)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Capsule()
                            .fill(Color.white.opacity(0.08))
                            .frame(width: 128, height: 10)
                            .overlay(alignment: .leading) {
                                Capsule().fill(color).frame(width: max(6, 128 * min(1, max(0, row.value) / top)), height: 10)
                            }
                            .overlay(alignment: .leading) {
                                Rectangle().fill(Color.white.opacity(0.55)).frame(width: 1.5, height: 14)
                                    .offset(x: 128 * min(1, max(0, average) / top))
                            }
                        Text(text(row.value))
                            .font(.system(size: 16, weight: .medium).monospacedDigit())
                            .foregroundStyle(EvalColors.text)
                            .frame(width: 58, alignment: .trailing)
                    }
                }
                HStack(spacing: 10) {
                    Image(systemName: "rectangle.split.3x1")
                        .font(.system(size: 13))
                        .frame(width: 26)
                    Text("Moyenne du lobby").font(.system(size: 15))
                    Spacer()
                    Text(text(average)).font(.system(size: 15, weight: .medium).monospacedDigit())
                }
                .foregroundStyle(EvalPalette.secondary)
                .padding(.bottom, 8)
            }
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }

    private func halfCard(_ title: String, _ half: EvalHalf) -> some View {
        VStack(spacing: 10) {
            Text(title).font(.system(size: 13, weight: .bold)).tracking(1.2).foregroundStyle(EvalPalette.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(half.won)").font(.system(size: 34, weight: .semibold).monospacedDigit())
                Text("/ \(half.played)").font(.system(size: 22, weight: .medium).monospacedDigit()).foregroundStyle(EvalPalette.secondary)
            }
            .foregroundStyle(EvalColors.text)
            divider
            VStack(spacing: 7) {
                halfRow("Éliminations", half.kills)
                halfRow("Morts", half.deaths)
                halfRow("Assistances", half.assists)
                halfRow("Poses", half.plants)
                halfRow("Désamorçage", half.defuses)
                halfRow("Premiers Sangs", half.firstKills)
                halfRow("Premières morts", half.firstDeaths)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
    }

    private func halfRow(_ label: String, _ value: Int) -> some View {
        HStack {
            Text(label).font(.system(size: 15)).foregroundStyle(EvalPalette.secondary).lineLimit(1).minimumScaleFactor(0.8)
            Spacer(minLength: 4)
            Text("\(value)").font(.system(size: 15, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
        }
    }

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
        VStack(alignment: .leading, spacing: 7) {
            sectionTitle("VOTRE ÉQUIPE").padding(.bottom, 4)
            ForEach(sorted(a.allies, a)) { scoreboardCard($0, ally: true, a) }
            sectionTitle("ÉQUIPE ENNEMIE").padding(.top, 14).padding(.bottom, 4)
            ForEach(sorted(a.enemies, a)) { scoreboardCard($0, ally: false, a) }
        }
    }

    private func partyColor(_ p: EvalMatch.Player, _ a: EvalMatchAnalysis) -> Color? {
        var groups: [String] = []
        for player in a.match.players where player.team == p.team && !player.party.isEmpty && !groups.contains(player.party) {
            if a.match.players.filter({ $0.party == player.party }).count > 1 { groups.append(player.party) }
        }
        guard let index = groups.firstIndex(of: p.party) else { return nil }
        let palette = p.team == a.target.team ? EvalPalette.allyParties : EvalPalette.enemyParties
        return palette[index % palette.count]
    }

    private func scoreboardCard(_ p: EvalMatch.Player, ally: Bool, _ a: EvalMatchAnalysis) -> some View {
        let expanded = expandedPlayerIDs.contains(p.puuid)
        let isTarget = p.puuid == a.target.puuid
        let s = a.summary(for: p.puuid)
        let leftColor = isTarget ? EvalPalette.target : (ally ? EvalPalette.ally : EvalPalette.enemy)
        let kdColor: Color = isTarget ? EvalPalette.ally : (s.kd > 1.005 ? EvalPalette.up : (s.kd < 0.995 ? EvalPalette.enemy : EvalColors.text))
        return VStack(spacing: 10) {
            HStack(spacing: 12) {
                remoteImage(p.agentIconURL)
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(leftColor.opacity(0.45), lineWidth: 1.5))
                VStack(alignment: .leading, spacing: 2) {
                    (Text(p.name).foregroundStyle(isTarget ? EvalPalette.target : EvalColors.text)
                     + Text(p.tag.isEmpty ? "" : "#\(p.tag)").foregroundStyle(isTarget ? EvalPalette.target.opacity(0.6) : EvalPalette.secondary))
                        .font(.system(size: 19, weight: .medium))
                        .lineLimit(1)
                    rankLabel(tier(of: p), size: 13)
                }
                Spacer(minLength: 6)
                NavigationLink {
                    EvalPlayerProfileView(name: p.name, tag: p.tag)
                } label: {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(EvalPalette.accent)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                Button {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                        if expanded { expandedPlayerIDs.remove(p.puuid) } else { expandedPlayerIDs.insert(p.puuid) }
                    }
                } label: {
                    expandChevron(expanded).frame(width: 28, height: 32)
                }
                .buttonStyle(.plain)
            }
            HStack(spacing: 0) {
                statColumn(String(format: "%.2f", s.kd), "K/D", color: kdColor)
                statColumn("\(p.kills) / \(p.deaths) / \(p.assists)", "K/D/A")
                statColumn("\(s.hsPercent)%", "HS%")
                statColumn("\(s.acs)", "ACS")
            }
            if expanded {
                VStack(spacing: 10) {
                    divider
                    HStack(spacing: 0) {
                        statColumn("\(s.adr)", "ADR")
                        statColumn("\(s.kast)%", "KAST")
                        statColumn("\(s.firstKills)", "FK")
                        statColumn("\(s.firstDeaths)", "FD")
                    }
                    statLine("Dégâts infligés", "\(p.dmg)")
                    statLine("Dégâts subis", "\(p.dmgIn)")
                    statLine("Poses", "\(s.plants)")
                    statLine("Désamorçages", "\(s.defuses)")
                    if !isTarget {
                        Button("Cibler ce joueur") { targetPUUID = p.puuid }
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(EvalPalette.accent)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
        .padding(.leading, 16)
        .padding(.trailing, 12)
        .padding(.vertical, 10)
        .background(EvalPalette.card)
        .overlay(alignment: .leading) { Rectangle().fill(leftColor).frame(width: 3) }
        .overlay(alignment: .trailing) { Rectangle().fill(partyColor(p, a) ?? .clear).frame(width: 3) }
        .clipShape(.rect(cornerRadius: 18))
    }

    private func statColumn(_ value: String, _ label: String, color: Color = EvalColors.text) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.8)
            Text(label).font(.system(size: 13, weight: .medium)).tracking(1).foregroundStyle(EvalPalette.secondary)
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

    private func roundsTab(_ a: EvalMatchAnalysis) -> some View {
        let maxKills = max(1, a.match.rounds.map { a.roundKillers($0).ally.count }.max() ?? 1,
                           a.match.rounds.map { a.roundKillers($0).enemy.count }.max() ?? 1)
        let laneHeight = CGFloat(maxKills) * 42 + 8
        return VStack(alignment: .leading, spacing: 14) {
            Text("Tués par Round").font(.system(size: 20, weight: .bold)).foregroundStyle(EvalColors.text)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 1) {
                    ForEach(a.match.rounds) { round in
                        roundColumn(round, a, laneHeight: laneHeight)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("CARTE DES KILLS")
                EvalKillMapView(match: a.match, focusPUUID: a.target.puuid)
                    .padding(14)
                    .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
            .padding(.top, 8)

            Button { showRoundDetails = true } label: {
                HStack(spacing: 14) {
                    Image(systemName: "map").font(.system(size: 24)).foregroundStyle(EvalPalette.accent)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Détails par Round").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalColors.text)
                        Text("Consultez la chronologie et les événements de chaque manche.")
                            .font(.system(size: 15)).foregroundStyle(EvalPalette.secondary)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(EvalPalette.secondary)
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

    private func roundColumn(_ round: EvalMatch.Round, _ a: EvalMatchAnalysis, laneHeight: CGFloat) -> some View {
        let killers = a.roundKillers(round)
        let won = round.winner == a.target.team
        return VStack(spacing: 1) {
            VStack(spacing: 8) {
                ForEach(Array(killers.ally.reversed().enumerated()), id: \.offset) { _, p in
                    agentBubble(p.agentIconURL, color: p.puuid == a.target.puuid ? EvalPalette.targetRing : EvalPalette.ally, size: 34)
                }
            }
            .padding(.vertical, 4)
            .frame(width: 51, height: laneHeight, alignment: .bottom)
            .background(LinearGradient(colors: [Color(hex: 0x0B1412), Color(hex: 0x1C3A33)], startPoint: .top, endPoint: .bottom))

            Text("\(round.n)")
                .font(.system(size: 22, weight: .semibold).monospacedDigit())
                .foregroundStyle(won ? EvalPalette.ally : EvalPalette.enemy)
                .frame(width: 51, height: 40)
                .background(won ? Color(hex: 0x1C3A33) : Color(hex: 0x4A1C1E))

            VStack(spacing: 8) {
                ForEach(Array(killers.enemy.enumerated()), id: \.offset) { _, p in
                    agentBubble(p.agentIconURL, color: EvalPalette.enemy, size: 34)
                }
            }
            .padding(.vertical, 4)
            .frame(width: 51, height: laneHeight, alignment: .top)
            .background(LinearGradient(colors: [Color(hex: 0x3A1517), Color(hex: 0x100606)], startPoint: .top, endPoint: .bottom))
        }
    }

    private func agentBubble(_ url: URL?, color: Color, size: CGFloat = 26) -> some View {
        remoteImage(url)
            .frame(width: size, height: size)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(color, lineWidth: 1.5))
    }

    private func weaponImage(_ uuid: String) -> some View {
        AsyncImage(url: EvalAssets.weaponIcon(uuid)) { $0.image?.resizable().scaledToFit() }
            .opacity(0.7)
    }

    private func killRow(_ kill: EvalMatch.Kill, _ a: EvalMatchAnalysis, showRound: Bool = false) -> some View {
        let killer = a.match.player(kill.k)
        let victim = a.match.player(kill.v)
        let allyKill = killer?.team == a.target.team
        return HStack(spacing: 7) {
            if showRound {
                Text("M\(kill.r)")
                    .font(.system(size: 13, weight: .semibold).monospacedDigit())
                    .foregroundStyle(EvalPalette.secondary)
                    .frame(width: 30, alignment: .leading)
            }
            Text(String(format: "%d:%02d", kill.t / 60000, (kill.t / 1000) % 60))
                .font(.system(size: 13).monospacedDigit())
                .foregroundStyle(EvalPalette.secondary)
                .frame(width: 32, alignment: .leading)
            agentBubble(killer?.agentIconURL, color: allyKill ? EvalPalette.ally : EvalPalette.enemy, size: 24)
            Text(killer?.name ?? "")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(allyKill ? EvalPalette.ally : EvalPalette.enemy)
                .lineLimit(1)
            weaponImage(kill.w).frame(width: 44, height: 14)
            agentBubble(victim?.agentIconURL, color: allyKill ? EvalPalette.enemy : EvalPalette.ally, size: 24)
            Text(victim?.name ?? "")
                .font(.system(size: 14))
                .foregroundStyle(EvalColors.text)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
    }

    private func duelKills(_ ally: String, _ enemy: String, _ a: EvalMatchAnalysis) -> [EvalMatch.Kill] {
        a.match.kills
            .filter { ($0.k == ally && $0.v == enemy) || ($0.k == enemy && $0.v == ally) }
            .sorted { ($0.r, $0.t) < ($1.r, $1.t) }
    }

    private func biggestImbalance(_ a: EvalMatchAnalysis) -> EvalDuel? {
        a.targetDuels.filter { $0.total > 0 }.max { (abs($0.won - $0.lost), $0.total) < (abs($1.won - $1.lost), $1.total) }
    }

    private func duelsTab(_ a: EvalMatchAnalysis) -> some View {
        let totals = a.duelTotals
        return VStack(spacing: 18) {
            HStack(spacing: 12) {
                if let rival = a.mainRival { duelCard("flame.fill", "RIVAL PRINCIPAL", rival, a) }
                if let imbalance = biggestImbalance(a) { duelCard("arrow.up.right", "PLUS GRAND DÉSÉQUILIBRE", imbalance, a) }
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Matrice des duels").font(.system(size: 20, weight: .bold)).foregroundStyle(EvalColors.text)
                duelMatrix(a)
                    .padding(14)
                    .background(EvalPalette.card, in: .rect(cornerRadius: 22))
                HStack(spacing: 6) {
                    Image(systemName: "hand.tap")
                    Text("Touchez un duel pour voir l'analyse complète.")
                }
                .font(.system(size: 14))
                .foregroundStyle(EvalPalette.secondary)
                .padding(.horizontal, 4)
            }

            HStack(alignment: .top, spacing: 0) {
                bigStat("TOTAL\nDE DUELS", "\(totals.total)", alignment: .leading)
                bigStat("PREMIERS\nSANGS", "\(totals.firstBloods)", alignment: .leading)
                bigStat("TAUX DE VICTOIRE", "\(totals.winRate)%", color: totals.winRate >= 50 ? EvalPalette.up : EvalPalette.enemy, alignment: .trailing)
            }
            .padding(18)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
        .sheet(item: $duelSelection) { selection in
            duelSheet(selection, a)
        }
    }

    private func duelCard(_ icon: String, _ title: String, _ duel: EvalDuel, _ a: EvalMatchAnalysis) -> some View {
        Button {
            duelSelection = EvalDuelSelection(ally: duel.ally, enemy: duel.enemy)
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: icon).font(.system(size: 13, weight: .semibold))
                    Text(title).font(.system(size: 13, weight: .semibold)).tracking(1.2).lineLimit(1).minimumScaleFactor(0.6)
                }
                .foregroundStyle(EvalPalette.secondary)
                HStack(spacing: 10) {
                    agentBubble(a.match.player(duel.ally)?.agentIconURL, color: EvalPalette.ally.opacity(0.6), size: 32)
                    VStack(spacing: 1) {
                        Text("\(duel.won) : \(duel.lost)").font(.system(size: 20, weight: .heavy).monospacedDigit()).foregroundStyle(EvalColors.text)
                        Text("\(duel.total) duels").font(.system(size: 13)).foregroundStyle(EvalPalette.secondary)
                    }
                    agentBubble(a.match.player(duel.enemy)?.agentIconURL, color: EvalPalette.enemy.opacity(0.6), size: 32)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
        .buttonStyle(.plain)
    }

    private func duelMatrix(_ a: EvalMatchAnalysis) -> some View {
        let allies = a.allies
        let enemies = a.enemies
        return VStack(spacing: 6) {
            HStack(spacing: 6) {
                Color.clear.frame(width: 40, height: 40)
                ForEach(enemies) { p in
                    remoteImage(p.agentIconURL)
                        .frame(width: 40, height: 40)
                        .clipShape(.rect(cornerRadius: 7))
                        .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(EvalPalette.enemy.opacity(0.55), lineWidth: 1.5))
                        .frame(maxWidth: .infinity)
                }
            }
            ForEach(allies) { ally in
                HStack(spacing: 6) {
                    remoteImage(ally.agentIconURL)
                        .frame(width: 40, height: 40)
                        .clipShape(.rect(cornerRadius: 7))
                        .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(ally.puuid == a.target.puuid ? EvalPalette.targetRing : EvalPalette.ally.opacity(0.55), lineWidth: 1.5))
                    ForEach(enemies) { enemy in
                        let duel = a.duel(ally.puuid, enemy.puuid)
                        Button {
                            if duel.total > 0 { duelSelection = EvalDuelSelection(ally: ally.puuid, enemy: enemy.puuid) }
                        } label: {
                            duelCell(duel)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func duelCell(_ duel: EvalDuel) -> some View {
        let zero = duel.total == 0
        let won = duel.won > duel.lost
        let lost = duel.won < duel.lost
        let background: Color = won ? Color(hex: 0x163328) : lost ? Color(hex: 0x36181C) : zero ? .clear : Color(hex: 0x2A2A2E)
        let border: Color = won ? EvalPalette.up.opacity(0.25) : lost ? EvalPalette.enemy.opacity(0.25) : EvalColors.text.opacity(zero ? 0 : 0.12)
        return HStack(spacing: 2) {
            Text("\(duel.won)").foregroundStyle(zero ? Color(hex: 0x545458) : won ? EvalPalette.up : EvalColors.text)
            Text(":").foregroundStyle(zero ? Color(hex: 0x545458) : EvalColors.text.opacity(0.8))
            Text("\(duel.lost)").foregroundStyle(zero ? Color(hex: 0x545458) : lost ? EvalPalette.enemy : EvalColors.text)
        }
        .font(.system(size: 19, weight: zero ? .regular : .bold).monospacedDigit())
        .frame(maxWidth: .infinity)
        .frame(height: 54)
        .background(background, in: .rect(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(border, lineWidth: 1))
    }

    private func bigStat(_ label: String, _ value: String, color: Color = EvalColors.text, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 6) {
            Text(label).font(.system(size: 13, weight: .medium)).tracking(1).foregroundStyle(EvalPalette.secondary)
                .multilineTextAlignment(alignment == .trailing ? .trailing : .leading)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            Text(value).font(.system(size: 32, weight: .semibold).monospacedDigit()).foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: alignment == .trailing ? .trailing : .leading)
    }

    private func duelSheet(_ selection: EvalDuelSelection, _ a: EvalMatchAnalysis) -> some View {
        let duel = a.duel(selection.ally, selection.enemy)
        let kills = duelKills(selection.ally, selection.enemy, a)
        let firstOfRound = Dictionary(grouping: a.match.kills, by: \.r).compactMapValues { list in list.min { $0.t < $1.t } }
        let openers = kills.filter { firstOfRound[$0.r] == $0 }
        let openersWon = openers.filter { $0.k == selection.ally }.count
        return NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        duelSheetPlayer(a.match.player(selection.ally), color: selection.ally == a.target.puuid ? EvalPalette.targetRing : EvalPalette.ally)
                        VStack(spacing: 2) {
                            Text("\(duel.won) : \(duel.lost)").font(.system(size: 30, weight: .heavy).monospacedDigit()).foregroundStyle(EvalColors.text)
                            Text("\(duel.total) duels").font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                        }
                        duelSheetPlayer(a.match.player(selection.enemy), color: EvalPalette.enemy)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity)
                    .background(EvalPalette.card, in: .rect(cornerRadius: 22))

                    VStack(spacing: 12) {
                        statLine("Premiers sangs entre eux", "\(openersWon) : \(openers.count - openersWon)")
                        statLine("Taux de victoire", duel.total == 0 ? "0%" : "\(Int((Double(duel.won) / Double(duel.total) * 100).rounded()))%")
                    }
                    .padding(16)
                    .background(EvalPalette.card, in: .rect(cornerRadius: 22))

                    VStack(alignment: .leading, spacing: 8) {
                        sectionTitle("ÉLIMINATIONS")
                        VStack(spacing: 12) {
                            ForEach(Array(kills.enumerated()), id: \.offset) { _, kill in
                                killRow(kill, a, showRound: true)
                            }
                        }
                        .padding(14)
                        .background(EvalPalette.card, in: .rect(cornerRadius: 22))
                    }
                }
                .padding(16)
            }
            .background(EvalColors.background)
            .navigationTitle("Analyse du duel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { duelSelection = nil } } }
        }
        .presentationDragIndicator(.visible)
    }

    private func duelSheetPlayer(_ p: EvalMatch.Player?, color: Color) -> some View {
        VStack(spacing: 6) {
            agentBubble(p?.agentIconURL, color: color, size: 48)
            Text(p?.name ?? "").font(.system(size: 14, weight: .semibold)).foregroundStyle(EvalColors.text).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }

    private func roundMetricValue(_ s: EvalMatch.RoundStat) -> Double {
        switch roundMetric {
        case .acs: return Double(s.score)
        case .damage: return Double(s.dmg)
        case .kills: return Double(s.kills)
        }
    }

    private func playerMetricValue(_ r: EvalPlayerRound) -> Double {
        switch roundMetric {
        case .acs: return Double(r.score)
        case .damage: return Double(r.damage)
        case .kills: return Double(r.kills)
        }
    }

    private func metricText(_ v: Double) -> String {
        roundMetric == .kills ? String(format: "%.1f", v).replacingOccurrences(of: ".", with: ",") : "\(Int(v.rounded()))"
    }

    private func performanceTab(_ a: EvalMatchAnalysis) -> some View {
        let all = a.playerRounds
        let rounds = all.filter { performanceSide == 0 || (performanceSide == 1) == $0.attacking }
        let points = rounds.map { MetricPoint(n: $0.n, value: playerMetricValue($0)) }
        let others = a.match.rounds.flatMap { $0.stats.filter { $0.p != a.target.puuid } }
        let lobbyAvg = others.isEmpty ? 0 : others.map { roundMetricValue($0) }.reduce(0, +) / Double(others.count)
        return VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("\(roundMetric.rawValue.uppercased()) PAR MANCHE") { pickerMenu($roundMetric, RoundMetric.allCases) }
                VStack(spacing: 12) {
                    Picker("Camp", selection: $performanceSide) {
                        Text("Tous").tag(0)
                        Text("Attaque").tag(1)
                        Text("Défense").tag(2)
                    }
                    .pickerStyle(.segmented)

                    roundsStrip(all)

                    performanceChart(points, lobbyAvg: lobbyAvg)
                        .frame(height: 190)
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("MANCHES")
                VStack(spacing: 0) {
                    ForEach(rounds) { r in
                        performanceRow(r, a)
                        if r.n != rounds.last?.n { divider }
                    }
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            matchupsSection(a)
            sitesSection(a)
            weaponsSection(a)
        }
    }

    private func performanceChart(_ points: [MetricPoint], lobbyAvg: Double) -> some View {
        let best = points.max { $0.value < $1.value }?.n
        let worst = points.min { $0.value < $1.value }?.n
        return Chart {
            ForEach(points) { p in
                AreaMark(x: .value("Manche", p.n), y: .value("Valeur", p.value))
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(LinearGradient(colors: [EvalColors.text.opacity(0.16), .clear], startPoint: .top, endPoint: .bottom))
                LineMark(x: .value("Manche", p.n), y: .value("Valeur", p.value))
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(EvalPalette.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2.5))
                pointMark(p, best: p.n == best, worst: p.n == worst && p.n != best)
            }
            RuleMark(y: .value("Lobby", lobbyAvg))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                .foregroundStyle(EvalPalette.enemy.opacity(0.7))
                .annotation(position: .top, alignment: .trailing) {
                    Text("Moyenne du lobby \(metricText(lobbyAvg))").font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                }
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(range: .plotDimension(startPadding: 24, endPadding: 24))
    }

    @ChartContentBuilder
    private func pointMark(_ p: MetricPoint, best: Bool, worst: Bool) -> some ChartContent {
        PointMark(x: .value("Manche", p.n), y: .value("Valeur", p.value))
            .symbol(best || worst ? BasicChartSymbolShape.diamond : BasicChartSymbolShape.circle)
            .symbolSize(best || worst ? 120 : 36)
            .foregroundStyle(best ? EvalPalette.gold : (worst ? EvalPalette.enemy : EvalPalette.accent))
            .annotation(position: best ? .top : .bottom, spacing: 6) {
                Text(best ? "MEILLEUR" : (worst ? "FAIBLE" : ""))
                    .font(.system(size: 12, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(EvalPalette.secondary)
            }
    }

    private func roundsStrip(_ rounds: [EvalPlayerRound]) -> some View {
        HStack(spacing: 4) {
            ForEach(rounds) { r in
                Capsule().fill(r.won ? EvalPalette.ally : EvalPalette.enemy).frame(height: 4)
            }
        }
    }

    private func performanceRow(_ r: EvalPlayerRound, _ a: EvalMatchAnalysis) -> some View {
        let open = expandedRounds.contains(r.n)
        let kills = a.match.kills.filter { $0.r == r.n && ($0.k == a.target.puuid || $0.v == a.target.puuid) }.sorted { $0.t < $1.t }
        return VStack(spacing: 10) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    if open { expandedRounds.remove(r.n) } else { expandedRounds.insert(r.n) }
                }
            } label: {
                HStack(spacing: 12) {
                    Text("\(r.n)")
                        .font(.system(size: 20, weight: .bold).monospacedDigit())
                        .foregroundStyle(r.won ? EvalPalette.ally : EvalPalette.enemy)
                        .frame(width: 26, alignment: .leading)
                    weaponImage(r.weapon).frame(width: 52, height: 20)
                    if !r.victims.isEmpty {
                        HStack(spacing: -6) {
                            ForEach(Array(r.victims.enumerated()), id: \.offset) { _, agent in
                                remoteImage(EvalAssets.agentIcon(agent))
                                    .frame(width: 22, height: 22)
                                    .clipShape(.rect(cornerRadius: 5))
                                    .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(EvalPalette.card, lineWidth: 1.5))
                            }
                        }
                        .padding(3)
                        .background(EvalColors.text.opacity(0.06), in: .rect(cornerRadius: 7))
                        .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(EvalColors.text.opacity(0.18), lineWidth: 1))
                    }
                    Spacer()
                    Text("\(r.kills) / \(r.deaths) / \(r.assists)")
                        .font(.system(size: 17, weight: .semibold).monospacedDigit())
                        .foregroundStyle(EvalColors.text)
                    expandChevron(open)
                }
                .padding(.vertical, 11)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            if open {
                VStack(spacing: 8) {
                    statLine("Score de combat", "\(r.score)")
                    statLine("Dégâts", "\(r.damage)")
                    statLine("Équipement", credits(r.loadout))
                    statLine("Dépensé", credits(r.spent))
                    statLine("Crédits restants", credits(r.bank))
                    ForEach(Array(kills.enumerated()), id: \.offset) { _, kill in
                        killRow(kill, a)
                    }
                }
                .padding(.bottom, 12)
                .transition(.opacity)
            }
        }
    }

    @ViewBuilder
    private func matchupsSection(_ a: EvalMatchAnalysis) -> some View {
        let duels = a.targetDuels.filter { $0.total > 0 }.sorted { ($0.total, $0.won) > ($1.total, $1.won) }
        if !duels.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("MATCHUPS ADVERSES")
                VStack(spacing: 0) {
                    ForEach(duels, id: \.enemy) { duel in
                        matchupRow(duel, a)
                        if duel.enemy != duels.last?.enemy { divider }
                    }
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func matchupRow(_ duel: EvalDuel, _ a: EvalMatchAnalysis) -> some View {
        let open = expandedMatchups.contains(duel.enemy)
        let enemy = a.match.player(duel.enemy)
        return VStack(spacing: 10) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    if open { expandedMatchups.remove(duel.enemy) } else { expandedMatchups.insert(duel.enemy) }
                }
            } label: {
                HStack(spacing: 14) {
                    remoteImage(enemy?.agentIconURL)
                        .frame(width: 32, height: 32)
                        .clipShape(.rect(cornerRadius: 7))
                        .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(EvalPalette.enemy.opacity(0.4), lineWidth: 1))
                    Text(enemy?.name ?? "")
                        .font(.system(size: 18))
                        .foregroundStyle(EvalColors.text)
                        .lineLimit(1)
                    Spacer()
                    HStack(spacing: 5) {
                        Text("\(duel.won)").foregroundStyle(duel.won > duel.lost ? EvalPalette.up : EvalColors.text)
                        Text(":").foregroundStyle(EvalPalette.secondary)
                        Text("\(duel.lost)").foregroundStyle(duel.lost > duel.won ? EvalPalette.enemy : EvalColors.text)
                    }
                    .font(.system(size: 18, weight: .semibold).monospacedDigit())
                    expandChevron(open)
                }
                .padding(.vertical, 11)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            if open {
                VStack(spacing: 10) {
                    ForEach(Array(duelKills(a.target.puuid, duel.enemy, a).enumerated()), id: \.offset) { _, kill in
                        killRow(kill, a, showRound: true)
                    }
                }
                .padding(.bottom, 12)
                .transition(.opacity)
            }
        }
    }

    @ViewBuilder
    private func sitesSection(_ a: EvalMatchAnalysis) -> some View {
        let planted = a.match.rounds.filter { !$0.plant.isEmpty && !$0.site.isEmpty && a.match.player($0.plant)?.team == a.target.team }
        let sites = Array(Set(planted.map(\.site))).sorted()
        if !sites.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("PRÉFÉRENCE DE SITE")
                VStack(spacing: 0) {
                    ForEach(sites, id: \.self) { site in
                        siteRow(site, planted.filter { $0.site == site }, a)
                        if site != sites.last { divider }
                    }
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func siteRow(_ site: String, _ rounds: [EvalMatch.Round], _ a: EvalMatchAnalysis) -> some View {
        let open = expandedSites.contains(site)
        let won = rounds.filter { $0.winner == a.target.team }.count
        let rate = rounds.isEmpty ? 0 : Int((Double(won) / Double(rounds.count) * 100).rounded())
        return VStack(spacing: 10) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    if open { expandedSites.remove(site) } else { expandedSites.insert(site) }
                }
            } label: {
                HStack(spacing: 14) {
                    Text(site).font(.system(size: 20, weight: .bold)).foregroundStyle(EvalColors.text).frame(width: 26, alignment: .leading)
                    Text(rounds.count > 1 ? "\(rounds.count) poses" : "\(rounds.count) pose")
                        .font(.system(size: 18))
                        .foregroundStyle(EvalPalette.secondary)
                    Spacer()
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("\(rate)%").font(.system(size: 17, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                        Text("Conversion").font(.system(size: 13)).foregroundStyle(EvalPalette.secondary)
                    }
                    expandChevron(open)
                }
                .padding(.vertical, 11)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            if open {
                VStack(spacing: 8) {
                    ForEach(rounds) { round in
                        HStack {
                            Text("Manche \(round.n)")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(round.winner == a.target.team ? EvalPalette.ally : EvalPalette.enemy)
                            Text("· posé par \(a.match.player(round.plant)?.name ?? "")")
                                .font(.system(size: 15))
                                .foregroundStyle(EvalPalette.secondary)
                                .lineLimit(1)
                            Spacer()
                            Text(round.winner == a.target.team ? "Gagnée" : "Perdue")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(round.winner == a.target.team ? EvalPalette.up : EvalPalette.enemy)
                        }
                    }
                }
                .padding(.bottom, 12)
                .transition(.opacity)
            }
        }
    }

    @ViewBuilder
    private func weaponsSection(_ a: EvalMatchAnalysis) -> some View {
        let rows = weaponStats(a)
        if !rows.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("ARMES UTILISÉES")
                VStack(spacing: 0) {
                    ForEach(rows, id: \.uuid) { row in
                        HStack(spacing: 14) {
                            weaponImage(row.uuid).frame(width: 60, height: 20)
                            Text(row.name).font(.system(size: 18)).foregroundStyle(EvalColors.text).lineLimit(1)
                            Spacer()
                            weaponStat("\(row.kills)", "ÉLIMINATIONS")
                            weaponStat("\(row.damage)", "DÉGÂTS").frame(minWidth: 60, alignment: .trailing)
                        }
                        .padding(.vertical, 12)
                        if row.uuid != rows.last?.uuid { divider }
                    }
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func weaponStat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 1) {
            Text(value).font(.system(size: 17, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
            Text(label).font(.system(size: 12, weight: .medium)).tracking(1).foregroundStyle(EvalPalette.secondary)
        }
    }

    private func weaponStats(_ a: EvalMatchAnalysis) -> [WeaponRow] {
        var kills: [String: Int] = [:]
        var damage: [String: Int] = [:]
        for kill in a.match.kills where kill.k == a.target.puuid && !kill.w.isEmpty {
            kills[kill.w.lowercased(), default: 0] += 1
        }
        for r in a.playerRounds where !r.weapon.isEmpty {
            damage[r.weapon.lowercased(), default: 0] += r.damage
        }
        let names = ValorantAssets.shared.weapons
        return Set(kills.keys).union(damage.keys)
            .compactMap { uuid in names[uuid].map { WeaponRow(uuid: uuid, name: $0.name, kills: kills[uuid] ?? 0, damage: damage[uuid] ?? 0) } }
            .sorted { ($0.kills, $0.damage) > ($1.kills, $1.damage) }
    }

    private func teamMetricValue(_ s: EvalMatch.RoundStat) -> Int {
        switch teamMetric {
        case .loadout: return s.loadout
        case .spent: return s.spent
        case .bank: return s.bank
        }
    }

    private func teamSeries(_ a: EvalMatchAnalysis) -> [EvalMatchAnalysis.TeamLoadout] {
        let allies = Set(a.allies.map(\.puuid))
        let enemies = Set(a.enemies.map(\.puuid))
        return a.match.rounds.map { round in
            EvalMatchAnalysis.TeamLoadout(
                n: round.n,
                ally: round.stats.filter { allies.contains($0.p) }.reduce(0) { $0 + teamMetricValue($1) },
                enemy: round.stats.filter { enemies.contains($0.p) }.reduce(0) { $0 + teamMetricValue($1) }
            )
        }
    }

    private func loadoutAdvantage(_ a: EvalMatchAnalysis) -> [Int: Int] {
        let allies = Set(a.allies.map(\.puuid))
        let enemies = Set(a.enemies.map(\.puuid))
        var out: [Int: Int] = [:]
        for round in a.match.rounds {
            let ally = round.stats.filter { allies.contains($0.p) }
            let enemy = round.stats.filter { enemies.contains($0.p) }
            guard !ally.isEmpty, !enemy.isEmpty else { continue }
            out[round.n] = ally.reduce(0) { $0 + $1.loadout } / ally.count - enemy.reduce(0) { $0 + $1.loadout } / enemy.count
        }
        return out
    }

    private func buyType(_ r: EvalPlayerRound, _ a: EvalMatchAnalysis) -> BuyType {
        if a.match.isPistol(round: r.n) { return .pistol }
        if r.loadout >= 3900 { return .full }
        if a.match.isPistol(round: r.n - 1), a.match.rounds.first(where: { $0.n == r.n - 1 })?.winner == a.target.team { return .bonus }
        return r.loadout < 2000 ? .eco : .semi
    }

    private func kLabel(_ x: Int) -> String {
        x == 0 ? "0" : (x > 0 ? "+\(x)k" : "−\(-x)k")
    }

    private func advantageBuckets(_ a: EvalMatchAnalysis) -> [AdvantageBucket] {
        let advantage = loadoutAdvantage(a)
        var groups: [Int: (won: Int, total: Int)] = [:]
        for round in a.match.rounds {
            guard let d = advantage[round.n] else { continue }
            let k = Int((Double(d) / 1000).rounded(.down))
            var g = groups[k] ?? (0, 0)
            g.total += 1
            if round.winner == a.target.team { g.won += 1 }
            groups[k] = g
        }
        return groups.keys.sorted().map { k in
            AdvantageBucket(k: k, won: groups[k]?.won ?? 0, total: groups[k]?.total ?? 0, label: "\(kLabel(k))…\(kLabel(k + 1))")
        }
    }

    private func shortCredits(_ v: Int) -> String {
        v < 1000 ? "\(v)" : String(format: "%.1fk", Double(v) / 1000).replacingOccurrences(of: ".", with: ",")
    }

    private func economyTab(_ a: EvalMatchAnalysis) -> some View {
        let me = a.economy(for: a.target.puuid)
        let lobby = a.lobbyEconomy
        return VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("ÉCONOMIE VS LOBBY (N=\(a.lobby.count))")
                VStack(spacing: 0) {
                    metricRow("Dépense moyenne", credits(me.avgSpent), delta: Double(me.avgSpent - lobby.avgSpent), neutral: true, format: { credits(Int(abs($0))) })
                    lobbyBreakdown("Dépense moyenne", a, value: { Double(a.economy(for: $0).avgSpent) }, text: { credits(Int($0.rounded())) })
                    divider
                    metricRow("Équipement moyen", credits(me.avgLoadout), delta: Double(me.avgLoadout - lobby.avgLoadout), neutral: true, format: { credits(Int(abs($0))) })
                    lobbyBreakdown("Équipement moyen", a, value: { Double(a.economy(for: $0).avgLoadout) }, text: { credits(Int($0.rounded())) })
                    divider
                    metricRow("Dégâts / 1 k dépensés", "\(me.damagePer1k)", delta: Double(me.damagePer1k - lobby.damagePer1k), format: { "\(Int(abs($0)))" })
                    lobbyBreakdown("Dégâts / 1 k dépensés", a, value: { Double(a.economy(for: $0).damagePer1k) }, text: { "\(Int($0.rounded()))" })
                    divider
                    metricRow("Mort avec en réserve", credits(me.bankAtDeath), delta: Double(me.bankAtDeath - lobby.bankAtDeath), higherIsBetter: false, format: { credits(Int(abs($0))) })
                    lobbyBreakdown("Mort avec en réserve", a, value: { Double(a.economy(for: $0).bankAtDeath) }, text: { credits(Int($0.rounded())) })
                }
                .padding(.horizontal, 16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }

            teamChartSection(a)
            damageSection(a)
            buyTypesSection(a)
            roundEconomySection(a)
            advantageSection(a)
        }
    }

    private func teamChartSection(_ a: EvalMatchAnalysis) -> some View {
        let series = teamSeries(a)
        let pistol = a.match.halfLength + 1
        let showPistol = a.match.rounds.contains { $0.n == pistol }
        return VStack(alignment: .leading, spacing: 8) {
            sectionTitle("\(teamMetric.rawValue.uppercased()) DE L'ÉQUIPE PAR MANCHE") { pickerMenu($teamMetric, TeamMetric.allCases) }
            VStack(spacing: 12) {
                roundsStrip(a.playerRounds)
                Chart {
                    ForEach(series) { r in
                        LineMark(x: .value("Manche", r.n), y: .value("Valeur", r.ally), series: .value("Équipe", "Le vôtre"))
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(EvalPalette.ally)
                            .symbol(.circle)
                        LineMark(x: .value("Manche", r.n), y: .value("Valeur", r.enemy), series: .value("Équipe", "Ennemi"))
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(EvalPalette.enemy)
                            .symbol(.circle)
                    }
                    if showPistol {
                        RuleMark(x: .value("Manche", pistol))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                            .foregroundStyle(EvalPalette.enemy.opacity(0.5))
                            .annotation(position: .top) {
                                Text("PISTOL").font(.system(size: 11, weight: .bold)).tracking(1).foregroundStyle(EvalPalette.secondary)
                            }
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
                .frame(height: 190)
                HStack(spacing: 18) {
                    legend(EvalPalette.ally, "Le vôtre")
                    legend(EvalPalette.enemy, "Ennemi")
                }
            }
            .padding(16)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
    }

    private func damageSection(_ a: EvalMatchAnalysis) -> some View {
        let damage = a.damageTotals
        let points = a.playerRounds
        return VStack(alignment: .leading, spacing: 8) {
            sectionTitle("DÉGÂTS · \(damageAxis.rawValue.uppercased())") { pickerMenu($damageAxis, DamageAxis.allCases) }
            VStack(spacing: 14) {
                HStack(spacing: 0) {
                    statColumnLarge("\(damage.dealt)", "MOY. INFLIGÉS")
                    statColumnLarge("\(damage.received)", "MOY. SUBIS")
                    statColumnLarge("\(damage.net)", "NET MOY.", color: damage.net >= 0 ? EvalPalette.up : EvalPalette.enemy)
                    statColumnLarge("\(damage.per1k)", "DÉGÂTS / 1 K")
                }
                divider
                Chart {
                    ForEach(points) { r in
                        PointMark(x: .value("Crédits", damageAxis == .loadout ? r.loadout : r.spent), y: .value("Dégâts", r.damage))
                            .foregroundStyle(r.won ? EvalPalette.ally : EvalPalette.enemy)
                    }
                    RuleMark(y: .value("Moyenne", damage.dealt))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(EvalPalette.enemy.opacity(0.7))
                        .annotation(position: .top, alignment: .trailing) {
                            Text("Moy. \(damage.dealt)").font(.system(size: 13)).foregroundStyle(EvalPalette.secondary)
                        }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic(desiredCount: 4)) { value in
                        AxisGridLine(stroke: StrokeStyle(lineWidth: 1, dash: [3, 3])).foregroundStyle(EvalColors.text.opacity(0.12))
                        AxisValueLabel {
                            if let v = value.as(Int.self) { Text(v >= 1000 ? "\(v / 1000)k" : "\(v)").foregroundStyle(EvalPalette.secondary) }
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { _ in
                        AxisGridLine().foregroundStyle(EvalColors.text.opacity(0.06))
                        AxisValueLabel().foregroundStyle(EvalPalette.secondary)
                    }
                }
                .frame(height: 200)
                Text(damageAxis == .loadout ? "Valeur de l'équipement (crédits)" : "Crédits dépensés")
                    .font(.system(size: 14)).foregroundStyle(EvalPalette.secondary)
                Text("Chaque point représente une manche — vert : gagnée, rouge : perdue. Plus un point est au-dessus de la moyenne en pointillés, plus cet équipement a infligé de dégâts.")
                    .font(.system(size: 13))
                    .foregroundStyle(EvalPalette.secondary.opacity(0.8))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
    }

    private func buyChip(_ type: BuyType) -> some View {
        Text(type.rawValue)
            .font(.system(size: 13, weight: .bold))
            .tracking(1.2)
            .foregroundStyle(EvalColors.text)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(type.color.opacity(0.22), in: .capsule)
            .overlay(Capsule().strokeBorder(type.color.opacity(0.6), lineWidth: 1))
    }

    @ViewBuilder
    private func buyTypesSection(_ a: EvalMatchAnalysis) -> some View {
        let rounds = a.playerRounds
        let types = rounds.map { buyType($0, a) }
        let present = BuyType.allCases.filter { types.contains($0) }
        if !present.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("TYPES D'ACHAT")
                VStack(spacing: 14) {
                    ForEach(present, id: \.self) { type in
                        let matching = zip(rounds, types).filter { $0.1 == type }.map { $0.0 }
                        let won = matching.filter(\.won).count
                        HStack(spacing: 12) {
                            buyChip(type).frame(width: 104, alignment: .leading)
                            Capsule()
                                .fill(EvalColors.text.opacity(0.08))
                                .frame(height: 8)
                                .overlay(alignment: .leading) {
                                    GeometryReader { g in
                                        Capsule().fill(type.color).frame(width: g.size.width * Double(matching.count) / Double(max(1, rounds.count)))
                                    }
                                }
                            Text("\(matching.count)")
                                .font(.system(size: 16, weight: .semibold).monospacedDigit())
                                .foregroundStyle(EvalColors.text)
                                .frame(width: 26, alignment: .trailing)
                            Text("\(won)–\(matching.count - won)")
                                .font(.system(size: 16).monospacedDigit())
                                .foregroundStyle(EvalColors.text.opacity(0.8))
                                .frame(width: 44, alignment: .trailing)
                        }
                    }
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func roundEconomySection(_ a: EvalMatchAnalysis) -> some View {
        let rounds = a.playerRounds
        let advantage = loadoutAdvantage(a)
        return VStack(alignment: .leading, spacing: 8) {
            sectionTitle("ÉCONOMIE DE LA MANCHE")
            VStack(spacing: 0) {
                ForEach(rounds) { r in
                    economyRoundRow(r, a, advantage: advantage[r.n])
                    if r.n != rounds.last?.n { divider }
                }
            }
            .padding(.horizontal, 16)
            .background(EvalPalette.card, in: .rect(cornerRadius: 22))
        }
    }

    private func economyRoundRow(_ r: EvalPlayerRound, _ a: EvalMatchAnalysis, advantage: Int?) -> some View {
        let open = expandedEconomyRounds.contains(r.n)
        let armor = a.match.rounds.first { $0.n == r.n }?.stats.first { $0.p == a.target.puuid }?.armor ?? ""
        return VStack(spacing: 10) {
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    if open { expandedEconomyRounds.remove(r.n) } else { expandedEconomyRounds.insert(r.n) }
                }
            } label: {
                HStack(spacing: 12) {
                    Text("\(r.n)")
                        .font(.system(size: 20, weight: .bold).monospacedDigit())
                        .foregroundStyle(r.won ? EvalPalette.ally : EvalPalette.enemy)
                        .frame(width: 26, alignment: .leading)
                    buyChip(buyType(r, a))
                    weaponImage(r.weapon).frame(width: 48, height: 18)
                    if !armor.isEmpty {
                        AsyncImage(url: URL(string: "https://media.valorant-api.com/gear/\(armor)/displayicon.png")) { $0.image?.resizable().scaledToFit() }
                            .frame(width: 20, height: 20)
                    }
                    Spacer()
                    advantageLabel(advantage)
                    expandChevron(open)
                }
                .padding(.vertical, 11)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            if open {
                VStack(spacing: 8) {
                    statLine("Équipement", credits(r.loadout))
                    statLine("Dépensé", credits(r.spent))
                    statLine("Crédits restants", credits(r.bank))
                    if let advantage {
                        statLine("Avantage d'équipement moyen", (advantage > 0 ? "+" : "") + credits(advantage))
                    }
                }
                .padding(.bottom, 12)
                .transition(.opacity)
            }
        }
    }

    @ViewBuilder
    private func advantageLabel(_ d: Int?) -> some View {
        if let d {
            if abs(d) < 100 {
                Image(systemName: "equal").font(.system(size: 14, weight: .bold)).foregroundStyle(EvalPalette.secondary)
            } else {
                HStack(spacing: 3) {
                    Image(systemName: d > 0 ? "arrow.up" : "arrow.down").font(.system(size: 13, weight: .bold))
                    Text(shortCredits(abs(d))).font(.system(size: 16, weight: .semibold).monospacedDigit())
                }
                .foregroundStyle(d > 0 ? EvalPalette.up : EvalPalette.enemy)
            }
        }
    }

    @ViewBuilder
    private func advantageSection(_ a: EvalMatchAnalysis) -> some View {
        let buckets = advantageBuckets(a)
        if !buckets.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionTitle("TAUX DE VICTOIRE SELON L'AVANTAGE D'ÉQUIPEMENT")
                VStack(spacing: 12) {
                    Chart {
                        ForEach(buckets) { b in
                            BarMark(x: .value("Avantage", b.label), y: .value("Victoires", b.rate), width: .ratio(0.7))
                                .foregroundStyle(barGradient(b.k < 0 ? EvalPalette.enemy : EvalPalette.up))
                                .cornerRadius(6)
                                .annotation(position: .top) {
                                    Text("\(b.won)/\(b.total)").font(.system(size: 13)).foregroundStyle(EvalPalette.secondary)
                                }
                        }
                        RuleMark(y: .value("Équilibre", 50.0))
                            .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                            .foregroundStyle(EvalPalette.enemy.opacity(0.7))
                    }
                    .chartYScale(domain: 0.0...100.0)
                    .chartYAxis {
                        AxisMarks(position: .trailing, values: [0.0, 50.0, 100.0]) { value in
                            AxisGridLine().foregroundStyle(EvalColors.text.opacity(0.08))
                            AxisValueLabel {
                                if let v = value.as(Double.self) { Text("\(Int(v))%").foregroundStyle(EvalPalette.secondary) }
                            }
                        }
                    }
                    .chartXAxis {
                        AxisMarks { _ in
                            AxisValueLabel().foregroundStyle(EvalPalette.secondary)
                        }
                    }
                    .frame(height: 210)
                    Text("Manches réparties selon l'avantage moyen d'équipement de ton équipe sur les adversaires. La ligne en pointillés marque le point d'équilibre à 50 %.")
                        .font(.system(size: 13))
                        .foregroundStyle(EvalPalette.secondary.opacity(0.8))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(16)
                .background(EvalPalette.card, in: .rect(cornerRadius: 22))
            }
        }
    }

    private func barGradient(_ color: Color) -> LinearGradient {
        LinearGradient(colors: [color, color.opacity(0.55)], startPoint: .top, endPoint: .bottom)
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

    private func statColumnLarge(_ value: String, _ label: String, color: Color = EvalColors.text) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 22, weight: .bold).monospacedDigit()).foregroundStyle(color)
            Text(label).font(.system(size: 13, weight: .semibold)).tracking(0.8).foregroundStyle(EvalPalette.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

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

    private func handleText(_ name: String, _ tag: String, size: CGFloat) -> some View {
        (Text(name).foregroundStyle(EvalColors.text) + Text(tag.isEmpty ? "" : "#\(tag)").foregroundStyle(EvalPalette.secondary))
            .font(.system(size: size, weight: .semibold))
            .lineLimit(1)
    }

    @ViewBuilder
    private func remoteImage(_ url: URL?, fit: Bool = false) -> some View {
        if fit {
            AsyncImage(url: url) { phase in
                if let image = phase.image { image.resizable().scaledToFit() } else { Color(hex: 0x2A2A2E) }
            }
        } else {
            Color(hex: 0x2A2A2E)
                .overlay {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image { image.resizable().scaledToFill() }
                    }
                }
                .clipped()
        }
    }
}

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
