import Foundation
import Observation
import WatchConnectivity

/// Côté Apple Watch : reçoit l'instantané de l'iPhone et lui envoie les commandes de focus.
@MainActor
@Observable
final class WatchModel: NSObject, WCSessionDelegate {
    private(set) var snapshot: SharedSnapshot?
    private(set) var reachable = false
    var errorMessage: String?

    override init() {
        super.init()
        if let saved = Self.load() { snapshot = saved }
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func send(_ command: String, preset: String? = nil) {
        guard WCSession.default.activationState == .activated else { return }
        var message: [String: Any] = ["command": command]
        if let preset { message["preset"] = preset }
        WCSession.default.sendMessage(message, replyHandler: { _ in }, errorHandler: { [weak self] error in
            Task { @MainActor in self?.errorMessage = "iPhone injoignable : ouvrez ETHONE sur l'iPhone." }
        })
    }

    // MARK: Persistance locale (dernier état reçu)

    private static let key = "ethone.watch.snapshot"

    private static func load() -> SharedSnapshot? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        return try? decoder.decode(SharedSnapshot.self, from: data)
    }

    private func apply(_ context: [String: Any]) {
        guard let data = context["snapshot"] as? Data else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .secondsSince1970
        guard let decoded = try? decoder.decode(SharedSnapshot.self, from: data) else { return }
        snapshot = decoded
        UserDefaults.standard.set(data, forKey: Self.key)
    }

    // MARK: WCSessionDelegate

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        let reachable = session.isReachable
        Task { @MainActor in
            self.reachable = reachable
            self.apply(context)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(applicationContext) }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        let reachable = session.isReachable
        Task { @MainActor in self.reachable = reachable }
    }
}
