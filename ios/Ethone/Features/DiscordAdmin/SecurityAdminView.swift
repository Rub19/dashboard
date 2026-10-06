import SwiftUI

struct SecurityAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var metrics: JSONValue?
    @State private var raidEnabled = true
    @State private var nukeEnabled = true
    @State private var raidIncidents: [JSONValue] = []
    @State private var nukeIncidents: [JSONValue] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var pending: PendingAction?

    private enum PendingAction: Identifiable {
        case raidMode(Bool), lockdown(Bool)
        var id: String {
            switch self {
            case .raidMode(let on): "raid-\(on)"
            case .lockdown(let on): "lock-\(on)"
            }
        }
        var title: String {
            switch self {
            case .raidMode(let on): on ? "Activer le mode raid ?" : "Désactiver le mode raid ?"
            case .lockdown(let on): on ? "Verrouiller le serveur ?" : "Lever le verrouillage ?"
            }
        }
        var message: String {
            switch self {
            case .raidMode(let on): on ? "Les mesures anti-raid renforcées s'appliquent immédiatement à tout le serveur." : "Retour au fonctionnement normal."
            case .lockdown(let on): on ? "Les salons sont verrouillés pour les membres : à utiliser en urgence." : "Les salons verrouillés sont rouverts."
            }
        }
    }

    private var raidModeActive: Bool { metrics?["raidModeActive"]?.boolValue ?? false }
    private var lockdownActive: Bool { metrics?["lockdownActive"]?.boolValue ?? false }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            Section {
                Toggle("Anti-Raid activé", isOn: Binding(get: { raidEnabled }, set: { setRaid($0) }))
                if let metrics {
                    LabeledContent("Niveau de menace", value: metrics["threatLevel"]?.stringValue ?? "—")
                    LabeledContent("Score de risque", value: "\(Int(metrics["currentRiskScore"]?.doubleValue ?? 0))")
                    LabeledContent("Arrivées / min", value: "\(Int(metrics["joinsPerMinute"]?.doubleValue ?? 0))")
                    LabeledContent("Membres en quarantaine", value: "\(Int(metrics["quarantinedMembersCount"]?.doubleValue ?? 0))")
                }
                Button(raidModeActive ? "Désactiver le mode raid" : "Activer le mode raid", role: raidModeActive ? nil : .destructive) { pending = .raidMode(!raidModeActive) }
                Button(lockdownActive ? "Lever le verrouillage" : "Verrouillage d'urgence", role: lockdownActive ? nil : .destructive) { pending = .lockdown(!lockdownActive) }
            } header: { Text("Anti-Raid").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            if !raidIncidents.isEmpty {
                Section {
                    ForEach(raidIncidents.prefix(10), id: \.self) { incident in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(incident["type"]?.stringValue ?? incident["title"]?.stringValue ?? "Incident").font(.subheadline.weight(.semibold))
                            if let date = (incident["timestamp"]?.stringValue ?? incident["createdAt"]?.stringValue).flatMap(ISODate.parse) {
                                Text(date.formatted(date: .abbreviated, time: .shortened)).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: { Text("Incidents raid récents").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            Section {
                Toggle("Anti-Nuke activé", isOn: Binding(get: { nukeEnabled }, set: { setNuke($0) }))
                ForEach(nukeIncidents.prefix(10), id: \.self) { incident in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(incident["type"]?.stringValue ?? "Incident").font(.subheadline.weight(.semibold))
                            Text(incident["status"]?.stringValue == "open" ? "Ouvert" : "Résolu").font(.caption).foregroundStyle(incident["status"]?.stringValue == "open" ? Theme.warning : Color.secondary)
                        }
                        Spacer()
                        if incident["status"]?.stringValue == "open", let id = incident["id"]?.stringValue {
                            Button("Résoudre") { Task { await resolve(id) } }.buttonStyle(.glass)
                        }
                    }
                }
            } header: { Text("Anti-Nuke").sectionTitle() }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && metrics == nil { ProgressView() } }
        .navigationTitle("Sécurité")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .confirmationDialog(pending?.title ?? "", isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }), titleVisibility: .visible, presenting: pending) { action in
            Button("Confirmer", role: .destructive) { Task { await run(action) } }
        } message: { action in Text(action.message) }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        let base = "api/guilds/\(guild.id)"
        do {
            async let status = model.discord.call("\(base)/anti-raid/status")
            async let raidConfig = model.discord.call("\(base)/anti-raid/config")
            async let raidList = model.discord.call("\(base)/anti-raid/incidents", query: [URLQueryItem(name: "limit", value: "10")])
            async let nukeConfig = model.discord.call("\(base)/anti-nuke/config")
            async let nukeList = model.discord.call("\(base)/anti-nuke/incidents")
            let (s, rc, rl, nc, nl) = try await (status, raidConfig, raidList, nukeConfig, nukeList)
            metrics = s["metrics"]
            raidEnabled = rc["config"]?["enabled"]?.boolValue ?? true
            raidIncidents = rl["incidents"]?.arrayValue ?? []
            nukeEnabled = nc["config"]?["enabled"]?.boolValue ?? true
            nukeIncidents = nl["incidents"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func setRaid(_ value: Bool) {
        let previous = raidEnabled
        raidEnabled = value
        Task {
            do {
                _ = try await model.discord.call("api/guilds/\(guild.id)/anti-raid/config", method: "PUT", body: ["enabled": .bool(value)])
                errorMessage = nil
            } catch {
                raidEnabled = previous
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func setNuke(_ value: Bool) {
        let previous = nukeEnabled
        nukeEnabled = value
        Task {
            do {
                _ = try await model.discord.call("api/guilds/\(guild.id)/anti-nuke/config", method: "PUT", body: ["enabled": .bool(value)])
                errorMessage = nil
            } catch {
                nukeEnabled = previous
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func run(_ action: PendingAction) async {
        do {
            switch action {
            case .raidMode(let on):
                _ = try await model.discord.call("api/guilds/\(guild.id)/anti-raid/raid-mode", method: "POST", body: ["active": .bool(on), "reason": .string("Action depuis l'app ETHONE")])
            case .lockdown(let on):
                _ = try await model.discord.call("api/guilds/\(guild.id)/anti-raid/lockdown", method: "POST", body: ["active": .bool(on), "reason": .string("Action depuis l'app ETHONE")])
            }
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func resolve(_ id: String) async {
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/anti-nuke/incidents/\(id)/resolve", method: "POST", body: [:])
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

