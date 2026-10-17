import SwiftUI
import UserNotifications

struct MoreItem: Identifiable {
    let destination: MoreDestination
    let title: String
    let icon: String
    /// Brand logo from the asset catalog, used instead of the SF Symbol when set.
    var asset: String? = nil
    var id: MoreDestination { destination }

    var glyph: Image { asset.map { Image($0) } ?? Image(systemName: icon) }
}

struct MoreGroup: Identifiable {
    let title: String
    let color: Color
    let items: [MoreItem]
    var id: String { title }
}

private let accountColor = Color(hex: 0x7A7F8C)

/// Every section of the app, grouped by theme. The first group follows the theme accent.
@MainActor
var moreGroups: [MoreGroup] {
    [
        MoreGroup(title: "Au quotidien", color: Theme.accent, items: [
            MoreItem(destination: .mail, title: "Mail", icon: "envelope.fill"),
            MoreItem(destination: .calendar, title: "Calendrier", icon: "calendar"),
            MoreItem(destination: .tasks, title: "Tâches", icon: "checklist"),
            MoreItem(destination: .notes, title: "Notes", icon: "note.text"),
            MoreItem(destination: .focus, title: "Focus", icon: "timer"),
            MoreItem(destination: .habits, title: "Habitudes", icon: "flame.fill"),
            MoreItem(destination: .brain, title: "Brain", icon: "sparkles"),
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
            MoreItem(destination: .plugins, title: "Plugins", icon: "puzzlepiece.extension.fill"),
        ]),
        MoreGroup(title: "Partage", color: Color(hex: 0x3E8BFF), items: [
            MoreItem(destination: .spaces, title: "Espaces", icon: "person.2.fill"),
            MoreItem(destination: .team, title: "Équipe", icon: "person.3.fill"),
            MoreItem(destination: .sharedLinks, title: "Liens", icon: "link.badge.plus"),
        ]),
        MoreGroup(title: "Discord", color: Color(hex: 0x5865F2), items: [
            MoreItem(destination: .discord, title: "Bot Discord", icon: "bubble.left.and.bubble.right.fill", asset: "BrandDiscord"),
            MoreItem(destination: .ownerShield, title: "Owner Shield", icon: "shield.lefthalf.filled.badge.checkmark"),
            MoreItem(destination: .leaderboard, title: "Classement", icon: "trophy.fill"),
        ]),
        MoreGroup(title: "Jeux", color: Color(hex: 0x2FB57C), items: [
            MoreItem(destination: .valorant, title: "Valorant", icon: "scope", asset: "BrandValorant"),
            MoreItem(destination: .valorantStore, title: "Boutique", icon: "bag.fill", asset: "BrandRiot"),
            MoreItem(destination: .lolTracker, title: "LoL", icon: "shield.fill", asset: "BrandLeague"),
            MoreItem(destination: .lolRotation, title: "Rotation", icon: "arrow.triangle.2.circlepath", asset: "BrandLeague"),
            MoreItem(destination: .tftTracker, title: "TFT", icon: "hexagon.fill", asset: "BrandRiot"),
            MoreItem(destination: .otherGames, title: "Autres jeux", icon: "gamecontroller"),
            MoreItem(destination: .games, title: "Mini-jeux", icon: "gamecontroller.fill"),
        ]),
        MoreGroup(title: "Suivi", color: Color(hex: 0x8E6CF0), items: [
            MoreItem(destination: .analytics, title: "Analytique", icon: "chart.bar.xaxis"),
            MoreItem(destination: .activity, title: "Activité", icon: "waveform.path.ecg"),
            MoreItem(destination: .interactions, title: "Interactions", icon: "square.grid.3x3.fill"),
            MoreItem(destination: .bills, title: "Factures", icon: "eurosign"),
        ]),
        MoreGroup(title: "Réglages", color: accountColor, items: [
            MoreItem(destination: .settings, title: "Apparence", icon: "paintpalette.fill"),
            MoreItem(destination: .tabBar, title: "Onglets", icon: "dock.rectangle"),
            MoreItem(destination: .notifications, title: "Notifications", icon: "bell.badge.fill"),
            MoreItem(destination: .workspaces, title: "Profils", icon: "rectangle.stack.person.crop"),
            MoreItem(destination: .security, title: "Sécurité", icon: "lock.shield.fill"),
            MoreItem(destination: .boost, title: "Performance", icon: "gauge.with.needle.fill"),
            MoreItem(destination: .browser, title: "Navigateur", icon: "safari.fill"),
            MoreItem(destination: .system, title: "Système", icon: "cpu"),
            MoreItem(destination: .admin, title: "Admin", icon: "lock.shield"),
            MoreItem(destination: .changelog, title: "Nouveautés", icon: "sparkles.rectangle.stack"),
        ]),
    ]
}

extension MoreDestination {
    @MainActor
    var item: MoreItem? { moreGroups.flatMap(\.items).first { $0.destination == self } }
    @MainActor
    var color: Color { moreGroups.first { $0.items.contains { $0.destination == self } }?.color ?? accountColor }
}

