import Foundation
import Combine
import SwiftUI

public enum FocusMode: String, CaseIterable, Identifiable {
    case pomodoro = "Pomodoro"
    case deepWork = "Deep Work"
    case sprint = "Sprint"
    case shortBreak = "Pause Courte"
    case longBreak = "Pause Longue"

    public var id: String { rawValue }

    public var defaultDurationSeconds: Int {
        switch self {
        case .pomodoro: return 25 * 60
        case .deepWork: return 50 * 60
        case .sprint: return 10 * 60
        case .shortBreak: return 5 * 60
        case .longBreak: return 15 * 60
        }
    }

    public var icon: String {
        switch self {
        case .pomodoro: return "timer"
        case .deepWork: return "brain"
        case .sprint: return "bolt.fill"
        case .shortBreak: return "cup.and.saucer.fill"
        case .longBreak: return "bed.double.fill"
        }
    }

    public var tintColor: Color {
        switch self {
        case .pomodoro: return ETHTheme.emerald
        case .deepWork: return ETHTheme.violet
        case .sprint: return ETHTheme.amber
        case .shortBreak: return ETHTheme.cyan
        case .longBreak: return ETHTheme.teal
        }
    }
}

@MainActor
public final class FocusManager: ObservableObject {
    public static let shared = FocusManager()

    @Published public var currentMode: FocusMode = .pomodoro
    @Published public var isActive: Bool = false
    @Published public var isPaused: Bool = false
    @Published public var totalSeconds: Int = 25 * 60
    @Published public var remainingSeconds: Int = 25 * 60
    @Published public var completedSessions: Int = 0

    private var timer: Timer?

    public init() {
        self.totalSeconds = currentMode.defaultDurationSeconds
        self.remainingSeconds = totalSeconds
    }

    public var progress: Double {
        guard totalSeconds > 0 else { return 0 }
        return Double(totalSeconds - remainingSeconds) / Double(totalSeconds)
    }

    public var formattedTime: String {
        let minutes = remainingSeconds / 60
        let seconds = remainingSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    public func selectMode(_ mode: FocusMode) {
        guard !isActive else { return }
        currentMode = mode
        totalSeconds = mode.defaultDurationSeconds
        remainingSeconds = totalSeconds
        HapticManager.shared.selection()
    }

    public func start() {
        guard !isActive else { return }
        isActive = true
        isPaused = false
        HapticManager.shared.medium()

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.start(
                preset: currentMode.rawValue,
                totalDuration: TimeInterval(totalSeconds),
                endDate: Date().addingTimeInterval(TimeInterval(remainingSeconds))
            )
        }

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                self.tick()
            }
        }
    }

    public func pause() {
        guard isActive, !isPaused else { return }
        isPaused = true
        timer?.invalidate()
        timer = nil
        HapticManager.shared.light()

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.update(
                progress: progress,
                remaining: TimeInterval(remainingSeconds),
                isRunning: false
            )
        }
    }

    public func resume() {
        guard isActive, isPaused else { return }
        isPaused = false
        HapticManager.shared.light()

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.update(
                progress: progress,
                remaining: TimeInterval(remainingSeconds),
                isRunning: true
            )
        }

        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            Task { @MainActor in
                self.tick()
            }
        }
    }

    public func stop() {
        timer?.invalidate()
        timer = nil
        isActive = false
        isPaused = false
        remainingSeconds = totalSeconds
        HapticManager.shared.heavy()

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.end()
        }
    }

    private func tick() {
        guard remainingSeconds > 0 else {
            completeSession()
            return
        }
        remainingSeconds -= 1

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.update(
                progress: progress,
                remaining: TimeInterval(remainingSeconds),
                isRunning: !isPaused
            )
        }
    }

    private func completeSession() {
        timer?.invalidate()
        timer = nil
        isActive = false
        isPaused = false
        completedSessions += 1
        remainingSeconds = totalSeconds
        HapticManager.shared.success()

        if #available(iOS 26.0, *) {
            FocusLiveActivityManager.shared.end()
        }
    }
}
