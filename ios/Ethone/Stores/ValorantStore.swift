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

struct ValorantDailySkinOffer: Identifiable, Hashable, Codable {
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

struct ValorantAccessoryItem: Identifiable, Hashable, Codable {
    let id: String
    let name: String
    let imageURL: String
    var price: Int = 0
}

struct ValorantWallet: Hashable {
    var vp: Int = 0
    var rp: Int = 0
    var kc: Int = 0
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
    var queueState: String? = nil
    var gameMode: String?
    var map: String?
    var scoreRounds: String?
    let tierNumber: Int
    var otherPartyMembersCount: Int
    let lastOnlineText: String?
    var lastOnlineSecondsAgo: Int
    var partyID: String? = nil

    var handle: String { "\(name)#\(tag)" }
    var rankIconURL: URL? { ValorantProfile.tierIcon(tierNumber) }
}

enum ValorantFriendHistoryType: String, Hashable {
    case removed = "N'est plus sur votre liste d'amis"
    case requestCanceled = "La demande d'ami n'est plus en attente"
        case requestAccepted = "A accepté votre demande d'ami"
    case added = "Ajouté à votre liste d'amis"
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
    // Aucune donnée inventée ici : tout vient du Worker (HenrikDev borné), de Supabase,
    // de valorant-api.com ou reste vide. Ce que HenrikDev ne fournit pas (boutique perso,
    // portefeuille, groupe en jeu, présence des amis, progression du passe) reste vide.
    private static let syncInterval: TimeInterval = 10 * 60
    private static let leaderboardCacheTTL: TimeInterval = 10 * 60
    private static let missionsCacheTTL: TimeInterval = 6 * 60 * 60
    private static let battlepassCacheTTL: TimeInterval = 24 * 60 * 60
    private static let settingsCacheTTL: TimeInterval = 30 * 24 * 60 * 60
    private static let matchLimitKey = "ethone.valorant.matchLimit"
    private var matchLimit: Int = max(30, UserDefaults.standard.integer(forKey: "ethone.valorant.matchLimit"))
    /// Total de parties connues de HenrikDev (« 20 / 1389 »), 0 si inconnu.
    private(set) var totalMatches = 0
    private(set) var isLoadingMore = false

    private let api: APIClient
    private(set) var matches: [ValorantMatch] = []
    private(set) var evalMatches: [String: EvalMatch] = [:]
    private(set) var puuid: String = ""
    private(set) var mmr = EvalMMR()
    /// Actes du jeu par UUID de saison (valorant-api.com), pour nommer les saisons du MMR.
    private(set) var acts: [String: EvalAct] = [:]
    var currentAct: EvalAct? { acts.values.first(where: \.isCurrent) }
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
    var leaderboardPlatform: String = "pc"
    /// UUID de l'acte filtré dans le classement (vide = acte en cours).
    var leaderboardSeason: String = ""
    /// Objectif de rang de l'acte (tier visé + acte où il a été fixé).
    private(set) var seasonGoal: SeasonGoal?

    struct SeasonGoal: Codable, Hashable {
        let tier: Int
        let actID: String
        let setAt: Date
    }

    /// Matchs complets du compte, du plus récent au plus ancien (statistiques, récap).
    var evalMatchList: [EvalMatch] {
        matches.compactMap { evalMatches[$0.id] }
    }

    func setSeasonGoal(tier: Int) {
        guard let act = currentAct, let cache = personalCache else { return }
        let goal = SeasonGoal(tier: tier, actID: act.id, setAt: Date())
        seasonGoal = goal
        if let payload = ValorantPersonalCache.encode(goal) { Task { await cache.save(payload, key: "season_goal") } }
    }

    func loadSeasonGoal() async {
        guard let cache = personalCache,
              let result = await cache.read("season_goal", ttl: .infinity) else { return }
        seasonGoal = ValorantPersonalCache.decode(SeasonGoal.self, from: result.payload)
    }
    var openProfileDirectly: Bool = false
    var sortOfflineByLastSeen: Bool = true
    var socialActionMessage: String?

    private(set) var currentParty: ValorantParty?
    /// Rang en direct du compte Riot connecté (prioritaire sur HenrikDev).
    private(set) var liveRank: RiotLiveRank?
    /// Rang actuel affiché partout (profil, objectifs, détail de match).
    var currentTier: Int { profile?.tier ?? mmr.tier }
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

    /// Compte Riot connecté (page officielle Riot) : boutique, portefeuille, équipement, passe, groupe.
    let riot = RiotSession()
    /// Collection possédée et équipement modifiable du compte Riot connecté.
    let loadout: RiotLoadoutModel
    let favorites: RiotFavoritesModel
    /// Groupe en cours (glz) : prêt, public/privé, file, serveurs, codes, invitations.
    let party = RiotPartyModel()
    let chat = RiotChat()
    /// XP du compte et contrats d'agents.
    let contracts = RiotContractsModel()
    private(set) var offersEnd: Date?
    private(set) var accessoriesEnd: Date?
    private(set) var weeklyMissionsEnd: Date?
    private(set) var activeMissions: [RiotMission] = []
    private(set) var dailyMilestones: [Bool] = []
    private(set) var dailyEnd: Date?
    private(set) var isLoadingRiot = false

    /// Recharge les données du client Riot (si un compte Riot est connecté).
    func refreshRiot() async {
        guard riot.isLinked, !isLoadingRiot else { return }
        isLoadingRiot = true
        defer { isLoadingRiot = false }
        if !chat.isConnected { Task { await connectChat() } }
        if battlepassLevels.isEmpty { await loadBattlepass() }
        let snap = await RiotGameService.load(riot)
        wallet = snap.wallet
        storeOffers = snap.offers
        recordShop(snap.offers, accessories: snap.accessories)
        offersEnd = snap.offersEnd
        bundles = snap.bundles
        accessories = snap.accessories
        accessoriesEnd = snap.accessoriesEnd
        if !snap.title.isEmpty { equipmentTitle = snap.title }
        if !snap.cardID.isEmpty { equipmentBannerURL = "https://media.valorant-api.com/playercards/\(snap.cardID)/wideart.png" }
        equippedSprays = snap.sprays
        battlepassCurrentLevel = snap.battlepassLevel
        battlepassCurrentXP = snap.battlepassXP
        battlepassLevelXP = battlepassLevels.first { $0.level == snap.battlepassLevel + 1 }?.xpCost ?? 0
        weeklyMissionsEnd = snap.weeklyMissionsEnd
        activeMissions = snap.missions
        dailyMilestones = snap.dailyMilestones
        dailyEnd = snap.dailyEnd
        currentParty = snap.party
        isPlayerOnline = snap.party != nil
        if acts.isEmpty { await loadActs() }
        if let live = await RiotGameService.liveRank(riot, seasonID: currentAct?.id) {
            liveRank = live
            applyLiveRank()
        }
    }

