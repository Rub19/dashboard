import SwiftUI
import Charts
import AVKit

// Écrans « Statistiques », « Récap de session », « Objectifs », filtres du classement,
// skins et réglages du tracker E:VAL. Tout est calculé à partir des matchs réellement
// stockés (EvalMatch), du MMR HenrikDev et des catalogues valorant-api.com.

private enum EvalUI {
    static let card = Color(hex: 0x1C1C1E)
    static let tile = Color(hex: 0x2A2A2E)
    static let secondary = Color(hex: 0x8E8E93)
    static let accent = Color(hex: 0xFD5B68)
    static let win = Color(hex: 0x7DC0A7)
    static let loss = Color(hex: 0xE0665C)
    static let head = Color(hex: 0xEDEBB4)
    static let up = Color(hex: 0x35C26B)
    static let fr = Locale(identifier: "fr_FR")

    static func percent(_ value: Double) -> String {
        value.formatted(.percent.precision(.fractionLength(1)).locale(fr))
    }

    static func duration(_ seconds: Int) -> String {
        let h = seconds / 3600, m = (seconds % 3600) / 60
        if h == 0 { return "\(m) min" }
        return m == 0 ? "\(h) h" : "\(h) h et \(m) min"
    }
}

// MARK: - Moteur de statistiques

struct EvalStatsEngine {
    struct Entry: Identifiable {
        let match: EvalMatch
        let analysis: EvalMatchAnalysis
        var id: String { match.id }
        var me: EvalMatch.Player { analysis.target }
        var date: Date { match.startedAt ?? .distantPast }
        var isDraw: Bool { !match.teams.Red.won && !match.teams.Blue.won }
    }

    let entries: [Entry]

    init(matches: [EvalMatch], puuid: String) {
        entries = matches.compactMap { m in
            guard m.player(puuid) != nil, let a = EvalMatchAnalysis(match: m, targetPUUID: puuid) else { return nil }
            return Entry(match: m, analysis: a)
        }
        .sorted { $0.date > $1.date }
    }

    var count: Int { entries.count }
    var wins: Int { entries.filter { $0.analysis.won }.count }
    var draws: Int { entries.filter(\.isDraw).count }
    var losses: Int { count - wins - draws }
    var winRate: Double { count == 0 ? 0 : Double(wins) / Double(count) }
    var kills: Int { entries.reduce(0) { $0 + $1.me.kills } }
    var deaths: Int { entries.reduce(0) { $0 + $1.me.deaths } }
    var assists: Int { entries.reduce(0) { $0 + $1.me.assists } }
    var rounds: Int { entries.reduce(0) { $0 + $1.match.roundCount } }
    var kd: Double { deaths == 0 ? Double(kills) : Double(kills) / Double(deaths) }
    var kda: Double { deaths == 0 ? Double(kills + assists) : Double(kills + assists) / Double(deaths) }
    var acs: Int { rounds == 0 ? 0 : entries.reduce(0) { $0 + $1.me.score } / rounds }
    var adr: Double { rounds == 0 ? 0 : Double(entries.reduce(0) { $0 + $1.me.dmg }) / Double(rounds) }
    var killsPerRound: Double { rounds == 0 ? 0 : Double(kills) / Double(rounds) }
    var playSeconds: Int { entries.reduce(0) { $0 + $1.match.lengthSec } }
    var headshots: Int { entries.reduce(0) { $0 + $1.me.hs } }
    var bodyshots: Int { entries.reduce(0) { $0 + $1.me.bs } }
    var legshots: Int { entries.reduce(0) { $0 + $1.me.ls } }
    var hits: Int { headshots + bodyshots + legshots }
    var hsPercent: Double { hits == 0 ? 0 : Double(headshots) / Double(hits) }
    var firstKills: Int { entries.reduce(0) { $0 + $1.analysis.targetSummary.firstKills } }
    var firstDeaths: Int { entries.reduce(0) { $0 + $1.analysis.targetSummary.firstDeaths } }
    var clutchAttempts: [(foes: Int, won: Bool)] { entries.flatMap { $0.analysis.clutchAttempts } }
    var flawless: Int { entries.reduce(0) { $0 + $1.analysis.flawlessRounds } }

    func multiKills(_ n: Int) -> Int {
        entries.reduce(0) { total, e in total + e.analysis.playerRounds.filter { n >= 5 ? $0.kills >= 5 : $0.kills == n }.count }
    }

    var multiKillRounds: Int { entries.reduce(0) { total, e in total + e.analysis.playerRounds.filter { $0.kills >= 2 }.count } }

    /// Tendance : moitié récente vs moitié ancienne (flèche ↑ / ↓ des tuiles).
    func trend(_ value: (EvalStatsEngine) -> Double) -> Int {
        guard count >= 4 else { return 0 }
        let recent = EvalStatsEngine(entries: Array(entries.prefix(count / 2)))
        let older = EvalStatsEngine(entries: Array(entries.suffix(count - count / 2)))
        let a = value(recent), b = value(older)
        return abs(a - b) < 0.0001 ? 0 : (a > b ? 1 : -1)
    }

    private init(entries: [Entry]) { self.entries = entries }

    struct Day: Identifiable { let day: Date; let entries: [Entry]; var id: Date { day } }
    struct Group: Identifiable { let key: String; let stats: EvalStatsEngine; var id: String { key } }

    func byDay() -> [Day] {
        Dictionary(grouping: entries) { Calendar.current.startOfDay(for: $0.date) }
            .map { Day(day: $0.key, entries: $0.value) }
            .sorted { $0.day < $1.day }
    }

    func grouped(_ key: (Entry) -> String) -> [Group] {
        Dictionary(grouping: entries, by: key)
            .map { Group(key: $0.key, stats: EvalStatsEngine(entries: $0.value)) }
            .sorted { $0.stats.count > $1.stats.count }
    }

    struct WeaponHits: Identifiable { let id: String; var head = 0; var body = 0; var legs = 0; var total: Int { head + body + legs } }

    /// Coups par arme tenue pendant la manche (HenrikDev ne relie pas chaque balle à une arme).
    var hitsByWeapon: [WeaponHits] {
        var out: [String: WeaponHits] = [:]
        for e in entries {
            for round in e.match.rounds {
                guard let s = round.stats.first(where: { $0.p == e.me.puuid }), !s.weapon.isEmpty else { continue }
                var w = out[s.weapon] ?? WeaponHits(id: s.weapon)
                w.head += s.hs; w.body += s.bs; w.legs += s.ls
                out[s.weapon] = w
            }
        }
        return out.values.filter { $0.total > 0 }.sorted { $0.total > $1.total }
    }

    struct BuyType: Identifiable { let id: String; let color: Color; var rounds = 0; var won = 0 }

    /// Type d'achat selon la valeur d'équipement du joueur en début de manche.
    var buyTypes: [BuyType] {
        var types = [BuyType(id: "Éco", color: Color(hex: 0xC98A43)), BuyType(id: "Semi-éco", color: Color(hex: 0x4FB0BC)),
                     BuyType(id: "Semi-achat", color: Color(hex: 0xD8B941)), BuyType(id: "Achat complet", color: Color(hex: 0x58AE5A))]
        for e in entries {
            for r in e.analysis.playerRounds {
                let i = r.loadout < 1000 ? 0 : r.loadout < 2500 ? 1 : r.loadout < 3900 ? 2 : 3
                types[i].rounds += 1
                if r.won { types[i].won += 1 }
            }
        }
        return types
    }
}

// MARK: - Statistiques

