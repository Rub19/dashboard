import BackgroundTasks
import Foundation

enum BackgroundSync {
    static let refreshIdentifier = "dev.ethone.app.refresh"
    static let syncIdentifier = "dev.ethone.app.sync"

    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshIdentifier, using: nil) { task in
            handle(task)
        }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: syncIdentifier, using: nil) { task in
            handle(task)
        }
    }

    static func schedule() {
        let refresh = BGAppRefreshTaskRequest(identifier: refreshIdentifier)
        refresh.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(refresh)

        let sync = BGProcessingTaskRequest(identifier: syncIdentifier)
        sync.requiresNetworkConnectivity = true
        sync.requiresExternalPower = false
        sync.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 60)
        try? BGTaskScheduler.shared.submit(sync)
    }

    private static func handle(_ task: BGTask) {
        schedule()
        let work = Task { @MainActor in
            let success = await AppModel.shared.backgroundSync()
            task.setTaskCompleted(success: success)
        }
        task.expirationHandler = { work.cancel() }
    }
}

