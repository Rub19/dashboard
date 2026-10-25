import Foundation

// Match compacté par le Worker (worker/src/services/valorant-eval.js, `v: 1`) et stocké
// dans la table Supabase ethone_valorant_matches. Toutes les stats des onglets du détail
// de match sont calculées ici à partir des événements réels (kills, manches, économie).

struct EvalMatch: Codable, Identifiable, Hashable {
    struct Team: Codable, Hashable { let won: Bool; let rounds: Int }
    struct Teams: Codable, Hashable { let Red: Team; let Blue: Team }

    struct Player: Codable, Identifiable, Hashable {
        let puuid: String
        let name: String
        let tag: String
        let team: String
        let agent: String
        let agentId: String
        let tier: Int
        let card: String
        let title: String
        let level: Int
        let party: String
        let score: Int
        let kills: Int
        let deaths: Int
        let assists: Int
        let hs: Int
        let bs: Int
        let ls: Int
        let dmg: Int
        let dmgIn: Int
        let spent: Int
        let loadout: Int

        var id: String { puuid }
        var handle: String { tag.isEmpty ? name : "\(name)#\(tag)" }
        var agentIconURL: URL? {
            agentId.isEmpty ? nil : URL(string: "https://media.valorant-api.com/agents/\(agentId)/displayicon.png")
        }
        var cardURL: URL? {
            card.isEmpty ? nil : URL(string: "https://media.valorant-api.com/playercards/\(card)/smallart.png")
        }
        var headshotPercent: Int {
            let shots = hs + bs + ls
            return shots == 0 ? 0 : Int((Double(hs) / Double(shots) * 100).rounded())
        }
    }

    struct RoundStat: Codable, Hashable {
        let p: String
        let score: Int
        let kills: Int
        let dmg: Int
        let hs: Int
        let bs: Int
        let ls: Int
        let loadout: Int
        let spent: Int
        let bank: Int
        let weapon: String
        let armor: String
        let afk: Bool
    }

    struct Round: Codable, Hashable, Identifiable {
        let n: Int
        let winner: String
        let end: String
        let plant: String
        let site: String
        let defuse: String
        let stats: [RoundStat]
        var id: Int { n }
    }

    struct Pos: Codable, Hashable { let x: Double; let y: Double }

    struct Kill: Codable, Hashable {
        let r: Int
        let t: Int
        let k: String
        let v: String
        let w: String
        let a: [String]
        var vp: Pos? = nil
        var kp: Pos? = nil
    }

    let v: Int
    let id: String
    let map: String
    let mapId: String
    let mode: String
    let queue: String
    let season: String
    let version: String
    /// Serveur (« Paris »…), absent des matchs stockés avant son ajout.
    let cluster: String?
    let startedAt: Date?
    let lengthSec: Int
    let teams: Teams
    let players: [Player]
    let rounds: [Round]
    let kills: [Kill]

    static func == (lhs: EvalMatch, rhs: EvalMatch) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    func player(_ puuid: String) -> Player? { players.first { $0.puuid == puuid } }
    func team(_ name: String) -> Team {
        let stored = name == "Red" ? teams.Red : teams.Blue
        guard rounds.count > 1, rounds.allSatisfy({ $0.winner == "Red" || $0.winner == "Blue" }) else { return stored }
        return Team(won: stored.won, rounds: rounds.filter { $0.winner == name }.count)
    }
    func opponent(of team: String) -> String { team == "Red" ? "Blue" : "Red" }
    var roundCount: Int { max(1, rounds.count) }

    /// Rouge attaque la 1re mi-temps ; en prolongation les camps alternent à chaque manche.
    var halfLength: Int { mode.lowercased().contains("swift") ? 4 : 12 }
    func isAttacking(team: String, round n: Int) -> Bool {
        let regulation = halfLength * 2
        let redAttacks: Bool
        if n <= halfLength { redAttacks = true }
        else if n <= regulation { redAttacks = false }
        else { redAttacks = (n - regulation) % 2 == 1 }
        return (team == "Red") == redAttacks
    }

