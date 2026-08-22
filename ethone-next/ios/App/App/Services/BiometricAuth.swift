import Foundation
import LocalAuthentication

@MainActor
final class BiometricAuth: ObservableObject {
    @Published var isUnlocked = false
    @Published var error: String?

    private let context = LAContext()

    func canEvaluate() -> Bool {
        var error: NSError?
        let result = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        self.error = error?.localizedDescription
        return result
    }

    func authenticate() async {
        let reason = "Déverrouiller ETHONE."
        do {
            let success = try await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)
            isUnlocked = success
        } catch {
            self.error = error.localizedDescription
            isUnlocked = false
        }
    }
}
