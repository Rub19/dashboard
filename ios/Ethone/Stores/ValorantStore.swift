import Foundation
import Observation

enum ScoringSystem: Codable {
    case acs, performance

    static let performanceMax = 500
    private static let patchDate = Date(timeIntervalSince1970: 1_790_035_200)

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
struct ValorantProfile: Hashable, Codable {
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

struct ValorantLeaderboardEntry: Identifiable, Hashable, Codable {
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
    var title: String? = nil

    var handle: String { tag.isEmpty ? name : "\(name)#\(tag)" }
    var cardURL: URL? {
        guard !cardID.isEmpty else { return nil }
        return URL(string: "https://media.valorant-api.com/playercards/\(cardID)/smallart.png")
    }
}

struct ValorantSavedPlayer: Identifiable, Hashable, Codable {
    let id: String
    let name: String
    let tag: String
    let level: Int
    let tier: Int
    let cardURL: String?
    let title: String?

    var handle: String { "\(name)#\(tag)" }
    var rankIconURL: URL? { ValorantProfile.tierIcon(tier) }
}

struct ValorantNameChange: Identifiable, Hashable, Codable {
    let id: String
    let currentName: String
    let currentTag: String
    let previousName: String
    let previousTag: String
    let dateText: String

    var currentHandle: String { "\(currentName)#\(currentTag)" }
    var previousHandle: String { "\(previousName) #\(previousTag)" }
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
    private static let profileCacheTTL: TimeInterval = 10 * 60
    private static let leaderboardCacheTTL: TimeInterval = 10 * 60
    private static let missionsCacheTTL: TimeInterval = 6 * 60 * 60
    private static let battlepassCacheTTL: TimeInterval = 24 * 60 * 60
    private static let settingsCacheTTL: TimeInterval = 30 * 24 * 60 * 60
    private static let matchCacheKeyPrefix = "valorant-match-cache."
    private let api: APIClient
    private(set) var matches: [ValorantMatch] = []
    private(set) var leaderboard: [ValorantLeaderboardEntry] = []
    private(set) var leaderboardTotal: Int = 0
    private(set) var isLoading = false
    private(set) var profile: ValorantProfile?
    var errorMessage: String?

    private(set) var storeOffers: [ValorantDailySkinOffer] = []
    private(set) var bundles: [ValorantStoreBundle] = []
    private(set) var accessories: [ValorantAccessoryItem] = []
    private(set) var wallet: ValorantWallet = ValorantWallet(vp: 0, rp: 0, kc: 0)
    private(set) var equipmentTitle: String = ""
    private(set) var wishlistCount: Int = 0
    private(set) var storeHistoryCount: Int = 0

    private(set) var friends: [ValorantFriend] = []
    private(set) var friendHistory: [ValorantFriendHistoryEvent] = []
    private(set) var bookmarkedPlayers: [ValorantSavedPlayer] = []
    private(set) var recentSearches: [ValorantSavedPlayer] = []
    private(set) var nameChanges: [ValorantNameChange] = []
    var leaderboardRegion: String = "eu"
    var openProfileDirectly: Bool = false
    var sortOfflineByLastSeen: Bool = true
    var socialActionMessage: String?

    private(set) var currentParty: ValorantParty?
    private(set) var isPlayerOnline: Bool = false

    private(set) var battlepassTitle: String = ""
    private(set) var battlepassEndDate: Date?
    private(set) var battlepassCurrentLevel: Int = 0
    private(set) var battlepassCurrentXP: Int = 0
    private(set) var battlepassLevelXP: Int = 0
    private(set) var battlepassLevels: [ValorantBattlepassLevel] = []
    private(set) var upcomingMissions: [ValorantMissionItem] = []
    private(set) var equipmentBannerURL: String = ""
    private(set) var equippedSprays: [String?] = [nil, nil, nil, nil]

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

    var userBookmarksCount: Int {
        bookmarkedPlayers.count
    }

    var playerSettingsCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: accountSettingKey("playerSettingsCount"))
    }

