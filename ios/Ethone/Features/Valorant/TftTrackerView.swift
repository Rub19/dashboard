import SwiftUI

/// Tracker Teamfight Tactics : dernières parties (classement, niveau, synergies, unités) via le Worker ETHONE (API officielle Riot).
/// La clé Riot utilisée est celle enregistrée sur le compte ETHONE (Connexions, sur le site) : aucune clé n'est saisie dans l'app.
struct TftTrackerView: View {
    @Environment(AppModel.self) private var model
    @State private var name = UserDefaults.standard.string(forKey: "ethone.tft.name") ?? ""
    @State private var tag = UserDefaults.standard.string(forKey: "ethone.tft.tag") ?? ""
    @State private var matches: [JSONValue] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var canSearch: Bool { !name.trimmingCharacters(in: .whitespaces).isEmpty && !tag.trimmingCharacters(in: .whitespaces).isEmpty }

    private var placements: [Int] { matches.compactMap { $0["me"]?["placement"]?.doubleValue.map(Int.init) } }
    private var average: Double { placements.isEmpty ? 0 : Double(placements.reduce(0, +)) / Double(placements.count) }
    private var top4: Int { placements.isEmpty ? 0 : placements.filter { $0 <= 4 }.count * 100 / placements.count }
    private var firsts: Int { placements.filter { $0 == 1 }.count }

    var body: some View {
        List {
            Section {
                TextField("Nom Riot", text: $name).textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField("Tag (sans #)", text: $tag).textInputAutocapitalization(.never).autocorrectionDisabled()
                Button {
                    Task { await load() }
                } label: {
                    HStack { Text("Analyser"); if isLoading { Spacer(); ProgressView() } }
                }
                .disabled(!canSearch || isLoading)
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            if !placements.isEmpty {
                Section {
                    GlassEffectContainer(spacing: 12) {
                        HStack(spacing: 12) {
                            tile(String(format: "%.1f", average), "Place moyenne", "number")
                            tile("\(top4) %", "Top 4", "trophy.fill")
                            tile("\(firsts)", "Victoires", "crown.fill")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }

            ForEach(matches, id: \.self) { match in
                if let me = match["me"], me != .null {
                    let place = Int(me["placement"]?.doubleValue ?? 8)
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("#\(place)").font(.title2.weight(.bold)).foregroundStyle(place <= 4 ? Theme.success : Theme.danger)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(match["mode"]?.stringValue ?? "TFT").font(.headline)
                                Text("Set \(Int(match["setNumber"]?.doubleValue ?? 0)) · niveau \(Int(me["level"]?.doubleValue ?? 0)) · \(Self.duration(match["durationSeconds"]?.doubleValue ?? 0))")
                                    .font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let date = match["playedAt"]?.stringValue.flatMap(ISODate.parse) {
                                Text(date, format: .dateTime.day().month(.abbreviated)).font(.caption).foregroundStyle(.tertiary)
                            }
                        }
                        let traits = (me["traits"]?.arrayValue ?? []).prefix(6).compactMap { trait -> String? in
                            guard let n = trait["name"]?.stringValue else { return nil }
                            return "\(n) \(Int(trait["numUnits"]?.doubleValue ?? 0))"
                        }
                        if !traits.isEmpty {
                            Text(traits.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary)
                        }
                        let units = (me["units"]?.arrayValue ?? []).prefix(9).compactMap { unit -> String? in
                            guard let n = unit["name"]?.stringValue else { return nil }
                            let stars = String(repeating: "★", count: Int(unit["tier"]?.doubleValue ?? 1))
                            return "\(n) \(stars)"
                        }
                        if !units.isEmpty {
                            Text(units.joined(separator: " · ")).font(.caption2).foregroundStyle(.tertiary)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .accessibilityElement(children: .combine)
                }
            }

            Section {
                EmptyView()
            } footer: {
                Text("Nécessite une clé API Riot enregistrée sur votre compte ETHONE (Connexions, sur le site).")
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Teamfight Tactics")
        .ethoneScreen()
        .task { if canSearch && matches.isEmpty { await load() } }
    }

    private static func duration(_ seconds: Double) -> String {
        "\(Int(seconds) / 60) min"
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
        UserDefaults.standard.set(cleanName, forKey: "ethone.tft.name")
        UserDefaults.standard.set(cleanTag, forKey: "ethone.tft.tag")
        do {
            let raw: JSONValue = try await model.api.worker("api/stats/tft-matches", query: [URLQueryItem(name: "name", value: cleanName), URLQueryItem(name: "tag", value: cleanTag)])
            matches = raw.arrayValue ?? []
            errorMessage = matches.isEmpty ? "Aucune partie TFT trouvée pour ce compte." : nil
        } catch {
            matches = []
            errorMessage = ((error as? LocalizedError)?.errorDescription ?? error.localizedDescription) + " Vérifiez le pseudo et la clé Riot du compte."
        }
    }
}
