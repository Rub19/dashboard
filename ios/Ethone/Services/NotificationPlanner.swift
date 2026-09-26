import Foundation
import UserNotifications

/// Préférences de notifications locales (Plus → Notifications).
enum NotificationPrefs {
    static let tasksKey = "ethone.notif.tasks"
    static let eventsKey = "ethone.notif.events"
    static let eventLeadKey = "ethone.notif.eventLead"
    static let briefingKey = "ethone.notif.briefing"
    static let briefingHourKey = "ethone.notif.briefingHour"
    static let briefingMinuteKey = "ethone.notif.briefingMinute"

    private static func bool(_ key: String, default value: Bool) -> Bool {
        UserDefaults.standard.object(forKey: key) as? Bool ?? value
    }

    private static func int(_ key: String, default value: Int) -> Int {
        UserDefaults.standard.object(forKey: key) as? Int ?? value
    }

    static var tasks: Bool { bool(tasksKey, default: true) }
    static var events: Bool { bool(eventsKey, default: true) }
    static var eventLead: Int { int(eventLeadKey, default: 15) }
    static var briefing: Bool { bool(briefingKey, default: false) }
    static var briefingHour: Int { int(briefingHourKey, default: 8) }
    static var briefingMinute: Int { int(briefingMinuteKey, default: 0) }
}

/// Reprogramme les rappels à partir des données réelles (tâches avec échéance et événements créés sur le site ou l'app,
/// résumé du matin) à chaque synchronisation. Les rappels posés à la main (identifiants `task-`, `event-`, `habit-`) sont conservés ;
/// ceux du planificateur portent le préfixe `auto-` et sont recalculés en entier. iOS limite à 64 notifications en attente.
@MainActor
enum NotificationPlanner {
    private static let prefix = "auto-"
    private static let limit = 60

    static func resync(tasks: [Item], events: [Item]) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        let pending = await center.pendingNotificationRequests()
        let stale = pending.map(\.identifier).filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: stale)
        let manual = pending.filter { !$0.identifier.hasPrefix(prefix) }
        let manualIds = Set(manual.map(\.identifier))

        let now = Date()
        let calendar = Calendar.current
        var planned: [(fire: Date, request: UNNotificationRequest)] = []

        func request(id: String, title: String, body: String, fire: Date, category: String, thread: String, info: [String: String], level: UNNotificationInterruptionLevel = .active) -> (Date, UNNotificationRequest) {
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            content.categoryIdentifier = category
            content.threadIdentifier = thread
            content.interruptionLevel = level
            content.userInfo = info
            let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: fire)
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            return (fire, UNNotificationRequest(identifier: prefix + id, content: content, trigger: trigger))
        }

        let openTasks = tasks.filter { !$0.isDone }

        if NotificationPrefs.tasks {
            for task in openTasks {
                guard var due = task.dueDate, !manualIds.contains("task-\(task.id)") else { continue }
                // Une échéance sans heure (minuit) est rappelée à 9 h.
                let parts = calendar.dateComponents([.hour, .minute], from: due)
                if parts.hour == 0 && parts.minute == 0, let morning = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: due) { due = morning }
                guard due > now else { continue }
                planned.append(request(id: "task-\(task.id)", title: task.title, body: "Tâche à faire maintenant",
                                       fire: due, category: NotificationManager.Category.task, thread: "tasks",
                                       info: ["kind": "task", "id": task.id], level: .timeSensitive))
            }
        }

        if NotificationPrefs.events {
            let lead = NotificationPrefs.eventLead
            for event in events {
                guard let start = event.startAt, !manualIds.contains("event-\(event.id)") else { continue }
                let fire = start.addingTimeInterval(TimeInterval(-lead * 60))
                guard fire > now else { continue }
                let time = start.formatted(date: .omitted, time: .shortened)
                planned.append(request(id: "event-\(event.id)", title: event.title, body: lead == 0 ? "Commence maintenant" : "Commence à \(time)",
                                       fire: fire, category: NotificationManager.Category.bill, thread: "events", info: ["kind": "event", "id": event.id]))
            }
        }

        if NotificationPrefs.briefing {
            let overdue = openTasks.filter { ($0.dueDate ?? .distantFuture) < calendar.startOfDay(for: now) }.count
            for offset in 0..<7 {
                guard let day = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)),
                      let fire = calendar.date(bySettingHour: NotificationPrefs.briefingHour, minute: NotificationPrefs.briefingMinute, second: 0, of: day),
                      fire > now else { continue }
                let dueToday = openTasks.filter { $0.dueDate.map { calendar.isDate($0, inSameDayAs: day) } ?? false }.count
                let eventsToday = events.filter { $0.startAt.map { calendar.isDate($0, inSameDayAs: day) } ?? false }.count
                var parts: [String] = []
                if eventsToday > 0 { parts.append("\(eventsToday) événement\(eventsToday > 1 ? "s" : "")") }
                if dueToday > 0 { parts.append("\(dueToday) tâche\(dueToday > 1 ? "s" : "") à faire") }
                if offset == 0 && overdue > 0 { parts.append("\(overdue) en retard") }
                guard !parts.isEmpty else { continue }
                let stamp = day.formatted(.iso8601.year().month().day())
                planned.append(request(id: "briefing-\(stamp)", title: "Votre journée", body: parts.joined(separator: " · "),
                                       fire: fire, category: NotificationManager.Category.focus, thread: "briefing", info: ["kind": "briefing"]))
            }
        }

        let room = max(0, limit - manual.count)
        for entry in planned.sorted(by: { $0.fire < $1.fire }).prefix(room) {
            try? await center.add(entry.request)
        }
    }
}
