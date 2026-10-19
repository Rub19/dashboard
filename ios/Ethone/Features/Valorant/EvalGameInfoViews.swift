import SwiftUI

enum EvalGameInfoTab: String, CaseIterable, Identifiable {
    case maps = "Cartes"
    case agents = "Agents"
    case weapons = "Armes"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .maps: return "map.fill"
        case .agents: return "person.crop.circle.fill"
        case .weapons: return "scope"
        }

    }
}

struct EvalGameInfoView: View {
    @State private var selectedTab: EvalGameInfoTab

    init(initialTab: EvalGameInfoTab = .maps) {
        _selectedTab = State(initialValue: initialTab)
    }

    var body: some View {
        VStack(spacing: 0) {
            gameInfoPicker
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 4)

            Group {
                switch selectedTab {
                case .maps:
                    EvalMapsView()
                case .agents:
                    EvalAgentsView()
                case .weapons:
                    EvalWeaponsView()
                }
            }
            .id(selectedTab)
            .transition(.asymmetric(insertion: .opacity.combined(with: .move(edge: .trailing)),
                                    removal: .opacity.combined(with: .move(edge: .leading))))
        }
        .animation(.snappy(duration: 0.28), value: selectedTab)
        .navigationTitle("Infos sur le jeu")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }

    private var gameInfoPicker: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 6) {
                ForEach(EvalGameInfoTab.allCases) { tab in
                    Button {
                        withAnimation(.snappy(duration: 0.28)) {
                            selectedTab = tab
                        }
                    } label: {
                        Label(tab.rawValue, systemImage: tab.icon)
                            .font(.caption.weight(selectedTab == tab ? .bold : .medium))
                            .lineLimit(1)
                            .minimumScaleFactor(0.78)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 9)
                            .foregroundStyle(selectedTab == tab ? Theme.danger : .secondary)
                            .background {
                                if selectedTab == tab {
                                    Capsule()
                                        .fill(Theme.danger.opacity(0.16))
                                        .glassEffect(.regular.interactive(), in: .capsule)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .sensoryFeedback(.selection, trigger: selectedTab)
                }
            }
            .padding(5)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
    }
}

// MARK: - 1. CARTES (MAPS)
struct ValorantMapItem: Identifiable, Decodable {
    var id: String { uuid }
    let uuid: String
    let displayName: String
    let narrativeDescription: String?
    let tacticalDescription: String?
    let coordinates: String?
    let displayIcon: String?
    let listViewIcon: String?
    let splash: String?
    let callouts: [MapCallout]?
    var competitiveStatus: CompetitiveMapStatus = .unknown

    struct MapCallout: Decodable, Hashable {
        let regionName: String
        let superRegionName: String?
    }

    enum CompetitiveMapStatus: String {
        case active
        case upcoming
        case unknown
    }

    var isCompetitive: Bool { competitiveStatus != .unknown }

    private enum CodingKeys: String, CodingKey {
        case uuid, displayName, narrativeDescription, tacticalDescription, coordinates
        case displayIcon, listViewIcon, splash, callouts
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        uuid = try container.decode(String.self, forKey: .uuid)
        displayName = try container.decode(String.self, forKey: .displayName)
        narrativeDescription = try container.decodeIfPresent(String.self, forKey: .narrativeDescription)
        tacticalDescription = try container.decodeIfPresent(String.self, forKey: .tacticalDescription)
        coordinates = try container.decodeIfPresent(String.self, forKey: .coordinates)
        displayIcon = try container.decodeIfPresent(String.self, forKey: .displayIcon)
        listViewIcon = try container.decodeIfPresent(String.self, forKey: .listViewIcon)
        splash = try container.decodeIfPresent(String.self, forKey: .splash)
        callouts = try container.decodeIfPresent([MapCallout].self, forKey: .callouts)
    }

    func withCompetitiveStatus(_ status: CompetitiveMapStatus) -> Self {
        var copy = self
        copy.competitiveStatus = status
        return copy
    }
}

@MainActor
@Observable
final class ValorantMapsStore {
    var maps: [ValorantMapItem] = []
    var isLoading = false
    var errorMessage: String?

    func fetchMaps(apiKey: String = "") async {
        guard maps.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            guard let mapsURL = URL(string: "https://valorant-api.com/v1/maps"),
                  let rotationURL = URL(string: "https://api.henrikdev.xyz/valorant/v1/map/rotation") else {
                throw URLError(.badURL)
            }
            struct MapsResponse: Decodable {
                let data: [ValorantMapItem]
            }
            struct RotationResponse: Decodable {
                struct Rotation: Decodable {
                    let maps: [String]
                }
                let current: Rotation?
                let upcoming: Rotation?
                let next: Rotation?
            }
            async let mapsRequest = URLSession.shared.data(from: mapsURL)
            var rotationURLRequest = URLRequest(url: rotationURL)
            if !apiKey.isEmpty {
                rotationURLRequest.setValue(apiKey, forHTTPHeaderField: "Authorization")
            }
            async let rotationRequest = URLSession.shared.data(for: rotationURLRequest)
            let (mapsData, _) = try await mapsRequest
            let response = try JSONDecoder().decode(MapsResponse.self, from: mapsData)
            let rotationPayload = try? await rotationRequest
            let rotation = rotationPayload.flatMap { try? JSONDecoder().decode(RotationResponse.self, from: $0.0) }
            let active = Set(rotation?.current?.maps.map { $0.lowercased() } ?? [])
            let upcoming = Set((rotation?.upcoming?.maps ?? rotation?.next?.maps ?? []).map { $0.lowercased() })
            maps = response.data.map { map in
                let keys = [map.uuid, map.displayName, map.displayName.replacingOccurrences(of: " ", with: "-")]
                    .map { $0.lowercased() }
                if keys.contains(where: active.contains) { return map.withCompetitiveStatus(.active) }
                if keys.contains(where: upcoming.contains) { return map.withCompetitiveStatus(.upcoming) }
                return map
            }.sorted {
                if $0.isCompetitive != $1.isCompetitive {
                    return $0.isCompetitive && !$1.isCompetitive
                }
                return $0.displayName < $1.displayName
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalMapsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var store = ValorantMapsStore()
    @State private var filterCompetitiveOnly = true
    @State private var searchQuery = ""
    @State private var selectedMap: ValorantMapItem?

    private var filteredMaps: [ValorantMapItem] {
        var list = store.maps
        if filterCompetitiveOnly {
            list = list.filter(\.isCompetitive)
        }
        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            list = list.filter { $0.displayName.localizedCaseInsensitiveContains(searchQuery) }
        }
        return list
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Cartes de Valorant")
                                .font(.title2.weight(.heavy))
                                .foregroundStyle(.white)
                            Text("\(filteredMaps.count) cartes disponibles")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)

                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                        TextField("Rechercher une carte...", text: $searchQuery)
                            .font(.subheadline)
                            .foregroundStyle(.white)
                        if !searchQuery.isEmpty {
                            Button { searchQuery = "" } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 14))
                    .padding(.horizontal, 16)

