import SwiftUI

struct WatchRootView: View {
    @Environment(WatchModel.self) private var model

    var body: some View {
        TabView {
            SummaryPage()
            TasksPage()
            FocusPage()
        }
        .tabViewStyle(.verticalPage)
    }
}

private struct SummaryPage: View {
    @Environment(WatchModel.self) private var model

    var body: some View {
        if let snapshot = model.snapshot {
            VStack(spacing: 10) {
                Text("ETHONE").font(.caption.bold()).foregroundStyle(.secondary)
                Text("\(snapshot.openTaskCount)")
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                Text("tâches ouvertes").font(.footnote).foregroundStyle(.secondary)
                Gauge(value: snapshot.habitsTotal == 0 ? 0 : Double(snapshot.habitsDone) / Double(snapshot.habitsTotal)) {
                    Image(systemName: "flame.fill")
                } currentValueLabel: {
                    Text("\(snapshot.habitsDone)/\(snapshot.habitsTotal)")
                }
                .gaugeStyle(.accessoryCircular)
                .tint(.orange)
            }
        } else {
            VStack(spacing: 8) {
                Image(systemName: "iphone.and.arrow.forward").font(.title2)
                Text("Ouvrez ETHONE sur l'iPhone pour synchroniser.").font(.footnote).multilineTextAlignment(.center)
            }
        }
    }
}

private struct TasksPage: View {
    @Environment(WatchModel.self) private var model

    var body: some View {
        List {
            Section("À faire") {
                if let tasks = model.snapshot?.nextTasks, !tasks.isEmpty {
                    ForEach(tasks, id: \.self) { title in
                        Label(title, systemImage: "circle").lineLimit(2)
                    }
                } else {
                    Text(model.snapshot == nil ? "En attente de l'iPhone…" : "Rien à faire 🎉").foregroundStyle(.secondary)
                }
            }
        }
    }
}

private struct FocusPage: View {
    @Environment(WatchModel.self) private var model

    private let presets: [(id: String, label: String)] = [("pomodoro", "Pomodoro 25"), ("deep-work", "Profond 50"), ("quick", "Éclair 10")]

    var body: some View {
        let snapshot = model.snapshot
        let active = snapshot?.focusPhase != nil
        ScrollView {
            VStack(spacing: 10) {
                if active, let end = snapshot?.focusEndDate {
                    Label(snapshot?.focusPhase == "focus" ? "Focus" : "Pause", systemImage: snapshot?.focusPhase == "focus" ? "timer" : "cup.and.saucer.fill")
                        .font(.headline)
                    if snapshot?.focusPaused == true {
                        Text("En pause").foregroundStyle(.secondary)
                    } else {
                        Text(timerInterval: Date.now...max(end, Date.now.addingTimeInterval(1)), countsDown: true)
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .monospacedDigit()
                    }
                    HStack {
                        Button(snapshot?.focusPaused == true ? "Reprendre" : "Pause") {
                            model.send(snapshot?.focusPaused == true ? "focus.resume" : "focus.pause")
                        }
                        Button("Stop", role: .destructive) { model.send("focus.stop") }
                    }
                } else {
                    ForEach(presets, id: \.id) { preset in
                        Button(preset.label) { model.send("focus.start", preset: preset.id) }
                            .buttonStyle(.borderedProminent)
                    }
                    Text("\(snapshot?.focusMinutesToday ?? 0) min aujourd'hui").font(.footnote).foregroundStyle(.secondary)
                }
                if let message = model.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(.red)
                }
            }
        }
    }
}