/// The screen behind each section, shared by the More grid and the pinned tabs.
@MainActor @ViewBuilder
func destinationView(_ destination: MoreDestination) -> some View {
    switch destination {
    case .notes: NotesView()
    case .tasks: TasksView()
    case .focus: FocusView()
    case .tabBar: TabBarSettingsView()
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

/// App-icon style tile: a rounded glyph above a short label.
private struct GridTile: View {
    let item: MoreItem
    let color: Color

    var body: some View {
        VStack(spacing: 7) {
            Group {
                if let asset = item.asset {
                    Image(asset).resizable().renderingMode(.template).scaledToFit().frame(width: 26, height: 26)
                } else {
                    Image(systemName: item.icon).font(.system(size: 22, weight: .semibold))
                }
            }
                .foregroundStyle(.white)
                .frame(width: 58, height: 58)
                .background(color.gradient, in: .rect(cornerRadius: 16, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white.opacity(0.14)))
                .shadow(color: color.opacity(0.35), radius: 8, y: 4)
            Text(LocalizedStringKey(item.title))
                .font(.caption.weight(.medium))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}

struct MoreView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var confirmSignOut = false
    @State private var query = ""

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 4)

    private var filteredGroups: [MoreGroup] {
        let needle = query.trimmingCharacters(in: .whitespaces)
        guard !needle.isEmpty else { return moreGroups }
        return moreGroups.compactMap { group in
            let items = group.items.filter { $0.title.localizedStandardContains(needle) || group.title.localizedStandardContains(needle) }
            return items.isEmpty ? nil : MoreGroup(title: group.title, color: group.color, items: items)
        }
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.morePath) {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    if query.isEmpty { accountCard.reveal(0) }

                    ForEach(Array(filteredGroups.enumerated()), id: \.element.id) { index, group in
                        VStack(alignment: .leading, spacing: 14) {
                            Text(LocalizedStringKey(group.title)).sectionTitle().padding(.leading, 4)
                            LazyVGrid(columns: columns, spacing: 18) {
                                ForEach(group.items) { item in
                                    NavigationLink(value: item.destination) {
                                        GridTile(item: item, color: group.color)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        .reveal(min(index + 1, 4))
                    }

                    if query.isEmpty {
                        VStack(spacing: 12) {
                            Toggle(isOn: Binding(
                                get: { model.lock.isEnabled },
                                set: { value in Task { await model.lock.setEnabled(value) } }
                            )) {
                                Label("Verrouiller avec \(model.lock.biometryLabel)", systemImage: "faceid")
                            }
                            .padding(16)
                            .glassEffect(.regular, in: .rect(cornerRadius: 20))

                            Button(role: .destructive) { confirmSignOut = true } label: {
                                Text("Se déconnecter").frame(maxWidth: .infinity, minHeight: 30)
                            }
                            .buttonStyle(.glass)
                            .confirmationDialog("Se déconnecter d'ETHONE ?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                                Button("Se déconnecter", role: .destructive) { Task { await auth.signOut() } }
                            }

                            Text("ETHONE \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
            .overlay {
                if !query.isEmpty && filteredGroups.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .searchable(text: $query, prompt: "Rechercher une section")
            .navigationTitle("Plus")
            .ethoneScreen()
            .navigationDestination(for: MoreDestination.self) { destinationView($0) }
        }
    }

    private var accountCard: some View {
        NavigationLink(value: MoreDestination.profile) {
            HStack(spacing: 14) {
                AvatarView(urlString: model.ethoneAvatar ?? auth.user?.avatarURL?.absoluteString, name: model.ethoneName ?? auth.user?.displayName ?? "E", size: 54, status: .online)
                VStack(alignment: .leading, spacing: 3) {
                    Text(model.ethoneName ?? auth.user?.displayName ?? "Mon compte")
                        .font(.title3.weight(.semibold))
                        .lineLimit(1)
                    Text(auth.user?.email ?? "Profil, photo et statut")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(.tertiary)
            }
            .padding(16)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 24))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Ouvre ton profil")
    }
}

/// Choose and order the three tabs between Home and More.
struct TabBarSettingsView: View {
    @Environment(AppModel.self) private var model

    private var candidates: [MoreItem] {
        moreGroups.filter { $0.title != "Réglages" }.flatMap(\.items).filter { !model.pinnedTabs.contains($0.destination) }
    }

    var body: some View {
        List {
            Section {
                ForEach(model.pinnedTabs, id: \.self) { destination in
                    if let item = destination.item {
                        HStack(spacing: 14) {
                            IconTile(systemImage: item.icon, color: destination.color)
                            Text(LocalizedStringKey(item.title))
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                }
                .onMove { model.pinnedTabs.move(fromOffsets: $0, toOffset: $1) }
                .onDelete { offsets in
                    guard model.pinnedTabs.count - offsets.count >= 1 else { return }
                    model.pinnedTabs.remove(atOffsets: offsets)
                }
            } header: {
                Text("Dans la barre").sectionTitle()
            } footer: {
                Text("Accueil et Plus restent toujours dans la barre. Maintenez une ligne pour la déplacer, balayez pour la retirer.")
            }

            Section {
                ForEach(candidates) { item in
                    Button {
                        withAnimation(Motion.snap) { model.pinnedTabs.append(item.destination) }
                    } label: {
                        HStack(spacing: 14) {
                            IconTile(systemImage: item.icon, color: item.destination.color)
                            Text(LocalizedStringKey(item.title)).foregroundStyle(.primary)
                            Spacer()
                            Image(systemName: "plus.circle.fill").foregroundStyle(model.pinnedTabs.count < 3 ? Theme.accent : Color.secondary)
                        }
                    }
                    .disabled(model.pinnedTabs.count >= 3)
                    .listRowBackground(GlassRowBackground())
                }
            } header: {
                Text(model.pinnedTabs.count < 3 ? "Ajouter" : "Ajouter (retirez d'abord un onglet)").sectionTitle()
            }
        }
        .environment(\.editMode, .constant(.active))
        .scrollContentBackground(.hidden)
        .sensoryFeedback(.selection, trigger: model.pinnedTabs)
        .navigationTitle("Onglets")
        .ethoneScreen()
    }
}
