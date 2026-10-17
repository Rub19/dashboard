import SwiftUI

/// A block of the home dashboard; its order and visibility are chosen by the user.
enum HomeBlock: String, CaseIterable, Identifiable {
    case shortcuts, today, cards, tasks, notes, quickAdd
    var id: String { rawValue }

    var title: String {
        switch self {
        case .shortcuts: "Raccourcis"
        case .today: "Résumé du jour"
        case .cards: "Cartes (Focus, Mail, Agenda, Habitudes, Météo)"
        case .tasks: "À faire"
        case .notes: "Notes récentes"
        case .quickAdd: "Ajout rapide"
        }
    }

    var icon: String {
        switch self {
        case .shortcuts: "square.grid.3x1.below.line.grid.1x2"
        case .today: "chart.bar.fill"
        case .cards: "square.grid.2x2.fill"
        case .tasks: "checklist"
        case .notes: "note.text"
        case .quickAdd: "plus.circle.fill"
        }
    }

    static let storageKey = "ethone.home.blocks"
    static let defaultOrder = HomeBlock.allCases.map(\.rawValue).joined(separator: ",")
}

struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @AppStorage(HomeBlock.storageKey) private var blocksRaw = HomeBlock.defaultOrder
    @AppStorage("weatherCity") private var weatherCity = ""
    @State private var weather = WeatherService()
    @State private var quickTask = ""
    @State private var customizing = false
    @FocusState private var quickFocused: Bool

    private var blocks: [HomeBlock] { blocksRaw.split(separator: ",").compactMap { HomeBlock(rawValue: String($0)) } }
    private var openTasks: [Item] { model.tasks.items.filter { !$0.isDone }.sorted { $0.createdAt > $1.createdAt } }
    private var habitsDone: Int { model.habits.activeHabits.filter { model.habits.isDone($0) }.count }
    private var nextEvent: Item? {
        let now = Date()
        return model.events.items.filter { ($0.startAt ?? .distantPast) >= now.addingTimeInterval(-3600) }.min { ($0.startAt ?? now) < ($1.startAt ?? now) }
    }
    private var recentNotes: [Item] { Array(model.notes.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(3)) }
    private let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header.reveal(0)
                ForEach(Array(blocks.enumerated()), id: \.element) { index, block in
                    view(for: block).reveal(min(index + 1, 5))
                }
                if let error = model.tasks.errorMessage ?? model.notes.errorMessage {
                    Text(error).font(.footnote).foregroundStyle(Theme.danger)
                }
                Button { customizing = true } label: {
                    Label("Personnaliser l'accueil", systemImage: "slider.horizontal.3")
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity, minHeight: 28)
                }
                .buttonStyle(.glass)
                .padding(.top, 4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
            .animation(Motion.snap, value: blocksRaw)
        }
        .refreshable { await model.refreshAll() }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle("Accueil")
        .toolbarVisibility(.hidden, for: .navigationBar)
        .ethoneScreen()
        .task {
            await weather.load(city: weatherCity.isEmpty ? "Paris" : weatherCity)
            if !model.mail.loadedOnce { await model.mail.load(folder: .inbox) }
        }
        .sheet(isPresented: $customizing) { HomeCustomizeSheet(blocksRaw: $blocksRaw) }
    }

    @ViewBuilder
    private func view(for block: HomeBlock) -> some View {
        switch block {
        case .shortcuts: shortcuts
        case .today: todayStrip
        case .cards: cardsGrid
        case .tasks: if !openTasks.isEmpty { tasksCard }
        case .notes: if !recentNotes.isEmpty { notesCard }
        case .quickAdd: quickAddCard
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .center, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text(Date.now.formatted(.dateTime.weekday(.wide).day().month(.wide)).capitalized)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
                Text(String(localized: String.LocalizationValue(salutation)) + ", " + (model.ethoneName ?? auth.user?.displayName ?? ""))
                    .font(.title.weight(.semibold))
                    .tracking(-0.8)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer()
            Button { model.open(.profile) } label: {
                AvatarView(urlString: model.ethoneAvatar ?? auth.user?.avatarURL?.absoluteString, name: model.ethoneName ?? auth.user?.displayName ?? "E", size: 44, status: .online)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Profil")
        }
        .padding(.top, 12)
    }

    private var salutation: String {
        let hour = Calendar.current.component(.hour, from: Date())
        return hour < 6 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir"
    }

    // MARK: Blocks

    private var shortcuts: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 10) {
                ForEach([MoreDestination.brain, .soundscape, .clip, .discord, .spaces, .files], id: \.self) { destination in
                    if let item = destination.item {
                        Button { model.open(destination) } label: {
                            HStack(spacing: 8) {
                                Image(systemName: item.icon).font(.footnote.weight(.semibold)).foregroundStyle(destination.color)
                                Text(LocalizedStringKey(item.title)).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .glassEffect(.regular.interactive(), in: .capsule)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.vertical, 2)
        }
        .scrollIndicators(.hidden)
        .contentMargins(.horizontal, 16, for: .scrollContent)
        .padding(.horizontal, -16)
        .mask {
            LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.04), .init(color: .black, location: 0.9), .init(color: .clear, location: 1)], startPoint: .leading, endPoint: .trailing)
        }
    }

    private var todayStrip: some View {
        StatStrip(items: [
            ("\(openTasks.count)", "Tâches"),
            ("\(model.mail.unread)", "Non lus"),
            ("\(habitsDone)/\(model.habits.activeHabits.count)", "Habitudes"),
            ("\(model.focus.minutesToday) min", "Focus"),
        ])
    }

    private var cardsGrid: some View {
        LazyVGrid(columns: grid, spacing: 12) {
            focusCard
            mailCard
            agendaCard
            habitsCard
            if let now = weather.now { weatherCard(now) }
        }
    }

    private func miniCard<Content: View>(_ title: String, icon: String, tint: Color, action: @escaping () -> Void, @ViewBuilder content: () -> Content) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Image(systemName: icon).font(.footnote.weight(.semibold)).foregroundStyle(tint)
                    Text(title).font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                    Spacer(minLength: 0)
                }
                content()
                Spacer(minLength: 0)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 124, alignment: .topLeading)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 22))
            .contentShape(.rect(cornerRadius: 22))
        }
        .buttonStyle(.plain)
    }

    private var focusCard: some View {
        let focus = model.focus
        return miniCard("Focus", icon: "timer", tint: Theme.accent, action: { model.open(.focus) }) {
            if focus.isActive {
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    Text(FocusManager.format(focus.remaining(at: context.date)))
                        .font(.title2.weight(.semibold).monospacedDigit())
                        .contentTransition(.numericText(countsDown: true))
                }
                Text(focus.isPaused ? "En pause" : "En cours").font(.caption).foregroundStyle(.secondary)
            } else {
                Text("\(focus.minutesToday) min").font(.title2.weight(.semibold)).tracking(-0.5)
                Text("Toucher pour démarrer").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var mailCard: some View {
        miniCard("Mail", icon: "envelope.fill", tint: Color(hex: 0x3E8BFF), action: { model.open(.mail) }) {
            Text(model.mail.unread == 0 ? "Tout lu" : plural(model.mail.unread, "non lu", "non lus"))
                .font(.title2.weight(.semibold)).tracking(-0.5)
                .lineLimit(1).minimumScaleFactor(0.7)
            if let latest = model.mail.messages.first {
                Text(latest.sender).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
        }
    }

    private var agendaCard: some View {
        miniCard("Agenda", icon: "calendar", tint: Color(hex: 0xF5A524), action: { model.open(.calendar) }) {
            if let event = nextEvent, let start = event.startAt {
                Text(start, format: .dateTime.hour().minute())
                    .font(.title2.weight(.semibold).monospacedDigit())
                Text(event.title).font(.caption).foregroundStyle(.secondary).lineLimit(2)
            } else {
                Text("Libre").font(.title2.weight(.semibold)).tracking(-0.5)
                Text("Aucun événement à venir").font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private var habitsCard: some View {
        let total = model.habits.activeHabits.count
        return miniCard("Habitudes", icon: "flame.fill", tint: Color(hex: 0xF97316), action: { model.open(.habits) }) {
            HStack(alignment: .center, spacing: 12) {
                ZStack {
                    Circle().stroke(.primary.opacity(0.1), lineWidth: 5)
                    Circle()
                        .trim(from: 0, to: total == 0 ? 0 : Double(habitsDone) / Double(total))
                        .stroke(Color(hex: 0xF97316), style: StrokeStyle(lineWidth: 5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(Motion.snap, value: habitsDone)
                }
                .frame(width: 38, height: 38)
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(habitsDone)/\(total)").font(.title3.weight(.semibold).monospacedDigit())
                    Text("aujourd'hui").font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }

    private func weatherCard(_ now: WeatherNow) -> some View {
        miniCard(weather.placeName.isEmpty ? "Météo" : weather.placeName, icon: "location.fill", tint: Color(hex: 0x38BDF8), action: { model.open(.weather) }) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(Int(now.temperature.rounded()))°").font(.title.weight(.light)).tracking(-1)
                Spacer()
                Image(systemName: WeatherCode.symbol(now.code, isDay: now.isDay)).symbolRenderingMode(.multicolor).font(.title2)
            }
            Text(WeatherCode.label(now.code)).font(.caption).foregroundStyle(.secondary).lineLimit(1)
        }
    }

    private var tasksCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("À faire").sectionTitle()
                    Spacer()
                    Button("Tout voir") { model.open(.tasks) }.font(.caption.weight(.medium)).tint(Theme.accent)
                }
                ForEach(openTasks.prefix(4)) { task in
                    HStack(spacing: 12) {
                        Button {
                            Task { await model.tasks.setDone(task, true) }
                        } label: {
                            Image(systemName: "circle").font(.title3).foregroundStyle(.secondary)
                        }
                        .buttonStyle(.plain)
                        .sensoryFeedback(.success, trigger: task.isDone)
                        Text(task.title).lineLimit(1)
                        Spacer()
                    }
                }
            }
        }
    }

    private var notesCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Notes récentes").sectionTitle()
                    Spacer()
                    Button("Tout voir") { model.open(.notes) }.font(.caption.weight(.medium)).tint(Theme.accent)
                }
                ForEach(recentNotes) { note in
                    Button { model.open(.notes) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "note.text").foregroundStyle(Theme.accent)
                            Text(note.title.isEmpty ? "Sans titre" : note.title).font(.subheadline.weight(.medium)).lineLimit(1).foregroundStyle(.primary)
                            Spacer()
                            Text(note.updatedAt, format: .relative(presentation: .named)).font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var quickAddCard: some View {
        HStack(spacing: 10) {
            TextField("Ajouter une tâche…", text: $quickTask)
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
        .padding(.leading, 18)
        .padding(.trailing, 8)
        .padding(.vertical, 8)
        .glassEffect(.regular, in: .capsule)
    }

    private func addQuickTask() {
        let title = quickTask.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        quickTask = ""
        Task { await model.tasks.create(title: title) }
    }
}

/// Show, hide and reorder the home blocks.
private struct HomeCustomizeSheet: View {
    @Binding var blocksRaw: String
    @Environment(\.dismiss) private var dismiss

    private var shown: [HomeBlock] { blocksRaw.split(separator: ",").compactMap { HomeBlock(rawValue: String($0)) } }
    private var hidden: [HomeBlock] { HomeBlock.allCases.filter { !shown.contains($0) } }

    private func save(_ list: [HomeBlock]) { blocksRaw = list.map(\.rawValue).joined(separator: ",") }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(shown) { block in
                        Label(LocalizedStringKey(block.title), systemImage: block.icon)
                    }
                    .onMove { from, to in
                        var list = shown
                        list.move(fromOffsets: from, toOffset: to)
                        save(list)
                    }
                    .onDelete { offsets in
                        var list = shown
                        list.remove(atOffsets: offsets)
                        save(list)
                    }
                } header: {
                    Text("Affichés").sectionTitle()
                } footer: {
                    Text("Maintenez une ligne pour la déplacer, balayez pour la masquer.")
                }
                if !hidden.isEmpty {
                    Section {
                        ForEach(hidden) { block in
                            Button {
                                save(shown + [block])
                            } label: {
                                HStack {
                                    Label(LocalizedStringKey(block.title), systemImage: block.icon).foregroundStyle(.primary)
                                    Spacer()
                                    Image(systemName: "plus.circle.fill").foregroundStyle(Theme.accent)
                                }
                            }
                        }
                    } header: { Text("Masqués").sectionTitle() }
                }
                Section {
                    Button("Rétablir l'accueil par défaut") { blocksRaw = HomeBlock.defaultOrder }
                }
            }
            .environment(\.editMode, .constant(.active))
            .navigationTitle("Personnaliser l'accueil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("OK") { dismiss() } }
            }
            .sensoryFeedback(.selection, trigger: blocksRaw)
        }
        .presentationDetents([.medium, .large])
    }
}