struct EvalStatisticsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    /// Profil d'un autre joueur ; nil = compte suivi.
    var player: ValorantStore.PlayerSnapshot? = nil
    private var store: ValorantStore { model.valorant }
    private var stats: EvalStatsEngine {
        if let player { return EvalStatsEngine(matches: player.matches, puuid: player.puuid) }
        return EvalStatsEngine(matches: store.evalMatchList, puuid: store.puuid)
    }
    private var history: [EvalMMR.HistoryPoint] { player?.mmr.history ?? store.mmr.history }

    var body: some View {
        let s = stats
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EvalNavHeader(title: "Statistiques", systemImage: "desktopcomputer") { dismiss() }
                matchesCard(s)
                if s.count == 0 {
                    emptyCard
                }
                if !history.isEmpty { rankChart }
                if s.count > 0 {
                    NavigationLink { EvalOverviewDetailView(title: "Aperçu", stats: s) } label: { overviewCard(s) }.buttonStyle(.plain)
                    NavigationLink { EvalPlayTimeDetailView(stats: s) } label: { playTimeCard(s) }.buttonStyle(.plain)
                    NavigationLink { EvalOverviewDetailView(title: "Ratio Kills Deaths", stats: s) } label: { kdCard(s) }.buttonStyle(.plain)
                    NavigationLink { EvalHitsDetailView(stats: s) } label: { hitsCard(s) }.buttonStyle(.plain)
                    NavigationLink { EvalWinRateDetailView(stats: s) } label: { winRateCard(s) }.buttonStyle(.plain)
                    economyCard(s)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
        .task { await ValorantAssets.shared.load() }
    }

    private func matchesCard(_ s: EvalStatsEngine) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text("Matchs").font(.system(size: 17)).foregroundStyle(.white)
                Spacer()
                Text(player == nil && store.totalMatches > 0 ? "\(s.count) / \(store.totalMatches)" : "\(s.count) enregistrés")
                    .font(.system(size: 17)).foregroundStyle(EvalUI.secondary)
            }
            .padding(18)
            if player == nil {
                Divider().overlay(Color.white.opacity(0.08)).padding(.horizontal, 18)
                Button { Task { await store.loadMoreMatches() } } label: {
                    HStack(spacing: 10) {
                        if store.isLoadingMore { ProgressView().tint(EvalUI.accent) } else { Image(systemName: "bolt.fill") }
                        Text("Charger 10 matchs de plus")
                        Spacer()
                    }
                    .font(.system(size: 17))
                    .foregroundStyle(EvalUI.accent)
                    .padding(18)
                }
                .buttonStyle(.plain)
                .disabled(store.isLoadingMore)
            }
        }
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private var emptyCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass").font(.system(size: 40)).foregroundStyle(EvalUI.secondary)
            Text("Aucun match").font(.system(size: 20, weight: .bold)).foregroundStyle(.white)
            Text("Les statistiques apparaîtront après la première synchronisation de vos parties.")
                .font(.system(size: 16)).foregroundStyle(EvalUI.secondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private var rankChart: some View {
        let points = Array(history.reversed())
        let tier = points.last?.tier ?? (player?.tier ?? store.mmr.tier)
        return VStack(alignment: .leading, spacing: 8) {
            Text("Changements des notes de rangs").font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalUI.secondary).padding(.leading, 4)
            VStack(spacing: 0) {
                Chart {
                    ForEach(Array(points.enumerated()), id: \.offset) { i, p in
                        LineMark(x: .value("Partie", i), y: .value("Élo", p.elo)).foregroundStyle(.white)
                        PointMark(x: .value("Partie", i), y: .value("Élo", p.elo))
                            .symbol { Circle().strokeBorder(.white, lineWidth: 2).frame(width: 10, height: 10) }
                    }
                }
                .chartXAxis(.hidden)
                .chartYAxis {
                    AxisMarks(position: .trailing, values: .automatic(desiredCount: 4)) { _ in
                        AxisGridLine().foregroundStyle(Color.white.opacity(0.25))
                    }
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .frame(height: 260)
                .padding(16)
                .overlay(alignment: .topTrailing) {
                    AsyncImage(url: ValorantProfile.tierIcon(tier)) { $0.image?.resizable().scaledToFit() }
                        .frame(width: 36, height: 36).padding(12)
                }
                Text(store.currentAct?.name ?? "")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.black.opacity(0.55))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(Color(hex: 0x3F7A4C))
            }
            .background(Color(hex: EvalRanks.color(tier)).opacity(0.9))
            .clipShape(.rect(cornerRadius: 22))
        }
    }

    private func cardHeader(_ icon: String, _ title: String) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: icon).font(.system(size: 20)).foregroundStyle(EvalUI.accent)
                Text(title).font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(EvalUI.secondary)
            }
            Divider().overlay(Color.white.opacity(0.08))
        }
    }

    private func overviewCard(_ s: EvalStatsEngine) -> some View {
        VStack(spacing: 14) {
            cardHeader("chart.bar.fill", "Aperçu")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible())], spacing: 12) {
                EvalStatTile(icon: "medal", title: "Taux de victoire", value: EvalUI.percent(s.winRate), trend: s.trend(\.winRate))
                EvalStatTile(icon: "cross", title: "K/D", value: String(format: "%.2f", s.kd), trend: s.trend(\.kd))
                EvalStatTile(icon: "scope", title: "HS %", value: EvalUI.percent(s.hsPercent), trend: 0)
            }
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func playTimeCard(_ s: EvalStatsEngine) -> some View {
        VStack(spacing: 14) {
            cardHeader("clock", "Répartition du temps de jeu")
            Chart(s.byDay()) { day in
                BarMark(x: .value("Jour", day.day, unit: .day), y: .value("Minutes", day.entries.reduce(0) { $0 + $1.match.lengthSec } / 60))
                    .foregroundStyle(EvalUI.accent)
            }
            .chartXAxis(.hidden).chartYAxis(.hidden)
            .frame(height: 140)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func kdCard(_ s: EvalStatsEngine) -> some View {
        let chrono = Array(s.entries.reversed())
        return VStack(spacing: 14) {
            cardHeader("plus.square", "Kill Death Ratio")
            Chart {
                ForEach(Array(chrono.enumerated()), id: \.offset) { i, e in
                    LineMark(x: .value("Partie", i), y: .value("K/D", e.analysis.targetSummary.kd))
                        .interpolationMethod(.catmullRom).foregroundStyle(EvalUI.accent)
                }
                RuleMark(y: .value("Moyenne", s.kd)).lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4])).foregroundStyle(EvalUI.secondary)
            }
            .chartXAxis(.hidden).chartYAxis(.hidden)
            .frame(height: 140)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func hitsCard(_ s: EvalStatsEngine) -> some View {
        VStack(spacing: 14) {
            cardHeader("scope", "Répartition des coups")
            EvalHitsAreaChart(entries: Array(s.entries.reversed()), average: s.hsPercent).frame(height: 150)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func winRateCard(_ s: EvalStatsEngine) -> some View {
        VStack(spacing: 14) {
            cardHeader("medal", "Taux de victoire")
            EvalWinBars(days: s.byDay()).frame(height: 150)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func economyCard(_ s: EvalStatsEngine) -> some View {
        let types = s.buyTypes
        return VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "creditcard").font(.system(size: 20)).foregroundStyle(EvalUI.accent)
                Text("Économie").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                Spacer()
            }
            Divider().overlay(Color.white.opacity(0.08))
            Chart(types) { t in
                BarMark(x: .value("Type", t.id), y: .value("Manches", t.rounds)).foregroundStyle(t.color)
                    .annotation(position: .top) {
                        if t.rounds > 0 {
                            Text(EvalUI.percent(Double(t.won) / Double(t.rounds))).font(.system(size: 11)).foregroundStyle(EvalUI.secondary)
                        }
                    }
            }
            .chartYAxis(.hidden)
            .chartXAxis { AxisMarks { _ in AxisValueLabel().foregroundStyle(EvalUI.secondary) } }
            .frame(height: 170)
            Text("Manches jouées par type d'achat, avec le taux de victoire de chaque type.")
                .font(.system(size: 12)).foregroundStyle(EvalUI.secondary)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }
}

// MARK: - Composants partagés

struct EvalNavHeader: View {
    let title: String
    var systemImage: String? = nil
    var trailing: AnyView? = nil
    let onBack: () -> Void

    var body: some View {
        HStack {
            Button(action: onBack) {
                Circle().fill(EvalUI.card).frame(width: 44, height: 44)
                    .overlay(Image(systemName: "chevron.left").font(.system(size: 17, weight: .semibold)).foregroundStyle(.white))
            }
            .buttonStyle(.plain)
            Spacer()
            HStack(spacing: 8) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title)
            }
            .font(.system(size: 19, weight: .bold))
            .foregroundStyle(.white)
            .lineLimit(1)
            Spacer()
            if let trailing { trailing } else { Color.clear.frame(width: 44, height: 44) }
        }
        .padding(.top, 4)
    }
}