    /// Remplace le rang HenrikDev par le rang en direct si le compte suivi est le compte Riot connecté.
    private func applyLiveRank() {
        guard let live = liveRank, let creds = riot.credentials, let current = profile,
              current.handle.lowercased() == "\(creds.gameName)#\(creds.tagLine)".lowercased() else { return }
        let peak = max(current.peakTier, live.tier)
        profile = ValorantProfile(
            handle: current.handle, cardURL: current.cardURL, bannerURL: current.bannerURL,
            tier: live.tier, rank: EvalRanks.name(live.tier), rr: live.rr, level: current.level,
            peakTier: peak, peakRank: EvalRanks.name(peak),
            leaderboardRank: live.leaderboardRank > 0 ? live.leaderboardRank : nil,
            actName: current.actName
        )
    }

    /// Après la connexion Riot : le compte connecté devient le compte suivi s'il n'y en a pas.
    func linkRiot(accessToken: String, idToken: String, expiresIn: Int) async {
        await riot.complete(accessToken: accessToken, idToken: idToken, expiresIn: expiresIn)
        if let creds = riot.credentials, !creds.gameName.isEmpty {
            save(name: creds.gameName, tag: creds.tagLine, apiKey: apiKey)
            await refresh()
        }
        await refreshRiot()
    }

    func unlinkRiot() async {
        await riot.signOut()
        storeOffers = []; bundles = []; accessories = []
        wallet = ValorantWallet(vp: 0, rp: 0, kc: 0)
        currentParty = nil
        isPlayerOnline = false
    }

    /// Amis ajoutés dans l'app (Riot ID résolu en PUUID) ; stockés dans Supabase.
    private var friendRecords: [FriendRecord] = []

    private struct FriendRecord: Codable, Hashable {
        let puuid: String
        var name: String
        var tag: String
        var card: String
        var tier: Int
        let addedAt: Date
    }

    // MARK: Passe de combat (calculs inchangés ; la progression perso reste à 0)

    var battlepassCurrentReward: ValorantBattlepassLevel? {
        battlepassLevels.first(where: { $0.level == min(55, battlepassCurrentLevel + 1) })
    }

    var battlepassCurrentTierProgressPercent: Int {
        guard battlepassLevelXP > 0 else { return 0 }
        return min(100, Int((Double(battlepassCurrentXP) / Double(battlepassLevelXP)) * 100))
    }

    var totalBattlepassXP: Int { battlepassLevels.reduce(0) { $0 + $1.xpCost } }

    var earnedBattlepassXP: Int {
        battlepassLevels.filter { $0.level <= battlepassCurrentLevel }.reduce(0) { $0 + $1.xpCost } + battlepassCurrentXP
    }

    var remainingBattlepassXP: Int { max(0, totalBattlepassXP - earnedBattlepassXP) }

    var battlepassCompletionPercent: Int {
        guard totalBattlepassXP > 0 else { return 0 }
        return max(0, min(100, Int((Double(earnedBattlepassXP) / Double(totalBattlepassXP)) * 100)))
    }

    var weeklyMissionsXP: Int { upcomingMissions.reduce(0) { $0 + $1.xpGrant } }
    var missionsReserveXP: Int { weeklyMissionsXP }
    var dailyPaliersMaxXP: Int { 0 }

    var avgXPPerMatch: Int {
        let scores = matches.prefix(20).compactMap(\.scoreValue)
        return scores.isEmpty ? 0 : scores.reduce(0, +) / scores.count
    }

    var matchesPerDay: Double {
        let recent = Array(matches.prefix(20))
        guard recent.count >= 2, let first = recent.last?.startedAt, let last = recent.first?.startedAt else { return 0 }
        let days = max(1.0, last.timeIntervalSince(first) / 86400.0)
        return (10 * Double(recent.count) / days).rounded() / 10
    }

    var remainingMatchesNeeded: Int {
        let netXP = max(0, remainingBattlepassXP - missionsReserveXP)
        guard avgXPPerMatch > 0 else { return 0 }
        return max(0, Int(ceil(Double(netXP) / Double(avgXPPerMatch * 4))))
    }

    var daysRemainingInAct: Int {
        guard let battlepassEndDate else { return 0 }
        return max(0, Int(ceil(battlepassEndDate.timeIntervalSince(Date()) / 86400.0)))
    }

    var requiredMatchesPerDay: Double {
        guard daysRemainingInAct > 0 else { return 0 }
        return max(0, (10 * Double(remainingMatchesNeeded) / Double(daysRemainingInAct)).rounded() / 10)
    }

    var isBattlepassFinished: Bool { battlepassCurrentLevel >= 55 }

    var estimatedCompletionDateFormatted: String {
        guard remainingMatchesNeeded > 0, matchesPerDay > 0 else { return "" }
        let days = Int(ceil(Double(remainingMatchesNeeded) / matchesPerDay))
        let date = Calendar.current.date(byAdding: .day, value: days, to: Date()) ?? Date()
        return date.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_FR")))
    }

    var battlepassTimeRemainingFormatted: String {
        guard let battlepassEndDate else { return "" }
        let diff = max(0, Int(battlepassEndDate.timeIntervalSince(Date())))
        return "\(diff / 86400)j \((diff % 86400) / 3600):\(String(format: "%02d", (diff % 3600) / 60)):\(String(format: "%02d", diff % 60))"
    }

    // MARK: Compteurs de réglages (par compte Riot)

    var userBookmarksCount: Int { bookmarkedPlayers.count }
    var playerSettingsCount: Int { snapshots.count }
    var appearanceProfilesCount: Int { loadout.profiles.count }
    var favoritePresetsCount: Int { setting("favoritePresetsCount") }

    func setBookmarksCount(_ count: Int) { setSetting("bookmarksCount", count) }
    func setPlayerSettingsCount(_ count: Int) { setSetting("playerSettingsCount", count) }
    func setAppearanceProfilesCount(_ count: Int) { setSetting("appearanceProfilesCount", count) }
    func setFavoritePresetsCount(_ count: Int) { setSetting("favoritePresetsCount", count) }

    private func setting(_ name: String) -> Int {
        isConfigured ? UserDefaults.standard.integer(forKey: accountSettingKey(name)) : 0
    }

    private func setSetting(_ name: String, _ value: Int) {
        guard isConfigured else { return }
        UserDefaults.standard.set(value, forKey: accountSettingKey(name))
        Task { await persistPersonalSettings() }
    }

    private func accountSettingKey(_ name: String) -> String {
        "ethone.valorant.\(api.auth.user?.id ?? "anonymous").\(nameStorage)#\(tag).\(name)"
    }

    private func loadPersonalSettings() async {
        guard let cache = personalCache,
              let result = await cache.read("settings", ttl: Self.settingsCacheTTL),
              let values = result.payload.objectValue else { return }
        for key in ["playerSettingsCount", "appearanceProfilesCount", "favoritePresetsCount"] {
            if let value = values[key]?.intValue { UserDefaults.standard.set(value, forKey: accountSettingKey(key)) }
        }
    }

    private func persistPersonalSettings() async {
        guard let cache = personalCache else { return }
        await cache.save(.object([
            "playerSettingsCount": .number(Double(playerSettingsCount)),
            "appearanceProfilesCount": .number(Double(appearanceProfilesCount)),
            "favoritePresetsCount": .number(Double(favoritePresetsCount))
        ]), key: "settings")
    }

