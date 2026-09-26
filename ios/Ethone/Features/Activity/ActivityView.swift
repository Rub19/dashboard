import SwiftUI

/// Fil d'activité : dernières notes, tâches, événements et sessions de focus (données réelles, triées par date).
struct ActivityView: View {
    @Environment(AppModel.self) private var model

    private struct Entry: Identifiable {
        let id: String
        let date: Date
        let title: String
        let detail: String
        let symbol: String
        let tint: Color
    }

    private var entries: [Entry] {
        var list: [Entry] = []
        for note in model.notes.items {
            list.append(Entry(id: "n-\(note.id)", date: note.updatedAt, title: note.title, detail: "Note modifiée", symbol: "note.text", tint: Theme.teal))
        }
        for task in model.tasks.items {
            list.append(Entry(id: "t-\(task.id)", date: task.updatedAt, title: task.title, detail: task.isDone ? "Tâche terminée" : "Tâche mise à jour", symbol: task.isDone ? "checkmark.circle.fill" : "checklist", tint: task.isDone ? Theme.success : Theme.accent))
        }
        for event in model.events.items {
            list.append(Entry(id: "e-\(event.id)", date: event.updatedAt, title: event.title, detail: "Événement", symbol: "calendar", tint: Theme.violet))
        }
        for session in model.focus.sessions {
            let label = session.goal?.isEmpty == false ? session.goal! : (FocusPreset(rawValue: session.preset)?.label ?? session.preset)
            list.append(Entry(id: "f-\(session.id)", date: session.completedAt, title: label, detail: "Focus · \(session.duration / 60) min", symbol: "timer", tint: Color(hex: 0xF59E0B)))
        }
        return list.sorted { $0.date > $1.date }.prefix(60).map { $0 }
    }

    var body: some View {
        List {
            ForEach(entries) { entry in
                HStack(spacing: 14) {
                    Image(systemName: entry.symbol)
                        .foregroundStyle(entry.tint)
                        .frame(width: 34, height: 34)
                        .glassEffect(Glass.regular.tint(entry.tint.opacity(0.2)), in: .circle)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(entry.title).lineLimit(1)
                        Text(entry.detail).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(entry.date, format: .relative(presentation: .named)).font(.caption).foregroundStyle(.tertiary)
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if entries.isEmpty {
                ContentUnavailableView("Rien pour l'instant", systemImage: "waveform.path.ecg", description: Text("Votre activité apparaîtra ici."))
            }
        }
        .navigationTitle("Activité")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refreshAll() }
        .task { await model.refreshAll() }
    }
}
