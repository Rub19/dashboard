import SwiftUI

struct BrandMarkView: View {
    var size: CGFloat = 48

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(hex: 0x8B5CF6),
                            Color(hex: 0x38BDF8),
                            Color(hex: 0x34D399),
                            Color(hex: 0xE11D48)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: Color(hex: 0x8B5CF6).opacity(0.35), radius: size * 0.12, y: size * 0.04)

            RoundedRectangle(cornerRadius: size * 0.26, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color(hex: 0x181822), Color(hex: 0x101018), Color(hex: 0x08080C)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: max(size - 3, 2), height: max(size - 3, 2))

            EthoneGlassArc()
                .fill(Color.white.opacity(0.05))
                .frame(width: max(size - 3, 2), height: max(size - 3, 2))

            EthoneMonogramShape()
                .stroke(
                    Color.white,
                    style: StrokeStyle(lineWidth: max(size * 0.08, 2), lineCap: .round, lineJoin: .round)
                )
                .frame(width: size * 0.44, height: size * 0.44)
        }
    }
}

struct EthoneMonogramShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))

        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))

        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.72, y: rect.midY))

        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        return path
    }
}

struct EthoneGlassArc: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        path.move(to: CGPoint(x: w * 0.08, y: h * 0.28))
        path.addQuadCurve(
            to: CGPoint(x: w * 0.92, y: h * 0.28),
            control: CGPoint(x: w * 0.5, y: h * 0.42)
        )
        path.addLine(to: CGPoint(x: w * 0.92, y: h * 0.15))
        path.addQuadCurve(
            to: CGPoint(x: w * 0.08, y: h * 0.15),
            control: CGPoint(x: w * 0.5, y: h * 0.05)
        )
        path.closeSubpath()
        return path
    }
}
