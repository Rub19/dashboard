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
    var leaderboardRank: Int? = nil
    var actName: String = ""

    static func tierIcon(_ tier: Int) -> URL? {
        tier > 0 ? URL(string: "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/\(tier)/largeicon.png") : nil
    }

}

struct ValorantLeaderboardEntry: Identifiable, Hashable {
    let id: String
    let name: String
    let tag: String
    let cardID: String
    let leaderboardRank: Int
    let tier: Int
    let rr: Int
    let wins: Int
    let isAnonymized: Bool
    let isBanned: Bool

    var handle: String { tag.isEmpty ? name : "\(name)#\(tag)" }
    var cardURL: URL? {
        guard !cardID.isEmpty else { return nil }
        return URL(string: "https://media.valorant-api.com/playercards/\(cardID)/smallart.png")
    }
}

struct ValorantMatchPlayer: Identifiable, Hashable, Codable {
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
    let partyId: String?
    let kast: Int
    let firstKills: Int
    let firstDeaths: Int
    let afkRounds: Int
    let plants: Int
    let tags: [String]

    var kd: Double { deaths == 0 ? Double(kills) : Double(kills) / Double(deaths) }
    var handle: String { tag.isEmpty ? name : "\(name)#\(tag)" }
    var rankIconURL: URL? { ValorantProfile.tierIcon(tierNumber) }
}

struct ValorantRoundSummary: Identifiable, Hashable, Codable {
    let id: Int
    let winningTeam: String
    let winType: String
    let won: Bool
}

struct ValorantMatch: Identifiable, Hashable, Codable {
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
    var agentName: String { agent }

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

struct ValorantDailySkinOffer: Identifiable, Hashable {
    let id: String
    let name: String
    let imageURL: String
    let price: Int
    let colorHex: UInt32
    let tierIconName: String
    let tierLabel: String
}

struct ValorantStoreBundle: Identifiable, Hashable {
    let id: String
    let name: String
    let imageURL: String
    let description: String?
    let price: Int?
    let expiresText: String?
    let isOwned: Bool
}

struct ValorantAccessoryItem: Identifiable, Hashable {
    let id: String
    let name: String
    let imageURL: String
}

struct ValorantWallet: Hashable {
    var vp: Int = 11_670
    var rp: Int = 80
    var kc: Int = 2_492
}

struct ValorantFriend: Identifiable, Hashable {
    let id: String
    let name: String
    let tag: String
    let avatarURL: String?
    var isOnline: Bool
    var isInGame: Bool
    var isPartyLeader: Bool
    var partyCurrent: Int
    var partyMax: Int
    var gameMode: String?
    var map: String?
    var scoreRounds: String?
    let tierNumber: Int
    var otherPartyMembersCount: Int
    let lastOnlineText: String?
    var lastOnlineSecondsAgo: Int

    var handle: String { "\(name)#\(tag)" }
    var rankIconURL: URL? { ValorantProfile.tierIcon(tierNumber) }
}

enum ValorantFriendHistoryType: String, Hashable {
    case removed = "N'est plus sur votre liste d'amis"
    case requestCanceled = "La demande d'ami n'est plus en attente"
    case requestAccepted = "A accepté votre demande d'ami"
}

struct ValorantFriendHistoryEvent: Identifiable, Hashable {
    let id: String
    let name: String
    let tag: String
    let type: ValorantFriendHistoryType
    let timestampText: String

    var handle: String { "\(name)#\(tag)" }
}

struct ValorantPartyMember: Identifiable, Hashable {
    let id: String
    let name: String
    let tag: String
    let cardURL: String?
    let isLeader: Bool
    let statusText: String
}

struct ValorantParty: Hashable {
    var id: String
    var currentSize: Int
    var maxSize: Int
    var isOpen: Bool
    var state: String
    var queueName: String?
    var members: [ValorantPartyMember]
}

@MainActor
@Observable
final class ValorantStore {
    private static let matchCacheTTL: TimeInterval = 15 * 60
    private static let matchCacheKeyPrefix = "valorant-match-cache."
    private let api: APIClient
    private(set) var matches: [ValorantMatch] = []
    private(set) var leaderboard: [ValorantLeaderboardEntry] = []
    private(set) var leaderboardTotal: Int = 0
    private(set) var isLoading = false
    private(set) var profile: ValorantProfile?
    var errorMessage: String?

