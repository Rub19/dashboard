import Foundation
import SwiftUI
import WebKit

// Connexion au compte Riot comme VALPAW : l'utilisateur se connecte sur la page officielle
// auth.riotgames.com dans une WebView ; le mot de passe ne passe jamais par l'app ni par nos
// serveurs. Les jetons restent dans le Keychain et les API de jeu (boutique, portefeuille,
// équipement, contrats, groupe) sont appelées directement depuis l'iPhone.
// API non officielle : Riot peut la modifier ou la bloquer à tout moment.

enum RiotAuthURL {
    static let authorize = URL(string: "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid")!

    /// Jetons contenus dans le fragment de la redirection vers playvalorant.com/opt_in.
    static func tokens(from url: URL) -> (access: String, id: String, expiresIn: Int)? {
        guard url.host?.contains("playvalorant.com") == true, let fragment = url.fragment else { return nil }
        var values: [String: String] = [:]
        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
            if parts.count == 2 { values[parts[0]] = parts[1].removingPercentEncoding ?? parts[1] }
        }
        guard let access = values["access_token"], let id = values["id_token"] else { return nil }
        return (access, id, Int(values["expires_in"] ?? "") ?? 3600)
    }
}

/// WebView de connexion Riot (cookies persistants : la reconnexion suivante est silencieuse).
struct RiotLoginView: UIViewRepresentable {
    /// Efface la session Riot du WebView avant d'ouvrir (ajout d'un autre compte).
    var fresh = false
    var onTokens: (String, String, Int) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onTokens: onTokens) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        if fresh || UserDefaults.standard.bool(forKey: "eval.clearWebLoginOnOpen") {
            Task { @MainActor in
                await RiotWebData.clear()
                view.load(URLRequest(url: RiotAuthURL.authorize))
            }
        } else {
            view.load(URLRequest(url: RiotAuthURL.authorize))
        }
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate {
        let onTokens: (String, String, Int) -> Void
        private var retried = false
        init(onTokens: @escaping (String, String, Int) -> Void) { self.onTokens = onTokens }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard !retried, webView.url?.host == "auth.riotgames.com" else { return }
            retried = true
            Task { @MainActor in
                await RiotWebData.clear()
                webView.load(URLRequest(url: RiotAuthURL.authorize))
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, let tokens = RiotAuthURL.tokens(from: url) {
                decisionHandler(.cancel)
                onTokens(tokens.access, tokens.id, tokens.expiresIn)
                return
            }
            decisionHandler(.allow)
        }
    }
}

/// Reconnexion silencieuse : recharge la page d'autorisation avec les cookies Riot existants.
@MainActor
private final class RiotSilentAuth: NSObject, WKNavigationDelegate {
    private var webView: WKWebView?
    private var continuation: CheckedContinuation<(String, String, Int)?, Never>?

    func run() async -> (String, String, Int)? {
        await withCheckedContinuation { continuation in
            self.continuation = continuation
            let config = WKWebViewConfiguration()
            config.websiteDataStore = .default()
            let view = WKWebView(frame: .zero, configuration: config)
            view.navigationDelegate = self
            webView = view
            view.load(URLRequest(url: RiotAuthURL.authorize))
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(12))
                self.finish(nil)
            }
        }
    }

    private func finish(_ value: (String, String, Int)?) {
        continuation?.resume(returning: value)
        continuation = nil
        webView?.stopLoading()
        webView = nil
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, let tokens = RiotAuthURL.tokens(from: url) {
            decisionHandler(.cancel)
            finish(tokens)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Page de connexion affichée = cookies expirés : il faut se reconnecter à la main.
        if let host = webView.url?.host, host == "auth.riotgames.com" || host == "authenticate.riotgames.com" { finish(nil) }
    }
}

// MARK: - Session

@MainActor
@Observable
final class RiotSession {
    struct Credentials: Codable {
        var accessToken: String
        var idToken: String
        var entitlements: String
        var expiresAt: Date
        var puuid: String
        var gameName: String
        var tagLine: String
        var region: String
        var shard: String
    }

    private static let keychainKey = "riot-session"
    private static let clientPlatform = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9"

