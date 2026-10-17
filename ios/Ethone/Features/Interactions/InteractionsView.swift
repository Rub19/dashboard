import SwiftUI

/// Activity heatmap built from the account's journal in Supabase: the same data as the website's Interactions page.
struct InteractionsView: View {
    @Environment(AppModel.self) private var model

    private let weeks = 26
    private let cellSize: CGFloat = 14
    private let spacing: CGFloat = 4
    @State private var events: [CloudActivity] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var selectedDay: Date?

    private var calendar: Calendar {
        var calendar = Calendar.current
        calendar.firstWeekday = 2
        return calendar
    }

    private var counts: [String: Int] {
        events.reduce(into: [:]) { result, event in
            if let date = event.date { result[DayKey.string(date), default: 0] += 1 }
        }
    }

    private var grid: [[Date?]] {
        let today = calendar.startOfDay(for: Date())
        let weekday = (calendar.component(.weekday, from: today) - calendar.firstWeekday + 7) % 7
        guard let lastMonday = calendar.date(byAdding: .day, value: -weekday, to: today) else { return [] }
        return (0..<weeks).reversed().map { offset in
            let monday = calendar.date(byAdding: .day, value: -7 * offset, to: lastMonday) ?? lastMonday
            return (0..<7).map { dayIndex -> Date? in
                let day = calendar.date(byAdding: .day, value: dayIndex, to: monday) ?? today
                return day > today ? nil : day
            }
        }
    }