    func isPistol(round n: Int) -> Bool { n == 1 || n == halfLength + 1 }
}

// MARK: - Analyse

struct EvalPlayerRound: Identifiable, Hashable {
    let n: Int
    let won: Bool
    let attacking: Bool
    let kills: Int
    let deaths: Int
    let assists: Int
    let score: Int
    let damage: Int
    let loadout: Int
    let spent: Int
    let bank: Int
    let weapon: String
    let victims: [String]
    var id: Int { n }
}

struct EvalHalf: Hashable {
    var won = 0
    var played = 0
    var kills = 0
    var deaths = 0
    var assists = 0
    var plants = 0
    var defuses = 0
    var firstKills = 0
    var firstDeaths = 0
}

struct EvalDuel: Hashable {
    let ally: String
    let enemy: String
    let won: Int
    let lost: Int
    var total: Int { won + lost }
}

struct EvalPlayerSummary: Hashable {
    let acs: Int
    let adr: Int
    let hsPercent: Int
    let kast: Int
    let kd: Double
    let fkPerRound: Double
    let firstKills: Int
    let firstDeaths: Int
    let plants: Int
    let defuses: Int
}

/// Calculs d'un match pour un joueur ciblé. Pure valeur : recalculée à la volée.
struct EvalMatchAnalysis {
    let match: EvalMatch
    let target: EvalMatch.Player
    private let killsByRound: [Int: [EvalMatch.Kill]]

    init?(match: EvalMatch, targetPUUID: String) {
        guard let target = match.player(targetPUUID) ?? match.players.first else { return nil }
        self.match = match
        self.target = target
        killsByRound = Dictionary(grouping: match.kills, by: \.r).mapValues { $0.sorted { $0.t < $1.t } }
    }

    var allies: [EvalMatch.Player] { match.players.filter { $0.team == target.team } }
    var enemies: [EvalMatch.Player] { match.players.filter { $0.team != target.team } }
    var lobby: [EvalMatch.Player] { match.players.filter { $0.puuid != target.puuid } }
    var won: Bool { match.team(target.team).won }
    var teamRounds: Int { match.team(target.team).rounds }
    var opponentRounds: Int { match.team(match.opponent(of: target.team)).rounds }

    func roundWon(_ round: EvalMatch.Round, for team: String) -> Bool { round.winner == team }

    // MARK: Résumé par joueur

    func summary(for puuid: String) -> EvalPlayerSummary {
        guard let p = match.player(puuid) else {
            return EvalPlayerSummary(acs: 0, adr: 0, hsPercent: 0, kast: 0, kd: 0, fkPerRound: 0, firstKills: 0, firstDeaths: 0, plants: 0, defuses: 0)
        }
        let rounds = Double(match.roundCount)
        var fk = 0, fd = 0
        for kills in killsByRound.values {
            guard let first = kills.first else { continue }
            if first.k == puuid { fk += 1 }
            if first.v == puuid { fd += 1 }
        }
        return EvalPlayerSummary(
            acs: Int((Double(p.score) / rounds).rounded()),
            adr: Int((Double(p.dmg) / rounds).rounded()),
            hsPercent: p.headshotPercent,
            kast: kast(for: puuid),
            kd: p.deaths == 0 ? Double(p.kills) : Double(p.kills) / Double(p.deaths),
            fkPerRound: Double(fk) / rounds,
            firstKills: fk,
            firstDeaths: fd,
            plants: match.rounds.filter { $0.plant == puuid }.count,
            defuses: match.rounds.filter { $0.defuse == puuid }.count
        )
    }

    var targetSummary: EvalPlayerSummary { summary(for: target.puuid) }