    private(set) var credentials: Credentials?
    private(set) var lastError: String?
    private var clientVersion = ""

    var isLinked: Bool { credentials != nil }

    init() {
        if let data = Keychain.get(Self.keychainKey) {
            credentials = try? JSONDecoder().decode(Credentials.self, from: data)
        }
    }

    /// Appelé par la WebView de connexion : complète la session (droits, PUUID, région).
    func complete(accessToken: String, idToken: String, expiresIn: Int) async {
        do {
            credentials = try await buildCredentials(accessToken: accessToken, idToken: idToken, expiresIn: expiresIn)
            persist()
            lastError = nil
        } catch {
            lastError = "Connexion Riot impossible : \(error.localizedDescription)"
        }
    }

    func signOut() async {
        credentials = nil
        Keychain.remove(Self.keychainKey)
        await RiotWebData.clear()
    }

    private func persist() {
        guard let credentials, let data = try? JSONEncoder().encode(credentials) else { return }
        Keychain.set(data, for: Self.keychainKey)
    }

    private func buildCredentials(accessToken: String, idToken: String, expiresIn: Int) async throws -> Credentials {
        struct Entitlements: Decodable { let entitlements_token: String }
        struct UserInfo: Decodable { struct Acct: Decodable { let game_name: String?; let tag_line: String? }; let sub: String; let acct: Acct? }
        struct Geo: Decodable { struct Aff: Decodable { let live: String? }; let affinities: Aff? }

        let ent: Entitlements = try await send("https://entitlements.auth.riotgames.com/api/token/v1", method: "POST", body: Self.json([String: String]()), bearer: accessToken)
        let info: UserInfo = try await send("https://auth.riotgames.com/userinfo", bearer: accessToken)
        let geo: Geo? = try? await send("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant", method: "PUT", body: Self.json(["id_token": idToken]), bearer: accessToken)
        let region = geo?.affinities?.live ?? "eu"
        let shard = ["latam", "br"].contains(region) ? "na" : region
        return Credentials(accessToken: accessToken, idToken: idToken, entitlements: ent.entitlements_token,
                           expiresAt: Date().addingTimeInterval(TimeInterval(expiresIn - 60)), puuid: info.sub,
                           gameName: info.acct?.game_name ?? "", tagLine: info.acct?.tag_line ?? "", region: region, shard: shard)
    }

    func chatCredentials() async -> Credentials? { await validCredentials() }

    /// Jeton valide (reconnexion silencieuse si expiré). `nil` = l'utilisateur doit se reconnecter.
    private func validCredentials() async -> Credentials? {
        guard let current = credentials else { return nil }
        if current.expiresAt > Date() { return current }
        guard let tokens = await RiotSilentAuth().run() else {
            lastError = "Session Riot expirée : reconnectez-vous."
            return nil
        }
        await complete(accessToken: tokens.0, idToken: tokens.1, expiresIn: tokens.2)
        return credentials
    }

    private func loadClientVersion() async {
        guard clientVersion.isEmpty else { return }
        struct Version: Decodable { struct D: Decodable { let riotClientVersion: String }; let data: D }
        if let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/version")!),
           let version = try? JSONDecoder().decode(Version.self, from: data) {
            clientVersion = version.data.riotClientVersion
        }
    }

    static func json(_ value: some Encodable) -> Data? { try? JSONEncoder().encode(value) }

    private func send<T: Decodable>(_ url: String, method: String = "GET", body: Data? = nil, bearer: String, game: Credentials? = nil) async throws -> T {
        let data = try await sendData(url, method: method, body: body, bearer: bearer, game: game)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func sendData(_ url: String, method: String, body: Data?, bearer: String, game: Credentials?) async throws -> Data {
        var request = URLRequest(url: URL(string: url)!)
        request.httpMethod = method
        request.timeoutInterval = 15
        request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let game {
            request.setValue(game.entitlements, forHTTPHeaderField: "X-Riot-Entitlements-JWT")
            request.setValue(Self.clientPlatform, forHTTPHeaderField: "X-Riot-ClientPlatform")
            request.setValue(clientVersion, forHTTPHeaderField: "X-Riot-ClientVersion")
        }
        request.httpBody = body
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw RiotError.http(status) }
        return data
    }

