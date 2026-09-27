import Foundation
import Observation
import WidgetKit

/// Racine des données de l'app : authentification, client réseau et stores partagés par tous les écrans.
@MainActor
@Observable
final class AppModel {
    let auth: AuthStore
    let api: APIClient
    let notes: ItemsStore
    let tasks: ItemsStore
    let events: ItemsStore
    let habits: HabitsStore
    let focus: FocusManager
    let lock = AppLock()
    let brain: BrainChat
    let mail: MailStore
    let spaces: SpacesStore
    let valorant: ValorantStore
    let discord = DiscordStore()

    /// Instance unique : les actions de notification peuvent arriver avant que l'interface n'existe.
    static let shared = AppModel()

    /// Compteur de changements distants par table (rechargement des écrans qui affichent ces tables, voir `reloadOnRemoteChange`).
    private(set) var remoteChanges: [String: Int] = [:]
    @ObservationIgnored private var realtime: RealtimeClient?
    @ObservationIgnored private var pendingTables: Set<String> = []
    @ObservationIgnored private var flushTask: Task<Void, Never>?

    /// Onglet demandé par un lien profond (`ethone://notes`), un raccourci ou une notification.
    var requestedTab: AppTab?
    /// Pile de navigation de l'onglet « Plus » (ouvre directement une section).
    var morePath: [MoreDestination] = []

    /// Thème actif (fond, ambiance, clair/sombre), observé par l'interface.
    private(set) var themePreset: ThemePreset = Theme.preset
    /// Accent choisi explicitement ; `nil` = « Auto » (suit le thème).
    private(set) var chosenAccentHex: UInt32? = Theme.chosenAccentHex

    /// Couleur d'accent courante (observée par l'interface pour teinter l'app en direct).
    var accentHex: UInt32 { chosenAccentHex ?? themePreset.accent }

    func setTheme(_ preset: ThemePreset) {
        themePreset = preset
        UserDefaults.standard.set(preset.rawValue, forKey: Theme.themeKey)
    }

    /// `nil` rétablit l'accent du thème.
    func setAccent(_ hex: UInt32?) {
        chosenAccentHex = hex
        if let hex { UserDefaults.standard.set(Int(hex), forKey: Theme.accentKey) } else { UserDefaults.standard.removeObject(forKey: Theme.accentKey) }
    }

    init() {
        let auth = AuthStore()
        let api = APIClient(auth: auth)
        self.auth = auth
        self.api = api
        self.notes = ItemsStore(kind: .note, api: api)
        self.tasks = ItemsStore(kind: .task, api: api)
        self.events = ItemsStore(kind: .event, api: api)
        self.habits = HabitsStore(api: api)
        self.focus = FocusManager(api: api)
        self.brain = BrainChat(api: api)
        self.mail = MailStore(api: api)
        self.spaces = SpacesStore(api: api)
        self.valorant = ValorantStore(api: api)
        focus.onChange = { [weak self] in self?.publishSnapshot() }
        WatchBridge.shared.activate()
    }

    // MARK: Synchronisation temps réel (site <-> app)

    func startRealtime() {
        if realtime == nil {
            realtime = RealtimeClient(
                auth: auth,
                onChange: { [weak self] table in self?.remoteChanged(table) },
                onReconnect: { [weak self] in Task { await self?.refreshAll() } }
            )
        }
        realtime?.start()
    }

    func stopRealtime() {
        realtime?.stop()
        flushTask?.cancel()
        pendingTables = []
    }

