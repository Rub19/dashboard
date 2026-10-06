import SwiftUI

struct SoundscapeView: View {
    @Environment(AppModel.self) private var model
    @State private var engine = SoundscapeEngine.shared

    @State private var showTimerSheet = false
    @State private var activeTab: SoundscapeSection = .presets

    enum SoundscapeSection: String, CaseIterable, Identifiable {
        case presets = "Préréglages"
        case frequencies = "Fréquences"
        case mixer = "Mixeur"

        var id: String { rawValue }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                WaveVisualizer(engine: engine)
                    .frame(height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .stroke(Color.white.opacity(0.12), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.3), radius: 16, y: 8)
                    .padding(.horizontal)

                Picker("Section", selection: $activeTab) {
                    ForEach(SoundscapeSection.allCases) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                switch activeTab {
                case .presets:
                    presetsSection
                case .frequencies:
                    frequenciesSection
                case .mixer:
                    mixerSection
                }
            }
            .padding(.top, 12)
            .padding(.bottom, 100)
        }
        .scrollIndicators(.hidden)
        .navigationTitle("Soundscape")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .safeAreaInset(edge: .bottom) {
            bottomFloatingBar
        }
        .sheet(isPresented: $showTimerSheet) {
            timerSheetView
        }
    }

    private var presetsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Ambiances 1-clic").sectionTitle()
                Spacer()
                Text("6 configurations").font(.caption).foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                ForEach(SoundscapePreset.all) { preset in
                    Button {
                        engine.applyPreset(preset)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: preset.symbol)
                                    .font(.title3)
                                    .foregroundStyle(Color(hex: model.accentHex))
                                Spacer()
                                if engine.isPlaying && engine.selectedSolfeggio == preset.solfeggio && engine.selectedWave == preset.wave {
                                    Circle()
                                        .fill(Theme.success)
                                        .frame(width: 8, height: 8)
                                }
                            }

                            Text(preset.title)
                                .font(.headline)
                                .foregroundStyle(.primary)

                            Text(preset.subtitle)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassEffect(.regular, in: .rect(cornerRadius: 18))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private var frequenciesSection: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Fréquences sacrées Solfeggio").sectionTitle()
                    .padding(.horizontal)

                VStack(spacing: 8) {
                    ForEach(SolfeggioFrequency.allCases) { freq in
                        Button {
                            engine.selectedSolfeggio = freq
                            if !engine.isPlaying { engine.start() }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(freq.label)
                                        .font(.subheadline.bold())
                                        .foregroundStyle(engine.selectedSolfeggio == freq ? Color(hex: model.accentHex) : .primary)
                                    Text(freq.meaning)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if engine.selectedSolfeggio == freq {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color(hex: model.accentHex))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .glassEffect(engine.selectedSolfeggio == freq ? Glass.regular.tint(Color(hex: model.accentHex).opacity(0.18)) : Glass.regular, in: .rect(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Ondes cérébrales binaurales (stéréo)").sectionTitle()
                    .padding(.horizontal)

                VStack(spacing: 8) {
                    ForEach(BinauralWaveType.allCases) { wave in
                        Button {
                            engine.selectedWave = wave
                            if !engine.isPlaying { engine.start() }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(wave.label)
                                        .font(.subheadline.bold())
                                        .foregroundStyle(engine.selectedWave == wave ? Color(hex: model.accentHex) : .primary)
                                    Text(wave.hint)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if engine.selectedWave == wave {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color(hex: model.accentHex))
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .glassEffect(engine.selectedWave == wave ? Glass.regular.tint(Color(hex: model.accentHex).opacity(0.18)) : Glass.regular, in: .rect(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var mixerSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Mixeur multi-pistes").sectionTitle()
                .padding(.horizontal)

            VStack(spacing: 12) {
                mixerRow(
                    title: "Fréquence Solfeggio (\(engine.selectedSolfeggio.label))",
                    symbol: "waveform.circle.fill",
                    value: $engine.solfeggioVolume
                )

                mixerRow(
                    title: "Battement Binaural (\(engine.selectedWave.label))",
                    symbol: "headphones",
                    value: $engine.binauralVolume
                )

                Divider().opacity(0.3).padding(.vertical, 4)

                ForEach(AmbientSoundKind.allCases) { kind in
                    let binding = Binding<Double>(
                        get: { engine.ambientVolumes[kind] ?? 0.0 },
                        set: { engine.ambientVolumes[kind] = $0 }
                    )
                    mixerRow(
                        title: kind.label,
                        symbol: kind.symbol,
                        value: binding
                    )
                }
            }
            .padding(.horizontal)
        }
    }

    private func mixerRow(title: String, symbol: String, value: Binding<Double>) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.body)
                .foregroundStyle(value.wrappedValue > 0 ? Color(hex: model.accentHex) : .secondary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title).font(.subheadline)
                    Spacer()
                    Text("\(Int(value.wrappedValue * 100)) %")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                Slider(value: value, in: 0...1)
                    .tint(Color(hex: model.accentHex))
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: 16))
    }

    private var bottomFloatingBar: some View {
        HStack(spacing: 16) {
            Button {
                engine.togglePlay()
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: engine.isPlaying ? "pause.fill" : "play.fill")
                        .font(.title3)
                    Text(engine.isPlaying ? "Pause" : "Écouter")
                        .font(.headline)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 22)
                .padding(.vertical, 12)
                .background(Color(hex: model.accentHex), in: Capsule())
            }

            Spacer()

            Button {
                showTimerSheet = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "timer")
                    if let seconds = engine.timerRemainingSeconds {
                        Text("\(seconds / 60)m \(seconds % 60)s")
                            .font(.caption.bold().monospacedDigit())
                    } else {
                        Text("Minuteur")
                            .font(.subheadline)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .glassEffect(engine.timerRemainingSeconds != nil ? Glass.regular.tint(Color(hex: model.accentHex).opacity(0.3)) : Glass.regular, in: .capsule)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .glassEffect(.regular, in: .capsule)
        .padding(.horizontal)
        .padding(.bottom, 6)
    }

    private var timerSheetView: some View {
        NavigationStack {
            List {
                Section("Arrêt automatique") {
                    timerRow(label: "Désactivé", minutes: nil)
                    timerRow(label: "15 minutes", minutes: 15)
                    timerRow(label: "30 minutes", minutes: 30)
                    timerRow(label: "45 minutes", minutes: 45)
                    timerRow(label: "1 heure", minutes: 60)
                    timerRow(label: "2 heures", minutes: 120)
                }
            }
            .navigationTitle("Minuteur de mise en veille")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fermer") { showTimerSheet = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func timerRow(label: String, minutes: Int?) -> some View {
        Button {
            engine.setSleepTimer(minutes: minutes)
            showTimerSheet = false
        } label: {
            HStack {
                Text(label).foregroundStyle(.primary)
                Spacer()
                if (minutes == nil && engine.timerRemainingSeconds == nil) ||
                   (minutes != nil && engine.timerRemainingSeconds == (minutes! * 60)) {
                    Image(systemName: "checkmark").foregroundStyle(Color(hex: model.accentHex))
                }
            }
        }
    }
}

private struct WaveVisualizer: View {
    @Environment(AppModel.self) private var model
    let engine: SoundscapeEngine

    var body: some View {
        TimelineView(.animation) { timeline in
            let date = timeline.date.timeIntervalSinceReferenceDate
            let isPlaying = engine.isPlaying
            let accent = Color(hex: model.accentHex)

            Canvas { context, size in
                let midY = size.height * 0.5
                let width = size.width

                let bgRect = CGRect(origin: .zero, size: size)
                context.fill(Path(bgRect), with: .color(Color.black.opacity(0.65)))

                guard isPlaying else {
                    var flatPath = Path()
                    flatPath.move(to: CGPoint(x: 0, y: midY))
                    flatPath.addLine(to: CGPoint(x: width, y: midY))
                    context.stroke(flatPath, with: .color(accent.opacity(0.3)), lineWidth: 1.5)
                    return
                }

                let layers: [(amplitude: Double, speed: Double, color: Color, width: CGFloat)] = [
                    (amplitude: 28.0, speed: 2.2, color: accent.opacity(0.75), width: 2.5),
                    (amplitude: 18.0, speed: 3.4, color: Color.cyan.opacity(0.60), width: 2.0),
                    (amplitude: 12.0, speed: 1.6, color: Color.purple.opacity(0.50), width: 1.5),
                ]

                for layer in layers {
                    var path = Path()
                    path.move(to: CGPoint(x: 0, y: midY))

                    let step = 3.0
                    for x in stride(from: 0.0, through: Double(width), by: step) {
                        let relX = x / Double(width)
                        let envelope = sin(relX * .pi)
                        let y = midY + sin((x * 0.02) + (date * layer.speed)) * layer.amplitude * envelope
                        path.addLine(to: CGPoint(x: x, y: y))
                    }

                    context.stroke(path, with: .color(layer.color), lineWidth: layer.width)
                }
            }
        }
    }
}
