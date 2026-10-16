import SwiftUI
import UserNotifications

private struct MoreItem: Identifiable {
    let destination: MoreDestination
    let title: String
    let icon: String
    var id: MoreDestination { destination }
}

private struct MoreGroup: Identifiable {
    let title: String
    let color: Color
    let items: [MoreItem]
    var id: String { title }
}

private let moreGroups: [MoreGroup] = [
    MoreGroup(title: "Au quotidien", color: Color(hex: 0xE5484D), items: [
        MoreItem(destination: .brain, title: "Brain", icon: "sparkles"),
        MoreItem(destination: .mail, title: "Mail", icon: "envelope.fill"),
        MoreItem(destination: .calendar, title: "Calendrier", icon: "calendar"),
        MoreItem(destination: .habits, title: "Habitudes", icon: "flame.fill"),
        MoreItem(destination: .files, title: "Fichiers", icon: "folder.fill"),
        MoreItem(destination: .scratchpad, title: "Scratchpad", icon: "square.and.pencil"),
        MoreItem(destination: .clip, title: "Clip", icon: "paperclip"),
        MoreItem(destination: .weather, title: "Météo", icon: "cloud.sun.fill"),
        MoreItem(destination: .soundscape, title: "Soundscape", icon: "waveform"),
        MoreItem(destination: .rss, title: "RSS", icon: "dot.radiowaves.up.forward"),
    ]),
    MoreGroup(title: "Automatisation", color: Color(hex: 0xF5A524), items: [
        MoreItem(destination: .flows, title: "Flows", icon: "bolt.fill"),
        MoreItem(destination: .macros, title: "Macros", icon: "wand.and.stars"),
        MoreItem(destination: .personas, title: "Personas", icon: "person.crop.circle.badge.checkmark"),
        MoreItem(destination: .connections, title: "Connexions", icon: "link"),
        MoreItem(destination: .plugins, title: "Plugins & Extensions", icon: "puzzlepiece.extension.fill"),
    ]),
    MoreGroup(title: "Partage", color: Color(hex: 0x3E8BFF), items: [
        MoreItem(destination: .spaces, title: "Espaces partagés", icon: "person.2.fill"),
        MoreItem(destination: .team, title: "Équipe", icon: "person.3.fill"),
        MoreItem(destination: .sharedLinks, title: "Liens partagés", icon: "link.badge.plus"),
    ]),
    MoreGroup(title: "Discord", color: Color(hex: 0x5865F2), items: [
        MoreItem(destination: .discord, title: "Bot Discord", icon: "bubble.left.and.bubble.right.fill"),
        MoreItem(destination: .ownerShield, title: "Owner Shield", icon: "shield.lefthalf.filled.badge.checkmark"),
        MoreItem(destination: .leaderboard, title: "Classement public", icon: "trophy.fill"),
    ]),
    MoreGroup(title: "Jeux", color: Color(hex: 0x2FB57C), items: [
        MoreItem(destination: .valorant, title: "Valorant", icon: "scope"),
        MoreItem(destination: .valorantStore, title: "Boutique Valorant", icon: "bag.fill"),
        MoreItem(destination: .lolTracker, title: "League of Legends", icon: "shield.fill"),
        MoreItem(destination: .lolRotation, title: "Rotation LoL", icon: "arrow.triangle.2.circlepath"),
        MoreItem(destination: .tftTracker, title: "Teamfight Tactics", icon: "hexagon.fill"),
        MoreItem(destination: .otherGames, title: "Autres jeux", icon: "gamecontroller"),
        MoreItem(destination: .games, title: "Mini-jeux", icon: "gamecontroller.fill"),
    ]),
    MoreGroup(title: "Suivi", color: Color(hex: 0x8E6CF0), items: [
        MoreItem(destination: .analytics, title: "Analytique", icon: "chart.bar.xaxis"),
        MoreItem(destination: .activity, title: "Activité", icon: "waveform.path.ecg"),
        MoreItem(destination: .interactions, title: "Interactions", icon: "square.grid.3x3.fill"),
        MoreItem(destination: .bills, title: "Factures", icon: "eurosign"),
    ]),
    MoreGroup(title: "Appareil", color: Color(hex: 0x7A7F8C), items: [
        MoreItem(destination: .boost, title: "Performance", icon: "gauge.with.needle.fill"),
        MoreItem(destination: .browser, title: "Navigateur", icon: "safari.fill"),
        MoreItem(destination: .system, title: "Système", icon: "cpu"),
        MoreItem(destination: .admin, title: "Administration", icon: "lock.shield"),
    ]),
]

private let accountColor = Color(hex: 0x7A7F8C)

private struct MoreRow: View {
    let title: String
    let icon: String
    let color: Color
    var value: String? = nil

    var body: some View {
        HStack(spacing: 14) {
            IconTile(systemImage: icon, color: color)
            Text(title)
            if let value {
                Spacer(minLength: 8)
                Text(value).foregroundStyle(.secondary)
            }
        }
    }
}

