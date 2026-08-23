import Foundation
import CoreHaptics
import SwiftUI

/// Gestionnaire natif Core Haptics pour les retours tactiles avancés.
/// Construit avec CHHapticEngine et restitue des patterns déclaratifs.
@MainActor
final class HapticManager: ObservableObject {
    static let shared = HapticManager()

    private var engine: CHHapticEngine?

    private init() {
        prepareEngine()
    }

    private func prepareEngine() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }

        do {
            let newEngine = try CHHapticEngine()
            newEngine.stoppedHandler = { [weak self] _ in
                guard let self = self else { return }
                Task { @MainActor in
                    self.restartEngineIfNeeded()
                }
            }
            newEngine.resetHandler = { [weak self] in
                guard let self = self else { return }
                Task { @MainActor in
                    try? self.engine?.start()
                }
            }
            engine = newEngine
            try engine?.start()
        } catch {
            engine = nil
        }
    }

    func start() {
        guard let engine = engine else { return }
        do {
            try engine.start()
        } catch {
            // Impossible de démarrer le moteur haptique sur ce device.
        }
    }

    func stop() {
        engine?.stop(completionHandler: nil)
    }

    private func restartEngineIfNeeded() {
        engine?.start { error in
            if let error = error {
                print("Haptic engine restart error: \(error.localizedDescription)")
            }
        }
    }

    private func play(events: [CHHapticEvent], parameters: [CHHapticDynamicParameter] = []) {
        guard let engine = engine else { return }
        do {
            let pattern = try CHHapticPattern(events: events, parameters: parameters)
            let player = try engine.makePlayer(with: pattern)
            try player.start(atTime: 0)
        } catch {
            // Ignorer silencieusement si le pattern est refusé.
        }
    }

    /// Impulsion ultra-courte et nette, simulant le tapotement sur du verre.
    func playGlassTap() {
        let event = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.9)
            ],
            relativeTime: 0
        )
        play(events: [event])
    }

    /// Vibration progressive en deux temps pour la validation d'une tâche.
    func playSuccessWave() {
        let first = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.5),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.7)
            ],
            relativeTime: 0
        )
        let second = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.4)
            ],
            relativeTime: 0.08,
            duration: 0.15
        )
        play(events: [first, second])
    }

    /// Pulsation cadencée continue pour signaler la fin d'un Focus Timer.
    func playTimerEndAlert() {
        var events: [CHHapticEvent] = []
        for i in 0..<3 {
            let event = CHHapticEvent(
                eventType: .hapticTransient,
                parameters: [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8)
                ],
                relativeTime: Double(i) * 0.22
            )
            events.append(event)
        }
        let sustain = CHHapticEvent(
            eventType: .hapticContinuous,
            parameters: [
                CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.4),
                CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5)
            ],
            relativeTime: 0.7,
            duration: 0.4
        )
        play(events: events + [sustain])
    }
}

// MARK: - Extension SwiftUI .sensoryFeedback

extension View {
    /// Enveloppe le modificateur officiel `.sensoryFeedback` pour rester cohérent
    /// avec le typage des projets ETHONE.
    func ethoneSensoryFeedback<T: Equatable>(_ feedback: SensoryFeedback, trigger: T) -> some View {
        self.sensoryFeedback(feedback, trigger: trigger)
    }
}
