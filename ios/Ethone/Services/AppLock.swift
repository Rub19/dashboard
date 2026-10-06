import Foundation
import LocalAuthentication
import Observation

@MainActor
@Observable
final class AppLock {
    private static let key = "ethone.appLock.enabled"

    private(set) var isEnabled: Bool = UserDefaults.standard.bool(forKey: AppLock.key)
    private(set) var isLocked = false
    private(set) var isAuthenticating = false
    var errorMessage: String?

    var biometryLabel: String {
        let context = LAContext()
        var error: NSError?
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        switch context.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "code de l'appareil"
        }
    }

    func setEnabled(_ enabled: Bool) async {
        if enabled {
            guard await evaluate(reason: "Activer le verrouillage d'ETHONE") else { return }
        }
        isEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: Self.key)
        if !enabled { isLocked = false }
    }

    func lockIfEnabled() {
        if isEnabled { isLocked = true }
    }

    func unlock() async {
        guard isLocked, !isAuthenticating else { return }
        if await evaluate(reason: "Déverrouiller ETHONE") { isLocked = false }
    }

    private func evaluate(reason: String) async -> Bool {
        isAuthenticating = true
        defer { isAuthenticating = false }
        let context = LAContext()
        context.localizedCancelTitle = "Annuler"
        do {
            let ok = try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason)
            errorMessage = nil
            return ok
        } catch {
            errorMessage = (error as NSError).code == LAError.userCancel.rawValue ? nil : error.localizedDescription
            return false
        }
    }
}

