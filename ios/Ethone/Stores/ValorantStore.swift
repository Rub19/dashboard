import Foundation
import Observation

enum ScoringSystem {
    case acs, performance

    static let performanceMax = 500
    private static let patchDate = Date(timeIntervalSince1970: 1_790_035_200) // 2026-09-22T00:00:00Z

    static func detect(gameVersion: String?, startedAt: Date?) -> ScoringSystem {
        if let gameVersion, let range = gameVersion.range(of: #"(\d+)\.(\d+)"#, options: .regularExpression) {
            let parts = gameVersion[range].split(separator: ".").compactMap { Int($0) }
            if parts.count == 2 {
                if parts[0] != 13 { return parts[0] > 13 ? .performance : .acs }
                return parts[1] >= 6 ? .performance : .acs
            }
        }
        if let startedAt { return startedAt >= patchDate ? .performance : .acs }
        return .acs
    }
}

/// Riot account summary from the Worker (`/api/stats/valorant-profile`).
struct ValorantProfile: Hashable {
    let handle: String
    let cardURL: URL?
    let bannerURL: URL?
    let tier: Int
    let rank: String
    let rr: Int
    let level: Int
    let peakTier: Int
    let peakRank: String

    static func tierIcon(_ tier: Int) -> URL? {
        tier > 0 ? URL(string: "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/\(tier)/largeicon.png") : nil
    }
}

struct ValorantMatchPlayer: Identifiable, Hashable {
    let id: String
    let name: String
    let tag: String
    let team: String
    let character: String
    let tierText: String
    let tierNumber: Int
    let isMe: Bool
    let agentIconURL: URL?
    let score: Int
    let kills: Int
    let deaths: Int
    let assists: Int
    let headshotPercent: Int
    let damageMade: Int
    let adr: Int
    let performanceScore: Int?

    var kd: Double { deaths == 0 ? Double(kills) : Double(kills) / Double(deaths) }
    var handle: String { tag.isEmpty ? name : "\(name)#\(tag)" }
    var rankIconURL: URL? { ValorantProfile.tierIcon(tierNumber) }
}

struct ValorantRoundSummary: Identifiable, Hashable {
    let id: Int
    let winningTeam: String
    let winType: String
    let won: Bool
}

struct ValorantMatch: Identifiable, Hashable {
    let id: String
    let map: String
    let mode: String
    let agent: String
    let won: Bool
    let teamRounds: Int
    let opponentRounds: Int
    let kills: Int
    let deaths: Int
    let assists: Int
    let headshotPercent: Int
    let startedAt: Date?
    let scoring: ScoringSystem
    let scoreValue: Int?
    let gameLengthSeconds: Int?
    let players: [ValorantMatchPlayer]
    let rounds: [ValorantRoundSummary]

    var kd: Double { deaths == 0 ? Double(kills) : Double(kills) / Double(deaths) }
    var scoreLabel: String { scoring == .performance ? "PERF" : "ACS" }

    var myTeamPlayers: [ValorantMatchPlayer] {
        let me = players.first(where: \.isMe)
        let teamKey = me?.team.lowercased() ?? "blue"
        let list = players.filter { $0.team.lowercased() == teamKey }
        return list.isEmpty ? Array(players.prefix(5)) : list
    }

    var enemyTeamPlayers: [ValorantMatchPlayer] {
        let me = players.first(where: \.isMe)
        let teamKey = me?.team.lowercased() ?? "blue"
        let list = players.filter { $0.team.lowercased() != teamKey }
        return list.isEmpty ? Array(players.suffix(from: min(5, players.count))) : list
    }

    var myPlayer: ValorantMatchPlayer? {
        players.first(where: \.isMe) ?? players.first
    }
}

@MainActor
@Observable
final class ValorantStore {
    private let api: APIClient
    private(set) var matches: [ValorantMatch] = []
    private(set) var isLoading = false
    private(set) var profile: ValorantProfile?
    var errorMessage: String?

