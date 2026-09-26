import Foundation
import Observation

/// Système de notation d'une partie. Depuis le patch 13.06 (22/09/2026) l'ACS est remplacé par le score de performance
/// (0 à 500 : dégâts, éliminations, capacités, trades, poses/désamorçages). La formule de Riot n'étant pas publique,
/// le score n'est JAMAIS recalculé : on n'affiche que la valeur fournie par l'API (sinon « — »).
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
    /// Score de performance fourni par l'API (0-500) ou ACS d'avant le patch ; `nil` si indisponible.
    let scoreValue: Int?

    var kd: Double { deaths == 0 ? Double(kills) : Double(kills) / Double(deaths) }
    var scoreLabel: String { scoring == .performance ? "PERF" : "ACS" }
}

@MainActor
@Observable
final class ValorantStore {
    private let api: APIClient
    private(set) var matches: [ValorantMatch] = []
    private(set) var isLoading = false
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

    /// Reprend le pseudo enregistré sur le compte ETHONE (réglages du site) s'il n'a pas encore été saisi ici.
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
        do {
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

    /// Lit le score de performance fourni par l'API (plusieurs noms de champ possibles) ; `nil` s'il est absent ou hors 0-500.
    static func performanceScore(_ player: JSONValue) -> Int? {
        let candidates = [player["stats"]?["performance_score"], player["stats"]?["performanceScore"], player["performance_score"], player["performanceScore"]]
        for candidate in candidates {
            let number = candidate?.doubleValue ?? candidate?.stringValue.flatMap(Double.init)
            if let number, number >= 0, number <= Double(ScoringSystem.performanceMax) { return Int(number.rounded()) }
        }
        return nil
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

        return ValorantMatch(
            id: meta["matchid"]?.stringValue ?? UUID().uuidString,
            map: meta["map"]?.stringValue ?? "—",
            mode: meta["mode"]?.stringValue ?? "—",
            agent: me["character"]?.stringValue ?? "—",
            won: won,
            teamRounds: myRounds,
            opponentRounds: theirRounds,
            kills: kills,
            deaths: deaths,
            assists: assists,
            headshotPercent: shots > 0 ? Int((heads / shots * 100).rounded()) : 0,
            startedAt: started,
            scoring: scoring,
            scoreValue: value
        )
    }
}
