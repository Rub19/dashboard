import SwiftUI

/// Carte Liquid Glass (iOS 26) : le verre réfracte l'arrière-plan ambiant derrière lui.
struct GlassCard<Content: View>: View {
    var tint: Color? = nil
    var padding: CGFloat = 16
    var cornerRadius: CGFloat = Theme.cardRadius
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(Glass.regular.tint(tint), in: .rect(cornerRadius: cornerRadius))
    }
}

/// Pastille de verre (statuts, compteurs).
struct GlassPill: View {
    let text: String
    var systemImage: String? = nil
    var tint: Color? = nil

    var body: some View {
        HStack(spacing: 6) {
            if let systemImage { Image(systemName: systemImage) }
            Text(text)
        }
        .font(.footnote.weight(.semibold))
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .glassEffect(Glass.regular.tint(tint), in: .capsule)
    }
}

/// Fond ambiant : dégradé maillé sombre qui dérive lentement, pour donner de la profondeur au verre.
struct AmbientBackground: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            let drift = Float(sin(t / 9) * 0.06)
            let drift2 = Float(cos(t / 11) * 0.06)
            MeshGradient(
                width: 3,
                height: 3,
                points: [
                    SIMD2<Float>(0, 0), SIMD2<Float>(0.5 + drift, 0), SIMD2<Float>(1, 0),
                    SIMD2<Float>(0, 0.5 + drift2), SIMD2<Float>(0.5 - drift, 0.5 + drift), SIMD2<Float>(1, 0.5 - drift2),
                    SIMD2<Float>(0, 1), SIMD2<Float>(0.5 + drift2, 1), SIMD2<Float>(1, 1),
                ],
                colors: [
                    Theme.night, Theme.indigo.opacity(0.85), Theme.night,
                    Theme.violet.opacity(0.75), Theme.accent.opacity(0.35), Theme.teal.opacity(0.55),
                    Theme.night, Theme.indigo.opacity(0.6), Theme.night,
                ]
            )
        }
        .ignoresSafeArea()
        .overlay(Color.black.opacity(0.25).ignoresSafeArea())
    }
}

extension View {
    /// Titre de section discret utilisé dans les listes en verre.
    func sectionTitle() -> some View {
        self.font(.footnote.weight(.semibold)).foregroundStyle(.secondary).textCase(.uppercase)
    }
}

/// Avatar rond (photo Discord/Google ou initiale) avec pastille de présence.
struct AvatarView: View {
    let url: URL?
    let name: String
    var size: CGFloat = 44
    var status: PresenceStatus? = nil

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Group {
                if let url {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image { image.resizable().scaledToFill() } else { initial }
                    }
                } else {
                    initial
                }
            }
            .frame(width: size, height: size)
            .clipShape(Circle())

            if let status {
                Circle()
                    .fill(status.color)
                    .frame(width: size * 0.28, height: size * 0.28)
                    .overlay(Circle().stroke(Theme.night, lineWidth: 2))
            }
        }
    }

    private var initial: some View {
        ZStack {
            Circle().fill(Theme.accent.gradient)
            Text(String(name.prefix(1)).uppercased()).font(.system(size: size * 0.42, weight: .bold)).foregroundStyle(.white)
        }
    }
}

extension View {
    /// Fond ambiant pour un écran de navigation : le verre a quelque chose à réfracter (sinon le fond reste noir uni).
    func ethoneScreen() -> some View {
        containerBackground(for: .navigation) { AmbientBackground() }
    }
}
