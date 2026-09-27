import SwiftUI

// MARK: - Réponses d'un formulaire

/// Réponses reçues par un formulaire : filtre par statut, lecture des réponses, décision (approuver, refuser, demander des modifications, spam).
struct FormResponsesView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let form: JSONValue
    @State private var responses: [JSONValue] = []
    @State private var status = "ALL"
    @State private var loading = true
    @State private var errorMessage: String?

    static let statuses: [(id: String, label: String)] = [
        ("PENDING", "En attente"), ("REVIEWING", "En cours d'examen"), ("APPROVED", "Approuvée"), ("REJECTED", "Refusée"),
        ("CHANGES_REQUESTED", "Modifications demandées"), ("ARCHIVED", "Archivée"), ("SPAM", "Spam"),
    ]

    static func label(_ id: String?) -> String { statuses.first { $0.id == id }?.label ?? (id ?? "—") }

    private var formId: String { form["id"]?.stringValue ?? "" }

    var body: some View {
        List {
            Picker("Statut", selection: $status) {
                Text("Toutes").tag("ALL")
                ForEach(Self.statuses, id: \.id) { Text($0.label).tag($0.id) }
            }
            .pickerStyle(.menu)
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            ForEach(responses, id: \.self) { response in
                NavigationLink {
                    FormResponseDetailView(guild: guild, formId: formId, response: response) { updated in
                        if let index = responses.firstIndex(where: { $0["id"]?.stringValue == updated["id"]?.stringValue }) { responses[index] = updated }
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack {
                            Text(response["userTag"]?.stringValue ?? "Membre").font(.headline)
                            Spacer()
                            Text(Self.label(response["status"]?.stringValue)).font(.caption.weight(.semibold)).foregroundStyle(Theme.accentSoft)
                        }
                        if let date = AdminText.date(of: response) { Text(date.formatted(date: .abbreviated, time: .shortened)).font(.caption).foregroundStyle(.secondary) }
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if responses.isEmpty && !loading { ContentUnavailableView("Aucune réponse", systemImage: "tray", description: Text("Aucune réponse pour ce filtre.")) }
            if loading && responses.isEmpty { ProgressView() }
        }
        .navigationTitle(form["title"]?.stringValue ?? "Réponses")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task(id: status) { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let items = status == "ALL" ? [] : [URLQueryItem(name: "status", value: status)]
            let response = try await model.discord.call("api/guilds/\(guild.id)/forms/\(formId)/responses", query: items)
            responses = response["responses"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct FormResponseDetailView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let formId: String
    @State var response: JSONValue
    let onChange: (JSONValue) -> Void
    @State private var reason = ""
    @State private var note = ""
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    init(guild: DiscordGuild, formId: String, response: JSONValue, onChange: @escaping (JSONValue) -> Void) {
        self.guild = guild
        self.formId = formId
        self._response = State(initialValue: response)
        self.onChange = onChange
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Membre", value: response["userTag"]?.stringValue ?? "—")
                LabeledContent("Statut", value: FormResponsesView.label(response["status"]?.stringValue))
                if let reason = response["decisionReason"]?.stringValue, !reason.isEmpty { LabeledContent("Motif", value: reason) }
            }
            .listRowBackground(GlassRowBackground())

            if let answers = response["answers"] {
                Section { JSONFieldsView(value: answers) } header: { Text("Réponses").sectionTitle() }
                    .listRowBackground(GlassRowBackground())
            }

            Section {
                TextField("Motif de la décision (facultatif)", text: $reason, axis: .vertical).lineLimit(1...4)
                TextField("Note interne (facultative)", text: $note, axis: .vertical).lineLimit(1...4)
                Button("Approuver") { Task { await review("APPROVED") } }
                Button("Demander des modifications") { Task { await review("CHANGES_REQUESTED") } }
                Button("Refuser", role: .destructive) { Task { await review("REJECTED") } }
                Button("Marquer comme spam", role: .destructive) { Task { await review("SPAM") } }
            } header: { Text("Décision").sectionTitle() }
            .disabled(busy)
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Réponse")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }

    private func review(_ status: String) async {
        guard let id = response["id"]?.stringValue else { return }
        busy = true
        defer { busy = false }
        var body: [String: JSONValue] = [
            "status": .string(status),
            "reviewerId": .string(model.discord.user?.id ?? "staff"),
            "reviewerTag": .string(model.discord.user?.username ?? "Staff"),
        ]
        if !reason.trimmingCharacters(in: .whitespaces).isEmpty { body["decisionReason"] = .string(reason) }
        if !note.trimmingCharacters(in: .whitespaces).isEmpty { body["noteContent"] = .string(note) }
        do {
            let result = try await model.discord.call("api/guilds/\(guild.id)/forms/\(formId)/responses/\(id)/review", method: "POST", body: body)
            if let updated = result["response"] {
                response = updated
                onChange(updated)
            }
            infoMessage = "Décision enregistrée."
            errorMessage = nil
            reason = ""
            note = ""
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

// MARK: - Participants d'un événement

/// Inscrits à un événement : réponse (RSVP), pointage manuel le jour J, retrait d'un participant.
struct EventParticipantsView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let event: JSONValue
    @State private var participants: [JSONValue] = []
    @State private var loading = true
    @State private var errorMessage: String?

    private var eventId: String { event["id"]?.stringValue ?? "" }

    private func userId(_ participant: JSONValue) -> String? { participant["userId"]?.stringValue ?? participant["id"]?.stringValue }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            Section {
                ForEach(participants, id: \.self) { participant in
                    VStack(alignment: .leading, spacing: 3) {
                        Text(participant["displayName"]?.stringValue ?? participant["username"]?.stringValue ?? "Membre").font(.headline)
                        HStack(spacing: 8) {
                            Text(Self.rsvp(participant["rsvp"]?.stringValue))
                            if let attendance = participant["attendance"]?.stringValue, attendance != "PENDING" { Text(attendance == "ATTENDED" ? "Présent" : attendance.capitalized) }
                        }
                        .font(.caption).foregroundStyle(.secondary)
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .leading) {
                        Button { Task { await checkIn(participant) } } label: { Label("Pointer", systemImage: "checkmark.circle") }.tint(Theme.success)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { Task { await remove(participant) } } label: { Label("Retirer", systemImage: "person.badge.minus") }
                    }
                }
            } header: { Text("\(participants.count) inscrit(s)").sectionTitle() } footer: {
                Text("Glisser vers la droite : pointer comme présent. Vers la gauche : retirer de l'événement.")
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if participants.isEmpty && !loading { ContentUnavailableView("Aucun inscrit", systemImage: "person.3", description: Text("Personne ne s'est encore inscrit.")) }
            if loading && participants.isEmpty { ProgressView() }
        }
        .navigationTitle(event["title"]?.stringValue ?? "Participants")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private static func rsvp(_ raw: String?) -> String {
        switch raw {
        case "GOING": "Participe"
        case "MAYBE": "Peut-être"
        case "DECLINED", "NOT_GOING": "Ne participe pas"
        case "WAITLIST": "Liste d'attente"
        default: raw ?? "—"
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/events/\(eventId)/participants")
            participants = response["participants"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func checkIn(_ participant: JSONValue) async {
        guard let id = userId(participant) else { return }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/events/\(eventId)/participants/\(id)/checkin", method: "POST", body: [
                "attendance": .string("ATTENDED"),
                "username": .string(participant["username"]?.stringValue ?? "User"),
                "displayName": .string(participant["displayName"]?.stringValue ?? ""),
            ])
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func remove(_ participant: JSONValue) async {
        guard let id = userId(participant) else { return }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/events/\(eventId)/participants/\(id)", method: "DELETE")
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
