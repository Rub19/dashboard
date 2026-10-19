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
    let initialTab: EvalGameInfoTab

    init(initialTab: EvalGameInfoTab = .maps) {
        self.initialTab = initialTab
    }

    var body: some View {
        Group {
            switch initialTab {
            case .maps:
                EvalMapsView()
            case .agents:
                EvalAgentsView()
            case .weapons:
                EvalWeaponsView()
            }
        }
    }
}

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

    init(
        uuid: String,
        displayName: String,
        narrativeDescription: String? = nil,
        tacticalDescription: String? = "A/B Sites",
        coordinates: String? = nil,
        displayIcon: String? = nil,
        listViewIcon: String? = nil,
        splash: String? = nil,
        callouts: [MapCallout]? = nil,
        competitiveStatus: CompetitiveMapStatus = .active
    ) {
        self.uuid = uuid
        self.displayName = displayName
        self.narrativeDescription = narrativeDescription
        self.tacticalDescription = tacticalDescription
        self.coordinates = coordinates
        self.displayIcon = displayIcon ?? "https://media.valorant-api.com/maps/\(uuid)/displayicon.png"
        self.listViewIcon = listViewIcon ?? "https://media.valorant-api.com/maps/\(uuid)/listviewicon.png"
        self.splash = splash ?? "https://media.valorant-api.com/maps/\(uuid)/splash.png"
        self.callouts = callouts
        self.competitiveStatus = competitiveStatus
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

    init() {
        maps = Self.defaultMaps
    }

    static let defaultMaps: [ValorantMapItem] = [
        ValorantMapItem(uuid: "224b0a95-48b9-f703-1bd8-67aca101a61f", displayName: "Abyss"),
        ValorantMapItem(uuid: "7eaecc1b-4337-bbf6-6ab9-04b8f06b3319", displayName: "Ascent"),
        ValorantMapItem(uuid: "2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba", displayName: "Bind"),
        ValorantMapItem(uuid: "2fb9a4fd-47b8-4e7d-a969-74b4046ebd53", displayName: "Breeze"),
        ValorantMapItem(uuid: "1c18ab1f-420d-0d8b-71d0-77ad3c439115", displayName: "Corrode"),
        ValorantMapItem(uuid: "b529448b-4d60-346e-e89e-00a4c527a405", displayName: "Fracture"),
        ValorantMapItem(uuid: "2bee0dc9-4ffe-519b-1cbd-7fbe763a6047", displayName: "Haven", tacticalDescription: "A/B/C Sites"),
        ValorantMapItem(uuid: "e2ad5c54-4114-a870-9641-8ea21279579a", displayName: "Icebox"),
        ValorantMapItem(uuid: "2fe4ed3a-450a-948b-6d6b-e89a78e680a9", displayName: "Lotus", tacticalDescription: "A/B/C Sites"),
        ValorantMapItem(uuid: "fd267378-4d1d-484f-ff52-77821ed10dc2", displayName: "Pearl"),
        ValorantMapItem(uuid: "d960549e-485c-e861-8d71-aa9d1aed12a2", displayName: "Split"),
        ValorantMapItem(uuid: "756da597-416b-c0f2-f47b-afbdf28670bc", displayName: "Summit"),
        ValorantMapItem(uuid: "92584fbe-486a-b1b2-9faa-39b0f486b498", displayName: "Sunset")
    ]

    func fetchMaps(apiKey: String = "") async {
        guard let mapsURL = URL(string: "https://valorant-api.com/v1/maps") else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            struct MapsResponse: Decodable {
                let data: [ValorantMapItem]
            }
            let (mapsData, _) = try await URLSession.shared.data(from: mapsURL)
            let response = try JSONDecoder().decode(MapsResponse.self, from: mapsData)
            let filtered = response.data
                .filter { $0.tacticalDescription != nil && !($0.tacticalDescription?.isEmpty ?? true) }
                .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            if !filtered.isEmpty {
                maps = filtered
            }
        } catch {
            if maps.isEmpty {
                maps = Self.defaultMaps
            }
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalMapsView: View {
    @Environment(.dismiss) private var dismiss
    @State private var store = ValorantMapsStore()
    @State private var selectedMap: ValorantMapItem?

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        mapsCard
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
            await store.fetchMaps()
        }
        .refreshable {
            await store.fetchMaps()
        }
        .sheet(item: $selectedMap) { map in
            mapDetailSheet(map: map)
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

            Text("Cartes")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Color.clear
                .frame(width: 38, height: 38)
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var mapsCard: some View {
        VStack(spacing: 0) {
            ForEach(Array(store.maps.enumerated()), id: \.element.id) { index, map in
                Button {
                    selectedMap = map
                } label: {
                    mapRow(map: map)
                }
                .buttonStyle(.plain)

                if index < store.maps.count - 1 {
                    Divider()
                        .overlay(Color.white.opacity(0.06))
                        .padding(.leading, 106)
                }
            }
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func mapRow(map: ValorantMapItem) -> some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: map.listViewIcon ?? map.splash ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    Color(hex: 0x1F222B)
                        .overlay(Image(systemName: "map.fill").foregroundStyle(.secondary))
                }
            }
            .frame(width: 76, height: 44)
            .clipShape(.rect(cornerRadius: 10))

            Text(map.displayName)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(.white)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func mapDetailSheet(map: ValorantMapItem) -> some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 18) {
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

struct ValorantAgentItem: Identifiable, Decodable {
    var id: String { uuid }
    let uuid: String
    let displayName: String
    let description: String
    let displayIcon: String?
    let displayIconSmall: String?
    let fullPortrait: String?
    let background: String?
    let role: AgentRole?
    let abilities: [AgentAbility]

    struct AgentRole: Decodable {
        let displayName: String
        let displayIcon: String?
        let description: String?

        init(displayName: String, displayIcon: String? = nil, description: String? = nil) {
            self.displayName = displayName
            self.displayIcon = displayIcon
            self.description = description
        }
    }

    struct AgentAbility: Decodable, Identifiable {
        var id: String { "\(slot)-\(displayName)" }
        let slot: String
        let displayName: String
        let description: String
        let displayIcon: String?
    }

    private enum CodingKeys: String, CodingKey {
        case uuid, displayName, description, displayIcon, displayIconSmall
        case fullPortrait, background, role, abilities
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        uuid = try container.decode(String.self, forKey: .uuid)
        displayName = try container.decode(String.self, forKey: .displayName)
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        displayIcon = try container.decodeIfPresent(String.self, forKey: .displayIcon)
        displayIconSmall = try container.decodeIfPresent(String.self, forKey: .displayIconSmall)
        fullPortrait = try container.decodeIfPresent(String.self, forKey: .fullPortrait)
        background = try container.decodeIfPresent(String.self, forKey: .background)
        role = try container.decodeIfPresent(AgentRole.self, forKey: .role)
        abilities = try container.decodeIfPresent([AgentAbility].self, forKey: .abilities) ?? []
    }

    init(
        uuid: String,
        displayName: String,
        description: String = "",
        displayIcon: String? = nil,
        displayIconSmall: String? = nil,
        fullPortrait: String? = nil,
        background: String? = nil,
        role: AgentRole? = nil,
        abilities: [AgentAbility] = []
    ) {
        self.uuid = uuid
        self.displayName = displayName
        self.description = description
        self.displayIcon = displayIcon ?? "https://media.valorant-api.com/agents/\(uuid)/displayicon.png"
        self.displayIconSmall = displayIconSmall ?? "https://media.valorant-api.com/agents/\(uuid)/displayiconsmall.png"
        self.fullPortrait = fullPortrait ?? "https://media.valorant-api.com/agents/\(uuid)/fullportrait.png"
        self.background = background
        self.role = role
        self.abilities = abilities
    }
}

@MainActor
@Observable
final class ValorantAgentsStore {
    var agents: [ValorantAgentItem] = []
    var isLoading = false
    var errorMessage: String?

    init() {
        agents = Self.defaultAgents
    }

    static let defaultAgents: [ValorantAgentItem] = [
        ValorantAgentItem(uuid: "41fb69c1-4189-7b37-f117-bcaf1e96f1bf", displayName: "Astra", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "9f0d8ba9-4140-b941-57d3-a7ad57c6b417", displayName: "Brimstone", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "1dbf2edd-4729-0984-3115-daa5eed44993", displayName: "Clove", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "95b78ed7-4637-86d9-7e41-71ba8c293152", displayName: "Harbor", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "7c8a4701-4de6-9355-b254-e09bc2a34b72", displayName: "Miks", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "8e253930-4c05-31dd-1b6c-968525494517", displayName: "Omen", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "707eab51-4836-f488-046a-cda6bf494859", displayName: "Viper", role: ValorantAgentItem.AgentRole(displayName: "Controller", displayIcon: "https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png")),
        ValorantAgentItem(uuid: "0e38b510-41a8-5780-5e8f-568b2a4f2d6c", displayName: "Iso", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "add6443a-41bd-e414-f6ad-e58d267f4e95", displayName: "Jett", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "bb2a4828-46eb-8cd1-e765-15848195d751", displayName: "Neon", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "eb93336a-449b-9c1b-0a54-a891f7921d69", displayName: "Phoenix", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "f94c3b30-42be-e959-889c-5aa313dba261", displayName: "Raze", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc", displayName: "Reyna", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "df1cb487-4902-002e-5c17-d28e83e78588", displayName: "Waylay", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "7f94d92c-4234-0a36-9646-3a87eb8b5c89", displayName: "Yoru", role: ValorantAgentItem.AgentRole(displayName: "Duelist", displayIcon: "https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png")),
        ValorantAgentItem(uuid: "5f8d3a7f-467b-97f3-062c-13acf203c006", displayName: "Breach", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "dade69b4-4f5a-8528-247b-219e5a1facd6", displayName: "Fade", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "e370fa57-4757-3604-3648-499e1f642d3f", displayName: "Gekko", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "601dbbe7-43ce-be57-2a40-4abd24953621", displayName: "KAY/O", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "6f2a04ca-43e0-be17-7f36-b3908627744d", displayName: "Skye", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "320b2a48-4d9b-a075-30f1-1f93a9b638fa", displayName: "Sova", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "b444168c-4e35-8076-db47-ef9bf368f384", displayName: "Tejo", role: ValorantAgentItem.AgentRole(displayName: "Initiator", displayIcon: "https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png")),
        ValorantAgentItem(uuid: "22697a3d-45bf-8dd7-4fec-84a9e28c69d7", displayName: "Chamber", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png")),
        ValorantAgentItem(uuid: "117ed9e3-49f3-6512-3ccf-0cada7e3823b", displayName: "Cypher", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png")),
        ValorantAgentItem(uuid: "cc8b64c8-4b25-4ff9-6e7f-37b4da43d235", displayName: "Deadlock", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png")),
        ValorantAgentItem(uuid: "1e58de9c-4950-5125-93e9-a0aee9f98746", displayName: "Killjoy", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png")),
        ValorantAgentItem(uuid: "569fdd95-4d10-43ab-ca70-79becc718b46", displayName: "Sage", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png")),
        ValorantAgentItem(uuid: "efba5359-4016-a1e5-7626-b1ae76895940", displayName: "Vyse", role: ValorantAgentItem.AgentRole(displayName: "Sentinel", displayIcon: "https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png"))
    ]

    func fetchAgents() async {
        guard let url = URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true") else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            struct AgentsResponse: Decodable {
                let data: [ValorantAgentItem]
            }
            let res = try JSONDecoder().decode(AgentsResponse.self, from: data)
            let sorted = res.data.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            if !sorted.isEmpty {
                agents = sorted
            }
        } catch {
            if agents.isEmpty {
                agents = Self.defaultAgents
            }
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalAgentsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var store = ValorantAgentsStore()
    @State private var selectedAgent: ValorantAgentItem?

    private struct AgentRoleSection: Identifiable {
        var id: String { roleKey }
        let roleKey: String
        let title: String
        let iconURL: String?
        let agents: [ValorantAgentItem]
    }

    private var roleSections: [AgentRoleSection] {
        let roleOrder = ["Controller", "Duelist", "Initiator", "Sentinel"]
        return roleOrder.compactMap { roleKey in
            let matching = store.agents.filter { ($0.role?.displayName ?? "").caseInsensitiveCompare(roleKey) == .orderedSame }
            guard !matching.isEmpty else { return nil }
            let icon = matching.first?.role?.displayIcon
            return AgentRoleSection(
                roleKey: roleKey,
                title: roleFrenchName(roleKey),
                iconURL: icon,
                agents: matching.sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
            )
        }
    }

    private func roleFrenchName(_ role: String) -> String {
        switch role.lowercased() {
        case "controller": return "Contrôleur"
        case "duelist": return "Duelliste"
        case "initiator": return "Initiateur"
        case "sentinel": return "Sentinelle"
        default: return role
        }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        ForEach(roleSections) { section in
                            VStack(alignment: .leading, spacing: 8) {
                                roleHeader(section: section)
                                roleCard(section: section)
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
        .task {
            await store.fetchAgents()
        }
        .refreshable {
            await store.fetchAgents()
        }
        .sheet(item: $selectedAgent) { agent in
            agentDetailSheet(agent: agent)
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

            Text("Agents")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Color.clear
                .frame(width: 38, height: 38)
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private func roleHeader(section: AgentRoleSection) -> some View {
        HStack(spacing: 8) {
            if let iconURL = section.iconURL, let url = URL(string: iconURL) {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .renderingMode(.template)
                            .scaledToFit()
                            .frame(width: 18, height: 18)
                    } else {
                        Image(systemName: "circle.grid.cross")
                            .font(.system(size: 14))
                    }
                }
                .foregroundStyle(.secondary)
            }

            Text(section.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.leading, 4)
    }

    private func roleCard(section: AgentRoleSection) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(section.agents.enumerated()), id: \.element.id) { index, agent in
                Button {
                    selectedAgent = agent
                } label: {
                    agentRow(agent: agent)
                }
                .buttonStyle(.plain)

                if index < section.agents.count - 1 {
                    Divider()
                        .overlay(Color.white.opacity(0.06))
                        .padding(.leading, 70)
                }
            }
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func agentRow(agent: ValorantAgentItem) -> some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: agent.displayIconSmall ?? agent.displayIcon ?? "")) { phase in
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
            .frame(width: 44, height: 44)
            .clipShape(.rect(cornerRadius: 12))

            Text(agent.displayName)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(.white)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func agentDetailSheet(agent: ValorantAgentItem) -> some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
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

                            VStack(alignment: .leading, spacing: 10) {
                                Text("Compétences")
                                    .font(.subheadline.weight(.heavy))
                                    .foregroundStyle(.white)

                                ForEach(agent.abilities) { ability in
                                    HStack(alignment: .top, spacing: 12) {
                                        if let icon = ability.displayIcon, let url = URL(string: icon) {
                                            AsyncImage(url: url) { phase in
                                                if let img = phase.image {
                                                    img.resizable().renderingMode(.template).scaledToFit()
                                                        .frame(width: 32, height: 32)
                                                        .foregroundStyle(Theme.danger)
                                                        .padding(6)
                                                        .glassEffect(.regular, in: .rect(cornerRadius: 10))
                                                }
                                            }
                                        }

                                        VStack(alignment: .leading, spacing: 2) {
                                            HStack(spacing: 6) {
                                                Text(ability.displayName)
                                                    .font(.subheadline.weight(.bold))
                                                    .foregroundStyle(.white)
                                                Text(ability.slot)
                                                    .font(.caption2.weight(.heavy))
                                                    .foregroundStyle(.secondary)
                                                    .padding(.horizontal, 6)
                                                    .padding(.vertical, 2)
                                                    .background(Color.white.opacity(0.06), in: .capsule)
                                            }

                                            Text(ability.description)
                                                .font(.caption)
                                                .foregroundStyle(.secondary)
                                                .lineSpacing(2)
                                        }
                                    }
                                    .padding(10)
                                    .glassEffect(.regular, in: .rect(cornerRadius: 12))
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
    @Environment(\.dismiss) private var dismiss
    @State private var store = ValorantWeaponsStore()
    @State private var selectedWeapon: ValorantWeaponItem?

    private struct WeaponCategorySection: Identifiable {
        var id: String { categoryKey }
        let categoryKey: String
        let title: String
        let weapons: [ValorantWeaponItem]
    }

    private var categorySections: [WeaponCategorySection] {
        let order = ["Rifles", "Sidearms", "SMGs", "Shotguns", "Sniper Rifles", "Heavy Weapons", "Melee"]
        return order.compactMap { key in
            let matching = store.weapons.filter { $0.cleanCategory.caseInsensitiveCompare(key) == .orderedSame }
            guard !matching.isEmpty else { return nil }
            return WeaponCategorySection(
                categoryKey: key,
                title: frenchCategory(key),
                weapons: matching.sorted { ($0.shopData?.cost ?? 0) > ($1.shopData?.cost ?? 0) }
            )
        }
    }

    private func frenchCategory(_ cat: String) -> String {
        switch cat.lowercased() {
        case "rifles": return "Fusils"
        case "sidearms": return "Armes de poing"
        case "smgs": return "PM"
        case "shotguns": return "Pompes"
        case "sniper rifles": return "Snipers"
        case "heavy weapons": return "Lourdes"
        case "melee": return "Mêlée"
        default: return cat
        }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        ForEach(categorySections) { section in
                            VStack(alignment: .leading, spacing: 8) {
                                Text(section.title)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                categoryCard(section: section)
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
        .task {
            await store.fetchWeapons()
        }
        .refreshable {
            await store.fetchWeapons()
        }
        .sheet(item: $selectedWeapon) { weapon in
            weaponDetailSheet(weapon: weapon)
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

            Text("Armes")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Color.clear
                .frame(width: 38, height: 38)
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private func categoryCard(section: WeaponCategorySection) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(section.weapons.enumerated()), id: \.element.id) { index, weapon in
                Button {
                    selectedWeapon = weapon
                } label: {
                    weaponRow(weapon: weapon)
                }
                .buttonStyle(.plain)

                if index < section.weapons.count - 1 {
                    Divider()
                        .overlay(Color.white.opacity(0.06))
                        .padding(.leading, 90)
                }
            }
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func weaponRow(weapon: ValorantWeaponItem) -> some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: weapon.displayIcon ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .frame(width: 64, height: 32)
                default:
                    Color(hex: 0x1F222B)
                        .frame(width: 64, height: 32)
                        .clipShape(.rect(cornerRadius: 8))
                }
            }

            Text(weapon.displayName)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(.white)

            Spacer()

            if let cost = weapon.shopData?.cost, cost > 0 {
                Text("\(cost)")
                    .font(.caption.monospacedDigit().weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
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
