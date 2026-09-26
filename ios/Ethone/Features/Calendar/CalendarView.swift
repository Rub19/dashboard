import SwiftUI

struct CalendarView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("showDeviceCalendar") private var showDeviceCalendar = false
    @State private var device = DeviceCalendar()
    @State private var displayedMonth = Date()
    @State private var selectedDay = Date()
    @State private var editing: EventDraft?

    private let calendar = Calendar.current

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                monthHeader
                monthGrid
                dayList
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .navigationTitle("Calendrier")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { editing = EventDraft(item: nil, day: selectedDay) } label: { Image(systemName: "plus") }
            }
        }
        .refreshable { await model.events.refresh() }
        .task {
            await model.events.refresh()
            device.refreshAuthorization()
            reloadDevice()
        }
        .onChange(of: displayedMonth) { _, _ in reloadDevice() }
        .onChange(of: showDeviceCalendar) { _, enabled in
            Task {
                if enabled { await device.requestAccess() }
                if !device.authorized { showDeviceCalendar = false }
                reloadDevice()
            }
        }
        .sheet(item: $editing) { draft in EventEditorView(draft: draft) }
    }

    // MARK: Mois

    private var monthHeader: some View {
        HStack {
            Button { shiftMonth(-1) } label: { Image(systemName: "chevron.left") }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
            Spacer()
            Text(displayedMonth, format: .dateTime.month(.wide).year())
                .font(.title3.weight(.semibold))
                .textCase(.none)
            Spacer()
            Button { shiftMonth(1) } label: { Image(systemName: "chevron.right") }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
        }
    }

    private var weekdaySymbols: [String] {
        let symbols = calendar.veryShortStandaloneWeekdaySymbols
        let shift = calendar.firstWeekday - 1
        return Array(symbols[shift...] + symbols[..<shift])
    }

    private var monthDays: [Date?] {
        guard let interval = calendar.dateInterval(of: .month, for: displayedMonth),
              let range = calendar.range(of: .day, in: .month, for: displayedMonth) else { return [] }
        let firstWeekday = calendar.component(.weekday, from: interval.start)
        let offset = (firstWeekday - calendar.firstWeekday + 7) % 7
        var days: [Date?] = Array(repeating: nil, count: offset)
        for index in 0..<range.count {
            days.append(calendar.date(byAdding: .day, value: index, to: interval.start))
        }
        return days
    }

    private var monthGrid: some View {
        GlassCard(padding: 12) {
            VStack(spacing: 8) {
                HStack {
                    ForEach(Array(weekdaySymbols.enumerated()), id: \.offset) { _, symbol in
                        Text(symbol).font(.caption.weight(.semibold)).foregroundStyle(.secondary).frame(maxWidth: .infinity)
                    }
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 6) {
                    ForEach(Array(monthDays.enumerated()), id: \.offset) { _, day in
                        if let day {
                            dayCell(day)
                        } else {
                            Color.clear.frame(height: 44)
                        }
                    }
                }
            }
        }
    }

    private func dayCell(_ day: Date) -> some View {
        let isSelected = calendar.isDate(day, inSameDayAs: selectedDay)
        let isToday = calendar.isDateInToday(day)
        let count = ethoneEvents(on: day).count + (showDeviceCalendar ? deviceEvents(on: day).count : 0)
        return Button {
            selectedDay = day
        } label: {
            VStack(spacing: 3) {
                Text("\(calendar.component(.day, from: day))")
                    .font(.callout.weight(isToday || isSelected ? .bold : .regular))
                    .foregroundStyle(isSelected ? Color.white : Color.primary)
                Circle()
                    .fill(count > 0 ? (isSelected ? Color.white : Theme.accent) : Color.clear)
                    .frame(width: 5, height: 5)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Theme.accent.gradient)
                } else if isToday {
                    RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Theme.accent, lineWidth: 1.5)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: Jour sélectionné

    private var dayList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(selectedDay, format: .dateTime.weekday(.wide).day().month(.wide))
                .font(.headline)
                .padding(.leading, 4)

            let mine = ethoneEvents(on: selectedDay)
            let others = showDeviceCalendar ? deviceEvents(on: selectedDay) : []

            if mine.isEmpty && others.isEmpty {
                GlassCard { Text("Rien de prévu ce jour-là.").foregroundStyle(.secondary) }
            }
            ForEach(mine) { event in
                Button { editing = EventDraft(item: event, day: selectedDay) } label: {
                    GlassCard(tint: Theme.accent.opacity(0.18)) {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(event.title).font(.headline).foregroundStyle(.primary)
                                if let start = event.startAt {
                                    Text(timeRange(start: start, end: event.endAt)).font(.subheadline).foregroundStyle(.secondary)
                                }
                            }
                            Spacer()
                        }
                    }
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button(role: .destructive) {
                        NotificationManager.cancelEvent(id: event.id)
                        Task { await model.events.delete(event) }
                    } label: { Label("Supprimer", systemImage: "trash") }
                }
            }
            ForEach(others) { event in
                GlassCard(tint: Color(hex: event.colorHex, opacity: 0.18)) {
                    HStack {
                        Circle().fill(Color(hex: event.colorHex)).frame(width: 10, height: 10)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(event.title).font(.headline)
                            Text(event.isAllDay ? "Toute la journée" : timeRange(start: event.start, end: event.end)).font(.subheadline).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(event.calendarName).font(.caption).foregroundStyle(.tertiary)
                    }
                }
            }

            Toggle(isOn: $showDeviceCalendar) {
                Label("Afficher le calendrier de l'iPhone", systemImage: "calendar.badge.clock")
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 20))

            if let message = model.events.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger)
            }
        }
    }

    // MARK: Données

    private func ethoneEvents(on day: Date) -> [Item] {
        model.events.items
            .filter { item in
                guard let start = item.startAt else { return false }
                return calendar.isDate(start, inSameDayAs: day)
            }
            .sorted { ($0.startAt ?? .distantPast) < ($1.startAt ?? .distantPast) }
    }

    private func deviceEvents(on day: Date) -> [DeviceEvent] {
        device.events.filter { calendar.isDate($0.start, inSameDayAs: day) }
    }

    private func timeRange(start: Date, end: Date?) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        if let end { return "\(formatter.string(from: start)) – \(formatter.string(from: end))" }
        return formatter.string(from: start)
    }

    private func shiftMonth(_ delta: Int) {
        if let next = calendar.date(byAdding: .month, value: delta, to: displayedMonth) { displayedMonth = next }
    }

    private func reloadDevice() {
        guard showDeviceCalendar, let interval = calendar.dateInterval(of: .month, for: displayedMonth) else {
            device.clear()
            return
        }
        device.load(from: interval.start, to: interval.end)
    }
}

