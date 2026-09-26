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

                    focusCard

                    if !model.habits.activeHabits.isEmpty {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Habitudes du jour").sectionTitle()
                                ForEach(model.habits.activeHabits.prefix(5)) { habit in
                                    HStack(spacing: 12) {
                                        Button {
                                            Task { await model.habits.toggleToday(habit) }
                                        } label: {
                                            Image(systemName: model.habits.isDone(habit) ? "checkmark.circle.fill" : "circle")
                                                .font(.title3)
                                                .foregroundStyle(model.habits.isDone(habit) ? Theme.success : Color.secondary)
                                        }
                                        .buttonStyle(.plain)
                                        Text("\(habit.emoji ?? "🎯") \(habit.name)").lineLimit(1)
                                        Spacer()
                                        let streak = model.habits.streak(habit)
                                        if streak > 0 { GlassPill(text: "\(streak) j", systemImage: "flame.fill", tint: Color(hex: 0xF59E0B).opacity(0.5)) }
                                    }
                                }
                            }
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

    @ViewBuilder
    private var focusCard: some View {
        let focus = model.focus
        GlassCard(tint: focus.isActive ? Theme.accent.opacity(0.2) : nil) {
            HStack(spacing: 14) {
                Image(systemName: focus.phase == .focus || !focus.isActive ? "timer" : "cup.and.saucer.fill")
                    .font(.title2)
                    .foregroundStyle(Theme.accentSoft)
                VStack(alignment: .leading, spacing: 2) {
                    Text(focus.isActive ? (focus.isPaused ? "Focus en pause" : "Focus en cours") : "Focus").font(.headline)
                    if focus.isActive {
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            Text(FocusManager.format(focus.remaining(at: context.date))).font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                        }
                    } else {
                        Text("\(focus.sessionsToday) session(s) · \(focus.minutesToday) min aujourd'hui").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button {
                    model.requestedTab = .focus
                } label: {
                    Text(focus.isActive ? "Ouvrir" : "Démarrer")
                }
                .buttonStyle(.glass)
            }
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