    // MARK: Compte

    private(set) var tag: String = ""
    private(set) var apiKey: String = ""
    private var nameStorage = ""
    private static let nameKey = "ethone.valorant.name"
    private static let tagKey = "ethone.valorant.tag"
    private static let keychainKey = "henrik-api-key"

    var isConfigured: Bool { !nameStorage.isEmpty && !tag.isEmpty }
    var playerName: String { nameStorage }

    private var personalCache: ValorantPersonalCache? {
        guard isConfigured else { return nil }
        return ValorantPersonalCache(api: api, accountName: nameStorage, accountTag: tag)
    }

    init(api: APIClient) {
        self.api = api
        self.loadout = RiotLoadoutModel(api: api)
        self.favorites = RiotFavoritesModel(api: api)
        nameStorage = UserDefaults.standard.string(forKey: Self.nameKey) ?? ""
        tag = UserDefaults.standard.string(forKey: Self.tagKey) ?? ""
        if !nameStorage.isEmpty, !tag.isEmpty, !savedAccounts.contains("\(nameStorage)#\(tag)") {
            savedAccounts.append("\(nameStorage)#\(tag)")
            UserDefaults.standard.set(savedAccounts, forKey: Self.accountsKey)
        }
        if let data = Keychain.get(Self.keychainKey), let saved = String(data: data, encoding: .utf8) { apiKey = saved }
        syncAccountData()
    }

    /// Remet l'état du compte à zéro puis recharge le cache disque du compte actif.
    func syncAccountData() {
        matches = []
        evalMatches = [:]
        puuid = ""
        mmr = EvalMMR()
        profile = nil
        friends = []
        friendRecords = []
        historyRecords = []
        friendHistory = []
        bookmarkedPlayers = []
        recentSearches = []
        nameChanges = []
        socialActionMessage = nil
        errorMessage = nil
        currentParty = nil
        isPlayerOnline = false
        battlepassCurrentLevel = 0
        battlepassCurrentXP = 0
        battlepassLevelXP = 0
        equipmentBannerURL = ""
        equippedSprays = [nil, nil, nil, nil]
        guard isConfigured else { return }
        if let cached = DiskCache.read(AccountCache.self, key: accountCacheKey) {
            apply(account: cached.account)
            evalMatches = Dictionary(cached.matches.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            rebuildMatchList()
        }
    }

    // MARK: Comptes suivis

    private static let accountsKey = "ethone.valorant.accounts"
    private(set) var savedAccounts: [String] = UserDefaults.standard.stringArray(forKey: "ethone.valorant.accounts") ?? []

    func switchAccount(_ handle: String) {
        let parts = handle.split(separator: "#", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return }
        save(name: parts[0], tag: parts[1], apiKey: apiKey)
        Task { await refresh() }
    }

    func removeAccount(_ handle: String) {
        savedAccounts.removeAll { $0 == handle }
        UserDefaults.standard.set(savedAccounts, forKey: Self.accountsKey)
        guard handle == "\(nameStorage)#\(tag)" else { return }
        if let next = savedAccounts.first { switchAccount(next) } else { disconnect() }
    }

    func save(name: String, tag: String, apiKey: String) {
        nameStorage = name.trimmingCharacters(in: .whitespaces)
        self.tag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        let handle = "\(nameStorage)#\(self.tag)"
        if !nameStorage.isEmpty, !self.tag.isEmpty, !savedAccounts.contains(handle) {
            savedAccounts.append(handle)
            UserDefaults.standard.set(savedAccounts, forKey: Self.accountsKey)
        }
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
        syncAccountData()
    }

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

    // Groupe / présence : seul le client Riot les connaît, HenrikDev non.
    func refreshGroup() async {
        guard riot.isLinked else { currentParty = nil; isPlayerOnline = false; return }
        await party.load(riot)
        await contracts.load(riot)
    }

    func setPlayerOnline(_ online: Bool) {
        isPlayerOnline = false
    }

    // MARK: Rafraîchissement

    func refresh() async {
        guard isConfigured else { return }
        isLoading = true
        defer { isLoading = false }
        await loadPersonalSettings()
        await loadSocial()
        await loadActs()
        await loadSeasonGoal()
        await loadShopData()
        await loadSnapshots()
        await syncAndLoadMatches()
        await loadLeaderboard()
        await loadUpcomingMissions()
        await loadBattlepass()
        await refreshNameChanges()
        await refreshRiot()
    }

    // MARK: Matchs (Worker -> Supabase -> disque)

    private struct Account: Codable, Hashable {
        let puuid: String
        let name: String
        let tag: String
        let region: String?
        let level: Int?
        let card: String?
        let title: String?
        let tier: Int?
        let mmr: EvalMMR?
        let matchesSyncedAt: String?
    }

    private struct AccountCache: Codable {
        let account: Account
        let syncedAt: Date
        let matches: [EvalMatch]
    }

    private struct MatchRow: Decodable { let payload: EvalMatch }

    private var accountCacheKey: String {
        let identity = "\(api.auth.user?.id ?? "anonymous")|\(nameStorage)#\(tag)".lowercased()
        let encoded = Data(identity.utf8).base64EncodedString()
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "=", with: "")
        return "valorant-eval.\(encoded)"
    }

