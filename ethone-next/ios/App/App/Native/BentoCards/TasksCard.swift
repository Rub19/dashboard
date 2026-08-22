import SwiftUI

struct TasksCard: View {
    @ObservedObject var manager: SupabaseManager
    @State private var newTitle = ""

    var body: some View {
        LiquidGlassContainer {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "checkmark.circle")
                        .font(.title2)
                    Spacer()
                    Text("\(manager.tasks.filter(\.done).count)/\(manager.tasks.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text("Tâches")
                    .font(.headline)

                if manager.tasks.isEmpty {
                    Text("Aucune tâche")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    List {
                        ForEach($manager.tasks) { $task in
                            Button {
                                Haptic.medium()
                                Task { await manager.toggleDone(task) }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: task.done ? "checkmark.square.fill" : "square")
                                        .foregroundStyle(task.done ? .green : .primary)
                                    Text(task.title)
                                        .font(.subheadline)
                                        .strikethrough(task.done)
                                        .foregroundStyle(task.done ? .secondary : .primary)
                                    Spacer()
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    Task { await manager.deleteTask(task) }
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                    .frame(minHeight: 120, maxHeight: 180)
                }

                HStack(spacing: 8) {
                    TextField("Nouvelle tâche…", text: $newTitle)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        guard !newTitle.isEmpty else { return }
                        Haptic.success()
                        Task {
                            await manager.createTask(title: newTitle)
                            newTitle = ""
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(newTitle.isEmpty)
                }
            }
        }
    }
}
