import SwiftUI
import WidgetKit

struct SummaryEntry: TimelineEntry {
    let date: Date
    let snapshot: SharedSnapshot
    var isEmpty: Bool { snapshot.updatedAt == .distantPast }
}

struct SummaryProvider: TimelineProvider {
    func placeholder(in context: Context) -> SummaryEntry {
        SummaryEntry(date: .now, snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (SummaryEntry) -> Void) {
        completion(SummaryEntry(date: .now, snapshot: SharedSnapshot.load() ?? .empty))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SummaryEntry>) -> Void) {
        let entry = SummaryEntry(date: .now, snapshot: SharedSnapshot.load() ?? .empty)
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

struct SummaryWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SummaryEntry

    private var snapshot: SharedSnapshot { entry.snapshot }
    private var habitProgress: Double {
        snapshot.habitsTotal == 0 ? 0 : Double(snapshot.habitsDone) / Double(snapshot.habitsTotal)
    }

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: habitProgress) {
                Image(systemName: "flame.fill")
            } currentValueLabel: {
                Text("\(snapshot.habitsDone)")
            }
            .gaugeStyle(.accessoryCircular)
            .widgetURL(URL(string: "ethone://habits"))
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 2) {
                Text("ETHONE").font(.caption.bold())
                Text(entry.isEmpty ? "Ouvrez l'app" : "\(snapshot.openTaskCount) tâche(s) ouverte(s)")
                Text(entry.isEmpty ? "" : "\(snapshot.habitsDone)/\(snapshot.habitsTotal) habitudes")
            }
            .widgetURL(URL(string: "ethone://tasks"))
        case .accessoryInline:
            Text(entry.isEmpty ? "ETHONE" : "\(snapshot.openTaskCount) tâches · \(snapshot.habitsDone)/\(snapshot.habitsTotal) habitudes")
        case .systemMedium:
            HStack(alignment: .top, spacing: 16) {
                summary
                VStack(alignment: .leading, spacing: 6) {
                    Text("À faire").font(.caption.bold()).foregroundStyle(.secondary)
                    if snapshot.nextTasks.isEmpty {
                        Text(entry.isEmpty ? "Ouvrez ETHONE pour synchroniser." : "Rien à faire. 🎉").font(.subheadline).foregroundStyle(.secondary)
                    } else {
                        ForEach(snapshot.nextTasks, id: \.self) { title in
                            Label(title, systemImage: "circle").font(.subheadline).lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .widgetURL(URL(string: "ethone://tasks"))
        default:
            summary.widgetURL(URL(string: "ethone://home"))
        }
    }

    private var summary: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("ETHONE", systemImage: "sparkles").font(.caption.bold()).foregroundStyle(.secondary)
            Spacer(minLength: 0)
            Text(entry.isEmpty ? "—" : "\(snapshot.openTaskCount)")
                .font(.system(size: 40, weight: .bold, design: .rounded))
            Text("tâches ouvertes").font(.caption).foregroundStyle(.secondary)
            if !entry.isEmpty {
                Label("\(snapshot.habitsDone)/\(snapshot.habitsTotal) habitudes", systemImage: "flame.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SummaryWidget: Widget {
    let kind = "EthoneSummary"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SummaryProvider()) { entry in
            SummaryWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    LinearGradient(colors: [Color(red: 0.05, green: 0.06, blue: 0.10), Color(red: 0.16, green: 0.10, blue: 0.30)], startPoint: .topLeading, endPoint: .bottomTrailing)
                }
        }
        .configurationDisplayName("Résumé ETHONE")
        .description("Tâches ouvertes, habitudes du jour et prochaines tâches.")
        .supportedFamilies(Self.families)
    }

    private static var families: [WidgetFamily] {
        var list: [WidgetFamily] = [.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline]
        #if compiler(>=6.4)
        if #available(iOS 27.0, *) { list.append(.systemExtraLargePortrait) }
        #endif
        return list
    }
}