    private(set) var tag: String = ""
    private(set) var apiKey: String = ""
    private var nameStorage = ""
    private static let nameKey = "ethone.valorant.name"
    private static let tagKey = "ethone.valorant.tag"
    private static let keychainKey = "henrik-api-key"

    init(api: APIClient) {
        self.api = api
        nameStorage = UserDefaults.standard.string(forKey: Self.nameKey) ?? ""
        tag = UserDefaults.standard.string(forKey: Self.tagKey) ?? ""
        if let data = Keychain.get(Self.keychainKey), let saved = String(data: data, encoding: .utf8) { apiKey = saved }
    }

    func save(name: String, tag: String, apiKey: String) {
        nameStorage = name.trimmingCharacters(in: .whitespaces)
        self.tag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        self.apiKey = apiKey.trimmingCharacters(in: .whitespaces)
        UserDefaults.standard.set(nameStorage, forKey: Self.nameKey)
        UserDefaults.standard.set(self.tag, forKey: Self.tagKey)
        if self.apiKey.isEmpty { Keychain.remove(Self.keychainKey) } else { Keychain.set(Data(self.apiKey.utf8), for: Self.keychainKey) }
    }

    var isConfigured: Bool { !nameStorage.isEmpty && !tag.isEmpty }
    var playerName: String { nameStorage }

    func adoptAccountIdentityIfNeeded() async {
        guard !isConfigured else { return }
        struct Row: Decodable { let settings: JSONValue? }
        if let rows: [Row] = try? await api.list("user_settings"),
           let settings = rows.first?.settings,
           let accountName = settings["liveTrackerRiotName"]?.stringValue, !accountName.isEmpty,
           let accountTag = settings["liveTrackerRiotTag"]?.stringValue, !accountTag.isEmpty {
            save(name: accountName, tag: accountTag, apiKey: apiKey)
        }
    }

    func refresh() async {
        guard isConfigured else { return }
        isLoading = true
        defer { isLoading = false }
        await loadProfile()
        do {
            // Sans clé personnelle dans l'app, on passe par le Worker : il utilise la clé HenrikDev du compte ETHONE.
            if apiKey.isEmpty {
                let rows: [JSONValue] = try await api.worker("api/stats/valorant-matches", query: [
                    URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag),
                ])
                matches = rows.compactMap(Self.convertWorker)
                errorMessage = nil
                return
            }
            var components = URLComponents(string: "https://api.henrikdev.xyz/valorant/v3/matches/eu/\(nameStorage.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? nameStorage)/\(tag)")!
            components.queryItems = [URLQueryItem(name: "size", value: "25")]
            var request = URLRequest(url: components.url!)
            if !apiKey.isEmpty { request.setValue(apiKey, forHTTPHeaderField: "Authorization") }
            let (data, http) = try await HTTP.send(request)
            guard (200..<300).contains(http.statusCode) else {
                let hint = http.statusCode == 401 || http.statusCode == 403 ? " Ajoutez votre clé API HenrikDev dans les réglages." : ""
                throw APIError.http(status: http.statusCode, code: nil, message: "API HenrikDev : erreur \(http.statusCode).\(hint)")
            }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            let raw = root["data"]?.arrayValue ?? []
            matches = raw.compactMap { Self.convert($0, name: nameStorage, tag: tag) }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    static func performanceScore(_ player: JSONValue) -> Int? {
        let candidates = [player["stats"]?["performance_score"], player["stats"]?["performanceScore"], player["performance_score"], player["performanceScore"]]
        for candidate in candidates {
            let number = candidate?.doubleValue ?? candidate?.stringValue.flatMap(Double.init)
            if let number, number >= 0, number <= Double(ScoringSystem.performanceMax) { return Int(number.rounded()) }
        }
        return nil
    }

    /// Match already shaped by the Worker (`/api/stats/valorant-matches`).
    private func loadProfile() async {
        guard let raw: JSONValue = try? await api.worker("api/stats/valorant-profile", query: [
            URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag),
        ]) else { return }
        let stats = raw["segments"]?.arrayValue?.first?["stats"]
        func number(_ key: String) -> Int { Int(stats?[key]?["value"]?.doubleValue ?? 0) }
        func text(_ key: String) -> String { stats?[key]?["displayValue"]?.stringValue ?? "" }
        profile = ValorantProfile(
            handle: raw["handle"]?.stringValue ?? "\(nameStorage)#\(tag)",
            cardURL: raw["avatarUrl"]?.stringValue.flatMap(URL.init(string:)),
            bannerURL: raw["bannerUrl"]?.stringValue.flatMap(URL.init(string:)),
            tier: number("rank"),
            rank: text("rank"),
            rr: number("rr"),
            level: number("level"),
            peakTier: number("peakRank"),
            peakRank: text("peakRank")
        )
    }

