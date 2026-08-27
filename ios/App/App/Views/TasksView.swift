import SwiftUI

public struct TasksView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var filter: TaskFilter = .all
    @State private var newTitle: String = ""
    @State private var newPriority: String = "medium"

    enum TaskFilter: String, CaseIterable, Identifiable {
        case all = "Toutes"
        case active = "Actives"
        case completed = "Terminées"
        var id: String { rawValue }
    }

    public init() {}

    var filteredTasks: [TaskItem] {
        switch filter {
        case .all: return supabase.tasks
        case .active: return supabase.tasks.filter { !$0.done }
        case .completed: return supabase.tasks.filter { $0.done }
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                VStack(spacing: 0) {
                    // Filter picker
                    Picker("Filtre", selection: $filter) {
                        ForEach(TaskFilter.allCases) { f in
                            Text(f.rawValue).tag(f)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)

                    // Inline Quick Add Bar
                    HStack(spacing: 10) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(ETHTheme.emerald)

                        TextField("Ajouter une tâche rapide...", text: $newTitle)
                            .font(.system(size: 14))
                            .onSubmit(addTask)

                        if !newTitle.isEmpty {
                            Button("Ajouter", action: addTask)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(ETHTheme.emerald)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.ultraThinMaterial)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.12), lineWidth: 0.8))
                    )
                    .padding(.horizontal, 20)
                    .padding(.bottom, 8)

                    if filteredTasks.isEmpty {
                        ETHEmptyState(
                            icon: "checklist.checked",
                            title: "Aucune tâche",
                            description: filter == .completed ? "Aucune tâche terminée pour l'instant." : "Toutes vos tâches sont accomplies !"
                        )
                        Spacer()
                    } else {
                        List {
                            ForEach(filteredTasks) { task in
                                HStack(spacing: 12) {
                                    Button(action: {
                                        HapticManager.shared.light()
                                        Task {
                                            try? await supabase.toggleTask(id: task.id, isCompleted: !task.done)
                                        }
                                    }) {
                                        Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                                            .font(.system(size: 20))
                                            .foregroundStyle(task.done ? ETHTheme.emerald : .secondary)
                                    }
                                    .buttonStyle(.plain)

                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(task.title)
                                            .font(.system(size: 15, weight: .medium))
                                            .strikethrough(task.done)
                                            .foregroundStyle(task.done ? .secondary : .primary)

                                        if let desc = task.description, !desc.isEmpty {
                                            Text(desc)
                                                .font(.system(size: 12))
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }
                                    }

                                    Spacer()

                                    if let p = task.priority {
                                        ETHStatusBadge(
                                            label: p.capitalized,
                                            tone: p == "high" ? ETHTheme.rose : (p == "low" ? .secondary : ETHTheme.amber)
                                        )
                                    }
                                }
                                .padding(.vertical, 4)
                                .listRowBackground(
                                    RoundedRectangle(cornerRadius: 14)
                                        .fill(.ultraThinMaterial)
                                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.08), lineWidth: 0.5))
                                )
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task {
                                            try? await supabase.deleteTask(id: task.id)
                                        }
                                    } label: {
                                        Label("Supprimer", systemImage: "trash")
                                    }
                                }
                            }
                        }
                        .scrollContentBackground(.hidden)
                        .padding(.bottom, 80)
                    }
                }
            }
            .navigationTitle("Tâches")
        }
    }

    private func addTask() {
        let t = newTitle.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return }
        newTitle = ""
        Task {
            try? await supabase.createTask(title: t, description: nil, priority: newPriority)
        }
        HapticManager.shared.success()
    }
}
