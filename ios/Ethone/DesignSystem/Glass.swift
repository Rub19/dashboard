import SwiftUI

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

struct AmbientBackground: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let preset = model.themePreset
        let base = Color(hex: preset.base)
        let accent = Color(hex: model.accentHex)
        let secondary = Color(hex: preset.secondary)
        let glow = preset.glow
        let tint = preset.isLight ? 0.16 : 0.34
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
                    base, base.mix(with: secondary, by: tint * 0.9 * glow), base,
                    base.mix(with: accent, by: tint * 0.8 * glow), base.mix(with: accent, by: tint * 1.1 * glow), base.mix(with: secondary, by: tint * 0.7 * glow),
                    base, base.mix(with: accent, by: tint * 0.5 * glow), base,
                ]
            )
        }
        .ignoresSafeArea()
        .overlay((preset.isLight ? Color.white.opacity(0.15) : Color.black.opacity(0.25)).ignoresSafeArea())
    }
}

extension View {
    func sectionTitle() -> some View {
        self.font(.footnote.weight(.semibold)).foregroundStyle(.secondary).textCase(.uppercase)
    }
}

struct AvatarView: View {
    let url: URL?
    let name: String
    var size: CGFloat = 44
    var status: PresenceStatus? = nil

    init(url: URL?, name: String, size: CGFloat = 44, status: PresenceStatus? = nil) {
        self.url = url
        self.name = name
        self.size = size
        self.status = status
    }

    init(urlString: String?, name: String, size: CGFloat = 44, status: PresenceStatus? = nil) {
        if let trimmed = urlString?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty {
            if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
                self.url = URL(string: trimmed)
            } else {
                let clean = trimmed.hasPrefix("/") ? trimmed : "/" + trimmed
                self.url = URL(string: "https://ethone.dev" + clean)
            }
        } else {
            self.url = nil
        }
        self.name = name
        self.size = size
        self.status = status
    }

    private var resolvedURL: URL? {
        guard let url else { return nil }
        if let scheme = url.scheme, !scheme.isEmpty, url.host != nil {
            return url
        }
        let raw = url.absoluteString
        let clean = raw.hasPrefix("/") ? raw : "/" + raw
        return URL(string: "https://ethone.dev" + clean)
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Group {
                if let resolvedURL {
                    AsyncImage(url: resolvedURL) { phase in
                        if let image = phase.image {
                            image.resizable().scaledToFill()
                        } else {
                            initial
                        }
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
                    .overlay(Circle().stroke(Theme.base, lineWidth: 2))
            }
        }
    }

    private var initial: some View {
        ZStack {
            Circle().fill(Color(hex: Theme.readableTint(Theme.currentAccentHex)).gradient)
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: size * 0.42, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}

extension View {
    func ethoneScreen() -> some View {
        containerBackground(for: .navigation) { AmbientBackground() }
    }
}