struct EventDraft: Identifiable {
    let id = UUID()
    let item: Item?
    let day: Date
}

struct EventEditorView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let draft: EventDraft

    @State private var title: String
    @State private var start: Date
    @State private var end: Date
    @State private var hasEnd: Bool
    @State private var reminderMinutes: Int = -1
    @State private var saving = false

    init(draft: EventDraft) {
        self.draft = draft
        let calendar = Calendar.current
        let base = draft.item?.startAt ?? calendar.date(bySettingHour: 9, minute: 0, second: 0, of: draft.day) ?? draft.day
        _title = State(initialValue: draft.item?.title ?? "")
        _start = State(initialValue: base)
        _end = State(initialValue: draft.item?.endAt ?? base.addingTimeInterval(3600))
        _hasEnd = State(initialValue: draft.item?.endAt != nil || draft.item == nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section { TextField("Titre", text: $title) }
                Section {
                    DatePicker("Début", selection: $start)
                    Toggle("Heure de fin", isOn: $hasEnd.animation())
                    if hasEnd { DatePicker("Fin", selection: $end, in: start...) }
                }
                if draft.item == nil {
                    Section("Rappel") {
                        Picker("Prévenir", selection: $reminderMinutes) {
                            Text("Aucun").tag(-1)
                            Text("À l'heure").tag(0)
                            Text("15 minutes avant").tag(15)
                            Text("1 heure avant").tag(60)
                            Text("1 jour avant").tag(1440)
                        }
                    }
                }
                if let message = model.events.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger)
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle(draft.item == nil ? "Nouvel événement" : "Modifier")
            .ethoneScreen()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { save() }
                        .disabled(saving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.large])
    }

    private func save() {
        saving = true
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        let endDate: Date? = hasEnd ? max(end, start) : nil
        Task {
            if let item = draft.item {
                await model.events.updateEvent(item, title: trimmed, start: start, end: endDate)
            } else if let created = await model.events.create(title: trimmed, start: start, end: endDate), reminderMinutes >= 0 {
                if await NotificationManager.requestAuthorization() {
                    await NotificationManager.scheduleEvent(created, minutesBefore: reminderMinutes)
                }
            }
            saving = false
            if model.events.errorMessage == nil { dismiss() }
        }
    }
}
