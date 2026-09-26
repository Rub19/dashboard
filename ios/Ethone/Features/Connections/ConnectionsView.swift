import SwiftUI

struct ConnectionStatus: Identifiable, Decodable, Hashable {
    let provider: String
    let connected: Bool
    var id: String { provider }

    var name: String {
        switch provider {
        case "spotify": return "Spotify"
        case "youtube": return "YouTube"
        case "twitch": return "Twitch"
        case "discord": return "Discord"
        case "reddit": return "Reddit"
        case "minecraft": return "Minecraft"
        case "google-calendar": return "Google Agenda"
        case "google-drive": return "Google Drive"
        case "notion": return "Notion"
        case "todoist": return "Todoist"
        case "linear": return "Linear"
        case "clickup": return "ClickUp"
        case "jira": return "Jira"
        case "email": return "E-mail"
        case "github": return "GitHub"
        case "gitlab": return "GitLab"
        case "fitbit": return "Fitbit"
        default: return provider.replacingOccurrences(of: "-", with: " ").capitalized
        }
    }

    var symbol: String {
        switch provider {
        case "spotify", "youtube", "twitch": return "play.rectangle.fill"
        case "discord": return "bubble.left.and.bubble.right.fill"
        case "google-calendar": return "calendar"
        case "google-drive": return "externaldrive.fill"
        case "github", "gitlab": return "chevron.left.forwardslash.chevron.right"
        case "email": return "envelope.fill"
        case "fitbit": return "heart.fill"
        default: return "link"
        }
    }
}

/// État des services reliés (lecture seule : la liaison OAuth de chaque service se fait depuis le site).
struct ConnectionsView: View {
    @Environment(AppModel.self) private var model
    @State private var items: [ConnectionStatus] = []
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            Section {
                ForEach(items.sorted { ($0.connected ? 0 : 1, $0.name) < ($1.connected ? 0 : 1, $1.name) }) { item in
                    HStack {
                        Label(item.name, systemImage: item.symbol)
                        Spacer()
                        if item.connected {
                            GlassPill(text: "Connecté", systemImage: "checkmark", tint: Theme.success.opacity(0.4))
                        } else {
                            Text("Non relié").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            } footer: {
                Text("Reliez ou retirez un service depuis ethone.dev → Connexions.")
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && items.isEmpty { ProgressView() } }
        .navigationTitle("Connexions")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            items = try await model.api.worker("api/connections", as: [ConnectionStatus].self)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