struct EvalStatTile: View {
    let icon: String
    let title: String
    let value: String
    var trend: Int = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 14))
                Text(title).font(.system(size: 15)).lineLimit(1)
            }
            .foregroundStyle(EvalUI.secondary)
            HStack {
                Text(value).font(.system(size: 26, weight: .bold).monospacedDigit()).foregroundStyle(.white).lineLimit(1).minimumScaleFactor(0.6)
                Spacer()
                if trend != 0 {
                    Image(systemName: trend > 0 ? "arrow.up" : "arrow.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(trend > 0 ? EvalUI.up : EvalUI.loss)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EvalUI.tile, in: .rect(cornerRadius: 18))
    }
}

struct EvalHitsAreaChart: View {
    let entries: [EvalStatsEngine.Entry]
    let average: Double

    var body: some View {
        Chart {
            ForEach(Array(entries.enumerated()), id: \.offset) { i, e in
                let total = Double(max(1, e.me.hs + e.me.bs + e.me.ls))
                AreaMark(x: .value("Partie", i), y: .value("%", Double(e.me.ls) / total), stacking: .normalized)
                    .foregroundStyle(by: .value("Zone", "Jambes"))
                AreaMark(x: .value("Partie", i), y: .value("%", Double(e.me.bs) / total), stacking: .normalized)
                    .foregroundStyle(by: .value("Zone", "Corps"))
                AreaMark(x: .value("Partie", i), y: .value("%", Double(e.me.hs) / total), stacking: .normalized)
                    .foregroundStyle(by: .value("Zone", "Tête"))
            }
            RuleMark(y: .value("Moyenne", 1 - average))
                .lineStyle(StrokeStyle(lineWidth: 1, dash: [5, 4]))
                .foregroundStyle(.white)
                .annotation(position: .bottom) {
                    Text("Moyenne : \(EvalUI.percent(average))").font(.system(size: 13)).foregroundStyle(.black.opacity(0.7))
                }
        }
        .chartForegroundStyleScale(["Jambes": EvalUI.loss, "Corps": EvalUI.win, "Tête": EvalUI.head])
        .chartLegend(.hidden)
        .chartXAxis(.hidden).chartYAxis(.hidden)
        .clipShape(.rect(cornerRadius: 10))
    }
}

struct EvalWinBars: View {
    let days: [EvalStatsEngine.Day]

    var body: some View {
        Chart {
            ForEach(days) { day in
                let wins = day.entries.filter { $0.analysis.won }.count
                let draws = day.entries.filter(\.isDraw).count
                BarMark(x: .value("Jour", day.day, unit: .day), y: .value("Parties", wins)).foregroundStyle(by: .value("Résultat", "Victoires"))
                BarMark(x: .value("Jour", day.day, unit: .day), y: .value("Parties", draws)).foregroundStyle(by: .value("Résultat", "Nuls"))
                BarMark(x: .value("Jour", day.day, unit: .day), y: .value("Parties", day.entries.count - wins - draws)).foregroundStyle(by: .value("Résultat", "Défaites"))
            }
        }
        .chartForegroundStyleScale(["Victoires": EvalUI.win, "Nuls": EvalUI.head, "Défaites": EvalUI.loss])
        .chartLegend(.hidden)
        .chartXAxis(.hidden).chartYAxis(.hidden)
    }
}

private struct EvalInfoBanner: View {
    let count: Int
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "info.circle.fill").font(.system(size: 26)).foregroundStyle(EvalUI.accent)
            Text("Données provenant de \(count) matchs enregistrés").font(.system(size: 16)).foregroundStyle(.white)
            Spacer()
        }
        .padding(16)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }
}

private func evalSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
        Text(title).font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalUI.secondary).padding(.leading, 4)
        content()
    }
}

// MARK: - Pages détail

struct EvalOverviewDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let stats: EvalStatsEngine

    var body: some View {
        let s = stats
        let clutches = s.clutchAttempts
        let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible())]
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EvalNavHeader(title: title) { dismiss() }
                EvalInfoBanner(count: s.count)
                evalSection("Performance") {
                    LazyVGrid(columns: grid, spacing: 12) {
                        EvalStatTile(icon: "medal", title: "Taux de victoire", value: EvalUI.percent(s.winRate), trend: s.trend(\.winRate))
                        EvalStatTile(icon: "cross", title: "Ratio É/M", value: String(format: "%.2f", s.kd), trend: s.trend(\.kd))
                        EvalStatTile(icon: "chart.bar.fill", title: "ÉAM", value: String(format: "%.2f", s.kda))
                        EvalStatTile(icon: "sparkle", title: "Total d'éliminations", value: "\(s.kills)")
                        EvalStatTile(icon: "xmark.circle.fill", title: "Total de morts", value: "\(s.deaths)")
                        EvalStatTile(icon: "person.2.fill", title: "Total d'assists", value: "\(s.assists)")
                        EvalStatTile(icon: "bolt.fill", title: "ACS", value: "\(s.acs)")
                        EvalStatTile(icon: "scope", title: "HS %", value: EvalUI.percent(s.hsPercent))
                        EvalStatTile(icon: "clock", title: "Temps de jeu total", value: EvalUI.duration(s.playSeconds))
                    }
                    .padding(14)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Statistiques de combat") {
                    LazyVGrid(columns: grid, spacing: 12) {
                        EvalStatTile(icon: "flame.fill", title: "ADR", value: String(format: "%.1f", s.adr))
                        EvalStatTile(icon: "target", title: "Moy. éliminations/manche", value: String(format: "%.2f", s.killsPerRound))
                        EvalStatTile(icon: "drop.fill", title: "Premiers sangs", value: "\(s.firstKills)")
                        EvalStatTile(icon: "xmark.circle", title: "Premières morts", value: "\(s.firstDeaths)")
                        EvalStatTile(icon: "star.fill", title: "Clutchs", value: "\(clutches.filter(\.won).count)/\(clutches.count)")
                        EvalStatTile(icon: "waveform.path.ecg", title: "Multi-kills", value: "\(s.multiKillRounds)")
                        EvalStatTile(icon: "3.circle", title: "Triples éliminations", value: "\(s.multiKills(3))")
                        EvalStatTile(icon: "4.circle", title: "Quadra kills", value: "\(s.multiKills(4))")
                        EvalStatTile(icon: "5.circle", title: "Aces", value: "\(s.multiKills(5))")
                        EvalStatTile(icon: "checkmark.shield.fill", title: "Manches parfaites", value: "\(s.flawless)")
                    }
                    .padding(14)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }
}

