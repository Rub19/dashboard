import SwiftUI

struct DiscordView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL

    static func inviteURL(for guild: DiscordGuild) -> URL {
        URL(string: "https://discord.com/oauth2/authorize?client_id=1545139931154878464&permissions=1436565368055&scope=bot%20applications.commands&guild_id=\(guild.id)&disable_guild_select=true")!
    }

    private func guildRow(_ guild: DiscordGuild) -> some View {
        HStack(spacing: 12) {
            AvatarView(url: guild.iconURL, name: guild.name, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(guild.name).font(.headline).lineLimit(1)
                Text(guild.botPresent ? plural(guild.memberCount ?? 0, "membre", "membres") : "Bot absent").font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
        }
    }

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
                    if guild.botPresent {
                        NavigationLink(value: guild) { guildRow(guild) }
                            .listRowBackground(GlassRowBackground())
                    } else {
                        Button { openURL(Self.inviteURL(for: guild)) } label: {
                            HStack {
                                guildRow(guild)
                                Label("Inviter", systemImage: "plus")
                                    .font(.footnote.weight(.semibold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .background(Color(hex: 0x5865F2), in: .capsule)
                                    .foregroundStyle(.white)
                            }
                        }
                        .tint(.primary)
                        .listRowBackground(GlassRowBackground())
                    }
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

    private func toolLink<Destination: View>(_ title: String, _ symbol: String, @ViewBuilder destination: @escaping () -> Destination) -> some View {
        NavigationLink(destination: destination) {
            HStack(spacing: 14) {
                IconTile(systemImage: symbol, color: Color(hex: 0x5865F2))
                Text(title)
            }
        }
        .listRowBackground(GlassRowBackground())
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
                    toolLink("Modération", "shield.lefthalf.filled") { ModerationAdminView(guild: currentGuild) }
                    toolLink("Sécurité", "lock.shield.fill") { SecurityAdminView(guild: currentGuild) }
                    toolLink("Membres", "person.2.fill") { MembersAdminView(guild: currentGuild) }
                    toolLink("Journal d'audit", "list.bullet.rectangle.fill") { AuditLogAdminView(guild: currentGuild) }
                } header: { Text("Modération").sectionTitle() }
                Section {
                    toolLink("Tickets", "ticket.fill") { TicketsAdminView(guild: currentGuild) }
                    toolLink("Suggestions", "lightbulb.fill") { SuggestionsAdminView(guild: currentGuild) }
                    toolLink("Alertes streamers", "antenna.radiowaves.left.and.right") { ModuleScreen(guild: currentGuild, spec: AdminCatalog.streamersSpec) }
                    toolLink("Classement public", "trophy.fill") { PublicLeaderboardView(guildId: currentGuild.id) }
                } header: { Text("Communauté").sectionTitle() }
                Section {
                    toolLink("Musique et vocal", "music.note.list") { MusicPlayerView(guild: currentGuild) }
                    toolLink("Giveaways", "gift.fill") { GiveawaysAdminView(guild: currentGuild) }
                    toolLink("Jeux et casino", "dice.fill") { ModuleScreen(guild: currentGuild, spec: AdminCatalog.gamesSpec) }
                } header: { Text("Divertissement").sectionTitle() }
                Section {
                    toolLink("Tous les modules", "square.grid.2x2.fill") { DiscordModuleHubView(guild: currentGuild) }
                    toolLink("Owner Shield", "shield.lefthalf.filled.badge.checkmark") { OwnerShieldView() }
                } header: { Text("Avancé").sectionTitle() }
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
                HStack(spacing: 6) {
                    Text("Modules")
                    Text(plural(modules.filter(\.enabled).count, "actif", "actifs")).foregroundStyle(.tertiary).monospacedDigit().contentTransition(.numericText())
                }
                .sectionTitle()
                .textCase(nil)
            }
        }
        .scrollContentBackground(.hidden)
        .sensoryFeedback(.selection, trigger: modules.filter(\.enabled).count)
        .animation(Motion.snap, value: modules.filter(\.enabled).count)
        .overlay { if loading && modules.isEmpty { ProgressView() } }
        .searchable(text: $search, prompt: "Rechercher un module")
        .navigationTitle(currentGuild.name)
        .ethoneScreen()
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
