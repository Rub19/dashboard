import SwiftUI
import CoreMotion

final class ParallaxManager: ObservableObject {
    @Published var tilt: CGSize = .zero
    private let manager = CMMotionManager()

    func start() {
        guard manager.isDeviceMotionAvailable else { return }
        manager.deviceMotionUpdateInterval = 1 / 60
        manager.startDeviceMotionUpdates(to: .main) { [weak self] data, _ in
            guard let data = data else { return }
            let pitch = data.attitude.pitch
            let roll = data.attitude.roll
            self?.tilt = CGSize(width: CGFloat(roll) * 12, height: CGFloat(pitch) * 12)
        }
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
    }
}

@available(iOS 17.0, *)
struct LiquidGlassParallaxModifier: ViewModifier {
    @StateObject private var motion = ParallaxManager()

    func body(content: Content) -> some View {
        content
            .offset(motion.tilt)
            .rotation3DEffect(
                .degrees(sqrt(motion.tilt.width * motion.tilt.width + motion.tilt.height * motion.tilt.height) * 0.5),
                axis: (x: -motion.tilt.height, y: motion.tilt.width, z: 0)
            )
            .onAppear { motion.start() }
            .onDisappear { motion.stop() }
    }
}

@available(iOS 17.0, *)
struct LiquidGlassRefractModifier: ViewModifier {
    var tilt: CGSize = .zero

    func body(content: Content) -> some View {
        content
            .colorEffect(ShaderLibrary.liquidGlassColor(.float2(tilt)), isEnabled: true)
            .distortionEffect(
                ShaderLibrary.liquidGlassDistortion(.float2(tilt)),
                maxSampleOffset: CGSize(width: 8, height: 8),
                isEnabled: true
            )
    }
}

extension View {
    @ViewBuilder
    func liquidGlassParallax() -> some View {
        if #available(iOS 17.0, *) {
            modifier(LiquidGlassParallaxModifier())
        } else {
            self
        }
    }

    @ViewBuilder
    func liquidGlassRefract(tilt: CGSize = .zero) -> some View {
        if #available(iOS 17.0, *) {
            modifier(LiquidGlassRefractModifier(tilt: tilt))
        } else {
            self
        }
    }
}
