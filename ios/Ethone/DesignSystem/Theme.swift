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

enum ThemePreset: String, CaseIterable, Identifiable {
    case dynoRose = "dyno-rose"
    case obsidian, midnight, aurora
    case purpleSpace = "purple-space"
    case arctic, carbon
    case cyberNeon = "cyber-neon"
    case minimal, glass, forest, sunset, rose

    var id: String { rawValue }

    static func resolve(legacy raw: String?) -> ThemePreset {
        let id = (raw ?? "").lowercased().trimmingCharacters(in: .whitespaces)
        if let exact = ThemePreset(rawValue: id) { return exact }
        let aliases: [String: ThemePreset] = [
            "default": .dynoRose, "dyno": .dynoRose, "dyno-night": .dynoRose, "crimson": .dynoRose, "crimson-night": .dynoRose,
            "night": .obsidian, "focus": .obsidian, "graphite": .carbon, "oled": .midnight,
            "cyberpunk": .cyberNeon, "northern-aurora": .aurora, "boreal": .aurora, "emerald": .aurora,
            "eclipse": .carbon, "solar-eclipse": .carbon, "day": .arctic, "light": .arctic,
            "monochrome-studio": .minimal, "space": .purpleSpace,
        ]
        return aliases[id] ?? .dynoRose
    }

    var label: String {
        switch self {
        case .dynoRose: "Dyno Rose"
        case .obsidian: "ETHONE Dark"
        case .midnight: "Midnight OLED"
        case .aurora: "Aurora Boréale"
        case .purpleSpace: "Purple Space"
        case .arctic: "Arctic Light"
        case .carbon: "Carbon Graphite"
        case .cyberNeon: "Cyber Neon"
        case .minimal: "Minimal Studio"
        case .glass: "Liquid Glass"
        case .forest: "Emerald Forest"
        case .sunset: "Sunset Horizon"
        case .rose: "Velvet Rose"
        }
    }

    var isLight: Bool { self == .arctic }

    var base: UInt32 {
        switch self {
        case .dynoRose: 0x0E1015
        case .obsidian: 0x08080A
        case .midnight: 0x000000
        case .aurora: 0x050C12
        case .purpleSpace: 0x080612
        case .arctic: 0xF8FAFC
        case .carbon: 0x0C0D10
        case .cyberNeon: 0x090611
        case .minimal: 0x09090B
        case .glass: 0x06070A
        case .forest: 0x050F0A
        case .sunset: 0x100806
        case .rose: 0x12060A
        }
    }

    var accent: UInt32 {
        switch self {
        case .dynoRose: 0xC1234F
        case .obsidian: 0x8B5CF6
        case .midnight: 0xFFFFFF
        case .aurora: 0x2DD4BF
        case .purpleSpace: 0xC084FC
        case .arctic: 0x0369A1
        case .carbon: 0x94A3B8
        case .cyberNeon: 0xF43F5E
        case .minimal: 0xE4E4E7
        case .glass: 0x38BDF8
        case .forest: 0x10B981
        case .sunset: 0xF97316
        case .rose: 0xF43F5E
        }
    }

    var secondary: UInt32 {
        switch self {
        case .dynoRose: 0xE03365
        case .obsidian: 0xA78BFA
        case .midnight: 0xA1A1AA
        case .aurora: 0x38BDF8
        case .purpleSpace: 0xE879F9
        case .arctic: 0x38BDF8
        case .carbon: 0xCBD5E1
        case .cyberNeon: 0x00F0FF
        case .minimal: 0xA1A1AA
        case .glass: 0x818CF8
        case .forest: 0x34D399
        case .sunset: 0xFB923C
        case .rose: 0xFB7185
        }
    }

    var glow: Double {
        switch self {
        case .midnight: 0.22
        case .minimal: 0.4
        case .carbon: 0.55
        case .arctic: 0.32
        default: 1
        }
    }
}

enum Theme {
    static let accentKey = "ethone.accent"
    static let themeKey = "ethone.theme"
    static let defaultTheme = ThemePreset.dynoRose

    static var preset: ThemePreset {
        ThemePreset(rawValue: UserDefaults.standard.string(forKey: themeKey) ?? "") ?? defaultTheme
    }

    static var chosenAccentHex: UInt32? {
        let saved = UserDefaults.standard.integer(forKey: accentKey)
        return saved == 0 ? nil : UInt32(truncatingIfNeeded: saved)
    }

    static var currentAccentHex: UInt32 { chosenAccentHex ?? preset.accent }

    static var accent: Color { Color(hex: currentAccentHex) }
    static var base: Color { Color(hex: preset.base) }
    static let accentSoft = Color(hex: 0xFF5C8A)
    static let indigo = Color(hex: 0x2A2F6B)
    static let violet = Color(hex: 0x5B2A86)
    static let teal = Color(hex: 0x0E7C86)

    static let success = Color(hex: 0x34D399)
    static let warning = Color(hex: 0xFBBF24)
    static let danger = Color(hex: 0xF87171)

    static let cardRadius: CGFloat = 26
    static let pillRadius: CGFloat = 18

    static func luminance(_ hex: UInt32) -> Double {
        func channel(_ value: UInt32) -> Double {
            let v = Double(value) / 255
            return v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel((hex >> 16) & 0xFF) + 0.7152 * channel((hex >> 8) & 0xFF) + 0.0722 * channel(hex & 0xFF)
    }

    static func readableTint(_ hex: UInt32) -> UInt32 {
        var candidate = hex
        var step = 0
        while 1.05 / (luminance(candidate) + 0.05) < 4.5, step < 20 {
            step += 1
            let factor = 1 - Double(step) * 0.04
            func scaled(_ shift: UInt32) -> UInt32 { UInt32(Double((hex >> shift) & 0xFF) * factor) }
            candidate = (scaled(16) << 16) | (scaled(8) << 8) | scaled(0)
        }
        return candidate
    }
}

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

