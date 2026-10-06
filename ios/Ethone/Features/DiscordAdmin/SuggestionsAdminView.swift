import SwiftUI

struct SuggestionsAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var suggestions: [JSONValue] = []
    @State private var filter = "pending"
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var editing: JSONValue?

    static let statuses: [(id: String, label: String)] = [
        ("pending", "En attente"), ("under_review", "À l'étude"), ("planned", "Planifiée"), ("accepted", "Acceptée"),
        ("in_progress", "En cours"), ("completed", "Terminée"), ("rejected", "Refusée"), ("duplicate", "Doublon"), ("on_hold", "En pause"),
    ]

    static func label(_ id: String?) -> String { statuses.first { $0.id == id }?.label ?? (id ?? "—") }

    private var shown: [JSONValue] {
        suggestions.filter { filter == "all" || $0["status"]?.stringValue == filter }
            .sorted { ($0["score"]?.doubleValue ?? 0) > ($1["score"]?.doubleValue ?? 0) }
    }

    var body: some View {
        List {
            Picker("Statut", selection: $filter) {
                Text("Toutes").tag("all")
                ForEach(Self.statuses, id: \.id) { Text($0.label).tag($0.id) }
            }
            .pickerStyle(.menu)
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            ForEach(shown, id: \.self) { suggestion in
                Button { editing = suggestion } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text("#\(Int(suggestion["numericId"]?.doubleValue ?? 0)) \(suggestion["title"]?.stringValue ?? "")").font(.headline).foregroundStyle(.primary).lineLimit(2)
                            Spacer()
                            Text(Self.label(suggestion["status"]?.stringValue)).font(.caption.weight(.semibold)).foregroundStyle(Theme.accentSoft)
                        }
                        Text(suggestion["description"]?.stringValue ?? "").font(.subheadline).foregroundStyle(.secondary).lineLimit(3)
                        HStack(spacing: 10) {
                            Label("\(Int(suggestion["upvotesCount"]?.doubleValue ?? 0))", systemImage: "hand.thumbsup.fill")
                            Label("\(Int(suggestion["downvotesCount"]?.doubleValue ?? 0))", systemImage: "hand.thumbsdown.fill")
                            Text(suggestion["authorTag"]?.stringValue ?? "")
                        }
                        .font(.caption).foregroundStyle(.secondary)
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if shown.isEmpty && !loading { ContentUnavailableView("Aucune suggestion", systemImage: "lightbulb", description: Text("Rien pour ce statut.")) }
            if loading && suggestions.isEmpty { ProgressView() }
        }
        .navigationTitle("Suggestions")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .sheet(item: Binding(get: { editing.map { IdentifiedJSON(value: $0) } }, set: { editing = $0?.value })) { item in
            SuggestionStatusSheet(guild: guild, suggestion: item.value) { updated in
                if let index = suggestions.firstIndex(where: { $0["id"]?.stringValue == updated["id"]?.stringValue }) { suggestions[index] = updated }
            }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/suggestions/list")
            suggestions = response["suggestions"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct IdentifiedJSON: Identifiable {
    let value: JSONValue
    var id: String { value["id"]?.stringValue ?? UUID().uuidString }
}

private struct SuggestionStatusSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let guild: DiscordGuild
    let suggestion: JSONValue
    let onSaved: (JSONValue) -> Void
    @State private var status: String
    @State private var response = ""
    @State private var saving = false
    @State private var errorMessage: String?

    init(guild: DiscordGuild, suggestion: JSONValue, onSaved: @escaping (JSONValue) -> Void) {
        self.guild = guild
        self.suggestion = suggestion
        self.onSaved = onSaved
        self._status = State(initialValue: suggestion["status"]?.stringValue ?? "pending")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(suggestion["title"]?.stringValue ?? "").font(.headline)
                    Text(suggestion["description"]?.stringValue ?? "").font(.subheadline).foregroundStyle(.secondary)
                }
                Section("Statut") {
                    Picker("Statut", selection: $status) {
                        ForEach(SuggestionsAdminView.statuses, id: \.id) { Text($0.label).tag($0.id) }
                    }
                }
                Section("Réponse du staff (facultative)") {
                    TextField("Message visible par les membres", text: $response, axis: .vertical).lineLimit(2...5)
                }
                if let errorMessage { Text(errorMessage).foregroundStyle(Theme.danger).font(.footnote) }
            }
            .navigationTitle("Suggestion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { Task { await save() } }.disabled(saving)
                }
            }
        }
    }

    private func save() async {
        guard let id = suggestion["id"]?.stringValue else { return }
        saving = true
        defer { saving = false }
        var body: [String: JSONValue] = ["status": .string(status)]
        let text = response.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty { body["staffResponse"] = .string(text) }
        do {
            let result = try await model.discord.call("api/guilds/\(guild.id)/suggestions/\(id)/status", method: "POST", body: body)
            if let updated = result["suggestion"] { onSaved(updated) }
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

