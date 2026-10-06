import SwiftUI

struct TicketsAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var tickets: [JSONValue] = []
    @State private var scope = "open"
    @State private var loading = true
    @State private var errorMessage: String?

    private var shown: [JSONValue] {
        tickets.filter { ticket in
            let closed = ["RESOLVED", "CLOSED"].contains(ticket["status"]?.stringValue ?? "")
            return scope == "open" ? !closed : closed
        }
    }

    var body: some View {
        List {
            Picker("Affichage", selection: $scope) {
                Text("En cours").tag("open")
                Text("Fermés").tag("closed")
            }
            .pickerStyle(.segmented)
            .listRowBackground(Color.clear)

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            ForEach(shown, id: \.self) { ticket in
                NavigationLink {
                    TicketDetailView(guild: guild, initial: ticket) { updated in
                        if let index = tickets.firstIndex(where: { $0["id"]?.stringValue == updated["id"]?.stringValue }) { tickets[index] = updated }
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text("\(ticket["id"]?.stringValue ?? "?") · \(ticket["categoryName"]?.stringValue ?? "Ticket")").font(.headline)
                            Spacer()
                            Text(TicketLabels.status(ticket["status"]?.stringValue)).font(.caption.weight(.semibold)).foregroundStyle(TicketLabels.color(ticket["status"]?.stringValue))
                        }
                        Text(ticket["userTag"]?.stringValue ?? "").font(.subheadline).foregroundStyle(.secondary)
                        HStack(spacing: 8) {
                            if let priority = ticket["priority"]?.stringValue, priority != "NORMAL" {
                                Text(TicketLabels.priority(priority)).foregroundStyle(priority == "URGENT" || priority == "HIGH" ? Theme.danger : Color.secondary)
                            }
                            if let claimed = ticket["claimedBy"]?["tag"]?.stringValue { Label(claimed, systemImage: "person.fill.checkmark") }
                        }
                        .font(.caption)
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if shown.isEmpty && !loading { ContentUnavailableView("Aucun ticket", systemImage: "ticket", description: Text(scope == "open" ? "Aucun ticket en cours." : "Aucun ticket fermé.")) }
            if loading && tickets.isEmpty { ProgressView() }
        }
        .navigationTitle("Tickets")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/tickets/list", query: [URLQueryItem(name: "limit", value: "100")])
            tickets = response["tickets"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

enum TicketLabels {
    static func status(_ raw: String?) -> String {
        switch raw {
        case "OPEN": "Ouvert"
        case "PENDING": "En attente"
        case "WAITING_USER": "Attend l'utilisateur"
        case "WAITING_STAFF": "Attend le staff"
        case "RESOLVED": "Résolu"
        case "CLOSED": "Fermé"
        default: raw ?? "—"
        }
    }

    static func priority(_ raw: String?) -> String {
        switch raw {
        case "LOW": "Basse"
        case "HIGH": "Haute"
        case "URGENT": "Urgente"
        default: "Normale"
        }
    }

    static func color(_ raw: String?) -> Color {
        switch raw {
        case "OPEN": Theme.success
        case "RESOLVED", "CLOSED": Color.secondary
        default: Theme.warning
        }
    }
}

struct TicketDetailView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State var ticket: JSONValue
    let onChange: (JSONValue) -> Void
    @State private var note = ""
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var confirmClose = false

    init(guild: DiscordGuild, initial: JSONValue, onChange: @escaping (JSONValue) -> Void) {
        self.guild = guild
        self._ticket = State(initialValue: initial)
        self.onChange = onChange
    }

    private var id: String { ticket["id"]?.stringValue ?? "" }
    private var status: String { ticket["status"]?.stringValue ?? "" }
    private var isClosed: Bool { ["RESOLVED", "CLOSED"].contains(status) }
    private var actor: JSONValue {
        .object(["id": .string(model.discord.user?.id ?? "staff"), "tag": .string(model.discord.user?.username ?? "Staff")])
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Statut", value: TicketLabels.status(status))
                LabeledContent("Demandeur", value: ticket["userTag"]?.stringValue ?? "—")
                LabeledContent("Catégorie", value: ticket["categoryName"]?.stringValue ?? "—")
                LabeledContent("Priorité", value: TicketLabels.priority(ticket["priority"]?.stringValue))
                LabeledContent("Pris en charge par", value: ticket["claimedBy"]?["tag"]?.stringValue ?? "Personne")
                if let created = ticket["createdAt"]?.stringValue.flatMap(ISODate.parse) {
                    LabeledContent("Créé", value: created.formatted(date: .abbreviated, time: .shortened))
                }
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                if !isClosed {
                    if ticket["claimedBy"]?["id"]?.stringValue == nil {
                        Button("Prendre en charge") { Task { await claim() } }
                    } else {
                        Button("Ne plus suivre") { Task { await post("unclaim", [:]) } }
                    }
                    Menu("Changer la priorité") {
                        ForEach(["LOW", "NORMAL", "HIGH", "URGENT"], id: \.self) { value in
                            Button(TicketLabels.priority(value)) { Task { await post("priority", ["priority": .string(value), "performedBy": actor]) } }
                        }
                    }
                    Button("Fermer le ticket", role: .destructive) { confirmClose = true }
                } else {
                    Button("Rouvrir le ticket") { Task { await post("reopen", ["reopenedBy": actor]) } }
                }
            } header: { Text("Actions").sectionTitle() }
            .disabled(busy)
            .listRowBackground(GlassRowBackground())

            Section {
                ForEach(Array((ticket["notes"]?.arrayValue ?? []).enumerated()), id: \.offset) { _, entry in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry["content"]?.stringValue ?? "").font(.subheadline)
                        Text(entry["authorTag"]?.stringValue ?? "").font(.caption).foregroundStyle(.secondary)
                    }
                }
                HStack {
                    TextField("Note interne", text: $note)
                    Button("Ajouter") { Task { await addNote() } }.disabled(note.trimmingCharacters(in: .whitespaces).isEmpty || busy)
                }
            } header: { Text("Notes internes").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            Section {
                ForEach(Array((ticket["activityTimeline"]?.arrayValue ?? []).reversed().enumerated()), id: \.offset) { _, entry in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry["description"]?.stringValue ?? "").font(.subheadline)
                        Text("\(entry["actorTag"]?.stringValue ?? "")" + (entry["timestamp"]?.stringValue.flatMap(ISODate.parse).map { " · " + $0.formatted(date: .abbreviated, time: .shortened) } ?? ""))
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            } header: { Text("Historique").sectionTitle() }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .navigationTitle(id)
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .confirmationDialog("Fermer ce ticket ? Le salon Discord sera fermé.", isPresented: $confirmClose, titleVisibility: .visible) {
            Button("Fermer", role: .destructive) { Task { await post("close", ["closedBy": actor, "reason": .string("Fermé depuis l'app ETHONE")]) } }
        }
    }

    private func claim() async {
        await post("claim", [
            "staffId": .string(model.discord.user?.id ?? "staff"),
            "staffTag": .string(model.discord.user?.username ?? "Staff"),
        ])
    }

    private func addNote() async {
        let text = note.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        await post("notes", ["content": .string(text), "author": actor])
        note = ""
    }

    private func post(_ action: String, _ body: [String: JSONValue]) async {
        busy = true
        defer { busy = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/tickets/tickets/\(id)/\(action)", method: "POST", body: body)
            if let updated = response["ticket"] {
                ticket = updated
                onChange(updated)
            }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

