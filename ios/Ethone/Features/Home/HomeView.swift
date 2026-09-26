import SwiftUI

struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var quickTask = ""
    @FocusState private var quickFocused: Bool

    private var openTasks: [Item] { model.tasks.items.filter { !$0.isDone } }
    private var doneToday: Int { model.habits.activeHabits.filter { model.habits.isDone($0) }.count }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    header

                    GlassEffectContainer(spacing: 14) {
                        HStack(spacing: 14) {
                            stat(value: "\(openTasks.count)", label: "Tâches ouvertes", systemImage: "checklist", tint: Theme.accent)
                            stat(value: "\(model.notes.items.count)", label: "Notes", systemImage: "note.text", tint: Theme.teal)
                        }
                    }
                    GlassEffectContainer(spacing: 14) {
                        HStack(spacing: 14) {
                            stat(value: "\(doneToday)/\(model.habits.activeHabits.count)", label: "Habitudes du jour", systemImage: "flame.fill", tint: Color(hex: 0xF59E0B))
                            stat(value: "\(bestStreak)j", label: "Meilleure série", systemImage: "bolt.fill", tint: Theme.violet)
                        }
                    }

                    GlassCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Ajout rapide").sectionTitle()
                            HStack {
                                TextField("Nouvelle tâche…", text: $quickTask)
                                    .focused($quickFocused)
                                    .submitLabel(.done)
                                    .onSubmit(addQuickTask)
                                Button(action: addQuickTask) {
                                    Image(systemName: "plus").fontWeight(.bold)
                                }
                                .buttonStyle(.glassProminent)
                                .buttonBorderShape(.circle)
                                .disabled(quickTask.trimmingCharacters(in: .whitespaces).isEmpty)
                            }
                        }
                    }

                    if !openTasks.isEmpty {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("À faire").sectionTitle()
                                ForEach(openTasks.prefix(5)) { task in
                                    HStack(spacing: 12) {
                                        Button {
                                            Task { await model.tasks.setDone(task, true) }
                                        } label: {
                                            Image(systemName: "circle").font(.title3)
                                        }
                                        .buttonStyle(.plain)
                                        Text(task.title).lineLimit(2)
                                        Spacer()
                                    }
                                }
                            }
                        }
                    }

                    if let error = model.tasks.errorMessage ?? model.notes.errorMessage {
                        Text(error).font(.footnote).foregroundStyle(Theme.danger)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .refreshable { await model.refreshAll() }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Accueil")
            .toolbarTitleDisplayMode(.inlineLarge)
        }
    }

    private var bestStreak: Int {
        model.habits.activeHabits.map { model.habits.streak($0) }.max() ?? 0
    }

    private var header: some View {
        HStack(spacing: 14) {
            AvatarView(url: auth.user?.avatarURL, name: auth.user?.displayName ?? "E", size: 52, status: .online)
            VStack(alignment: .leading, spacing: 2) {
                Text(greeting).font(.title3.weight(.semibold))
                Text(auth.user?.email ?? "").font(.footnote).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.top, 4)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let salutation = hour < 6 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir"
        return "\(salutation), \(auth.user?.displayName ?? "")"
    }

    private func stat(value: String, label: String, systemImage: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: systemImage).font(.title3).foregroundStyle(tint)
            Text(value).font(.system(size: 28, weight: .bold, design: .rounded)).contentTransition(.numericText())
            Text(label).font(.footnote).foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(Glass.regular.tint(tint.opacity(0.18)), in: .rect(cornerRadius: Theme.cardRadius))
    }

    private func addQuickTask() {
        let title = quickTask.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        quickTask = ""
        Task { await model.tasks.create(title: title) }
    }
}
