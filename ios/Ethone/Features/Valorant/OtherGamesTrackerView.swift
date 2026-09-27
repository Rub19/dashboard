import SwiftUI

/// Autres jeux (tracker.gg via le Worker ETHONE) : Apex Legends, Counter-Strike 2, The Division 2, Splitgate, The Finals, Battlefield 2042.
/// La clé tracker.gg utilisée est celle enregistrée sur le compte ETHONE (Connexions, sur le site) : aucune clé n'est saisie dans l'app.
struct OtherGamesTrackerView: View {
    @Environment(AppModel.self) private var model
    @State private var game = UserDefaults.standard.string(forKey: "ethone.trn.game") ?? "apex"
    @State private var platform = UserDefaults.standard.string(forKey: "ethone.trn.platform") ?? "origin"
    @State private var identifier = UserDefaults.standard.string(forKey: "ethone.trn.id") ?? ""
    @State private var handle: String?
    @State private var stats: [(name: String, value: String)] = []
    @State private var matches: [JSONValue] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private static let games: [(id: String, label: String)] = [
        ("apex", "Apex Legends"), ("csgo", "Counter-Strike 2"), ("division-2", "The Division 2"),
        ("splitgate", "Splitgate"), ("the-finals", "The Finals"), ("bf2042", "Battlefield 2042"),
    ]
    private static let platforms: [(id: String, label: String)] = [
        ("origin", "EA / Origin"), ("steam", "Steam"), ("uplay", "Ubisoft"), ("xbl", "Xbox"), ("psn", "PlayStation"),
    ]

    var body: some View {
        List {
            Section {
                Picker("Jeu", selection: $game) { ForEach(Self.games, id: \.id) { Text($0.label).tag($0.id) } }
                Picker("Plateforme", selection: $platform) { ForEach(Self.platforms, id: \.id) { Text($0.label).tag($0.id) } }
                TextField("Identifiant du joueur", text: $identifier).textInputAutocapitalization(.never).autocorrectionDisabled()
                Button {
                    Task { await load() }
                } label: {
                    HStack { Text("Analyser"); if isLoading { Spacer(); ProgressView() } }
                }
                .disabled(identifier.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            if let handle {
                Section {
                    ForEach(stats, id: \.name) { LabeledContent($0.name, value: $0.value) }
                } header: { Text(handle).sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !matches.isEmpty {
                Section {
                    ForEach(matches, id: \.self) { match in
                        let meta = match["metadata"]
                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(meta?["modeName"]?.stringValue ?? "Partie").font(.headline)
                                Spacer()
                                Text(meta?["result"]?.stringValue ?? "").font(.caption.weight(.semibold))
                            }
                            Text([meta?["mapName"]?.stringValue, meta?["agentName"]?.stringValue].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                                .font(.caption).foregroundStyle(.secondary)
                            if let date = meta?["timestamp"]?.stringValue.flatMap(ISODate.parse) {
                                Text(date.formatted(date: .abbreviated, time: .shortened)).font(.caption2).foregroundStyle(.tertiary)
                            }
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                } header: { Text("Dernières parties").sectionTitle() }
            }

            Section {
                EmptyView()
            } footer: {
                Text("Nécessite une clé API tracker.gg enregistrée sur votre compte ETHONE (Connexions, sur le site). Seuls les jeux pris en charge par l'API publique de tracker.gg sont proposés.")
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Autres jeux")
        .ethoneScreen()
    }

    private func load() async {
        let id = identifier.trimmingCharacters(in: .whitespaces)
        guard !id.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }
        UserDefaults.standard.set(game, forKey: "ethone.trn.game")
        UserDefaults.standard.set(platform, forKey: "ethone.trn.platform")
        UserDefaults.standard.set(id, forKey: "ethone.trn.id")
        let query = [URLQueryItem(name: "game", value: game), URLQueryItem(name: "platform", value: platform), URLQueryItem(name: "identifier", value: id)]
        do {
            let profile: JSONValue = try await model.api.worker("api/stats/tracker-profile", query: query)
            if profile["available"]?.boolValue == false {
                throw APIError.http(status: 200, code: nil, message: Self.reason(profile))
            }
            handle = profile["handle"]?.stringValue ?? id
            stats = Self.flatten(profile["segments"]?.arrayValue?.first?["stats"])
            let raw: JSONValue = try await model.api.worker("api/stats/tracker-matches", query: query)
            matches = raw.arrayValue ?? raw["matches"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            handle = nil
            stats = []
            matches = []
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private static func reason(_ payload: JSONValue) -> String {
        switch payload["reason"]?.stringValue {
        case "no_api_key": "Aucune clé tracker.gg n'est enregistrée sur votre compte ETHONE."
        case "key_rejected": "La clé tracker.gg a été refusée pour ce jeu." + (payload["hint"]?.stringValue.map { " (\($0))" } ?? "")
        case "not_found": "Joueur introuvable sur cette plateforme."
        default: "tracker.gg est indisponible pour le moment."
        }
    }

    /// Statistiques du Worker : `{ clé: { displayName?, displayValue, value } }` ; on n'affiche que les valeurs fournies.
    private static func flatten(_ raw: JSONValue?) -> [(name: String, value: String)] {
        guard case .object(let dictionary)? = raw else { return [] }
        return dictionary.keys.sorted().prefix(20).compactMap { key in
            let entry = dictionary[key]
            let value = entry?["displayValue"]?.stringValue ?? entry?["value"]?.doubleValue.map { String($0) } ?? entry?.stringValue
            guard let value else { return nil }
            return (name: entry?["displayName"]?.stringValue ?? key, value: value)
        }
    }
}