struct MoreView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var confirmSignOut = false
    @State private var query = ""

    private var rowBackground: some View { Rectangle().fill(.thinMaterial) }

    private var filteredGroups: [MoreGroup] {
        let needle = query.trimmingCharacters(in: .whitespaces)
        guard !needle.isEmpty else { return moreGroups }
        return moreGroups.compactMap { group in
            let items = group.items.filter { $0.title.localizedStandardContains(needle) || group.title.localizedStandardContains(needle) }
            return items.isEmpty ? nil : MoreGroup(title: group.title, color: group.color, items: items)
        }
    }

    private var notificationsAllowed: Bool {
        [.authorized, .provisional, .ephemeral].contains(notificationStatus)
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.morePath) {
            List {
                if query.isEmpty {
                    Section {
                        NavigationLink(value: MoreDestination.profile) {
                            HStack(spacing: 14) {
                                AvatarView(urlString: model.ethoneAvatar ?? auth.user?.avatarURL?.absoluteString, name: model.ethoneName ?? auth.user?.displayName ?? "E", size: 58, status: .online)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(model.ethoneName ?? auth.user?.displayName ?? "Mon compte")
                                        .font(.title3.weight(.semibold))
                                        .lineLimit(1)
                                    Text(auth.user?.email ?? "Profil, avatar et statut")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                }
                            }
                            .padding(.vertical, 6)
                        }
                        .accessibilityHint("Ouvre ton profil")
                        .listRowBackground(rowBackground)
                    }
                }

                ForEach(filteredGroups) { group in
                    Section(group.title) {
                        ForEach(group.items) { item in
                            NavigationLink(value: item.destination) {
                                MoreRow(title: item.title, icon: item.icon, color: group.color)
                            }
                            .listRowBackground(rowBackground)
                        }
                    }
                }

                if query.isEmpty {
                    Section {
                        NavigationLink(value: MoreDestination.settings) {
                            MoreRow(title: "Apparence", icon: "paintpalette.fill", color: accountColor)
                        }
                        .listRowBackground(rowBackground)
                        NavigationLink(value: MoreDestination.notifications) {
                            MoreRow(title: "Notifications", icon: "bell.badge.fill", color: accountColor, value: notificationsAllowed ? nil : "Désactivées")
                        }
                        .listRowBackground(rowBackground)
                        NavigationLink(value: MoreDestination.workspaces) {
                            MoreRow(title: "Profils de travail", icon: "rectangle.stack.person.crop", color: accountColor)
                        }
                        .listRowBackground(rowBackground)
                        NavigationLink(value: MoreDestination.security) {
                            MoreRow(title: "Appareils et sécurité", icon: "lock.shield.fill", color: accountColor)
                        }
                        .listRowBackground(rowBackground)
                        Toggle(isOn: Binding(
                            get: { model.lock.isEnabled },
                            set: { value in Task { await model.lock.setEnabled(value) } }
                        )) {
                            MoreRow(title: "Verrouiller avec \(model.lock.biometryLabel)", icon: "faceid", color: accountColor)
                        }
                        .listRowBackground(rowBackground)
                        if !notificationsAllowed {
                            Button(notificationStatus == .denied ? "Autoriser les notifications dans Réglages" : "Autoriser les notifications") {
                                if notificationStatus == .denied {
                                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                                } else {
                                    Task {
                                        await NotificationManager.requestAuthorization()
                                        await refreshStatus()
                                    }
                                }
                            }
                            .listRowBackground(rowBackground)
                        }
                    } header: {
                        Text("Compte")
                    } footer: {
                        if !notificationsAllowed {
                            Text("Les notifications servent aux rappels de tâches, d'habitudes et d'événements, et à la fin des sessions de concentration.")
                        }
                    }

                    Section {
                        Button(role: .destructive) { confirmSignOut = true } label: {
                            Text("Se déconnecter").frame(maxWidth: .infinity)
                        }
                        .listRowBackground(rowBackground)
                    }

                    Section {
                        NavigationLink(value: MoreDestination.changelog) {
                            LabeledContent("Nouveautés de la version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—")
                        }
                        .listRowBackground(rowBackground)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .overlay {
                if !query.isEmpty && filteredGroups.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .searchable(text: $query, prompt: "Rechercher une section")
            .navigationTitle("Plus")
            .ethoneScreen()
            .navigationDestination(for: MoreDestination.self) { destination in
                switch destination {
                case .settings: AppearanceView()
                case .team: TeamView()
                case .bills: BillsView()
                case .valorant: ValorantView()
                case .valorantStore: ValorantStoreView()
                case .lolTracker: LolTrackerView()
                case .tftTracker: TftTrackerView()
                case .otherGames: OtherGamesTrackerView()
                case .profile: ProfileView()
                case .workspaces: WorkspacesView()
                case .leaderboard: PublicLeaderboardView()
                case .boost: BoostView()
                case .browser: BrowserView()
                case .system: SystemView()
                case .sharedLinks: SharedLinksView()
                case .admin: AdminView()
                case .lolRotation: LolRotationView()
                case .games: GamesView()
                case .interactions: InteractionsView()
                case .brain: BrainView()
                case .mail: MailView()
                case .discord: DiscordView()
                case .spaces: SpacesView()
                case .flows: FlowsView()
                case .files: FilesView()
                case .analytics: AnalyticsView()
                case .activity: ActivityView()
                case .connections: ConnectionsView()
                case .habits: HabitsView()
                case .calendar: CalendarView()
                case .notifications: NotificationSettingsView()
                case .scratchpad: ScratchpadView()
                case .macros: MacrosView()
                case .personas: PersonasView()
                case .rss: RSSView()
                case .weather: WeatherView()
                case .security: SecurityView()
                case .soundscape: SoundscapeView()
                case .plugins: PluginsView()
                case .clip: ClipView()
                case .changelog: ChangelogView()
                case .ownerShield: OwnerShieldView()
                }
            }
            .task { await refreshStatus() }
            .confirmationDialog("Se déconnecter d'ETHONE ?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Se déconnecter", role: .destructive) { Task { await auth.signOut() } }
            }
        }
    }

    private func refreshStatus() async {
        notificationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }
}
