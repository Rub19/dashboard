import UIKit

/// Wrapper léger pour préserver les appels existants tout en passant par Core Haptics.
@MainActor
enum Haptic {
    static func light() {
        HapticManager.shared.playGlassTap()
    }

    static func medium() {
        HapticManager.shared.playGlassTap()
    }

    static func rigid() {
        HapticManager.shared.playGlassTap()
    }

    static func heavy() {
        HapticManager.shared.playTimerEndAlert()
    }

    static func success() {
        HapticManager.shared.playSuccessWave()
    }

    static func warning() {
        HapticManager.shared.playTimerEndAlert()
    }
}
