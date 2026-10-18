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
                let key = map.displayName.lowercased()
                if active.contains(key) { return map.withCompetitiveStatus(.active) }
                if upcoming.contains(key) { return map.withCompetitiveStatus(.upcoming) }
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
                            LazyVStack(spacing: 14) {
                                ForEach(filteredMaps) { map in
                                    mapCard(map: map)
                                }
                            }
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

    private func mapCard(map: ValorantMapItem) -> some View {
        Button {
            selectedMap = map
        } label: {
            ZStack(alignment: .bottomLeading) {
                // High-res splash background
                if let splashURL = map.splash ?? map.listViewIcon, let url = URL(string: splashURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .interpolation(.high)
                                .scaledToFill()
                                .frame(height: 140)
                                .frame(maxWidth: .infinity)
                                .clipped()
                        default:
                            Color(hex: 0x1A1C24).frame(height: 140)
                        }
                    }
                } else {
                    Color(hex: 0x1A1C24).frame(height: 140)
                }

                // Dark gradient overlay
                LinearGradient(
                    colors: [Color.black.opacity(0.85), Color.black.opacity(0.2), Color.clear],
                    startPoint: .bottom,
                    endPoint: .top
                )

                // Map Information
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        if map.isCompetitive {
                            Text(map.competitiveStatus == .active ? "COMPÉTITIVE" : "PROCHAINE ROTATION")
                                .font(.system(size: 10, weight: .black))
                                .foregroundStyle(Theme.danger)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Theme.danger.opacity(0.25), in: .capsule)
                        }

                        Text(map.displayName.uppercased())
                            .font(.title3.weight(.black))
                            .foregroundStyle(.white)

                        if let coords = map.coordinates {
                            Text(coords)
                                .font(.system(size: 11, weight: .medium).monospaced())
                                .foregroundStyle(.white.opacity(0.75))
                        }
                    }

                    Spacer()

                    // Overhead layout mini-preview
                    if let iconURL = map.displayIcon, let url = URL(string: iconURL) {
                        AsyncImage(url: url) { phase in
                            if let img = phase.image {
                                img.resizable().scaledToFit().frame(width: 44, height: 44)
                                    .background(Circle().fill(Color.black.opacity(0.4)))
                            }
                        }
                    }
                }
                .padding(14)
            }
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cardRadius)
                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(PressScaleStyle())
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

                    // Agents Grid
                    if store.isLoading && store.agents.isEmpty {
                        ProgressView()
                            .tint(Theme.danger)
                            .padding(.top, 40)
                    } else {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(filteredAgents) { agent in
                                agentGridCard(agent: agent)
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
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredWeapons) { weapon in
                                weaponCard(weapon: weapon)
                            }
                        }
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
    }

    private func weaponCard(weapon: ValorantWeaponItem) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(weapon.displayName)
                        .font(.headline.weight(.heavy))
                        .foregroundStyle(.white)
                    Text(frenchCategory(weapon.cleanCategory))
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if let cost = weapon.shopData?.cost {
                    Text(cost > 0 ? "\(cost.formatted()) Creds" : "Gratuit")
                        .font(.caption.weight(.heavy).monospacedDigit())
                        .foregroundStyle(Theme.danger)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Theme.danger.opacity(0.18), in: .capsule)
                }
            }

            // Weapon silhouette
            if let iconURL = weapon.displayIcon, let url = URL(string: iconURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(maxWidth: .infinity)
                            .frame(height: 70)
                            .padding(.vertical, 6)
                    default:
                        Color.clear.frame(height: 70)
                    }
                }
            }

            // Quick stats strip
            if let stats = weapon.weaponStats {
                HStack(spacing: 12) {
                    if let mag = stats.magazineSize {
                        statLabel(title: "Chargeur", value: "\(mag)")
                    }
                    if let rate = stats.fireRate {
                        statLabel(title: "Cadence", value: String(format: "%.1f/s", rate))
                    }
                    if let dmg = stats.damageRanges?.first {
                        statLabel(title: "Tête / Corps", value: "\(Int(dmg.headDamage)) / \(Int(dmg.bodyDamage))")
                    }
                    if let reload = stats.reloadTimeSeconds {
                        statLabel(title: "Rechargement", value: String(format: "%.1fs", reload))
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius)
                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
        )
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

// Signets (Bookmarks)
struct EvalBookmarksView: View {
    @Environment(AppModel.self) private var model
    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 16) {
                if store.userBookmarksCount == 0 {
                    VStack(spacing: 14) {
                        Image(systemName: "bookmark.slash")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("Aucun signet enregistré")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                        Text("Ajoutez des joueurs ou des configurations en signet depuis leurs profils pour les retrouver instantanément ici.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .padding(16)
                } else {
                    List {
                        Text("Signets actifs : \(store.userBookmarksCount)")
                            .foregroundStyle(.white)
                    }
                }
                Spacer()
            }
        }
        .navigationTitle("Signets")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Historique des pseudos
struct EvalNameHistoryView: View {
    @Environment(AppModel.self) private var model
    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 16) {
                if !store.isConfigured {
                    VStack(spacing: 12) {
                        Image(systemName: "person.text.rectangle.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(.secondary)
                        Text("Compte non connecté")
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                        Text("Connectez votre compte pour afficher l'historique officiel de vos changements de Riot ID.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 36)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .padding(16)
                } else {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Riot ID Actuel")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)

                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(store.playerName)#\(store.tag)")
                                    .font(.title3.weight(.heavy))
                                    .foregroundStyle(.white)
                                Text("Actif actuellement")
                                    .font(.caption)
                                    .foregroundStyle(Color(hex: 0x22C55E))
                            }
                            Spacer()
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundStyle(Color(hex: 0x22C55E))
                        }
                        .padding(14)
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    }
                    .padding(16)
                }
                Spacer()
            }
        }
        .navigationTitle("Historique des pseudos")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Classement Radiant
struct EvalLeaderboardView: View {
    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Top Radiant // Épisode 9")
                                .font(.headline.weight(.heavy))
                                .foregroundStyle(.white)
                            Text("Région Europe (EU)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text("Acte VI")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Theme.danger)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Theme.danger.opacity(0.18), in: .capsule)
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))

                    // Top 5 Mock Leaderboard Table
                    let topPlayers = [
                        ("1", "Chronicle", "FNC", "1,048 RR", "142 V"),
                        ("2", "Derke", "TH", "987 RR", "131 V"),
                        ("3", "Aspas", "LEV", "964 RR", "125 V"),
                        ("4", "TenZ", "SEN", "932 RR", "118 V"),
                        ("5", "Boaster", "FNC", "910 RR", "112 V")
                    ]

                    VStack(spacing: 0) {
                        ForEach(topPlayers, id: \.0) { rank, name, tag, rr, wins in
                            HStack(spacing: 12) {
                                Text(rank)
                                    .font(.subheadline.weight(.heavy).monospacedDigit())
                                    .foregroundStyle(rank == "1" ? Color(hex: 0xF59E0B) : .white)
                                    .frame(width: 24)

                                Image(systemName: "sparkles")
                                    .foregroundStyle(Theme.danger)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(name)#\(tag)")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(.white)
                                    Text(wins)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text(rr)
                                    .font(.caption.weight(.heavy).monospacedDigit())
                                    .foregroundStyle(Theme.danger)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)

                            if rank != "5" {
                                Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 48)
                            }
                        }
                    }
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                }
                .padding(16)
            }
        }
        .navigationTitle("Classement")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// Paramètres du joueur (Sensibilité, Viseur, Raccourcis)
