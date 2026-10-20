import SwiftUI
import UIKit

/// Couleurs d'E:VAL qui suivent le thème choisi (Système / Sombre / Clair).
enum EvalColors {
    private static func dynamic(dark: UInt32, light: UInt32) -> Color {
        Color(UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        })
    }

    /// Fond des écrans.
    static let background = dynamic(dark: 0x000000, light: 0xF2F2F7)
    /// Cartes et listes.
    static let card = dynamic(dark: 0x1C1C1E, light: 0xFFFFFF)
    /// Éléments posés sur une carte (puces, tuiles, feuilles).
    static let card2 = dynamic(dark: 0x2C2C2E, light: 0xE5E5EA)
    /// Texte principal.
    static let text = dynamic(dark: 0xFFFFFF, light: 0x000000)
}

enum EvalTheme: String, CaseIterable, Identifiable {
    case system, dark, light

    static let key = "eval.theme"
    var id: String { rawValue }

    var label: String {
        switch self {
        case .system: "Système"
        case .dark: "Sombre"
        case .light: "Clair"
        }
    }

    var scheme: ColorScheme? {
        switch self {
        case .system: nil
        case .dark: .dark
        case .light: .light
        }
    }
}

/// Plateforme de jeu : PC ou console (PlayStation et Xbox partagent les classements console).
enum EvalPlatform: String, CaseIterable, Identifiable {
    case pc, playstation, xbox

    static let key = "eval.platform"
    var id: String { rawValue }

    var label: String {
        switch self {
        case .pc: "PC"
        case .playstation: "PlayStation"
        case .xbox: "Xbox"
        }
    }

    var icon: String {
        switch self {
        case .pc: "desktopcomputer"
        case .playstation: "logo.playstation"
        case .xbox: "logo.xbox"
        }
    }

    /// Valeur attendue par l'API (classement, matchs).
    var apiValue: String { self == .pc ? "pc" : "console" }
}

extension View {
    /// Applique le thème E:VAL enregistré.
    func evalColorScheme() -> some View { modifier(EvalColorSchemeModifier()) }
}

private struct EvalColorSchemeModifier: ViewModifier {
    @AppStorage(EvalTheme.key) private var theme = EvalTheme.system.rawValue

    func body(content: Content) -> some View {
        content.preferredColorScheme((EvalTheme(rawValue: theme) ?? .system).scheme)
    }
}
