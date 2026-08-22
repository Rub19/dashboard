import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        registerNotificationCategories()
        requestNotificationAuthorization()
        return true
    }

    private func requestNotificationAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound, .provisional, .providesAppNotificationSettings]) { _, _ in
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    private func registerNotificationCategories() {
        let doneAction = UNNotificationAction(
            identifier: "ETHONE_TASK_DONE",
            title: "Terminé",
            options: [.authenticationRequired]
        )

        let postponeAction = UNNotificationAction(
            identifier: "ETHONE_TASK_POSTPONE",
            title: "Reporter 15 min",
            options: []
        )

        let snoozeAction = UNNotificationAction(
            identifier: "ETHONE_CALENDAR_SNOOZE",
            title: "Reporter 10 min",
            options: []
        )

        let openAction = UNNotificationAction(
            identifier: "ETHONE_CALENDAR_OPEN",
            title: "Ouvrir",
            options: [.foreground]
        )

        let replyAction = UNTextInputNotificationAction(
            identifier: "ETHONE_BRAIN_REPLY",
            title: "Répondre",
            options: [],
            textInputButtonTitle: "Envoyer",
            textInputPlaceholder: "Votre idée..."
        )

        let taskCategory = UNNotificationCategory(
            identifier: "ETHONE_TASK",
            actions: [doneAction, postponeAction],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "%u nouvelles tâches",
            categorySummaryFormat: "%u tâches ETHONE"
        )

        let brainCategory = UNNotificationCategory(
            identifier: "ETHONE_BRAIN",
            actions: [replyAction],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "%u messages Brain",
            categorySummaryFormat: "%u messages Brain"
        )

        let calendarCategory = UNNotificationCategory(
            identifier: "ETHONE_CALENDAR",
            actions: [snoozeAction, openAction],
            intentIdentifiers: [],
            hiddenPreviewsBodyPlaceholder: "%u événements",
            categorySummaryFormat: "%u événements ETHONE"
        )

        UNUserNotificationCenter.current().setNotificationCategories([taskCategory, brainCategory, calendarCategory])
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Save data if appropriate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
