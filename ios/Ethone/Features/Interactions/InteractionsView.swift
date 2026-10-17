import SwiftUI

struct InteractionsView: View {
    @Environment(AppModel.self) private var model

    private let weeks = 26
    @State private var selectedDay: Date?

    private var counts: [String: Int] {
        var result: [String: Int] = [:]
        func add(_ date: Date) { result[DayKey.string(date), default: 0] += 1 }
        model.notes.items.forEach { add($0.updatedAt) }
        model.tasks.items.forEach { add($0.updatedAt) }
        model.events.items.forEach { add($0.updatedAt) }
        model.focus.sessions.forEach { add($0.completedAt) }
        for completion in model.habits.completions { result[completion.completedOn, default: 0] += 1 }
        return result
    }

    private var grid: [[Date?]] {
        var calendar = Calendar.current
        calendar.firstWeekday = 2
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

    var body: some View {
        let data = counts
        let total = data.values.reduce(0, +)
        let best = data.values.max() ?? 0
        ScrollView {
            VStack(spacing: 16) {
                StatStrip(items: [
                    ("\(total)", "Interactions"),
                    ("\(data.count)", "Jours actifs"),
                    ("\(best)", "Meilleur jour"),
                ])
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("26 dernières semaines").sectionTitle()
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 4) {
                                ForEach(Array(grid.enumerated()), id: \.offset) { _, week in
                                    VStack(spacing: 4) {
                                        ForEach(Array(week.enumerated()), id: \.offset) { _, day in
                                            cell(day, data)
                                        }
                                    }
                                }
                            }
                        }
                        .defaultScrollAnchor(.trailing)
                        Group {
                            if let day = selectedDay {
                                let count = data[DayKey.string(day)] ?? 0
                                Text("\(day.formatted(.dateTime.weekday(.wide).day().month(.wide))) : \(plural(count, "interaction", "interactions"))")
                            } else {
                                Text("Touchez une case pour voir le détail du jour.")
                            }
                        }
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .contentTransition(.opacity)
                        .animation(Motion.swap, value: selectedDay)
                        HStack(spacing: 6) {
                            Text("Moins").font(.caption2).foregroundStyle(.secondary)
                            ForEach(0..<5, id: \.self) { level in
                                RoundedRectangle(cornerRadius: 3).fill(color(level)).frame(width: 12, height: 12)
                            }
                            Text("Plus").font(.caption2).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .navigationTitle("Interactions")
        .ethoneScreen()
        .task { await model.refreshAll() }
    }

    private func cell(_ day: Date?, _ data: [String: Int]) -> some View {
        let count = day.map { data[DayKey.string($0)] ?? 0 } ?? 0
        let selected = day != nil && selectedDay.map { Calendar.current.isDate($0, inSameDayAs: day!) } == true
        return RoundedRectangle(cornerRadius: 3)
            .fill(day == nil ? Color.clear : color(level(count)))
            .overlay(RoundedRectangle(cornerRadius: 3).strokeBorder(selected ? Color.primary : .clear, lineWidth: 1.5))
            .frame(width: 14, height: 14)
            .contentShape(.rect)
            .onTapGesture { if let day { selectedDay = day } }
            .sensoryFeedback(.selection, trigger: selected)
    }

    private func level(_ count: Int) -> Int {
        switch count {
        case 0: return 0
        case 1...2: return 1
        case 3...5: return 2
        case 6...10: return 3
        default: return 4
        }
    }

    private func color(_ level: Int) -> Color {
        level == 0 ? Color.primary.opacity(0.08) : Theme.accent.opacity(0.45 + 0.14 * Double(level))
    }

}

