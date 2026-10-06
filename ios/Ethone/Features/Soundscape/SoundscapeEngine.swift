import Foundation
import AVFoundation
import Combine

enum BinauralWaveType: String, CaseIterable, Identifiable {
    case delta = "delta"
    case theta = "theta"
    case alpha = "alpha"
    case beta = "beta"
    case gamma = "gamma"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .delta: "Delta (2 Hz)"
        case .theta: "Theta (6 Hz)"
        case .alpha: "Alpha (10 Hz)"
        case .beta: "Beta (18 Hz)"
        case .gamma: "Gamma (40 Hz)"
        }
    }

    var beatFrequency: Double {
        switch self {
        case .delta: 2.0
        case .theta: 6.0
        case .alpha: 10.0
        case .beta: 18.0
        case .gamma: 40.0
        }
    }

    var hint: String {
        switch self {
        case .delta: "Sommeil réparateur et régénération cellulaire"
        case .theta: "Méditation profonde et intuition"
        case .alpha: "Relaxation lucide et concentration calme"
        case .beta: "Focus cognitif intense et résolution de problèmes"
        case .gamma: "Haute créativité et pic d'attention"
        }
    }
}

enum SolfeggioFrequency: Int, CaseIterable, Identifiable {
    case f432 = 432
    case f528 = 528
    case f639 = 639
    case f852 = 852

    var id: Int { rawValue }

    var label: String { "\(rawValue) Hz" }

    var meaning: String {
        switch self {
        case .f432: "Clarté naturelle & résonance"
        case .f528: "Transformation & équilibre"
        case .f639: "Harmonie relationnelle & paix"
        case .f852: "Intuition & conscience pure"
        }
    }
}

enum AmbientSoundKind: String, CaseIterable, Identifiable {
    case rain = "rain"
    case ocean = "ocean"
    case stream = "stream"
    case wind = "wind"
    case campfire = "campfire"
    case whiteNoise = "whitenoise"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .rain: "Pluie douce"
        case .ocean: "Vagues océaniques"
        case .stream: "Ruisseau de montagne"
        case .wind: "Brise d'automne"
        case .campfire: "Feu de cheminée"
        case .whiteNoise: "Bruit blanc zen"
        }
    }

    var symbol: String {
        switch self {
        case .rain: "cloud.rain.fill"
        case .ocean: "water.waves"
        case .stream: "drop.fill"
        case .wind: "wind"
        case .campfire: "flame.fill"
        case .whiteNoise: "waveform"
        }
    }
}

struct SoundscapePreset: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let solfeggio: SolfeggioFrequency
    let wave: BinauralWaveType
    let symbol: String
    let volumes: [AmbientSoundKind: Double]

    static let all: [SoundscapePreset] = [
        SoundscapePreset(
            id: "sleep",
            title: "Sommeil profond",
            subtitle: "Delta 2 Hz · 432 Hz · Pluie & Vagues",
            solfeggio: .f432,
            wave: .delta,
            symbol: "moon.stars.fill",
            volumes: [.rain: 0.65, .ocean: 0.40]
        ),
        SoundscapePreset(
            id: "deep-focus",
            title: "Focus & Étude",
            subtitle: "Alpha 10 Hz · 528 Hz · Ruisseau zen",
            solfeggio: .f528,
            wave: .alpha,
            symbol: "brain.head.profile",
            volumes: [.stream: 0.50, .whiteNoise: 0.25]
        ),
        SoundscapePreset(
            id: "zen-meditation",
            title: "Méditation Zen",
            subtitle: "Theta 6 Hz · 639 Hz · Brise & Vagues",
            solfeggio: .f639,
            wave: .theta,
            symbol: "sparkles",
            volumes: [.wind: 0.45, .ocean: 0.35]
        ),
        SoundscapePreset(
            id: "creative-flow",
            title: "Créativité & Flow",
            subtitle: "Gamma 40 Hz · 528 Hz · Feu crépitant",
            solfeggio: .f528,
            wave: .gamma,
            symbol: "bolt.fill",
            volumes: [.campfire: 0.50, .stream: 0.30]
        ),
        SoundscapePreset(
            id: "mental-clarity",
            title: "Clarté Mentale",
            subtitle: "Beta 18 Hz · 852 Hz · Brise pure",
            solfeggio: .f852,
            wave: .beta,
            symbol: "eye.fill",
            volumes: [.wind: 0.60]
        ),
        SoundscapePreset(
            id: "cellular-regen",
            title: "Régénération",
            subtitle: "Delta 2 Hz · 528 Hz · Pluie & Ruisseau",
            solfeggio: .f528,
            wave: .delta,
            symbol: "leaf.fill",
            volumes: [.rain: 0.55, .stream: 0.45]
        ),
    ]
}

