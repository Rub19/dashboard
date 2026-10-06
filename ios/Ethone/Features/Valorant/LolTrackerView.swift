import SwiftUI

struct LolTrackerView: View {
    @Environment(AppModel.self) private var model
    @State private var name = UserDefaults.standard.string(forKey: "ethone.lol.name") ?? ""
    @State private var tag = UserDefaults.standard.string(forKey: "ethone.lol.tag") ?? ""
    @State private var profile: Profile?
    @State private var matches: [LolMatch] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var mode = "all"

    struct Profile {
        let handle: String
        let avatarURL: URL?
        let solo: String
        let flex: String
        let level: String
    }

    struct LolMatch: Identifiable {
        let id: String
        let champion: String
        let icon: URL?
        let mode: String
        let won: Bool
        let kills: Int
        let deaths: Int
        let assists: Int
        let cs: Int
        let csPerMin: Double
        let duration: String
        let date: Date?
        var kda: Double { deaths == 0 ? Double(kills + assists) : Double(kills + assists) / Double(deaths) }
    }

    private static let modes: [(id: String, label: String)] = [
        ("all", "Tous les modes"), ("ranked", "Classé"), ("normal", "Normal"), ("aram", "ARAM"),
    ]

    private var canSearch: Bool { !name.trimmingCharacters(in: .whitespaces).isEmpty && !tag.trimmingCharacters(in: .whitespaces).isEmpty }
    private var wins: Int { matches.filter(\.won).count }

    var body: some View {
        List {
            Section {
                TextField("Nom d'invocateur", text: $name).textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField("Tag (sans #)", text: $tag).textInputAutocapitalization(.never).autocorrectionDisabled()
                Picker("Mode", selection: $mode) {
                    ForEach(Self.modes, id: \.id) { Text($0.label).tag($0.id) }
                }
                Button {
                    Task { await load() }
                } label: {
                    HStack { Text("Analyser"); if isLoading { Spacer(); ProgressView() } }
                }
                .disabled(!canSearch || isLoading)
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            if let profile {
                Section {
                    HStack(spacing: 14) {
                        AsyncImage(url: profile.avatarURL) { phase in
                            if let image = phase.image { image.resizable().scaledToFit() } else { Image(systemName: "person.crop.square").foregroundStyle(.secondary) }
                        }
                        .frame(width: 56, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(profile.handle).font(.headline)
                            Text("Niveau \(profile.level)").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Classé solo/duo", value: profile.solo)
                    LabeledContent("Classé flexible", value: profile.flex)
                }
                .listRowBackground(GlassRowBackground())
            }

            if !matches.isEmpty {
                Section {
                    GlassEffectContainer(spacing: 12) {
                        HStack(spacing: 12) {
                            tile("\(wins * 100 / matches.count) %", "Victoires", "trophy.fill")
                            tile(String(format: "%.2f", averageKDA), "KDA", "scope")
                            tile(String(format: "%.1f", averageCS), "CS/min", "chart.bar.fill")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section {
                    ForEach(matches) { match in
                        HStack(spacing: 12) {
                            AsyncImage(url: match.icon) { phase in
                                if let image = phase.image { image.resizable().scaledToFit() } else { Image(systemName: "shield.lefthalf.filled").foregroundStyle(.secondary) }
                            }
                            .frame(width: 44, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(match.champion).font(.subheadline.weight(.semibold))
                                Text("\(match.mode) · \(match.duration)" + (match.date.map { " · " + $0.formatted(.relative(presentation: .named)) } ?? "")).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(match.kills)/\(match.deaths)/\(match.assists)").font(.footnote.monospacedDigit().weight(.bold))
                                Text(match.won ? "Victoire" : "Défaite")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(match.won ? Theme.success : Theme.danger)
                            }
                        }
                        .listRowBackground(GlassRowBackground())
                        .accessibilityElement(children: .combine)
                    }
                } header: { Text("Dernières parties").sectionTitle() }
            }

            Section {
                EmptyView()
            } footer: {
                Text("Nécessite une clé API Riot enregistrée sur votre compte ETHONE (Connexions, sur le site). Aucune clé n'est saisie ni stockée dans l'app.")
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("League of Legends")
        .ethoneScreen()
        .task { if canSearch && profile == nil { await load() } }
    }

    private var averageKDA: Double {
        let kills = matches.reduce(0) { $0 + $1.kills }, deaths = matches.reduce(0) { $0 + $1.deaths }, assists = matches.reduce(0) { $0 + $1.assists }
        return deaths == 0 ? Double(kills + assists) : Double(kills + assists) / Double(deaths)
    }

    private var averageCS: Double {
        matches.isEmpty ? 0 : matches.reduce(0) { $0 + $1.csPerMin } / Double(matches.count)
    }

    private func tile(_ value: String, _ label: String, _ symbol: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: symbol).foregroundStyle(Theme.accent)
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }

    private func load() async {
        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanTag = tag.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "")
        guard !cleanName.isEmpty, !cleanTag.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }
        UserDefaults.standard.set(cleanName, forKey: "ethone.lol.name")
        UserDefaults.standard.set(cleanTag, forKey: "ethone.lol.tag")
        let query = [URLQueryItem(name: "name", value: cleanName), URLQueryItem(name: "tag", value: cleanTag)]
        do {
            let rawProfile: JSONValue = try await model.api.worker("api/stats/lol-profile", query: query)
            profile = Self.parseProfile(rawProfile)
            let rawMatches: JSONValue = try await model.api.worker("api/stats/lol-matches", query: query + [URLQueryItem(name: "mode", value: mode)])
            matches = (rawMatches.arrayValue ?? []).compactMap(Self.parseMatch)
            errorMessage = matches.isEmpty ? "Aucune partie trouvée pour ce compte et ce mode." : nil
        } catch {
            profile = nil
            matches = []
            let base = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            errorMessage = base + " Vérifiez le pseudo et le tag, et la clé Riot enregistrée sur votre compte."
        }
    }

    private static func parseProfile(_ raw: JSONValue) -> Profile? {
        guard let handle = raw["handle"]?.stringValue ?? raw["identifier"]?.stringValue else { return nil }
        let stats = raw["segments"]?.arrayValue?.first?["stats"]
        return Profile(
            handle: handle,
            avatarURL: raw["avatarUrl"]?.stringValue.flatMap(URL.init(string:)),
            solo: raw["rankSolo"]?.stringValue ?? "Non classé",
            flex: raw["rankFlex"]?.stringValue ?? "Non classé",
            level: stats?["level"]?["displayValue"]?.stringValue ?? "—"
        )
    }

    private static func parseMatch(_ raw: JSONValue) -> LolMatch? {
        guard let id = raw["id"]?.stringValue, let meta = raw["metadata"] else { return nil }
        let stats = raw["segments"]?.arrayValue?.first?["stats"]
        func number(_ key: String) -> Double { stats?[key]?["value"]?.doubleValue ?? 0 }
        return LolMatch(
            id: id,
            champion: meta["agentName"]?.stringValue ?? "—",
            icon: (meta["agentImageUrl"]?.stringValue ?? meta["agentImageFallback"]?.stringValue).flatMap(URL.init(string:)),
            mode: meta["modeName"]?.stringValue ?? "Partie",
            won: meta["result"]?.stringValue == "Victory",
            kills: Int(number("kills")), deaths: Int(number("deaths")), assists: Int(number("assists")),
            cs: Int(number("cs")), csPerMin: number("csPerMin"),
            duration: meta["gameDuration"]?.stringValue ?? "",
            date: meta["timestamp"]?.stringValue.flatMap(ISODate.parse)
        )
    }
}

