import SwiftUI
import UIKit

/// Couleur d'accentuation d'E:VAL, choisie dans ses Paramètres (rouge VALPAW par défaut).
enum EvalAccent {
    static let key = "eval.accentHex"
    static let defaultHex: UInt32 = 0xFD5B68

    nonisolated static var hex: UInt32 {
        let stored = UserDefaults.standard.object(forKey: key) as? Int
        return stored.map { UInt32(truncatingIfNeeded: $0) } ?? defaultHex
    }

    nonisolated static var color: Color { Color(hex: hex) }

    static func hex(of color: Color) -> UInt32 {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        let c = { (v: CGFloat) in UInt32(max(0, min(255, (v * 255).rounded()))) }
        return c(r) << 16 | c(g) << 8 | c(b)
    }
}