    /// Le Worker n'appelle HenrikDev qu'une fois par 10 min et par compte ; ici on ne
    /// redemande même pas au Worker avant 10 min, et on ne télécharge que les matchs absents du disque.
    private func syncAndLoadMatches(force: Bool = false) async {
        let cached = DiskCache.read(AccountCache.self, key: accountCacheKey)
        if !force, let cached, Date().timeIntervalSince(cached.syncedAt) < Self.syncInterval, !cached.matches.isEmpty {
            if profile == nil || puuid != cached.account.puuid {
                apply(account: cached.account)
                evalMatches = Dictionary(cached.matches.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
                rebuildMatchList()
            }
            return
        }
        let ownRiot = riot.credentials.map { "\($0.gameName)#\($0.tagLine)".lowercased() == "\(nameStorage)#\(tag)".lowercased() } ?? false
        if ownRiot, let account: Account = try? await api.worker("api/valorant/eval/sync", query: [
            URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag), URLQueryItem(name: "matches", value: "0")
        ]) {
            apply(account: account)
            if await loadRiotMatches(puuid: account.puuid) {
                let kept = matches.prefix(matchLimit).compactMap { evalMatches[$0.id] }
                evalMatches = Dictionary(kept.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
                DiskCache.write(AccountCache(account: account, syncedAt: Date(), matches: kept), key: accountCacheKey)
                errorMessage = nil
                return
            }
        }
        do {
            let account: Account = try await api.worker("api/valorant/eval/sync", query: [
                URLQueryItem(name: "name", value: nameStorage), URLQueryItem(name: "tag", value: tag)
            ])
            apply(account: account)
            let known = Set(evalMatches.keys)
            var query = [
                URLQueryItem(name: "puuids", value: "cs.{\(account.puuid)}"),
                URLQueryItem(name: "order", value: "started_at.desc"),
                URLQueryItem(name: "limit", value: String(matchLimit))
            ]
            if !known.isEmpty {
                query.append(URLQueryItem(name: "match_id", value: "not.in.(\(known.sorted().joined(separator: ",")))"))
            }
            let rows: [MatchRow] = try await api.list("ethone_valorant_matches", query: query)
            for row in rows { evalMatches[row.payload.id] = row.payload }
            rebuildMatchList()
            let kept = matches.prefix(matchLimit).compactMap { evalMatches[$0.id] }
            evalMatches = Dictionary(kept.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            DiskCache.write(AccountCache(account: account, syncedAt: Date(), matches: kept), key: accountCacheKey)
            errorMessage = nil
        } catch {
            if matches.isEmpty { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        }
    }

    func forceRefreshMatches() async { await syncAndLoadMatches(force: true) }

    private func loadRiotMatches(puuid: String) async -> Bool {
        guard let catalog = await RiotMatches.catalog(),
              let ids = try? await RiotMatches.history(riot, puuid: puuid, count: matchLimit), !ids.isEmpty else { return false }
        let missing = ids.filter { evalMatches[$0] == nil }
        let session = riot
        await withTaskGroup(of: EvalMatch?.self) { group in
            for id in missing {
                group.addTask { try? await RiotMatches.match(session, id: id, catalog: catalog) }
            }
            for await match in group {
                if let match { evalMatches[match.id] = match }
            }
        }
        guard ids.contains(where: { evalMatches[$0] != nil }) else { return false }
        rebuildMatchList()
        return true
    }

    private struct HistoryResult: Decodable { let stored: Int; let total: Int }

    /// Récupère 10 parties plus anciennes (Worker -> HenrikDev stored-matches -> Supabase).
    func loadMoreMatches() async {
        guard !puuid.isEmpty, !isLoadingMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        let page = matchLimit / 10 + 1
        do {
            let result: HistoryResult = try await api.worker("api/valorant/eval/history", query: [
                URLQueryItem(name: "puuid", value: puuid), URLQueryItem(name: "page", value: String(page))
            ])
            totalMatches = result.total
            matchLimit += 10
            UserDefaults.standard.set(matchLimit, forKey: Self.matchLimitKey)
            await syncAndLoadMatches(force: true)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: Profil d'un autre joueur

    struct PlayerSnapshot {
        let puuid: String
        let name: String
        let tag: String
        let level: Int
        let card: String
        let tier: Int
        let mmr: EvalMMR
        let matches: [EvalMatch]
        var cardURL: URL? { card.isEmpty ? nil : URL(string: "https://media.valorant-api.com/playercards/\(card)/smallart.png") }
        var bannerURL: URL? { card.isEmpty ? nil : URL(string: "https://media.valorant-api.com/playercards/\(card)/wideart.png") }
    }

    /// Profil d'un joueur quelconque : même chaîne bornée (Worker 10 min / compte, matchs dans Supabase).
    func loadPlayer(name: String, tag: String) async throws -> PlayerSnapshot {
        let account: Account = try await api.worker("api/valorant/eval/sync", query: [
            URLQueryItem(name: "name", value: name), URLQueryItem(name: "tag", value: tag)
        ])
        let rows: [MatchRow] = try await api.list("ethone_valorant_matches", query: [
            URLQueryItem(name: "puuids", value: "cs.{\(account.puuid)}"),
            URLQueryItem(name: "order", value: "started_at.desc"),
            URLQueryItem(name: "limit", value: "20")
        ])
        return PlayerSnapshot(puuid: account.puuid, name: account.name, tag: account.tag, level: account.level ?? 0,
                              card: account.card ?? "", tier: account.mmr?.tier ?? account.tier ?? 0,
                              mmr: account.mmr ?? EvalMMR(), matches: rows.map(\.payload))
    }

    func isFriend(puuid: String) -> Bool { friendRecords.contains { $0.puuid == puuid } }

    // MARK: Snapshots des paramètres en jeu

    struct SettingsSnapshot: Codable, Identifiable, Hashable {
        let id: UUID
        var name: String
        let account: String
        let data: String
        let createdAt: Date
        var usedAt: Date?
    }

    private(set) var snapshots: [SettingsSnapshot] = []

    /// Rangées dans une ligne Supabase commune à tous les comptes suivis.
    private var snapshotCache: ValorantPersonalCache { ValorantPersonalCache(api: api, accountName: "_snapshots", accountTag: "_") }

    func loadSnapshots() async {
        guard let r = await snapshotCache.read("snapshots", ttl: .infinity) else { return }
        snapshots = ValorantPersonalCache.decode([SettingsSnapshot].self, from: r.payload) ?? []
    }

    private func saveSnapshots() {
        guard let payload = ValorantPersonalCache.encode(snapshots) else { return }
        let cache = snapshotCache
        Task { await cache.save(payload, key: "snapshots") }
    }

    func createSnapshot(name: String) async throws {
        let data = try await riot.playerSettings()
        let creds = riot.credentials
        let account = creds.map { "\($0.gameName)#\($0.tagLine)" } ?? "\(nameStorage)#\(tag)"
        snapshots.insert(SettingsSnapshot(id: UUID(), name: name, account: account, data: data, createdAt: Date(), usedAt: nil), at: 0)
        saveSnapshots()
    }

    func applySnapshot(_ snapshot: SettingsSnapshot) async throws {
        try await riot.applyPlayerSettings(snapshot.data)
        if let i = snapshots.firstIndex(where: { $0.id == snapshot.id }) { snapshots[i].usedAt = Date() }
        saveSnapshots()
    }

    func deleteSnapshot(_ snapshot: SettingsSnapshot) {
        snapshots.removeAll { $0.id == snapshot.id }
        saveSnapshots()
    }

    // MARK: Historique de la boutique et liste de souhaits

    struct ShopDay: Codable, Hashable, Identifiable {
        let day: Date
        let offers: [ValorantDailySkinOffer]
        var accessories: [ValorantAccessoryItem]? = nil
        var id: Date { day }
    }

    struct WishItem: Codable, Hashable, Identifiable {
        let id: String
        let name: String
        let icon: String
    }

    private(set) var shopHistory: [ShopDay] = []
    private(set) var wishlist: [WishItem] = []

    private func loadShopData() async {
        guard let cache = personalCache else { return }
        if let r = await cache.read("shop_history", ttl: .infinity) {
            shopHistory = ValorantPersonalCache.decode([ShopDay].self, from: r.payload) ?? []
        }
        if let r = await cache.read("wishlist", ttl: .infinity) {
            wishlist = ValorantPersonalCache.decode([WishItem].self, from: r.payload) ?? []
        }
        storeHistoryCount = Set(shopHistory.flatMap { $0.offers.map(\.id) }).count
        wishlistCount = wishlist.count
    }

    /// Mémorise les offres du jour (une entrée par jour, 120 jours max).
    private func recordShop(_ offers: [ValorantDailySkinOffer], accessories: [ValorantAccessoryItem]) {
        guard !offers.isEmpty, let cache = personalCache else { return }
        let day = Calendar.current.startOfDay(for: Date())
        if let index = shopHistory.firstIndex(where: { $0.day == day }) {
            guard shopHistory[index].accessories == nil, !accessories.isEmpty else { return }
            shopHistory[index].accessories = accessories
            if let payload = ValorantPersonalCache.encode(shopHistory) { Task { await cache.save(payload, key: "shop_history") } }
            return
        }
        shopHistory.insert(ShopDay(day: day, offers: offers, accessories: accessories.isEmpty ? nil : accessories), at: 0)
        shopHistory = Array(shopHistory.prefix(120))
        storeHistoryCount = Set(shopHistory.flatMap { $0.offers.map(\.id) }).count
        if let payload = ValorantPersonalCache.encode(shopHistory) { Task { await cache.save(payload, key: "shop_history") } }
    }

    func isWished(_ id: String) -> Bool { wishlist.contains { $0.id.lowercased() == id.lowercased() } }

    func toggleWish(id: String, name: String, icon: String) {
        if let i = wishlist.firstIndex(where: { $0.id.lowercased() == id.lowercased() }) {
            wishlist.remove(at: i)
        } else {
            wishlist.insert(WishItem(id: id.lowercased(), name: name, icon: icon), at: 0)
        }
        wishlistCount = wishlist.count
        guard let cache = personalCache, let payload = ValorantPersonalCache.encode(wishlist) else { return }
        Task { await cache.save(payload, key: "wishlist") }
    }

    private func rebuildMatchList() {
        matches = evalMatches.values
            .compactMap { $0.summary(for: puuid) }
            .sorted { ($0.startedAt ?? .distantPast) > ($1.startedAt ?? .distantPast) }
    }

    private func apply(account: Account) {
        puuid = account.puuid
        if let accountMMR = account.mmr { mmr = accountMMR }
        let tier = mmr.tier > 0 ? mmr.tier : (account.tier ?? 0)
        let card = account.card ?? ""
        profile = ValorantProfile(
            handle: "\(account.name)#\(account.tag)",
            cardURL: card.isEmpty ? nil : URL(string: "https://media.valorant-api.com/playercards/\(card)/smallart.png"),
            bannerURL: card.isEmpty ? nil : URL(string: "https://media.valorant-api.com/playercards/\(card)/wideart.png"),
            tier: tier,
            rank: tier > 0 ? EvalRanks.name(tier) : "",
            rr: mmr.rr,
            level: account.level ?? 0,
            peakTier: mmr.peakTier,
            peakRank: mmr.peakTier > 0 ? EvalRanks.name(mmr.peakTier) : "",
            leaderboardRank: mmr.leaderboardRank > 0 ? mmr.leaderboardRank : profile?.leaderboardRank,
            actName: currentAct?.name ?? ""
        )
        equipmentBannerURL = card.isEmpty ? "" : "https://media.valorant-api.com/playercards/\(card)/wideart.png"
        applyLiveRank()
        if equipmentTitle.isEmpty, let titleID = account.title, !titleID.isEmpty {
            Task { if let text = await SkinCatalog.shared.title(titleID), equipmentTitle.isEmpty { equipmentTitle = text } }
        }
    }

    func actName(_ seasonID: String) -> String { acts[seasonID.lowercased()]?.name ?? "" }

    private struct ActsCache: Codable {
        struct Act: Codable { let id: String; let name: String; let start: Date; let end: Date }
        let fetchedAt: Date
        let acts: [Act]
    }

    /// Noms et dates des actes : catalogue public, une fois par jour.
    private func loadActs() async {
        let key = "valorant-api.acts.fr"
        var cache = DiskCache.read(ActsCache.self, key: key)
        if cache == nil || Date().timeIntervalSince(cache!.fetchedAt) > 86400 {
            struct Season: Decodable { let uuid: String; let displayName: String; let type: String?; let startTime: String?; let endTime: String?; let parentUuid: String? }
            struct Page: Decodable { let data: [Season] }
            if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/seasons?language=fr-FR")!),
               let page = try? JSONDecoder().decode(Page.self, from: data) {
                let byID = Dictionary(page.data.map { ($0.uuid, $0) }, uniquingKeysWith: { a, _ in a })
                let list = page.data.compactMap { s -> ActsCache.Act? in
                    guard s.type?.hasSuffix("Act") == true,
                          let start = s.startTime.flatMap(ISODate.parse), let end = s.endTime.flatMap(ISODate.parse) else { return nil }
                    let episode = s.parentUuid.flatMap { byID[$0]?.displayName } ?? ""
                    return ActsCache.Act(id: s.uuid, name: episode.isEmpty ? s.displayName : "\(episode) — \(s.displayName)", start: start, end: end)
                }
                if !list.isEmpty {
                    cache = ActsCache(fetchedAt: Date(), acts: list)
                    DiskCache.write(cache!, key: key)
                }
            }
        }
        guard let cache else { return }
        acts = Dictionary(cache.acts.map { ($0.id.lowercased(), EvalAct(id: $0.id, name: $0.name, start: $0.start, end: $0.end)) }, uniquingKeysWith: { a, _ in a })
        battlepassEndDate = currentAct?.end
        if let current = currentAct { battlepassTitle = current.name }
        if profile != nil { profile?.actName = currentAct?.name ?? "" }
    }

    /// Match complet pour l'écran de détail (disque d'abord, sinon Supabase).
    func riotEnriched(_ match: EvalMatch) async -> EvalMatch? {
        guard riot.isLinked, match.kills.allSatisfy({ $0.vp == nil }),
              let catalog = await RiotMatches.catalog(),
              let loaded = try? await RiotMatches.match(riot, id: match.id, catalog: catalog),
              loaded.kills.contains(where: { $0.vp != nil }) else { return nil }
        let known = Dictionary(match.players.filter { !$0.name.isEmpty }.map { ($0.puuid.lowercased(), (name: $0.name, tag: $0.tag)) }, uniquingKeysWith: { a, _ in a })
        let fresh = RiotMatches.withPlayers(loaded, names: known, tiers: [:])
        if evalMatches[match.id] != nil {
            evalMatches[match.id] = fresh
            if let cached = DiskCache.read(AccountCache.self, key: accountCacheKey) {
                let updated = cached.matches.map { $0.id == fresh.id ? fresh : $0 }
                DiskCache.write(AccountCache(account: cached.account, syncedAt: cached.syncedAt, matches: updated), key: accountCacheKey)
            }
        }
        return fresh
    }

    private var playerTierCache: [String: (tier: Int, at: Date)] = [:]

    func currentTiers(for puuids: [String]) async -> [String: Int] {
        guard riot.isLinked else { return [:] }
        var result: [String: Int] = [:]
        var missing: [String] = []
        for id in Set(puuids) {
            if let hit = playerTierCache[id], Date().timeIntervalSince(hit.at) < 3600 { result[id] = hit.tier } else { missing.append(id) }
        }
        let session = riot
        let season = currentAct?.id.lowercased()
        await withTaskGroup(of: (String, Int).self) { group in
            for id in missing {
                group.addTask {
                    guard let raw = try? await session.gameData("/mmr/v1/players/\(id)"),
                          let json = try? JSONDecoder().decode(JSONValue.self, from: raw) else { return (id, 0) }
                    let latest = json["LatestCompetitiveUpdate"]?["TierAfterUpdate"]?.intValue ?? 0
                    if latest > 0 { return (id, latest) }
                    let seasons = json["QueueSkills"]?["competitive"]?["SeasonalInfoBySeasonID"]?.objectValue ?? [:]
                    let info = season.flatMap { s in seasons.first { $0.key.lowercased() == s }?.value }
                    return (id, info?["CompetitiveTier"]?.intValue ?? 0)
                }
            }
            for await (id, tier) in group {
                playerTierCache[id] = (tier, Date())
                result[id] = tier
            }
        }
        return result
    }

    func evalMatch(id: String) async -> EvalMatch? {
        if let match = evalMatches[id] { return match }
        let rows: [MatchRow]? = try? await api.list("ethone_valorant_matches", query: [
            URLQueryItem(name: "match_id", value: "eq.\(id)"), URLQueryItem(name: "limit", value: "1")
        ])
        return rows?.first?.payload
    }

    /// Matchs d'un autre joueur (recherche / amis) : même chaîne, sans cache disque.
    func fetchMatches(riotName name: String, tag: String) async throws -> (puuid: String, matches: [EvalMatch]) {
        let account: Account = try await api.worker("api/valorant/eval/sync", query: [
            URLQueryItem(name: "name", value: name), URLQueryItem(name: "tag", value: tag)
        ])
        let rows: [MatchRow] = try await api.list("ethone_valorant_matches", query: [
            URLQueryItem(name: "puuids", value: "cs.{\(account.puuid)}"),
            URLQueryItem(name: "order", value: "started_at.desc"),
            URLQueryItem(name: "limit", value: "20")
        ])
        return (account.puuid, rows.map(\.payload))
    }

    // MARK: Joueurs (signets + recherches) et amis — stockés dans Supabase

    private struct HistoryRecord: Codable, Hashable {
        let puuid: String
        let name: String
        let tag: String
        let removed: Bool
        let at: Date
    }

    /// Ajouts / retraits faits dans l'app (la liste d'amis Riot n'est pas accessible).
    private var historyRecords: [HistoryRecord] = []

    private struct SocialPayload: Codable {
        var bookmarks: [ValorantSavedPlayer] = []
        var recent: [ValorantSavedPlayer] = []
        var friends: [FriendRecord] = []
        var history: [HistoryRecord]? = []
    }

    private func rebuildHistory() {
        friendHistory = historyRecords.sorted { $0.at > $1.at }.map { r in
            ValorantFriendHistoryEvent(
                id: "\(r.puuid)|\(r.at.timeIntervalSince1970)", name: r.name, tag: r.tag,
                type: r.removed ? .removed : .added,
                timestampText: r.at.formatted(.relative(presentation: .named).locale(Locale(identifier: "fr_FR")))
            )
        }
    }

    private func loadSocial() async {
        guard let cache = personalCache,
              let result = await cache.read("social", ttl: .infinity),
              let social = ValorantPersonalCache.decode(SocialPayload.self, from: result.payload) else { return }
        bookmarkedPlayers = social.bookmarks
        recentSearches = social.recent
        friendRecords = social.friends
        historyRecords = social.history ?? []
        rebuildFriends()
        rebuildHistory()
    }

    private func saveSocial() {
        guard let cache = personalCache,
              let payload = ValorantPersonalCache.encode(SocialPayload(bookmarks: bookmarkedPlayers, recent: recentSearches, friends: friendRecords, history: Array(historyRecords.suffix(200)))) else { return }
        Task { await cache.save(payload, key: "social") }
    }

    func loadBookmarksAndSearches() {
        Task { await loadSocial() }
    }

    func toggleBookmark(player: ValorantSavedPlayer) {
        if let index = bookmarkedPlayers.firstIndex(where: { $0.id == player.id }) {
            bookmarkedPlayers.remove(at: index)
        } else {
            bookmarkedPlayers.insert(player, at: 0)
        }
        saveSocial()
    }

    func removeBookmark(id: String) {
        bookmarkedPlayers.removeAll(where: { $0.id == id })
        saveSocial()
    }

    func removeRecentSearch(id: String) {
        recentSearches.removeAll(where: { $0.id == id })
        saveSocial()
    }

    func clearRecentSearches() {
        recentSearches.removeAll()
        saveSocial()
    }

    private static func splitRiotID(_ riotId: String) throws -> (String, String) {
        let parts = riotId.trimmingCharacters(in: .whitespaces).split(separator: "#", maxSplits: 1)
        guard parts.count == 2 else { throw APIError.http(status: 400, code: nil, message: "Format invalide. Utilisez Nom#Tag.") }
        return (String(parts[0]).trimmingCharacters(in: .whitespaces), String(parts[1]).trimmingCharacters(in: .whitespaces))
    }

    private func resolve(name: String, tag: String) async throws -> Account {
        try await api.worker("api/valorant/eval/sync", query: [
            URLQueryItem(name: "name", value: name), URLQueryItem(name: "tag", value: tag), URLQueryItem(name: "matches", value: "0")
        ])
    }

    func searchPlayer(riotId: String) async throws -> ValorantSavedPlayer {
        let (name, tag) = try Self.splitRiotID(riotId)
        let account = try await resolve(name: name, tag: tag)
        let card = account.card ?? ""
        let saved = ValorantSavedPlayer(
            id: account.puuid, name: account.name, tag: account.tag,
            level: account.level ?? 0, tier: account.tier ?? 0,
            cardURL: card.isEmpty ? nil : "https://media.valorant-api.com/playercards/\(card)/smallart.png",
            title: nil
        )
        recentSearches.removeAll(where: { $0.id == saved.id })
        recentSearches.insert(saved, at: 0)
        recentSearches = Array(recentSearches.prefix(30))
        saveSocial()
        return saved
    }

    func sendFriendRequest(name: String, tag: String) {
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanTag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        guard !cleanName.isEmpty, !cleanTag.isEmpty else {
            socialActionMessage = "Saisissez un Riot ID complet au format Nom#Tag."
            return
        }
        Task {
            do {
                let account = try await resolve(name: cleanName, tag: cleanTag)
                guard !friendRecords.contains(where: { $0.puuid == account.puuid }) else {
                    socialActionMessage = "\(account.name)#\(account.tag) est déjà dans vos amis."
                    return
                }
                friendRecords.insert(FriendRecord(puuid: account.puuid, name: account.name, tag: account.tag,
                                                  card: account.card ?? "", tier: account.tier ?? 0, addedAt: Date()), at: 0)
                historyRecords.append(HistoryRecord(puuid: account.puuid, name: account.name, tag: account.tag, removed: false, at: Date()))
                rebuildFriends()
                rebuildHistory()
                saveSocial()
                socialActionMessage = "\(account.name)#\(account.tag) a été ajouté à vos amis."
                await refreshNameChanges()
            } catch {
                socialActionMessage = "Riot ID introuvable : \(cleanName)#\(cleanTag)."
            }
        }
    }

    func removeFriend(id: String) {
        if let record = friendRecords.first(where: { $0.puuid == id }) {
            historyRecords.append(HistoryRecord(puuid: record.puuid, name: record.name, tag: record.tag, removed: true, at: Date()))
        }
        friendRecords.removeAll(where: { $0.puuid == id })
        rebuildFriends()
        rebuildHistory()
        saveSocial()
        nameChanges.removeAll(where: { $0.id.hasPrefix(id) })
    }

    /// Met à jour le Riot ID des amis (le Worker ne rappelle HenrikDev qu'une fois par 24 h et par joueur).
    func refreshFriends() async {
        guard !friendRecords.isEmpty else { return }
        for index in friendRecords.indices {
            let record = friendRecords[index]
            guard let account: Account = try? await api.worker("api/valorant/eval/sync", query: [
                URLQueryItem(name: "puuid", value: record.puuid), URLQueryItem(name: "matches", value: "0")
            ]) else { continue }
            friendRecords[index].name = account.name
            friendRecords[index].tag = account.tag
            friendRecords[index].card = account.card ?? record.card
            friendRecords[index].tier = account.tier ?? record.tier
        }
        rebuildFriends()
        saveSocial()
        await refreshNameChanges()
    }

    func connectChat() async {
        guard riot.isLinked else { return }
        await chat.connect(riot)
        rebuildFriends()
        await logRiotFriendNames()
    }

    func chatChanged() {
        rebuildFriends()
    }

    private struct RiotNameEntry: Codable {
        let puuid: String
        let name: String
        let tag: String
        let seenAt: Date
    }

    private var riotNameLog: [RiotNameEntry] = []

    private func logRiotFriendNames() async {
        guard let cache = personalCache, !chat.friends.isEmpty else { return }
        if riotNameLog.isEmpty, let r = await cache.read("riot_name_log", ttl: .infinity) {
            riotNameLog = ValorantPersonalCache.decode([RiotNameEntry].self, from: r.payload) ?? []
        }
        var latest: [String: RiotNameEntry] = [:]
        for entry in riotNameLog where (latest[entry.puuid]?.seenAt ?? .distantPast) <= entry.seenAt { latest[entry.puuid] = entry }
        var changed = false
        for friend in chat.friends {
            if let last = latest[friend.id], last.name == friend.name, last.tag == friend.tag { continue }
            riotNameLog.append(RiotNameEntry(puuid: friend.id, name: friend.name, tag: friend.tag, seenAt: Date()))
            changed = true
        }
        guard changed else { return }
        if let payload = ValorantPersonalCache.encode(riotNameLog) { await cache.save(payload, key: "riot_name_log") }
        await refreshNameChanges()
    }

    private func rebuildFriends() {
        if chat.isConnected || !chat.friends.isEmpty {
            friends = chat.friends.map { friend in
                let p = friend.presence
                let inGame = p?.state == "INGAME"
                let stateText: String? = {
                    guard let p, p.inValorant else { return nil }
                    switch p.state {
                    case "INGAME": return nil
                    case "PREGAME": return "Sélection d’agent"
                    default: return p.isIdle ? "Absent" : "Dans les menus"
                    }
                }()
                return ValorantFriend(
                    id: friend.id, name: friend.name, tag: friend.tag,
                    avatarURL: (p?.cardID).flatMap { $0.isEmpty ? nil : "https://media.valorant-api.com/playercards/\($0)/smallart.png" },
                    isOnline: p != nil, isInGame: inGame, isPartyLeader: false,
                    partyCurrent: p?.partySize ?? 1, partyMax: p?.maxPartySize ?? 5,
                    queueState: stateText,
                    gameMode: (p?.queueID).flatMap { $0.isEmpty ? nil : RiotPartyModel.queueName($0) },
                    map: (p?.mapPath).flatMap { chat.mapName($0) },
                    scoreRounds: inGame ? "\(p?.allyScore ?? 0) — \(p?.enemyScore ?? 0)" : nil,
                    tierNumber: p?.tier ?? 0,
                    otherPartyMembersCount: max(0, (p?.partySize ?? 1) - 1),
                    lastOnlineText: nil, lastOnlineSecondsAgo: Int.max,
                    partyID: (p?.partyID).flatMap { $0.isEmpty ? nil : $0 }
                )
            }
            return
        }
        friends = friendRecords.map { r in
            ValorantFriend(
                id: r.puuid, name: r.name, tag: r.tag,
                avatarURL: r.card.isEmpty ? nil : "https://media.valorant-api.com/playercards/\(r.card)/smallart.png",
                isOnline: false, isInGame: false, isPartyLeader: false, partyCurrent: 0, partyMax: 5,
                gameMode: nil, map: nil, scoreRounds: nil, tierNumber: r.tier,
                otherPartyMembersCount: 0, lastOnlineText: nil, lastOnlineSecondsAgo: Int.max
            )
        }
    }

    // MARK: Historique des pseudos (amis uniquement)

    private struct NameRow: Decodable {
        let puuid: String
        let name: String
        let tag: String
        let first_seen_at: String
    }

    func loadNameChanges() {
        Task { await refreshNameChanges() }
    }

    func refreshNameChanges() async {
        let ids = friendRecords.map(\.puuid)
        var rows: [NameRow] = []
        if !ids.isEmpty, let remote: [NameRow] = try? await api.list("ethone_valorant_name_history", query: [
            URLQueryItem(name: "puuid", value: "in.(\(ids.joined(separator: ",")))"),
            URLQueryItem(name: "order", value: "first_seen_at.desc")
        ]) { rows = remote }
        let iso = ISO8601DateFormatter()
        rows += riotNameLog.map { NameRow(puuid: $0.puuid, name: $0.name, tag: $0.tag, first_seen_at: iso.string(from: $0.seenAt)) }
        rows.sort { $0.first_seen_at > $1.first_seen_at }
        guard !rows.isEmpty else { nameChanges = []; return }
        var changes: [ValorantNameChange] = []
        for (puuid, history) in Dictionary(grouping: rows, by: \.puuid) {
            // history est trié du plus récent au plus ancien : chaque paire = un changement.
            for (current, previous) in zip(history, history.dropFirst()) where current.name != previous.name || current.tag != previous.tag {
                changes.append(ValorantNameChange(
                    id: "\(puuid)|\(current.name)#\(current.tag)",
                    currentName: current.name, currentTag: current.tag,
                    previousName: previous.name, previousTag: previous.tag,
                    dateText: Self.relativeText(ISODate.parse(current.first_seen_at))
                ))
            }
        }
        let order = Dictionary(rows.map { ("\($0.puuid)|\($0.name)#\($0.tag)", $0.first_seen_at) }, uniquingKeysWith: { max($0, $1) })
        var seenIDs = Set<String>()
        nameChanges = changes.filter { seenIDs.insert($0.id).inserted }.sorted { (order[$0.id] ?? "") > (order[$1.id] ?? "") }
    }

    static func relativeText(_ date: Date?) -> String {
        guard let date else { return "" }
        let seconds = Int(Date().timeIntervalSince(date))
        if seconds < 3600 { return "il y a \(max(1, seconds / 60))min" }
        if seconds < 86400 { return "il y a \(seconds / 3600)h \((seconds % 3600) / 60)min" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "fr_FR")
        formatter.dateFormat = "dd/MM/yy · HH:mm"
        return formatter.string(from: date)
    }

    // MARK: Classement (HenrikDev via Worker, déjà mis en cache côté Worker)

    func loadLeaderboard(region: String? = nil) async {
        if let region, !region.isEmpty { leaderboardRegion = region }
        let activeRegion = leaderboardRegion
        let cache = personalCache
        let boardKey = "leaderboard_\(activeRegion)_\(leaderboardPlatform)_\(leaderboardSeason)"
        if let cached = await cache?.read(boardKey, ttl: Self.leaderboardCacheTTL) {
            applyLeaderboard(cached.payload)
            if !cached.isStale { return }
        }
        do {
            var boardQuery = [
                URLQueryItem(name: "region", value: activeRegion),
                URLQueryItem(name: "platform", value: leaderboardPlatform),
                URLQueryItem(name: "startIndex", value: "1"),
                URLQueryItem(name: "size", value: "50")
            ]
            if !leaderboardSeason.isEmpty { boardQuery.append(URLQueryItem(name: "season", value: leaderboardSeason)) }
            let payload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: boardQuery)
            applyLeaderboard(payload)
            if let cache { await cache.save(payload, key: boardKey) }
            guard isConfigured else { return }
            let ownPayload: JSONValue = try await api.worker("api/stats/valorant-leaderboard", query: [
                URLQueryItem(name: "region", value: activeRegion),
                URLQueryItem(name: "platform", value: "pc"),
                URLQueryItem(name: "size", value: "1"),
                URLQueryItem(name: "name", value: nameStorage),
                URLQueryItem(name: "tag", value: tag)
            ])
            if let own = (ownPayload["players"]?.arrayValue ?? []).compactMap(Self.convertLeaderboardEntry).first, own.leaderboardRank > 0 {
                profile?.leaderboardRank = own.leaderboardRank
            }
        } catch {
            if leaderboard.isEmpty { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
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
        return ValorantLeaderboardEntry(
            id: "\(raw["leaderboardRank"]?.intValue ?? 0)-\(name)-\(tag)",
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

    // MARK: Catalogues valorant-api.com (données publiques du jeu)

    func loadUpcomingMissions() async {
        guard isConfigured else { return }
        let cache = personalCache
        if acts.isEmpty { await loadActs() }
        await MissionObjectives.load()
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
        } catch {}
    }

    @discardableResult
    private func applyMissions(_ payload: JSONValue) -> Bool {
        let raw = payload.arrayValue ?? payload["data"]?.arrayValue ?? []
        // Seulement les hebdomadaires pas encore actives de l'acte en cours (dates valorant-api).
        let now = Date()
        let actEnd = currentAct?.end
        let parsed = raw.compactMap { m -> ValorantMissionItem? in
            guard let id = m["uuid"]?.stringValue,
                  let title = m["title"]?.stringValue, !title.isEmpty,
                  let xp = m["xpGrant"]?.intValue,
                  let target = m["progressToComplete"]?.intValue,
                  m["type"]?.stringValue?.hasSuffix("Weekly") == true,
                  let start = m["activationDate"]?.stringValue.flatMap(ISODate.parse),
                  start > now, actEnd.map({ start < $0 }) ?? true else { return nil }
            let objective = m["objectives"]?.arrayValue?.first?["objectiveUuid"]?.stringValue
            return ValorantMissionItem(id: id, title: MissionObjectives.text(objective: objective, value: target, fallback: title),
                                       type: "Hebdomadaire", xpGrant: xp, progressToComplete: target, activates: start)
        }
        upcomingMissions = parsed.sorted { ($0.activates ?? .distantFuture) < ($1.activates ?? .distantFuture) }
        return !raw.isEmpty
    }

    func loadBattlepass() async {
        guard isConfigured else { return }
        // Passe de l'acte en cours (l'identifiant change à chaque acte).
        if acts.isEmpty { await loadActs() }
        if let catalog = await RiotContractCatalog.load(), let current = catalog.battlepass(actID: currentAct?.id) {
            RiotGameService.battlepassContract = current.id
        }
        let contractID = RiotGameService.battlepassContract
        let cache = personalCache
        let cached = await cache?.read("battlepass.\(contractID)", ttl: Self.battlepassCacheTTL)
        if let payload = cached?.payload, applyBattlepass(payload), cached?.isStale == false {
            battlepassLevels = await BattlepassRewardResolver.resolve(battlepassLevels)
            return
        }
        do {
            var req = URLRequest(url: URL(string: "https://valorant-api.com/v1/contracts/\(contractID)?language=fr-FR")!)
            req.timeoutInterval = 10
            let (data, http) = try await HTTP.send(req)
            guard (200..<300).contains(http.statusCode) else { return }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            _ = applyBattlepass(root)
            battlepassLevels = await BattlepassRewardResolver.resolve(battlepassLevels)
            if let cache, let payload = root["data"] { await cache.save(payload, key: "battlepass.\(contractID)") }
        } catch {}
    }

    @discardableResult
    private func applyBattlepass(_ payload: JSONValue) -> Bool {
        let data = payload["data"] ?? payload
        battlepassTitle = data["displayName"]?.stringValue ?? ""
        var levels: [ValorantBattlepassLevel] = []
        for (c, chapter) in (data["content"]?["chapters"]?.arrayValue ?? []).enumerated() {
            for level in chapter["levels"]?.arrayValue ?? [] {
                let reward = level["reward"]
                let n = levels.count + 1
                levels.append(ValorantBattlepassLevel(
                    id: "\(n)", chapter: c + 1, level: n, name: "",
                    rewardType: reward?["type"]?.stringValue ?? "", rewardUUID: reward?["uuid"]?.stringValue ?? "",
                    iconURL: "", xpCost: level["xp"]?.intValue ?? 0,
                    isFree: chapter["isEpilogue"]?.boolValue ?? false
                ))
            }
        }
        if !levels.isEmpty { battlepassLevels = levels }
        return !battlepassTitle.isEmpty
    }

    // MARK: Utilitaires conservés pour les autres écrans

    static func performanceScore(_ player: JSONValue) -> Int? {
        let candidates = [player["stats"]?["performance_score"], player["stats"]?["performanceScore"], player["performance_score"], player["performanceScore"]]
        for candidate in candidates {
            let number = candidate?.doubleValue ?? candidate?.stringValue.flatMap(Double.init)
            if let number, number >= 0, number <= Double(ScoringSystem.performanceMax) { return Int(number.rounded()) }
        }
        return nil
    }
}
