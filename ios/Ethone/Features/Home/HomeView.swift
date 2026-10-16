import SwiftUI

struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var quickTask = ""
    @FocusState private var quickFocused: Bool

    private var openTasks: [Item] { model.tasks.items.filter { !$0.isDone } }
    private var doneToday: Int { model.habits.activeHabits.filter { model.habits.isDone($0) }.count }

    private var todayEvents: [Item] {
        let cal = Calendar.current
        let now = Date()
        return model.events.items.filter { item in
            guard let start = item.startAt else { return false }
            return cal.isDate(start, inSameDayAs: now)
        }.sorted { ($0.startAt ?? now) < ($1.startAt ?? now) }
    }

    private var recentNotes: [Item] {
        Array(model.notes.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(3))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    header.reveal(0)

                    quickActionsRow.reveal(1)

                    if model.soundscape.isPlaying {
                        soundscapeCard
                    }

                    statsPanel.reveal(2)

                    focusCard.reveal(3)

                    if !todayEvents.isEmpty {
                        agendaCard
                    }

                    if !model.habits.activeHabits.isEmpty {
                        habitsCard
                    }

                    quickTaskCard

                    if !openTasks.isEmpty {
                        tasksCard
                    }

                    if !recentNotes.isEmpty {
                        recentNotesCard
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
            .toolbarVisibility(.hidden, for: .navigationBar)
            .ethoneScreen()
        }
    }

    private var quickActionsRow: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 10) {
                quickChip(title: "Brain", systemImage: "sparkles", tint: Theme.accent) {
                    model.morePath = [.brain]
                    model.requestedTab = .more
                }
                quickChip(title: "Soundscape", systemImage: "waveform.circle.fill", tint: Theme.accent) {
                    model.morePath = [.soundscape]
                    model.requestedTab = .more
                }
                quickChip(title: "Clip", systemImage: "paperclip", tint: Theme.accent) {
                    model.morePath = [.clip]
                    model.requestedTab = .more
                }
                quickChip(title: "Discord", systemImage: "bubble.left.and.bubble.right.fill", tint: Color(hex: 0x5865F2)) {
                    model.morePath = [.discord]
                    model.requestedTab = .more
                }
                quickChip(title: "Agenda", systemImage: "calendar", tint: Theme.accent) {
                    model.morePath = [.calendar]
                    model.requestedTab = .more
                }
                quickChip(title: "Espaces", systemImage: "person.2.fill", tint: Theme.accent)) {
                    model.morePath = [.spaces]
                    model.requestedTab = .more
                }
            }
            .padding(.vertical, 2)
            .scrollTargetLayout()
        }
        .scrollIndicators(.hidden)
        .contentMargins(.horizontal, 16, for: .scrollContent)
        .padding(.horizontal, -16)
        .scrollTargetBehavior(.viewAligned)
        .mask {
            LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.04), .init(color: .black, location: 0.9), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing)
        }
    }

    private func quickChip(title: String, systemImage: String, tint: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: systemImage)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(tint)
                Text(title).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .glassEffect(.regular.interactive(), in: .capsule)
        }
        .buttonStyle(.plain)
    }

    private var soundscapeCard: some View {
        let soundscape = model.soundscape
        return GlassCard(tint: Theme.accent.opacity(0.14)) {
            HStack(spacing: 12) {
                Image(systemName: "waveform")
                    .font(.title2)
                    .foregroundStyle(Theme.accent)
                    .symbolEffect(.variableColor.iterative.reversing, isActive: soundscape.isPlaying)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Soundscape en cours").font(.headline)
                    Text("\(soundscape.selectedSolfeggio.label) · \(soundscape.selectedWave.label)").font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                    soundscape.togglePlay()
                } label: {
                    Image(systemName: soundscape.isPlaying ? "pause.fill" : "play.fill")
                }
                .buttonStyle(.glass)
                Button {
                    model.morePath = [.soundscape]
                    model.requestedTab = .more
                } label: {
                    Text("Mixeur")
                }
                .buttonStyle(.glass)
            }
        }
    }

    private var agendaCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Agenda du jour").sectionTitle()
                    Spacer()
                    Button {
                        model.morePath = [.calendar]
                        model.requestedTab = .more
                    } label: {
                        Text("Voir tout").font(.caption.weight(.medium)).foregroundStyle(Theme.accent)
                    }
                }
                ForEach(todayEvents.prefix(4)) { event in
                    HStack(spacing: 12) {
                        if let start = event.startAt {
                            Text(start.formatted(date: .omitted, time: .shortened))
                                .font(.caption.weight(.semibold).monospacedDigit())
                                .foregroundStyle(Theme.accent)
                                .frame(width: 48, alignment: .leading)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(event.title).font(.subheadline.weight(.medium)).lineLimit(1)
                            if !event.plainBody.isEmpty {
                                Text(event.plainBody).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                            }
                        }
                        Spacer()
                    }
                }
            }
        }
    }

    private var habitsCard: some View {
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

    private var quickTaskCard: some View {
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
    }

    private var tasksCard: some View {
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

    private var recentNotesCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Notes récentes").sectionTitle()
                    Spacer()
                    Button {
                        model.requestedTab = .notes
                    } label: {
                        Text("Toutes").font(.caption.weight(.medium)).foregroundStyle(Theme.accent)
                    }
                }
                ForEach(recentNotes) { note in
                    Button {
                        model.requestedTab = .notes
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "note.text").foregroundStyle(Theme.accent)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(note.title.isEmpty ? "Sans titre" : note.title).font(.subheadline.weight(.medium)).lineLimit(1).foregroundStyle(.primary)
                                if !note.plainBody.isEmpty {
                                    Text(note.plainBody.replacingOccurrences(of: "\n", with: " ")).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
                                }
                            }
                            Spacer()
                            Text(note.updatedAt.formatted(date: .abbreviated, time: .omitted)).font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    @ViewBuilder
    private var focusCard: some View {
        let focus = model.focus
        GlassCard(tint: focus.isActive ? Theme.accent.opacity(0.2) : nil) {
            HStack(spacing: 14) {
                Image(systemName: focus.phase == .focus || !focus.isActive ? "timer" : "cup.and.saucer.fill")
                    .font(.title2)
                    .foregroundStyle(Theme.accent)
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
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .center) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)).capitalized)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    model.morePath = [.profile]
                    model.requestedTab = .more
                } label: {
                    AvatarView(url: auth.user?.avatarURL, name: auth.user?.displayName ?? "E", size: 40, status: .online)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Profil")
            }
            AccentRule()
            EthoneHeadline(first: "\(salutation),", second: auth.user?.displayName ?? "")
        }
        .padding(.top, 12)
    }

    private var salutation: String {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour < 6 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir"
    }

    /// The day at a glance as one connected strip, numbers first, hairlines between.
    private var statsPanel: some View {
        HStack(spacing: 0) {
            stat(value: "\(openTasks.count)", label: "Tâches") { model.requestedTab = .tasks }
            Divider().frame(height: 40)
            stat(value: "\(model.notes.items.count)", label: "Notes") { model.requestedTab = .notes }
            Divider().frame(height: 40)
            stat(value: "\(doneToday)/\(model.habits.activeHabits.count)", label: "Habitudes") {
                model.morePath = [.habits]
                model.requestedTab = .more
            }
            Divider().frame(height: 40)
            stat(value: "\(bestStreak) j", label: "Série") {
                model.morePath = [.habits]
                model.requestedTab = .more
            }
        }
        .padding(.vertical, 16)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
    }

    private func stat(value: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(value)
                    .font(.title2.weight(.semibold))
                    .tracking(-0.6)
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(label).font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }

    private func addQuickTask() {
        let title = quickTask.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        quickTask = ""
        Task { await model.tasks.create(title: title) }
    }
}
