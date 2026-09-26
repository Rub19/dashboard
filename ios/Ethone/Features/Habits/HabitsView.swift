import SwiftUI

struct HabitsView: View {
    @Environment(AppModel.self) private var model
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            List {
                if let message = model.habits.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
                }
                ForEach(model.habits.activeHabits) { habit in
                    HabitRow(habit: habit)
                        .listRowBackground(GlassRowBackground())
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                NotificationManager.cancelHabit(id: habit.id)
                                Task { await model.habits.delete(habit) }
                            } label: { Label("Supprimer", systemImage: "trash") }
                        }
                }
                .ethoneReorderable()
            }
            .ethoneReorderContainer(for: Habit.self) { sources, before in
                model.habits.move(sources, before: before)
            }
            .scrollContentBackground(.hidden)
            .overlay {
                if model.habits.activeHabits.isEmpty && !model.habits.isLoading {
                    ContentUnavailableView("Aucune habitude", systemImage: "flame", description: Text("Ajoutez une habitude pour suivre vos séries."))
                }
            }
            .refreshable { await model.habits.refresh() }
            .navigationTitle("Habitudes")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) { AddHabitSheet() }
        }
    }
}

struct HabitRow: View {
    @Environment(AppModel.self) private var model
    let habit: Habit

    var body: some View {
        let done = model.habits.isDone(habit)
        let streak = model.habits.streak(habit)
        HStack(spacing: 14) {
            Button {
                Task { await model.habits.toggleToday(habit) }
            } label: {
                Image(systemName: done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 30))
                    .foregroundStyle(done ? Theme.success : Color.secondary)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.success, trigger: done)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(habit.emoji ?? "🎯")
                    Text(habit.name).font(.headline).lineLimit(1)
                    if streak > 0 { GlassPill(text: "\(streak) j", systemImage: "flame.fill", tint: Color(hex: 0xF59E0B).opacity(0.5)) }
                }
                HStack(spacing: 3) {
                    ForEach(model.habits.history(habit)) { entry in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(entry.done ? Theme.accent : Color.white.opacity(0.12))
                            .frame(width: 10, height: 10)
                    }
                }
            }
            Spacer()
        }
        .padding(.vertical, 6)
    }
}

struct AddHabitSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var emoji = "🎯"
    @State private var remind = false
    @State private var reminderTime = Calendar.current.date(bySettingHour: 20, minute: 0, second: 0, of: Date()) ?? Date()

    private let emojis = ["🎯", "💪", "📚", "🧘", "💧", "🏃", "🥗", "😴", "✍️", "🎸"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Nom") { TextField("Boire 2 L d'eau…", text: $name) }
                Section("Icône") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 12) {
                        ForEach(emojis, id: \.self) { choice in
                            Text(choice).font(.title)
                                .padding(8)
                                .background(choice == emoji ? Theme.accent.opacity(0.3) : Color.clear, in: .circle)
                                .onTapGesture { emoji = choice }
                        }
                    }
                }
                Section {
                    Toggle("Rappel quotidien", isOn: $remind.animation())
                    if remind { DatePicker("Heure", selection: $reminderTime, displayedComponents: .hourAndMinute) }
                }
                if let message = model.habits.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger)
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Nouvelle habitude")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ajouter") { add() }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func add() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        Task {
            let created = await model.habits.create(name: trimmed, emoji: emoji)
            if remind, let created {
                let parts = Calendar.current.dateComponents([.hour, .minute], from: reminderTime)
                if await NotificationManager.requestAuthorization() {
                    await NotificationManager.scheduleHabit(created, hour: parts.hour ?? 20, minute: parts.minute ?? 0)
                }
            }
            if model.habits.errorMessage == nil { dismiss() }
        }
    }
}
