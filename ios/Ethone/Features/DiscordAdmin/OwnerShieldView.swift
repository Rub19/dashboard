import SwiftUI

struct OwnerShieldConfigModel: Codable {
    var enabled: Bool = true
    var autoUnban: Bool = true
    var autoTimeoutRemove: Bool = true
    var autoMuteRolesRemove: Bool = true
    var autoVoiceUnmute: Bool = true
    var autoVoiceUndeafen: Bool = true
    var autoKickInvite: Bool = true
    var autoRestoreRoles: Bool = true
    var antiNicknameChange: Bool = true
    var antiVoiceMove: Bool = true
    var botSelfDefense: Bool = true
    var stealthMode: Bool = false
    var dmAlerts: Bool = true
    var ignoredGuildIds: [String] = []
}

struct ShieldInterceptionModel: Identifiable, Codable {
    let id: String
    let timestamp: String
    let guildId: String
    let guildName: String
    let type: String
    let details: String
    let success: Bool
    let moderatorTag: String?
    let moderatorId: String?
    let reason: String?
}

struct OwnerGuildStatusModel: Identifiable, Codable {
    var id: String { guildId }
    let guildId: String
    let guildName: String
    let guildIcon: String?
    var isIgnored: Bool
    let botHierarchyLevel: String
    let ownerStatus: OwnerMemberStatusModel?
}

struct OwnerMemberStatusModel: Codable {
    let isPresent: Bool
    let isBanned: Bool
    let isTimedOut: Bool
    let timeoutUntil: String?
    let isVoiceMuted: Bool
    let isVoiceDeafened: Bool
    let hasMuteRole: Bool
    let muteRoleNames: [String]
    let nickname: String?
}

struct OwnerShieldStatusResponse: Codable {
    let success: Bool
    let data: OwnerShieldData
}

struct OwnerShieldData: Codable {
    let autoDefenseEnabled: Bool
    let config: OwnerShieldConfigModel
    let history: [ShieldInterceptionModel]
    let guilds: [OwnerGuildStatusModel]
    let totalGuilds: Int?
    let ownerId: String?
}

@MainActor
@Observable
final class OwnerShieldStore {
    var autoDefenseEnabled = true
    var config = OwnerShieldConfigModel()
    var history: [ShieldInterceptionModel] = []
    var guilds: [OwnerGuildStatusModel] = []
    var isLoading = false
    var isOperating = false
    var errorMessage: String?
    var statusMessage: String?

