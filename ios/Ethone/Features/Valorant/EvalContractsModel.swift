import Foundation
import Observation

/// Contrats publics de valorant-api.com (passes de combat, agents), mis en cache 24 h.
struct RiotContractCatalog: Codable {
    struct Contract: Codable {
        let id: String
        let name: String
        let relationType: String
        let relationUuid: String
        /// Coût en crédits de royaume de chaque niveau (contrats d'agents).
        let doughCosts: [Int]
    }

    struct Agent: Codable {
        let id: String
        let name: String
        let icon: String
        let isBase: Bool
    }

    let fetchedAt: Date
    let contracts: [Contract]
    let agents: [Agent]

    private static let key = "valorant-api.contracts-agents.fr"

    static func load() async -> RiotContractCatalog? {
        if let cached = DiskCache.read(RiotContractCatalog.self, key: key), Date().timeIntervalSince(cached.fetchedAt) < 86400 {
            return cached
        }
        struct Level: Decodable { let doughCost: Int? }
        struct Chapter: Decodable { let levels: [Level]? }
        struct Content: Decodable { let relationType: String?; let relationUuid: String?; let chapters: [Chapter]? }
        struct ContractDTO: Decodable { let uuid: String; let displayName: String?; let content: Content? }
        struct AgentDTO: Decodable { let uuid: String; let displayName: String; let displayIconSmall: String?; let isBaseContent: Bool? }
        struct Page<T: Decodable>: Decodable { let data: [T] }

        guard let (cData, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/contracts?language=fr-FR")!),
              let cPage = try? JSONDecoder().decode(Page<ContractDTO>.self, from: cData),
              let (aData, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=fr-FR")!),
              let aPage = try? JSONDecoder().decode(Page<AgentDTO>.self, from: aData) else {
            return DiskCache.read(RiotContractCatalog.self, key: key)
        }
        let contracts = cPage.data.compactMap { c -> Contract? in
            guard let type = c.content?.relationType, let relation = c.content?.relationUuid else { return nil }
            let costs = (c.content?.chapters ?? []).flatMap { $0.levels ?? [] }.map { $0.doughCost ?? 0 }
            return Contract(id: c.uuid.lowercased(), name: c.displayName ?? "", relationType: type, relationUuid: relation.lowercased(), doughCosts: costs)
        }
        let agents = aPage.data
            .map { Agent(id: $0.uuid.lowercased(), name: $0.displayName, icon: $0.displayIconSmall ?? "", isBase: $0.isBaseContent ?? false) }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        let catalog = RiotContractCatalog(fetchedAt: Date(), contracts: contracts, agents: agents)
        DiskCache.write(catalog, key: key)
        return catalog
    }

    /// Passe de combat lié à l'acte en cours.
    func battlepass(actID: String?) -> Contract? {
        guard let actID = actID?.lowercased() else { return nil }
        return contracts.first { $0.relationType == "Season" && $0.relationUuid == actID }
    }
}

/// XP du compte (niveau, première victoire, historique par match) : pd /account-xp.
struct RiotAccountXP {
    struct Source: Identifiable, Hashable {
        let id: String
        let amount: Int
        var label: String {
            switch id {
            case "time-played": "Temps de jeu"
            case "match-win": "Match Gagné"
            case "first-win-of-the-day": "Première victoire du jour"
            default: id
            }
        }
        var icon: String {
            switch id {
            case "time-played": "clock"
            case "match-win": "trophy"
            case "first-win-of-the-day": "sun.max"
            default: "star"
            }
        }
    }

    struct Entry: Identifiable, Hashable {
        let id: String
        let date: Date?
        let delta: Int
        let sources: [Source]
    }

    static let xpPerLevel = 5000

    let level: Int
    let xp: Int
    let nextFirstWin: Date?
    let history: [Entry]

    var averageXP: Int {
        let recent = history.prefix(20).map(\.delta).filter { $0 > 0 }
        return recent.isEmpty ? 0 : recent.reduce(0, +) / recent.count
    }

    /// Parties par jour sur la période couverte par l'historique.
    var matchesPerDay: Double {
        let dated = history.prefix(20).compactMap(\.date)
        guard dated.count >= 2, let newest = dated.max(), let oldest = dated.min() else { return 0 }
        let days = max(1, newest.timeIntervalSince(oldest) / 86400)
        return Double(dated.count) / days
    }
}

struct RiotAgentContract: Identifiable, Hashable {
    let id: String
    let name: String
    let icon: String
    let levelReached: Int
    let maxLevel: Int
    let nextCost: Int?
    let spent: Int
    let total: Int
}

@MainActor
@Observable
final class RiotContractsModel {
    private(set) var accountXP: RiotAccountXP?
    private(set) var agentContracts: [RiotAgentContract] = []
    private(set) var agentsOwned = 0
    private(set) var agentsTotal = 0
    private(set) var isLoading = false
    private var lastLoad: Date?

    var agentsCompleted: Int { agentContracts.filter { $0.maxLevel > 0 && $0.levelReached >= $0.maxLevel }.count }
    var creditsSpent: Int { agentContracts.reduce(0) { $0 + $1.spent } }
    var creditsTotal: Int { agentContracts.reduce(0) { $0 + $1.total } }

    /// Au plus un chargement par minute, sauf rafraîchissement manuel.
    func load(_ session: RiotSession, force: Bool = false) async {
        guard session.isLinked, let puuid = session.credentials?.puuid, !isLoading else { return }
        if !force, let lastLoad, Date().timeIntervalSince(lastLoad) < 60 { return }
        isLoading = true
        defer { isLoading = false; lastLoad = Date() }

        if let raw = try? await session.gameData("/account-xp/v1/players/\(puuid)"),
           let json = try? JSONDecoder().decode(JSONValue.self, from: raw) {
            let history = (json["History"]?.arrayValue ?? []).map { entry in
                RiotAccountXP.Entry(
                    id: entry["ID"]?.stringValue ?? UUID().uuidString,
                    date: entry["MatchStart"]?.stringValue.flatMap(ISODate.parse),
                    delta: entry["XPDelta"]?.intValue ?? 0,
                    sources: (entry["XPSources"]?.arrayValue ?? []).compactMap { source in
                        guard let id = source["ID"]?.stringValue, let amount = source["Amount"]?.intValue, amount != 0 else { return nil }
                        return RiotAccountXP.Source(id: id, amount: amount)
                    }
                )
            }
            .sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
            accountXP = RiotAccountXP(
                level: json["Progress"]?["Level"]?.intValue ?? 0,
                xp: json["Progress"]?["XP"]?.intValue ?? 0,
                nextFirstWin: json["NextTimeFirstWinAvailable"]?.stringValue.flatMap(ISODate.parse),
                history: history
            )
        }

        guard let catalog = await RiotContractCatalog.load() else { return }
        var reached: [String: Int] = [:]
        if let raw = try? await session.gameData("/contracts/v1/contracts/\(puuid)"),
           let json = try? JSONDecoder().decode(JSONValue.self, from: raw) {
            for contract in json["Contracts"]?.arrayValue ?? [] {
                guard let id = contract["ContractDefinitionID"]?.stringValue?.lowercased() else { continue }
                reached[id] = contract["ProgressionLevelReached"]?.intValue ?? 0
            }
        }
        var owned = Set(catalog.agents.filter(\.isBase).map(\.id))
        if let raw = try? await session.gameData("/store/v1/entitlements/\(puuid)/01bb38e1-da47-4e6a-9b3d-945fe4655707"),
           let json = try? JSONDecoder().decode(JSONValue.self, from: raw) {
            for item in json["Entitlements"]?.arrayValue ?? [] {
                if let id = item["ItemID"]?.stringValue?.lowercased() { owned.insert(id) }
            }
        }
        agentsTotal = catalog.agents.count
        agentsOwned = catalog.agents.filter { owned.contains($0.id) }.count
        agentContracts = catalog.agents.compactMap { agent in
            guard let contract = catalog.contracts.first(where: { $0.relationType == "Agent" && $0.relationUuid == agent.id }) else { return nil }
            let level = min(reached[contract.id] ?? 0, contract.doughCosts.count)
            return RiotAgentContract(
                id: agent.id, name: agent.name, icon: agent.icon,
                levelReached: level, maxLevel: contract.doughCosts.count,
                nextCost: level < contract.doughCosts.count ? contract.doughCosts[level] : nil,
                spent: contract.doughCosts.prefix(level).reduce(0, +),
                total: contract.doughCosts.reduce(0, +)
            )
        }
    }
}
