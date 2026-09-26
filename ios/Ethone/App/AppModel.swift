import Foundation
import Observation

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

    /// Instance unique : les actions de notification peuvent arriver avant que l'interface n'existe.
    static let shared = AppModel()

    /// Onglet demandé par un lien profond (`ethone://notes`), un raccourci ou une notification.
    var requestedTab: AppTab?

    init() {
        let auth = AuthStore()
        let api = APIClient(auth: auth)
        self.auth = auth
        self.api = api
        self.notes = ItemsStore(kind: .note, api: api)
        self.tasks = ItemsStore(kind: .task, api: api)
        self.events = ItemsStore(kind: .event, api: api)
        self.habits = HabitsStore(api: api)
    }

    func refreshAll() async {
        async let a: Void = notes.refresh()
        async let b: Void = tasks.refresh()
        async let c: Void = events.refresh()
        async let d: Void = habits.refresh()
        _ = await (a, b, c, d)
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

    /// Liens `ethone://<page>` (raccourcis, widgets, notifications).
    func handle(url: URL) {
        guard url.scheme == Config.oauthCallbackScheme, let host = url.host else { return }
        if let tab = AppTab(rawValue: host) { requestedTab = tab }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case home, notes, tasks, habits, more
    var id: String { rawValue }
}
