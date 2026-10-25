import SwiftUI

@MainActor
enum EvalMapCalibration {
    struct Entry: Codable, Hashable {
        let icon: String
        let xMultiplier: Double
        let yMultiplier: Double
        let xScalarToAdd: Double
        let yScalarToAdd: Double

        func point(_ pos: EvalMatch.Pos, in size: CGSize) -> CGPoint {
            CGPoint(x: (pos.y * xMultiplier + xScalarToAdd) * size.width,
                    y: (pos.x * yMultiplier + yScalarToAdd) * size.height)
        }
    }

    struct Store: Codable {
        let fetchedAt: Date
        let maps: [String: Entry]
    }

    static func entry(mapId: String) async -> Entry? {
        let key = "valorant-api.map-calibration"
        let id = mapId.lowercased()
        if let cached = DiskCache.read(Store.self, key: key), Date().timeIntervalSince(cached.fetchedAt) < 86400 * 7, let hit = cached.maps[id] {
            return hit
        }
        struct Page: Decodable { let data: [GameMap] }
        struct GameMap: Decodable {
            let uuid: String
            let displayIcon: String?
            let xMultiplier: Double?
            let yMultiplier: Double?
            let xScalarToAdd: Double?
            let yScalarToAdd: Double?
        }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/maps")!),
              let page = try? JSONDecoder().decode(Page.self, from: data) else { return nil }
        let maps = Dictionary(page.data.compactMap { m -> (String, Entry)? in
            guard let icon = m.displayIcon, let xm = m.xMultiplier, let ym = m.yMultiplier, xm != 0, ym != 0 else { return nil }
            return (m.uuid.lowercased(), Entry(icon: icon, xMultiplier: xm, yMultiplier: ym, xScalarToAdd: m.xScalarToAdd ?? 0, yScalarToAdd: m.yScalarToAdd ?? 0))
        }, uniquingKeysWith: { a, _ in a })
        DiskCache.write(Store(fetchedAt: Date(), maps: maps), key: key)
        return maps[id]
    }
}

struct EvalKillMapView: View {
    let match: EvalMatch
    let focusPUUID: String

    @State private var round = 0
    @State private var calibration: EvalMapCalibration.Entry?
    @State private var loading = true

    private static let allyColor = Color(hex: 0x34D399)
    private static let enemyColor = Color(hex: 0xFD4556)

    private var hasPositions: Bool { match.kills.contains { $0.vp != nil } }
    private var focusTeam: String { match.player(focusPUUID)?.team ?? "" }
    private var roundNumbers: [Int] {
        let fromRounds = match.rounds.map(\.n)
        return fromRounds.isEmpty ? Array(Set(match.kills.map(\.r))).sorted() : fromRounds
    }
    private var shownKills: [EvalMatch.Kill] {
        match.kills.filter { $0.vp != nil && (round == 0 || $0.r == round) }
    }

    private func isAllyKill(_ kill: EvalMatch.Kill) -> Bool {
        match.player(kill.k)?.team == focusTeam
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !hasPositions {
                Label("La carte des kills n'est disponible que pour les matchs chargés depuis ton compte Riot.", systemImage: "map")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Picker("Manche", selection: $round) {
                    Text("Toutes les manches").tag(0)
                    ForEach(roundNumbers, id: \.self) { n in
                        Text("Manche \(n)").tag(n)
                    }
                }
                .pickerStyle(.menu)

                mapCanvas

                HStack(spacing: 16) {
                    legend(Self.allyColor, "Kills alliés")
                    legend(Self.enemyColor, "Kills ennemis")
                    Spacer()
                    Text("\(shownKills.count) kill\(shownKills.count > 1 ? "s" : "")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .task(id: match.mapId) {
            guard hasPositions, !match.mapId.isEmpty else { loading = false; return }
            loading = true
            calibration = await EvalMapCalibration.entry(mapId: match.mapId)
            loading = false
        }
    }

    @ViewBuilder
    private var mapCanvas: some View {
        if let c = calibration, let url = URL(string: c.icon) {
            let marks = shownKills.compactMap { kill -> (vp: EvalMatch.Pos, kp: EvalMatch.Pos?, color: Color)? in
                guard let vp = kill.vp else { return nil }
                return (vp, kill.kp, isAllyKill(kill) ? Self.allyColor : Self.enemyColor)
            }
            AsyncImage(url: url) { phase in
                if let image = phase.image {
                    image.resizable().scaledToFit()
                } else {
                    Color.clear
                }
            }
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                Canvas { context, size in
                    for mark in marks {
                        let color = mark.color
                        let victim = c.point(mark.vp, in: size)
                        if let kp = mark.kp {
                            let killer = c.point(kp, in: size)
                            var line = Path()
                            line.move(to: killer)
                            line.addLine(to: victim)
                            context.stroke(line, with: .color(color.opacity(0.55)), lineWidth: 1)
                            context.fill(Path(ellipseIn: CGRect(x: killer.x - 2.5, y: killer.y - 2.5, width: 5, height: 5)), with: .color(color.opacity(0.7)))
                        }
                        let dot = Path(ellipseIn: CGRect(x: victim.x - 5, y: victim.y - 5, width: 10, height: 10))
                        context.fill(dot, with: .color(color))
                        context.stroke(dot, with: .color(.black.opacity(0.6)), lineWidth: 1)
                    }
                }
                .allowsHitTesting(false)
            }
            .background(EvalColors.card2, in: RoundedRectangle(cornerRadius: 12))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        } else if loading {
            ProgressView()
                .frame(maxWidth: .infinity, minHeight: 200)
        } else {
            Text("Impossible de charger la carte.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, minHeight: 120)
        }
    }

    private func legend(_ color: Color, _ title: String) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
    }
}