@Observable
final class SoundscapeEngine {
    var isPlaying = false
    var masterVolume: Double = 0.8
    var solfeggioVolume: Double = 0.45
    var binauralVolume: Double = 0.40

    var selectedSolfeggio: SolfeggioFrequency = .f528
    var selectedWave: BinauralWaveType = .alpha
    var ambientVolumes: [AmbientSoundKind: Double] = [
        .rain: 0.4,
        .ocean: 0.0,
        .stream: 0.2,
        .wind: 0.0,
        .campfire: 0.0,
        .whiteNoise: 0.0,
    ]

    var timerRemainingSeconds: Int? = nil
    private var sleepTimer: AnyCancellable?

    private var audioEngine: AVAudioEngine?
    private var sourceNode: AVAudioSourceNode?

    private var solfeggioPhase: Double = 0.0
    private var leftBinauralPhase: Double = 0.0
    private var rightBinauralPhase: Double = 0.0

    private var lastNoise: Double = 0.0
    private var brownNoise: Double = 0.0
    private var windLFO: Double = 0.0
    private var waveLFO: Double = 0.0

    init() {
        setupAudioSession()
    }

    deinit {
        stop()
    }

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {}
    }

    func togglePlay() {
        if isPlaying {
            stop()
        } else {
            start()
        }
    }

    func applyPreset(_ preset: SoundscapePreset) {
        selectedSolfeggio = preset.solfeggio
        selectedWave = preset.wave
        for kind in AmbientSoundKind.allCases {
            ambientVolumes[kind] = preset.volumes[kind] ?? 0.0
        }
        if !isPlaying {
            start()
        }
    }

    func start() {
        guard !isPlaying else { return }
        setupAudioSession()

        let engine = AVAudioEngine()
        let sampleRate: Double = 44100.0
        let twoPi = 2.0 * Double.pi

        let node = AVAudioSourceNode { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
            guard let self else { return noErr }

            let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
            guard ablPointer.count >= 2 else { return noErr }

            let leftBuffer = ablPointer[0].mData?.assumingMemoryBound(to: Float.self)
            let rightBuffer = ablPointer[1].mData?.assumingMemoryBound(to: Float.self)

            let master = Float(self.masterVolume)
            let solfeggioVol = Float(self.solfeggioVolume)
            let binauralVol = Float(self.binauralVolume)

            let solfFreq = Double(self.selectedSolfeggio.rawValue)
            let carrierFreq = solfFreq * 0.5
            let beatFreq = self.selectedWave.beatFrequency

            let leftBinauralFreq = carrierFreq
            let rightBinauralFreq = carrierFreq + beatFreq

            let solfStep = (solfFreq / sampleRate) * twoPi
            let leftBinauralStep = (leftBinauralFreq / sampleRate) * twoPi
            let rightBinauralStep = (rightBinauralFreq / sampleRate) * twoPi

            let rainVol = Float(self.ambientVolumes[.rain] ?? 0.0)
            let oceanVol = Float(self.ambientVolumes[.ocean] ?? 0.0)
            let streamVol = Float(self.ambientVolumes[.stream] ?? 0.0)
            let windVol = Float(self.ambientVolumes[.wind] ?? 0.0)
            let fireVol = Float(self.ambientVolumes[.campfire] ?? 0.0)
            let whiteVol = Float(self.ambientVolumes[.whiteNoise] ?? 0.0)

            for frame in 0..<Int(frameCount) {
                let solfSample = Float(sin(self.solfeggioPhase)) * 0.28 * solfeggioVol
                self.solfeggioPhase += solfStep
                if self.solfeggioPhase > twoPi { self.solfeggioPhase -= twoPi }

                let leftBin = Float(sin(self.leftBinauralPhase)) * 0.22 * binauralVol
                let rightBin = Float(sin(self.rightBinauralPhase)) * 0.22 * binauralVol

                self.leftBinauralPhase += leftBinauralStep
                if self.leftBinauralPhase > twoPi { self.leftBinauralPhase -= twoPi }

                self.rightBinauralPhase += rightBinauralStep
                if self.rightBinauralPhase > twoPi { self.rightBinauralPhase -= twoPi }

                let whiteRaw = (Double.random(in: -1.0...1.0))
                self.brownNoise = (self.brownNoise * 0.98) + (whiteRaw * 0.02)
                self.lastNoise = (self.lastNoise * 0.70) + (whiteRaw * 0.30)

                self.waveLFO += (0.08 / sampleRate) * twoPi
                if self.waveLFO > twoPi { self.waveLFO -= twoPi }

                self.windLFO += (0.15 / sampleRate) * twoPi
                if self.windLFO > twoPi { self.windLFO -= twoPi }

                let oceanLfoSample = Float((sin(self.waveLFO) + 1.0) * 0.5)
                let windLfoSample = Float((sin(self.windLFO) + 1.0) * 0.5)

                let ambientRain = Float(self.lastNoise) * 0.18 * rainVol
                let ambientOcean = Float(self.brownNoise * 1.8) * oceanLfoSample * 0.25 * oceanVol
                let ambientStream = Float(self.lastNoise) * 0.15 * streamVol
                let ambientWind = Float(self.brownNoise * 1.5) * windLfoSample * 0.20 * windVol
                let ambientFire = (Float(self.brownNoise) + (Float.random(in: 0...1) > 0.995 ? Float.random(in: -0.4...0.4) : 0)) * 0.20 * fireVol
                let ambientWhite = Float(whiteRaw) * 0.08 * whiteVol

                let ambientTotal = ambientRain + ambientOcean + ambientStream + ambientWind + ambientFire + ambientWhite

                let leftOut = (solfSample + leftBin + ambientTotal) * master
                let rightOut = (solfSample + rightBin + ambientTotal) * master

                leftBuffer?[frame] = max(-1.0, min(1.0, leftOut))
                rightBuffer?[frame] = max(-1.0, min(1.0, rightOut))
            }

            return noErr
        }

        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
        engine.attach(node)
        engine.connect(node, to: engine.mainMixerNode, format: format)

        do {
            try engine.start()
            self.audioEngine = engine
            self.sourceNode = node
            self.isPlaying = true
        } catch {}
    }

    func stop() {
        audioEngine?.stop()
        audioEngine = nil
        sourceNode = nil
        isPlaying = false
        stopTimer()
    }

    func setSleepTimer(minutes: Int?) {
        guard let minutes, minutes > 0 else {
            stopTimer()
            return
        }
        timerRemainingSeconds = minutes * 60
        sleepTimer?.cancel()
        sleepTimer = Timer.publish(every: 1.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                guard let self else { return }
                if let rem = self.timerRemainingSeconds {
                    if rem <= 1 {
                        self.stop()
                    } else {
                        self.timerRemainingSeconds = rem - 1
                    }
                }
            }
    }

    func stopTimer() {
        sleepTimer?.cancel()
        sleepTimer = nil
        timerRemainingSeconds = nil
    }
}
