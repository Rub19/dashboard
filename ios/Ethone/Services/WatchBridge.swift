import Foundation
import WatchConnectivity

/// Pont iPhone → Apple Watch (WatchConnectivity) : envoie l'instantané des données et reçoit les commandes de focus de la montre.
final class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()

    private override init() { super.init() }

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    /// Dernier état connu, lisible par la montre même si l'iPhone n'est pas joignable à cet instant.
    func push(_ snapshot: SharedSnapshot) {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .secondsSince1970
        guard let data = try? encoder.encode(snapshot) else { return }
        try? session.updateApplicationContext(["snapshot": data])
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        let command = message["command"] as? String
        let preset = message["preset"] as? String
        Task { @MainActor in
            let model = AppModel.shared
            if model.auth.session == nil { await model.auth.restore() }
            switch command {
            case "focus.start":
                model.focus.start(preset: FocusPreset(rawValue: preset ?? "") ?? .pomodoro, goal: "")
            case "focus.stop":
                model.focus.stop()
            case "focus.pause":
                model.focus.pause()
            case "focus.resume":
                model.focus.resume()
            default:
                break
            }
            model.publishSnapshot()
            replyHandler(["ok": true])
        }
    }
}