    enum RiotError: LocalizedError {
        case http(Int)
        var errorDescription: String? {
            switch self {
            case .http(404): return "Introuvable"
            case .http(let code): return "Riot a répondu \(code)"
            }
        }
    }

    /// Appel authentifié à pd.* / glz.* avec les en-têtes du client VALORANT.
    func game<T: Decodable>(_ path: String, host: GameHost = .pd, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let creds = await validCredentials() else { throw RiotError.http(401) }
        await loadClientVersion()
        let base: String
        switch host {
        case .pd: base = "https://pd.\(creds.shard).a.pvp.net"
        case .glz: base = "https://glz-\(creds.region)-1.\(creds.shard).a.pvp.net"
        }
        return try await send(base + path, method: method, body: body, bearer: creds.accessToken, game: creds)
    }

    /// Variante brute : réponses vides (204) ou au format non documenté.
    @discardableResult
    func gameData(_ path: String, host: GameHost = .pd, method: String = "GET", body: Data? = nil) async throws -> Data {
        guard let creds = await validCredentials() else { throw RiotError.http(401) }
        await loadClientVersion()
        let base: String
        switch host {
        case .pd: base = "https://pd.\(creds.shard).a.pvp.net"
        case .glz: base = "https://glz-\(creds.region)-1.\(creds.shard).a.pvp.net"
        }
        return try await sendData(base + path, method: method, body: body, bearer: creds.accessToken, game: creds)
    }

    enum GameHost { case pd, glz }

    // MARK: Paramètres en jeu (Snapshots)

    private struct Preference: Codable { let type: String; let data: String }
    private static let preferencesURL = "https://playerpreferences.riotgames.com/playerPref/v3"

    /// Paramètres VALORANT du compte connecté (blob opaque, réappliqué tel quel).
    func playerSettings() async throws -> String {
        guard let creds = await validCredentials() else { throw RiotError.http(401) }
        let pref: Preference = try await send("\(Self.preferencesURL)/getPreference/Ares.PlayerSettings", bearer: creds.accessToken)
        return pref.data
    }

    /// Remplace les paramètres en jeu du compte connecté par ceux d'une snapshot.
    func applyPlayerSettings(_ data: String) async throws {
        guard let creds = await validCredentials() else { throw RiotError.http(401) }
        let body = Self.json(Preference(type: "Ares.PlayerSettings", data: data))
        let _: Preference = try await send("\(Self.preferencesURL)/savePreference", method: "PUT", body: body, bearer: creds.accessToken)
    }
}

// MARK: - Données de jeu

struct RiotGameSnapshot {
    var wallet = ValorantWallet(vp: 0, rp: 0, kc: 0)
    var offers: [ValorantDailySkinOffer] = []
    var offersEnd: Date?
    var bundles: [ValorantStoreBundle] = []
    var accessories: [ValorantAccessoryItem] = []
    var accessoriesEnd: Date?
    var title = ""
    var cardID = ""
    var sprays: [String?] = [nil, nil, nil, nil]
    var battlepassLevel = 0
    var battlepassXP = 0
    var weeklyMissionsEnd: Date?
    var missions: [RiotMission] = []
    var dailyMilestones: [Bool] = []
    var dailyEnd: Date?
    var party: ValorantParty?
}

struct RiotLiveRank: Hashable {
    let tier: Int
    let rr: Int
    let leaderboardRank: Int
}

struct RiotMission: Identifiable, Hashable {
    let id: String
    let title: String
    let progress: Int
    let target: Int
    let xp: Int
    let complete: Bool
}

@MainActor
enum RiotGameService {
    private static let vp = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"
    private static let rp = "e59aa87c-4cbf-517a-5983-6e81511be9b7"
    private static let kc = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d"
    /// Contrat du passe de l'acte en cours, résolu via valorant-api (voir RiotContractCatalog).
    static var battlepassContract = "d18b7d8f-4971-2f89-5613-248257830e11"

