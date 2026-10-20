import SwiftUI

/// Icône des titres de joueur (valorant-api n'en fournit pas) : ruban avec le monogramme Ethone.
struct EvalTitleBadge: View {
    var size: CGFloat = 64

    var body: some View {
        ZStack {
            RibbonTails()
                .fill(Color(hex: 0x636366))
            RibbonPlate()
                .fill(LinearGradient(colors: [Color(hex: 0xAEAEB2), Color(hex: 0x8E8E93)], startPoint: .top, endPoint: .bottom))
            EthoneMonogramShape()
                .stroke(Color(hex: 0x1C1C1E), style: StrokeStyle(lineWidth: max(size * 0.06, 2), lineCap: .round, lineJoin: .round))
                .frame(width: size * 0.26, height: size * 0.26)
        }
        .frame(width: size, height: size * 0.7)
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// Plaque centrale du ruban, coins biseautés.
private struct RibbonPlate: Shape {
    func path(in r: CGRect) -> Path {
        let x0 = r.minX + r.width * 0.2, x1 = r.minX + r.width * 0.8
        let y0 = r.minY + r.height * 0.1, y1 = r.maxY - r.height * 0.06
        let cut = r.width * 0.06
        var p = Path()
        p.move(to: CGPoint(x: x0 + cut, y: y0))
        p.addLine(to: CGPoint(x: x1 - cut, y: y0))
        p.addLine(to: CGPoint(x: x1, y: y0 + cut))
        p.addLine(to: CGPoint(x: x1, y: y1 - cut))
        p.addLine(to: CGPoint(x: x1 - cut, y: y1))
        p.addLine(to: CGPoint(x: x0 + cut, y: y1))
        p.addLine(to: CGPoint(x: x0, y: y1 - cut))
        p.addLine(to: CGPoint(x: x0, y: y0 + cut))
        p.closeSubpath()
        return p
    }
}

/// Deux queues de ruban à encoche, derrière la plaque.
private struct RibbonTails: Shape {
    func path(in r: CGRect) -> Path {
        let top = r.minY + r.height * 0.3, bottom = r.maxY - r.height * 0.18
        let mid = (top + bottom) / 2
        var p = Path()
        // Gauche
        p.move(to: CGPoint(x: r.minX, y: top))
        p.addLine(to: CGPoint(x: r.minX + r.width * 0.3, y: top))
        p.addLine(to: CGPoint(x: r.minX + r.width * 0.3, y: bottom))
        p.addLine(to: CGPoint(x: r.minX, y: bottom))
        p.addLine(to: CGPoint(x: r.minX + r.width * 0.09, y: mid))
        p.closeSubpath()
        // Droite
        p.move(to: CGPoint(x: r.maxX, y: top))
        p.addLine(to: CGPoint(x: r.maxX - r.width * 0.3, y: top))
        p.addLine(to: CGPoint(x: r.maxX - r.width * 0.3, y: bottom))
        p.addLine(to: CGPoint(x: r.maxX, y: bottom))
        p.addLine(to: CGPoint(x: r.maxX - r.width * 0.09, y: mid))
        p.closeSubpath()
        return p
    }
}
