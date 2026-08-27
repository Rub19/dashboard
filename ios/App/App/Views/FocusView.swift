import SwiftUI

public struct FocusView: View {
    @ObservedObject var focus = FocusManager.shared
    @ObservedObject var audio = AudioManager.shared
    @State private var showingSoundDrawer = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                ScrollView {
                    VStack(spacing: 28) {
                        // Mode Selector Pills
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(FocusMode.allCases) { mode in
                                    Button(action: { focus.selectMode(mode) }) {
                                        HStack(spacing: 6) {
                                            Image(systemName: mode.icon)
                                                .font(.system(size: 12, weight: .semibold))
                                            Text(mode.rawValue)
                                                .font(.system(size: 13, weight: .semibold))
                                        }
                                        .foregroundStyle(focus.currentMode == mode ? Color.black : Color.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(
                                            Capsule()
                                                .fill(focus.currentMode == mode ? mode.tintColor : Color.white.opacity(0.08))
                                        )
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.top, 8)

                        // Circular Progress Ring
                        ZStack {
                            // Background track
                            Circle()
                                .stroke(Color.white.opacity(0.08), lineWidth: 16)
                                .frame(width: 240, height: 240)

                            // Animated progress fill
                            Circle()
                                .trim(from: 0, to: focus.progress)
                                .stroke(
                                    LinearGradient(
                                        colors: [focus.currentMode.tintColor, ETHTheme.cyan],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    style: StrokeStyle(lineWidth: 16, lineCap: .round)
                                )
                                .frame(width: 240, height: 240)
                                .rotationEffect(.degrees(-90))
                                .animation(ETHTheme.springSmooth, value: focus.progress)

                            // Center content
                            VStack(spacing: 6) {
                                Text(focus.formattedTime)
                                    .font(.system(size: 48, weight: .bold, design: .rounded))
                                    .foregroundStyle(.primary)
                                    .monospacedDigit()

                                Text(focus.isActive ? (focus.isPaused ? "En pause" : "En cours...") : "Prêt")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(focus.currentMode.tintColor)
                            }
                        }
                        .padding(.vertical, 12)

                        // Action Controls
                        HStack(spacing: 16) {
                            if !focus.isActive {
                                ETHGlassButton(
                                    title: "Démarrer",
                                    icon: "play.fill",
                                    accent: focus.currentMode.tintColor,
                                    isPrimary: true,
                                    action: { focus.start() }
                                )
                            } else {
                                if focus.isPaused {
                                    ETHGlassButton(
                                        title: "Reprendre",
                                        icon: "play.fill",
                                        accent: focus.currentMode.tintColor,
                                        isPrimary: true,
                                        action: { focus.resume() }
                                    )
                                } else {
                                    ETHGlassButton(
                                        title: "Pause",
                                        icon: "pause.fill",
                                        accent: ETHTheme.amber,
                                        isPrimary: false,
                                        action: { focus.pause() }
                                    )
                                }

                                ETHGlassButton(
                                    title: "Terminer",
                                    icon: "stop.fill",
                                    accent: ETHTheme.rose,
                                    isPrimary: false,
                                    action: { focus.stop() }
                                )
                            }
                        }

                        // Ambient Sound Mixer Bar
                        ETHGlassCard(cornerRadius: 20, padding: 14) {
                            VStack(spacing: 12) {
                                HStack {
                                    HStack(spacing: 8) {
                                        Image(systemName: "headphones")
                                            .foregroundStyle(ETHTheme.cyan)
                                        Text("Sons d'Ambiance")
                                            .font(.system(size: 15, weight: .bold))
                                    }
                                    Spacer()
                                    Button(action: { showingSoundDrawer = true }) {
                                        Text("Mixeur (10 pistes)")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(ETHTheme.cyan)
                                    }
                                }

                                HStack(spacing: 12) {
                                    ForEach(audio.tracks.prefix(4)) { track in
                                        Button(action: {
                                            audio.setTrackVolume(id: track.id, volume: track.volume > 0 ? 0.0 : 0.6)
                                        }) {
                                            VStack(spacing: 4) {
                                                Image(systemName: track.icon)
                                                    .font(.system(size: 16))
                                                Text(track.name.components(separatedBy: " ").first ?? "")
                                                    .font(.system(size: 10))
                                            }
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 8)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .fill(track.volume > 0 ? ETHTheme.cyan.opacity(0.2) : Color.white.opacity(0.05))
                                            )
                                            .foregroundStyle(track.volume > 0 ? ETHTheme.cyan : .secondary)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 90)
                }
            }
            .navigationTitle("Focus")
            .sheet(isPresented: $showingSoundDrawer) {
                AmbientSoundMixerSheet(audio: audio)
            }
        }
    }
}

struct AmbientSoundMixerSheet: View {
    @ObservedObject var audio: AudioManager
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Mixeur Multicanal")) {
                    ForEach($audio.tracks) { $track in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Image(systemName: track.icon)
                                    .foregroundStyle(track.volume > 0 ? ETHTheme.cyan : .secondary)
                                    .frame(width: 24)
                                Text(track.name)
                                    .font(.system(size: 15, weight: .medium))
                                Spacer()
                                Text("\(Int(track.volume * 100))%")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(.secondary)
                            }
                            Slider(value: $track.volume, in: 0...1) { _ in
                                if track.volume > 0 && !audio.isPlaying {
                                    audio.isPlaying = true
                                }
                            }
                            .tint(ETHTheme.cyan)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Environnements Sonores")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Tout couper") { audio.muteAll() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Terminé") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
