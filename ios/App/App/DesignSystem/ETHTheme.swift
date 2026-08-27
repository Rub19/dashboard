import SwiftUI

public enum ETHTheme {
    // MARK: - Color Palette
    public static let bgDeep = Color(red: 0.04, green: 0.04, blue: 0.05)
    public static let bgPanel = Color(red: 0.07, green: 0.08, blue: 0.10)
    public static let bgRaised = Color(red: 0.10, green: 0.11, blue: 0.14)

    // MARK: - Accents
    public static let emerald = Color(red: 0.10, green: 0.85, blue: 0.58)
    public static let teal = Color(red: 0.08, green: 0.72, blue: 0.65)
    public static let cyan = Color(red: 0.15, green: 0.78, blue: 0.95)
    public static let violet = Color(red: 0.62, green: 0.38, blue: 0.98)
    public static let amber = Color(red: 0.96, green: 0.62, blue: 0.04)
    public static let rose = Color(red: 0.96, green: 0.25, blue: 0.37)

    // MARK: - Gradients
    public static let primaryGradient = LinearGradient(
        colors: [emerald, teal],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    public static let brainGradient = LinearGradient(
        colors: [violet, Color.purple, cyan],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    public static let glassBorderGradient = LinearGradient(
        colors: [
            Color.white.opacity(0.30),
            Color.white.opacity(0.08),
            Color.white.opacity(0.02)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Radii
    public static let radiusSmall: CGFloat = 12
    public static let radiusMedium: CGFloat = 18
    public static let radiusLarge: CGFloat = 24
    public static let radiusPill: CGFloat = 999

    // MARK: - Animations
    public static let springSnappy = Animation.spring(response: 0.28, dampingFraction: 0.78)
    public static let springSmooth = Animation.spring(response: 0.40, dampingFraction: 0.85)
    public static let easeOutSmooth = Animation.timingCurve(0.16, 1.0, 0.3, 1.0, duration: 0.22)
}
