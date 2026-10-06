import Charts
import SwiftUI

struct AnalyticsView: View {
    @Environment(AppModel.self) private var model
    @State private var range: Period = .week

    enum Period: Int, CaseIterable, Identifiable {
        case week = 7, month = 30
        var id: Int { rawValue }
        var label: String { self == .week ? "7 jours" : "30 jours" }
    }

    private struct DayPoint: Identifiable {
        let day: Date
        let value: Double
        var id: Date { day }
    }

    private var days: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<range.rawValue).reversed().compactMap { calendar.date(byAdding: .day, value: -$0, to: today) }
    }

    private var focusPoints: [DayPoint] {
        let calendar = Calendar.current
        return days.map { day in
            let seconds = model.focus.sessions.filter { calendar.isDate($0.completedAt, inSameDayAs: day) }.reduce(0) { $0 + $1.duration }
            return DayPoint(day: day, value: Double(seconds) / 60)
        }
    }

    private var doneTaskPoints: [DayPoint] {
        let calendar = Calendar.current
        return days.map { day in
            let count = model.tasks.items.filter { $0.isDone && calendar.isDate($0.updatedAt, inSameDayAs: day) }.count
            return DayPoint(day: day, value: Double(count))
        }
    }

    private var habitRate: [DayPoint] {
        let habits = model.habits.activeHabits
        guard !habits.isEmpty else { return [] }
        return days.map { day in
            let key = DayKey.string(day)
            let done = habits.filter { model.habits.isDone($0, on: key) }.count
            return DayPoint(day: day, value: Double(done) / Double(habits.count) * 100)
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Picker("Période", selection: $range) {
                    ForEach(Period.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                summary

                chartCard(title: "Concentration (minutes / jour)", symbol: "timer", empty: model.focus.sessions.isEmpty ? "Aucune session terminée pour l'instant." : nil) {
                    Chart(focusPoints) { point in
                        BarMark(x: .value("Jour", point.day, unit: .day), y: .value("Minutes", point.value))
                            .foregroundStyle(Theme.accent.gradient)
                            .cornerRadius(4)
                    }
                }

                chartCard(title: "Habitudes validées (%)", symbol: "flame.fill", empty: habitRate.isEmpty ? "Ajoutez des habitudes pour suivre votre régularité." : nil) {
                    Chart(habitRate) { point in
                        AreaMark(x: .value("Jour", point.day, unit: .day), y: .value("Taux", point.value))
                            .foregroundStyle(Theme.success.opacity(0.25))
                        LineMark(x: .value("Jour", point.day, unit: .day), y: .value("Taux", point.value))
                            .foregroundStyle(Theme.success)
                            .interpolationMethod(.monotone)
                    }
                    .chartYScale(domain: 0...100)
                }

                chartCard(title: "Tâches terminées / jour", symbol: "checklist", empty: nil) {
                    Chart(doneTaskPoints) { point in
                        BarMark(x: .value("Jour", point.day, unit: .day), y: .value("Tâches", point.value))
                            .foregroundStyle(Theme.violet.gradient)
                            .cornerRadius(4)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .navigationTitle("Analytique")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .task { await model.refreshAll() }
    }

    private var summary: some View {
        let totalMinutes = Int(focusPoints.reduce(0) { $0 + $1.value })
        let totalDone = Int(doneTaskPoints.reduce(0) { $0 + $1.value })
        let bestStreak = model.habits.activeHabits.map { model.habits.streak($0) }.max() ?? 0
        return GlassEffectContainer(spacing: 12) {
            HStack(spacing: 12) {
                tile("\(totalMinutes) min", "Concentration", "timer", Theme.accent)
                tile("\(totalDone)", "Tâches faites", "checkmark.circle.fill", Theme.violet)
                tile("\(bestStreak) j", "Meilleure série", "flame.fill", Color(hex: 0xF59E0B))
            }
        }
    }

    private func tile(_ value: String, _ label: String, _ symbol: String, _ tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).foregroundStyle(tint)
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(Glass.regular.tint(tint.opacity(0.15)), in: .rect(cornerRadius: 18))
    }

    private func chartCard<C: View>(title: String, symbol: String, empty: String?, @ViewBuilder chart: () -> C) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Label(title, systemImage: symbol).font(.subheadline.weight(.semibold))
                if let empty {
                    Text(empty).font(.footnote).foregroundStyle(.secondary)
                } else {
                    chart().frame(height: 170)
                }
            }
        }
    }
}