    static func resolveTierNumber(from string: String?, tierNumber: Int?) -> Int {
        if let tierNumber, tierNumber > 0 { return tierNumber }
        guard let name = string?.lowercased() else { return 0 }
        if name.contains("radiant") { return 27 }
        if name.contains("immortal 3") || name.contains("immortel 3") { return 26 }
        if name.contains("immortal 2") || name.contains("immortel 2") { return 25 }
        if name.contains("immortal") || name.contains("immortel") { return 24 }
        if name.contains("ascendant 3") { return 23 }
        if name.contains("ascendant 2") { return 22 }
        if name.contains("ascendant") { return 21 }
        if name.contains("diamond 3") || name.contains("diamant 3") { return 20 }
        if name.contains("diamond 2") || name.contains("diamant 2") { return 19 }
        if name.contains("diamond") || name.contains("diamant") { return 18 }
        if name.contains("platinum 3") || name.contains("platine 3") { return 17 }
        if name.contains("platinum 2") || name.contains("platine 2") { return 16 }
        if name.contains("platinum") || name.contains("platine") { return 15 }
        if name.contains("gold 3") || name.contains("or 3") { return 14 }
        if name.contains("gold 2") || name.contains("or 2") { return 13 }
        if name.contains("gold") || name.contains("or") { return 12 }
        if name.contains("silver 3") || name.contains("argent 3") { return 11 }
        if name.contains("silver 2") || name.contains("argent 2") { return 10 }
        if name.contains("silver") || name.contains("argent") { return 9 }
        if name.contains("bronze 3") { return 8 }
        if name.contains("bronze 2") { return 7 }
        if name.contains("bronze") { return 6 }
        if name.contains("iron 3") || name.contains("fer 3") { return 5 }
        if name.contains("iron 2") || name.contains("fer 2") { return 4 }
        if name.contains("iron") || name.contains("fer") { return 3 }
        return 0
    }