    /// Chaque bloc est indépendant : une erreur sur la boutique n'empêche pas le portefeuille.
    static func load(_ session: RiotSession) async -> RiotGameSnapshot {
        guard let puuid = session.credentials?.puuid else { return RiotGameSnapshot() }
        var snap = RiotGameSnapshot()
        let catalog = await SkinCatalog.shared.load()

        struct Wallet: Decodable { let Balances: [String: Int] }
        if let wallet: Wallet = try? await session.game("/store/v1/wallet/\(puuid)") {
            snap.wallet = ValorantWallet(vp: wallet.Balances[vp] ?? 0, rp: wallet.Balances[rp] ?? 0, kc: wallet.Balances[kc] ?? 0)
        }

        if let front: Storefront = try? await session.game("/store/v3/storefront/\(puuid)", method: "POST", body: RiotSession.json([String: String]())) {
            let panel = front.SkinsPanelLayout
            snap.offers = (panel?.SingleItemStoreOffers ?? []).map { offer in
                let itemID = offer.Rewards?.first?.ItemID.lowercased() ?? offer.OfferID.lowercased()
                let skin = catalog[itemID]
                let tier = SkinCatalog.tier(skin?.tier)
                return ValorantDailySkinOffer(id: offer.OfferID, name: skin?.name ?? "Skin", imageURL: skin?.icon ?? "",
                                              price: offer.Cost[vp] ?? 0, colorHex: tier.color, tierIconName: tier.icon, tierLabel: tier.label)
            }
            snap.offersEnd = panel?.SingleItemOffersRemainingDurationInSeconds.map { Date().addingTimeInterval(TimeInterval($0)) }
            for bundle in front.FeaturedBundle?.Bundles ?? [] {
                let meta = await SkinCatalog.shared.bundle(bundle.DataAssetID)
                let price = bundle.TotalDiscountedCost?[vp] ?? bundle.Items?.reduce(0) { $0 + ($1.DiscountedPrice ?? 0) }
                let remaining = bundle.DurationRemainingInSeconds ?? 0
                snap.bundles.append(ValorantStoreBundle(id: bundle.ID, name: meta?.name ?? "Pack", imageURL: meta?.image ?? "",
                                                        description: meta?.description, price: price,
                                                        expiresText: remaining > 0 ? EvalCountdown.text(until: Date().addingTimeInterval(TimeInterval(remaining))) : nil,
                                                        isOwned: false))
            }
            let accessory = front.AccessoryStore
            snap.accessories = (accessory?.AccessoryStoreOffers ?? []).compactMap { entry in
                guard let reward = entry.Offer.Rewards?.first else { return nil }
                let id = reward.ItemID.lowercased()
                switch reward.ItemTypeID?.lowercased() {
                case "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475": return ValorantAccessoryItem(id: id, name: "Spray", imageURL: "https://media.valorant-api.com/sprays/\(id)/displayicon.png")
                case "3f296c07-64c3-494c-923b-fe692a4fa1bd": return ValorantAccessoryItem(id: id, name: "Carte", imageURL: "https://media.valorant-api.com/playercards/\(id)/smallart.png")
                case "dd3bf334-87f3-40bd-b043-682a57a8dc3a": return ValorantAccessoryItem(id: id, name: "Porte-bonheur", imageURL: "https://media.valorant-api.com/buddylevels/\(id)/displayicon.png")
                default: return ValorantAccessoryItem(id: id, name: "Titre", imageURL: "")
                }
            }
            snap.accessoriesEnd = accessory?.AccessoryStoreRemainingDurationInSeconds.map { Date().addingTimeInterval(TimeInterval($0)) }
        }

        struct Loadout: Decodable {
            struct Identity: Decodable { let PlayerCardID: String?; let PlayerTitleID: String? }
            struct Spray: Decodable { let SprayID: String }
            let Identity: Identity?
            let Sprays: [Spray]?
        }
        if let loadout: Loadout = try? await session.game("/personalization/v2/players/\(puuid)/playerloadout") {
            snap.cardID = loadout.Identity?.PlayerCardID?.lowercased() ?? ""
            if let title = loadout.Identity?.PlayerTitleID { snap.title = await SkinCatalog.shared.title(title) ?? "" }
            let sprays = (loadout.Sprays ?? []).map { "https://media.valorant-api.com/sprays/\($0.SprayID.lowercased())/displayicon.png" as String? }
            snap.sprays = Array((sprays + [nil, nil, nil, nil]).prefix(4))
        }

        struct Contracts: Decodable {
            struct Contract: Decodable { let ContractDefinitionID: String; let ProgressionLevelReached: Int?; let ProgressionTowardsNextLevel: Int? }
            struct Meta: Decodable { let WeeklyRefillTime: String? }
            struct Mission: Decodable { let ID: String; let Objectives: [String: Int]?; let Complete: Bool?; let ExpirationTime: String? }
            let Contracts: [Contract]?
            let MissionMetadata: Meta?
            let Missions: [Mission]?
        }
        if let contracts: Contracts = try? await session.game("/contracts/v1/contracts/\(puuid)") {
            if let bp = contracts.Contracts?.first(where: { $0.ContractDefinitionID.lowercased() == battlepassContract }) {
                snap.battlepassLevel = bp.ProgressionLevelReached ?? 0
                snap.battlepassXP = bp.ProgressionTowardsNextLevel ?? 0
            }
            snap.weeklyMissionsEnd = contracts.MissionMetadata?.WeeklyRefillTime.flatMap(ISODate.parse)
            for mission in contracts.Missions ?? [] {
                guard let meta = await SkinCatalog.shared.mission(mission.ID) else { continue }
                snap.missions.append(RiotMission(id: mission.ID, title: meta.title, progress: mission.Objectives?.values.first ?? 0,
                                                 target: meta.target, xp: meta.xp, complete: mission.Complete ?? false))
            }
        }

        struct Daily: Decodable {
            struct Rewards: Decodable { struct Milestone: Decodable { let Progress: Int?; let BonusApplied: Bool? }; let RemainingLifetimeSeconds: Int?; let Milestones: [Milestone]? }
            let DailyRewards: Rewards?
        }
        if let daily: Daily = try? await session.game("/daily-ticket/v1/\(puuid)") {
            snap.dailyMilestones = (daily.DailyRewards?.Milestones ?? []).map { ($0.BonusApplied ?? false) || ($0.Progress ?? 0) >= 4 }
            snap.dailyEnd = daily.DailyRewards?.RemainingLifetimeSeconds.map { Date().addingTimeInterval(TimeInterval($0)) }
        }

        snap.party = await loadParty(session, puuid: puuid)
        return snap
    }

