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

    /// Real brand logo (Simple Icons, CC0) and brand color, when the provider has one.
    var brand: (asset: String, color: UInt32)? {
        switch provider {
        case "spotify": ("BrandSpotify", 0x1DB954)
        case "youtube": ("BrandYouTube", 0xFF0000)
        case "twitch": ("BrandTwitch", 0x9146FF)
        case "discord": ("BrandDiscord", 0x5865F2)
        case "reddit": ("BrandReddit", 0xFF4500)
        case "google-calendar": ("BrandGoogleCalendar", 0x4285F4)
        case "google-drive": ("BrandGoogleDrive", 0x1FA463)
        case "notion": ("BrandNotion", 0x2F2F2F)
        case "todoist": ("BrandTodoist", 0xE44332)
        case "linear": ("BrandLinear", 0x5E6AD2)
        case "clickup": ("BrandClickUp", 0x7B68EE)
        case "jira": ("BrandJira", 0x0052CC)
        case "github": ("BrandGitHub", 0x24292F)
        case "gitlab": ("BrandGitLab", 0xFC6D26)
        case "fitbit": ("BrandFitbit", 0x00B0B9)
        case "plex": ("BrandPlex", 0xE5A00D)
        case "jellyfin": ("BrandJellyfin", 0x00A4DC)
        case "emby": ("BrandEmby", 0x52B54B)
        case "bluesky": ("BrandBluesky", 0x0285FF)
        case "obsidian": ("BrandObsidian", 0x7C3AED)
        case "riot": ("BrandRiot", 0xEB0029)
        default: nil
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
                    HStack(spacing: 14) {
                        if let brand = item.brand {
                            Image(brand.asset)
                                .resizable()
                                .renderingMode(.template)
                                .scaledToFit()
                                .frame(width: 17, height: 17)
                                .foregroundStyle(.white)
                                .frame(width: 30, height: 30)
                                .background(Color(hex: brand.color).gradient, in: .rect(cornerRadius: 8, style: .continuous))
                                .saturation(item.connected ? 1 : 0.15)
                                .opacity(item.connected ? 1 : 0.7)
                                .accessibilityHidden(true)
                        } else {
                            IconTile(systemImage: item.symbol, color: item.connected ? Theme.accent : Color(hex: 0x7A7F8C))
                        }
                        Text(item.name)
                        Spacer()
                        HStack(spacing: 6) {
                            Circle().fill(item.connected ? Theme.success : Color.secondary.opacity(0.5)).frame(width: 7, height: 7)
                            Text(item.connected ? "Connecté" : "Non relié").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            } footer: {
                Text("Reliez ou retirez un service depuis la page Connexions d'ethone.dev.")
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && items.isEmpty { ProgressView() } }
        .navigationTitle("Connexions")
        .ethoneScreen()
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