struct EvalPlayerSettingsView: View {
    @Environment(AppModel.self) private var model
    private var store: ValorantStore { model.valorant }

    @State private var dpi = "800"
    @State private var sens = "0.35"
    @State private var crosshairCode = "0;P;c;5;o;1;d;1;z;3;f;0;0t;6;0l;1;0a;1;0f;0;1b;0"

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
                                TextField("800", text: $dpi)
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(.white)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 2) {
                                Text("Sensibilité en jeu")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                TextField("0.35", text: $sens)
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

                        Text(crosshairCode)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.white.opacity(0.04), in: .rect(cornerRadius: 10))

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
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                }
                .padding(16)
            }
        }
        .navigationTitle("Paramètres du joueur")
        .navigationBarTitleDisplayMode(.inline)
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
                                Text("Objectif de l'Acte VI")
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
                        goalRow(title: "Atteindre le palier 55 du passe", progress: store.isConfigured ? "\(store.battlepassCurrentLevel) / 55" : "0 / 55", isCompleted: store.battlepassCurrentLevel >= 55)
                        goalRow(title: "Jouer 50 parties compétitives", progress: "\(min(50, store.matches.count)) / 50", isCompleted: store.matches.count >= 50)
                        goalRow(title: "Maintenir un KD > 1.20", progress: "Actuel : \(store.matches.isEmpty ? "0.0" : String(format: "%.2f", Double(store.matches.reduce(0) { $0 + $1.kills }) / max(1, Double(store.matches.reduce(0) { $0 + $1.deaths }))))", isCompleted: false)
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
