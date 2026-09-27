import SwiftUI

/// Giveaways d'un serveur : suivi, prolongation, clôture, nouveau tirage et annulation (API du bot).
struct GiveawaysAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var giveaways: [JSONValue] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var pendingCancel: JSONValue?
    @State private var directory = GuildDirectory()
    @State private var creating = false

    private var active: [JSONValue] { giveaways.filter { ["active", "scheduled", "paused"].contains($0["status"]?.stringValue ?? "") } }
    private var finished: [JSONValue] { giveaways.filter { !["active", "scheduled", "paused"].contains($0["status"]?.stringValue ?? "") } }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            if !active.isEmpty {
                Section { ForEach(active, id: \.self) { row($0, isActive: true) } } header: { Text("En cours · \(active.count)").sectionTitle() }
            }
            if !finished.isEmpty {
                Section { ForEach(finished, id: \.self) { row($0, isActive: false) } } header: { Text("Terminés · \(finished.count)").sectionTitle() }
            }

            Section {
                EmptyView()
            } footer: {
                Text("Conditions d'accès et bannière : à régler depuis le panneau du site.")
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if giveaways.isEmpty && !loading { ContentUnavailableView("Aucun giveaway", systemImage: "gift", description: Text("Aucun giveaway sur ce serveur.")) }
            if loading && giveaways.isEmpty { ProgressView() }
        }
        .navigationTitle("Giveaways")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Nouveau", systemImage: "plus") { creating = true }
            }
        }
        .navigationDestination(isPresented: $creating) {
            CreateFormView(guild: guild, moduleBase: "guilds/{g}/giveaways", spec: AdminCreators.giveaway, directory: directory) { Task { await load() } }
        }
        .confirmationDialog("Annuler ce giveaway ?", isPresented: Binding(get: { pendingCancel != nil }, set: { if !$0 { pendingCancel = nil } }), titleVisibility: .visible) {
            Button("Annuler le giveaway", role: .destructive) {
                if let target = pendingCancel { Task { await act(target, "cancel") } }
                pendingCancel = nil
            }
        }
    }

    private func row(_ giveaway: JSONValue, isActive: Bool) -> some View {
        let participants = giveaway["participants"]?.arrayValue?.count ?? 0
        return VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(giveaway["prize"]?.stringValue ?? "Giveaway").font(.headline)
                Spacer()
                Text(Self.statusLabel(giveaway["status"]?.stringValue)).font(.caption.weight(.semibold)).foregroundStyle(isActive ? Theme.success : Color.secondary)
            }
            HStack(spacing: 10) {
                Label("\(participants)", systemImage: "person.2.fill")
                Label("\(Int(giveaway["winnerCount"]?.doubleValue ?? 1)) gagnant(s)", systemImage: "trophy.fill")
                if let end = giveaway["endsAt"]?.stringValue.flatMap(ISODate.parse) {
                    Text(isActive ? "Fin \(end.formatted(.relative(presentation: .named)))" : end.formatted(date: .abbreviated, time: .shortened))
                }
            }
            .font(.caption).foregroundStyle(.secondary)
            if isActive {
                HStack {
                    Button("+24 h") { Task { await act(giveaway, "extend", ["minutes": .number(1440)]) } }
                    Button("Terminer") { Task { await act(giveaway, "end") } }
                    Button("Annuler", role: .destructive) { pendingCancel = giveaway }
                }
                .buttonStyle(.glass)
                .font(.footnote)
            } else if giveaway["status"]?.stringValue == "ended" {
                Button("Retirer un gagnant") { Task { await act(giveaway, "reroll", ["count": .number(1)]) } }
                    .buttonStyle(.glass).font(.footnote)
            }
        }
        .listRowBackground(GlassRowBackground())
    }

    private static func statusLabel(_ raw: String?) -> String {
        switch raw {
        case "active": "Actif"
        case "scheduled": "Planifié"
        case "paused": "En pause"
        case "ended": "Terminé"
        case "cancelled": "Annulé"
        default: raw ?? "—"
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/giveaways/list")
            giveaways = (response["giveaways"]?.arrayValue ?? []).sorted { ($0["endsAt"]?.stringValue ?? "") > ($1["endsAt"]?.stringValue ?? "") }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func act(_ giveaway: JSONValue, _ action: String, _ body: [String: JSONValue] = [:]) async {
        guard let id = giveaway["id"]?.stringValue else { return }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/giveaways/\(id)/\(action)", method: "POST", body: body)
            infoMessage = "Action effectuée."
            errorMessage = nil
            await load()
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