                    // Filter tabs
                    HStack(spacing: 8) {
                        filterPill(title: "Compétitives", isSelected: filterCompetitiveOnly) {
                            filterCompetitiveOnly = true
                        }
                        filterPill(title: "Toutes les cartes", isSelected: !filterCompetitiveOnly) {
                            filterCompetitiveOnly = false
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)

                    // Maps Grid / List
                    if store.isLoading && store.maps.isEmpty {
                        ProgressView()
                            .tint(Theme.danger)
                            .padding(.top, 40)
                    } else if let errorMessage = store.errorMessage, store.maps.isEmpty {
                        ContentUnavailableView(
                            "Impossible de charger les cartes",
                            systemImage: "wifi.exclamationmark",
                            description: Text(errorMessage)
                        )
                        .padding(.top, 36)
                    } else {
                        if filteredMaps.isEmpty {
                            ContentUnavailableView(
                                searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Aucune carte disponible" : "Aucune carte trouvée",
                                systemImage: searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "map" : "magnifyingglass",
                                description: Text(searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "La rotation compétitive n’est pas disponible pour le moment." : "Essayez un autre nom de carte.")
                            )
                            .padding(.top, 36)
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(filteredMaps) { map in
                                                    mapRow(map: map)
                                }
                            }
                                            .padding(12)
                                            .background(Color.white.opacity(0.07), in: .rect(cornerRadius: 28))
                                            .padding(.horizontal, 16)
                                            .padding(.bottom, 32)
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("Cartes")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await store.fetchMaps(apiKey: model.valorant.apiKey)
        }
        .sheet(item: $selectedMap) { map in
            mapDetailSheet(map: map)
        }
    }