    func fetch(store: DiscordStore) async {
        isLoading = true
        errorMessage = nil
        do {
            let json: JSONValue = try await store.call("api/bot/owner-shield/status")
            if case .object(let root) = json,
               case .object(let data) = root["data"] {
                if let auto = data["autoDefenseEnabled"]?.boolValue {
                    self.autoDefenseEnabled = auto
                }
                if let rawConfig = data["config"],
                   let configData = try? JSONEncoder().encode(rawConfig),
                   let decoded = try? JSONDecoder().decode(OwnerShieldConfigModel.self, from: configData) {
                    self.config = decoded
                }
                if let rawHistory = data["history"],
                   let historyData = try? JSONEncoder().encode(rawHistory),
                   let decoded = try? JSONDecoder().decode([ShieldInterceptionModel].self, from: historyData) {
                    self.history = decoded
                }
                if let rawGuilds = data["guilds"],
                   let guildsData = try? JSONEncoder().encode(rawGuilds),
                   let decoded = try? JSONDecoder().decode([OwnerGuildStatusModel].self, from: guildsData) {
                    self.guilds = decoded
                }
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isLoading = false
    }

    func toggleAutoDefense(store: DiscordStore, enabled: Bool) async {
        isOperating = true
        do {
            let _: JSONValue = try await store.call(
                "api/bot/owner-shield/toggle",
                method: "POST",
                body: ["enabled": .bool(enabled)]
            )
            self.autoDefenseEnabled = enabled
            self.config.enabled = enabled
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isOperating = false
    }

    func enableAll(store: DiscordStore) async {
        isOperating = true
        do {
            let _: JSONValue = try await store.call("api/bot/owner-shield/enable-all", method: "POST")
            self.autoDefenseEnabled = true
            self.config.enabled = true
            await fetch(store: store)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isOperating = false
    }

    func disableAll(store: DiscordStore) async {
        isOperating = true
        do {
            let _: JSONValue = try await store.call("api/bot/owner-shield/disable-all", method: "POST")
            self.autoDefenseEnabled = false
            self.config.enabled = false
            await fetch(store: store)
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isOperating = false
    }

    func rescueGlobal(store: DiscordStore) async {
        isOperating = true
        do {
            let res: JSONValue = try await store.call(
                "api/bot/owner-shield/rescue",
                method: "POST",
                body: ["guildId": .string("all")]
            )
            if let msg = res["message"]?.stringValue {
                statusMessage = msg
            }
            await fetch(store: store)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isOperating = false
    }

    func rescueGuild(store: DiscordStore, guildId: String) async {
        isOperating = true
        do {
            let res: JSONValue = try await store.call(
                "api/bot/owner-shield/rescue",
                method: "POST",
                body: ["guildId": .string(guildId)]
            )
            if let msg = res["message"]?.stringValue {
                statusMessage = msg
            }
            await fetch(store: store)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
        isOperating = false
    }

    func toggleGuild(store: DiscordStore, guildId: String) async {
        do {
            let _: JSONValue = try await store.call(
                "api/bot/owner-shield/guilds/\(guildId)/toggle",
                method: "POST"
            )
            if let idx = guilds.firstIndex(where: { $0.guildId == guildId }) {
                guilds[idx].isIgnored.toggle()
            }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    func updateConfigField(store: DiscordStore, key: String, value: Bool) async {
        var dict: [String: JSONValue] = [:]
        dict[key] = .bool(value)
        do {
            let _: JSONValue = try await store.call(
                "api/bot/owner-shield/config",
                method: "POST",
                body: dict
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct OwnerShieldView: View {
    @Environment(AppModel.self) private var model
    @State private var store = OwnerShieldStore()
    @State private var search = ""
    @State private var selectedTab = 0
    @State private var showRules = false

    private var discord: DiscordStore { model.discord }

    private var filteredGuilds: [OwnerGuildStatusModel] {
        if search.isEmpty { return store.guilds }
        return store.guilds.filter { $0.guildName.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                heroCard

                actionButtonsBar

                metricsGrid

                rulesSection

                pickerTabs

                if selectedTab == 0 {
                    guildsSection
                } else {
                    historySection
                }
            }
            .padding()
        }
        .scrollContentBackground(.hidden)
        .searchable(text: $search, prompt: "Filtrer les serveurs...")
        .navigationTitle("Owner Shield")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .task {
            await store.fetch(store: discord)
        }
        .refreshable {
            await store.fetch(store: discord)
        }
        .alert(
            "Opération terminée",
            isPresented: Binding(
                get: { store.statusMessage != nil },
                set: { if !$0 { store.statusMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) { store.statusMessage = nil }
        } message: {
            Text(store.statusMessage ?? "")
        }
    }

    private var heroCard: some View {
        GlassCard {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(store.autoDefenseEnabled ? Theme.success.opacity(0.18) : Theme.danger.opacity(0.18))
                        .frame(width: 54, height: 54)
                    Image(systemName: store.autoDefenseEnabled ? "shield.fill" : "shield.slash.fill")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(store.autoDefenseEnabled ? Theme.success : Theme.danger)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("Bouclier Suprême")
                            .font(.headline)
                        GlassPill(
                            text: store.autoDefenseEnabled ? "ACTIF" : "DÉSACTIVÉ",
                            tint: store.autoDefenseEnabled ? Theme.success : Theme.danger
                        )
                    }
                    Text(
                        store.autoDefenseEnabled
                            ? "Défense temps réel opérationnelle contre toute sanction."
                            : "Protection en veille. Le propriétaire n'est pas protégé."
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                Toggle(
                    "",
                    isOn: Binding(
                        get: { store.autoDefenseEnabled },
                        set: { value in
                            Task {
                                await store.toggleAutoDefense(store: discord, enabled: value)
                            }
                        }
                    )
                )
                .labelsHidden()
                .disabled(store.isOperating)
            }
            .padding(14)
        }
    }

    private var actionButtonsBar: some View {
        HStack(spacing: 8) {
            Button {
                Task { await store.rescueGlobal(store: discord) }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "lifepreserver.fill")
                    Text("Secours Global")
                }
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Color.orange.opacity(0.18)))
                .foregroundStyle(Color.orange)
            }
            .buttonStyle(.plain)
            .disabled(store.isOperating)

            Button {
                Task { await store.enableAll(store: discord) }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "bolt.shield.fill")
                    Text("Tout Activer")
                }
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Theme.success.opacity(0.18)))
                .foregroundStyle(Theme.success)
            }
            .buttonStyle(.plain)
            .disabled(store.isOperating)

            Button {
                Task { await store.disableAll(store: discord) }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "xmark.shield.fill")
                    Text("Tout Couper")
                }
                .font(.footnote.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(Capsule().fill(Theme.danger.opacity(0.18)))
                .foregroundStyle(Theme.danger)
            }
            .buttonStyle(.plain)
            .disabled(store.isOperating)
        }
    }

    private var metricsGrid: some View {
        HStack(spacing: 12) {
            metricCard(
                title: "Serveurs",
                value: "\(store.guilds.filter { !$0.isIgnored }.count)/\(store.guilds.count)",
                symbol: "server.rack",
                tint: Theme.accent
            )
            metricCard(
                title: "Interceptions",
                value: "\(store.history.count)",
                symbol: "hand.raised.fill",
                tint: Color.cyan
            )
            metricCard(
                title: "Hiérarchie",
                value: supremeCountText,
                symbol: "crown.fill",
                tint: Color.yellow
            )
        }
    }

    private var supremeCountText: String {
        let count = store.guilds.filter { $0.botHierarchyLevel == "SUPREME" }.count
        return "\(count) Suprêmes"
    }

    private func metricCard(title: String, value: String, symbol: String, tint: Color) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: symbol)
                        .font(.caption)
                        .foregroundStyle(tint)
                    Spacer()
                }
                Text(value)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.primary)
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(10)
        }
    }

    private var rulesSection: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Button {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        showRules.toggle()
                    }
                } label: {
                    HStack {
                        Label("Règles de défense automatique", systemImage: "checklist")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Spacer()
                        Image(systemName: showRules ? "chevron.up" : "chevron.down")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)

                if showRules {
                    Divider()
                        .background(Color.white.opacity(0.12))

                    ruleToggle("Débannissement instantané", isOn: store.config.autoUnban) { val in
                        store.config.autoUnban = val
                        Task { await store.updateConfigField(store: discord, key: "autoUnban", value: val) }
                    }
                    ruleToggle("Annulation exclusion (timeout)", isOn: store.config.autoTimeoutRemove) { val in
                        store.config.autoTimeoutRemove = val
                        Task { await store.updateConfigField(store: discord, key: "autoTimeoutRemove", value: val) }
                    }
                    ruleToggle("Suppression rôle mute", isOn: store.config.autoMuteRolesRemove) { val in
                        store.config.autoMuteRolesRemove = val
                        Task { await store.updateConfigField(store: discord, key: "autoMuteRolesRemove", value: val) }
                    }
                    ruleToggle("Rétablissement vocal", isOn: store.config.autoVoiceUnmute) { val in
                        store.config.autoVoiceUnmute = val
                        Task { await store.updateConfigField(store: discord, key: "autoVoiceUnmute", value: val) }
                    }
                    ruleToggle("Invitation de secours si expulsion", isOn: store.config.autoKickInvite) { val in
                        store.config.autoKickInvite = val
                        Task { await store.updateConfigField(store: discord, key: "autoKickInvite", value: val) }
                    }
                    ruleToggle("Restauration des rôles", isOn: store.config.autoRestoreRoles) { val in
                        store.config.autoRestoreRoles = val
                        Task { await store.updateConfigField(store: discord, key: "autoRestoreRoles", value: val) }
                    }
                    ruleToggle("Protection du pseudo", isOn: store.config.antiNicknameChange) { val in
                        store.config.antiNicknameChange = val
                        Task { await store.updateConfigField(store: discord, key: "antiNicknameChange", value: val) }
                    }
                    ruleToggle("Auto-défense du bot", isOn: store.config.botSelfDefense) { val in
                        store.config.botSelfDefense = val
                        Task { await store.updateConfigField(store: discord, key: "botSelfDefense", value: val) }
                    }
                    ruleToggle("Alertes directes en DM", isOn: store.config.dmAlerts) { val in
                        store.config.dmAlerts = val
                        Task { await store.updateConfigField(store: discord, key: "dmAlerts", value: val) }
                    }
                    ruleToggle("Mode furtif (silencieux)", isOn: store.config.stealthMode) { val in
                        store.config.stealthMode = val
                        Task { await store.updateConfigField(store: discord, key: "stealthMode", value: val) }
                    }
                }
            }
            .padding(14)
        }
    }

    private func ruleToggle(_ title: String, isOn: Bool, onChange: @escaping (Bool) -> Void) -> some View {
        Toggle(isOn: Binding(
            get: { isOn },
            set: { onChange($0) }
        )) {
            Text(title)
                .font(.subheadline)
        }
        .padding(.vertical, 2)
    }

    private var pickerTabs: some View {
        HStack(spacing: 8) {
            Button {
                withAnimation { selectedTab = 0 }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "server.rack")
                    Text("Serveurs (\(filteredGuilds.count))")
                }
                .font(.subheadline.weight(selectedTab == 0 ? .semibold : .regular))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Capsule().fill(selectedTab == 0 ? Theme.accent : Color.primary.opacity(0.08)))
                .foregroundStyle(selectedTab == 0 ? .white : .primary)
            }
            .buttonStyle(.plain)

            Button {
                withAnimation { selectedTab = 1 }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "clock.arrow.circlepath")
                    Text("Historique (\(store.history.count))")
                }
                .font(.subheadline.weight(selectedTab == 1 ? .semibold : .regular))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Capsule().fill(selectedTab == 1 ? Theme.accent : Color.primary.opacity(0.08)))
                .foregroundStyle(selectedTab == 1 ? .white : .primary)
            }
            .buttonStyle(.plain)

            Spacer()
        }
    }

    private var guildsSection: some View {
        VStack(spacing: 10) {
            ForEach(filteredGuilds) { guild in
                GlassCard {
                    HStack(spacing: 12) {
                        AvatarView(url: guild.guildIcon, name: guild.guildName, size: 40)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(guild.guildName)
                                .font(.headline)
                                .lineLimit(1)

                            HStack(spacing: 6) {
                                GlassPill(
                                    text: guild.botHierarchyLevel,
                                    tint: hierarchyColor(guild.botHierarchyLevel)
                                )

                                if guild.isIgnored {
                                    GlassPill(text: "Exclu", tint: Theme.warning)
                                } else {
                                    GlassPill(text: "Protégé", tint: Theme.success)
                                }

                                if let owner = guild.ownerStatus, owner.isBanned {
                                    GlassPill(text: "BANNI", tint: Theme.danger)
                                }
                            }
                        }

                        Spacer()

                        Menu {
                            Button {
                                Task { await store.rescueGuild(store: discord, guildId: guild.guildId) }
                            } label: {
                                Label("Secourir ce serveur", systemImage: "lifepreserver.fill")
                            }

                            Button {
                                Task { await store.toggleGuild(store: discord, guildId: guild.guildId) }
                            } label: {
                                Label(
                                    guild.isIgnored ? "Réactiver protection" : "Désactiver protection",
                                    systemImage: guild.isIgnored ? "shield.fill" : "shield.slash"
                                )
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                                .font(.system(size: 20))
                                .foregroundStyle(.secondary)
                                .padding(4)
                        }
                    }
                    .padding(12)
                }
            }
        }
    }

    private var historySection: some View {
        VStack(spacing: 10) {
            if store.history.isEmpty {
                GlassCard {
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.shield")
                                .font(.system(size: 32))
                                .foregroundStyle(Theme.success)
                            Text("Aucun incident détecté")
                                .font(.headline)
                            Text("Le bouclier n'a intercepté aucune sanction pour le moment.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(20)
                        Spacer()
                    }
                }
            } else {
                ForEach(store.history) { inc in
                    GlassCard {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                GlassPill(text: inc.type, tint: Theme.accent)
                                Spacer()
                                Text(inc.timestamp)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Text(inc.guildName)
                                .font(.subheadline.weight(.semibold))
                            Text(inc.details)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            if let mod = inc.moderatorTag {
                                Text("Auteur : \(mod)")
                                    .font(.caption2)
                                    .foregroundStyle(Theme.warning)
                            }
                        }
                        .padding(12)
                    }
                }
            }
        }
    }

    private func hierarchyColor(_ level: String) -> Color {
        switch level {
        case "SUPREME": return Theme.success
        case "SUFFICIENT": return Theme.accent
        default: return Theme.danger
        }
    }
}