struct EvalPlayTimeDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let stats: EvalStatsEngine

    var body: some View {
        let s = stats
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EvalNavHeader(title: "Temps de jeu") { dismiss() }
                evalSection("Au fil du temps") {
                    Chart(s.byDay()) { day in
                        BarMark(x: .value("Jour", day.day, unit: .day), y: .value("Minutes", day.entries.reduce(0) { $0 + $1.match.lengthSec } / 60))
                            .foregroundStyle(EvalUI.accent)
                    }
                    .chartYAxis {
                        AxisMarks(position: .trailing) { value in
                            AxisGridLine().foregroundStyle(Color.white.opacity(0.1))
                            AxisValueLabel { if let m = value.as(Int.self) { Text(EvalUI.duration(m * 60)).foregroundStyle(EvalUI.secondary) } }
                        }
                    }
                    .chartXAxis {
                        AxisMarks(values: .stride(by: .day)) { _ in
                            AxisValueLabel(format: .dateTime.day().month(.abbreviated).locale(EvalUI.fr)).foregroundStyle(EvalUI.secondary)
                        }
                    }
                    .frame(height: 220)
                    .padding(16)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Global") {
                    row("Temps de jeu total", EvalUI.duration(s.playSeconds), "\(s.count) parties")
                        .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Par file d’attente") {
                    list(s.grouped { EvalProfileView.modeName($0.match.mode) }.map { ($0.key, nil as URL?, $0.stats) })
                }
                evalSection("Par agent") {
                    list(s.grouped { $0.me.agent }.map { group in
                        (group.key, group.stats.entries.first?.me.agentIconURL, group.stats)
                    })
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }

    private func list(_ items: [(String, URL?, EvalStatsEngine)]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, item in
                HStack(spacing: 14) {
                    if let url = item.1 {
                        AsyncImage(url: url) { $0.image?.resizable().scaledToFill() }
                            .frame(width: 48, height: 48).clipShape(.rect(cornerRadius: 12))
                    }
                    row(item.0, EvalUI.duration(item.2.playSeconds), "\(item.2.count) parties")
                }
                .padding(.leading, item.1 == nil ? 0 : 16)
                if i < items.count - 1 { Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18) }
            }
        }
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    private func row(_ title: String, _ value: String, _ detail: String) -> some View {
        HStack {
            Text(title).font(.system(size: 17)).foregroundStyle(.white)
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(value).font(.system(size: 17, weight: .medium)).foregroundStyle(.white)
                Text(detail).font(.system(size: 15)).foregroundStyle(EvalUI.secondary)
            }
        }
        .padding(18)
    }
}