    /// Moyenne des 9 autres joueurs pour la ligne « vs moyenne du lobby ».
    var lobbySummary: EvalPlayerSummary {
        let all = lobby.map { summary(for: $0.puuid) }
        let n = Double(max(1, all.count))
        func avg(_ f: (EvalPlayerSummary) -> Double) -> Double { all.map(f).reduce(0, +) / n }
        return EvalPlayerSummary(
            acs: Int(avg { Double($0.acs) }.rounded()),
            adr: Int(avg { Double($0.adr) }.rounded()),
            hsPercent: Int(avg { Double($0.hsPercent) }.rounded()),
            kast: Int(avg { Double($0.kast) }.rounded()),
            kd: avg(\.kd),
            fkPerRound: avg(\.fkPerRound),
            firstKills: 0, firstDeaths: 0, plants: 0, defuses: 0
        )
    }

    /// KAST : manches avec kill, assist, survie ou mort échangée (vengée en moins de 5 s).
    func kast(for puuid: String) -> Int {
        guard let me = match.player(puuid) else { return 0 }
        var good = 0
        for round in match.rounds {
            let kills = killsByRound[round.n] ?? []
            if kills.contains(where: { $0.k == puuid || $0.a.contains(puuid) }) { good += 1; continue }
            guard let death = kills.first(where: { $0.v == puuid }) else { good += 1; continue }
            let traded = kills.contains { k in
                k.v == death.k && k.t >= death.t && k.t - death.t <= 5000 && match.player(k.k)?.team == me.team
            }
            if traded { good += 1 }
        }
        return Int((Double(good) / Double(match.roundCount) * 100).rounded())
    }

    // MARK: Manches du joueur ciblé

    var playerRounds: [EvalPlayerRound] {
        match.rounds.map { round in
            let kills = killsByRound[round.n] ?? []
            let stat = round.stats.first { $0.p == target.puuid }
            return EvalPlayerRound(
                n: round.n,
                won: round.winner == target.team,
                attacking: match.isAttacking(team: target.team, round: round.n),
                kills: kills.filter { $0.k == target.puuid }.count,
                deaths: kills.filter { $0.v == target.puuid }.count,
                assists: kills.filter { $0.a.contains(target.puuid) }.count,
                score: stat?.score ?? 0,
                damage: stat?.dmg ?? 0,
                loadout: stat?.loadout ?? 0,
                spent: stat?.spent ?? 0,
                bank: stat?.bank ?? 0,
                weapon: stat?.weapon ?? "",
                victims: kills.filter { $0.k == target.puuid }.compactMap { match.player($0.v)?.agentId }
            )
        }
    }

    /// Score moyen par manche de tout le lobby (ligne pointillée du graphe ACS).
    var lobbyAverageRoundScore: Int {
        let scores = match.rounds.flatMap { $0.stats.filter { $0.p != target.puuid }.map(\.score) }
        return scores.isEmpty ? 0 : scores.reduce(0, +) / scores.count
    }

    func halves() -> (attack: EvalHalf, defense: EvalHalf) {
        var atk = EvalHalf(), def = EvalHalf()
        for round in match.rounds {
            let attacking = match.isAttacking(team: target.team, round: round.n)
            var half = attacking ? atk : def
            let kills = killsByRound[round.n] ?? []
            half.played += 1
            if round.winner == target.team { half.won += 1 }
            half.kills += kills.filter { $0.k == target.puuid }.count
            half.deaths += kills.filter { $0.v == target.puuid }.count
            half.assists += kills.filter { $0.a.contains(target.puuid) }.count
            if round.plant == target.puuid { half.plants += 1 }
            if round.defuse == target.puuid { half.defuses += 1 }
            if kills.first?.k == target.puuid { half.firstKills += 1 }
            if kills.first?.v == target.puuid { half.firstDeaths += 1 }
            if attacking { atk = half } else { def = half }
        }
        return (atk, def)
    }

    // MARK: Moments forts