    /// Rang actuel en direct : HenrikDev s'arrête à la dernière partie classée, alors qu'un Radiant
    /// sorti du top du classement redevient Immortel 3 sans rejouer.
    static func liveRank(_ session: RiotSession, seasonID: String?) async -> RiotLiveRank? {
        guard let puuid = session.credentials?.puuid, let season = seasonID?.lowercased(),
              let raw = try? await session.gameData("/mmr/v1/players/\(puuid)"),
              let json = try? JSONDecoder().decode(JSONValue.self, from: raw) else { return nil }
        let seasons = json["QueueSkills"]?["competitive"]?["SeasonalInfoBySeasonID"]?.objectValue ?? [:]
        guard let info = seasons.first(where: { $0.key.lowercased() == season })?.value else { return nil }
        var tier = info["CompetitiveTier"]?.intValue ?? 0
        let rr = info["RankedRating"]?.intValue ?? 0
        let place = info["LeaderboardRank"]?.intValue ?? 0
        if place > 0, let region = session.credentials?.region,
           let board = try? await session.gameData("/mmr/v1/leaderboards/affinity/\(region)/queue/competitive/season/\(season)?startIndex=0&size=1"),
           let boardJSON = try? JSONDecoder().decode(JSONValue.self, from: board),
           let details = boardJSON["tierDetails"]?.objectValue {
            // Palier dont la première place du classement est la plus proche au-dessus du joueur.
            let starts = details.compactMap { key, value -> (tier: Int, start: Int)? in
                guard let t = Int(key), let start = value["startingIndex"]?.intValue else { return nil }
                return (t, start)
            }
            if let best = starts.filter({ $0.start < place }).max(by: { $0.start < $1.start }) { tier = best.tier }
        }
        return tier > 0 ? RiotLiveRank(tier: tier, rr: rr, leaderboardRank: place) : nil
    }