    private var streak: Int {
        let data = counts
        var day = calendar.startOfDay(for: Date())
        if data[DayKey.string(day)] == nil, let yesterday = calendar.date(byAdding: .day, value: -1, to: day) { day = yesterday }
        var run = 0
        while data[DayKey.string(day)] != nil {
            run += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return run
    }

    var body: some View {
        let data = counts
        ScrollView {
            VStack(spacing: 16) {
                if let errorMessage {
                    Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).frame(maxWidth: .infinity, alignment: .leading)
                }
                StatStrip(items: [
                    ("\(data.values.reduce(0, +))", "Interactions"),
                    ("\(data.count)", "Jours actifs"),
                    ("\(streak)", "Série"),
                    ("\(data.values.max() ?? 0)", "Meilleur jour"),
                ])
                heatmap(data)
                if let day = selectedDay { dayDetail(day) }
                categories
                recent
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .overlay {
            if loading && events.isEmpty { ProgressView() }
        }
        .navigationTitle("Interactions")
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        do {
            events = try await ActivityLog.load(model.api)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        loading = false
    }

    private func heatmap(_ data: [String: Int]) -> some View {
        let columns = grid
        let weekdays = ["Lun", "", "Mer", "", "Ven", "", "Dim"]
        return GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("26 dernières semaines").sectionTitle()
                HStack(alignment: .top, spacing: 6) {
                    VStack(alignment: .leading, spacing: spacing) {
                        Text(" ").font(.caption2).frame(height: 14)
                        ForEach(0..<7, id: \.self) { index in
                            Text(LocalizedStringKey(weekdays[index])).font(.caption2).foregroundStyle(.secondary).frame(height: cellSize)
                        }
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: spacing) {
                            ForEach(Array(columns.enumerated()), id: \.offset) { index, week in
                                VStack(spacing: spacing) {
                                    Text(monthLabel(columns, index))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                        .fixedSize()
                                        .frame(width: cellSize, height: 14, alignment: .leading)
                                    ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                                        cell(day, data)
                                    }
                                }
                            }
                        }
                        .padding(.trailing, 2)
                    }
                    .defaultScrollAnchor(.trailing)
                }
                HStack(spacing: 6) {
                    Text(selectedDay == nil ? "Touchez une case pour voir le détail du jour." : "").font(.caption2).foregroundStyle(.secondary)
                    Spacer()
                    Text("Moins").font(.caption2).foregroundStyle(.secondary)
                    ForEach(0..<5, id: \.self) { level in
                        RoundedRectangle(cornerRadius: 3).fill(color(level)).frame(width: 12, height: 12)
                    }
                    Text("Plus").font(.caption2).foregroundStyle(.secondary)
                }
            }
        }
    }

    private func monthLabel(_ columns: [[Date?]], _ index: Int) -> String {
        guard let first = columns[index].compactMap({ $0 }).first else { return "" }
        let month = calendar.component(.month, from: first)
        if index > 0, let previous = columns[index - 1].compactMap({ $0 }).first, calendar.component(.month, from: previous) == month { return "" }
        return first.formatted(.dateTime.month(.abbreviated))
    }

    private func dayDetail(_ day: Date) -> some View {
        let items = events.filter { $0.date.map { calendar.isDate($0, inSameDayAs: day) } == true }
        return GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(day.formatted(.dateTime.weekday(.wide).day().month(.wide))).font(.headline)
                    Spacer()
                    Text(plural(items.count, "interaction", "interactions")).font(.subheadline).foregroundStyle(.secondary)
                }
                if items.isEmpty {
                    Text("Aucune activité ce jour-là.").font(.subheadline).foregroundStyle(.secondary)
                } else {
                    ForEach(items.prefix(12)) { eventRow($0) }
                }
            }
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    private var categories: some View {
        let groups = Dictionary(grouping: events, by: \.category).mapValues(\.count).sorted { $0.value > $1.value }
        let total = max(1, events.count)
        return GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Text("Répartition").sectionTitle()
                if groups.isEmpty {
                    Text("Aucune interaction enregistrée pour l'instant.").font(.subheadline).foregroundStyle(.secondary)
                }
                ForEach(groups, id: \.key) { group in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack {
                            Text(LocalizedStringKey(group.key)).font(.subheadline)
                            Spacer()
                            Text("\(group.value) · \(Int((Double(group.value) / Double(total) * 100).rounded())) %")
                                .font(.caption).foregroundStyle(.secondary).monospacedDigit()
                        }
                        GeometryReader { proxy in
                            Capsule().fill(Color.primary.opacity(0.08))
                                .overlay(alignment: .leading) {
                                    Capsule().fill(Theme.accent.gradient).frame(width: proxy.size.width * Double(group.value) / Double(total))
                                }
                        }
                        .frame(height: 6)
                    }
                }
            }
        }
    }

    private var recent: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("Récentes").sectionTitle()
                ForEach(events.prefix(8)) { eventRow($0) }
            }
        }
        .opacity(events.isEmpty ? 0 : 1)
    }

    private func eventRow(_ event: CloudActivity) -> some View {
        HStack(spacing: 10) {
            Image(systemName: symbol(event.category))
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.accent)
                .frame(width: 28, height: 28)
                .background(Theme.accent.opacity(0.15), in: .rect(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 1) {
                Text(event.title).font(.subheadline).lineLimit(1)
                Text(LocalizedStringKey(event.category)).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if let date = event.date {
                Text(date, format: .relative(presentation: .named)).font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    private func symbol(_ category: String) -> String {
        switch category {
        case "Navigation": return "safari"
        case "Personnalisation": return "paintpalette"
        case "Brain": return "sparkles"
        case "Productivité": return "checkmark.circle"
        default: return "arrow.triangle.2.circlepath"
        }
    }

    private func cell(_ day: Date?, _ data: [String: Int]) -> some View {
        let count = day.map { data[DayKey.string($0)] ?? 0 } ?? 0
        let selected = day != nil && selectedDay.map { calendar.isDate($0, inSameDayAs: day!) } == true
        return RoundedRectangle(cornerRadius: 3)
            .fill(day == nil ? Color.clear : color(level(count)))
            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(selected ? Color.primary : .clear, lineWidth: 1.5))
            .frame(width: cellSize, height: cellSize)
            .contentShape(.rect)
            .onTapGesture {
                guard let day else { return }
                withAnimation(Motion.swap) { selectedDay = selected ? nil : day }
            }
            .sensoryFeedback(.selection, trigger: selected)
            .accessibilityLabel(day.map { "\($0.formatted(date: .complete, time: .omitted)) : \(count)" } ?? "")
    }

    private func level(_ count: Int) -> Int {
        switch count {
        case 0: return 0
        case 1...3: return 1
        case 4...10: return 2
        case 11...25: return 3
        default: return 4
        }
    }

    private func color(_ level: Int) -> Color {
        level == 0 ? Color.primary.opacity(0.08) : Theme.accent.opacity(0.35 + 0.16 * Double(level))
    }
}
