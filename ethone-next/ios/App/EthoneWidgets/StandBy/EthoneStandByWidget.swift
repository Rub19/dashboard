import WidgetKit
import SwiftUI

@available(iOS 17.0, *)
struct EthoneStandByEntry: TimelineEntry {
    let date: Date
    let hour: String
    let dateText: String
    let weather: String
    let presence: String
    let nextGoal: String
}

@available(iOS 17.0, *)
struct StandByProvider: TimelineProvider {
    func placeholder(in context: Context) -> EthoneStandByEntry {
        EthoneStandByEntry(date: Date(), hour: "12:00", dateText: "22 août", weather: "18°C Ensoleillé", presence: "En ligne", nextGoal: "Réunion 14h")
    }

    func getSnapshot(in context: Context, completion: @escaping (EthoneStandByEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<EthoneStandByEntry>) -> Void) {
        let entry = makeEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: entry.date) ?? entry.date
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func makeEntry() -> EthoneStandByEntry {
        let now = Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        let hour = formatter.string(from: now)
        formatter.dateFormat = "d MMM"
        let dateText = formatter.string(from: now)

        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let weather = shared?.string(forKey: "ethone_weather") ?? "18°C Ensoleillé"
        let presence = shared?.string(forKey: "ethone_presence") ?? "En ligne"
        let nextGoal = shared?.string(forKey: "ethone_next_goal") ?? "Objectif du jour"

        return EthoneStandByEntry(date: now, hour: hour, dateText: dateText, weather: weather, presence: presence, nextGoal: nextGoal)
    }
}

@available(iOS 17.0, *)
struct EthoneStandByView: View {
    var entry: EthoneStandByEntry
    @Environment(\.widgetRenderingMode) var renderingMode
    @Environment(\.widgetContentMargins) var margins

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(.black)

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(entry.hour)
                        .font(.system(size: 72, weight: .thin, design: .rounded))
                        .minimumScaleFactor(0.5)
                    Text(entry.dateText)
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Label(entry.weather, systemImage: "sun.max.fill")
                        .font(.title2)
                    Label(entry.presence, systemImage: "person.fill")
                        .font(.title2)
                    Spacer()
                    Text(entry.nextGoal)
                        .font(.headline)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(margins)
        }
        .containerBackground(.clear, for: .widget)
    }
}

@available(iOS 17.0, *)
struct EthoneStandByWidget: Widget {
    let kind: String = "EthoneStandByWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StandByProvider()) { entry in
            EthoneStandByView(entry: entry)
        }
        .configurationDisplayName("ETHONE StandBy")
        .description("Vue chevet avec heure, météo et prochain objectif.")
        .supportedFamilies([.systemLarge])
    }
}
