import BackgroundTasks
import Foundation

/// Synchronisation en arrière-plan : iOS réveille l'app de temps en temps (environ toutes les 15 à 60 minutes, à sa convenance :
/// fréquence variable selon l'usage, la batterie et le réseau, jamais garantie) pour recharger les données, reprogrammer les rappels
/// (tâches et événements créés sur le site inclus), mettre à jour Spotlight et les widgets.
/// Une connexion temps réel permanente n'est pas possible en arrière-plan sur iOS ; les changements sont donc repris à ce réveil
/// ou à la réouverture de l'app (le temps réel prend le relais dès qu'elle est au premier plan).
enum BackgroundSync {
    static let refreshIdentifier = "dev.ethone.app.refresh"
    static let syncIdentifier = "dev.ethone.app.sync"

    /// À appeler au lancement, avant la fin de `didFinishLaunching`.
    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshIdentifier, using: nil) { task in
            handle(task)
        }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: syncIdentifier, using: nil) { task in
            handle(task)
        }
    }

    /// Demande les prochains réveils (à rappeler à chaque passage en arrière-plan et à chaque exécution).
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
