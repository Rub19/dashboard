import SwiftUI

/// Membres du serveur : recherche et consultation (statut, rôles, ancienneté, mise en sourdine). Lecture seule.
struct MembersAdminView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var members: [JSONValue] = []
    @State private var total = 0
    @State private var page = 1
    @State private var totalPages = 1
    @State private var query = ""
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            Section {
                ForEach(members, id: \.self) { member in
                    HStack(spacing: 12) {
                        AvatarView(url: Self.avatarURL(member), name: member["displayName"]?.stringValue ?? "?", size: 40, status: Self.status(member["status"]?.stringValue))
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text(member["displayName"]?.stringValue ?? "?").font(.subheadline.weight(.semibold))
                                if member["bot"]?.boolValue == true { GlassPill(text: "BOT") }
                            }
                            Text("@\(member["username"]?.stringValue ?? "")").font(.caption).foregroundStyle(.secondary)
                            if let until = member["communicationDisabledUntil"]?.stringValue.flatMap(ISODate.parse), until > Date() {
                                Label("Exclu jusqu'au \(until.formatted(date: .abbreviated, time: .shortened))", systemImage: "hourglass").font(.caption2).foregroundStyle(Theme.warning)
                            }
                            if let roles = member["roles"]?.arrayValue, !roles.isEmpty {
                                Text(roles.prefix(3).compactMap { $0["name"]?.stringValue }.joined(separator: " · ")).font(.caption2).foregroundStyle(.tertiary).lineLimit(1)
                            }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .onAppear { if member == members.last { Task { await loadMore() } } }
                }
            } header: { Text("\(total) membre(s)").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && members.isEmpty { ProgressView() } }
        .searchable(text: $query, prompt: "Rechercher un membre")
        .onSubmit(of: .search) { Task { await load() } }
        .navigationTitle("Membres")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private static func avatarURL(_ member: JSONValue) -> URL? {
        member["avatar"]?.stringValue.flatMap(URL.init(string:))
    }

    private static func status(_ raw: String?) -> PresenceStatus? {
        switch raw {
        case "online": .online
        case "idle": .away
        case "dnd": .busy
        case "offline": .invisible
        default: nil
        }
    }

    private func fetch(page: Int) async throws -> JSONValue {
        var items = [URLQueryItem(name: "page", value: "\(page)"), URLQueryItem(name: "limit", value: "25")]
        if !query.trimmingCharacters(in: .whitespaces).isEmpty { items.append(URLQueryItem(name: "search", value: query)) }
        return try await model.discord.call("api/guilds/\(guild.id)/server/members", query: items)
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await fetch(page: 1)
            members = response["members"]?.arrayValue ?? []
            total = Int(response["total"]?.doubleValue ?? Double(members.count))
            page = 1
            totalPages = Int(response["totalPages"]?.doubleValue ?? 1)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func loadMore() async {
        guard page < totalPages, !loading else { return }
        do {
            let response = try await fetch(page: page + 1)
            members += response["members"]?.arrayValue ?? []
            page += 1
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
