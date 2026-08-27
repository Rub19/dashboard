import SwiftUI

// MARK: - ETHGlassCard
public struct ETHGlassCard<Content: View>: View {
    let cornerRadius: CGFloat
    let padding: CGFloat
    let borderOpacity: Double
    let content: Content

    public init(
        cornerRadius: CGFloat = ETHTheme.radiusLarge,
        padding: CGFloat = 16,
        borderOpacity: Double = 0.20,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.padding = padding
        self.borderOpacity = borderOpacity
        self.content = content()
    }

    public var body: some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        Color.white.opacity(borderOpacity),
                                        Color.white.opacity(borderOpacity * 0.3),
                                        Color.clear
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 0.8
                            )
                    )
                    .shadow(color: Color.black.opacity(0.35), radius: 16, x: 0, y: 8)
            )
    }
}

// MARK: - ETHGlassButton
public struct ETHGlassButton: View {
    let title: String
    let icon: String?
    let accent: Color
    let isPrimary: Bool
    let action: () -> Void

    public init(
        title: String,
        icon: String? = nil,
        accent: Color = ETHTheme.emerald,
        isPrimary: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.accent = accent
        self.isPrimary = isPrimary
        self.action = action
    }

    public var body: some View {
        Button(action: {
            HapticManager.shared.light()
            action()
        }) {
            HStack(spacing: 8) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(isPrimary ? Color.black : Color.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                Group {
                    if isPrimary {
                        Capsule().fill(accent)
                            .shadow(color: accent.opacity(0.4), radius: 8, x: 0, y: 3)
                    } else {
                        Capsule()
                            .fill(.ultraThinMaterial)
                            .overlay(
                                Capsule().stroke(Color.white.opacity(0.18), lineWidth: 0.8)
                            )
                    }
                }
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - ETHStatusBadge
public struct ETHStatusBadge: View {
    let label: String
    let icon: String?
    let tone: Color

    public init(label: String, icon: String? = nil, tone: Color = ETHTheme.emerald) {
        self.label = label
        self.icon = icon
        self.tone = tone
    }

    public var body: some View {
        HStack(spacing: 5) {
            if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .bold))
            } else {
                Circle()
                    .fill(tone)
                    .frame(width: 6, height: 6)
            }
            Text(label)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
        }
        .foregroundStyle(tone)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(tone.opacity(0.12))
                .overlay(
                    Capsule().stroke(tone.opacity(0.25), lineWidth: 0.6)
                )
        )
    }
}

// MARK: - ETHModelBadge (AI Provider & Model indicator)
public struct ETHModelBadge: View {
    let modelName: String

    public init(_ modelName: String) {
        self.modelName = modelName
    }

    public var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "sparkles")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(ETHTheme.violet)
            Text("Brain · \(modelName)")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule().stroke(Color.purple.opacity(0.2), lineWidth: 0.5)
                )
        )
    }
}

// MARK: - ETHEmptyState
public struct ETHEmptyState: View {
    let icon: String
    let title: String
    let description: String
    let buttonTitle: String?
    let action: (() -> Void)?

    public init(
        icon: String,
        title: String,
        description: String,
        buttonTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.description = description
        self.buttonTitle = buttonTitle
        self.action = action
    }

    public var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 64, height: 64)
                Image(systemName: icon)
                    .font(.system(size: 26, weight: .medium))
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.primary)

                Text(description)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            if let buttonTitle = buttonTitle, let action = action {
                ETHGlassButton(title: buttonTitle, icon: "plus", isPrimary: true, action: action)
                    .padding(.top, 6)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
    }
}