    /// Regroupe les rafales d'événements (une modification en produit souvent plusieurs) avant de recharger.
    private func remoteChanged(_ table: String) {
        pendingTables.insert(table)
        flushTask?.cancel()
        flushTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled, let self else { return }
            let tables = self.pendingTables
            self.pendingTables = []
            await self.applyRemote(tables)
        }
    }

    private func applyRemote(_ tables: Set<String>) async {
        if tables.contains("tasks") { await self.tasks.refresh() }
        if tables.contains("ethone_items") {
            await notes.refresh()
            await events.refresh()
        }
        if tables.contains("ethone_habits") || tables.contains("ethone_habit_completions") { await habits.refresh() }
        if tables.contains("ethone_focus_sessions") { await focus.refreshSessions() }
        if !tables.isDisjoint(with: ["ethone_shared_spaces", "ethone_space_tasks", "ethone_space_notes", "ethone_space_events"]) { await spaces.refresh() }
        for table in tables { remoteChanges[table, default: 0] += 1 }
        if !tables.isDisjoint(with: ["tasks", "ethone_items", "ethone_habits", "ethone_habit_completions"]) {
            SpotlightIndexer.index(notes: notes.items, tasks: tasks.items)
            publishSnapshot()
            await NotificationPlanner.resync(tasks: tasks.items, events: events.items)
            await EventActivityManager.sync(events: events.items)
        }
    }

    /// Réveil en arrière-plan : restaure la session si l'app vient d'être lancée par le système, puis recharge tout.
    func backgroundSync() async -> Bool {
        if auth.phase == .launching { await auth.restore() }
        guard auth.phase == .signedIn else { return false }
        await refreshAll()
        return !Task.isCancelled
    }

    func refreshAll() async {
        async let a: Void = notes.refresh()
        async let b: Void = tasks.refresh()
        async let c: Void = events.refresh()
        async let d: Void = habits.refresh()
        _ = await (a, b, c, d)
        await focus.refreshSessions()
        SpotlightIndexer.index(notes: notes.items, tasks: tasks.items)
        publishSnapshot()
        await NotificationPlanner.resync(tasks: tasks.items, events: events.items)
        await EventActivityManager.sync(events: events.items)
    }

    /// Écrit l'instantané lu par les widgets (App Group) puis demande leur rafraîchissement.
    func publishSnapshot() {
        let open = tasks.items.filter { !$0.isDone }.sorted { $0.createdAt > $1.createdAt }
        let snapshot = SharedSnapshot(
            updatedAt: Date(),
            userName: auth.user?.displayName ?? "",
            openTaskCount: open.count,
            nextTasks: open.prefix(4).map(\.title),
            habitsDone: habits.activeHabits.filter { habits.isDone($0) }.count,
            habitsTotal: habits.activeHabits.count,
            bestStreak: habits.activeHabits.map { habits.streak($0) }.max() ?? 0,
            noteCount: notes.items.count,
            focusMinutesToday: focus.minutesToday,
            focusPhase: focus.isActive ? focus.phase.rawValue : nil,
            focusEndDate: focus.isActive ? focus.endDate : nil,
            focusPaused: focus.isActive ? focus.isPaused : nil
        )
        snapshot.save()
        WatchBridge.shared.push(snapshot)
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Termine une tâche depuis une action de notification (l'app peut être lancée en arrière-plan, sans cache chargé).
    func completeTask(id: String) async {
        if let item = tasks.items.first(where: { $0.id == id }) {
            await tasks.setDone(item, true)
        } else {
            let _: CloudTaskRow? = try? await api.patch("tasks", id: id, fields: ["is_completed": .bool(true)])
        }
    }

    func completeHabit(id: String) async {
        if habits.habits.isEmpty { await habits.refresh() }
        if let habit = habits.habits.first(where: { $0.id == id }), !habits.isDone(habit) {
            await habits.toggleToday(habit)
        }
    }

    /// Résumé factuel des données de l'utilisateur, injecté dans les instructions de Brain.
    func brainContext() -> String {
        var lines: [String] = []
        let open = tasks.items.filter { !$0.isDone }
        lines.append("Tâches ouvertes (\(open.count)) : " + (open.isEmpty ? "aucune" : open.prefix(15).map(\.title).joined(separator: " ; ")))

        let now = Date()
        let horizon = now.addingTimeInterval(7 * 86_400)
        let upcoming = events.items
            .filter { ($0.startAt ?? .distantPast) >= now && ($0.startAt ?? .distantFuture) <= horizon }
            .sorted { ($0.startAt ?? now) < ($1.startAt ?? now) }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE d MMMM HH:mm"
        formatter.locale = Locale(identifier: "fr_FR")
        lines.append("Événements des 7 prochains jours : " + (upcoming.isEmpty ? "aucun" : upcoming.prefix(10).map { "\(formatter.string(from: $0.startAt ?? now)) — \($0.title)" }.joined(separator: " ; ")))

        let active = habits.activeHabits
        if active.isEmpty {
            lines.append("Habitudes : aucune")
        } else {
            let states = active.map { "\($0.name) (\(habits.isDone($0) ? "faite" : "à faire") aujourd'hui, série \(habits.streak($0)) j)" }
            lines.append("Habitudes : " + states.joined(separator: " ; "))
        }

        let recent = notes.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(5).map(\.title)
        lines.append("Notes récentes : " + (recent.isEmpty ? "aucune" : recent.joined(separator: " ; ")))
        lines.append("Concentration aujourd'hui : \(focus.minutesToday) min")
        return lines.joined(separator: "\n")
    }

    /// Pages du site pouvant être ouvertes par une macro, avec l'écran iOS équivalent.
    static let webPages: [(path: String, title: String)] = [
        ("/", "Accueil"), ("/notes", "Notes"), ("/tasks", "Tâches"), ("/focus", "Focus"), ("/habits", "Habitudes"),
        ("/calendar", "Calendrier"), ("/mail", "Mail"), ("/brain", "Brain"), ("/files", "Fichiers"), ("/flows", "Flows"),
        ("/spaces", "Espaces partagés"), ("/analytics", "Analytique"), ("/activity", "Activité"), ("/connections", "Connexions"),
        ("/weather", "Météo"), ("/bills", "Factures"), ("/matches", "Valorant"), ("/games", "Jeux"), ("/interactions", "Interactions"),
        ("/team", "Équipe"), ("/security", "Sécurité"), ("/settings", "Apparence"), ("/scratchpad", "Scratchpad"),
        ("/macros", "Macros"), ("/personas", "Personas"), ("/rss", "RSS"), ("/discord", "Bot Discord"),
        ("/profile", "Profil"), ("/profile-selection", "Profils de travail"), ("/boost", "Performance"), ("/browser", "Navigateur"), ("/leaderboard", "Classement public"), ("/system", "Système"), ("/share", "Liens partagés"), ("/drop", "Dépôts"), ("/admin", "Administration"),
    ]

    /// Ouvre l'écran iOS correspondant à un chemin du site ; `false` si la page n'a pas d'équivalent.
    @discardableResult
    func openWebPage(_ path: String) -> Bool {
        let key = path.split(separator: "/").first.map(String.init) ?? ""
        let tabs: [String: AppTab] = ["": .home, "notes": .notes, "tasks": .tasks, "focus": .focus]
        let more: [String: MoreDestination] = [
            "habits": .habits, "calendar": .calendar, "mail": .mail, "brain": .brain, "files": .files, "flows": .flows,
            "spaces": .spaces, "analytics": .analytics, "activity": .activity, "connections": .connections, "weather": .weather,
            "bills": .bills, "calendar-bills": .bills, "matches": .valorant, "games": .games, "interactions": .interactions,
            "team": .team, "security": .security, "settings": .settings, "notifications": .notifications, "scratchpad": .scratchpad, "macros": .macros,
            "personas": .personas, "rss": .rss, "discord": .discord,
            "profile": .profile, "profile-selection": .workspaces, "boost": .boost, "browser": .browser, "leaderboard": .leaderboard, "system": .system, "share": .sharedLinks, "drop": .sharedLinks, "admin": .admin,
        ]
        if let tab = tabs[key] {
            requestedTab = tab
            return true
        }
        if let destination = more[key] {
            morePath = [destination]
            requestedTab = .more
            return true
        }
        return false
    }

    /// Liens `ethone://<page>` (raccourcis, widgets, notifications).
    func handle(url: URL) {
        guard url.scheme == Config.oauthCallbackScheme, let host = url.host else { return }
        if let tab = AppTab(rawValue: host) {
            requestedTab = tab
        } else if let destination = MoreDestination(rawValue: host) {
            morePath = [destination]
            requestedTab = .more
        }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case home, notes, tasks, focus, more
    var id: String { rawValue }
}

/// Sections accessibles depuis l'onglet « Plus ».
enum MoreDestination: String, Hashable, CaseIterable, Identifiable {
    case settings, notifications, team, bills, scratchpad, macros, personas, rss, valorant, valorantStore, lolTracker, lolRotation, tftTracker, otherGames, sharedLinks, profile, workspaces, leaderboard, boost, browser, system, admin, games, interactions, brain, mail, discord, spaces, flows, files, connections, analytics, activity, habits, calendar, weather, security
    var id: String { rawValue }
}