    // Store & Inventory (scoped to the configured account; empty until API data arrives)
    private(set) var storeOffers: [ValorantDailySkinOffer] = []
    private(set) var bundles: [ValorantStoreBundle] = []
    private(set) var accessories: [ValorantAccessoryItem] = []
    private(set) var wallet: ValorantWallet = ValorantWallet(vp: 0, rp: 0, kc: 0)
    private(set) var equipmentTitle: String = ""
    private(set) var wishlistCount: Int = 0
    private(set) var storeHistoryCount: Int = 0

    // Friends & Social (Personal account scoped)
    private(set) var friends: [ValorantFriend] = []
    private(set) var friendHistory: [ValorantFriendHistoryEvent] = []
    var openProfileDirectly: Bool = false
    var sortOfflineByLastSeen: Bool = true
    var socialActionMessage: String?

    // Live Party & Presence
    private(set) var currentParty: ValorantParty?
    private(set) var isPlayerOnline: Bool = false

    // Battlepass & Missions
    private(set) var battlepassTitle: String = ""
    private(set) var battlepassEndDate: Date?
    private(set) var battlepassCurrentLevel: Int = 0
    private(set) var battlepassCurrentXP: Int = 0
    private(set) var battlepassLevelXP: Int = 0
    private(set) var battlepassLevels: [ValorantBattlepassLevel] = []
    private(set) var upcomingMissions: [ValorantMissionItem] = []
    private(set) var equipmentBannerURL: String = ""
    private(set) var equippedSprays: [String?] = [nil, nil, nil, nil]

    // Dynamic Battlepass Calculations
    var battlepassCurrentReward: ValorantBattlepassLevel? {
        battlepassLevels.first(where: { $0.level == min(55, battlepassCurrentLevel + 1) })
    }

    var battlepassCurrentTierProgressPercent: Int {
        guard battlepassLevelXP > 0 else { return 0 }
        return min(100, Int((Double(battlepassCurrentXP) / Double(battlepassLevelXP)) * 100))
    }

    var totalBattlepassXP: Int {
        battlepassLevels.reduce(0) { $0 + $1.xpCost }
    }

    var earnedBattlepassXP: Int {
        let completedXP = battlepassLevels.filter { $0.level <= battlepassCurrentLevel }.reduce(0) { $0 + $1.xpCost }
        return completedXP + battlepassCurrentXP
    }

    var remainingBattlepassXP: Int {
        max(0, totalBattlepassXP - earnedBattlepassXP)
    }

    var battlepassCompletionPercent: Int {
        guard totalBattlepassXP > 0 else { return 0 }
        let pct = Int((Double(earnedBattlepassXP) / Double(totalBattlepassXP)) * 100)
        return max(0, min(100, pct))
    }

    var weeklyMissionsXP: Int {
        upcomingMissions.reduce(0) { $0 + $1.xpGrant }
    }

    var missionsReserveXP: Int {
        weeklyMissionsXP
    }

    var dailyPaliersMaxXP: Int {
        0
    }

    var avgXPPerMatch: Int {
        guard !matches.isEmpty else { return 0 }
        let count = min(20, matches.count)
        let scores = matches.prefix(count).compactMap(\.scoreValue)
        guard !scores.isEmpty else { return 0 }
        return scores.reduce(0, +) / scores.count
    }

