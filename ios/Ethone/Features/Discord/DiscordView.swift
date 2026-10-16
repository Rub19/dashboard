import SwiftUI

struct DiscordView: View {
    @Environment(AppModel.self) private var model

    private var discord: DiscordStore { model.discord }

    var body: some View {
        Group {
            if discord.isConnected {
                guildList
            } else {
                connectPrompt
            }
        }
        .navigationTitle("Discord")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: DiscordGuild.self) { guild in GuildDetailView(guild: guild) }
    }

    private var connectPrompt: some View {
        VStack(alignment: .leading, spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 30))
                .foregroundStyle(Color(hex: 0x5865F2))
                .padding(18)
                .glassEffect(Glass.regular.tint(Color(hex: 0x5865F2).opacity(0.3)), in: .rect(cornerRadius: 22))
                .reveal(0)
            VStack(alignment: .leading, spacing: 12) {
                AccentRule()
                EthoneHeadline(first: "Configurer Etho,", second: "serveur par serveur.", size: .title)
            }
            .reveal(1)
            Text("La connexion Discord sert uniquement à identifier votre compte et les serveurs que vous pouvez gérer.")
                .foregroundStyle(.secondary)
                .reveal(2)
            if let message = discord.errorMessage {
                Label(message, systemImage: "exclamationmark.circle.fill").font(.footnote).foregroundStyle(Theme.danger)
            }
            Button {
                Task { await discord.signIn() }
            } label: {
                HStack {
                    if discord.isLoading { ProgressView() }
                    Text("Se connecter avec Discord").fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            }
            .buttonStyle(.glassProminent)
            .tint(Color(hex: 0x5865F2))
            .disabled(discord.isLoading)
            .reveal(3)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var guildList: some View {
        List {
            if let user = discord.user {
                HStack(spacing: 12) {
                    AvatarView(url: user.avatarURL, name: user.displayName, size: 44)
                    VStack(alignment: .leading) {
                        Text(user.displayName).font(.headline)
                        Text("@\(user.username)").font(.footnote).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Déconnexion") { discord.signOut() }.font(.footnote)
                }
                .listRowBackground(GlassRowBackground())
            }
            if let message = discord.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            Section {
                ForEach(discord.guilds) { guild in
                    NavigationLink(value: guild) {
                        HStack(spacing: 12) {
                            AvatarView(url: guild.iconURL, name: guild.name, size: 44)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(guild.name).font(.headline).lineLimit(1)
                                Text(guild.botPresent ? "\(guild.memberCount ?? 0) membres" : "Bot absent").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if !guild.botPresent { GlassPill(text: "Inviter", systemImage: "plus") }
                        }
                    }
                    .disabled(!guild.botPresent)
                    .listRowBackground(GlassRowBackground())
                }
            } header: { Text("Vos serveurs").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if discord.isLoading && discord.guilds.isEmpty { ProgressView() }
        }
        .refreshable { await discord.refresh() }
        .task { await discord.refresh() }
    }
}

struct GuildDetailView: View {
    @Environment(AppModel.self) private var model
    let initialGuild: DiscordGuild

    @State private var currentGuild: DiscordGuild
    @State private var overview: GuildOverview?
    @State private var modules: [DiscordModule] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var search = ""

    init(guild: DiscordGuild) {
        self.initialGuild = guild
        _currentGuild = State(initialValue: guild)
    }

    private var filtered: [DiscordModule] {
        search.isEmpty ? modules : modules.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        List {
            if let overview {
                Section {
                    StatStrip(items: [
                        ("\(overview.guild.memberCount)", "Membres"),
                        ("\(Int(overview.botStatus.pingMs)) ms", "Latence"),
                        ("\(overview.stats.commandsToday ?? 0)", "Commandes / jour"),
                    ])
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if currentGuild.botPresent {
                Section {
                    NavigationLink { TicketsAdminView(guild: currentGuild) } label: { Label("Tickets", systemImage: "ticket.fill") }
                    NavigationLink { ModerationAdminView(guild: currentGuild) } label: { Label("Modération", systemImage: "shield.lefthalf.filled") }
                    NavigationLink { GiveawaysAdminView(guild: currentGuild) } label: { Label("Giveaways", systemImage: "gift.fill") }
                    NavigationLink { SecurityAdminView(guild: currentGuild) } label: { Label("Sécurité", systemImage: "lock.shield.fill") }
                    NavigationLink { MembersAdminView(guild: currentGuild) } label: { Label("Membres", systemImage: "person.2.fill") }
                    NavigationLink { SuggestionsAdminView(guild: currentGuild) } label: { Label("Suggestions", systemImage: "lightbulb.fill") }
                    NavigationLink { ModuleScreen(guild: currentGuild, spec: AdminCatalog.streamersSpec) } label: { Label("Alertes Streamers", systemImage: "antenna.radiowaves.left.and.right") }
                    NavigationLink { ModuleScreen(guild: currentGuild, spec: AdminCatalog.gamesSpec) } label: { Label("Mini-Jeux & Casino", systemImage: "dice.fill") }
                    NavigationLink { OwnerShieldView() } label: { Label("Owner Shield", systemImage: "shield.lefthalf.filled.badge.checkmark") }
                    NavigationLink { MusicPlayerView(guild: currentGuild) } label: { Label("Musique & Vocal", systemImage: "music.note.list") }
                    NavigationLink { PublicLeaderboardView(guildId: currentGuild.id) } label: { Label("Classement public", systemImage: "trophy.fill") }
                    NavigationLink { DiscordModuleHubView(guild: currentGuild) } label: { Label("Tous les modules", systemImage: "square.grid.2x2.fill") }
                    NavigationLink { AuditLogAdminView(guild: currentGuild) } label: { Label("Journal d'audit", systemImage: "list.bullet.rectangle.fill") }
                } header: { Text("Outils").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }
            Section {
                ForEach(filtered) { module in
                    Toggle(isOn: Binding(
                        get: { module.enabled },
                        set: { value in toggle(module, value) }
                    )) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(module.name)
                            if let description = module.description, !description.isEmpty {
                                Text(description).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            } header: {
                Text("Modules · \(modules.filter(\.enabled).count) actif(s)").sectionTitle()
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && modules.isEmpty { ProgressView() } }
        .searchable(text: $search, prompt: "Rechercher un module")
        .navigationTitle(currentGuild.name)
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if model.discord.guilds.filter(\.botPresent).count > 1 {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach(model.discord.guilds.filter(\.botPresent)) { g in
                            Button {
                                if currentGuild.id != g.id {
                                    currentGuild = g
                                    Task { await load() }
                                }
                            } label: {
                                HStack {
                                    Text(g.name)
                                    if g.id == currentGuild.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            AvatarView(url: currentGuild.iconURL, name: currentGuild.name, size: 22)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption2)
                        }
                    }
                }
            }
        }
        .refreshable { await load() }
        .task { await load() }
    }


    private func load() async {
        loading = true
        defer { loading = false }
        do {
            async let o = model.discord.overview(guildId: currentGuild.id)
            async let m = model.discord.modules(guildId: currentGuild.id)
            let (loadedOverview, loadedModules) = try await (o, m)
            overview = loadedOverview
            modules = loadedModules
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func toggle(_ module: DiscordModule, _ enabled: Bool) {
        guard let index = modules.firstIndex(where: { $0.id == module.id }) else { return }
        modules[index].enabled = enabled
        Task {
            do {
                try await model.discord.setModule(guildId: currentGuild.id, moduleId: module.id, enabled: enabled)
                errorMessage = nil
            } catch {
                if let current = modules.firstIndex(where: { $0.id == module.id }) { modules[current].enabled = !enabled }
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
