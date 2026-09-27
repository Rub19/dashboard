import SwiftUI

/// Modération : sanctions récentes (cases) et bannissements avec débannissement (API du bot).
struct ModerationAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var tab = "cases"
    @State private var cases: [JSONValue] = []
    @State private var bans: [JSONValue] = []
    @State private var total = 0
    @State private var query = ""
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var pendingUnban: JSONValue?

    var body: some View {
        List {
            Picker("Section", selection: $tab) {
                Text("Sanctions").tag("cases")
                Text("Bannis").tag("bans")
            }
            .pickerStyle(.segmented)
            .listRowBackground(Color.clear)

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            if tab == "cases" {
                Section {
                    ForEach(cases, id: \.self) { entry in
                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text("#\(Int(entry["caseNumber"]?.doubleValue ?? 0)) · \(Self.actionLabel(entry["action"]?.stringValue))").font(.headline)
                                Spacer()
                                Text(Self.statusLabel(entry["status"]?.stringValue)).font(.caption.weight(.semibold))
                                    .foregroundStyle(entry["status"]?.stringValue == "ACTIVE" ? Theme.warning : Color.secondary)
                            }
                            Text(entry["userTag"]?.stringValue ?? "").font(.subheadline)
                            Text(entry["reason"]?.stringValue ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            Text("Par \(entry["moderatorTag"]?.stringValue ?? "?")" + (entry["createdAt"]?.stringValue.flatMap(ISODate.parse).map { " · " + $0.formatted(date: .abbreviated, time: .shortened) } ?? ""))
                                .font(.caption2).foregroundStyle(.tertiary)
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                } header: { Text("\(total) sanction(s)").sectionTitle() }
            } else {
                Section {
                    ForEach(bans, id: \.self) { ban in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(ban["userTag"]?.stringValue ?? ban["username"]?.stringValue ?? "?").font(.headline)
                                Text(ban["reason"]?.stringValue ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            }
                            Spacer()
                            Button("Débannir") { pendingUnban = ban }.buttonStyle(.glass)
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                } header: { Text("\(bans.count) banni(s)").sectionTitle() }
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && cases.isEmpty && bans.isEmpty { ProgressView() } }
        .searchable(text: $query, prompt: "Rechercher une sanction")
        .onSubmit(of: .search) { Task { await loadCases() } }
        .navigationTitle("Modération")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .task(id: tab) { if tab == "bans" && bans.isEmpty { await loadBans() } }
        .confirmationDialog("Débannir ce membre ?", isPresented: Binding(get: { pendingUnban != nil }, set: { if !$0 { pendingUnban = nil } }), titleVisibility: .visible) {
            Button("Débannir", role: .destructive) {
                if let target = pendingUnban { Task { await unban(target) } }
                pendingUnban = nil
            }
        } message: { Text("Une sanction « débannissement » sera enregistrée dans les cases du serveur.") }
    }

    private static func actionLabel(_ raw: String?) -> String {
        switch raw {
        case "WARN": "Avertissement"
        case "TIMEOUT": "Exclusion temporaire"
        case "KICK": "Expulsion"
        case "BAN": "Bannissement"
        case "UNBAN": "Débannissement"
        case "SOFTBAN": "Softban"
        case "QUARANTINE": "Quarantaine"
        default: raw ?? "—"
        }
    }

    private static func statusLabel(_ raw: String?) -> String {
        switch raw {
        case "ACTIVE": "Active"
        case "EXPIRED": "Expirée"
        case "REVOKED": "Révoquée"
        default: raw ?? "—"
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        await loadCases()
        if tab == "bans" { await loadBans() }
    }

    private func loadCases() async {
        do {
            var items = [URLQueryItem(name: "limit", value: "50")]
            if !query.trimmingCharacters(in: .whitespaces).isEmpty { items.append(URLQueryItem(name: "search", value: query)) }
            let response = try await model.discord.call("api/guilds/\(guild.id)/moderation/cases", query: items)
            cases = response["cases"]?.arrayValue ?? []
            total = Int(response["total"]?.doubleValue ?? Double(cases.count))
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func loadBans() async {
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/moderation/bans")
            bans = response["bans"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func unban(_ ban: JSONValue) async {
        guard let userId = ban["userId"]?.stringValue else { return }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/moderation/unban", method: "POST",
                                             body: ["userId": .string(userId), "reason": .string("Débannissement depuis l'app ETHONE")])
            await loadBans()
            await loadCases()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
