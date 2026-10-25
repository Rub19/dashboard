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
        guard let mapsURL = URL(string: "https://valorant-api.com/v1/maps?language=fr-FR") else { return }
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
    @Environment(\.dismiss) private var dismiss
    @State private var store = ValorantMapsStore()
    @State private var selectedMap: ValorantMapItem?

    var body: some View {
        ZStack {
            EvalColors.background.ignoresSafeArea()

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
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Cartes")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Color.clear
                .frame(width: 44, height: 44)
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
                        .overlay(EvalColors.text.opacity(0.06))
                        .padding(.leading, 106)
                }
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                .foregroundStyle(EvalColors.text)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func mapDetailSheet(map: ValorantMapItem) -> some View {
        NavigationStack {
            ZStack {
                EvalColors.background.ignoresSafeArea()

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
                                        .foregroundStyle(EvalColors.text)
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
                                        .foregroundStyle(EvalColors.text)

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
                                        .foregroundStyle(EvalColors.text)

                                    let uniqueCallouts = Array(Set(callouts.map { $0.regionName })).sorted()
                                    FlowLayout(spacing: 8) {
                                        ForEach(uniqueCallouts, id: \.self) { zone in
                                            Text(zone)
                                                .font(.caption.weight(.medium))
                                                .foregroundStyle(.secondary)
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 5)
                                                .background(EvalColors.text.opacity(0.06), in: .capsule)
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
        guard let url = URL(string: "https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=fr-FR") else { return }
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
            let matching = store.agents.filter { agent in [roleKey, roleFrenchName(roleKey)].contains { (agent.role?.displayName ?? "").caseInsensitiveCompare($0) == .orderedSame } }
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
            EvalColors.background.ignoresSafeArea()

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
            EvalAgentDetailView(agent: agent)
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Agents")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Color.clear
                .frame(width: 44, height: 44)
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
                            .frame(width: 21, height: 21)
                    } else {
                        Image(systemName: "circle.grid.cross")
                            .font(.system(size: 16))
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
                        .overlay(EvalColors.text.opacity(0.06))
                        .padding(.leading, 70)
                }
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
            .frame(width: 51, height: 51)
            .clipShape(.rect(cornerRadius: 12))

            Text(agent.displayName)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
}

struct EvalAgentDetailView: View {
    let agent: ValorantAgentItem
    @Environment(\.dismiss) private var dismiss
    @State private var selectedSlot: String = "Grenade"

    private func slotPriority(_ slot: String) -> Int {
        switch slot.lowercased() {
        case "grenade": return 0
        case "ability1": return 1
        case "ability2": return 2
        case "ultimate": return 3
        default: return 4
        }
    }

    private var sortedAbilities: [ValorantAgentItem.AgentAbility] {
        agent.abilities.sorted { slotPriority($0.slot) < slotPriority($1.slot) }
    }

    private var activeAbility: ValorantAgentItem.AgentAbility? {
        sortedAbilities.first { $0.slot == selectedSlot } ?? sortedAbilities.first
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
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(spacing: 16) {
                        heroBanner

                        roleCard

                        abilitiesCard
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            if let firstSlot = sortedAbilities.first?.slot {
                selectedSlot = firstSlot
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text(agent.displayName)
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var heroBanner: some View {
        ZStack(alignment: .center) {
            if let bg = agent.background, let url = URL(string: bg) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable()
                            .scaledToFit()
                            .frame(height: 280)
                            .opacity(0.85)
                    }
                }
            }

            if let portrait = agent.fullPortrait ?? agent.displayIcon, let url = URL(string: portrait) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable()
                            .scaledToFit()
                            .frame(height: 320)
                    }
                }
            }

            LinearGradient(
                colors: [Color.clear, Color.black.opacity(0.8)],
                startPoint: .center,
                endPoint: .bottom
            )
        }
        .frame(height: 330)
        .frame(maxWidth: .infinity)
        .clipped()
    }

    private var roleCard: some View {
        VStack(spacing: 14) {
            HStack(spacing: 8) {
                if let roleIcon = agent.role?.displayIcon, let url = URL(string: roleIcon) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable()
                                .renderingMode(.template)
                                .scaledToFit()
                                .frame(width: 25, height: 25)
                                .foregroundStyle(EvalColors.text)
                        }
                    }
                }

                Text(roleFrenchName(agent.role?.displayName ?? ""))
                    .font(.system(size: 23, weight: .bold))
                    .foregroundStyle(EvalColors.text)
            }

            Divider()
                .overlay(EvalColors.text.opacity(0.08))

            Text(agent.description)
                .font(.system(size: 17))
                .foregroundStyle(Color(hex: 0xA0A0A5))
                .lineSpacing(4)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(20)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var abilitiesCard: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                ForEach(sortedAbilities) { ability in
                    let isSelected = (activeAbility?.slot == ability.slot)
                    Button {
                        selectedSlot = ability.slot
                    } label: {
                        ZStack {
                            Circle()
                                .fill(Color(hex: 0x222226))
                                .frame(width: 64, height: 64)

                            if isSelected {
                                Circle()
                                    .stroke(EvalAccent.color, lineWidth: 2.5)
                                    .frame(width: 64, height: 64)
                            }

                            if let icon = ability.displayIcon, let url = URL(string: icon) {
                                AsyncImage(url: url) { phase in
                                    if let img = phase.image {
                                        img.resizable()
                                            .renderingMode(.template)
                                            .scaledToFit()
                                            .frame(width: 32, height: 32)
                                            .foregroundStyle(isSelected ? EvalAccent.color : EvalColors.text.opacity(0.45))
                                    }
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(maxWidth: .infinity)

            if let ability = activeAbility {
                Text(ability.displayName)
                    .font(.system(size: 23, weight: .bold))
                    .foregroundStyle(EvalColors.text)
                    .padding(.top, 4)

                Text(ability.description)
                    .font(.system(size: 17))
                    .foregroundStyle(Color(hex: 0xA0A0A5))
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(20)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }
}
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

    init(
        uuid: String,
        displayName: String,
        category: String = "Armes de poing",
        displayIcon: String? = nil,
        shopData: ShopData? = nil,
        weaponStats: WeaponStats? = nil,
        skins: [WeaponSkin] = []
    ) {
        self.uuid = uuid
        self.displayName = displayName
        self.category = category
        self.displayIcon = displayIcon
        self.shopData = shopData
        self.weaponStats = weaponStats
        self.skins = skins
    }

    struct WeaponSkin: Decodable, Identifiable, Hashable {
        struct Chroma: Decodable, Hashable { let uuid: String; let displayName: String?; let displayIcon: String?; let fullRender: String?; let swatch: String?; let streamedVideo: String? }
        struct Level: Decodable, Hashable { let uuid: String; let displayName: String?; let levelItem: String?; let streamedVideo: String? }
        let uuid: String?
        let displayName: String
        let displayIcon: String?
        let chromas: [Chroma]?
        let levels: [Level]?
        var id: String { uuid ?? displayName }
        /// Icône utilisable : celle du skin, sinon le rendu du premier chroma.
        var image: String? { chromas?.first?.fullRender ?? displayIcon ?? chromas?.first?.displayIcon }
    }

    struct ShopData: Decodable {
        let cost: Int?
        let categoryText: String?

        init(cost: Int? = nil, categoryText: String? = nil) {
            self.cost = cost
            self.categoryText = categoryText
        }
    }

    struct WeaponStats: Decodable {
        let fireRate: Double?
        let magazineSize: Int?
        let runSpeedMultiplier: Double?
        let equipTimeSeconds: Double?
        let reloadTimeSeconds: Double?
        let firstBulletAccuracy: Double?
        let damageRanges: [DamageRange]?

        init(
            fireRate: Double? = nil,
            magazineSize: Int? = nil,
            runSpeedMultiplier: Double? = nil,
            equipTimeSeconds: Double? = nil,
            reloadTimeSeconds: Double? = nil,
            firstBulletAccuracy: Double? = nil,
            damageRanges: [DamageRange]? = nil
        ) {
            self.fireRate = fireRate
            self.magazineSize = magazineSize
            self.runSpeedMultiplier = runSpeedMultiplier
            self.equipTimeSeconds = equipTimeSeconds
            self.reloadTimeSeconds = reloadTimeSeconds
            self.firstBulletAccuracy = firstBulletAccuracy
            self.damageRanges = damageRanges
        }

        struct DamageRange: Decodable {
            let rangeStartMeters: Double?
            let rangeEndMeters: Double?
            let headDamage: Double
            let bodyDamage: Double
            let legDamage: Double

            init(
                rangeStartMeters: Double? = nil,
                rangeEndMeters: Double? = nil,
                headDamage: Double,
                bodyDamage: Double,
                legDamage: Double
            ) {
                self.rangeStartMeters = rangeStartMeters
                self.rangeEndMeters = rangeEndMeters
                self.headDamage = headDamage
                self.bodyDamage = bodyDamage
                self.legDamage = legDamage
            }
        }
    }

    var cleanCategory: String {
        if let cat = shopData?.categoryText, !cat.isEmpty {
            return cat
        }
        if displayName == "Mêlée" { return "Mêlée" }
        let raw = category.replacingOccurrences(of: "EEquippableCategory::", with: "")
        switch raw.lowercased() {
        case "sidearms", "pistols": return "Armes de poing"
        case "smgs": return "PM"
        case "shotguns": return "Fusils à pompe"
        case "rifles": return "Fusils d'assaut"
        case "sniper", "sniperrifles": return "Fusils de sniper"
        case "heavyweapons": return "Armes lourdes"
        case "melee": return "Mêlée"
        default: return raw
        }
    }
}

@MainActor
@Observable
final class ValorantWeaponsStore {
    var weapons: [ValorantWeaponItem] = []
    var isLoading = false
    var errorMessage: String?

    init() {
        weapons = Self.defaultWeapons.sorted(by: Self.sortWeapons)
    }

    static let weaponOrder = [
        "Classic", "Shorty", "Frenzy", "Ghost", "Bandit", "Sheriff",
        "Stinger", "Spectre", "Bucky", "Judge",
        "Bulldog", "Guardian", "Phantom", "Vandal",
        "Marshal", "Outlaw", "Operator",
        "Ares", "Odin", "Warden", "Mêlée"
    ]

    static func sortWeapons(_ w1: ValorantWeaponItem, _ w2: ValorantWeaponItem) -> Bool {
        let idx1 = weaponOrder.firstIndex(of: w1.displayName) ?? 999
        let idx2 = weaponOrder.firstIndex(of: w2.displayName) ?? 999
        return idx1 < idx2
    }

    static let defaultWeapons: [ValorantWeaponItem] = [
        ValorantWeaponItem(uuid: "29a0cfab-485b-f5d5-779a-b59f85e204a8", displayName: "Classic", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/29a0cfab-485b-f5d5-779a-b59f85e204a8/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 0, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "42da8ccc-40d5-affc-beec-15aa47b42eda", displayName: "Shorty", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/42da8ccc-40d5-affc-beec-15aa47b42eda/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 300, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "44d4e95c-4157-0037-81b2-17841bf2e8e3", displayName: "Frenzy", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/44d4e95c-4157-0037-81b2-17841bf2e8e3/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 450, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "1baa85b4-4c70-1284-64bb-6481dfc3bb4e", displayName: "Ghost", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/1baa85b4-4c70-1284-64bb-6481dfc3bb4e/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 500, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "410b2e0b-4ceb-1321-1727-20858f7f3477", displayName: "Bandit", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/410b2e0b-4ceb-1321-1727-20858f7f3477/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 600, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "e336c6b8-418d-9340-d77f-7a9e4cfe0702", displayName: "Sheriff", category: "Armes de poing", displayIcon: "https://media.valorant-api.com/weapons/e336c6b8-418d-9340-d77f-7a9e4cfe0702/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 800, categoryText: "Armes de poing")),
        ValorantWeaponItem(uuid: "f7e1b454-4ad4-1063-ec0a-159e56b58941", displayName: "Stinger", category: "PM", displayIcon: "https://media.valorant-api.com/weapons/f7e1b454-4ad4-1063-ec0a-159e56b58941/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 1100, categoryText: "PM")),
        ValorantWeaponItem(uuid: "462080d1-4035-2937-7c09-27aa2a5c27a7", displayName: "Spectre", category: "PM", displayIcon: "https://media.valorant-api.com/weapons/462080d1-4035-2937-7c09-27aa2a5c27a7/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 1600, categoryText: "PM")),
        ValorantWeaponItem(uuid: "910be174-449b-c412-ab22-d0873436b21b", displayName: "Bucky", category: "Fusils à pompe", displayIcon: "https://media.valorant-api.com/weapons/910be174-449b-c412-ab22-d0873436b21b/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 850, categoryText: "Fusils à pompe")),
        ValorantWeaponItem(uuid: "ec845bf4-4f79-ddda-a3da-0db3774b2794", displayName: "Judge", category: "Fusils à pompe", displayIcon: "https://media.valorant-api.com/weapons/ec845bf4-4f79-ddda-a3da-0db3774b2794/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 1850, categoryText: "Fusils à pompe")),
        ValorantWeaponItem(uuid: "ae3de142-4d85-2547-dd26-4e90bed35cf7", displayName: "Bulldog", category: "Fusils d'assaut", displayIcon: "https://media.valorant-api.com/weapons/ae3de142-4d85-2547-dd26-4e90bed35cf7/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 2050, categoryText: "Fusils d'assaut")),
        ValorantWeaponItem(uuid: "4ade7faa-4cf1-8376-95ef-39884480959b", displayName: "Guardian", category: "Fusils d'assaut", displayIcon: "https://media.valorant-api.com/weapons/4ade7faa-4cf1-8376-95ef-39884480959b/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 2250, categoryText: "Fusils d'assaut")),
        ValorantWeaponItem(uuid: "ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a", displayName: "Phantom", category: "Fusils d'assaut", displayIcon: "https://media.valorant-api.com/weapons/ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 2900, categoryText: "Fusils d'assaut")),
        ValorantWeaponItem(uuid: "9c82e19d-4575-0200-1a81-3eacf00cf872", displayName: "Vandal", category: "Fusils d'assaut", displayIcon: "https://media.valorant-api.com/weapons/9c82e19d-4575-0200-1a81-3eacf00cf872/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 2900, categoryText: "Fusils d'assaut")),
        ValorantWeaponItem(uuid: "c4883e50-4494-202c-3ec3-6b8a9284f00b", displayName: "Marshal", category: "Fusils de sniper", displayIcon: "https://media.valorant-api.com/weapons/c4883e50-4494-202c-3ec3-6b8a9284f00b/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 950, categoryText: "Fusils de sniper")),
        ValorantWeaponItem(uuid: "5f0aaf7a-4289-3998-d5ff-eb9a5cf7ef5c", displayName: "Outlaw", category: "Fusils de sniper", displayIcon: "https://media.valorant-api.com/weapons/5f0aaf7a-4289-3998-d5ff-eb9a5cf7ef5c/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 2400, categoryText: "Fusils de sniper")),
        ValorantWeaponItem(uuid: "a03b24d3-4319-996d-0f8c-94bbfba1dfc7", displayName: "Operator", category: "Fusils de sniper", displayIcon: "https://media.valorant-api.com/weapons/a03b24d3-4319-996d-0f8c-94bbfba1dfc7/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 4700, categoryText: "Fusils de sniper")),
        ValorantWeaponItem(uuid: "55d8a0f4-4274-ca67-fe2c-06ab45efdf58", displayName: "Ares", category: "Armes lourdes", displayIcon: "https://media.valorant-api.com/weapons/55d8a0f4-4274-ca67-fe2c-06ab45efdf58/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 1600, categoryText: "Armes lourdes")),
        ValorantWeaponItem(uuid: "63e6c2b6-4a8e-869c-3d4c-e38355226584", displayName: "Odin", category: "Armes lourdes", displayIcon: "https://media.valorant-api.com/weapons/63e6c2b6-4a8e-869c-3d4c-e38355226584/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 3200, categoryText: "Armes lourdes")),
        ValorantWeaponItem(uuid: "2f59173c-4bed-b6c3-2191-dea9b58be9c7", displayName: "Mêlée", category: "Mêlée", displayIcon: "https://media.valorant-api.com/weapons/2f59173c-4bed-b6c3-2191-dea9b58be9c7/displayicon.png", shopData: ValorantWeaponItem.ShopData(cost: 0, categoryText: "Mêlée"))
    ]

    func fetchWeapons() async {
        guard let url = URL(string: "https://valorant-api.com/v1/weapons?language=fr-FR") else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            struct WeaponsResponse: Decodable {
                let data: [ValorantWeaponItem]
            }
            let res = try JSONDecoder().decode(WeaponsResponse.self, from: data)
            let sorted = res.data.sorted(by: Self.sortWeapons)
            if !sorted.isEmpty {
                weapons = sorted
            }
        } catch {
            if weapons.isEmpty {
                weapons = Self.defaultWeapons.sorted(by: Self.sortWeapons)
            }
            errorMessage = error.localizedDescription
        }
    }
}

struct EvalWeaponsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var store = ValorantWeaponsStore()
    @State private var selectedWeapon: ValorantWeaponItem?

    var body: some View {
        ZStack {
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        weaponsCard
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
            EvalWeaponDetailView(weapon: weapon)
        }
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Armes")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var weaponsCard: some View {
        VStack(spacing: 0) {
            ForEach(Array(store.weapons.enumerated()), id: \.element.id) { index, weapon in
                Button {
                    selectedWeapon = weapon
                } label: {
                    weaponRow(weapon: weapon)
                }
                .buttonStyle(.plain)

                if index < store.weapons.count - 1 {
                    Divider()
                        .overlay(EvalColors.text.opacity(0.06))
                        .padding(.leading, 16)
                }
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func weaponRow(weapon: ValorantWeaponItem) -> some View {
        HStack(spacing: 12) {
            Text(weapon.displayName)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            if let icon = weapon.displayIcon, let url = URL(string: icon) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable()
                            .renderingMode(.template)
                            .scaledToFit()
                            .frame(height: 22)
                            .foregroundStyle(EvalAccent.color)
                    }
                }
                .frame(width: 80, height: 26, alignment: .trailing)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(EvalColors.text.opacity(0.3))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .contentShape(Rectangle())
    }
}

struct EvalWeaponDetailView: View {
    let weapon: ValorantWeaponItem
    @Environment(\.dismiss) private var dismiss

    private func formatFrenchNumber(_ val: Double) -> String {
        String(format: "%.2f", val).replacingOccurrences(of: ".", with: ",")
    }

    var body: some View {
        ZStack {
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(spacing: 18) {
                        generalCard

                        Text("Statistiques des armes")
                            .font(.system(size: 23, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 4)

                        statsCard
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
                }
                .scrollIndicators(.hidden)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text(weapon.displayName)
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var generalCard: some View {
        VStack(spacing: 14) {
            if let icon = weapon.displayIcon, let url = URL(string: icon) {
                AsyncImage(url: url) { phase in
                    if let img = phase.image {
                        img.resizable()
                            .scaledToFit()
                            .frame(height: 120)
                    } else {
                        Image(systemName: "scope")
                            .font(.system(size: 46))
                            .foregroundStyle(.secondary)
                            .frame(height: 120)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            }

            VStack(spacing: 0) {
                infoRow(title: "Catégorie", value: weapon.cleanCategory)

                Divider().overlay(EvalColors.text.opacity(0.06))

                let costText = "\(weapon.shopData?.cost ?? 0) crédits"
                infoRow(title: "Prix", value: costText)

                Divider().overlay(EvalColors.text.opacity(0.06))

                NavigationLink { EvalWeaponSkinsView(weapon: weapon) } label: {
                HStack {
                    Text("Skins")
                        .font(.system(size: 17))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    HStack(spacing: 6) {
                        Text("\(weapon.skins.count)")
                            .font(.system(size: 17))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(.vertical, 14)
                .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var statsCard: some View {
        VStack(spacing: 0) {
            if let stats = weapon.weaponStats {
                if let fireRate = stats.fireRate {
                    infoRow(title: "Taux de tir", value: "\(formatFrenchNumber(fireRate)) balles/sec")
                    Divider().overlay(EvalColors.text.opacity(0.06))
                }

                if let mag = stats.magazineSize {
                    infoRow(title: "Taille du chargeur", value: "\(mag) balles")
                    Divider().overlay(EvalColors.text.opacity(0.06))
                }

                if let ranges = stats.damageRanges {
                    ForEach(Array(ranges.enumerated()), id: \.offset) { _, range in
                        let start = Int(range.rangeStartMeters ?? 0)
                        let end = Int(range.rangeEndMeters ?? 0)
                        HStack(alignment: .top) {
                            Text("Dégâts \(start) – \(end)m")
                                .font(.system(size: 17))
                                .foregroundStyle(Color(hex: 0x8E8E93))

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                HStack(spacing: 8) {
                                    Text("Tête").foregroundStyle(Color(hex: 0x8E8E93))
                                    Text(formatFrenchNumber(range.headDamage)).foregroundStyle(EvalColors.text).fontWeight(.medium)
                                }
                                HStack(spacing: 8) {
                                    Text("Corps").foregroundStyle(Color(hex: 0x8E8E93))
                                    Text(formatFrenchNumber(range.bodyDamage)).foregroundStyle(EvalColors.text).fontWeight(.medium)
                                }
                                HStack(spacing: 8) {
                                    Text("Jambes").foregroundStyle(Color(hex: 0x8E8E93))
                                    Text(formatFrenchNumber(range.legDamage)).foregroundStyle(EvalColors.text).fontWeight(.medium)
                                }
                            }
                            .font(.system(size: 17))
                        }
                        .padding(.vertical, 14)

                        Divider().overlay(EvalColors.text.opacity(0.06))
                    }
                }

                if let equipTime = stats.equipTimeSeconds {
                    infoRow(title: "Temps de préparation", value: "\(formatFrenchNumber(equipTime))s")
                    Divider().overlay(EvalColors.text.opacity(0.06))
                }

                if let reloadTime = stats.reloadTimeSeconds {
                    infoRow(title: "Temps de rechargement", value: "\(formatFrenchNumber(reloadTime))s")
                    Divider().overlay(EvalColors.text.opacity(0.06))
                }

                if let runSpeed = stats.runSpeedMultiplier {
                    infoRow(title: "Vitesse de course", value: "\(Int(round(runSpeed * 100))) %")
                }
            } else {
                Text("Arme sans statistiques de tir.")
                    .font(.system(size: 17))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.vertical, 14)
            }
        }
        .padding(20)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func infoRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 17))
                .foregroundStyle(Color(hex: 0x8E8E93))
            Spacer()
            Text(value)
                .font(.system(size: 17))
                .foregroundStyle(EvalColors.text)
        }
        .padding(.vertical, 14)
    }
}

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
            EvalColors.background.ignoresSafeArea()

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
                                                .overlay(EvalColors.text.opacity(0.06))
                                                .padding(.leading, 70)
                                        }
                                    }
                                }
                                .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                                                .overlay(EvalColors.text.opacity(0.06))
                                                .padding(.leading, 70)
                                        }
                                    }
                                }
                                .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
        .navigationDestination(item: $selectedPlayer) { player in
            EvalPlayerProfileView(name: player.name, tag: player.tag)
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
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Joueurs")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Button {
                showingOptions = true
            } label: {
                Circle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "ellipsis")
                            .font(.system(size: 17, weight: .bold))
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
                .font(.system(size: 17))
                .foregroundStyle(.secondary)

            TextField("Rechercher RiotID#Tag", text: $searchQuery)
                .font(.subheadline)
                .foregroundStyle(EvalColors.text)
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
                        .font(.system(size: 17))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(EvalColors.text.opacity(0.06), in: .capsule)
    }

    private func bookmarkRow(player: ValorantSavedPlayer) -> some View {
        HStack(spacing: 14) {
            playerAvatar(player: player)

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 3) {
                    Text(player.name)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(EvalColors.text)
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
                .font(.system(size: 13, weight: .semibold))
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
                        .foregroundStyle(EvalColors.text)
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
                .font(.system(size: 13, weight: .semibold))
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
        .frame(width: 51, height: 51)
        .clipShape(.rect(cornerRadius: 12))
    }

    private func circularRankBadge(tier: Int, showClock: Bool) -> some View {
        ZStack(alignment: .bottomTrailing) {
            Circle()
                .fill(Color(hex: 0x141820))
                .frame(width: 39, height: 39)
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
                                        .font(.system(size: 16))
                                        .foregroundStyle(tierRingColor(tier: tier))
                                }
                            }
                        } else {
                            Image(systemName: "rhombus.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(tierRingColor(tier: tier))
                        }
                    }
                )

            if showClock {
                Circle()
                    .fill(Color.black)
                    .frame(width: 15, height: 15)
                    .overlay(
                        Image(systemName: "clock.fill")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(EvalColors.text)
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
                    .frame(width: 62, height: 62)
                    .clipShape(.rect(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 4) {
                    Text(player.handle)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(EvalColors.text)

                    Text("Niveau \(player.level)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    store.toggleBookmark(player: player)
                } label: {
                    Image(systemName: store.bookmarkedPlayers.contains(where: { $0.id == player.id }) ? "bookmark.fill" : "bookmark")
                        .font(.system(size: 23))
                        .foregroundStyle(Color(hex: 0xFD4556))
                }
                .buttonStyle(PressScaleStyle())
            }
            .padding(14)
            .background(EvalColors.card, in: .rect(cornerRadius: Theme.cardRadius))

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
            EvalColors.background.ignoresSafeArea()

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
                                            .overlay(EvalColors.text.opacity(0.06))
                                            .padding(.leading, 16)
                                    }
                                }
                            }
                            .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Historique des pseudos")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Button {
                Task { await store.refreshNameChanges() }
            } label: {
                Circle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 17, weight: .bold))
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
                        .foregroundStyle(EvalColors.text)
                    Text("#\(change.currentTag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 5) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(size: 13))
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
                .font(.system(size: 13, weight: .semibold))
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
    @State private var showingFilters = false

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
        return "—"
    }

    private var myRankWatermark: String {
        if let rank = store.profile?.leaderboardRank, rank > 0 {
            return "\(rank)"
        }
        return ""
    }

    private var myRRText: String {
        if let rr = store.profile?.rr, rr > 0 {
            return "\(rr) RR"
        }
        return "—"
    }

    private var myWinsText: String {
        let wins = store.matches.filter(\.won).count
        if wins > 0 {
            return "\(wins) W"
        }
        return "—"
    }

    private var myTier: Int {
        if let tier = store.profile?.tier, tier > 0 {
            return tier
        }
        return 0
    }

    var body: some View {
        ZStack {
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        searchField

                        if (store.profile?.leaderboardRank ?? 0) > 0 {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Vous — \(myRankText)")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                userRankCard
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("\(formattedTotalCount) joueurs")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(EvalColors.text)

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
                                            .font(.system(size: 16))
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
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text("Classement")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Button { showingFilters = true } label: {
                Circle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Image(systemName: "line.3.horizontal.decrease")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD4556))
                    )
            }
            .buttonStyle(PressScaleStyle())
            .sheet(isPresented: $showingFilters) { EvalLeaderboardFilterSheet() }
        }
        .padding(.horizontal, 16)
        .padding(.top, 4)
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 17))
                .foregroundStyle(.secondary)

            TextField("Rechercher des joueurs...", text: $searchQuery)
                .font(.subheadline)
                .foregroundStyle(EvalColors.text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 17))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 11)
        .background(EvalColors.text.opacity(0.06), in: .capsule)
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
                .frame(width: 51, height: 51)
                .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 3) {
                        Text(store.playerName.isEmpty ? "Aucun compte" : store.playerName)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(EvalColors.text)
                        Text(store.tag.isEmpty ? "" : "#\(store.tag)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                    }

                    Text(store.equipmentTitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(myRRText)
                        .font(.subheadline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(EvalColors.text)
                    Text(myWinsText)
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                if let url = ValorantProfile.tierIcon(myTier) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFit().frame(width: 32, height: 32)
                        } else {
                            Image(systemName: "shield.fill")
                                .font(.system(size: 23))
                                .foregroundStyle(Color(hex: 0xF5D78E))
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)

            HStack {
                Spacer()
                Text(myRankWatermark)
                    .font(.system(size: 55, weight: .black))
                    .foregroundStyle(EvalColors.text.opacity(0.06))
                    .padding(.trailing, 100)
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private var leaderboardCard: some View {
        VStack(spacing: 0) {
            ForEach(Array(filteredPlayers.enumerated()), id: \.element.id) { index, player in
                if player.isAnonymized || player.tag.isEmpty {
                    leaderboardRow(player: player)
                } else {
                    NavigationLink { EvalPlayerProfileView(name: player.name, tag: player.tag) } label: { leaderboardRow(player: player) }
                        .buttonStyle(.plain)
                }

                if index < filteredPlayers.count - 1 {
                    Divider()
                        .overlay(EvalColors.text.opacity(0.06))
                        .padding(.leading, 70)
                }
            }
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                .frame(width: 51, height: 51)
                .clipShape(.rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 3) {
                        Text(player.isAnonymized ? "Joueur anonymisé" : player.name)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(EvalColors.text)
                        if !player.isAnonymized && !player.tag.isEmpty {
                            Text("#\(player.tag)")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)
                        }
                    }

                    EvalPlayerTitleText(id: player.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(player.rr) RR")
                        .font(.subheadline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(EvalColors.text)
                    Text("\(player.wins) W")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }

                if let url = ValorantProfile.tierIcon(player.tier) {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFit().frame(width: 32, height: 32)
                        } else {
                            Image(systemName: "shield.fill")
                                .font(.system(size: 23))
                                .foregroundStyle(Color(hex: 0xF5D78E))
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
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
                    .font(.system(size: 53, weight: .black))
                    .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.18))
            case 2:
                Text("2")
                    .font(.system(size: 53, weight: .black))
                    .foregroundStyle(EvalColors.text.opacity(0.06))
            case 3:
                Text("3")
                    .font(.system(size: 53, weight: .black))
                    .foregroundStyle(Color(hex: 0xCD7F32).opacity(0.18))
            default:
                Text("\(rank)")
                    .font(.system(size: 53, weight: .black))
                    .foregroundStyle(EvalColors.text.opacity(0.05))
            }
        }
    }

    private func changeRegion(_ region: String) {
        Task {
            await store.loadLeaderboard(region: region)
        }
    }
}
/// Snapshots des paramètres en jeu (sensibilité, viseur, touches…) du compte Riot connecté :
/// copie sauvegardée dans Supabase, réappliquable sur n'importe quel compte Riot connecté.
struct EvalPlayerSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var naming = false
    @State private var newName = ""
    @State private var working = false
    @State private var message: String?
    @State private var toApply: ValorantStore.SettingsSnapshot?
    @State private var showingLogin = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Button { dismiss() } label: {
                        Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                            .overlay(Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text))
                    }
                    .buttonStyle(.plain)
                    Spacer()
                    Text("Snapshots").font(.system(size: 22, weight: .bold)).foregroundStyle(EvalColors.text)
                    Spacer()
                    Button {
                        if store.riot.isLinked { newName = ""; naming = true } else { showingLogin = true }
                    } label: {
                        Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                            .overlay(Group {
                                if working { ProgressView().tint(EvalAccent.color) } else {
                                    Image(systemName: "plus").font(.system(size: 21, weight: .semibold)).foregroundStyle(EvalAccent.color)
                                }
                            })
                    }
                    .buttonStyle(.plain)
                    .disabled(working)
                }
                .padding(.top, 4)

                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: "slider.horizontal.below.square.and.square.filled").font(.system(size: 41)).foregroundStyle(EvalAccent.color)
                    Text("Snapshot des paramètres du joueur").font(.system(size: 25, weight: .bold)).foregroundStyle(EvalColors.text)
                    Text("Enregistrer les paramètres en jeu du compte Riot connecté sous forme d’instantané, puis les appliquer à n’importe quel compte ultérieurement.")
                        .font(.system(size: 18)).foregroundStyle(Color(hex: 0x8E8E93))
                    if !store.riot.isLinked {
                        Button("Connecter mon compte Riot") { showingLogin = true }
                            .font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalAccent.color)
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(EvalColors.card, in: .rect(cornerRadius: 22))

                if let message {
                    Text(message).font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 4)
                }

                ForEach(store.snapshots) { snap in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(snap.name).font(.system(size: 21, weight: .semibold)).foregroundStyle(EvalColors.text)
                            HStack(spacing: 6) {
                                Text(snap.account)
                                Text("·")
                                Text(snap.usedAt.map { "Utilisé \($0.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_FR"))))" }
                                     ?? "Créé \(snap.createdAt.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_FR"))))")
                            }
                            .font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).lineLimit(1)
                        }
                        Spacer()
                        Button { toApply = snap } label: {
                            Circle().fill(EvalAccent.color.opacity(0.25)).frame(width: 41, height: 41)
                                .overlay(Image(systemName: "arrow.up.right").font(.system(size: 17, weight: .bold)).foregroundStyle(EvalAccent.color))
                        }
                        .buttonStyle(.plain)
                        .disabled(!store.riot.isLinked || working)
                    }
                    .padding(18)
                    .background(EvalColors.card, in: .rect(cornerRadius: 20))
                    .contextMenu {
                        Button("Supprimer", systemImage: "trash", role: .destructive) { store.deleteSnapshot(snap) }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.loadSnapshots() }
        .alert("Nommer la Snapshot", isPresented: $naming) {
            TextField("Titre", text: $newName)
            Button("Annuler", role: .cancel) {}
            Button("Sauvegarder") {
                let name = newName.trimmingCharacters(in: .whitespaces)
                Task { await run(success: "Snapshot enregistrée.") { try await store.createSnapshot(name: name.isEmpty ? "Snapshot" : name) } }
            }
        }
        .confirmationDialog(applyTitle, isPresented: Binding(get: { toApply != nil }, set: { if !$0 { toApply = nil } }), titleVisibility: .visible) {
            Button("Appliquer", role: .destructive) {
                guard let snap = toApply else { return }
                Task { await run(success: "Paramètres appliqués. Relancez VALORANT pour les voir.") { try await store.applySnapshot(snap) } }
            }
        } message: {
            Text("Les paramètres en jeu actuels de ce compte seront remplacés.")
        }
        .sheet(isPresented: $showingLogin) { EvalRiotLoginSheet() }
    }

    private var applyTitle: String {
        let target = store.riot.credentials.map { "\($0.gameName)#\($0.tagLine)" } ?? "ce compte"
        return "Appliquer « \(toApply?.name ?? "") » à \(target) ?"
    }

    private func run(success: String, _ action: () async throws -> Void) async {
        working = true
        defer { working = false }
        do {
            try await action()
            message = success
        } catch {
            message = "Échec : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
    }
}

