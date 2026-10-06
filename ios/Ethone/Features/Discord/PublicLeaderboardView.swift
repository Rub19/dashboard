import SwiftUI

struct PublicLeaderboardView: View {
    @State private var guildId = UserDefaults.standard.string(forKey: "ethone.leaderboard.guild") ?? ""
    @State private var payload: JSONValue?
    @State private var loading = false
    @State private var message: String?

    var body: some View {
        List {
            Section {
                TextField("Identifiant du serveur Discord", text: $guildId).keyboardType(.numberPad)
                Button {
                    Task { await load() }
                } label: {
                    HStack { Text("Afficher le classement"); if loading { Spacer(); ProgressView() } }
                }
                .disabled(loading || guildId.trimmingCharacters(in: .whitespaces).isEmpty)
            } footer: {
                Text("L'identifiant s'obtient dans Discord (mode développeur → clic droit sur le serveur → Copier l'identifiant). Le classement n'est visible que si le propriétaire du serveur l'a rendu public.")
            }
            .listRowBackground(GlassRowBackground())

            if let message { Text(message).font(.footnote).foregroundStyle(.secondary).listRowBackground(Color.clear) }

            if let payload {
                Section {
                    ForEach(Array((payload["entries"]?.arrayValue ?? []).enumerated()), id: \.offset) { _, entry in
                        HStack(spacing: 12) {
                            Text(Self.rank(Int(entry["rank"]?.doubleValue ?? 0))).font(.headline).frame(width: 40)
                            AvatarView(url: entry["avatarUrl"]?.stringValue.flatMap(URL.init(string:)), name: entry["username"]?.stringValue ?? "?", size: 36)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry["username"]?.stringValue ?? "?").font(.subheadline.weight(.semibold))
                                ProgressView(value: min(1, max(0, (entry["progressPercentage"]?.doubleValue ?? 0) / 100)))
                            }
                            Text("Niv. \(Int(entry["level"]?.doubleValue ?? 0))").font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                } header: {
                    Text(payload["guild"]?["name"]?.stringValue ?? "Classement").sectionTitle()
                }
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Classement public")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .task { if !guildId.isEmpty && payload == nil { await load() } }
    }

    private static func rank(_ value: Int) -> String {
        switch value {
        case 1: "🥇"
        case 2: "🥈"
        case 3: "🥉"
        default: "#\(value)"
        }
    }

    private func load() async {
        let id = guildId.trimmingCharacters(in: .whitespaces)
        guard !id.isEmpty, id.allSatisfy(\.isNumber) else {
            message = "L'identifiant d'un serveur Discord ne contient que des chiffres."
            return
        }
        loading = true
        defer { loading = false }
        UserDefaults.standard.set(id, forKey: "ethone.leaderboard.guild")
        do {
            var request = URLRequest(url: Config.botURL.appendingPathComponent("api/public/leaderboard/\(id)"))
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, http) = try await HTTP.send(request)
            if http.statusCode == 404 {
                payload = nil
                message = "Ce classement n'est pas public (ou le serveur est introuvable)."
                return
            }
            guard (200..<300).contains(http.statusCode) else { throw HTTP.failure(status: http.statusCode, data: data) }
            payload = try JSONDecoder().decode(JSONValue.self, from: data)
            message = (payload?["entries"]?.arrayValue ?? []).isEmpty ? "Personne n'a encore gagné d'XP sur ce serveur." : nil
        } catch {
            payload = nil
            message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

