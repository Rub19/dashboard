import SwiftUI

struct TasksCard: View {
    @ObservedObject var manager: SupabaseManager
    @State private var newTitle = ""
    @State private var deleteCount = 0
    @State private var createdTaskCount = 0

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
                            .ethoneSensoryFeedback(.success, trigger: task.done)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    deleteCount += 1
                                    Task { await manager.deleteTask(task) }
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .ethoneSensoryFeedback(.impact(weight: .heavy), trigger: deleteCount)
                    .listStyle(.plain)
                    .frame(minHeight: 120, maxHeight: 180)
                }

                HStack(spacing: 8) {
                    TextField("Nouvelle tâche…", text: $newTitle)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        guard !newTitle.isEmpty else { return }
                        createdTaskCount += 1
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
                    .ethoneSensoryFeedback(.success, trigger: createdTaskCount)
                }
            }
        }
    }
}
