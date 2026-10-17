import SwiftUI

struct TasksView: View {
    @Environment(AppModel.self) private var model
    @State private var newTitle = ""
    @State private var reminderDate = Date().addingTimeInterval(3600)
    @State private var withReminder = false
    @State private var priority = "medium"
    @FocusState private var focused: Bool

    private var open: [Item] { model.tasks.items.filter { !$0.isDone }.sorted { $0.createdAt > $1.createdAt } }
    private var done: [Item] { model.tasks.items.filter { $0.isDone }.sorted { $0.updatedAt > $1.updatedAt } }

    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    HStack {
                        TextField("Ajouter une tâche…", text: $newTitle)
                            .focused($focused)
                            .submitLabel(.done)
                            .onSubmit(add)
                        Button(action: add) { Image(systemName: "plus").fontWeight(.bold) }
                            .buttonStyle(.glassProminent)
                            .buttonBorderShape(.circle)
                            .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                    Picker("Priorité", selection: $priority) {
                        Text("Basse").tag("low")
                        Text("Moyenne").tag("medium")
                        Text("Haute").tag("high")
                    }
                    .pickerStyle(.segmented)
                    Toggle("Échéance et rappel", isOn: $withReminder.animation()).font(.subheadline)
                    if withReminder {
                        DatePicker("Quand", selection: $reminderDate, in: Date()...).font(.subheadline)
                    }
                }
                .padding(.vertical, 4)
                .listRowBackground(Rectangle().fill(.thinMaterial))
            } header: {
                VStack(alignment: .leading, spacing: 12) {
                    AccentRule()
                    EthoneHeadline(first: "Tâches", second: open.isEmpty ? "Tout est fait." : "\(open.count) à faire.", size: .title)
                }
                .textCase(nil)
                .foregroundStyle(.primary)
                .padding(.bottom, 8)
                .padding(.leading, -4)
            }

            if let message = model.tasks.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            if !open.isEmpty {
                Section {
                    ForEach(open) { row($0) }
                } header: { sectionHeader("À faire", count: open.count) }
            }

            if !done.isEmpty {
                Section {
                    ForEach(done) { row($0) }
                } header: { sectionHeader("Terminées", count: done.count) }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .animation(Motion.snap, value: model.tasks.items.map(\.id))
        .animation(Motion.snap, value: model.tasks.items.map(\.isDone))
        .overlay {
            if model.tasks.items.isEmpty && model.tasks.hasLoaded {
                ContentUnavailableView("Aucune tâche", systemImage: "checklist", description: Text("Écrivez votre première tâche dans le champ ci-dessus."))
                    .padding(.top, 160)
            }
        }
        .refreshable { await model.tasks.refresh() }
        .navigationTitle("Tâches")
        .toolbarVisibility(.hidden, for: .navigationBar)
        .ethoneScreen()
        .scrollDismissesKeyboard(.interactively)
    
    }

    private func row(_ task: Item) -> some View {
        HStack(spacing: 14) {
            Button {
                Task {
                    let target = !task.isDone
                    await model.tasks.setDone(task, target)
                    if target { NotificationManager.cancelTask(id: task.id) }
                }
            } label: {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(task.isDone ? Theme.accent : Color.secondary)
                    .contentTransition(.symbolEffect(.replace))
                    .symbolEffect(.bounce, value: task.isDone)
            }
            .buttonStyle(.plain)
            .sensoryFeedback(.success, trigger: task.isDone)

            VStack(alignment: .leading, spacing: 3) {
                Text(task.title)
                    .strikethrough(task.isDone)
                    .foregroundStyle(task.isDone ? .secondary : .primary)
                if task.dueDate != nil || priorityLabel(task) != nil {
                    HStack(spacing: 8) {
                        if let due = task.dueDate {
                            Label(due.formatted(.dateTime.day().month(.abbreviated).hour().minute()), systemImage: "calendar")
                                .foregroundStyle(!task.isDone && due < Date() ? Theme.danger : Color.secondary)
                        }
                        if let label = priorityLabel(task) {
                            Text(label).foregroundStyle(task.data?["priority"]?.stringValue == "high" ? Theme.danger : Color.secondary)
                        }
                    }
                    .font(.caption)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
        .listRowBackground(Rectangle().fill(.thinMaterial))
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                NotificationManager.cancelTask(id: task.id)
                Task { await model.tasks.delete(task) }
            } label: { Label("Supprimer", systemImage: "trash") }
        }
    }

    private func sectionHeader(_ title: String, count: Int) -> some View {
        HStack(spacing: 6) {
            Text(title)
            Text("\(count)").foregroundStyle(.tertiary).monospacedDigit().contentTransition(.numericText())
        }
        .sectionTitle()
        .textCase(nil)
    }

    private func priorityLabel(_ task: Item) -> String? {
        switch task.data?["priority"]?.stringValue {
        case "high": "Priorité haute"
        case "low": "Priorité basse"
        default: nil
        }
    }

    private func add() {
        let title = newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        let reminder = withReminder ? reminderDate : nil
        var data: [String: JSONValue] = ["priority": .string(priority)]
        if let reminder { data["dueDate"] = .string(ISODate.string(reminder)) }
        newTitle = ""
        withReminder = false
        priority = "medium"
        Task {
            if let created = await model.tasks.create(title: title, data: .object(data)), let reminder {
                if await NotificationManager.requestAuthorization() {
                    await NotificationManager.scheduleTask(created, at: reminder)
                }
            }
        }
    }
}

