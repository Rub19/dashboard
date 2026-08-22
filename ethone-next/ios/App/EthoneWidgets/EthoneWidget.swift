import WidgetKit
import SwiftUI
import AppIntents

struct EthoneWidgetEntry: TimelineEntry {
    let date: Date
    let tasksCount: Int
    let presence: String
    let aura: String
    let noteTitle: String
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> EthoneWidgetEntry {
        EthoneWidgetEntry(date: Date(), tasksCount: 0, presence: "En ligne", aura: "classic", noteTitle: "Bienvenue dans ETHONE")
    }

    func snapshot(for configuration: EthoneWidgetConfigIntent, in context: Context) async -> EthoneWidgetEntry {
        EthoneWidgetEntry(date: Date(), tasksCount: 3, presence: "En ligne", aura: "classic", noteTitle: "Note rapide")
    }

    func timeline(for configuration: EthoneWidgetConfigIntent, in context: Context) async -> Timeline<EthoneWidgetEntry> {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        let tasksCount = shared?.integer(forKey: "ethone_tasks_pending") ?? 0
        let presence = shared?.string(forKey: "ethone_presence") ?? "En ligne"
        let aura = shared?.string(forKey: "ethone_aura") ?? "classic"
        let note = shared?.string(forKey: "ethone_last_note") ?? ""

        let entry = EthoneWidgetEntry(
            date: Date(),
            tasksCount: tasksCount,
            presence: presence,
            aura: aura,
            noteTitle: note
        )

        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

struct EthoneWidgetView: View {
    var entry: EthoneWidgetEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        case .systemLarge:
            largeView
        default:
            smallView
        }
    }

    var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.accentColor)
                Text("\(entry.tasksCount)")
                    .font(.title2.bold())
            }
            Text(entry.presence)
                .font(.caption)
                .lineLimit(1)
        }
        .padding()
    }

    var mediumView: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading) {
                Label("\(entry.tasksCount) tâches", systemImage: "checkmark.circle")
                Text(entry.presence)
                    .font(.caption)
                Text(entry.aura)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing) {
                Label("Note", systemImage: "doc.text")
                Text(entry.noteTitle)
                    .font(.caption)
                    .lineLimit(2)
            }
        }
        .padding()
    }

    var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "doc.text")
                    .font(.title2)
                    .foregroundColor(.accentColor)
                Text(entry.noteTitle)
                    .font(.headline)
                    .lineLimit(1)
            }
            Text("Appuyez pour ajouter une note")
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            HStack {
                Label("\(entry.tasksCount) restantes", systemImage: "checkmark.circle")
                Spacer()
                Text(entry.presence)
                    .font(.caption)
            }
        }
        .padding()
    }
}

struct EthoneWidget: Widget {
    let kind: String = "EthoneWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: EthoneWidgetConfigIntent.self,
            provider: Provider()
        ) { entry in
            EthoneWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("ETHONE")
        .description("Aperçu rapide de vos tâches et notes.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct EthoneWidgetConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "ETHONE Widget"
    static var description = IntentDescription("Configure l'affichage du widget ETHONE.")

    @Parameter(title: "Vue", default: "récap")
    var view: String?
}