    private func filterPill(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .foregroundStyle(isSelected ? Theme.danger : .secondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? Theme.danger.opacity(0.18) : Color.white.opacity(0.04), in: .capsule)
        }
        .buttonStyle(PressScaleStyle())
    }

    private func mapRow(map: ValorantMapItem) -> some View {
        Button {
            selectedMap = map
        } label: {
            HStack(spacing: 14) {
                AsyncImage(url: URL(string: map.listViewIcon ?? map.splash ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        Color.white.opacity(0.08)
                    }
                }
                .frame(width: 112, height: 72)
                .clipShape(.rect(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 5) {
                    Text(map.displayName)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                    if map.competitiveStatus != .unknown {
                        Text(map.competitiveStatus == .active ? "Compétitive" : "Prochaine rotation")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.danger)
                    } else {
                        Text("Carte publique")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()
                Image(systemName: "chevron.right")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 12)
            .overlay(alignment: .bottom) {
                if map.id != filteredMaps.last?.id {
                    Divider().overlay(Color.white.opacity(0.1)).padding(.leading, 126)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func mapDetailSheet(map: ValorantMapItem) -> some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 18) {
                        // Wide splash
                        if let splash = map.splash, let url = URL(string: splash) {
                            AsyncImage(url: url) { phase in
                                if let img = phase.image {
                                    img.resizable().interpolation(.high).scaledToFill()
                                        .frame(height: 200).frame(maxWidth: .infinity).clipped()
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(map.displayName)
                                        .font(.title.weight(.heavy))
                                        .foregroundStyle(.white)
                                    if let coords = map.coordinates {
                                        Text(coords)
                                            .font(.caption.monospaced())
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if let tactical = map.tacticalDescription {
                                    Text(tactical)
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(Theme.danger)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Theme.danger.opacity(0.15), in: .capsule)
                                }
                            }

                            // Minimap Overhead Plan
                            if let iconURL = map.displayIcon, let url = URL(string: iconURL) {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Plan du terrain (Callouts)")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(.white)

                                    AsyncImage(url: url) { phase in
                                        if let img = phase.image {
                                            img.resizable().interpolation(.high).scaledToFit()
                                                .frame(maxWidth: .infinity)
                                                .frame(height: 260)
                                                .padding(10)
                                                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                                        }
                                    }
                                }
                            }

                            // Regions list
                            if let callouts = map.callouts, !callouts.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Zones principales")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(.white)

                                    let uniqueCallouts = Array(Set(callouts.map { $0.regionName })).sorted()
                                    FlowLayout(spacing: 8) {
                                        ForEach(uniqueCallouts, id: \.self) { zone in
                                            Text(zone)
                                                .font(.caption.weight(.medium))
                                                .foregroundStyle(.secondary)
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 5)
                                                .background(Color.white.opacity(0.06), in: .capsule)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .navigationTitle(map.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { selectedMap = nil } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

// Simple FlowLayout helper for chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        var height: CGFloat = 0
        var x: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                x = 0
                height += rowHeight + spacing
                rowHeight = 0
            }
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        height += rowHeight
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX && x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
    }
}

// MARK: - 2. AGENTS
struct ValorantAgentItem: Identifiable, Decodable {
    var id: String { uuid }
    let uuid: String
    let displayName: String
    let description: String
    let displayIcon: String?
    let fullPortrait: String?
    let background: String?
    let role: AgentRole?
    let abilities: [AgentAbility]

    struct AgentRole: Decodable {
        let displayName: String
        let displayIcon: String?
        let description: String?
    }

    struct AgentAbility: Decodable, Identifiable {
        var id: String { "\(slot)-\(displayName)" }
        let slot: String
        let displayName: String
        let description: String
        let displayIcon: String?
    }
}

@MainActor
@Observable
final class ValorantAgentsStore {
    var agents: [ValorantAgentItem] = []
    var isLoading = false
    var errorMessage: String?

    func fetchAgents() async {
        guard agents.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        guard let url = URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            struct AgentsResponse: Decodable {
                let data: [ValorantAgentItem]
            }
            let res = try JSONDecoder().decode(AgentsResponse.self, from: data)
            agents = res.data.sorted { $0.displayName < $1.displayName }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalAgentsView: View {
    @State private var store = ValorantAgentsStore()
    @State private var selectedRole = "Tous"
    @State private var searchQuery = ""
    @State private var selectedAgent: ValorantAgentItem?

    private let roles = ["Tous", "Duelist", "Initiator", "Controller", "Sentinel"]

    private func roleFrenchName(_ role: String) -> String {
        switch role {
        case "Duelist": return "Duelliste"
        case "Initiator": return "Initiateur"
        case "Controller": return "Contrôleur"
        case "Sentinel": return "Sentinelle"
        default: return role
        }
    }

    private var filteredAgents: [ValorantAgentItem] {
        var list = store.agents
        if selectedRole != "Tous" {
            list = list.filter { $0.role?.displayName.caseInsensitiveCompare(selectedRole) == .orderedSame }
        }
        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            list = list.filter { $0.displayName.localizedCaseInsensitiveContains(searchQuery) }
        }
        return list
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Agents de Valorant")
                                .font(.title2.weight(.heavy))
                                .foregroundStyle(.white)
                            Text("\(filteredAgents.count) agents disponibles")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)

                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                        TextField("Rechercher un agent...", text: $searchQuery)
                            .font(.subheadline)
                            .foregroundStyle(.white)
                        if !searchQuery.isEmpty {
                            Button { searchQuery = "" } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 14))
                    .padding(.horizontal, 16)

                    // Roles scroll
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            ForEach(roles, id: \.self) { role in
                                let isSelected = selectedRole == role
                                Button {
                                    selectedRole = role
                                } label: {
                                    Text(role == "Tous" ? "Tous" : "\(roleFrenchName(role))s")
                                        .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                        .foregroundStyle(isSelected ? Theme.danger : .secondary)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 7)
                                        .background(isSelected ? Theme.danger.opacity(0.18) : Color.white.opacity(0.04), in: .capsule)
                                }
                                .buttonStyle(PressScaleStyle())
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .scrollIndicators(.hidden)

                    // Agents grouped by the live Valorant API role metadata.
                    if store.isLoading && store.agents.isEmpty {
                        ProgressView()
                            .tint(Theme.danger)
                            .padding(.top, 40)
                    } else if let errorMessage = store.errorMessage, store.agents.isEmpty {
                        ContentUnavailableView(
                            "Impossible de charger les agents",
                            systemImage: "wifi.exclamationmark",
                            description: Text(errorMessage)
                        )
                        .padding(.top, 36)
                    } else if filteredAgents.isEmpty {
                        ContentUnavailableView(
                            "Aucun agent trouvé",
                            systemImage: "person.crop.circle",
                            description: Text("Essayez un autre rôle ou un autre nom.")
                        )
                        .padding(.top, 36)
                    } else {
                        LazyVStack(alignment: .leading, spacing: 18) {
                            ForEach(roles.dropFirst().filter { role in
                                filteredAgents.contains { $0.role?.displayName == role }
                            }, id: \.self) { role in
                                let agents = filteredAgents.filter { $0.role?.displayName == role }
                                if !agents.isEmpty {
                                    Text(role == "Tous" ? "Tous les agents" : roleFrenchName(role))
                                        .font(.title3.weight(.bold))
                                        .foregroundStyle(.secondary)
                                        .padding(.horizontal, 4)

                                    VStack(spacing: 0) {
                                        ForEach(agents) { agent in
                                            agentRowCard(agent: agent)
                                        }
                                    }
                                    .padding(12)
                                    .background(Color.white.opacity(0.07), in: .rect(cornerRadius: 28))
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("Agents")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await store.fetchAgents()
        }
        .sheet(item: $selectedAgent) { agent in
            agentDetailSheet(agent: agent)
        }
    }

    private func agentRowCard(agent: ValorantAgentItem) -> some View {
        Button {
            selectedAgent = agent
        } label: {
            HStack(spacing: 14) {
                AsyncImage(url: URL(string: agent.displayIcon ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        Color.white.opacity(0.08)
                    }
                }
                .frame(width: 58, height: 58)
                .clipShape(.rect(cornerRadius: 16))

                Text(agent.displayName)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)

                Spacer()
                Image(systemName: "chevron.right")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 13)
            .overlay(alignment: .bottom) {
                Divider().overlay(Color.white.opacity(0.1)).padding(.leading, 76)
            }
        }
        .buttonStyle(.plain)
    }

    private func agentGridCard(agent: ValorantAgentItem) -> some View {
        Button {
            selectedAgent = agent
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                // Agent portrait frame
                ZStack(alignment: .bottom) {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: 0x1A1C24))
                        .frame(height: 120)

                    if let iconURL = agent.fullPortrait ?? agent.displayIcon, let url = URL(string: iconURL) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .interpolation(.high)
                                    .scaledToFit()
                                    .frame(height: 120)
                            default:
                                Color.clear.frame(height: 120)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(agent.displayName)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)

                    if let role = agent.role {
                        HStack(spacing: 4) {
                            if let roleIcon = role.displayIcon, let url = URL(string: roleIcon) {
                                AsyncImage(url: url) { phase in
                                    if let img = phase.image {
                                        img.resizable().scaledToFit().frame(width: 10, height: 10)
                                    }
                                }
                            }
                            Text(roleFrenchName(role.displayName))
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Theme.danger)
                        }
                    }
                }
                .padding(.horizontal, 4)
                .padding(.bottom, 4)
            }
            .padding(8)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius)
                    .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(PressScaleStyle())
    }

    private func agentDetailSheet(agent: ValorantAgentItem) -> some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // Bust portrait banner
                        ZStack(alignment: .bottom) {
                            Color(hex: 0x1A1C24).frame(height: 220)

                            if let portraitURL = agent.fullPortrait ?? agent.displayIcon, let url = URL(string: portraitURL) {
                                AsyncImage(url: url) { phase in
                                    if let img = phase.image {
                                        img.resizable().interpolation(.high).scaledToFit().frame(height: 220)
                                    }
                                }
                            }

                            LinearGradient(
                                colors: [Color(hex: 0x0E1017), Color.clear],
                                startPoint: .bottom,
                                endPoint: .top
                            )
                            .frame(height: 80)
                        }

                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(agent.displayName)
                                        .font(.title.weight(.heavy))
                                        .foregroundStyle(.white)

                                    if let role = agent.role {
                                        Text(roleFrenchName(role.displayName).uppercased())
                                            .font(.caption.weight(.heavy))
                                            .foregroundStyle(Theme.danger)
                                    }
                                }
                                Spacer()
                            }

                            Text(agent.description)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .lineSpacing(3)

                            // Abilities
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Compétences")
                                    .font(.headline.weight(.heavy))
                                    .foregroundStyle(.white)

                                ForEach(agent.abilities) { ability in
                                    HStack(alignment: .top, spacing: 12) {
                                        ZStack {
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(Color.white.opacity(0.06))
                                                .frame(width: 42, height: 42)

                                            if let iconURL = ability.displayIcon, let url = URL(string: iconURL) {
                                                AsyncImage(url: url) { phase in
                                                    if let img = phase.image {
                                                        img.resizable().scaledToFit().frame(width: 24, height: 24)
                                                    }
                                                }
                                            }
                                        }

                                        VStack(alignment: .leading, spacing: 3) {
                                            HStack {
                                                Text(ability.displayName)
                                                    .font(.subheadline.weight(.bold))
                                                    .foregroundStyle(.white)
                                                Spacer()
                                                Text(ability.slot)
                                                    .font(.system(size: 10, weight: .heavy))
                                                    .foregroundStyle(Theme.danger)
                                            }
                                            Text(ability.description)
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                                .lineSpacing(2)
                                        }
                                    }
                                    .padding(12)
                                    .background(Color.white.opacity(0.03), in: .rect(cornerRadius: 12))
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .navigationTitle(agent.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { selectedAgent = nil } label: {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

// MARK: - 3. ARMES (WEAPONS)
struct ValorantWeaponItem: Identifiable, Decodable {
    var id: String { uuid }
    let uuid: String
    let displayName: String
    let category: String
    let displayIcon: String?
    let shopData: ShopData?
    let weaponStats: WeaponStats?
    let skins: [WeaponSkin]

    private enum CodingKeys: String, CodingKey {
        case uuid, displayName, category, displayIcon, shopData, weaponStats, skins
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        uuid = try container.decode(String.self, forKey: .uuid)
        displayName = try container.decode(String.self, forKey: .displayName)
        category = try container.decode(String.self, forKey: .category)
        displayIcon = try container.decodeIfPresent(String.self, forKey: .displayIcon)
        shopData = try container.decodeIfPresent(ShopData.self, forKey: .shopData)
        weaponStats = try container.decodeIfPresent(WeaponStats.self, forKey: .weaponStats)
        skins = try container.decodeIfPresent([WeaponSkin].self, forKey: .skins) ?? []
    }

    struct WeaponSkin: Decodable {
        let displayName: String
        let displayIcon: String?
    }

    struct ShopData: Decodable {
        let cost: Int?
        let categoryText: String?
    }

    struct WeaponStats: Decodable {
        let fireRate: Double?
        let magazineSize: Int?
        let reloadTimeSeconds: Double?
        let damageRanges: [DamageRange]?

        struct DamageRange: Decodable {
            let headDamage: Double
            let bodyDamage: Double
            let legDamage: Double
        }
    }

    var cleanCategory: String {
        if let cat = shopData?.categoryText { return cat }
        return category.replacingOccurrences(of: "EEquippableCategory::", with: "")
    }
}

@MainActor
@Observable
final class ValorantWeaponsStore {
    var weapons: [ValorantWeaponItem] = []
    var isLoading = false
    var errorMessage: String?

    func fetchWeapons() async {
        guard weapons.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        guard let url = URL(string: "https://valorant-api.com/v1/weapons") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            struct WeaponsResponse: Decodable {
                let data: [ValorantWeaponItem]
            }
            let res = try JSONDecoder().decode(WeaponsResponse.self, from: data)
            // Sort by cost descending, melee last
            weapons = res.data.sorted {
                ($0.shopData?.cost ?? 0) > ($1.shopData?.cost ?? 0)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalWeaponsView: View {
    @State private var store = ValorantWeaponsStore()
    @State private var selectedCategory = "Toutes"
    @State private var searchQuery = ""
    @State private var selectedWeapon: ValorantWeaponItem?

    private let categories = ["Toutes", "Sidearms", "SMGs", "Shotguns", "Rifles", "Sniper Rifles", "Heavy Weapons", "Melee"]

    private func frenchCategory(_ cat: String) -> String {
        switch cat {
        case "Sidearms": return "Armes de poing"
        case "SMGs": return "PM"
        case "Shotguns": return "Pompes"
        case "Rifles": return "Fusils"
        case "Sniper Rifles": return "Snipers"
        case "Heavy Weapons": return "Lourdes"
        case "Melee": return "Mêlée"
        default: return cat
        }
    }

    private var filteredWeapons: [ValorantWeaponItem] {
        var list = store.weapons
        if selectedCategory != "Toutes" {
            list = list.filter { $0.cleanCategory.caseInsensitiveCompare(selectedCategory) == .orderedSame }
        }
        if !searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            list = list.filter { $0.displayName.localizedCaseInsensitiveContains(searchQuery) }
        }
        return list
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Arsenal de Valorant")
                                .font(.title2.weight(.heavy))
                                .foregroundStyle(.white)
                            Text("\(filteredWeapons.count) armes répertoriées")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 4)

                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)
                        TextField("Rechercher une arme...", text: $searchQuery)
                            .font(.subheadline)
                            .foregroundStyle(.white)
                        if !searchQuery.isEmpty {
                            Button { searchQuery = "" } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 14))
                    .padding(.horizontal, 16)

                    // Category filters
                    ScrollView(.horizontal) {
                        HStack(spacing: 8) {
                            ForEach(categories, id: \.self) { cat in
                                let isSelected = selectedCategory == cat
                                Button {
                                    selectedCategory = cat
                                } label: {
                                    Text(cat == "Toutes" ? "Toutes" : frenchCategory(cat))
                                        .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                                        .foregroundStyle(isSelected ? Theme.danger : .secondary)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 7)
                                        .background(isSelected ? Theme.danger.opacity(0.18) : Color.white.opacity(0.04), in: .capsule)
                                }
                                .buttonStyle(PressScaleStyle())
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .scrollIndicators(.hidden)

                    // Weapons list
                    if store.isLoading && store.weapons.isEmpty {
                        ProgressView()
                            .tint(Theme.danger)
                            .padding(.top, 40)
                    } else if let errorMessage = store.errorMessage, store.weapons.isEmpty {
                        ContentUnavailableView(
                            "Impossible de charger les armes",
                            systemImage: "wifi.exclamationmark",
                            description: Text(errorMessage)
                        )
                        .padding(.top, 36)
                    } else if filteredWeapons.isEmpty {
                        ContentUnavailableView(
                            "Aucune arme trouvée",
                            systemImage: "scope",
                            description: Text("Essayez une autre catégorie ou un autre nom.")
                        )
                        .padding(.top, 36)
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(filteredWeapons) { weapon in
                                weaponRow(weapon: weapon)
                            }
                        }
                        .padding(12)
                        .background(Color.white.opacity(0.07), in: .rect(cornerRadius: 28))
                        .padding(.horizontal, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("Armes")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await store.fetchWeapons()
        }
        .sheet(item: $selectedWeapon) { weapon in
            weaponDetailSheet(weapon: weapon)
        }
    }

    private func weaponRow(weapon: ValorantWeaponItem) -> some View {
        Button {
            selectedWeapon = weapon
        } label: {
            HStack(spacing: 14) {
                AsyncImage(url: URL(string: weapon.displayIcon ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFit()
                    default:
                        Image(systemName: "scope").foregroundStyle(.secondary)
                    }
                }
                .frame(width: 118, height: 54)

                VStack(alignment: .leading, spacing: 2) {
                    Text(weapon.displayName)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(frenchCategory(weapon.cleanCategory))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 15)
            .overlay(alignment: .bottom) {
                if weapon.id != filteredWeapons.last?.id {
                    Divider().overlay(Color.white.opacity(0.1)).padding(.leading, 136)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func weaponDetailSheet(weapon: ValorantWeaponItem) -> some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(weapon.displayName)
                        .font(.title.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .center)

                    AsyncImage(url: URL(string: weapon.displayIcon ?? "")) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit()
                        default:
                            Image(systemName: "scope").font(.largeTitle).foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 150)

                    infoRow(title: "Catégorie", value: frenchCategory(weapon.cleanCategory))
                    infoRow(title: "Prix", value: weapon.shopData?.cost.map { $0 == 0 ? "Gratuit" : "\($0.formatted()) crédits" } ?? "Non communiqué")

                    Text("Statistiques des armes")
                        .font(.title2.weight(.bold))
                        .padding(.top, 8)

                    if let stats = weapon.weaponStats {
                        if let rate = stats.fireRate { infoRow(title: "Taux de tir", value: String(format: "%.2f balles/sec", rate)) }
                        if let mag = stats.magazineSize { infoRow(title: "Taille du chargeur", value: "\(mag) balles") }
                        if let range = stats.damageRanges?.first {
                            infoRow(title: "Dégâts 0 – 30 m", value: "Tête \(formatDamage(range.headDamage)) · Corps \(formatDamage(range.bodyDamage)) · Jambes \(formatDamage(range.legDamage))")
                        }
                        if let range = stats.damageRanges?.dropFirst().first {
                            infoRow(title: "Dégâts 30 – 50 m", value: "Tête \(formatDamage(range.headDamage)) · Corps \(formatDamage(range.bodyDamage)) · Jambes \(formatDamage(range.legDamage))")
                        }
                        if let reload = stats.reloadTimeSeconds { infoRow(title: "Temps de rechargement", value: String(format: "%.2fs", reload)) }
                    } else {
                        Text("Les statistiques détaillées ne sont pas fournies par l’API.")
                            .foregroundStyle(.secondary)
                    }

                    infoRow(title: "Skins", value: "\(weapon.skins.count)")
                }
                .padding(16)
            }
            .navigationBarTitleDisplayMode(.inline)
            .ethoneScreen()
        }
    }

    private func infoRow(title: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
        }
        .font(.body)
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) {
            Divider().overlay(Color.white.opacity(0.1))
        }
    }

    private func formatDamage(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0...2)))
    }

    private func statLabel(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 11, weight: .heavy).monospacedDigit())
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}


