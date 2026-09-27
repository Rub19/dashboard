import SwiftUI
import UserNotifications

struct MoreView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var confirmSignOut = false

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.morePath) {
            List {
                Section {
                    NavigationLink(value: MoreDestination.brain) { Label("Brain", systemImage: "sparkles") }
                    NavigationLink(value: MoreDestination.mail) { Label("Mail", systemImage: "envelope.fill") }
                    NavigationLink(value: MoreDestination.discord) { Label("Bot Discord", systemImage: "bubble.left.and.bubble.right.fill") }
                    NavigationLink(value: MoreDestination.files) { Label("Fichiers", systemImage: "folder.fill") }
                    NavigationLink(value: MoreDestination.spaces) { Label("Espaces partagés", systemImage: "person.2.fill") }
                    NavigationLink(value: MoreDestination.team) { Label("Équipe", systemImage: "person.3.fill") }
                    NavigationLink(value: MoreDestination.flows) { Label("Flows", systemImage: "bolt.fill") }
                    NavigationLink(value: MoreDestination.connections) { Label("Connexions", systemImage: "link") }
                    NavigationLink(value: MoreDestination.interactions) { Label("Interactions", systemImage: "square.grid.3x3.fill") }
                    NavigationLink(value: MoreDestination.bills) { Label("Factures", systemImage: "eurosign.circle.fill") }
                    NavigationLink(value: MoreDestination.valorant) { Label("Valorant", systemImage: "scope") }
                    NavigationLink(value: MoreDestination.valorantStore) { Label("Boutique Valorant", systemImage: "bag.fill") }
                    NavigationLink(value: MoreDestination.lolTracker) { Label("League of Legends", systemImage: "shield.fill") }
                    NavigationLink(value: MoreDestination.tftTracker) { Label("Teamfight Tactics", systemImage: "square.grid.3x3.fill") }
                    NavigationLink(value: MoreDestination.otherGames) { Label("Autres jeux", systemImage: "gamecontroller") }
                    NavigationLink(value: MoreDestination.lolRotation) { Label("Rotation LoL", systemImage: "shield.lefthalf.filled") }
                    NavigationLink(value: MoreDestination.games) { Label("Jeux", systemImage: "gamecontroller.fill") }
                    NavigationLink(value: MoreDestination.analytics) { Label("Analytique", systemImage: "chart.bar.xaxis") }
                    NavigationLink(value: MoreDestination.activity) { Label("Activité", systemImage: "waveform.path.ecg") }
                    NavigationLink(value: MoreDestination.habits) { Label("Habitudes", systemImage: "flame.fill") }
                    NavigationLink(value: MoreDestination.calendar) { Label("Calendrier", systemImage: "calendar") }
                    NavigationLink(value: MoreDestination.notifications) { Label("Notifications", systemImage: "bell.badge.fill") }
                    NavigationLink(value: MoreDestination.profile) { Label("Profil", systemImage: "person.crop.circle") }
                    NavigationLink(value: MoreDestination.workspaces) { Label("Profils de travail", systemImage: "rectangle.stack.person.crop") }
                    NavigationLink(value: MoreDestination.leaderboard) { Label("Classement public", systemImage: "trophy") }
                    NavigationLink(value: MoreDestination.boost) { Label("Performance", systemImage: "gauge.with.needle.fill") }
                    NavigationLink(value: MoreDestination.browser) { Label("Navigateur", systemImage: "safari.fill") }
                    NavigationLink(value: MoreDestination.system) { Label("Système", systemImage: "cpu") }
                    NavigationLink(value: MoreDestination.sharedLinks) { Label("Liens partagés", systemImage: "link.badge.plus") }
                    NavigationLink(value: MoreDestination.admin) { Label("Administration", systemImage: "lock.shield") }
                    NavigationLink(value: MoreDestination.scratchpad) { Label("Scratchpad", systemImage: "square.and.pencil") }
                    NavigationLink(value: MoreDestination.macros) { Label("Macros", systemImage: "wand.and.stars") }
                    NavigationLink(value: MoreDestination.personas) { Label("Personas", systemImage: "person.crop.circle.badge.checkmark") }
                    NavigationLink(value: MoreDestination.rss) { Label("RSS", systemImage: "dot.radiowaves.up.forward") }
                    NavigationLink(value: MoreDestination.weather) { Label("Météo", systemImage: "cloud.sun.fill") }
                } header: { Text("Applications").sectionTitle() }
                .listRowBackground(GlassRowBackground())

                Section {
                    HStack(spacing: 14) {
                        AvatarView(url: auth.user?.avatarURL, name: auth.user?.displayName ?? "E", size: 56, status: .online)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(auth.user?.displayName ?? "").font(.headline)
                            Text(auth.user?.email ?? "").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(GlassRowBackground())

                    NavigationLink(value: MoreDestination.settings) { Label("Apparence", systemImage: "paintpalette.fill") }
                        .listRowBackground(GlassRowBackground())

                    NavigationLink(value: MoreDestination.security) { Label("Appareils et sécurité", systemImage: "lock.shield.fill") }
                        .listRowBackground(GlassRowBackground())

                    Toggle(isOn: Binding(
                        get: { model.lock.isEnabled },
                        set: { value in Task { await model.lock.setEnabled(value) } }
                    )) {
                        Label("Verrouiller avec \(model.lock.biometryLabel)", systemImage: "faceid")
                    }
                    .listRowBackground(GlassRowBackground())
                } header: { Text("Compte").sectionTitle() }

                Section {
                    HStack {
                        Label("Notifications", systemImage: "bell.badge.fill")
                        Spacer()
                        switch notificationStatus {
                        case .authorized, .provisional, .ephemeral:
                            Text("Activées").foregroundStyle(Theme.success)
                        case .denied:
                            Button("Réglages") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                            }
                        default:
                            Button("Activer") {
                                Task {
                                    await NotificationManager.requestAuthorization()
                                    await refreshStatus()
                                }
                            }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                } header: { Text("Rappels").sectionTitle() } footer: {
                    Text("Rappels de tâches, d'habitudes et d'événements, fin de session de concentration. Les notifications envoyées par le serveur nécessitent une version signée de l'app.")
                }

                Section {
                    Button(role: .destructive) { confirmSignOut = true } label: {
                        Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                    .listRowBackground(GlassRowBackground())
                }

                Section {
                    LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—")
                        .listRowBackground(GlassRowBackground())
                }
            }
            .scrollContentBackground(.hidden)
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
