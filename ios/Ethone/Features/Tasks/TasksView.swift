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
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 10) {
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
                    .listRowBackground(GlassRowBackground())
                }

                if let message = model.tasks.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
                }

                if !open.isEmpty {
                    Section {
                        ForEach(open) { row($0) }
                    } header: { Text("À faire · \(open.count)").sectionTitle() }
                }

                if !done.isEmpty {
                    Section {
                        ForEach(done) { row($0) }
                    } header: { Text("Terminées · \(done.count)").sectionTitle() }
                }
            }
            .scrollContentBackground(.hidden)
            .overlay {
                if model.tasks.items.isEmpty && model.tasks.hasLoaded {
                    ContentUnavailableView("Aucune tâche", systemImage: "checklist", description: Text("Ajoutez une tâche ci-dessus."))
                }
            }
            .refreshable { await model.tasks.refresh() }
            .navigationTitle("Tâches")
            .ethoneScreen()
            .scrollDismissesKeyboard(.interactively)
        }
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
                    .foregroundStyle(task.isDone ? Theme.success : Color.secondary)
                    .contentTransition(.symbolEffect(.replace))
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
        .listRowBackground(GlassRowBackground())
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                NotificationManager.cancelTask(id: task.id)
                Task { await model.tasks.delete(task) }
            } label: { Label("Supprimer", systemImage: "trash") }
        }
    }

    /// Priorité affichée ; rien pour « moyenne » (valeur par défaut).
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