struct EvalHitsDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let stats: EvalStatsEngine

    var body: some View {
        let s = stats
        let assets = ValorantAssets.shared
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EvalNavHeader(title: "Répartition des coups") { dismiss() }
                EvalInfoBanner(count: s.count)
                evalSection("Répartition dans le temps") {
                    VStack(alignment: .leading, spacing: 10) {
                        EvalHitsAreaChart(entries: Array(s.entries.reversed()), average: s.hsPercent).frame(height: 200)
                        HStack(spacing: 14) {
                            legend(EvalUI.loss, "Jambes"); legend(EvalUI.win, "Corps"); legend(EvalUI.head, "Tête")
                        }
                    }
                    .padding(16)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Global") {
                    VStack(spacing: 12) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Total de hits").foregroundStyle(EvalUI.secondary)
                                Text("\(s.hits)").font(.system(size: 30, weight: .bold)).foregroundStyle(.white)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("Pourcentage de headshot").foregroundStyle(EvalUI.secondary)
                                Text(EvalUI.percent(s.hsPercent)).font(.system(size: 30, weight: .bold)).foregroundStyle(.white)
                            }
                        }
                        zone(EvalUI.head, "Tête", s.headshots, s.hits)
                        zone(EvalUI.win, "Corps", s.bodyshots, s.hits)
                        zone(EvalUI.loss, "Jambes", s.legshots, s.hits)
                    }
                    .padding(18)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Par arme") {
                    VStack(spacing: 0) {
                        ForEach(s.hitsByWeapon) { w in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(assets.weapons[w.id]?.name ?? "Arme").font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                                        Text("\(w.total) coups sûrs").foregroundStyle(EvalUI.secondary)
                                    }
                                    Spacer()
                                    AsyncImage(url: assets.weapons[w.id]?.icon ?? EvalAssets.weaponIcon(w.id)) { $0.image?.resizable().scaledToFit() }
                                        .frame(width: 90, height: 36).opacity(0.6)
                                }
                                HStack(spacing: 0) {
                                    count("\(w.head)", "TÊTE"); count("\(w.body)", "CORPS"); count("\(w.legs)", "JAMBES")
                                }
                            }
                            .padding(18)
                            Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18)
                        }
                    }
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
        .task { await ValorantAssets.shared.load() }
    }

    private func legend(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 6) { Circle().fill(color).frame(width: 9, height: 9); Text(label).foregroundStyle(EvalUI.secondary) }
            .font(.system(size: 14))
    }

    private func zone(_ color: Color, _ label: String, _ value: Int, _ total: Int) -> some View {
        HStack {
            Circle().fill(color).frame(width: 9, height: 9)
            Text(label).font(.system(size: 17)).foregroundStyle(.white)
            Spacer()
            Text("\(value)").font(.system(size: 17, weight: .semibold).monospacedDigit()).foregroundStyle(.white)
            Text(EvalUI.percent(total == 0 ? 0 : Double(value) / Double(total))).font(.system(size: 16).monospacedDigit()).foregroundStyle(EvalUI.secondary)
                .frame(width: 70, alignment: .trailing)
        }
    }

    private func count(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 20, weight: .semibold).monospacedDigit()).foregroundStyle(.white)
            Text(label).font(.system(size: 12, weight: .medium)).foregroundStyle(EvalUI.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct EvalWinRateDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let stats: EvalStatsEngine

    var body: some View {
        let s = stats
        let maps = s.grouped { $0.match.map }.sorted { $0.key < $1.key }
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                EvalNavHeader(title: "Taux de victoire") { dismiss() }
                evalSection("Au fil du temps") {
                    VStack(alignment: .leading, spacing: 10) {
                        EvalWinBars(days: s.byDay()).frame(height: 200)
                        HStack(spacing: 14) {
                            dot(EvalUI.win, "Victoires"); dot(EvalUI.head, "Nuls"); dot(EvalUI.loss, "Défaites")
                        }
                    }
                    .padding(16)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                evalSection("Par carte") {
                    VStack(spacing: 14) {
                        mapBar("Toutes les cartes", s)
                        Divider().overlay(Color.white.opacity(0.08))
                        ForEach(maps) { mapBar($0.key, $0.stats) }
                    }
                    .padding(16)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }

    private func dot(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 6) { Circle().fill(color).frame(width: 9, height: 9); Text(label).foregroundStyle(EvalUI.secondary) }
            .font(.system(size: 14))
    }

    private func mapBar(_ name: String, _ s: EvalStatsEngine) -> some View {
        HStack(spacing: 10) {
            Text(name).font(.system(size: 16)).foregroundStyle(.white).frame(width: 110, alignment: .trailing).lineLimit(1)
            GeometryReader { geo in
                HStack(spacing: 0) {
                    Rectangle().fill(EvalUI.win).frame(width: geo.size.width * CGFloat(s.wins) / CGFloat(max(1, s.count)))
                    Rectangle().fill(EvalUI.head).frame(width: geo.size.width * CGFloat(s.draws) / CGFloat(max(1, s.count)))
                    Rectangle().fill(EvalUI.loss)
                }
                .overlay(alignment: .leading) {
                    Text(EvalUI.percent(s.winRate)).font(.system(size: 13, weight: .medium)).foregroundStyle(.white).padding(.leading, 8)
                }
            }
            .frame(height: 30)
            Text("\(s.count)").font(.system(size: 13).monospacedDigit()).foregroundStyle(EvalUI.secondary).frame(width: 26)
        }
    }
}

// MARK: - Récap de session

struct EvalSessionRecapSheet: View {
    @Environment(\.dismiss) private var dismiss
    let matches: [EvalMatch]
    let puuid: String

    @State private var story = false
    @State private var accent = 1
    @State private var background: UIImage?
    @State private var avatar: UIImage?
    @State private var rendered: UIImage?

    private let accents: [Color] = [Color(hex: 0xEDEBB4), Color(hex: 0xFD5B68), Color(hex: 0xE8C15A), Color(hex: 0x5AA8F0)]
    private var stats: EvalStatsEngine { EvalStatsEngine(matches: matches, puuid: puuid) }

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                Button { dismiss() } label: {
                    Circle().fill(EvalUI.tile).frame(width: 44, height: 44)
                        .overlay(Image(systemName: "xmark").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalUI.accent))
                }
                .buttonStyle(.plain)
                Spacer()
                Text("Récap de session").font(.system(size: 19, weight: .bold)).foregroundStyle(.white)
                Spacer()
                Color.clear.frame(width: 44, height: 44)
            }
            Picker("Format", selection: $story) {
                Text("Carré").tag(false)
                Text("Story").tag(true)
            }
            .pickerStyle(.segmented)
            HStack(spacing: 16) {
                ForEach(accents.indices, id: \.self) { i in
                    Circle().fill(accents[i]).frame(width: 34, height: 34)
                        .overlay(Circle().strokeBorder(.white, lineWidth: accent == i ? 3 : 0).padding(-5))
                        .onTapGesture { accent = i }
                }
            }
            ScrollView { card.padding(.horizontal, 2) }
            if let rendered {
                ShareLink(item: Image(uiImage: rendered), preview: SharePreview("Récap de session", image: Image(uiImage: rendered))) {
                    Label("Partager", systemImage: "square.and.arrow.up")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(EvalUI.accent, in: .capsule)
                }
            }
        }
        .padding(16)
        .background(Color(hex: 0x1C1C1E).ignoresSafeArea())
        .task { await loadImages(); render() }
        .onChange(of: story) { render() }
        .onChange(of: accent) { render() }
    }

    /// Les images distantes sont chargées avant le rendu : ImageRenderer n'attend pas AsyncImage.
    private func loadImages() async {
        await ValorantAssets.shared.load()
        if let map = matches.first?.map, let url = ValorantAssets.shared.splashes[map.lowercased()],
           let (data, _) = try? await URLSession.shared.data(from: url) { background = UIImage(data: data) }
        if let url = matches.first?.player(puuid)?.cardURL, let (data, _) = try? await URLSession.shared.data(from: url) {
            avatar = UIImage(data: data)
        }
    }

    @MainActor private func render() {
        let renderer = ImageRenderer(content: card.frame(width: 360).environment(\.colorScheme, .dark))
        renderer.scale = 3
        rendered = renderer.uiImage
    }

    private struct Highlight: Identifiable { let label: String; let count: Int; var id: String { label } }

    private var highlights: [Highlight] {
        var counts: [String: Int] = [:]
        for e in stats.entries {
            if e.analysis.targetSummary.kast >= 80 { counts["KAST ÉLEVÉ", default: 0] += 1 }
            for r in e.analysis.playerRounds where r.kills >= 2 { counts[r.kills >= 5 ? "ACE" : "\(r.kills)K", default: 0] += 1 }
            for c in e.analysis.clutchAttempts where c.foes >= 2 { counts["1V\(c.foes) \(c.won ? "GAGNÉ" : "PERDU")", default: 0] += 1 }
        }
        return counts.sorted { $0.value > $1.value }.prefix(story ? 6 : 3).map { Highlight(label: $0.key, count: $0.value) }
    }

    private var card: some View {
        let s = stats
        let me = matches.first?.player(puuid)
        let color = accents[accent]
        let first = s.entries.last?.date, last = s.entries.first?.date
        return VStack(alignment: .leading, spacing: 18) {
            if !story {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("RÉCAP DE SESSION").font(.system(size: 14, weight: .semibold)).tracking(1.5).foregroundStyle(.white.opacity(0.7))
                        if let first { Text(first.formatted(.dateTime.day().month(.wide).locale(EvalUI.fr))).font(.system(size: 26, weight: .bold)) }
                        if let first, let last {
                            Text("\(first.formatted(.dateTime.hour().minute().locale(EvalUI.fr))) – \(last.formatted(.dateTime.hour().minute().locale(EvalUI.fr)))")
                                .font(.system(size: 14)).foregroundStyle(.white.opacity(0.7))
                        }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(s.count) PARTIES").font(.system(size: 14, weight: .semibold)).tracking(1.2)
                        Text(Set(matches.map { EvalProfileView.modeName($0.mode) }).sorted().joined(separator: ", ").uppercased())
                            .font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.7))
                    }
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 10) {
                    Text("\(s.wins)")
                    RoundedRectangle(cornerRadius: 4).fill(.white.opacity(0.5)).frame(width: 42, height: 12)
                    Text("\(s.losses)").foregroundStyle(.white.opacity(0.8))
                }
                .font(.system(size: 76, weight: .heavy))
                Text("VICTOIRES – DÉFAITES").font(.system(size: 15, weight: .semibold)).tracking(1.5).foregroundStyle(.white.opacity(0.7))
            }
            HStack(spacing: 16) {
                Group {
                    if let avatar { Image(uiImage: avatar).resizable().scaledToFill() } else { EvalUI.tile }
                }
                .frame(width: 70, height: 70)
                .clipShape(.rect(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 0) {
                    Text(me?.name ?? "").font(.system(size: 28, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                    Text("#\(me?.tag ?? "")").font(.system(size: 28, weight: .medium)).foregroundStyle(.white.opacity(0.6))
                }
            }
            HStack(spacing: 0) {
                stat("\(s.count)", "MATCHS")
                stat("\(Int((s.winRate * 100).rounded()))%", "TAUX DE VIC…")
                stat("\(s.kills)/\(s.deaths)/\(s.assists)", "E/M/A")
                stat(String(format: "%.2f", s.kd), "E/M")
            }
            .padding(.vertical, 14)
            .background(.white.opacity(0.08), in: .rect(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(.white.opacity(0.15)))
            if story {
                VStack(alignment: .leading, spacing: 10) {
                    Text("MATCH PAR MATCH").font(.system(size: 14, weight: .semibold)).tracking(1.4).foregroundStyle(.white.opacity(0.7))
                    ForEach(Array(s.entries.reversed().enumerated()), id: \.offset) { i, e in
                        HStack {
                            Text("\(i + 1)").foregroundStyle(.white.opacity(0.5)).frame(width: 24, alignment: .leading)
                            Text(e.match.map).fontWeight(.semibold).frame(width: 100, alignment: .leading)
                            Text(EvalProfileView.modeName(e.match.mode)).foregroundStyle(.white.opacity(0.7))
                            Spacer()
                            Text(e.isDraw ? "NUL" : e.analysis.won ? "VICTOIRE" : "DÉFAITE")
                                .fontWeight(.semibold)
                                .foregroundStyle(e.analysis.won ? EvalUI.up : EvalUI.loss)
                        }
                        .font(.system(size: 15))
                    }
                }
                .padding(16)
                .background(.white.opacity(0.08), in: .rect(cornerRadius: 18))
                let agents = s.grouped { $0.me.agent }
                let maps = s.grouped { $0.match.map }.max { $0.stats.winRate < $1.stats.winRate }
                Text("MOMENTS FORTS DE LA SESSION").font(.system(size: 14, weight: .semibold)).tracking(1.4).foregroundStyle(.white.opacity(0.7))
                HStack(spacing: 12) {
                    if let top = agents.first { highlightBox("person.fill", "TOP AGENT", top.key, top.stats.count) }
                    if let best = maps { highlightBox("map.fill", "MEILLEURE CARTE", best.key, best.stats.count) }
                }
            }
            FlowLayout(spacing: 8) {
                ForEach(highlights) { h in
                    HStack(spacing: 6) {
                        Text(h.label).fontWeight(.bold)
                        if h.count > 1 { Text("×\(h.count)").foregroundStyle(.white.opacity(0.6)) }
                    }
                    .font(.system(size: 15))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(color.opacity(0.25), in: .capsule)
                    .overlay(Capsule().strokeBorder(color.opacity(0.7)))
                }
            }
        }
        .foregroundStyle(.white)
        .padding(24)
        .background {
            ZStack {
                if let background { Image(uiImage: background).resizable().scaledToFill() }
                LinearGradient(colors: [.black.opacity(0.55), .black.opacity(0.85)], startPoint: .top, endPoint: .bottom)
                color.opacity(0.08)
            }
        }
        .clipShape(.rect(cornerRadius: 26))
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Text(value).font(.system(size: 22, weight: .bold).monospacedDigit()).lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.system(size: 12, weight: .semibold)).tracking(1).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }

    private func highlightBox(_ icon: String, _ title: String, _ value: String, _ count: Int) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(title, systemImage: icon).font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.75))
            Text(value).font(.system(size: 24, weight: .bold))
            Text("\(count) \(count > 1 ? "parties" : "partie")").font(.system(size: 13)).foregroundStyle(.white.opacity(0.6))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.08), in: .rect(cornerRadius: 18))
    }
}