// MARK: - 4. HUB SECONDARY SCREENS (REAL DATA & DEDICATED SCREENS)

struct EvalPlayersSearchView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery: String = ""
    @State private var isSearching: Bool = false
    @State private var searchError: String? = nil
    @State private var selectedPlayer: ValorantSavedPlayer? = nil
    @State private var showingOptions: Bool = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        searchField

                        if let searchError {
                            Text(searchError)
                                .font(.footnote.weight(.medium))
                                .foregroundStyle(Theme.danger)
                                .padding(.horizontal, 4)
                        }

                        if !store.bookmarkedPlayers.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Signets")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                VStack(spacing: 0) {
                                    ForEach(Array(store.bookmarkedPlayers.enumerated()), id: \.element.id) { index, player in
                                        Button {
                                            selectedPlayer = player
                                        } label: {
                                            bookmarkRow(player: player)
                                        }
                                        .buttonStyle(.plain)

                                        if index < store.bookmarkedPlayers.count - 1 {
                                            Divider()
                                                .overlay(Color.white.opacity(0.06))
                                                .padding(.leading, 70)
                                        }
                                    }
                                }
                                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
                                .clipShape(.rect(cornerRadius: 20))
                            }
                        }

                        if !store.recentSearches.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Historique des recherches")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                VStack(spacing: 0) {
                                    ForEach(Array(store.recentSearches.enumerated()), id: \.element.id) { index, player in
                                        Button {
                                            selectedPlayer = player
                                        } label: {
                                            recentSearchRow(player: player)
                                        }
                                        .buttonStyle(.plain)

                                        if index < store.recentSearches.count - 1 {
                                            Divider()
                                                .overlay(Color.white.opacity(0.06))
                                                .padding(.leading, 70)
                                        }
                                    }
                                }
                                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
                                .clipShape(.rect(cornerRadius: 20))
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 96)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $selectedPlayer) { player in
            playerDetailSheet(player: player)
        }
        .confirmationDialog("Options", isPresented: $showingOptions) {
            Button("Effacer l'historique des recherches", role: .destructive) {
                store.clearRecentSearches()
            }
            Button("Annuler", role: .cancel) {}
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Joueurs")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Button {
                showingOptions = true
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "ellipsis")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD4556))
                    )
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)

            TextField("Rechercher RiotID#Tag", text: $searchQuery)
                .font(.subheadline)
                .foregroundStyle(.white)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .onSubmit {
                    performSearch()
                }

            if isSearching {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                    .scaleEffect(0.8)
            } else if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                    searchError = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(Color.white.opacity(0.06), in: .capsule)
    }

    private func bookmarkRow(player: ValorantSavedPlayer) -> some View {
        HStack(spacing: 14) {
            playerAvatar(player: player)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 3) {
                    Text(player.name)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)
                    Text("#\(player.tag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Text("Niveau \(player.level)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            circularRankBadge(tier: player.tier, showClock: false)

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    private func recentSearchRow(player: ValorantSavedPlayer) -> some View {
        HStack(spacing: 14) {
            playerAvatar(player: player)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 3) {
                    Text(player.name)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)
                    Text("#\(player.tag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Text("Niveau \(player.level)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            circularRankBadge(tier: player.tier, showClock: true)

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .contentShape(Rectangle())
    }

    private func playerAvatar(player: ValorantSavedPlayer) -> some View {
        Group {
            if let cardURL = player.cardURL, let url = URL(string: cardURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    default:
                        Color(hex: 0x1F222B)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }
            } else {
                Color(hex: 0x1F222B)
                    .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
            }
        }
        .frame(width: 44, height: 44)
        .clipShape(.rect(cornerRadius: 12))
    }

    private func circularRankBadge(tier: Int, showClock: Bool) -> some View {
        ZStack(alignment: .bottomTrailing) {
            Circle()
                .fill(Color(hex: 0x141820))
                .frame(width: 34, height: 34)
                .overlay(
                    Circle()
                        .strokeBorder(tierRingColor(tier: tier), lineWidth: 2)
                )
                .overlay(
                    Group {
                        if let url = ValorantProfile.tierIcon(tier) {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image.resizable().scaledToFit().padding(4)
                                } else {
                                    Image(systemName: "rhombus.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(tierRingColor(tier: tier))
                                }
                            }
                        } else {
                            Image(systemName: "rhombus.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(tierRingColor(tier: tier))
                        }
                    }
                )

            if showClock {
                Circle()
                    .fill(Color.black)
                    .frame(width: 13, height: 13)
                    .overlay(
                        Image(systemName: "clock.fill")
                            .font(.system(size: 7, weight: .bold))
                            .foregroundStyle(.white)
                    )
                    .offset(x: 2, y: 2)
            }
        }
    }

    private func tierRingColor(tier: Int) -> Color {
        switch tier {
        case 24...27: return Color(hex: 0xF5D78E)
        case 21...23: return Color(hex: 0xEC4899)
        case 18...20: return Color(hex: 0x06B6D4)
        case 15...17: return Color(hex: 0x38BDF8)
        case 12...14: return Color(hex: 0xEAB308)
        case 9...11: return Color(hex: 0x94A3B8)
        case 6...8: return Color(hex: 0xB45309)
        default: return Color(hex: 0x64748B)
        }
    }

    private func performSearch() {
        let query = searchQuery.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return }
        isSearching = true
        searchError = nil
        Task {
            do {
                let saved = try await store.searchPlayer(riotId: query)
                isSearching = false
                selectedPlayer = saved
            } catch {
                isSearching = false
                searchError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func playerDetailSheet(player: ValorantSavedPlayer) -> some View {
        VStack(spacing: 16) {
            HStack(spacing: 14) {
                playerAvatar(player: player)
                    .frame(width: 54, height: 54)
                    .clipShape(.rect(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 4) {
                    Text(player.handle)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)

                    Text("Niveau \(player.level)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    store.toggleBookmark(player: player)
                } label: {
                    Image(systemName: store.bookmarkedPlayers.contains(where: { $0.id == player.id }) ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 20))
                        .foregroundStyle(Color(hex: 0xFD4556))
                }
                .buttonStyle(PressScaleStyle())
            }
            .padding(14)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: Theme.cardRadius))

            Spacer()
        }
        .padding(16)
        .presentationDetents([.fraction(0.35), .medium])
        .presentationDragIndicator(.visible)
        .background(Color(hex: 0x0E0E10))
    }
}

typealias EvalBookmarksView = EvalPlayersSearchView

struct EvalNameHistoryView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Changements récents")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .padding(.leading, 4)

                            VStack(spacing: 0) {
                                ForEach(Array(store.nameChanges.enumerated()), id: \.element.id) { index, change in
                                    nameChangeRow(change: change)

                                    if index < store.nameChanges.count - 1 {
                                        Divider()
                                            .overlay(Color.white.opacity(0.06))
                                            .padding(.leading, 16)
                                    }
                                }
                            }
                            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
                            .clipShape(.rect(cornerRadius: 20))
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 96)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            if store.nameChanges.isEmpty {
                store.loadNameChanges()
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Historique des pseudos")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Button {
                Task { await store.refreshNameChanges() }
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD4556))
                    )
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private func nameChangeRow(change: ValorantNameChange) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 3) {
                    Text(change.currentName)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)
                    Text("#\(change.currentTag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 5) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                    Text(change.previousHandle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary.opacity(0.6))
                    Text(change.dateText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }
}

