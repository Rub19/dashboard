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
    let discord = DiscordStore()

    /// Instance unique : les actions de notification peuvent arriver avant que l'interface n'existe.
    static let shared = AppModel()

    /// Onglet demandé par un lien profond (`ethone://notes`), un raccourci ou une notification.
    var requestedTab: AppTab?
    /// Pile de navigation de l'onglet « Plus » (ouvre directement une section).
    var morePath: [MoreDestination] = []

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
            focusMinutesToday: focus.minutesToday
        )
        snapshot.save()
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Termine une tâche depuis une action de notification (l'app peut être lancée en arrière-plan, sans cache chargé).
    func completeTask(id: String) async {
        if let item = tasks.items.first(where: { $0.id == id }) {
            await tasks.setDone(item, true)
        } else {
            let _: Item? = try? await api.patch("ethone_items", id: id, fields: ["done": .bool(true)])
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
    case brain, mail, discord, spaces, flows, files, connections, habits, calendar, weather, security
    var id: String { rawValue }
}
