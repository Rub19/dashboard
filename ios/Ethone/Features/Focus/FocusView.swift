import SwiftUI

struct FocusView: View {
    @Environment(AppModel.self) private var model
    @State private var selectedPreset: FocusPreset = .pomodoro
    @State private var goal = ""

    private var focus: FocusManager { model.focus }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    timerRing

                    if !focus.isActive {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Objectif").sectionTitle()
                                TextField("Sur quoi allez-vous vous concentrer ?", text: $goal)
                                    .submitLabel(.done)
                            }
                        }
                        presetPicker
                    } else if !focus.goal.isEmpty {
                        GlassPill(text: focus.goal, systemImage: "target")
                    }

                    controls

                    if let message = focus.errorMessage {
                        Text(message).font(.footnote).foregroundStyle(Theme.danger)
                    }

                    todayCard
                    historyCard
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .refreshable { await focus.refreshSessions() }
            .navigationTitle("Focus")
            .task { await focus.refreshSessions() }
            .onChange(of: focus.completedPomodoros) { _, _ in
                Task { await focus.refreshSessions() }
            }
        }
    }

    // MARK: Minuteur

    private var timerRing: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let remaining = focus.isActive ? focus.remaining(at: context.date) : TimeInterval(selectedPreset.work * 60)
            let progress = focus.isActive ? focus.progress(at: context.date) : 0
            ZStack {
                Circle().stroke(Color.white.opacity(0.10), lineWidth: 16)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(ringColor.gradient, style: StrokeStyle(lineWidth: 16, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.4), value: progress)
                VStack(spacing: 6) {
                    Text(FocusManager.format(remaining))
                        .font(.system(size: 60, weight: .bold, design: .rounded).monospacedDigit())
                        .contentTransition(.numericText())
                    Text(phaseTitle).font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
                }
            }
            .frame(width: 270, height: 270)
            .padding(22)
            .glassEffect(.regular, in: .circle)
        }
        .padding(.top, 8)
    }

    private var ringColor: Color {
        switch focus.phase {
        case .shortBreak, .longBreak: return Theme.success
        default: return Theme.accent
        }
    }

    private var phaseTitle: String {
        switch focus.phase {
        case .idle: return selectedPreset.label
        case .focus: return focus.isPaused ? "En pause" : "Concentration"
        case .shortBreak: return "Pause courte"
        case .longBreak: return "Pause longue"
        }
    }

    // MARK: Préréglages

    private var presetPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Préréglage").sectionTitle().padding(.leading, 4)
            ScrollView(.horizontal, showsIndicators: false) {
                GlassEffectContainer(spacing: 10) {
                    HStack(spacing: 10) {
                        ForEach(FocusPreset.allCases) { preset in
                            Button {
                                selectedPreset = preset
                            } label: {
                                VStack(spacing: 2) {
                                    Text(preset.label).font(.subheadline.weight(.semibold))
                                    Text("\(preset.work) min").font(.caption).foregroundStyle(.secondary)
                                }
                                .padding(.horizontal, 6)
                            }
                            .buttonStyle(.glass)
                            .tint(preset == selectedPreset ? Theme.accent : nil)
                        }
                    }
                    .padding(.horizontal, 2)
                }
            }
        }
    }

    // MARK: Commandes

    @ViewBuilder
    private var controls: some View {
        GlassEffectContainer(spacing: 14) {
            HStack(spacing: 14) {
                if !focus.isActive {
                    Button {
                        focus.start(preset: selectedPreset, goal: goal)
                    } label: {
                        Label("Démarrer", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.glassProminent)
                } else {
                    Button {
                        if focus.isPaused { focus.resume() } else { focus.pause() }
                    } label: {
                        Label(focus.isPaused ? "Reprendre" : "Pause", systemImage: focus.isPaused ? "play.fill" : "pause.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.glassProminent)

                    Button(role: .destructive) {
                        focus.stop()
                    } label: {
                        Label(focus.phase == .focus ? "Arrêter" : "Passer", systemImage: focus.phase == .focus ? "stop.fill" : "forward.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                    .buttonStyle(.glass)
                }
            }
        }
        .sensoryFeedback(.impact(weight: .medium), trigger: focus.phase)
    }

    // MARK: Statistiques

    private var todayCard: some View {
        GlassEffectContainer(spacing: 14) {
            HStack(spacing: 14) {
                statTile(value: "\(focus.sessionsToday)", label: "Sessions aujourd'hui", systemImage: "checkmark.seal.fill", tint: Theme.success)
                statTile(value: "\(focus.minutesToday) min", label: "Concentration", systemImage: "hourglass", tint: Theme.accent)
            }
        }
    }

    private func statTile(value: String, label: String, systemImage: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: systemImage).font(.title3).foregroundStyle(tint)
            Text(value).font(.system(size: 26, weight: .bold, design: .rounded))
            Text(label).font(.footnote).foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(Glass.regular.tint(tint.opacity(0.15)), in: .rect(cornerRadius: Theme.cardRadius))
    }

    private var historyCard: some View {
        Group {
            if !focus.sessions.isEmpty {
                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Historique").sectionTitle()
                        ForEach(focus.sessions.prefix(8)) { session in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(session.goal?.isEmpty == false ? session.goal! : (FocusPreset(rawValue: session.preset)?.label ?? session.preset))
                                        .lineLimit(1)
                                    Text(session.completedAt, format: .dateTime.day().month(.abbreviated).hour().minute())
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text("\(session.duration / 60) min").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Mini-lecteur affiché au-dessus de la barre d'onglets pendant une session (comme le lecteur Musique d'iOS 26).
struct FocusMiniBar: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let focus = model.focus
        TimelineView(.periodic(from: .now, by: 1)) { context in
            HStack(spacing: 10) {
                Image(systemName: focus.phase == .focus ? "brain.head.profile" : "cup.and.saucer.fill")
                    .foregroundStyle(focus.phase == .focus ? Theme.accent : Theme.success)
                Text(focus.isActive ? (focus.isPaused ? "En pause" : (focus.phase == .focus ? "Focus" : "Pause")) : "Focus")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(focus.isActive ? FocusManager.format(focus.remaining(at: context.date)) : "Démarrer")
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
                if focus.isActive {
                    Button {
                        if focus.isPaused { focus.resume() } else { focus.pause() }
                    } label: {
                        Image(systemName: focus.isPaused ? "play.fill" : "pause.fill")
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