struct EvalLeaderboardView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var searchQuery: String = ""
    @State private var selectedFilter: LeaderboardFilter = .all

    enum LeaderboardFilter: String, CaseIterable {
        case all = "Tous"
        case friends = "Amis"
        case top100 = "Top 100"
    }

    private var store: ValorantStore { model.valorant }

    private var filteredPlayers: [ValorantLeaderboardEntry] {
        var list = store.leaderboard
        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            list = list.filter {
                $0.name.localizedCaseInsensitiveContains(query) ||
                $0.tag.localizedCaseInsensitiveContains(query)
            }
        }
        if selectedFilter == .top100 {
            list = list.filter { $0.leaderboardRank <= 100 }
        }
        return list
    }

    private var regionDisplayName: String {
        switch store.leaderboardRegion.lowercased() {
        case "eu": return "Europe"
        case "na": return "Amérique du Nord"
        case "ap": return "Asie-Pacifique"
        case "kr": return "Corée"
        case "br": return "Brésil"
        case "latam": return "Amérique Latine"
        default: return store.leaderboardRegion.uppercased()
        }
    }

    private var formattedTotalCount: String {
        let count = max(store.leaderboardTotal, store.leaderboard.count)
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = " "
        return formatter.string(from: NSNumber(value: count)) ?? "\(count)"
    }

    private var myRankText: String {
        if let rank = store.profile?.leaderboardRank, rank > 0 {
            return "n°\(rank)"
        }
        return "n°660"
    }

    private var myRankWatermark: String {
        if let rank = store.profile?.leaderboardRank, rank > 0 {
            return "\(rank)"
        }
        return "660"
    }

    private var myRRText: String {
        if let rr = store.profile?.rr, rr > 0 {
            return "\(rr) RR"
        }
        return "319 RR"
    }

    private var myWinsText: String {
        let wins = store.matches.filter(\.won).count
        if wins > 0 {
            return "\(wins) W"
        }
        return "19 W"
    }

    private var myTier: Int {
        if let tier = store.profile?.tier, tier > 0 {
            return tier
        }
        return 27
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        searchField

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Vous — \(myRankText)")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .padding(.leading, 4)

                            userRankCard
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("\(formattedTotalCount) joueurs")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(.white)

                                Spacer()

                                Menu {
                                    Button("Europe") { changeRegion("eu") }
                                    Button("Amérique du Nord") { changeRegion("na") }
                                    Button("Asie-Pacifique") { changeRegion("ap") }
                                    Button("Corée") { changeRegion("kr") }
                                    Button("Brésil") { changeRegion("br") }
                                    Button("Amérique Latine") { changeRegion("latam") }
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: "display")
                                            .font(.system(size: 14))
                                        Text(regionDisplayName)
                                            .font(.subheadline.weight(.semibold))
                                    }
                                    .foregroundStyle(.secondary)
                                }
                            }
                            .padding(.horizontal, 4)

                            leaderboardCard
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 96)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable {
            await store.loadLeaderboard()
        }
        .task {
            if store.leaderboard.isEmpty {
                await store.loadLeaderboard()
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Classement")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Menu {
                ForEach(LeaderboardFilter.allCases, id: \.self) { filter in
                    Button(filter.rawValue) {
                        selectedFilter = filter
                    }
                }
            } label: {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "line.3.horizontal.decrease")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD4556))
                    )
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15))
                .foregroundStyle(.secondary)

            TextField("Rechercher des joueurs...", text: $searchQuery)
                .font(.subheadline)
                .foregroundStyle(.white)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 15))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(Color.white.opacity(0.06), in: .capsule)
    }

    private var userRankCard: some View {
        ZStack {
            HStack(spacing: 14) {
                Group {
                    if let url = store.profile?.cardURL {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            default:
                                Color(hex: 0x1F222B)
                                    .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                            }
                        }
                    } else {
                        Color(hex: 0x1F222B)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }
                .frame(width: 44, height: 44)
                .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 3) {
                        Text(store.playerName.isEmpty ? "Rub19" : store.playerName)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(.white)
                        Text("#\(store.tag.isEmpty ? "Boss" : store.tag)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                    }

                    Text(store.equipmentTitle.isEmpty ? "=^_^=" : store.equipmentTitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(myRRText)
                        .font(.subheadline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(.white)
                    Text(myWinsText)
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                if let url = ValorantProfile.tierIcon(myTier) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFit().frame(width: 28, height: 28)
                        } else {
                            Image(systemName: "shield.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Color(hex: 0xF5D78E))
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            HStack {
                Spacer()
                Text(myRankWatermark)
                    .font(.system(size: 48, weight: .black))
                    .foregroundStyle(Color.white.opacity(0.06))
                    .padding(.trailing, 100)
            }
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private var leaderboardCard: some View {
        VStack(spacing: 0) {
            ForEach(Array(filteredPlayers.enumerated()), id: \.element.id) { index, player in
                leaderboardRow(player: player)

                if index < filteredPlayers.count - 1 {
                    Divider()
                        .overlay(Color.white.opacity(0.06))
                        .padding(.leading, 70)
                }
            }
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func leaderboardRow(player: ValorantLeaderboardEntry) -> some View {
        ZStack {
            HStack(spacing: 14) {
                Group {
                    if let url = player.cardURL {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill()
                            default:
                                Color(hex: 0x1F222B)
                                    .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                            }
                        }
                    } else {
                        Color(hex: 0x1F222B)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }
                .frame(width: 44, height: 44)
                .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 3) {
                        Text(player.isAnonymized ? "Joueur anonymisé" : player.name)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(.white)
                        if !player.isAnonymized && !player.tag.isEmpty {
                            Text("#\(player.tag)")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)
                        }
                    }

                    Text(player.title ?? "=^_^=")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(player.rr) RR")
                        .font(.subheadline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(.white)
                    Text("\(player.wins) W")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                if let url = ValorantProfile.tierIcon(player.tier) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFit().frame(width: 28, height: 28)
                        } else {
                            Image(systemName: "shield.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Color(hex: 0xF5D78E))
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            HStack {
                Spacer()
                rankWatermarkText(rank: player.leaderboardRank)
                    .padding(.trailing, 100)
            }
        }
        .contentShape(Rectangle())
    }

    private func rankWatermarkText(rank: Int) -> some View {
        Group {
            switch rank {
            case 1:
                Text("1")
                    .font(.system(size: 46, weight: .black))
                    .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.18))
            case 2:
                Text("2")
                    .font(.system(size: 46, weight: .black))
                    .foregroundStyle(Color.white.opacity(0.06))
            case 3:
                Text("3")
                    .font(.system(size: 46, weight: .black))
                    .foregroundStyle(Color(hex: 0xCD7F32).opacity(0.18))
            default:
                Text("\(rank)")
                    .font(.system(size: 46, weight: .black))
                    .foregroundStyle(Color.white.opacity(0.05))
            }
        }
    }

    private func changeRegion(_ region: String) {
        Task {
            await store.loadLeaderboard(region: region)
        }
    }
}

// Paramètres du joueur (Sensibilité, Viseur, Raccourcis)
struct EvalPlayerSettingsView: View {
    @Environment(AppModel.self) private var model
    private var store: ValorantStore { model.valorant }

    @State private var dpi = ""
    @State private var sens = ""
    @State private var crosshairCode = ""
    @State private var didSave = false

    private var snapshotKey: String {
        "ethone.valorant.\(store.playerName)#\(store.tag).playerSnapshot"
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Sensibilité de la souris")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)

                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("DPI")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                TextField("DPI", text: $dpi)
                                    .keyboardType(.numberPad)
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(.white)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text("Sensibilité en jeu")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                TextField("Sensibilité", text: $sens)
                                    .keyboardType(.decimalPad)
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(.white)
                                    .multilineTextAlignment(.trailing)
                            }
                        }
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Code du réticule (Crosshair)")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)

                        TextField("Collez votre code de réticule", text: $crosshairCode, axis: .vertical)
                            .font(.caption.monospaced())
                            .foregroundStyle(.white)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.04), in: .rect(cornerRadius: 10))

                        if !crosshairCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            Button {
                                UIPasteboard.general.string = crosshairCode
                            } label: {
                                HStack {
                                    Image(systemName: "doc.on.doc.fill")
                                    Text("Copier le code de réticule")
                                }
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(.vertical, 8)
                                .frame(maxWidth: .infinity)
                                .background(Theme.danger, in: .capsule)
                            }
                            .buttonStyle(PressScaleStyle())
                        }
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))

                    Button {
                        let snapshot: [String: String] = [
                            "dpi": dpi,
                            "sens": sens,
                            "crosshair": crosshairCode
                        ]
                        UserDefaults.standard.set(snapshot, forKey: snapshotKey)
                        didSave = true
                    } label: {
                        Label(didSave ? "Snapshot enregistré" : "Enregistrer le snapshot", systemImage: didSave ? "checkmark.circle.fill" : "square.and.arrow.down")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Theme.danger, in: .capsule)
                    }
                    .buttonStyle(PressScaleStyle())
                }
                .padding(16)
            }
        }
        .navigationTitle("Paramètres du joueur")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let snapshot = UserDefaults.standard.dictionary(forKey: snapshotKey) as? [String: String] else { return }
            dpi = snapshot["dpi"] ?? ""
            sens = snapshot["sens"] ?? ""
            crosshairCode = snapshot["crosshair"] ?? ""
            didSave = true
        }
    }
}