// MARK: - Objectifs de la saison

struct EvalSeasonGoalsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var selected: Int?
    private var store: ValorantStore { model.valorant }

    private var currentTier: Int { store.mmr.tier }
    private var choices: [Int] { Array((max(3, min(currentTier + 1, 20)))...27) }
    private var activeGoal: ValorantStore.SeasonGoal? {
        guard let goal = store.seasonGoal, goal.actID.lowercased() == store.currentAct?.id.lowercased() else { return nil }
        return goal
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                EvalNavHeader(title: "Objectifs de la saison") { dismiss() }
                if store.seasonGoal != nil && activeGoal == nil {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Acte terminé", systemImage: "calendar.badge.exclamationmark").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                        Text("Votre objectif précédent a été défini pour un acte terminé. Définissez un nouvel objectif pour l’acte actuel.")
                            .foregroundStyle(EvalUI.secondary)
                    }
                    .padding(18)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                if let goal = activeGoal { progressCard(goal) }
                picker
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }

    private var picker: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Fixer un objectif").font(.system(size: 24, weight: .bold)).foregroundStyle(.white)
            Text("Choisissez le rang que vous souhaitez atteindre avant la fin de l’acte. L’estimation se base sur l’évolution de votre RR en parties classées.")
                .foregroundStyle(EvalUI.secondary)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 4), spacing: 10) {
                ForEach(choices, id: \.self) { tier in
                    let isSelected = (selected ?? activeGoal?.tier) == tier
                    VStack(spacing: 6) {
                        AsyncImage(url: ValorantProfile.tierIcon(tier)) { $0.image?.resizable().scaledToFit() }.frame(width: 40, height: 40)
                        Text(EvalRanks.name(tier).uppercased()).font(.system(size: 11, weight: .medium)).foregroundStyle(isSelected ? Color(hex: EvalRanks.color(tier)) : EvalUI.secondary)
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity)
                    .background(EvalUI.tile, in: .rect(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color(hex: EvalRanks.color(tier)), lineWidth: isSelected ? 2 : 0))
                    .onTapGesture { selected = tier }
                }
            }
            Button {
                if let selected { store.setSeasonGoal(tier: selected) }
            } label: {
                Text("Définir un objectif")
                    .font(.system(size: 19, weight: .semibold))
                    .foregroundStyle(selected == nil ? EvalUI.secondary : .white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(selected == nil ? EvalUI.tile : EvalUI.accent, in: .capsule)
            }
            .buttonStyle(.plain)
            .disabled(selected == nil || store.currentAct == nil)
        }
        .padding(18)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }

    /// RR restant (100 RR par palier) et nombre de parties au rythme moyen de l'historique MMR.
    private func progressCard(_ goal: ValorantStore.SeasonGoal) -> some View {
        let needed = max(0, (goal.tier - currentTier) * 100 - store.mmr.rr)
        let changes = store.mmr.history.map(\.change)
        let average = changes.isEmpty ? 0 : Double(changes.reduce(0, +)) / Double(changes.count)
        let games = average > 0 ? Int(ceil(Double(needed) / average)) : nil
        let days = store.currentAct.map { max(1, Int(ceil($0.end.timeIntervalSinceNow / 86400))) }
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                AsyncImage(url: ValorantProfile.tierIcon(goal.tier)) { $0.image?.resizable().scaledToFit() }.frame(width: 48, height: 48)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Objectif : \(EvalRanks.name(goal.tier))").font(.system(size: 20, weight: .bold)).foregroundStyle(.white)
                    Text("Actuel : \(EvalRanks.name(currentTier)) · \(store.mmr.rr) RR").foregroundStyle(EvalUI.secondary)
                }
            }
            if needed == 0 {
                Label("Objectif atteint", systemImage: "checkmark.seal.fill").foregroundStyle(EvalUI.up).font(.system(size: 17, weight: .semibold))
            } else {
                Text("Encore \(needed) RR").font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                if goal.tier == 27 {
                    Text("Radiant dépend du classement de votre région : l’estimation est indicative.").font(.system(size: 13)).foregroundStyle(EvalUI.secondary)
                }
                if let games {
                    Text("≈ \(games) parties au rythme actuel (\(String(format: "%+.1f", average)) RR / partie)").foregroundStyle(EvalUI.secondary)
                    if let days { Text(days > 0 && games <= days * 6 ? "Dans les temps : \(days) jours restants." : "Rythme insuffisant pour les \(days) jours restants.").foregroundStyle(games <= (days * 6) ? EvalUI.up : EvalUI.loss) }
                } else {
                    Text("Votre RR moyen récent n’est pas positif : impossible d’estimer une date.").foregroundStyle(EvalUI.secondary)
                }
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }
}

// MARK: - Filtres du classement

struct EvalLeaderboardFilterSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var platform = "pc"
    @State private var region = "eu"
    @State private var season = ""
    private var store: ValorantStore { model.valorant }

    private let regions: [(String, String)] = [("eu", "Europe"), ("na", "North America"), ("latam", "Latin America"), ("br", "Brazil"), ("kr", "Korea"), ("ap", "Asia Pacific")]

    var body: some View {
        NavigationStack {
            List {
                Section("Plateforme") {
                    option("PC", icon: "desktopcomputer", selected: platform == "pc") { platform = "pc" }
                    option("Console", icon: "gamecontroller.fill", selected: platform == "console") { platform = "console" }
                }
                Section("Région") {
                    ForEach(regions, id: \.0) { code, name in option(name, selected: region == code) { region = code } }
                }
                Section("Saison") {
                    ForEach(store.acts.values.filter { $0.start < Date() }.sorted { $0.start > $1.start }) { act in
                        Button { season = act.isCurrent ? "" : act.id } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(act.name).foregroundStyle(.white)
                                    if act.isCurrent { Text("Actuel").font(.footnote).foregroundStyle(EvalUI.secondary) }
                                }
                                Spacer()
                                if (season.isEmpty && act.isCurrent) || season.lowercased() == act.id.lowercased() {
                                    Image(systemName: "checkmark").foregroundStyle(EvalUI.accent)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Filtres du classement")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button { platform = "pc"; region = "eu"; season = "" } label: { Image(systemName: "arrow.counterclockwise") }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        store.leaderboardPlatform = platform
                        store.leaderboardSeason = season
                        Task { await store.loadLeaderboard(region: region) }
                        dismiss()
                    } label: { Image(systemName: "checkmark") }
                    .tint(EvalUI.accent)
                }
            }
        }
        .onAppear { platform = store.leaderboardPlatform; region = store.leaderboardRegion; season = store.leaderboardSeason }
    }

    private func option(_ title: String, icon: String? = nil, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                if let icon { Image(systemName: icon).foregroundStyle(EvalUI.accent).frame(width: 30) }
                Text(title).foregroundStyle(.white)
                Spacer()
                if selected { Image(systemName: "checkmark").foregroundStyle(EvalUI.accent) }
            }
        }
    }
}

// MARK: - Skins

struct EvalWeaponSkinsView: View {
    @Environment(\.dismiss) private var dismiss
    let weapon: ValorantWeaponItem
    @State private var query = ""

    private var skins: [ValorantWeaponItem.WeaponSkin] {
        weapon.skins
            .filter { $0.image != nil && !$0.displayName.lowercased().contains("standard") }
            .filter { query.isEmpty || $0.displayName.localizedCaseInsensitiveContains(query) }
            .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                EvalNavHeader(title: "Skins") { dismiss() }
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                    TextField("Recherche", text: $query)
                }
                .foregroundStyle(EvalUI.secondary)
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(EvalUI.card, in: .capsule)
                LazyVStack(spacing: 0) {
                    ForEach(skins) { skin in
                        NavigationLink { EvalSkinDetailView(skin: skin) } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                AsyncImage(url: skin.image.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }
                                    .frame(height: 70).frame(maxWidth: .infinity)
                                HStack {
                                    Text(skin.displayName).font(.system(size: 19)).foregroundStyle(.white)
                                    Spacer()
                                    Image(systemName: "chevron.right").foregroundStyle(EvalUI.secondary)
                                }
                            }
                            .padding(18)
                        }
                        .buttonStyle(.plain)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18)
                    }
                }
                .background(EvalUI.card, in: .rect(cornerRadius: 22))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }
}

struct EvalSkinDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let skin: ValorantWeaponItem.WeaponSkin
    @State private var chroma = 0
    @State private var video: URL?

    private var chromas: [ValorantWeaponItem.WeaponSkin.Chroma] { skin.chromas ?? [] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                EvalNavHeader(title: skin.displayName, trailing: wishButton) { dismiss() }
                Text("Variantes de couleur").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalUI.secondary).padding(.leading, 4)
                VStack(spacing: 14) {
                    let current = chromas.indices.contains(chroma) ? chromas[chroma] : nil
                    AsyncImage(url: (current?.fullRender ?? current?.displayIcon ?? skin.image).flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }
                        .frame(height: 130)
                    if chromas.count > 1 {
                        HStack(spacing: 12) {
                            ForEach(chromas.indices, id: \.self) { i in
                                AsyncImage(url: chromas[i].swatch.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFill() }
                                    .frame(width: 34, height: 34)
                                    .clipShape(Circle())
                                    .overlay(Circle().strokeBorder(.white, lineWidth: chroma == i ? 2 : 0))
                                    .onTapGesture { chroma = i }
                            }
                        }
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity)
                .background(EvalUI.card, in: .rect(cornerRadius: 22))
                if let levels = skin.levels, !levels.isEmpty {
                    Text("Niveaux de skin").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalUI.secondary).padding(.leading, 4)
                    VStack(spacing: 0) {
                        ForEach(Array(levels.enumerated()), id: \.offset) { i, level in
                            HStack {
                                Text("Niveau \(i + 1)").font(.system(size: 18)).foregroundStyle(.white)
                                Spacer()
                                if let item = level.levelItem { Text(Self.levelLabel(item)).foregroundStyle(EvalUI.secondary).lineLimit(1) }
                                if let url = level.streamedVideo.flatMap(URL.init(string:)) {
                                    Button { video = url } label: {
                                        Image(systemName: "play.circle").font(.system(size: 22)).foregroundStyle(EvalUI.accent)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(18)
                            if i < levels.count - 1 { Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18) }
                        }
                    }
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
        .sheet(item: Binding(get: { video.map(IdentifiedURL.init) }, set: { video = $0?.url })) { item in
            VideoPlayer(player: AVPlayer(url: item.url)).ignoresSafeArea()
        }
    }

    private struct IdentifiedURL: Identifiable { let url: URL; var id: String { url.absoluteString } }

    /// La boutique Riot identifie un skin par l'UUID de son premier niveau.
    private var wishButton: AnyView? {
        guard let levelID = skin.levels?.first?.uuid else { return nil }
        let store = model.valorant
        let wished = store.isWished(levelID)
        return AnyView(Button { store.toggleWish(id: levelID, name: skin.displayName, icon: skin.image ?? "") } label: {
            Circle().fill(EvalUI.card).frame(width: 44, height: 44)
                .overlay(Image(systemName: wished ? "heart.fill" : "heart").font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalUI.accent))
        }
        .buttonStyle(.plain))
    }

    static func levelLabel(_ item: String) -> String {
        switch item.components(separatedBy: "::").last ?? item {
        case "SoundEffects": return "Effets sonores"
        case "Animation": return "Animation"
        case "VFX": return "Effets visuels"
        case "InspectAndKill": return "Effets d'inspection & de tuerie"
        case "Finisher": return "Effet de fin"
        case "KillBanner": return "Bannière d'élimination"
        case "KillCounter": return "Compteur d'éliminations"
        case "TopFrag": return "Aura du champion"
        case "Voiceover": return "Voix"
        case "Transformation": return "Transformation"
        case "AttackerDefenderSwap": return "Changement de camp"
        case "HeartbeatAndMapSensor": return "Capteur"
        case "FishAnimation": return "Animation"
        default: return item.components(separatedBy: "::").last ?? item
        }
    }
}

// MARK: - Réglages

