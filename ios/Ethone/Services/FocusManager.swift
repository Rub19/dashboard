import ActivityKit
import Foundation
import Observation

/// Préréglages identiques à ceux du site (durées en minutes).
enum FocusPreset: String, CaseIterable, Identifiable, Codable {
    case pomodoro
    case deepWork = "deep-work"
    case sprint
    case flow
    case study
    case quick

    var id: String { rawValue }

    var label: String {
        switch self {
        case .pomodoro: return "Pomodoro"
        case .deepWork: return "Travail profond"
        case .sprint: return "Sprint"
        case .flow: return "Flow"
        case .study: return "Étude"
        case .quick: return "Éclair"
        }
    }

    var work: Int {
        switch self {
        case .pomodoro: return 25
        case .deepWork: return 50
        case .sprint: return 15
        case .flow: return 90
        case .study: return 45
        case .quick: return 10
        }
    }

    var shortBreak: Int {
        switch self {
        case .pomodoro: return 5
        case .deepWork: return 10
        case .sprint: return 3
        case .flow: return 20
        case .study: return 10
        case .quick: return 2
        }
    }

    var longBreak: Int {
        switch self {
        case .pomodoro: return 15
        case .deepWork: return 30
        case .sprint: return 8
        case .flow: return 30
        case .study: return 20
        case .quick: return 5
        }
    }
}

/// Minuteur de concentration : calculé à partir de dates (jamais d'un compteur), donc exact même après suspension de l'app.
/// Pilote la Live Activity (écran verrouillé + Dynamic Island) et une notification de fin.
@MainActor
@Observable
final class FocusManager {
    enum Phase: String, Codable { case idle, focus, shortBreak, longBreak }

    private struct Persisted: Codable {
        var phase: Phase
        var preset: FocusPreset
        var goal: String
        var startDate: Date
        var endDate: Date
        var totalSeconds: TimeInterval
        var pausedRemaining: TimeInterval?
        var completedPomodoros: Int
    }

    private(set) var phase: Phase = .idle
    private(set) var preset: FocusPreset = .pomodoro
    private(set) var goal = ""
    private(set) var startDate = Date()
    private(set) var endDate = Date()
    private(set) var totalSeconds: TimeInterval = 0
    private(set) var pausedRemaining: TimeInterval?
    private(set) var completedPomodoros = 0
    private(set) var sessions: [FocusSessionRecord] = []
    var errorMessage: String?

    @ObservationIgnored private let api: APIClient
    @ObservationIgnored private var activity: Activity<FocusActivityAttributes>?
    @ObservationIgnored private var completionTask: Task<Void, Never>?
    private static let storageKey = "ethone.focus.state.v1"

    init(api: APIClient) {
        self.api = api
    }

    var isActive: Bool { phase != .idle }
    var isRunning: Bool { phase != .idle && pausedRemaining == nil }
    var isPaused: Bool { phase != .idle && pausedRemaining != nil }

    func remaining(at date: Date = Date()) -> TimeInterval {
        if let pausedRemaining { return pausedRemaining }
        return max(0, endDate.timeIntervalSince(date))
    }

    func progress(at date: Date = Date()) -> Double {
        guard totalSeconds > 0 else { return 0 }
        return min(1, max(0, 1 - remaining(at: date) / totalSeconds))
    }

