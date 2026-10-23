import Foundation

enum RiotMatches {
    struct Catalog: Codable {
        let fetchedAt: Date
        let agents: [String: String]
        let maps: [String: [String]]
    }

    static func catalog() async -> Catalog? {
        let key = "valorant-api.match-catalog.en"
        if let cached = DiskCache.read(Catalog.self, key: key), Date().timeIntervalSince(cached.fetchedAt) < 86400 { return cached }
        struct Page<T: Decodable>: Decodable { let data: [T] }
        struct Agent: Decodable { let uuid: String; let displayName: String }
        struct GameMap: Decodable { let uuid: String; let displayName: String; let mapUrl: String? }
        guard let (agentData, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true")!),
              let agents = try? JSONDecoder().decode(Page<Agent>.self, from: agentData),
              let (mapData, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/maps")!),
              let maps = try? JSONDecoder().decode(Page<GameMap>.self, from: mapData) else { return nil }
        let catalog = Catalog(
            fetchedAt: Date(),
            agents: Dictionary(agents.data.map { ($0.uuid.lowercased(), $0.displayName) }, uniquingKeysWith: { a, _ in a }),
            maps: Dictionary(maps.data.compactMap { m in m.mapUrl.map { ($0.lowercased(), [m.displayName, m.uuid.lowercased()]) } }, uniquingKeysWith: { a, _ in a })
        )
        DiskCache.write(catalog, key: key)
        return catalog
    }

    static func history(_ session: RiotSession, puuid: String, count: Int) async throws -> [String] {
        struct Entry: Decodable { let MatchID: String }
        struct History: Decodable { let History: [Entry]? }
        let result: History = try await session.game("/match-history/v1/history/\(puuid)?startIndex=0&endIndex=\(min(20, max(1, count)))")
        return (result.History ?? []).map { $0.MatchID.lowercased() }
    }

    static func match(_ session: RiotSession, id: String, catalog: Catalog) async throws -> EvalMatch {
        let raw: Raw = try await session.game("/match-details/v1/matches/\(id)")
        return convert(raw, catalog: catalog)
    }

    private struct Raw: Decodable {
        struct Info: Decodable {
            let matchId: String
            let mapId: String?
            let gamePodId: String?
            let gameLengthMillis: Int?
            let gameStartMillis: Int?
            let queueID: String?
            let seasonId: String?
            let gameVersion: String?
        }
        struct Stats: Decodable { let score: Int?; let kills: Int?; let deaths: Int?; let assists: Int? }
        struct Player: Decodable {
            let subject: String
            let gameName: String?
            let tagLine: String?
            let teamId: String?
            let partyId: String?
            let characterId: String?
            let stats: Stats?
            let competitiveTier: Int?
            let playerCard: String?
            let playerTitle: String?
            let accountLevel: Int?
        }
        struct Team: Decodable { let teamId: String; let won: Bool?; let roundsWon: Int? }
        struct Finishing: Decodable { let damageItem: String? }
        struct Kill: Decodable {
            let round: Int?
            let roundTime: Int?
            let killer: String?
            let victim: String?
            let assistants: [String]?
            let finishingDamage: Finishing?
        }
        struct Damage: Decodable { let receiver: String?; let damage: Int?; let legshots: Int?; let bodyshots: Int?; let headshots: Int? }
        struct Economy: Decodable { let loadoutValue: Int?; let weapon: String?; let armor: String?; let remaining: Int?; let spent: Int? }
        struct RoundPlayer: Decodable {
            let subject: String
            let kills: [Kill]?
            let damage: [Damage]?
            let score: Int?
            let economy: Economy?
            let wasAfk: Bool?
        }
        struct Round: Decodable {
            let roundNum: Int?
            let roundResult: String?
            let winningTeam: String?
            let bombPlanter: String?
            let bombDefuser: String?
            let plantSite: String?
            let playerStats: [RoundPlayer]?
        }
        let matchInfo: Info
        let players: [Player]?
        let teams: [Team]?
        let roundResults: [Round]?
        let kills: [Kill]?
    }

    private static func modeName(_ queue: String) -> String {
        switch queue.lowercased() {
        case "competitive": "Competitive"
        case "unrated": "Unrated"
        case "swiftplay": "Swiftplay"
        case "deathmatch": "Deathmatch"
        case "hurm": "Team Deathmatch"
        case "spikerush": "Spike Rush"
        case "premier": "Premier"
        case "ggteam": "Escalation"
        case "onefa": "Replication"
        case "snowball": "Snowball Fight"
        case "newmap": "New Map"
        default: queue.capitalized
        }
    }

    private static func convert(_ raw: Raw, catalog: Catalog) -> EvalMatch {
        let rounds = raw.roundResults ?? []
        var given: [String: (dmg: Int, hs: Int, bs: Int, ls: Int)] = [:]
        var received: [String: Int] = [:]
        var economy: [String: (spent: Int, loadout: Int)] = [:]
        for round in rounds {
            for stat in round.playerStats ?? [] {
                for hit in stat.damage ?? [] {
                    var g = given[stat.subject] ?? (0, 0, 0, 0)
                    g.dmg += hit.damage ?? 0
                    g.hs += hit.headshots ?? 0
                    g.bs += hit.bodyshots ?? 0
                    g.ls += hit.legshots ?? 0
                    given[stat.subject] = g
                    if let receiver = hit.receiver { received[receiver, default: 0] += hit.damage ?? 0 }
                }
                var e = economy[stat.subject] ?? (0, 0)
                e.spent += stat.economy?.spent ?? 0
                e.loadout += stat.economy?.loadoutValue ?? 0
                economy[stat.subject] = e
            }
        }
        let players = (raw.players ?? []).map { p -> EvalMatch.Player in
            let g = given[p.subject] ?? (0, 0, 0, 0)
            let agentID = (p.characterId ?? "").lowercased()
            return EvalMatch.Player(
                puuid: p.subject, name: p.gameName ?? "", tag: p.tagLine ?? "", team: p.teamId ?? "",
                agent: catalog.agents[agentID] ?? "", agentId: agentID, tier: p.competitiveTier ?? 0,
                card: (p.playerCard ?? "").lowercased(), title: (p.playerTitle ?? "").lowercased(), level: p.accountLevel ?? 0,
                party: p.partyId ?? "", score: p.stats?.score ?? 0, kills: p.stats?.kills ?? 0, deaths: p.stats?.deaths ?? 0,
                assists: p.stats?.assists ?? 0, hs: g.hs, bs: g.bs, ls: g.ls, dmg: g.dmg, dmgIn: received[p.subject] ?? 0,
                spent: economy[p.subject]?.spent ?? 0, loadout: economy[p.subject]?.loadout ?? 0
            )
        }
        let roundList = rounds.enumerated().map { index, round -> EvalMatch.Round in
            EvalMatch.Round(
                n: (round.roundNum ?? index) + 1, winner: round.winningTeam ?? "", end: round.roundResult ?? "",
                plant: round.bombPlanter ?? "", site: round.plantSite ?? "", defuse: round.bombDefuser ?? "",
                stats: (round.playerStats ?? []).map { s in
                    let hits = s.damage ?? []
                    return EvalMatch.RoundStat(
                        p: s.subject, score: s.score ?? 0, kills: s.kills?.count ?? 0,
                        dmg: hits.reduce(0) { $0 + ($1.damage ?? 0) }, hs: hits.reduce(0) { $0 + ($1.headshots ?? 0) },
                        bs: hits.reduce(0) { $0 + ($1.bodyshots ?? 0) }, ls: hits.reduce(0) { $0 + ($1.legshots ?? 0) },
                        loadout: s.economy?.loadoutValue ?? 0, spent: s.economy?.spent ?? 0, bank: s.economy?.remaining ?? 0,
                        weapon: (s.economy?.weapon ?? "").lowercased(), armor: (s.economy?.armor ?? "").lowercased(), afk: s.wasAfk ?? false
                    )
                }
            )
        }
        let allKills = raw.kills ?? rounds.flatMap { r in (r.playerStats ?? []).flatMap { $0.kills ?? [] } }
        let kills = allKills.map { k in
            EvalMatch.Kill(r: (k.round ?? 0) + 1, t: k.roundTime ?? 0, k: k.killer ?? "", v: k.victim ?? "",
                           w: (k.finishingDamage?.damageItem ?? "").lowercased(), a: k.assistants ?? [])
        }
        .sorted { ($0.r, $0.t) < ($1.r, $1.t) }
        let teams = raw.teams ?? []
        func team(_ id: String) -> EvalMatch.Team {
            let t = teams.first { $0.teamId == id }
            return EvalMatch.Team(won: t?.won ?? false, rounds: t?.roundsWon ?? 0)
        }
        let info = raw.matchInfo
        let map = catalog.maps[(info.mapId ?? "").lowercased()] ?? []
        let queue = info.queueID ?? ""
        return EvalMatch(
            v: 1, id: info.matchId.lowercased(), map: map.first ?? "", mapId: map.count > 1 ? map[1] : "",
            mode: modeName(queue), queue: queue, season: (info.seasonId ?? "").lowercased(), version: info.gameVersion ?? "",
            cluster: info.gamePodId.map { RiotPartyModel.podName($0) },
            startedAt: info.gameStartMillis.map { Date(timeIntervalSince1970: TimeInterval($0) / 1000) },
            lengthSec: (info.gameLengthMillis ?? 0) / 1000,
            teams: EvalMatch.Teams(Red: team("Red"), Blue: team("Blue")),
            players: players, rounds: roundList, kills: kills
        )
    }
}
