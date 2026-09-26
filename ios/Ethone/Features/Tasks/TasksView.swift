import SwiftUI

struct TasksView: View {
    @Environment(AppModel.self) private var model
    @State private var newTitle = ""
    @State private var reminderDate = Date().addingTimeInterval(3600)
    @State private var withReminder = false
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
                        Toggle("Me le rappeler", isOn: $withReminder.animation()).font(.subheadline)
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

            Text(task.title)
                .strikethrough(task.isDone)
                .foregroundStyle(task.isDone ? .secondary : .primary)
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

    private func add() {
        let title = newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        let reminder = withReminder ? reminderDate : nil
        newTitle = ""
        withReminder = false
        Task {
            if let created = await model.tasks.create(title: title), let reminder {
                if await NotificationManager.requestAuthorization() {
                    await NotificationManager.scheduleTask(created, at: reminder)
                }
            }
        }
    }
}