struct EvalStorageView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var refresh = 0
    @State private var confirmClear = false

    var body: some View {
        let _ = refresh
        let matches = DiskCache.size(prefix: "valorant-eval.")
        let catalogs = DiskCache.size(prefix: "valorant-api.")
        let personal = DiskCache.size(prefix: "valorant-personal-cache.")
        let total = matches.bytes + catalogs.bytes + personal.bytes
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                EvalNavHeader(title: "Stockage et données") { dismiss() }
                EvalSettingsHero(icon: "externaldrive", title: "Stockage et données",
                                 text: "Gérez les ressources du jeu, les données de match et les informations utilisateur. Libérez de l’espace lorsque nécessaire.")
                VStack(spacing: 0) {
                    NavigationLink { EvalResourcesView() } label: { EvalSettingsRow(icon: "cube", title: "Gérer les ressources") }.buttonStyle(.plain)
                }
                .background(EvalUI.card, in: .rect(cornerRadius: 22))
                evalSection("Aperçu") {
                    VStack(spacing: 0) {
                        EvalSettingsRow(icon: "internaldrive", title: "Espace total utilisé", value: ByteCountFormatter.string(fromByteCount: total, countStyle: .file), chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "person.crop.circle", title: "Matchs", value: ByteCountFormatter.string(fromByteCount: matches.bytes, countStyle: .file), chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "photo.on.rectangle", title: "Catalogues du jeu", value: ByteCountFormatter.string(fromByteCount: catalogs.bytes, countStyle: .file), chevron: false)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        EvalSettingsRow(icon: "bookmark", title: "Données personnelles", value: ByteCountFormatter.string(fromByteCount: personal.bytes, countStyle: .file), chevron: false)
                    }
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                Button { confirmClear = true } label: {
                    Label("Supprimer les données de cet appareil", systemImage: "trash")
                        .font(.system(size: 18))
                        .foregroundStyle(EvalUI.accent)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(18)
                        .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
                .buttonStyle(.plain)
                Text("Efface les matchs et catalogues gardés sur l’iPhone. Ils seront rechargés depuis Supabase, sans nouvel appel à HenrikDev pour les matchs déjà enregistrés.")
                    .font(.system(size: 14)).foregroundStyle(EvalUI.secondary).padding(.horizontal, 4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
        .confirmationDialog("Supprimer les données locales ?", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("Supprimer", role: .destructive) {
                for prefix in ["valorant-eval.", "valorant-api.", "valorant-personal-cache."] { DiskCache.remove(prefix: prefix) }
                model.valorant.syncAccountData()
                refresh += 1
            }
        }
    }
}

struct EvalResourcesView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var version = ""
    @State private var buildDate = ""
    @State private var failed = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                EvalNavHeader(title: "Ressources") { dismiss() }
                EvalSettingsHero(icon: "cube", title: "Gestion des éléments du jeu",
                                 text: "Les portraits d’agents, images d’armes et données des cartes viennent de valorant-api.com. Après une mise à jour de VALORANT, certaines ressources peuvent mettre quelques heures à apparaître.")
                VStack(spacing: 0) {
                    HStack {
                        Text("Statut").font(.system(size: 18)).foregroundStyle(.white)
                        Spacer()
                        if version.isEmpty && !failed { ProgressView() } else {
                            Image(systemName: failed ? "xmark.circle.fill" : "checkmark.circle.fill").font(.system(size: 22)).foregroundStyle(failed ? EvalUI.loss : EvalUI.up)
                        }
                    }
                    .padding(18)
                    Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18)
                    EvalSettingsRow(title: "Version", value: version.isEmpty ? "—" : version, chevron: false)
                    Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18)
                    EvalSettingsRow(title: "Publiée le", value: buildDate.isEmpty ? "—" : buildDate, chevron: false)
                    Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 18)
                    EvalSettingsRow(title: "Langue", value: "fr-FR", chevron: false)
                }
                .background(EvalUI.card, in: .rect(cornerRadius: 22))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
        .task {
            struct Response: Decodable { struct Data: Decodable { let riotClientVersion: String?; let version: String?; let buildDate: String? }; let data: Data }
            guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/version")!),
                  let response = try? JSONDecoder().decode(Response.self, from: data) else { failed = true; return }
            version = response.data.version ?? response.data.riotClientVersion ?? ""
            buildDate = response.data.buildDate.flatMap(ISODate.parse)?.formatted(.dateTime.day().month().year().locale(EvalUI.fr)) ?? ""
        }
    }
}

struct EvalAdvancedSettingsView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                EvalNavHeader(title: "Paramètres avancés") { dismiss() }
                EvalSettingsHero(icon: "slider.horizontal.3", title: "Paramètres avancés",
                                 text: "Personnalisez le comportement de l’interface et la synchronisation des données.")
                evalSection("Catégories") {
                    VStack(spacing: 0) {
                        NavigationLink { EvalInterfaceSettingsView() } label: { EvalSettingsRow(icon: "rectangle.on.rectangle", title: "Paramètres de l'interface") }.buttonStyle(.plain)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        NavigationLink { EvalWebLoginDataView() } label: { EvalSettingsRow(icon: "person.badge.key", title: "Paramètres de connexion") }.buttonStyle(.plain)
                        Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 56)
                        NavigationLink { EvalStorageView() } label: { EvalSettingsRow(icon: "gearshape.2", title: "Paramètres systèmes") }.buttonStyle(.plain)
                    }
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }
}

struct EvalInterfaceSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    /// Lu par l'écran Profil : synchronise les matchs à l'ouverture.
    @AppStorage("eval.autoSyncMatches") private var autoSync = true
    @AppStorage("eval.hapticFeedback") private var haptics = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                EvalNavHeader(title: "Interface") { dismiss() }
                EvalSettingsHero(icon: "rectangle.on.rectangle", title: "Interface",
                                 text: "Contrôlez la manière dont l’application réagit à vos interactions et charge le contenu.")
                toggle("arrow.down.circle", "Téléchargement automatique des matchs", $autoSync,
                       "Synchronise vos dernières parties à l’ouverture du profil. Désactivez pour ne synchroniser qu’en tirant pour rafraîchir.")
                toggle("iphone.radiowaves.left.and.right", "Retour haptique", $haptics,
                       "Vibration légère lors du changement d’onglet.")
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar, .tabBar)
    }

    private func toggle(_ icon: String, _ title: String, _ value: Binding<Bool>, _ footer: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(isOn: value) {
                HStack(spacing: 14) {
                    Image(systemName: icon).font(.system(size: 20)).foregroundStyle(EvalUI.accent).frame(width: 28)
                    Text(title).font(.system(size: 18)).foregroundStyle(.white)
                }
            }
            .tint(EvalUI.accent)
            .padding(18)
            .background(EvalUI.card, in: .rect(cornerRadius: 22))
            Text(footer).font(.system(size: 14)).foregroundStyle(EvalUI.secondary).padding(.horizontal, 4).padding(.bottom, 8)
        }
    }
}

struct EvalSettingsHero: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon).font(.system(size: 36)).foregroundStyle(EvalUI.accent)
            Text(title).font(.system(size: 24, weight: .bold)).foregroundStyle(.white)
            Text(text).font(.system(size: 17)).foregroundStyle(EvalUI.secondary)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EvalUI.card, in: .rect(cornerRadius: 22))
    }
}

struct EvalSettingsRow: View {
    var icon: String? = nil
    let title: String
    var value: String? = nil
    var chevron = true

    var body: some View {
        HStack(spacing: 14) {
            if let icon { Image(systemName: icon).font(.system(size: 20)).foregroundStyle(EvalUI.accent).frame(width: 28) }
            Text(title).font(.system(size: 18)).foregroundStyle(.white)
            Spacer()
            if let value { Text(value).font(.system(size: 17)).foregroundStyle(EvalUI.secondary) }
            if chevron { Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(EvalUI.secondary) }
        }
        .padding(18)
        .contentShape(.rect)
    }
}
