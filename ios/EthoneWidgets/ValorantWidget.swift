import SwiftUI
import WidgetKit

struct ValorantEntry: TimelineEntry {
    let date: Date
    let snapshot: ValorantWidgetSnapshot?
}

struct ValorantProvider: TimelineProvider {
    func placeholder(in context: Context) -> ValorantEntry { ValorantEntry(date: .now, snapshot: nil) }

    func getSnapshot(in context: Context, completion: @escaping (ValorantEntry) -> Void) {
        completion(ValorantEntry(date: .now, snapshot: ValorantWidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ValorantEntry>) -> Void) {
        let snapshot = ValorantWidgetSnapshot.load()
        let next = min(snapshot?.offersEnd ?? .distantFuture, Date().addingTimeInterval(30 * 60))
        completion(Timeline(entries: [ValorantEntry(date: .now, snapshot: snapshot)], policy: .after(next)))
    }
}

private let valorantRed = Color(red: 1.0, green: 0.27, blue: 0.33)

private func color(_ hex: UInt32) -> Color {
    Color(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
}

struct ValorantWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ValorantEntry

    var body: some View {
        if let snapshot = entry.snapshot {
            switch family {
            case .accessoryCircular:
                Gauge(value: snapshot.battlepassProgress) { Text("BP") } currentValueLabel: { Text("\(snapshot.battlepassLevel)") }
                    .gaugeStyle(.accessoryCircular)
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    Text(snapshot.rankName).font(.headline)
                    Text("\(snapshot.rr) RR · Passe \(snapshot.battlepassLevel)/\(snapshot.battlepassMax)").font(.caption)
                }
            case .systemMedium:
                HStack(spacing: 14) {
                    rank(snapshot)
                    Divider().overlay(.white.opacity(0.15))
                    store(snapshot)
                }
            default:
                rank(snapshot)
            }
        } else {
            VStack(spacing: 6) {
                Image(systemName: "scope").font(.title2).foregroundStyle(valorantRed)
                Text("Ouvrez E:VAL").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func rank(_ snapshot: ValorantWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if let data = snapshot.rankIcon, let image = UIImage(data: data) {
                    Image(uiImage: image).resizable().scaledToFit().frame(width: 44, height: 44)
                }
                Spacer()
                Text("E:VAL").font(.caption2.weight(.heavy)).foregroundStyle(valorantRed)
            }
            Text(snapshot.rankName.uppercased()).font(.system(size: 15, weight: .heavy)).foregroundStyle(color(snapshot.rankColor)).lineLimit(1).minimumScaleFactor(0.7)
            Text("\(snapshot.rr) RR").font(.caption.weight(.semibold)).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            ProgressView(value: snapshot.battlepassProgress).tint(valorantRed)
            Text("Passe \(snapshot.battlepassLevel)/\(snapshot.battlepassMax)").font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func store(_ snapshot: ValorantWidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text("Boutique").font(.caption.weight(.bold))
                Spacer()
                if let end = snapshot.offersEnd, end > .now {
                    Text(timerInterval: Date.now...end, countsDown: true).font(.caption2.monospacedDigit()).foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }
            ForEach(snapshot.offers.prefix(4), id: \.self) { offer in
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 2).fill(color(offer.colorHex)).frame(width: 3, height: 14)
                    Text(offer.name).font(.caption2).lineLimit(1)
                    Spacer(minLength: 4)
                    Text("\(offer.price)").font(.caption2.monospacedDigit()).foregroundStyle(.secondary)
                }
            }
            if snapshot.offers.isEmpty {
                Text("Boutique indisponible").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

struct ValorantWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ValorantWidget", provider: ValorantProvider()) { entry in
            ValorantWidgetView(entry: entry)
                .containerBackground(for: .widget) { EthoneWidgetBackground(accent: valorantRed) }
                .widgetURL(URL(string: "ethone://valorant"))
        }
        .configurationDisplayName("E:VAL")
        .description("Rang, passe de combat et boutique du jour.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}
