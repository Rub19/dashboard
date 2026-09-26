import SwiftUI

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}

/// Identité visuelle ETHONE (accent rose du site, fond nuit) pour un rendu Liquid Glass cohérent.
enum Theme {
    static let accent = Color(hex: 0xE11D5A)
    static let accentSoft = Color(hex: 0xFF5C8A)
    static let night = Color(hex: 0x0B0D14)
    static let indigo = Color(hex: 0x2A2F6B)
    static let violet = Color(hex: 0x5B2A86)
    static let teal = Color(hex: 0x0E7C86)

    static let success = Color(hex: 0x34D399)
    static let warning = Color(hex: 0xFBBF24)
    static let danger = Color(hex: 0xF87171)

    static let cardRadius: CGFloat = 26
    static let pillRadius: CGFloat = 18
}

/// Statuts de présence (mêmes couleurs fixes que le site).
enum PresenceStatus: String, CaseIterable, Identifiable {
    case online, focus, busy, away, invisible
    var id: String { rawValue }

    var label: String {
        switch self {
        case .online: return "En ligne"
        case .focus: return "Focus"
        case .busy: return "Occupé"
        case .away: return "Absent"
        case .invisible: return "Invisible"
        }
    }

    var color: Color {
        switch self {
        case .online: return Color(hex: 0x22C55E)
        case .focus: return Color(hex: 0x8B5CF6)
        case .busy: return Color(hex: 0xEF4444)
        case .away: return Color(hex: 0xF59E0B)
        case .invisible: return Color(hex: 0x6B7280)
        }
    }
}