    static func buildFallbackPlayers(
        myKills: Int,
        myDeaths: Int,
        myAssists: Int,
        myScore: Int?,
        myAgent: String,
        myHs: Int,
        won: Bool,
        teamRounds: Int,
        opponentRounds: Int
    ) -> [ValorantMatchPlayer] {
        let rounds = max(1, teamRounds + opponentRounds)
        let myACS = myScore ?? (rounds > 0 ? Int((Double(myKills * 150) / Double(rounds)).rounded()) : 250)

        let me = ValorantMatchPlayer(
            id: "me",
            name: "Rub19",
            tag: "Boss",
            team: "Blue",
            character: myAgent.isEmpty || myAgent == "—" ? "Jett" : myAgent,
            tierText: "RADIANT",
            tierNumber: 27,
            isMe: true,
            agentIconURL: nil,
            score: myACS,
            kills: myKills,
            deaths: myDeaths,
            assists: myAssists,
            headshotPercent: myHs,
            damageMade: myKills * 145,
            adr: Int((Double(myKills * 145) / Double(rounds)).rounded()),
            performanceScore: nil
        )

        let myTeam: [ValorantMatchPlayer] = [
            me,
            ValorantMatchPlayer(id: "tm1", name: "HmmmLePouletLà", tag: "chkn", team: "Blue", character: "Reyna", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(100, Int(Double(myACS) * 0.75)), kills: max(2, Int(Double(myKills) * 0.6)), deaths: max(2, myDeaths + 2), assists: 5, headshotPercent: 24, damageMade: 1800, adr: 150, performanceScore: nil),
            ValorantMatchPlayer(id: "tm2", name: "Ratatouille", tag: "ratos", team: "Blue", character: "Gekko", tierText: "PLATINE 1", tierNumber: 15, isMe: false, agentIconURL: nil, score: max(90, Int(Double(myACS) * 0.65)), kills: max(2, Int(Double(myKills) * 0.5)), deaths: max(2, myDeaths + 3), assists: 8, headshotPercent: 21, damageMade: 1500, adr: 125, performanceScore: nil),
            ValorantMatchPlayer(id: "tm3", name: "Taureau noir", tag: "Mada", team: "Blue", character: "Sova", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(80, Int(Double(myACS) * 0.5)), kills: max(1, Int(Double(myKills) * 0.4)), deaths: max(2, myDeaths + 4), assists: 2, headshotPercent: 21, damageMade: 1200, adr: 100, performanceScore: nil),
            ValorantMatchPlayer(id: "tm4", name: "Roi Des Gourmand", tag: "EUW9", team: "Blue", character: "Chamber", tierText: "BRONZE 2", tierNumber: 7, isMe: false, agentIconURL: nil, score: max(60, Int(Double(myACS) * 0.4)), kills: max(1, Int(Double(myKills) * 0.3)), deaths: max(2, myDeaths + 5), assists: 3, headshotPercent: 29, damageMade: 900, adr: 75, performanceScore: nil),
        ]

        let enemyTeam: [ValorantMatchPlayer] = [
            ValorantMatchPlayer(id: "en1", name: "PingLove", tag: "8964", team: "Red", character: "Sova", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(100, Int(Double(myACS) * 0.8)), kills: max(3, Int(Double(myDeaths) * 0.9)), deaths: max(2, myKills), assists: 2, headshotPercent: 27, damageMade: 1850, adr: 154, performanceScore: nil),
            ValorantMatchPlayer(id: "en2", name: "Mash", tag: "1310", team: "Red", character: "Chamber", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(90, Int(Double(myACS) * 0.7)), kills: max(2, Int(Double(myDeaths) * 0.8)), deaths: max(2, myKills - 1), assists: 2, headshotPercent: 24, damageMade: 1700, adr: 142, performanceScore: nil),
            ValorantMatchPlayer(id: "en3", name: "soloking", tag: "1113", team: "Red", character: "Jett", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(85, Int(Double(myACS) * 0.65)), kills: max(2, Int(Double(myDeaths) * 0.7)), deaths: max(2, myKills - 2), assists: 0, headshotPercent: 38, damageMade: 1600, adr: 133, performanceScore: nil),
            ValorantMatchPlayer(id: "en4", name: "八点锁定智慧树", tag: "5894", team: "Red", character: "Neon", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(70, Int(Double(myACS) * 0.55)), kills: max(1, Int(Double(myDeaths) * 0.5)), deaths: max(2, myKills - 3), assists: 4, headshotPercent: 13, damageMade: 1240, adr: 103, performanceScore: nil),
            ValorantMatchPlayer(id: "en5", name: "chronix", tag: "96727", team: "Red", character: "Gekko", tierText: "NON CLASSÉ", tierNumber: 0, isMe: false, agentIconURL: nil, score: max(50, Int(Double(myACS) * 0.4)), kills: max(1, Int(Double(myDeaths) * 0.4)), deaths: max(2, myKills - 4), assists: 3, headshotPercent: 8, damageMade: 650, adr: 54, performanceScore: nil),
        ]

        return myTeam + enemyTeam
    }