    var highlights: [String] {
        var multi: [Int: Int] = [:]
        for round in playerRounds where round.kills >= 2 { multi[min(round.kills, 5), default: 0] += 1 }
        var out: [String] = multi.keys.sorted().map { k in
            let label = k == 5 ? "ACE" : "\(k)K"
            return multi[k]! > 1 ? "\(label) ×\(multi[k]!)" : label
        }
        for clutch in clutches { out.append("1V\(clutch) CLUTCH") }
        if targetSummary.kast >= 80 { out.append("KAST ÉLEVÉ") }
        return out
    }

    /// Manches gagnées où le joueur ciblé est resté seul en vie contre N ennemis.
    var clutches: [Int] { clutchAttempts.filter(\.won).map(\.foes) }

    /// Toutes les situations 1vX (X ≥ 1) du joueur ciblé, gagnées ou non.
    var clutchAttempts: [(foes: Int, won: Bool)] {
        match.rounds.compactMap { round in
            var alive = Set(match.players.map(\.puuid))
            for kill in killsByRound[round.n] ?? [] {
                alive.remove(kill.v)
                let mates = allies.filter { alive.contains($0.puuid) }
                if mates.count == 1, mates.first?.puuid == target.puuid {
                    let foes = enemies.filter { alive.contains($0.puuid) }.count
                    return foes >= 1 ? (foes, round.winner == target.team) : nil
                }
            }
            return nil
        }
    }

    /// Manches gagnées sans aucune mort dans l'équipe du joueur ciblé.
    var flawlessRounds: Int {
        let mates = Set(allies.map(\.puuid))
        return match.rounds.filter { round in
            round.winner == target.team && !(killsByRound[round.n] ?? []).contains { mates.contains($0.v) }
        }.count
    }

    // MARK: Kills par manche (onglet Manches)

    func roundKillers(_ round: EvalMatch.Round) -> (ally: [EvalMatch.Player], enemy: [EvalMatch.Player]) {
        let kills = killsByRound[round.n] ?? []
        let killers = kills.compactMap { match.player($0.k) }
        return (killers.filter { $0.team == target.team }, killers.filter { $0.team != target.team })
    }

    // MARK: Duels

    func duel(_ ally: String, _ enemy: String) -> EvalDuel {
        EvalDuel(
            ally: ally, enemy: enemy,
            won: match.kills.filter { $0.k == ally && $0.v == enemy }.count,
            lost: match.kills.filter { $0.k == enemy && $0.v == ally }.count
        )
    }

    var targetDuels: [EvalDuel] { enemies.map { duel(target.puuid, $0.puuid) } }

    var mainRival: EvalDuel? {
        targetDuels.filter { $0.total > 0 }.max { ($0.total, $0.won) < ($1.total, $1.won) }
    }

    /// Adversaire avec l'échange le plus équilibré (au moins un kill de chaque côté).
    var mostTraded: EvalDuel? {
        targetDuels.filter { $0.won > 0 && $0.lost > 0 }.max { (min($0.won, $0.lost), $0.total) < (min($1.won, $1.lost), $1.total) }
    }

    var duelTotals: (total: Int, firstBloods: Int, winRate: Int) {
        let won = targetDuels.reduce(0) { $0 + $1.won }
        let lost = targetDuels.reduce(0) { $0 + $1.lost }
        let total = won + lost
        return (total, targetSummary.firstKills, total == 0 ? 0 : Int((Double(won) / Double(total) * 100).rounded()))
    }

    // MARK: Économie

    struct Economy {
        let avgSpent: Int
        let avgLoadout: Int
        let damagePer1k: Int
        let bankAtDeath: Int
    }

