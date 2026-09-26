import Foundation
import UIKit
import UserNotifications

/// Notifications locales riches (actions, rappels de tâches et d'habitudes, fin de focus) et enregistrement APNs.
/// L'envoi de push par le serveur nécessite un IPA signé avec un compte Apple Developer ; les notifications locales n'en ont pas besoin.
enum NotificationManager {
    enum Category {
        static let task = "ETHONE_TASK"
        static let habit = "ETHONE_HABIT"
        static let focus = "ETHONE_FOCUS"
        static let bill = "ETHONE_BILL"
    }

    enum Action {
        static let done = "ETHONE_DONE"
        static let snooze = "ETHONE_SNOOZE"
        static let open = "ETHONE_OPEN"
    }

    private static let pushTokenKey = "ethone.apnsToken"

    static func registerCategories() {
        let done = UNNotificationAction(identifier: Action.done, title: "Terminer", options: [], icon: UNNotificationActionIcon(systemImageName: "checkmark.circle"))
        let snooze = UNNotificationAction(identifier: Action.snooze, title: "Reporter d'1 h", options: [], icon: UNNotificationActionIcon(systemImageName: "clock.arrow.circlepath"))
        let open = UNNotificationAction(identifier: Action.open, title: "Ouvrir", options: [.foreground], icon: UNNotificationActionIcon(systemImageName: "arrow.up.forward.app"))
        let habitDone = UNNotificationAction(identifier: Action.done, title: "Fait", options: [], icon: UNNotificationActionIcon(systemImageName: "flame"))

        let categories: Set<UNNotificationCategory> = [
            UNNotificationCategory(identifier: Category.task, actions: [done, snooze, open], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: Category.habit, actions: [habitDone, snooze], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: Category.focus, actions: [open], intentIdentifiers: [], options: []),
            UNNotificationCategory(identifier: Category.bill, actions: [open, snooze], intentIdentifiers: [], options: []),
        ]
        UNUserNotificationCenter.current().setNotificationCategories(categories)
    }

    /// Demande l'autorisation (une seule fois) et enregistre l'appareil pour les push distants.
    @discardableResult
    static func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .badge, .sound, .providesAppNotificationSettings])) ?? false
        if granted {
            await MainActor.run { UIApplication.shared.registerForRemoteNotifications() }
        }
        return granted
    }

    static func storePushToken(_ token: Data) {
        let hex = token.map { String(format: "%02x", $0) }.joined()
        UserDefaults.standard.set(hex, forKey: pushTokenKey)
    }

    static var pushToken: String? { UserDefaults.standard.string(forKey: pushTokenKey) }

    // MARK: Planification

    static func scheduleTask(_ item: Item, at date: Date) async {
        guard date > Date() else { return }
        let content = UNMutableNotificationContent()
        content.title = item.title
        content.body = "Tâche à faire"
        content.sound = .default
        content.categoryIdentifier = Category.task
        content.threadIdentifier = "tasks"
        content.interruptionLevel = .timeSensitive
        content.userInfo = ["kind": "task", "id": item.id]
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "task-\(item.id)", content: content, trigger: trigger))
    }

    static func cancelTask(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["task-\(id)"])
    }

    /// Rappel quotidien d'une habitude (à l'heure choisie).
    static func scheduleHabit(_ habit: Habit, hour: Int, minute: Int) async {
        let content = UNMutableNotificationContent()
        content.title = "\(habit.emoji ?? "🎯") \(habit.name)"
        content.body = "N'oubliez pas votre habitude du jour."
        content.sound = .default
        content.categoryIdentifier = Category.habit
        content.threadIdentifier = "habits"
        content.userInfo = ["kind": "habit", "id": habit.id]
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "habit-\(habit.id)", content: content, trigger: trigger))
    }

    static func cancelHabit(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["habit-\(id)"])
    }

    static func scheduleFocusEnd(in seconds: TimeInterval, goal: String?) async {
        let content = UNMutableNotificationContent()
        content.title = "Session terminée"
        content.body = goal.map { "Bravo ! Objectif : \($0)" } ?? "Bravo, prenez une pause."
        content.sound = .default
        content.categoryIdentifier = Category.focus
        content.interruptionLevel = .timeSensitive
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, seconds), repeats: false)
        try? await UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "focus-end", content: content, trigger: trigger))
    }

    static func cancelFocusEnd() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["focus-end"])
    }

    // MARK: Réponses aux actions

    @MainActor
    static func handle(response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        let kind = info["kind"] as? String
        let id = info["id"] as? String
        let model = AppModel.shared

        switch response.actionIdentifier {
        case Action.done:
            guard let id else { return }
            if kind == "task" { await model.completeTask(id: id) }
            if kind == "habit" { await model.completeHabit(id: id) }
        case Action.snooze:
            let content = response.notification.request.content.mutableCopy() as? UNMutableNotificationContent
            guard let content else { return }
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 3600, repeats: false)
            let request = UNNotificationRequest(identifier: response.notification.request.identifier + "-snooze", content: content, trigger: trigger)
            try? await UNUserNotificationCenter.current().add(request)
        default:
            switch kind {
            case "task": model.requestedTab = .tasks
            case "habit": model.requestedTab = .habits
            default: model.requestedTab = .home
            }
        }
    }
}