    static func format(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded(.up))
        return String(format: "%02d:%02d", total / 60, total % 60)
    }

    // MARK: Commandes

    func start(preset: FocusPreset, goal: String) {
        self.preset = preset
        self.goal = goal.trimmingCharacters(in: .whitespaces)
        completedPomodoros = 0
        begin(phase: .focus, minutes: preset.work)
        Task { await NotificationManager.requestAuthorization() }
    }

    func pause() {
        guard isRunning else { return }
        pausedRemaining = remaining()
        completionTask?.cancel()
        NotificationManager.cancelFocusEnd()
        persist()
        updateActivity()
    }

    func resume() {
        guard let remaining = pausedRemaining else { return }
        pausedRemaining = nil
        endDate = Date().addingTimeInterval(remaining)
        startDate = endDate.addingTimeInterval(-totalSeconds)
        persist()
        updateActivity()
        arm()
    }

    /// Arrête tout sans enregistrer de session (seules les sessions terminées comptent, comme sur le site).
    func stop() {
        completionTask?.cancel()
        NotificationManager.cancelFocusEnd()
        endActivity()
        phase = .idle
        pausedRemaining = nil
        UserDefaults.standard.removeObject(forKey: Self.storageKey)
    }

    // MARK: Données

    func refreshSessions() async {
        do {
            sessions = try await api.list("ethone_focus_sessions", query: [
                URLQueryItem(name: "order", value: "completed_at.desc"),
                URLQueryItem(name: "limit", value: "60"),
            ])
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    var minutesToday: Int {
        let start = Calendar.current.startOfDay(for: Date())
        return sessions.filter { $0.completedAt >= start }.reduce(0) { $0 + $1.duration } / 60
    }

    var sessionsToday: Int {
        let start = Calendar.current.startOfDay(for: Date())
        return sessions.filter { $0.completedAt >= start }.count
    }

    // MARK: Reprise après relance de l'app

    func restore() async {
        activity = Activity<FocusActivityAttributes>.activities.first
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let saved = try? JSONDecoder().decode(Persisted.self, from: data), saved.phase != .idle else { return }
        phase = saved.phase
        preset = saved.preset
        goal = saved.goal
        startDate = saved.startDate
        endDate = saved.endDate
        totalSeconds = saved.totalSeconds
        pausedRemaining = saved.pausedRemaining
        completedPomodoros = saved.completedPomodoros

        if pausedRemaining != nil { return }
        if endDate <= Date() {
            await complete()
        } else {
            arm()
        }
    }

    // MARK: Interne

    private func begin(phase newPhase: Phase, minutes: Int) {
        phase = newPhase
        totalSeconds = TimeInterval(minutes * 60)
        startDate = Date()
        endDate = startDate.addingTimeInterval(totalSeconds)
        pausedRemaining = nil
        persist()
        if activity == nil { startActivity() } else { updateActivity() }
        arm()
    }

    private func arm() {
        completionTask?.cancel()
        let delay = remaining()
        let title = phase == .focus ? "Session terminée" : "Pause terminée"
        let body = phase == .focus ? (goal.isEmpty ? "Bravo, prenez une pause." : "Bravo ! Objectif : \(goal)") : "C'est reparti quand vous voulez."
        Task { await NotificationManager.scheduleFocusEnd(in: delay, title: title, body: body) }
        completionTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            if Task.isCancelled { return }
            await self?.complete()
        }
    }

    private func complete() async {
        completionTask?.cancel()
        switch phase {
        case .focus:
            completedPomodoros += 1
            await record(duration: totalSeconds)
            let next: Phase = completedPomodoros % 4 == 0 ? .longBreak : .shortBreak
            begin(phase: next, minutes: next == .longBreak ? preset.longBreak : preset.shortBreak)
        case .shortBreak, .longBreak:
            stop()
        case .idle:
            break
        }
    }

    private func record(duration: TimeInterval) async {
        do {
            var fields: [String: JSONValue] = [
                "duration": .number(duration),
                "preset": .string(preset.rawValue),
                "completed_at": .string(ISODate.string(Date())),
            ]
            fields["goal"] = goal.isEmpty ? .null : .string(goal)
            let created: FocusSessionRecord = try await api.insert("ethone_focus_sessions", fields: fields)
            sessions.insert(created, at: 0)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func persist() {
        let state = Persisted(phase: phase, preset: preset, goal: goal, startDate: startDate, endDate: endDate,
                              totalSeconds: totalSeconds, pausedRemaining: pausedRemaining, completedPomodoros: completedPomodoros)
        if let data = try? JSONEncoder().encode(state) { UserDefaults.standard.set(data, forKey: Self.storageKey) }
    }

    // MARK: Live Activity

    private func contentState() -> FocusActivityAttributes.ContentState {
        FocusActivityAttributes.ContentState(
            phase: phase.rawValue,
            startDate: startDate,
            endDate: endDate,
            isPaused: pausedRemaining != nil,
            remaining: remaining()
        )
    }

    private func startActivity() {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = FocusActivityAttributes(preset: preset.rawValue, goal: goal.isEmpty ? nil : goal, totalSeconds: totalSeconds)
        let content = ActivityContent(state: contentState(), staleDate: endDate.addingTimeInterval(120))
        activity = try? Activity.request(attributes: attributes, content: content, pushType: nil)
    }

    private func updateActivity() {
        guard let activity else { return }
        let content = ActivityContent(state: contentState(), staleDate: endDate.addingTimeInterval(120))
        Task { await activity.update(content) }
    }

    private func endActivity() {
        guard let activity else { return }
        self.activity = nil
        Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }
}