    func economy(for puuid: String) -> Economy {
        let stats = match.rounds.compactMap { r in r.stats.first { $0.p == puuid } }
        let n = max(1, stats.count)
        let spent = stats.reduce(0) { $0 + $1.spent }
        let damage = stats.reduce(0) { $0 + $1.dmg }
        let deathRounds = Set(match.kills.filter { $0.v == puuid }.map(\.r))
        let bank = match.rounds.filter { deathRounds.contains($0.n) }
            .compactMap { r in r.stats.first { $0.p == puuid }?.bank }
            .reduce(0, +)
        return Economy(
            avgSpent: spent / n,
            avgLoadout: stats.reduce(0) { $0 + $1.loadout } / n,
            damagePer1k: spent == 0 ? 0 : Int((Double(damage) / (Double(spent) / 1000)).rounded()),
            bankAtDeath: bank
        )
    }

    var lobbyEconomy: Economy {
        let all = lobby.map { economy(for: $0.puuid) }
        let n = max(1, all.count)
        return Economy(
            avgSpent: all.reduce(0) { $0 + $1.avgSpent } / n,
            avgLoadout: all.reduce(0) { $0 + $1.avgLoadout } / n,
            damagePer1k: all.reduce(0) { $0 + $1.damagePer1k } / n,
            bankAtDeath: all.reduce(0) { $0 + $1.bankAtDeath } / n
        )
    }

    /// Valeur d'équipement totale de chaque équipe à chaque manche.
    struct TeamLoadout: Identifiable { let n: Int; let ally: Int; let enemy: Int; var id: Int { n } }

    var teamLoadouts: [TeamLoadout] {
        let teamOf = Dictionary(match.players.map { ($0.puuid, $0.team) }, uniquingKeysWith: { a, _ in a })
        return match.rounds.map { round in
            let ally = round.stats.filter { teamOf[$0.p] == target.team }.reduce(0) { $0 + $1.loadout }
            let enemy = round.stats.filter { teamOf[$0.p] != nil && teamOf[$0.p] != target.team }.reduce(0) { $0 + $1.loadout }
            return TeamLoadout(n: round.n, ally: ally, enemy: enemy)
        }
    }

    var damageTotals: (dealt: Int, received: Int, net: Int, per1k: Int) {
        let rounds = match.roundCount
        let dealt = target.dmg / rounds
        let received = target.dmgIn / rounds
        return (dealt, received, dealt - received, economy(for: target.puuid).damagePer1k)
    }
}

// MARK: - Données statiques du jeu

enum EvalRanks {
    /// Noms français des paliers compétitifs (index = numéro de palier Riot).
    static let names: [Int: String] = [
        0: "Non classé", 3: "Fer 1", 4: "Fer 2", 5: "Fer 3", 6: "Bronze 1", 7: "Bronze 2", 8: "Bronze 3",
        9: "Argent 1", 10: "Argent 2", 11: "Argent 3", 12: "Or 1", 13: "Or 2", 14: "Or 3",
        15: "Platine 1", 16: "Platine 2", 17: "Platine 3", 18: "Diamant 1", 19: "Diamant 2", 20: "Diamant 3",
        21: "Ascendant 1", 22: "Ascendant 2", 23: "Ascendant 3", 24: "Immortel 1", 25: "Immortel 2",
        26: "Immortel 3", 27: "Radiant"
    ]

    static func name(_ tier: Int) -> String { names[tier] ?? "Non classé" }

    static func color(_ tier: Int) -> UInt32 {
        switch tier {
        case 27: return 0xF3E9A6
        case 24...26: return 0xFD5B68
        case 21...23: return 0x2DD4A0
        case 18...20: return 0xC084FC
        case 15...17: return 0x3FC1C9
        case 12...14: return 0xE8C15A
        case 9...11: return 0xC7C7CF
        case 6...8: return 0xC08457
        default: return 0x8E8E93
        }
    }
}

enum EvalAssets {
    static func weaponIcon(_ uuid: String) -> URL? {
        uuid.isEmpty ? nil : URL(string: "https://media.valorant-api.com/weapons/\(uuid)/killstreamicon.png")
    }

    static func agentIcon(_ uuid: String) -> URL? {
        uuid.isEmpty ? nil : URL(string: "https://media.valorant-api.com/agents/\(uuid)/displayicon.png")
    }
}

