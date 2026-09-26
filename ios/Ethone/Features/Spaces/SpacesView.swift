import SwiftUI

struct SpacesView: View {
    @Environment(AppModel.self) private var model
    @State private var newName = ""

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("Nom de l'espace (ex : Courses)", text: $newName)
                        .submitLabel(.done)
                        .onSubmit(create)
                    Button(action: create) { Image(systemName: "plus").fontWeight(.bold) }
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.circle)
                        .disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .listRowBackground(GlassRowBackground())
            } footer: {
                Text("Partagez une liste de tâches avec un proche : courses, projet commun…")
            }

            if let message = model.spaces.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(model.spaces.spaces) { space in
                    NavigationLink(value: space) {
                        HStack {
                            Label(space.name, systemImage: "person.2.fill")
                            Spacer()
                            if space.role == "owner" { GlassPill(text: "Propriétaire", systemImage: "crown.fill") }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        if space.role == "owner" {
                            Button(role: .destructive) { Task { await model.spaces.delete(space) } } label: { Label("Supprimer", systemImage: "trash") }
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if model.spaces.spaces.isEmpty && model.spaces.loadedOnce {
                ContentUnavailableView("Aucun espace", systemImage: "person.2", description: Text("Créez votre premier espace partagé."))
            }
        }
        .navigationTitle("Espaces")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: SharedSpace.self) { space in SpaceDetailView(space: space) }
        .refreshable { await model.spaces.refresh() }
        .task { await model.spaces.refresh() }
    }

    private func create() {
        let name = newName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        newName = ""
        Task { await model.spaces.create(name: name) }
    }
}

struct SpaceDetailView: View {
    @Environment(AppModel.self) private var model
    let space: SharedSpace

    @State private var tasks: [SpaceTask] = []
    @State private var newTitle = ""
    @State private var errorMessage: String?
    @State private var loading = true

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("Ajouter une tâche…", text: $newTitle)
                        .submitLabel(.done)
                        .onSubmit(add)
                    Button(action: add) { Image(systemName: "plus").fontWeight(.bold) }
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.circle)
                        .disabled(newTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .listRowBackground(GlassRowBackground())
            }
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            Section {
                ForEach(tasks) { task in
                    HStack(spacing: 14) {
                        Button { toggle(task) } label: {
                            Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                                .font(.title2)
                                .foregroundStyle(task.isCompleted ? Theme.success : Color.secondary)
                        }
                        .buttonStyle(.plain)
                        Text(task.title).strikethrough(task.isCompleted).foregroundStyle(task.isCompleted ? .secondary : .primary)
                        Spacer()
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { remove(task) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if tasks.isEmpty && !loading {
                ContentUnavailableView("Aucune tâche", systemImage: "checklist", description: Text("Ajoutez la première tâche de « \(space.name) »."))
            }
        }
        .navigationTitle(space.name)
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            tasks = try await model.spaces.tasks(in: space)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func add() {
        let title = newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        newTitle = ""
        Task {
            do {
                tasks.insert(try await model.spaces.addTask(in: space, title: title), at: 0)
                errorMessage = nil
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func toggle(_ task: SpaceTask) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].isCompleted.toggle()
        let done = tasks[index].isCompleted
        Task {
            do {
                try await model.spaces.setCompleted(task, done)
            } catch {
                if let current = tasks.firstIndex(where: { $0.id == task.id }) { tasks[current].isCompleted = !done }
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func remove(_ task: SpaceTask) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let removed = tasks.remove(at: index)
        Task {
            do {
                try await model.spaces.deleteTask(removed)
            } catch {
                tasks.insert(removed, at: min(index, tasks.count))
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
