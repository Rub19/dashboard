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
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 44))
                .foregroundStyle(Color(hex: 0x5865F2))
                .padding(24)
                .glassEffect(Glass.regular.tint(Color(hex: 0x5865F2).opacity(0.3)), in: .circle)
            Text("Pilotez le bot ETHONE").font(.title3.bold())
            Text("Connectez votre compte Discord pour gérer les modules de vos serveurs.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            if let message = discord.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).multilineTextAlignment(.center)
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
            .disabled(discord.isLoading)
        }
        .padding(24)
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
    let guild: DiscordGuild

    @State private var overview: GuildOverview?
    @State private var modules: [DiscordModule] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var search = ""

    private var filtered: [DiscordModule] {
        search.isEmpty ? modules : modules.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        List {
            if let overview {
                Section {
                    GlassEffectContainer(spacing: 12) {
                        HStack(spacing: 12) {
                            tile("\(overview.guild.memberCount)", "Membres", "person.2.fill")
                            tile("\(Int(overview.botStatus.pingMs)) ms", "Latence", "bolt.fill")
                            tile("\(overview.stats.commandsToday ?? 0)", "Commandes / jour", "terminal.fill")
                        }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
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
        .navigationTitle(guild.name)
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func tile(_ value: String, _ label: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).foregroundStyle(Theme.accentSoft)
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 18))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            async let o = model.discord.overview(guildId: guild.id)
            async let m = model.discord.modules(guildId: guild.id)
            let (loadedOverview, loadedModules) = try await (o, m)
            overview = loadedOverview
            modules = loadedModules
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    /// Bascule optimiste ; l'interrupteur revient à l'état réel si le bot refuse.
    private func toggle(_ module: DiscordModule, _ enabled: Bool) {
        guard let index = modules.firstIndex(where: { $0.id == module.id }) else { return }
        modules[index].enabled = enabled
        Task {
            do {
                try await model.discord.setModule(guildId: guild.id, moduleId: module.id, enabled: enabled)
                errorMessage = nil
            } catch {
                if let current = modules.firstIndex(where: { $0.id == module.id }) { modules[current].enabled = !enabled }
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