    private static func loadParty(_ session: RiotSession, puuid: String) async -> ValorantParty? {
        struct Player: Decodable { let CurrentPartyID: String }
        struct Party: Decodable {
            struct Member: Decodable { struct Identity: Decodable { let PlayerCardID: String? }; let Subject: String; let IsOwner: Bool?; let PlayerIdentity: Identity? }
            struct MM: Decodable { let QueueID: String? }
            let ID: String; let State: String?; let Accessibility: String?; let Members: [Member]; let MatchmakingData: MM?
        }
        struct Name: Decodable { let Subject: String; let GameName: String; let TagLine: String }
        guard let player: Player = try? await session.game("/parties/v1/players/\(puuid)", host: .glz),
              let party: Party = try? await session.game("/parties/v1/parties/\(player.CurrentPartyID)", host: .glz) else { return nil }
        let names: [Name] = (try? await session.game("/name-service/v2/players", method: "PUT", body: RiotSession.json(party.Members.map(\.Subject)))) ?? []
        let members = party.Members.map { m -> ValorantPartyMember in
            let name = names.first { $0.Subject == m.Subject }
            let card = m.PlayerIdentity?.PlayerCardID?.lowercased()
            return ValorantPartyMember(id: m.Subject, name: name?.GameName ?? "", tag: name?.TagLine ?? "",
                                       cardURL: card.map { "https://media.valorant-api.com/playercards/\($0)/smallart.png" },
                                       isLeader: m.IsOwner ?? false, statusText: m.IsOwner == true ? "Chef du groupe" : "Membre")
        }
        return ValorantParty(id: party.ID, currentSize: members.count, maxSize: 5, isOpen: party.Accessibility == "OPEN",
                             state: party.State ?? "", queueName: party.MatchmakingData?.QueueID.map(EvalProfileView.modeName), members: members)
    }

    private struct Storefront: Decodable {
        struct Reward: Decodable { let ItemTypeID: String?; let ItemID: String }
        struct Offer: Decodable { let OfferID: String; let Cost: [String: Int]; let Rewards: [Reward]? }
        struct Panel: Decodable { let SingleItemStoreOffers: [Offer]?; let SingleItemOffersRemainingDurationInSeconds: Int? }
        struct BundleItem: Decodable { let DiscountedPrice: Int? }
        struct Bundle: Decodable { let ID: String; let DataAssetID: String; let Items: [BundleItem]?; let DurationRemainingInSeconds: Int?; let TotalDiscountedCost: [String: Int]? }
        struct Featured: Decodable { let Bundles: [Bundle]? }
        struct AccessoryOffer: Decodable { let Offer: Offer }
        struct Accessory: Decodable { let AccessoryStoreOffers: [AccessoryOffer]?; let AccessoryStoreRemainingDurationInSeconds: Int? }
        let SkinsPanelLayout: Panel?
        let FeaturedBundle: Featured?
        let AccessoryStore: Accessory?
    }
}

/// Catalogue valorant-api.com (skins, packs, titres), gardé sur disque 24 h.
@MainActor
final class SkinCatalog {
    static let shared = SkinCatalog()
    struct Skin: Codable { let name: String; let icon: String; let tier: String }
    private struct Cache: Codable { let fetchedAt: Date; let skins: [String: Skin] }
    private var skins: [String: Skin] = [:]