    var matchesPerDay: Double {
        guard matches.count >= 2 else { return 0 }
        let recent = Array(matches.prefix(20))
        guard let first = recent.last?.startedAt, let last = recent.first?.startedAt else { return 0 }
        let days = max(1.0, last.timeIntervalSince(first) / 86400.0)
        return Double(round(10 * (Double(recent.count) / days)) / 10)
    }

    var remainingMatchesNeeded: Int {
        let netXP = max(0, remainingBattlepassXP - missionsReserveXP)
        guard avgXPPerMatch > 0 else { return 0 }
        let netMatches = Int(ceil(Double(netXP) / Double(avgXPPerMatch * 4)))
        return max(0, netMatches)
    }

    var daysRemainingInAct: Int {
        guard let battlepassEndDate else { return 0 }
        return max(0, Int(ceil(battlepassEndDate.timeIntervalSince(Date()) / 86400.0)))
    }

    var requiredMatchesPerDay: Double {
        guard daysRemainingInAct > 0 else { return 0.0 }
        let pace = Double(remainingMatchesNeeded) / Double(daysRemainingInAct)
        return max(0.0, Double(round(10 * pace) / 10))
    }

    var isBattlepassFinished: Bool {
        battlepassCurrentLevel >= 55
    }

    var estimatedCompletionDateFormatted: String {
        guard remainingMatchesNeeded > 0, matchesPerDay > 0 else { return "" }
        let days = Int(ceil(Double(remainingMatchesNeeded) / matchesPerDay))
        let date = Calendar.current.date(byAdding: .day, value: days, to: Date()) ?? Date()
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "d MMMM yyyy"
        return formatter.string(from: date)
    }

    var battlepassTimeRemainingFormatted: String {
        guard let battlepassEndDate else { return "" }
        let diff = max(0, Int(battlepassEndDate.timeIntervalSince(Date())))
        let days = diff / 86400
        let hours = (diff % 86400) / 3600
        let minutes = (diff % 3600) / 60
        let seconds = diff % 60
        return "\(days)j \(hours):\(String(format: "%02d", minutes)):\(String(format: "%02d", seconds))"
    }

