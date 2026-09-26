import SwiftUI

/// Rotation gratuite hebdomadaire de League of Legends (API Riot via le Worker ETHONE, noms et icônes Data Dragon).
/// La boutique LoL (skins en promotion, packs) n'a pas d'API publique : elle n'est pas affichée.
struct LolRotationView: View {
    @Environment(AppModel.self) private var model
    @State private var region = "euw1"
    @State private var rotation: Rotation?
    @State private var isLoading = false
    @State private var errorMessage: String?

    struct Champion: Decodable, Identifiable, Hashable {
        let id: Int
        let name: String
        let title: String
        let icon: String
    }

    struct Rotation: Decodable {
        let region: String
        let gameVersion: String
        let free: [Champion]
        let freeForNewPlayers: [Champion]
        let maxNewPlayerLevel: Int
    }

    private static let regions: [(id: String, label: String)] = [
        ("euw1", "Europe Ouest"), ("eun1", "Europe Nord-Est"), ("na1", "Amérique du Nord"), ("kr", "Corée"),
        ("br1", "Brésil"), ("la1", "Amérique latine Nord"), ("la2", "Amérique latine Sud"), ("jp1", "Japon"),
        ("oc1", "Océanie"), ("tr1", "Turquie"), ("ru", "Russie")
    ]

    private let columns = [GridItem(.adaptive(minimum: 84), spacing: 12)]

    var body: some View {
        List {
            Section {
                Picker("Région", selection: $region) {
                    ForEach(Self.regions, id: \.id) { Text($0.label).tag($0.id) }
                }
                .listRowBackground(GlassRowBackground())
            }

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            if let rotation {
                Section {
                    grid(rotation.free)
                } header: {
                    Text("Rotation gratuite (\(rotation.free.count)) · patch \(rotation.gameVersion)").sectionTitle()
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))

                Section {
                    grid(rotation.freeForNewPlayers)
                } header: {
                    Text("Nouveaux joueurs (jusqu'au niveau \(rotation.maxNewPlayerLevel > 0 ? rotation.maxNewPlayerLevel : 10))").sectionTitle()
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
            }

            Section {
                EmptyView()
            } footer: {
                Text("La boutique de League of Legends (skins en promotion, packs) n'a pas d'API publique : elle ne peut pas être affichée ici.")
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Rotation LoL")
        .ethoneScreen()
        .overlay { if isLoading && rotation == nil { ProgressView() } }
        .refreshable { await load() }
        .task(id: region) { await load() }
    }

    private func grid(_ champions: [Champion]) -> some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(champions) { champion in
                VStack(spacing: 4) {
                    AsyncImage(url: URL(string: champion.icon)) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFit()
                        default: Image(systemName: "person.crop.square").foregroundStyle(.secondary)
                        }
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    Text(champion.name).font(.caption.weight(.semibold)).lineLimit(1)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel(champion.name)
            }
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            rotation = try await model.api.worker("api/stats/lol-rotation", query: [URLQueryItem(name: "region", value: region)])
            errorMessage = nil
        } catch {
            rotation = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