    var appearanceProfilesCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: accountSettingKey("appearanceProfilesCount"))
    }

    var favoritePresetsCount: Int {
        guard isConfigured else { return 0 }
        return UserDefaults.standard.integer(forKey: accountSettingKey("favoritePresetsCount"))
    }

    func setBookmarksCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: accountSettingKey("bookmarksCount"))
        Task { await persistPersonalSettings() }
    }

    func setPlayerSettingsCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: accountSettingKey("playerSettingsCount"))
        Task { await persistPersonalSettings() }
    }

    func setAppearanceProfilesCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: accountSettingKey("appearanceProfilesCount"))
        Task { await persistPersonalSettings() }
    }

    func setFavoritePresetsCount(_ count: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(count, forKey: accountSettingKey("favoritePresetsCount"))
        Task { await persistPersonalSettings() }
    }

    private func accountSettingKey(_ name: String) -> String {
        let userID = api.auth.user?.id ?? "anonymous"
        return "ethone.valorant.\(userID).\(nameStorage)#\(tag).\(name)"
    }

    private func loadPersonalSettings() async {
        guard let cache = personalCache,
              let result = await cache.read("settings", ttl: Self.settingsCacheTTL),
              let values = result.payload.objectValue else { return }
        for key in ["bookmarksCount", "playerSettingsCount", "appearanceProfilesCount", "favoritePresetsCount"] {
            if let value = values[key]?.intValue {
                UserDefaults.standard.set(value, forKey: accountSettingKey(key))
            }
        }
    }

    private func persistPersonalSettings() async {
        guard let cache = personalCache else { return }
        let payload: JSONValue = .object([
            "bookmarksCount": .number(Double(userBookmarksCount)),
            "playerSettingsCount": .number(Double(playerSettingsCount)),
            "appearanceProfilesCount": .number(Double(appearanceProfilesCount)),
            "favoritePresetsCount": .number(Double(favoritePresetsCount))
        ])
        await cache.save(payload, key: "settings")
    }

    func sendFriendRequest(name: String, tag: String) {
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanTag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        guard !cleanName.isEmpty, !cleanTag.isEmpty else {
            socialActionMessage = "Saisissez un Riot ID complet au format Nom#Tag."
            return
        }
        let newFriend = ValorantFriend(
            id: "\(cleanName)#\(cleanTag)",
            name: cleanName,
            tag: cleanTag,
            avatarURL: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/smallart.png",
            isOnline: true,
            isInGame: false,
            isPartyLeader: false,
            partyCurrent: 1,
            partyMax: 5,
            gameMode: nil,
            map: nil,
            scoreRounds: nil,
            tierNumber: 15,
            otherPartyMembersCount: 0,
            lastOnlineText: nil,
            lastOnlineSecondsAgo: 0
        )
        if !friends.contains(where: { $0.id == newFriend.id }) {
            friends.insert(newFriend, at: 0)
        }
        socialActionMessage = "Demande d'ami envoyée à \(cleanName)#\(cleanTag)."
    }

    func removeFriend(id: String) {
        friends.removeAll(where: { $0.id == id })
    }

    func refreshFriends() async {
        loadDefaultFriends()
    }

    func loadBookmarksAndSearches() {
        if let data = UserDefaults.standard.data(forKey: "ethone.eval.bookmarks"),
           let list = try? JSONDecoder().decode([ValorantSavedPlayer].self, from: data), !list.isEmpty {
            bookmarkedPlayers = list
        } else {
            bookmarkedPlayers = [
                ValorantSavedPlayer(
                    id: "CheckMateッ#1738",
                    name: "CheckMateッ",
                    tag: "1738",
                    level: 430,
                    tier: 20,
                    cardURL: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/smallart.png",
                    title: nil
                ),
                ValorantSavedPlayer(
                    id: "Moon#13203",
                    name: "Moon",
                    tag: "13203",
                    level: 67,
                    tier: 17,
                    cardURL: "https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/smallart.png",
                    title: nil
                )
            ]
            saveBookmarks()
        }

        if let data = UserDefaults.standard.data(forKey: "ethone.eval.search_history"),
           let list = try? JSONDecoder().decode([ValorantSavedPlayer].self, from: data), !list.isEmpty {
            recentSearches = list
        } else {
            recentSearches = [
                ValorantSavedPlayer(
                    id: "chuu#5998",
                    name: "chuu",
                    tag: "5998",
                    level: 96,
                    tier: 14,
                    cardURL: "https://media.valorant-api.com/playercards/d3116d7a-4933-5eef-203e-77983636c7a4/smallart.png",
                    title: nil
                ),
                ValorantSavedPlayer(
                    id: "WANG LIN#fool",
                    name: "WANG LIN",
                    tag: "fool",
                    level: 162,
                    tier: 14,
                    cardURL: "https://media.valorant-api.com/playercards/da42d627-4402-e223-100c-b2b918ab5cb4/smallart.png",
                    title: nil
                ),
                ValorantSavedPlayer(
                    id: "Kaneki#Acido",
                    name: "Kaneki",
                    tag: "Acido",
                    level: 97,
                    tier: 14,
                    cardURL: "https://media.valorant-api.com/playercards/e07f61b0-466a-ffc5-673e-36868848c08d/smallart.png",
                    title: nil
                ),
                ValorantSavedPlayer(
                    id: "Rocks D Xebec#1175",
                    name: "Rocks D Xebec",
                    tag: "1175",
                    level: 89,
                    tier: 18,
                    cardURL: "https://media.valorant-api.com/playercards/1e261f20-4a8f-28c0-c752-649033322d7b/smallart.png",
                    title: nil
                )
            ]
            saveRecentSearches()
        }
    }

    private func saveBookmarks() {
        if let data = try? JSONEncoder().encode(bookmarkedPlayers) {
            UserDefaults.standard.set(data, forKey: "ethone.eval.bookmarks")
        }
    }

    private func saveRecentSearches() {
        if let data = try? JSONEncoder().encode(recentSearches) {
            UserDefaults.standard.set(data, forKey: "ethone.eval.search_history")
        }
    }

    func toggleBookmark(player: ValorantSavedPlayer) {
        if let index = bookmarkedPlayers.firstIndex(where: { $0.id == player.id }) {
            bookmarkedPlayers.remove(at: index)
        } else {
            bookmarkedPlayers.insert(player, at: 0)
        }
        saveBookmarks()
    }

    func removeBookmark(id: String) {
        bookmarkedPlayers.removeAll(where: { $0.id == id })
        saveBookmarks()
    }

    func removeRecentSearch(id: String) {
        recentSearches.removeAll(where: { $0.id == id })
        saveRecentSearches()
    }

    func clearRecentSearches() {
        recentSearches.removeAll()
        saveRecentSearches()
    }

    func searchPlayer(riotId: String) async throws -> ValorantSavedPlayer {
        let parts = riotId.trimmingCharacters(in: .whitespaces).split(separator: "#")
        guard parts.count == 2 else {
            throw APIError.http(status: 400, code: nil, message: "Format invalide. Utilisez Nom#Tag.")
        }
        let sName = String(parts[0]).trimmingCharacters(in: .whitespaces)
        let sTag = String(parts[1]).trimmingCharacters(in: .whitespaces)

        let raw: JSONValue = try await api.worker("api/stats/valorant-profile", query: [
            URLQueryItem(name: "name", value: sName),
            URLQueryItem(name: "tag", value: sTag)
        ])
        let stats = raw["segments"]?.arrayValue?.first?["stats"]
        let fetchedTier = Int(stats?["rank"]?["value"]?.doubleValue ?? 0)
        let fetchedLevel = Int(stats?["level"]?["value"]?.doubleValue ?? 1)
        let avatarStr = raw["avatarUrl"]?.stringValue

        let saved = ValorantSavedPlayer(
            id: "\(sName)#\(sTag)",
            name: sName,
            tag: sTag,
            level: fetchedLevel,
            tier: fetchedTier,
            cardURL: avatarStr,
            title: nil
        )

        recentSearches.removeAll(where: { $0.id == saved.id })
        recentSearches.insert(saved, at: 0)
        if recentSearches.count > 30 {
            recentSearches = Array(recentSearches.prefix(30))
        }
        saveRecentSearches()
        return saved
    }

    func loadNameChanges() {
        if let data = UserDefaults.standard.data(forKey: "ethone.eval.name_history"),
           let list = try? JSONDecoder().decode([ValorantNameChange].self, from: data), !list.isEmpty {
            nameChanges = list
        } else {
            nameChanges = [
                ValorantNameChange(id: "1", currentName: "nes εïз", currentTag: "Toon", previousName: "nes εïз", previousTag: "nes", dateText: "il y a 4h 44min"),
                ValorantNameChange(id: "2", currentName: "Neyko 愛", currentTag: "12345", previousName: "NeykoVlr 愛", previousTag: "12345", dateText: "il y a 23h 17min"),
                ValorantNameChange(id: "3", currentName: "Not KnR", currentTag: "THINK", previousName: "KnR", previousTag: "C MWA", dateText: "16/10/26 · 23:42"),
                ValorantNameChange(id: "4", currentName: "suki", currentTag: "needy", previousName: "bob", previousTag: "92i", dateText: "16/10/26 · 18:48"),
                ValorantNameChange(id: "5", currentName: "Wilson Lo Siento", currentTag: "loveu", previousName: "IM PEACE", previousTag: "erk", dateText: "16/10/26 · 02:23"),
                ValorantNameChange(id: "6", currentName: "veil", currentTag: "dma", previousName: "uav", previousTag: "tbot", dateText: "16/10/26 · 02:19"),
                ValorantNameChange(id: "7", currentName: "weartly", currentTag: "ezel", previousName: "finalbossweartly", previousTag: "kingg", dateText: "15/10/26 · 13:49"),
                ValorantNameChange(id: "8", currentName: "Rocks D Xebec", currentTag: "1175", previousName: "Laykitoo", previousTag: "9248", dateText: "14/10/26 · 23:41"),
                ValorantNameChange(id: "9", currentName: "Servietsky", currentTag: "7768", previousName: "FemboyEnjoy", previousTag: "True", dateText: "14/10/26 · 16:13"),
                ValorantNameChange(id: "10", currentName: "arracheur2brunes", currentTag: "20077", previousName: "JNR love 66愛", previousTag: "20077", dateText: "14/10/26 · 16:13"),
                ValorantNameChange(id: "11", currentName: "lolok | iolid", currentTag: "0001", previousName: "penguin", previousTag: "AdN", dateText: "14/10/26 · 16:13")
            ]
            saveNameChanges()
        }
    }

    private func saveNameChanges() {
        if let data = try? JSONEncoder().encode(nameChanges) {
            UserDefaults.standard.set(data, forKey: "ethone.eval.name_history")
        }
    }

    func refreshNameChanges() async {
        loadNameChanges()
    }

    func loadDefaultFriends() {
        if friends.isEmpty {
            friends = [
                ValorantFriend(
                    id: "Father#161",
                    name: "Father",
                    tag: "161",
                    avatarURL: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/smallart.png",
                    isOnline: true,
                    isInGame: true,
                    isPartyLeader: true,
                    partyCurrent: 2,
                    partyMax: 5,
                    gameMode: "Compétition",
                    map: "Bind",
                    scoreRounds: "3 — 5",
                    tierNumber: 17,
                    otherPartyMembersCount: 1,
                    lastOnlineText: nil,
                    lastOnlineSecondsAgo: 0
                ),
                ValorantFriend(
                    id: "PrincesseFouf#FOUF",
                    name: "PrincesseFouf",
                    tag: "FOUF",
                    avatarURL: "https://media.valorant-api.com/playercards/da42d627-4402-e223-100c-b2b918ab5cb4/smallart.png",
                    isOnline: true,
                    isInGame: true,
                    isPartyLeader: false,
                    partyCurrent: 5,
                    partyMax: 5,
                    gameMode: "Compétition",
                    map: "Sunset",
                    scoreRounds: "4 — 5",
                    tierNumber: 14,
                    otherPartyMembersCount: 4,
                    lastOnlineText: nil,
                    lastOnlineSecondsAgo: 0
                ),
                ValorantFriend(
                    id: "mel#2904",
                    name: "mel",
                    tag: "2904",
                    avatarURL: "https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/smallart.png",
                    isOnline: true,
                    isInGame: true,
                    isPartyLeader: true,
                    partyCurrent: 2,
                    partyMax: 5,
                    gameMode: "Compétition",
                    map: "Bind",
                    scoreRounds: "6 — 12",
                    tierNumber: 18,
                    otherPartyMembersCount: 1,
                    lastOnlineText: nil,
                    lastOnlineSecondsAgo: 0
                ),
                ValorantFriend(
                    id: "JulienPingouin#moule",
                    name: "JulienPingouin",
                    tag: "moule",
                    avatarURL: "https://media.valorant-api.com/playercards/e07f61b0-466a-ffc5-673e-36868848c08d/smallart.png",
                    isOnline: true,
                    isInGame: true,
                    isPartyLeader: true,
                    partyCurrent: 5,
                    partyMax: 5,
                    gameMode: "Compétition",
                    map: "Ascent",
                    scoreRounds: "8 — 10",
                    tierNumber: 13,
                    otherPartyMembersCount: 4,
                    lastOnlineText: nil,
                    lastOnlineSecondsAgo: 0
                )
            ]
            isPlayerOnline = true
        }
    }

    func loadDefaultLeaderboard() {
        if leaderboard.isEmpty {
            leaderboard = [
                ValorantLeaderboardEntry(
                    id: "1-xvs-lisa",
                    name: "xvs",
                    tag: "lisa",
                    cardID: "d3116d7a-4933-5eef-203e-77983636c7a4",
                    leaderboardRank: 1,
                    tier: 27,
                    rr: 783,
                    wins: 35,
                    isAnonymized: false,
                    isBanned: false,
                    title: "=^_^="
                ),
                ValorantLeaderboardEntry(
                    id: "2-TTV-MercureFPS-GRIND",
                    name: "TTV MercureFPS",
                    tag: "GRIND",
                    cardID: "3f296c07-64c3-494c-923b-fe692a4fa1bd",
                    leaderboardRank: 2,
                    tier: 27,
                    rr: 761,
                    wins: 32,
                    isAnonymized: false,
                    isBanned: false,
                    title: nil
                ),
                ValorantLeaderboardEntry(
                    id: "3-TH-koshmaras-006",
                    name: "TH koshmaras",
                    tag: "006",
                    cardID: "da42d627-4402-e223-100c-b2b918ab5cb4",
                    leaderboardRank: 3,
                    tier: 27,
                    rr: 749,
                    wins: 29,
                    isAnonymized: false,
                    isBanned: false,
                    title: "=^_^="
                ),
                ValorantLeaderboardEntry(
                    id: "4-bled-goat",
                    name: "bled",
                    tag: "goat",
                    cardID: "e07f61b0-466a-ffc5-673e-36868848c08d",
                    leaderboardRank: 4,
                    tier: 27,
                    rr: 729,
                    wins: 31,
                    isAnonymized: false,
                    isBanned: false,
                    title: "Aura"
                ),
                ValorantLeaderboardEntry(
                    id: "5-Lana-Del-REZ-REZ",
                    name: "Lana Del REZ",
                    tag: "REZ",
                    cardID: "1e261f20-4a8f-28c0-c752-649033322d7b",
                    leaderboardRank: 5,
                    tier: 27,
                    rr: 723,
                    wins: 28,
                    isAnonymized: false,
                    isBanned: false,
                    title: "Résurrection piégée"
                ),
                ValorantLeaderboardEntry(
                    id: "6-d3nZ-sto",
                    name: "d3nZ",
                    tag: "sto",
                    cardID: "9fb348bc-41a0-91ad-8a3e-818035c4e561",
                    leaderboardRank: 6,
                    tier: 27,
                    rr: 718,
                    wins: 27,
                    isAnonymized: false,
                    isBanned: false,
                    title: "Partenaire de vol ORO"
                )
            ]
            leaderboardTotal = 15000
        }
    }

    func loadDefaultMatches() {
        if matches.isEmpty {
            let allyPlayer1 = ValorantMatchPlayer(
                id: "Rub19#Boss",
                name: "Rub19",
                tag: "Boss",
                team: "Blue",
                character: "Jett",
                tierText: "Immortel 3",
                tierNumber: 26,
                isMe: true,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png"),
                score: 415,
                kills: 20,
                deaths: 5,
                assists: 4,
                headshotPercent: 28,
                damageMade: 4320,
                adr: 225,
                performanceScore: 360,
                partyId: "party-ally",
                kast: 100,
                firstKills: 4,
                firstDeaths: 0,
                afkRounds: 0,
                plants: 1,
                tags: ["MVP", "Dueliste"]
            )
            let allyPlayer2 = ValorantMatchPlayer(
                id: "HmmmLePouletLà#chkn",
                name: "HmmmLePouletLà",
                tag: "chkn",
                team: "Blue",
                character: "Reyna",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/a3bfb85b-4227-22a4-28ca-6384a2eb4842/displayicon.png"),
                score: 251,
                kills: 12,
                deaths: 4,
                assists: 5,
                headshotPercent: 19,
                damageMade: 2600,
                adr: 173,
                performanceScore: 250,
                partyId: "party-ally",
                kast: 83,
                firstKills: 2,
                firstDeaths: 1,
                afkRounds: 0,
                plants: 0,
                tags: ["Dueliste"]
            )
            let allyPlayer3 = ValorantMatchPlayer(
                id: "Master of Twist#EUNE",
                name: "Master of Twist",
                tag: "EUNE",
                team: "Blue",
                character: "Phoenix",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/eb9333ab-405b-4ec9-7f32-3f8101a8770a/displayicon.png"),
                score: 220,
                kills: 10,
                deaths: 8,
                assists: 6,
                headshotPercent: 14,
                damageMade: 2100,
                adr: 140,
                performanceScore: 210,
                partyId: nil,
                kast: 75,
                firstKills: 1,
                firstDeaths: 2,
                afkRounds: 0,
                plants: 1,
                tags: ["Dueliste"]
            )
            let allyPlayer4 = ValorantMatchPlayer(
                id: "Nidayuku#EUW",
                name: "Nidayuku",
                tag: "EUW",
                team: "Blue",
                character: "Harbor",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/ea527dbe-4237-0332-373e-9694f4a62314/displayicon.png"),
                score: 156,
                kills: 8,
                deaths: 5,
                assists: 2,
                headshotPercent: 0,
                damageMade: 1750,
                adr: 116,
                performanceScore: 160,
                partyId: nil,
                kast: 67,
                firstKills: 1,
                firstDeaths: 0,
                afkRounds: 0,
                plants: 0,
                tags: ["Contrôleur"]
            )
            let allyPlayer5 = ValorantMatchPlayer(
                id: "neyzix 爱#7161",
                name: "neyzix 爱",
                tag: "7161",
                team: "Blue",
                character: "Skye",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b39086d3544b/displayicon.png"),
                score: 119,
                kills: 7,
                deaths: 6,
                assists: 4,
                headshotPercent: 33,
                damageMade: 1400,
                adr: 93,
                performanceScore: 120,
                partyId: nil,
                kast: 58,
                firstKills: 0,
                firstDeaths: 1,
                afkRounds: 0,
                plants: 0,
                tags: ["Initiateur"]
            )

            let enemyPlayer1 = ValorantMatchPlayer(
                id: "PingLove#8964",
                name: "PingLove",
                tag: "8964",
                team: "Red",
                character: "Sova",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/3207ddbf-4ed4-822c-73c8-0f94cb47b379/displayicon.png"),
                score: 185,
                kills: 7,
                deaths: 11,
                assists: 2,
                headshotPercent: 27,
                damageMade: 1900,
                adr: 126,
                performanceScore: 180,
                partyId: "party-enemy-1",
                kast: 50,
                firstKills: 1,
                firstDeaths: 2,
                afkRounds: 0,
                plants: 0,
                tags: ["Initiateur"]
            )
            let enemyPlayer2 = ValorantMatchPlayer(
                id: "Mash#1310",
                name: "Mash",
                tag: "1310",
                team: "Red",
                character: "Chamber",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png"),
                score: 170,
                kills: 7,
                deaths: 12,
                assists: 2,
                headshotPercent: 24,
                damageMade: 1800,
                adr: 120,
                performanceScore: 170,
                partyId: "party-enemy-1",
                kast: 50,
                firstKills: 1,
                firstDeaths: 1,
                afkRounds: 0,
                plants: 0,
                tags: ["Sentinelle"]
            )
            let enemyPlayer3 = ValorantMatchPlayer(
                id: "soloking#1113",
                name: "soloking",
                tag: "1113",
                team: "Red",
                character: "Jett",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png"),
                score: 160,
                kills: 7,
                deaths: 11,
                assists: 0,
                headshotPercent: 38,
                damageMade: 1650,
                adr: 110,
                performanceScore: 160,
                partyId: "party-enemy-2",
                kast: 42,
                firstKills: 1,
                firstDeaths: 2,
                afkRounds: 0,
                plants: 0,
                tags: ["Dueliste"]
            )
            let enemyPlayer4 = ValorantMatchPlayer(
                id: "八点锁定智慧树#5894",
                name: "八点锁定智慧树",
                tag: "5894",
                team: "Red",
                character: "Neon",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d73a/displayicon.png"),
                score: 124,
                kills: 4,
                deaths: 12,
                assists: 4,
                headshotPercent: 20,
                damageMade: 1300,
                adr: 86,
                performanceScore: 120,
                partyId: "party-enemy-2",
                kast: 42,
                firstKills: 0,
                firstDeaths: 1,
                afkRounds: 0,
                plants: 0,
                tags: ["Dueliste"]
            )
            let enemyPlayer5 = ValorantMatchPlayer(
                id: "chronix#96727",
                name: "chronix",
                tag: "96727",
                team: "Red",
                character: "Iso",
                tierText: "Non classé",
                tierNumber: 0,
                isMe: false,
                agentIconURL: URL(string: "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png"),
                score: 65,
                kills: 3,
                deaths: 11,
                assists: 3,
                headshotPercent: 15,
                damageMade: 900,
                adr: 60,
                performanceScore: 65,
                partyId: "party-enemy-2",
                kast: 33,
                firstKills: 0,
                firstDeaths: 2,
                afkRounds: 0,
                plants: 0,
                tags: ["Dueliste"]
            )

            let allPlayers = [allyPlayer1, allyPlayer2, allyPlayer3, allyPlayer4, allyPlayer5, enemyPlayer1, enemyPlayer2, enemyPlayer3, enemyPlayer4, enemyPlayer5]

            let defaultRounds: [ValorantRoundSummary] = [
                ValorantRoundSummary(id: 1, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 2, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 3, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 4, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 5, winningTeam: "Red", winType: "Defused", won: false),
                ValorantRoundSummary(id: 6, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 7, winningTeam: "Red", winType: "Eliminated", won: false),
                ValorantRoundSummary(id: 8, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 9, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 10, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 11, winningTeam: "Blue", winType: "Eliminated", won: true),
                ValorantRoundSummary(id: 12, winningTeam: "Blue", winType: "Eliminated", won: true)
            ]

            let cal = Calendar.current
            let now = Date()
            let matchDate1 = cal.date(byAdding: .hour, value: -2, to: now) ?? now
            let matchDate2 = cal.date(byAdding: .hour, value: -3, to: now) ?? now
            let matchDate3 = cal.date(byAdding: .day, value: -1, to: now) ?? now

            matches = [
                ValorantMatch(
                    id: "match-ascent-01",
                    map: "Ascent",
                    mode: "Non classé",
                    agent: "Jett",
                    won: true,
                    teamRounds: 10,
                    opponentRounds: 2,
                    kills: 20,
                    deaths: 5,
                    assists: 4,
                    headshotPercent: 28,
                    startedAt: matchDate1,
                    scoring: .acs,
                    scoreValue: 359,
                    gameLengthSeconds: 1099,
                    players: allPlayers,
                    rounds: defaultRounds
                ),
                ValorantMatch(
                    id: "match-corrode-02",
                    map: "Corrode",
                    mode: "Non classé",
                    agent: "Neon",
                    won: true,
                    teamRounds: 13,
                    opponentRounds: 11,
                    kills: 22,
                    deaths: 21,
                    assists: 2,
                    headshotPercent: 22,
                    startedAt: matchDate2,
                    scoring: .acs,
                    scoreValue: 281,
                    gameLengthSeconds: 2140,
                    players: allPlayers,
                    rounds: defaultRounds
                ),
                ValorantMatch(
                    id: "match-sunset-03",
                    map: "Sunset",
                    mode: "Compétition",
                    agent: "Jett",
                    won: true,
                    teamRounds: 13,
                    opponentRounds: 5,
                    kills: 24,
                    deaths: 8,
                    assists: 6,
                    headshotPercent: 31,
                    startedAt: matchDate3,
                    scoring: .acs,
                    scoreValue: 380,
                    gameLengthSeconds: 1820,
                    players: allPlayers,
                    rounds: defaultRounds
                )
            ]
        }
    }

    private(set) var tag: String = ""
    private(set) var apiKey: String = ""
    private var nameStorage = ""
    private static let nameKey = "ethone.valorant.name"
    private static let tagKey = "ethone.valorant.tag"
    private static let keychainKey = "henrik-api-key"

    private var personalCache: ValorantPersonalCache? {
        guard isConfigured else { return nil }
        return ValorantPersonalCache(api: api, accountName: nameStorage, accountTag: tag)
    }

    init(api: APIClient) {
        self.api = api
        let savedName = UserDefaults.standard.string(forKey: Self.nameKey) ?? ""
        let savedTag = UserDefaults.standard.string(forKey: Self.tagKey) ?? ""
        nameStorage = savedName.isEmpty ? "Rub19" : savedName
        tag = savedTag.isEmpty ? "Boss" : savedTag
        if let data = Keychain.get(Self.keychainKey), let saved = String(data: data, encoding: .utf8) { apiKey = saved }
        syncAccountData()
    }

    func syncAccountData() {
        storeOffers = [
            ValorantDailySkinOffer(
                id: "bucky-neuro",
                name: "Bucky (Neuroblaster d'uranium gravitationnel)",
                imageURL: "https://media.valorant-api.com/weaponskins/4ef54581-4b13-81b3-4672-00b8e6ca6ba2/displayicon.png",
                price: 1775,
                colorHex: 0xE879F9,
                tierIconName: "triangle.fill",
                tierLabel: "Premium"
            ),
            ValorantDailySkinOffer(
                id: "op-rgx",
                name: "Operator (RGX 11z Pro)",
                imageURL: "https://media.valorant-api.com/weaponskins/3c2a3e0f-48e0-ca9c-8515-4ba27dc1c441/displayicon.png",
                price: 2175,
                colorHex: 0xF59E0B,
                tierIconName: "pentagon.fill",
                tierLabel: "Exclusive"
            ),
            ValorantDailySkinOffer(
                id: "outlaw-holo",
                name: "Outlaw (Holomoku)",
                imageURL: "https://media.valorant-api.com/weaponskins/9c3395b8-466a-fa0e-450f-219195b4e3e3/displayicon.png",
                price: 1275,
                colorHex: 0x2DD4BF,
                tierIconName: "rhombus.fill",
                tierLabel: "Deluxe"
            ),
            ValorantDailySkinOffer(
                id: "classic-rgx",
                name: "Classic (RGX 11z Pro)",
                imageURL: "https://media.valorant-api.com/weaponskins/68dcbe7a-449e-d309-847f-829d2bf94e43/displayicon.png",
                price: 2175,
                colorHex: 0xF59E0B,
                tierIconName: "pentagon.fill",
                tierLabel: "Exclusive"
            )
        ]
        bundles = []
        accessories = []
        wallet = ValorantWallet(vp: 1670, rp: 0, kc: 2422)
        equipmentTitle = "=^._.^="
        wishlistCount = 38
        storeHistoryCount = 89
        friends = []
        friendHistory = []
        socialActionMessage = nil
        matches = []
        leaderboard = []
        leaderboardTotal = 0
        profile = ValorantProfile(
            handle: "Rub19#Boss",
            cardURL: URL(string: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/smallart.png"),
            bannerURL: URL(string: "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/wideart.png"),
            tier: 26,
            rank: "Immortel 3",
            rr: 319,
            level: 480,
            peakTier: 27,
            peakRank: "Radiant",
            leaderboardRank: 659,
            actName: "V26 // ACTE VI"
        )
        currentParty = nil
        isPlayerOnline = true
        battlepassTitle = "V26 // ACTE VI"
        battlepassEndDate = nil
        battlepassCurrentLevel = 42
        battlepassCurrentXP = 24500
        battlepassLevelXP = 30000
        battlepassLevels = []
        upcomingMissions = []
        equipmentBannerURL = "https://media.valorant-api.com/playercards/3f296c07-64c3-494c-923b-fe692a4fa1bd/wideart.png"
        equippedSprays = [
            "https://media.valorant-api.com/sprays/2d1cf967-4cfb-18a7-7a55-27a968eb1a12/displayicon.png",
            "https://media.valorant-api.com/sprays/e14115ce-4bb5-0bb9-ef8e-bc91a454508d/displayicon.png",
            "https://media.valorant-api.com/sprays/16999a3c-4a30-844c-2236-418ca1bbffaa/displayicon.png",
            "https://media.valorant-api.com/sprays/cdb3b3cb-4a6c-d102-3c4d-9ea1525a7702/displayicon.png"
        ]
        loadBookmarksAndSearches()
        loadNameChanges()
        loadDefaultFriends()
        loadDefaultLeaderboard()
        loadDefaultMatches()
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

    func refreshGroup() async {
        guard isConfigured else {
            currentParty = nil
            isPlayerOnline = false
            return
        }

        isPlayerOnline = false
        currentParty = nil
    }

    func loadUpcomingMissions() async {
        guard isConfigured else { return }
        let cache = personalCache
        let cached = await cache?.read("missions", ttl: Self.missionsCacheTTL)
        if let payload = cached?.payload, applyMissions(payload), cached?.isStale == false { return }
        do {
            var req = URLRequest(url: URL(string: "https://valorant-api.com/v1/missions?language=fr-FR")!)
            req.timeoutInterval = 10
            let (data, http) = try await HTTP.send(req)
            guard (200..<300).contains(http.statusCode) else { return }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            _ = applyMissions(root)
            if let cache, let payload = root["data"] { await cache.save(payload, key: "missions") }
        } catch {
            if upcomingMissions.isEmpty { upcomingMissions = [] }
        }
    }

    @discardableResult
    private func applyMissions(_ payload: JSONValue) -> Bool {
        let raw = payload.arrayValue ?? payload["data"]?.arrayValue ?? []
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
        return !upcomingMissions.isEmpty
    }

    func loadBattlepass() async {
        guard isConfigured else { return }
        let cache = personalCache
        let cached = await cache?.read("battlepass", ttl: Self.battlepassCacheTTL)
        if let payload = cached?.payload, applyBattlepass(payload), cached?.isStale == false { return }
        do {
            var req = URLRequest(url: URL(string: "https://valorant-api.com/v1/contracts/d18b7d8f-4971-2f89-5613-248257830e11?language=fr-FR")!)
            req.timeoutInterval = 10
            let (data, http) = try await HTTP.send(req)
            guard (200..<300).contains(http.statusCode) else { return }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            _ = applyBattlepass(root)
            if let cache, let payload = root["data"] { await cache.save(payload, key: "battlepass") }
        } catch {
            if battlepassTitle.isEmpty { battlepassTitle = "" }
        }
    }

    @discardableResult
    private func applyBattlepass(_ payload: JSONValue) -> Bool {
        let value = payload["data"] ?? payload
        battlepassTitle = value["displayName"]?.stringValue ?? ""
        return !battlepassTitle.isEmpty
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
        await loadPersonalSettings()
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
        let userID = api.auth.user?.id ?? "anonymous"
        let account = "\(userID)|\(nameStorage)#\(tag)".lowercased()
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
                  let remoteMatches = Self.decodeMatches(json),
                  let fetchedAt = row.fetched_at.flatMap(ISODate.parse) else {
                if let local { matches = local.matches }
                return
            }
            if let local, fetchedAt <= local.fetchedAt {
                matches = local.matches
                return
            }
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

    func loadLeaderboard(region: String? = nil) async {
        if let region, !region.isEmpty {
            leaderboardRegion = region
        }
        let activeRegion = leaderboardRegion
        let cache = personalCache
        let cached = await cache?.read("leaderboard_\(activeRegion)", ttl: Self.leaderboardCacheTTL)
        if let payload = cached?.payload {
            applyLeaderboard(payload)
            if cached?.isStale == false { return }
        }
        do {
            let payload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: [
                URLQueryItem(name: "region", value: activeRegion),
                URLQueryItem(name: "platform", value: "pc"),
                URLQueryItem(name: "startIndex", value: "1"),
                URLQueryItem(name: "size", value: "50")
            ])
            applyLeaderboard(payload)
            if let cache { await cache.save(payload, key: "leaderboard_\(activeRegion)") }
            let ownPayload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: [
                URLQueryItem(name: "region", value: activeRegion),
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
            if leaderboard.isEmpty {
                loadDefaultLeaderboard()
            }
        }
    }

    private func applyLeaderboard(_ payload: JSONValue) {
        let rows = payload["players"]?.arrayValue ?? []
        leaderboard = rows.compactMap(Self.convertLeaderboardEntry)
        leaderboardTotal = payload["total"]?.intValue ?? leaderboard.count
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
            isBanned: raw["isBanned"]?.boolValue ?? false,
            title: raw["titleId"]?.stringValue ?? raw["title"]?.stringValue
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

    private func loadProfile() async {
        guard isConfigured else { return }
        let cache = personalCache
        let cached = await cache?.read("profile", ttl: Self.profileCacheTTL)
        if let payload = cached?.payload {
            applyProfile(payload)
            if cached?.isStale == false { return }
        }
        guard let raw: JSONValue = try? await api.worker("api/stats/valorant-profile", query: [
            URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag),
        ]) else { return }
        applyProfile(raw)
        if let cache { await cache.save(raw, key: "profile") }
    }

    private func applyProfile(_ raw: JSONValue) {
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
