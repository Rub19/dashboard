import SwiftUI

enum ActivityCategory: String, CaseIterable, Identifiable {
    case all = "Tous"
    case tasks = "Tâches"
    case notes = "Notes"
    case focus = "Focus"
    case habits = "Habitudes"
    case events = "Événements"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .all: "sparkles"
        case .tasks: "checklist"
        case .notes: "note.text"
        case .focus: "timer"
        case .habits: "flame.fill"
        case .events: "calendar"
        }
    }

    var tint: Color {
        switch self {
        case .all: Theme.accent
        case .tasks: Theme.accent
        case .notes: Theme.teal
        case .focus: Color(hex: 0xF59E0B)
        case .habits: Color(hex: 0xEF4444)
        case .events: Theme.violet
        }
    }
}

struct ActivityView: View {
    @Environment(AppModel.self) private var model
    @State private var selectedCategory: ActivityCategory = .all
    @State private var query = ""

    private struct Entry: Identifiable {
        let id: String
        let date: Date
        let title: String
        let detail: String
        let symbol: String
        let tint: Color
        let category: ActivityCategory
    }

    private var allEntries: [Entry] {
        var list: [Entry] = []
        for note in model.notes.items {
            list.append(Entry(id: "n-\(note.id)", date: note.updatedAt, title: note.title.isEmpty ? "Note sans titre" : note.title, detail: "Note modifiée", symbol: "note.text", tint: Theme.teal, category: .notes))
        }
        for task in model.tasks.items {
            list.append(Entry(id: "t-\(task.id)", date: task.updatedAt, title: task.title, detail: task.isDone ? "Tâche terminée" : "Tâche active", symbol: task.isDone ? "checkmark.circle.fill" : "checklist", tint: task.isDone ? Theme.success : Theme.accent, category: .tasks))
        }
        for event in model.events.items {
            list.append(Entry(id: "e-\(event.id)", date: event.updatedAt, title: event.title, detail: "Événement calendrier", symbol: "calendar", tint: Theme.violet, category: .events))
        }
        for session in model.focus.sessions {
            let label = session.goal?.isEmpty == false ? session.goal! : (FocusPreset(rawValue: session.preset)?.label ?? session.preset)
            list.append(Entry(id: "f-\(session.id)", date: session.completedAt, title: label, detail: "Focus · \(session.duration / 60) min", symbol: "timer", tint: Color(hex: 0xF59E0B), category: .focus))
        }
        for habit in model.habits.activeHabits {
            let streak = model.habits.streak(habit)
            let isDoneToday = model.habits.isDone(habit)
            if isDoneToday || streak > 0 {
                list.append(Entry(id: "h-\(habit.id)", date: habit.createdAt, title: "\(habit.emoji ?? "🎯") \(habit.name)", detail: isDoneToday ? "Habitude validée aujourd'hui (série \(streak) j)" : "Série active de \(streak) j", symbol: "flame.fill", tint: Color(hex: 0xEF4444), category: .habits))
            }
        }
        return list.sorted { $0.date > $1.date }
    }

    private var filteredEntries: [Entry] {
        let base = selectedCategory == .all ? allEntries : allEntries.filter { $0.category == selectedCategory }
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { return base }
        let q = query.localizedLowercase
        return base.filter { $0.title.localizedLowercase.contains(q) || $0.detail.localizedLowercase.contains(q) }
    }

    var body: some View {
        List {
            Section {
                metricsGrid
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section {
                categoryFilterRow
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                    .listRowBackground(Color.clear)
            }

            Section {
                ForEach(filteredEntries.prefix(80)) { entry in
                    HStack(spacing: 14) {
                        Image(systemName: entry.symbol)
                            .foregroundStyle(entry.tint)
                            .frame(width: 36, height: 36)
                            .glassEffect(Glass.regular.tint(entry.tint.opacity(0.18)), in: .circle)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(entry.title).font(.subheadline.weight(.medium)).lineLimit(1)
                            Text(entry.detail).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(entry.date, format: .relative(presentation: .named)).font(.caption2).foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 2)
                    .listRowBackground(GlassRowBackground())
                }
            } header: {
                Text("Flux d'activité · \(filteredEntries.count)").sectionTitle()
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if filteredEntries.isEmpty {
                ContentUnavailableView(
                    query.isEmpty ? "Aucune activité" : "Aucun résultat",
                    systemImage: "waveform.path.ecg",
                    description: Text(query.isEmpty ? "Votre journal d'activité apparaîtra ici au fil de vos actions." : "Aucune entrée ne correspond à votre recherche.")
                )
            }
        }
        .searchable(text: $query, prompt: "Rechercher dans l'activité")
        .navigationTitle("Activité")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await model.refreshAll() }
        .task { await model.refreshAll() }
    }

    private var metricsGrid: some View {
        let totalDoneTasks = model.tasks.items.filter(\.isDone).count
        let totalFocusMinutes = model.focus.minutesToday
        let habitsCompletedToday = model.habits.activeHabits.filter { model.habits.isDone($0) }.count

        return GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                metricCell(value: "\(allEntries.count)", label: "Actions", symbol: "waveform.path.ecg", tint: Theme.accent)
                metricCell(value: "\(totalDoneTasks)", label: "Tâches faites", symbol: "checkmark.circle.fill", tint: Theme.success)
                metricCell(value: "\(totalFocusMinutes)m", label: "Focus ajd.", symbol: "timer", tint: Color(hex: 0xF59E0B))
                metricCell(value: "\(habitsCompletedToday)", label: "Habitudes ajd.", symbol: "flame.fill", tint: Color(hex: 0xEF4444))
            }
        }
    }

    private func metricCell(value: String, label: String, symbol: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: symbol).font(.caption).foregroundStyle(tint)
            Text(value).font(.system(size: 17, weight: .bold, design: .rounded))
            Text(label).font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(Glass.regular.tint(tint.opacity(0.12)), in: .rect(cornerRadius: 14))
    }

    private var categoryFilterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ActivityCategory.allCases) { cat in
                    Button {
                        selectedCategory = cat
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: cat.symbol)
                            Text(cat.rawValue)
                        }
                        .font(.caption.weight(selectedCategory == cat ? .semibold : .regular))
                        .foregroundStyle(selectedCategory == cat ? .primary : .secondary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .glassEffect(selectedCategory == cat ? Glass.regular.tint(cat.tint.opacity(0.35)) : Glass.regular.tint(nil), in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
