import SwiftUI

struct HabitsView: View {
    @Environment(AppModel.self) private var model
    @State private var showAdd = false

    var body: some View {
        List {
            if let message = model.habits.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if !model.habits.activeHabits.isEmpty {
                let done = model.habits.activeHabits.filter { model.habits.isDone($0) }.count
                let total = model.habits.activeHabits.count
                Section {
                    EmptyView()
                } header: {
                    VStack(alignment: .leading, spacing: 12) {
                        AccentRule()
                        EthoneHeadline(first: "Habitudes", second: done == total ? "Journée complète." : "\(done) sur \(total) aujourd'hui.", size: .title)
                        ProgressView(value: Double(done), total: Double(max(total, 1)))
                            .tint(Theme.accent)
                            .animation(Motion.snap, value: done)
                    }
                    .textCase(nil)
                    .foregroundStyle(.primary)
                    .padding(.leading, -4)
                }
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
        .toolbarTitleDisplayMode(.inline)
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showAdd) { AddHabitSheet() }
    
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
                    .foregroundStyle(done ? Theme.accent : Color.secondary)
                    .contentTransition(.symbolEffect(.replace))
                    .symbolEffect(.bounce, value: done)
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.success, trigger: done)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(habit.emoji ?? "🎯")
                    Text(habit.name).font(.headline).lineLimit(1)
                    if streak > 0 {
                        Label("\(streak) j", systemImage: "flame.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Color(hex: 0xF59E0B))
                            .symbolEffect(.breathe, isActive: done)
                            .contentTransition(.numericText())
                    }
                }
                HStack(spacing: 3) {
                    ForEach(model.habits.history(habit)) { entry in
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(entry.done ? Theme.accent : Color.primary.opacity(0.1))
                            .frame(width: 10, height: 10)
                            .animation(Motion.snap, value: entry.done)
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
                                .scaleEffect(choice == emoji ? 1.12 : 1)
                                .onTapGesture { withAnimation(Motion.snap) { emoji = choice } }
                                .accessibilityAddTraits(choice == emoji ? .isSelected : [])
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
            .sensoryFeedback(.selection, trigger: emoji)
            .navigationTitle("Nouvelle habitude")
            .ethoneScreen()
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