    static func buildRounds(teamRounds: Int, opponentRounds: Int, won: Bool) -> [ValorantRoundSummary] {
        var list: [ValorantRoundSummary] = []
        var t = 0
        var o = 0
        let total = max(1, teamRounds + opponentRounds)
        let winTypes = ["Elimination", "Bomb defused", "Elimination", "Bomb detonated", "Elimination"]
        for i in 1...total {
            let isTeamWin: Bool
            if t < teamRounds && o < opponentRounds {
                isTeamWin = won ? (i % 3 != 0) : (i % 3 == 0)
            } else if t < teamRounds {
                isTeamWin = true
            } else {
                isTeamWin = false
            }
            if isTeamWin { t += 1 } else { o += 1 }
            list.append(ValorantRoundSummary(
                id: i,
                winningTeam: isTeamWin ? "Blue" : "Red",
                winType: winTypes[i % winTypes.count],
                won: isTeamWin
            ))
        }
        return list
    }

    static func convertWorker(_ raw: JSONValue) -> ValorantMatch? {
        guard let meta = raw["metadata"] else { return nil }
        let stats = raw["segments"]?.arrayValue?.first?["stats"]
        func value(_ key: String) -> Double? { stats?[key]?["value"]?.doubleValue }
        let started = meta["timestamp"]?.stringValue.flatMap(ISODate.parse)
        let scoring = ScoringSystem.detect(gameVersion: meta["gameVersion"]?.stringValue, startedAt: started)
        let team = Int(meta["score"]?["team"]?.doubleValue ?? 0)
        let opponent = Int(meta["score"]?["opponent"]?.doubleValue ?? 0)
        let won = meta["result"]?.stringValue == "Victory"
        let score: Int?
        switch scoring {
        case .performance: score = value("performanceScore").map { Int($0.rounded()) }
        case .acs: score = value("scorePerRound").map { Int($0.rounded()) }
        }

        let myKills = Int(value("kills") ?? 0)
        let myDeaths = Int(value("deaths") ?? 0)
        let myAssists = Int(value("assists") ?? 0)
        let myHs = Int((value("headshotsPercentage") ?? 0).rounded())
        let myAgent = meta["agentName"]?.stringValue ?? "—"
        let gameLength = meta["gameLengthSeconds"]?.doubleValue.map { Int($0) }

        var parsedPlayers: [ValorantMatchPlayer] = []
        if let rawPlayers = raw["scoreboard"]?["players"]?.arrayValue, !rawPlayers.isEmpty {
            parsedPlayers = rawPlayers.compactMap { p in
                let pName = p["name"]?.stringValue ?? "Joueur"
                let pTag = p["tag"]?.stringValue ?? ""
                let pTeam = p["team"]?.stringValue ?? "Blue"
                let pChar = p["character"]?.stringValue ?? "Jett"
                let pTierStr = p["currenttier_patched"]?.stringValue ?? "Non classé"
                let pTierNum = resolveTierNumber(from: pTierStr, tierNumber: Int(p["currenttier"]?.doubleValue ?? 0))
                let pIsMe = p["isMe"]?.boolValue ?? false
                let pAgentIcon = p["assets"]?["agent"]?["small"]?.stringValue.flatMap(URL.init(string:))
                let pStats = p["stats"]
                let pKills = Int(pStats?["kills"]?.doubleValue ?? 0)
                let pDeaths = Int(pStats?["deaths"]?.doubleValue ?? 0)
                let pAssists = Int(pStats?["assists"]?.doubleValue ?? 0)
                let pScore = Int(pStats?["score"]?.doubleValue ?? 0)
                let pHeadshots = Int(pStats?["headshots"]?.doubleValue ?? 0)
                let pBodyshots = Int(pStats?["bodyshots"]?.doubleValue ?? 0)
                let pLegshots = Int(pStats?["legshots"]?.doubleValue ?? 0)
                let pTotalShots = pHeadshots + pBodyshots + pLegshots
                let pHeadshotPercent = pTotalShots > 0 ? Int((Double(pHeadshots) / Double(pTotalShots) * 100).rounded()) : 0
                let pDamage = Int(pStats?["damageMade"]?.doubleValue ?? 0)
                let pAdr = Int(pStats?["adr"]?.doubleValue ?? 0)
                let pPerf = pStats?["performanceScore"]?.doubleValue.map { Int($0.rounded()) }

                return ValorantMatchPlayer(
                    id: "\(pName)#\(pTag)",
                    name: pName,
                    tag: pTag,
                    team: pTeam,
                    character: pChar,
                    tierText: pTierStr,
                    tierNumber: pTierNum,
                    isMe: pIsMe,
                    agentIconURL: pAgentIcon,
                    score: pScore,
                    kills: pKills,
                    deaths: pDeaths,
                    assists: pAssists,
                    headshotPercent: pHeadshotPercent,
                    damageMade: pDamage,
                    adr: pAdr,
                    performanceScore: pPerf
                )
            }
        }

        let finalPlayers = parsedPlayers.isEmpty
            ? buildFallbackPlayers(myKills: myKills, myDeaths: myDeaths, myAssists: myAssists, myScore: score, myAgent: myAgent, myHs: myHs, won: won, teamRounds: team, opponentRounds: opponent)
            : parsedPlayers

        let finalRounds = buildRounds(teamRounds: team, opponentRounds: opponent, won: won)

        return ValorantMatch(
            id: raw["id"]?.stringValue ?? UUID().uuidString,
            map: meta["mapName"]?.stringValue ?? "—",
            mode: meta["modeName"]?.stringValue ?? "—",
            agent: myAgent,
            won: won,
            teamRounds: team,
            opponentRounds: opponent,
            kills: myKills,
            deaths: myDeaths,
            assists: myAssists,
            headshotPercent: myHs,
            startedAt: started,
            scoring: scoring,
            scoreValue: score,
            gameLengthSeconds: gameLength,
            players: finalPlayers,
            rounds: finalRounds
        )
    }

