import SwiftUI

/// Journal d'audit du serveur : événements récents filtrables par gravité (lecture seule).
struct AuditLogAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var events: [JSONValue] = []
    @State private var severity = "ALL"
    @State private var query = ""
    @State private var loading = true
    @State private var errorMessage: String?

    private static let severities = ["ALL", "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]

    var body: some View {
        List {
            Picker("Gravité", selection: $severity) {
                ForEach(Self.severities, id: \.self) { Text($0 == "ALL" ? "Toutes" : $0.capitalized).tag($0) }
            }
            .pickerStyle(.menu)
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            ForEach(events, id: \.self) { event in
                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(event["type"]?.stringValue ?? "Événement").font(.subheadline.weight(.semibold))
                        Spacer()
                        Text(event["severity"]?.stringValue ?? "").font(.caption2.weight(.bold)).foregroundStyle(Self.color(event["severity"]?.stringValue))
                    }
                    Text("\(event["actor"]?["tag"]?.stringValue ?? "?")" + (event["target"]?["tag"]?.stringValue.map { " → \($0)" } ?? ""))
                        .font(.caption).foregroundStyle(.secondary)
                    if let reason = event["reason"]?.stringValue, !reason.isEmpty { Text(reason).font(.caption).lineLimit(2) }
                    if let date = event["timestamp"]?.stringValue.flatMap(ISODate.parse) {
                        Text(date.formatted(date: .abbreviated, time: .standard)).font(.caption2).foregroundStyle(.tertiary)
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if events.isEmpty && !loading { ContentUnavailableView("Aucun événement", systemImage: "list.bullet.rectangle", description: Text("Rien à afficher pour ce filtre.")) }
            if loading && events.isEmpty { ProgressView() }
        }
        .searchable(text: $query, prompt: "Rechercher")
        .onSubmit(of: .search) { Task { await load() } }
        .navigationTitle("Journal d'audit")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task(id: severity) { await load() }
    }

    private static func color(_ raw: String?) -> Color {
        switch raw {
        case "CRITICAL", "HIGH": Theme.danger
        case "MEDIUM": Theme.warning
        default: Color.secondary
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            var items = [URLQueryItem(name: "limit", value: "50")]
            if severity != "ALL" { items.append(URLQueryItem(name: "severity", value: severity)) }
            if !query.trimmingCharacters(in: .whitespaces).isEmpty { items.append(URLQueryItem(name: "search", value: query)) }
            let response = try await model.discord.call("api/guilds/\(guild.id)/logs/events", query: items)
            events = response["events"]?.arrayValue ?? []
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