extension EvalMatch {
    /// Résumé utilisé par les listes de matchs existantes.
    func summary(for puuid: String) -> ValorantMatch? {
        guard let me = player(puuid) else { return nil }
        let opponent = opponent(of: me.team)
        let mapped = players.map { p in
            ValorantMatchPlayer(
                id: p.puuid, name: p.name, tag: p.tag, team: p.team, character: p.agent,
                tierText: EvalRanks.name(p.tier), tierNumber: p.tier, isMe: p.puuid == puuid,
                agentIconURL: p.agentIconURL, score: p.score / roundCount,
                kills: p.kills, deaths: p.deaths, assists: p.assists,
                headshotPercent: p.headshotPercent, damageMade: p.dmg, adr: p.dmg / roundCount,
                performanceScore: nil, partyId: p.party.isEmpty ? nil : p.party,
                kast: 0, firstKills: 0, firstDeaths: 0, afkRounds: 0,
                plants: rounds.filter { $0.plant == p.puuid }.count, tags: []
            )
        }
        return ValorantMatch(
            id: id, map: map, mode: mode, agent: me.agent, won: team(me.team).won,
            teamRounds: team(me.team).rounds, opponentRounds: team(opponent).rounds,
            kills: me.kills, deaths: me.deaths, assists: me.assists,
            headshotPercent: me.headshotPercent, startedAt: startedAt, scoring: .acs,
            scoreValue: me.score / roundCount, gameLengthSeconds: lengthSec,
            players: mapped,
            rounds: rounds.map { ValorantRoundSummary(id: $0.n, winningTeam: $0.winner, winType: $0.end, won: $0.winner == me.team) }
        )
    }
}

// MARK: - Rang / saisons (HenrikDev v3 mmr compacté par le Worker)

struct EvalMMR: Codable, Hashable {
    struct Season: Codable, Hashable, Identifiable {
        let season: String
        let short: String
        let wins: Int
        let games: Int
        let endTier: Int
        let endRR: Int
        let leaderboardRank: Int
        var id: String { season }
        var winRate: Double { games == 0 ? 0 : Double(wins) / Double(games) }
    }

    var tier = 0
    var rr = 0
    var lastChange = 0
    var leaderboardRank = 0
    var peakTier = 0
    var peakSeason = ""
    var seasons: [Season] = []
    var history: [HistoryPoint] = []

    struct HistoryPoint: Codable, Hashable, Identifiable {
        let tier: Int
        let rr: Int
        let change: Int
        let elo: Int
        let at: String
        let map: String
        let match: String
        var id: String { match.isEmpty ? at : match }
        var date: Date? { ISODate.parse(at) }
    }

    init() {}

    // Le Worker renvoie `{}` tant que le rang n'a jamais été synchronisé.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        tier = try c.decodeIfPresent(Int.self, forKey: .tier) ?? 0
        rr = try c.decodeIfPresent(Int.self, forKey: .rr) ?? 0
        lastChange = try c.decodeIfPresent(Int.self, forKey: .lastChange) ?? 0
        leaderboardRank = try c.decodeIfPresent(Int.self, forKey: .leaderboardRank) ?? 0
        peakTier = try c.decodeIfPresent(Int.self, forKey: .peakTier) ?? 0
        peakSeason = try c.decodeIfPresent(String.self, forKey: .peakSeason) ?? ""
        seasons = try c.decodeIfPresent([Season].self, forKey: .seasons) ?? []
        history = (try? c.decodeIfPresent([HistoryPoint].self, forKey: .history)) ?? []
    }
}

/// Actes du jeu (valorant-api.com /v1/seasons) : nom « V26 — ACTE VI » et dates.
struct EvalAct: Hashable, Identifiable {
    let id: String
    let name: String
    let start: Date
    let end: Date
    var isCurrent: Bool { (start...end).contains(Date()) }
}