    func load() async -> [String: Skin] {
        if !skins.isEmpty { return skins }
        let key = "valorant-api.skins.fr"
        if let cache = DiskCache.read(Cache.self, key: key), Date().timeIntervalSince(cache.fetchedAt) < 86400 {
            skins = cache.skins
            return skins
        }
        struct Page: Decodable {
            struct Level: Decodable { let uuid: String; let displayIcon: String? }
            struct Item: Decodable { let displayName: String; let displayIcon: String?; let contentTierUuid: String?; let levels: [Level]? }
            let data: [Item]
        }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/weapons/skins?language=fr-FR")!),
              let page = try? JSONDecoder().decode(Page.self, from: data) else { return skins }
        var map: [String: Skin] = [:]
        for item in page.data {
            for level in item.levels ?? [] {
                map[level.uuid.lowercased()] = Skin(name: item.displayName, icon: level.displayIcon ?? item.displayIcon ?? "", tier: item.contentTierUuid ?? "")
            }
        }
        skins = map
        DiskCache.write(Cache(fetchedAt: Date(), skins: map), key: key)
        return skins
    }

    func bundle(_ id: String) async -> (name: String, image: String, description: String?)? {
        struct R: Decodable { struct D: Decodable { let displayName: String; let displayIcon: String?; let displayIcon2: String?; let extraDescription: String?; let description: String? }; let data: D }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/bundles/\(id)?language=fr-FR")!),
              let r = try? JSONDecoder().decode(R.self, from: data) else { return nil }
        return (r.data.displayName, r.data.displayIcon2 ?? r.data.displayIcon ?? "", r.data.extraDescription ?? r.data.description)
    }

    func mission(_ id: String) async -> (title: String, target: Int, xp: Int)? {
        struct Objective: Decodable { let objectiveUuid: String? }
        struct R: Decodable { struct D: Decodable { let title: String?; let progressToComplete: Int?; let xpGrant: Int?; let objectives: [Objective]? }; let data: D }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/missions/\(id)?language=fr-FR")!),
              let r = try? JSONDecoder().decode(R.self, from: data), let title = r.data.title else { return nil }
        if MissionObjectives.directives.isEmpty { await MissionObjectives.load() }
        let target = r.data.progressToComplete ?? 0
        let text = MissionObjectives.text(objective: r.data.objectives?.first?.objectiveUuid, value: target, fallback: title)
        return (text, target, r.data.xpGrant ?? 0)
    }

    func title(_ id: String) async -> String? {
        struct R: Decodable { struct D: Decodable { let titleText: String? }; let data: D }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/playertitles/\(id)?language=fr-FR")!),
              let r = try? JSONDecoder().decode(R.self, from: data) else { return nil }
        return r.data.titleText
    }

    /// Paliers de contenu (Select, Deluxe, Premium, Exclusive, Ultra).
    static func tier(_ uuid: String?) -> (color: UInt32, icon: String, label: String) {
        switch uuid?.lowercased() {
        case "12683d76-48d7-84a3-4e09-6985794f0445": return (0x5A9FE2, "circle.fill", "Select")
        case "0cebb8be-46d7-c12a-d306-e9907bfc5a25": return (0x2DD4BF, "rhombus.fill", "Deluxe")
        case "60bca009-4182-7998-dee7-b8a2558dc369": return (0xE879F9, "triangle.fill", "Premium")
        case "e046854e-406c-37f4-6607-19a9ba8426fc": return (0xF59E0B, "pentagon.fill", "Exclusive")
        case "411e4a55-4e59-7757-41f0-86a53f101bb5": return (0xFACC15, "pentagon.fill", "Ultra")
        default: return (0x8E8E93, "circle.fill", "")
        }
    }
}

enum EvalCountdown {
    /// « 2j 3:50:45 » / « 3:50:46 » jusqu'à la date donnée.
    static func text(until date: Date?, now: Date = Date()) -> String {
        guard let date else { return "" }
        let s = max(0, Int(date.timeIntervalSince(now)))
        let d = s / 86400, h = (s % 86400) / 3600, m = (s % 3600) / 60, sec = s % 60
        let clock = "\(h):\(String(format: "%02d", m)):\(String(format: "%02d", sec))"
        return d > 0 ? "\(d)j \(clock)" : clock
    }
}

/// Cookies et stockage web de la page de connexion Riot.
@MainActor
enum RiotWebData {
    static func clear() async {
        let store = WKWebsiteDataStore.default()
        let records = await store.dataRecords(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes())
        await store.removeData(ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(), for: records.filter { $0.displayName.contains("riotgames") })
    }
}