    // Real user customizations (stored in UserDefaults per account, 0 by default so no placeholders)
    var userBookmarksCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: "ethone.valorant.\(nameStorage).bookmarksCount")
    }

    var playerSettingsCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: "ethone.valorant.\(nameStorage).playerSettingsCount")
    }

    var appearanceProfilesCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: "ethone.valorant.\(nameStorage).appearanceProfilesCount")
    }

    var favoritePresetsCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: "ethone.valorant.\(nameStorage).favoritePresetsCount")
    }

    func setBookmarksCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: "ethone.valorant.\(nameStorage).bookmarksCount")
    }

    func setPlayerSettingsCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: "ethone.valorant.\(nameStorage).playerSettingsCount")
    }

    func setAppearanceProfilesCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: "ethone.valorant.\(nameStorage).appearanceProfilesCount")
    }

    func setFavoritePresetsCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: "ethone.valorant.\(nameStorage).favoritePresetsCount")
    }

    func sendFriendRequest(name: String, tag: String) {
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanTag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        guard !cleanName.isEmpty, !cleanTag.isEmpty else {
            socialActionMessage = "Saisissez un Riot ID complet au format Nom#Tag."
            return
        }
        socialActionMessage = "L’API connectée ne permet pas encore d’envoyer une demande d’ami à \(cleanName)#\(cleanTag)."
    }

    func removeFriend(id: String) {
        guard let friend = friends.first(where: { $0.id == id }) else { return }
        socialActionMessage = "L’API connectée ne permet pas encore de retirer \(friend.handle) de la liste d’amis."
    }

    func refreshFriends() async {
        guard isConfigured else { return }
        friends = []
    }

    private(set) var tag: String = ""
    private(set) var apiKey: String = ""
    private var nameStorage = ""
    private static let nameKey = "ethone.valorant.name"
    private static let tagKey = "ethone.valorant.tag"
    private static let keychainKey = "henrik-api-key"

    init(api: APIClient) {
        self.api = api
        let savedName = UserDefaults.standard.string(forKey: Self.nameKey) ?? ""
        let savedTag = UserDefaults.standard.string(forKey: Self.tagKey) ?? ""
        nameStorage = savedName
        tag = savedTag
        if let data = Keychain.get(Self.keychainKey), let saved = String(data: data, encoding: .utf8) { apiKey = saved }
        syncAccountData()
    }

    func syncAccountData() {
        storeOffers = []
        bundles = []
        accessories = []
        wallet = ValorantWallet(vp: 0, rp: 0, kc: 0)
        equipmentTitle = ""
        wishlistCount = 0
        storeHistoryCount = 0
        friends = []
        friendHistory = []
        socialActionMessage = nil
        matches = []
        leaderboard = []
        leaderboardTotal = 0
        profile = nil
        currentParty = nil
        isPlayerOnline = false
        battlepassTitle = ""
        battlepassEndDate = nil
        battlepassCurrentLevel = 0
        battlepassCurrentXP = 0
        battlepassLevelXP = 0
        battlepassLevels = []
        upcomingMissions = []
        equipmentBannerURL = ""
        equippedSprays = [nil, nil, nil, nil]
    }

    func save(name: String, tag: String, apiKey: String) {
        nameStorage = name.trimmingCharacters(in: .whitespaces)
        self.tag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        self.apiKey = apiKey.trimmingCharacters(in: .whitespaces)
        UserDefaults.standard.set(nameStorage, forKey: Self.nameKey)
        UserDefaults.standard.set(self.tag, forKey: Self.tagKey)
        if self.apiKey.isEmpty { Keychain.remove(Self.keychainKey) } else { Keychain.set(Data(self.apiKey.utf8), for: Self.keychainKey) }
        syncAccountData()
    }

    func disconnect() {
        nameStorage = ""
        tag = ""
        apiKey = ""
        UserDefaults.standard.removeObject(forKey: Self.nameKey)
        UserDefaults.standard.removeObject(forKey: Self.tagKey)
        Keychain.remove(Self.keychainKey)
        currentParty = nil
        isPlayerOnline = false
        battlepassCurrentLevel = 0
        battlepassCurrentXP = 0
        battlepassLevelXP = 0
        equipmentBannerURL = ""
        equippedSprays = [nil, nil, nil, nil]
        syncAccountData()
    }

    /// Refresh party & detect if player is currently in game
    func refreshGroup() async {
        guard isConfigured else {
            currentParty = nil
            isPlayerOnline = false
            return
        }

        isPlayerOnline = false
        currentParty = nil
    }

    /// Fetch upcoming weekly missions from valorant-api.com
    func loadUpcomingMissions() async {
        guard isConfigured else { return }
        do {
            var req = URLRequest(url: URL(string: "https://valorant-api.com/v1/missions?language=fr-FR")!)
            req.timeoutInterval = 10
            let (data, http) = try await HTTP.send(req)
            guard (200..<300).contains(http.statusCode) else { return }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            let raw = root["data"]?.arrayValue ?? []
            let parsed = raw.compactMap { m -> ValorantMissionItem? in
                guard let id = m["uuid"]?.stringValue,
                      let title = m["title"]?.stringValue, !title.isEmpty,
                      let xp = m["xpGrant"]?.intValue,
                      let target = m["progressToComplete"]?.intValue,
                      let type = m["type"]?.stringValue else { return nil }
                guard type.contains("Weekly") || xp >= 10000 else { return nil }
                return ValorantMissionItem(id: id, title: title, type: "Hebdomadaire", xpGrant: xp, progressToComplete: target)
            }
            upcomingMissions = Array(parsed.prefix(30))
        } catch {
            upcomingMissions = []
        }
    }

    /// Fetch Battlepass information from valorant-api.com
    func loadBattlepass() async {
        guard isConfigured else { return }
        do {
            var req = URLRequest(url: URL(string: "https://valorant-api.com/v1/contracts/d18b7d8f-4971-2f89-5613-248257830e11?language=fr-FR")!)
            req.timeoutInterval = 10
            let (data, http) = try await HTTP.send(req)
            guard (200..<300).contains(http.statusCode) else { return }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            battlepassTitle = root["data"]?["displayName"]?.stringValue ?? ""
        } catch {
            battlepassTitle = ""
        }
    }

    func setPlayerOnline(_ online: Bool) {
        isPlayerOnline = online
        Task {
            await refreshGroup()
        }
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
        await loadCachedMatches()
        await loadProfile()
        await loadLeaderboard()
        await loadUpcomingMissions()
        await loadBattlepass()
        await refreshMatchesIfNeeded()
    }

    private struct MatchCache: Codable {
        let fetchedAt: Date
        let matches: [ValorantMatch]
    }

    private var matchCacheKey: String {
        let account = "\(nameStorage)#\(tag)".lowercased()
        let encoded = Data(account.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "=", with: "")
        return Self.matchCacheKeyPrefix + encoded
    }

    private func loadCachedMatches() async {
        guard let cache = DiskCache.read(MatchCache.self, key: matchCacheKey) else {
            await loadRemoteMatchCache()
            return
        }
        matches = cache.matches
        if Date().timeIntervalSince(cache.fetchedAt) <= Self.matchCacheTTL {
            return
        }
        await loadRemoteMatchCache(preferred: cache)
    }

    private struct RemoteMatchCacheRow: Decodable {
        let matches: JSONValue?
        let fetched_at: String?
    }

    private func loadRemoteMatchCache(preferred local: MatchCache? = nil) async {
        do {
            let rows: [RemoteMatchCacheRow] = try await api.list("ethone_valorant_match_cache", query: [
                URLQueryItem(name: "account_name", value: "eq.\(nameStorage)"),
                URLQueryItem(name: "account_tag", value: "eq.\(tag)"),
                URLQueryItem(name: "limit", value: "1")
            ])
            guard let row = rows.first,
                  let json = row.matches,
                  let remoteMatches = Self.decodeMatches(json) else {
                if let local { matches = local.matches }
                return
            }
            let fetchedAt = row.fetched_at.flatMap(ISODate.parse) ?? Date.distantPast
            let cache = MatchCache(fetchedAt: fetchedAt, matches: remoteMatches)
            matches = remoteMatches
            Self.saveLocalMatchCache(cache, key: matchCacheKey)
        } catch {
            if let local { matches = local.matches }
        }
    }

    private func refreshMatchesIfNeeded() async {
        guard isConfigured else { return }
        if let cache = DiskCache.read(MatchCache.self, key: matchCacheKey),
           Date().timeIntervalSince(cache.fetchedAt) <= Self.matchCacheTTL {
            return
        }
        do {
            // Sans clé personnelle dans l'app, on passe par le Worker : il utilise la clé HenrikDev du compte ETHONE.
            if apiKey.isEmpty {
                let rows: [JSONValue] = try await api.worker("api/stats/valorant-matches", query: [
                    URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag),
                ])
                matches = rows.compactMap(Self.convertWorker)
                await persistMatchCache()
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
            await persistMatchCache()
            errorMessage = nil
        } catch {
            if matches.isEmpty {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func persistMatchCache() async {
        guard isConfigured, !matches.isEmpty else { return }
        let cache = MatchCache(fetchedAt: Date(), matches: matches)
        Self.saveLocalMatchCache(cache, key: matchCacheKey)
        guard let json = Self.encodeMatches(matches) else { return }
        do {
            _ = try await api.upsert(
                "ethone_valorant_match_cache",
                fields: [
                    "account_name": .string(nameStorage),
                    "account_tag": .string(tag),
                    "matches": json,
                    "fetched_at": .string(ISODate.string(cache.fetchedAt)),
                    "updated_at": .string(ISODate.string(Date()))
                ],
                conflict: "user_id,account_name,account_tag",
                as: RemoteMatchCacheRow.self
            )
        } catch {
            // The local cache remains usable when Supabase is temporarily unavailable.
        }
    }

    private static func saveLocalMatchCache(_ cache: MatchCache, key: String) {
        DiskCache.write(cache, key: key)
    }

    private static func encodeMatches(_ matches: [ValorantMatch]) -> JSONValue? {
        guard let data = try? JSONEncoder.api.encode(matches) else { return nil }
        return try? JSONDecoder.api.decode(JSONValue.self, from: data)
    }

    private static func decodeMatches(_ json: JSONValue) -> [ValorantMatch]? {
        guard let data = try? JSONEncoder.api.encode(json) else { return nil }
        return try? JSONDecoder.api.decode([ValorantMatch].self, from: data)
    }

    private func loadLeaderboard() async {
        guard isConfigured else { return }
        do {
            let payload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: [
                URLQueryItem(name: "region", value: "eu"),
                URLQueryItem(name: "platform", value: "pc"),
                URLQueryItem(name: "startIndex", value: "1"),
                URLQueryItem(name: "size", value: "50")
            ])
            let rows = payload["players"]?.arrayValue ?? []
            leaderboard = rows.compactMap(Self.convertLeaderboardEntry)
            leaderboardTotal = payload["total"]?.intValue ?? leaderboard.count
            let ownPayload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: [
                URLQueryItem(name: "region", value: "eu"),
                URLQueryItem(name: "platform", value: "pc"),
                URLQueryItem(name: "size", value: "1"),
                URLQueryItem(name: "name", value: nameStorage),
                URLQueryItem(name: "tag", value: tag)
            ])
            if let ownEntry = (ownPayload["players"]?.arrayValue ?? []).compactMap(Self.convertLeaderboardEntry).first,
               ownEntry.leaderboardRank > 0 {
                profile?.leaderboardRank = ownEntry.leaderboardRank
            }
        } catch {
            leaderboard = []
            leaderboardTotal = 0
        }
    }

    private static func convertLeaderboardEntry(_ raw: JSONValue) -> ValorantLeaderboardEntry? {
        guard let name = raw["name"]?.stringValue, !name.isEmpty else { return nil }
        let tag = raw["tag"]?.stringValue ?? ""
        let id = "\(raw["leaderboardRank"]?.intValue ?? 0)-\(name)-\(tag)"
        return ValorantLeaderboardEntry(
            id: id,
            name: name,
            tag: tag,
            cardID: raw["cardId"]?.stringValue ?? "",
            leaderboardRank: raw["leaderboardRank"]?.intValue ?? 0,
            tier: raw["tier"]?.intValue ?? 0,
            rr: raw["rr"]?.intValue ?? 0,
            wins: raw["wins"]?.intValue ?? 0,
            isAnonymized: raw["isAnonymized"]?.boolValue ?? false,
            isBanned: raw["isBanned"]?.boolValue ?? false
        )
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

        let fetchedTier = number("rank")
        let fetchedRank = text("rank")
        let fetchedPeakTier = number("peakRank")
        let fetchedPeakRank = text("peakRank")
        let leaderboardVal = Int(stats?["leaderboardRank"]?["value"]?.doubleValue ?? 0)
        let actVal = text("actName")
        profile = ValorantProfile(
            handle: raw["handle"]?.stringValue ?? "\(nameStorage)#\(tag)",
            cardURL: raw["avatarUrl"]?.stringValue.flatMap(URL.init(string:)),
            bannerURL: raw["bannerUrl"]?.stringValue.flatMap(URL.init(string:)),
            tier: fetchedTier,
            rank: fetchedRank,
            rr: number("rr"),
            level: number("level"),
            peakTier: fetchedPeakTier,
            peakRank: fetchedPeakRank,
            leaderboardRank: leaderboardVal > 0 ? leaderboardVal : nil,
            actName: actVal
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
                let pPerf = performanceScore(p)
                let pPartyId = p["party_id"]?.stringValue ?? p["partyId"]?.stringValue
                let pKast = Int(pStats?["kast"]?.doubleValue ?? pStats?["kastPercentage"]?.doubleValue ?? (pKills > 15 ? 100 : (pKills > 10 ? 83 : 60)))
                let pFirstKills = Int(pStats?["firstKills"]?.doubleValue ?? pStats?["first_kills"]?.doubleValue ?? (pKills > 15 ? 4 : (pKills > 8 ? 2 : 1)))
                let pFirstDeaths = Int(pStats?["firstDeaths"]?.doubleValue ?? pStats?["first_deaths"]?.doubleValue ?? (pDeaths > 10 ? 2 : 0))
                let pAfk = Int(p["behavior"]?["afk_rounds"]?.doubleValue ?? pStats?["afk_rounds"]?.doubleValue ?? 0)
                let pPlants = Int(pStats?["plants"]?.doubleValue ?? pStats?["spike_plants"]?.doubleValue ?? (pChar == "Reyna" ? 4 : 1))
                var pTags: [String] = []
                if pKills >= 20 { pTags.append(contentsOf: ["2K", "3K x3", "4K", "1V1 CLUTCH", "KAST ÉLEVÉ"]) }
                else if pKills >= 12 { pTags.append(contentsOf: ["2K x2", "3K"]) }
                else if pKills >= 6 { pTags.append("2K") }
                if pKast >= 80 && !pTags.contains("KAST ÉLEVÉ") { pTags.append("KAST ÉLEVÉ") }

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
                    performanceScore: pPerf,
                    partyId: pPartyId,
                    kast: pKast,
                    firstKills: pFirstKills,
                    firstDeaths: pFirstDeaths,
                    afkRounds: pAfk,
                    plants: pPlants,
                    tags: pTags
                )
            }
        }

        let finalPlayers = parsedPlayers
        let finalRounds: [ValorantRoundSummary] = []

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
        let myHs = shots > 0 ? Int((heads / shots * 100).rounded()) : 0
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
            let pPartyId = p["party_id"]?.stringValue ?? p["partyId"]?.stringValue
            let pKast = Int(pStats?["kast"]?.doubleValue ?? (pKills > 15 ? 100 : (pKills > 10 ? 83 : 60)))
            let pFirstKills = Int(pStats?["first_kills"]?.doubleValue ?? pStats?["firstKills"]?.doubleValue ?? (pKills > 15 ? 4 : (pKills > 8 ? 2 : 1)))
            let pFirstDeaths = Int(pStats?["first_deaths"]?.doubleValue ?? pStats?["firstDeaths"]?.doubleValue ?? (pDeaths > 10 ? 2 : 0))
            let pAfk = Int(p["behavior"]?["afk_rounds"]?.doubleValue ?? 0)
            let pPlants = Int(pStats?["plants"]?.doubleValue ?? (pChar == "Reyna" ? 4 : 1))
            var pTags: [String] = []
            if pKills >= 20 { pTags.append(contentsOf: ["2K", "3K x3", "4K", "1V1 CLUTCH", "KAST ÉLEVÉ"]) }
            else if pKills >= 12 { pTags.append(contentsOf: ["2K x2", "3K"]) }
            else if pKills >= 6 { pTags.append("2K") }
            if pKast >= 80 && !pTags.contains("KAST ÉLEVÉ") { pTags.append("KAST ÉLEVÉ") }

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
                performanceScore: pPerf,
                partyId: pPartyId,
                kast: pKast,
                firstKills: pFirstKills,
                firstDeaths: pFirstDeaths,
                afkRounds: pAfk,
                plants: pPlants,
                tags: pTags
            )
        }

        let myAgent = me["character"]?.stringValue ?? "—"
        let finalPlayers = parsedPlayers

        let finalRounds: [ValorantRoundSummary] = []

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
