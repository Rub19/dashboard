import Foundation
import UserNotifications

@MainActor
final class LocalNotificationManager: ObservableObject {
    @Published var isAuthorized = false

    static let shared = LocalNotificationManager()

    private init() {}

    func requestAuthorization() async {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            isAuthorized = granted
        } catch {
            isAuthorized = false
        }
    }

    func scheduleTaskReminder(id: String, title: String, date: Date) {
        let content = UNMutableNotificationContent()
        content.title = "Tâche à venir"
        content.body = title
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        let trigger = UNCalendarNotificationTrigger(dateMatching: Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date), repeats: false)
        let request = UNNotificationRequest(identifier: "ethone-task-\(id)", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func cancelTaskReminder(id: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["ethone-task-\(id)"])
    }

    func scheduleFocusEnd(duration: TimeInterval) {
        let content = UNMutableNotificationContent()
        content.title = "Session Focus terminée"
        content.body = "Votre minuteur est terminé."
        content.sound = .default
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: duration, repeats: false)
        let request = UNNotificationRequest(identifier: "ethone-focus-end", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func cancelFocusEnd() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["ethone-focus-end"])
    }
}
