import Foundation
import Observation

@MainActor
@Observable
final class HabitsStore {
    private let api: APIClient

    private(set) var habits: [Habit] = []
    private(set) var completions: [HabitCompletion] = []
    private(set) var isLoading = false
    var errorMessage: String?

    private var habitsKey: String { "habits-\(api.auth.user?.id ?? "anon")" }
    private var completionsKey: String { "habit-completions-\(api.auth.user?.id ?? "anon")" }

    init(api: APIClient) {
        self.api = api
    }

    var activeHabits: [Habit] { habits.filter { !$0.archived } }

    func refresh() async {
        if habits.isEmpty, let cached = DiskCache.read([Habit].self, key: habitsKey) { habits = cached }
        if completions.isEmpty, let cached = DiskCache.read([HabitCompletion].self, key: completionsKey) { completions = cached }
        isLoading = true
        defer { isLoading = false }
        do {
            let since = DayKey.string(DayKey.daysAgo(90))
            async let fetchedHabits: [Habit] = api.list("ethone_habits", query: [URLQueryItem(name: "order", value: "created_at.desc")])
            async let fetchedCompletions: [HabitCompletion] = api.list("ethone_habit_completions", query: [URLQueryItem(name: "completed_on", value: "gte.\(since)")])
            let (h, c) = try await (fetchedHabits, fetchedCompletions)
            habits = h
            completions = c
            errorMessage = nil
            DiskCache.write(h, key: habitsKey)
            DiskCache.write(c, key: completionsKey)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    @discardableResult
    func create(name: String, emoji: String) async -> Habit? {
        do {
            let created: Habit = try await api.insert("ethone_habits", fields: [
                "name": .string(name),
                "emoji": .string(emoji),
                "target_per_week": .number(7),
            ])
            habits.insert(created, at: 0)
            DiskCache.write(habits, key: habitsKey)
            errorMessage = nil
            return created
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            return nil
        }
    }

    func delete(_ habit: Habit) async {
        guard let index = habits.firstIndex(where: { $0.id == habit.id }) else { return }
        let removed = habits.remove(at: index)
        do {
            try await api.remove("ethone_habits", id: habit.id)
            completions.removeAll { $0.habitId == habit.id }
            DiskCache.write(habits, key: habitsKey)
            errorMessage = nil
        } catch {
            habits.insert(removed, at: min(index, habits.count))
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func isDone(_ habit: Habit, on day: String = DayKey.string()) -> Bool {
        completions.contains { $0.habitId == habit.id && $0.completedOn == day }
    }

    /// Valide ou annule le jour courant (une ligne par habitude et par jour, comme sur le site).
    func toggleToday(_ habit: Habit) async {
        let today = DayKey.string()
        if let existing = completions.first(where: { $0.habitId == habit.id && $0.completedOn == today }) {
            completions.removeAll { $0.id == existing.id }
            do {
                try await api.remove("ethone_habit_completions", id: existing.id)
                errorMessage = nil
            } catch {
                completions.append(existing)
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        } else {
            do {
                let created: HabitCompletion = try await api.insert("ethone_habit_completions", fields: [
                    "habit_id": .string(habit.id),
                    "completed_on": .string(today),
                ])
                completions.append(created)
                errorMessage = nil
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
        DiskCache.write(completions, key: completionsKey)
    }

    /// Série en cours : jours consécutifs validés, en comptant depuis aujourd'hui (ou hier si aujourd'hui n'est pas encore validé).
    func streak(_ habit: Habit) -> Int {
        let days = Set(completions.filter { $0.habitId == habit.id }.map(\.completedOn))
        var offset = days.contains(DayKey.string(DayKey.daysAgo(0))) ? 0 : 1
        var count = 0
        while days.contains(DayKey.string(DayKey.daysAgo(offset))) {
            count += 1
            offset += 1
        }
        return count
    }

    /// Les 14 derniers jours (du plus ancien au plus récent) avec l'état de validation.
    func history(_ habit: Habit, days: Int = 14) -> [HabitDay] {
        let done = Set(completions.filter { $0.habitId == habit.id }.map(\.completedOn))
        return (0..<days).reversed().map { offset in
            let key = DayKey.string(DayKey.daysAgo(offset))
            return HabitDay(day: key, done: done.contains(key))
        }
    }
}

struct HabitDay: Identifiable {
    let day: String
    let done: Bool
    var id: String { day }
}