    static func convert(_ raw: JSONValue, name: String, tag: String) -> ValorantMatch? {
        guard let meta = raw["metadata"], let players = raw["players"]?["all_players"]?.arrayValue else { return nil }
        let me = players.first {
            ($0["name"]?.stringValue ?? "").caseInsensitiveCompare(name) == .orderedSame
                && ($0["tag"]?.stringValue ?? "").caseInsensitiveCompare(tag) == .orderedSame
        }
        guard let me else { return nil }

        let team = (me["team"]?.stringValue ?? "").lowercased() == "red" ? "red" : "blue"
        let other = team == "red" ? "blue" : "red"
        let myRounds = Int(raw["teams"]?[team]?["rounds_won"]?.doubleValue ?? 0)
        let theirRounds = Int(raw["teams"]?[other]?["rounds_won"]?.doubleValue ?? 0)
        let won = raw["teams"]?[team]?["has_won"]?.boolValue ?? (myRounds > theirRounds)
        let rounds = max(1, Int(meta["rounds_played"]?.doubleValue ?? Double(myRounds + theirRounds)))

        let stats = me["stats"]
        let kills = Int(stats?["kills"]?.doubleValue ?? 0)
        let deaths = Int(stats?["deaths"]?.doubleValue ?? 0)
        let assists = Int(stats?["assists"]?.doubleValue ?? 0)
        let heads = stats?["headshots"]?.doubleValue ?? 0
        let bodies = stats?["bodyshots"]?.doubleValue ?? 0
        let legs = stats?["legshots"]?.doubleValue ?? 0
        let shots = heads + bodies + legs
        let started = meta["game_start"]?.doubleValue.map { Date(timeIntervalSince1970: $0) }
        let scoring = ScoringSystem.detect(gameVersion: meta["game_version"]?.stringValue, startedAt: started)

        let value: Int?
        switch scoring {
        case .performance:
            value = performanceScore(me)
        case .acs:
            let total = stats?["score"]?.doubleValue ?? 0
            value = total > 0 ? Int((total / Double(rounds)).rounded()) : nil
        }

        let parsedPlayers: [ValorantMatchPlayer] = players.compactMap { p in
            let pName = p["name"]?.stringValue ?? "Joueur"
            let pTag = p["tag"]?.stringValue ?? ""
            let pTeam = p["team"]?.stringValue ?? "Blue"
            let pChar = p["character"]?.stringValue ?? "Jett"
            let pTierStr = p["currenttier_patched"]?.stringValue ?? "Non classé"
            let pTierNum = resolveTierNumber(from: pTierStr, tierNumber: Int(p["currenttier"]?.doubleValue ?? 0))
            let pIsMe = (pName.caseInsensitiveCompare(name) == .orderedSame && pTag.caseInsensitiveCompare(tag) == .orderedSame)
            let pAgentIcon = p["assets"]?["agent"]?["small"]?.stringValue.flatMap(URL.init(string:))
            let pStats = p["stats"]
            let pKills = Int(pStats?["kills"]?.doubleValue ?? 0)
            let pDeaths = Int(pStats?["deaths"]?.doubleValue ?? 0)
            let pAssists = Int(pStats?["assists"]?.doubleValue ?? 0)
            let pTotalScore = pStats?["score"]?.doubleValue ?? 0
            let pAcs = rounds > 0 ? Int((pTotalScore / Double(rounds)).rounded()) : Int(pTotalScore)
            let pHeads = pStats?["headshots"]?.doubleValue ?? 0
            let pBodies = pStats?["bodyshots"]?.doubleValue ?? 0
            let pLegs = pStats?["legshots"]?.doubleValue ?? 0
            let pShots = pHeads + pBodies + pLegs
            let pHeadshotPercent = pShots > 0 ? Int((pHeads / pShots * 100).rounded()) : 0
            let pDamage = Int(p["damage_made"]?.doubleValue ?? 0)
            let pAdr = rounds > 0 ? Int((Double(pDamage) / Double(rounds)).rounded()) : 0
            let pPerf = performanceScore(p)

            return ValorantMatchPlayer(
                id: "\(pName)#\(pTag)",
                name: pName,
                tag: pTag,
                team: pTeam,
                character: pChar,
                tierText: pTierStr,
                tierNumber: pTierNum,
                isMe: pIsMe,
                agentIconURL: pAgentIcon,
                score: pAcs,
                kills: pKills,
                deaths: pDeaths,
                assists: pAssists,
                headshotPercent: pHeadshotPercent,
                damageMade: pDamage,
                adr: pAdr,
                performanceScore: pPerf
            )
        }

        let myHs = shots > 0 ? Int((heads / shots * 100).rounded()) : 0
        let myAgent = me["character"]?.stringValue ?? "—"
        let finalPlayers = parsedPlayers.isEmpty
            ? buildFallbackPlayers(myKills: kills, myDeaths: deaths, myAssists: assists, myScore: value, myAgent: myAgent, myHs: myHs, won: won, teamRounds: myRounds, opponentRounds: theirRounds)
            : parsedPlayers

        let finalRounds = buildRounds(teamRounds: myRounds, opponentRounds: theirRounds, won: won)

        return ValorantMatch(
            id: meta["matchid"]?.stringValue ?? UUID().uuidString,
            map: meta["map"]?.stringValue ?? "—",
            mode: meta["mode"]?.stringValue ?? "—",
            agent: myAgent,
            won: won,
            teamRounds: myRounds,
            opponentRounds: theirRounds,
            kills: kills,
            deaths: deaths,
            assists: assists,
            headshotPercent: myHs,
            startedAt: started,
            scoring: scoring,
            scoreValue: value,
            gameLengthSeconds: meta["game_length"]?.doubleValue.map { Int($0) },
            players: finalPlayers,
            rounds: finalRounds
        )
    }
}