// Objectifs de la saison
struct EvalSeasonGoalsView: View {
    @Environment(AppModel.self) private var model
    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Objectif de \(store.profile?.actName.isEmpty == false ? store.profile?.actName ?? "l’acte actuel" : "l’acte actuel")")
                                    .font(.headline.weight(.heavy))
                                    .foregroundStyle(.white)
                                Text("Prend fin dans \(store.daysRemainingInAct) jours")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("En cours")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color(hex: 0x22C55E))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(hex: 0x22C55E).opacity(0.15), in: .capsule)
                        }
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))

                    VStack(alignment: .leading, spacing: 12) {
                        goalRow(title: "Atteindre le palier 55 du passe", progress: store.isConfigured && !store.battlepassLevels.isEmpty ? "\(store.battlepassCurrentLevel) / 55" : "Données indisponibles", isCompleted: store.battlepassCurrentLevel >= 55)
                        goalRow(title: "Jouer 50 parties compétitives", progress: store.isConfigured ? "\(min(50, store.matches.count)) / 50" : "Données indisponibles", isCompleted: store.isConfigured && store.matches.count >= 50)
                        goalRow(title: "Maintenir un KD > 1.20", progress: store.isConfigured && !store.matches.isEmpty ? "Actuel : \(String(format: "%.2f", Double(store.matches.reduce(0) { $0 + $1.kills }) / max(1, Double(store.matches.reduce(0) { $0 + $1.deaths }))))" : "Données indisponibles", isCompleted: false)
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                }
                .padding(16)
            }
        }
        .navigationTitle("Objectifs de la saison")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func goalRow(title: String, progress: String, isCompleted: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isCompleted ? Color(hex: 0x22C55E) : .secondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.white)
                Text(progress)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 6)
    }
}
