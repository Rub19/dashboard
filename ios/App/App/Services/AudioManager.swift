import Foundation
import Combine
import AVFoundation

public struct SoundTrack: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let icon: String
    public var volume: Float // 0.0 to 1.0
    public var isMuted: Bool

    public init(id: String, name: String, icon: String, volume: Float = 0.0, isMuted: Bool = false) {
        self.id = id
        self.name = name
        self.icon = icon
        self.volume = volume
        self.isMuted = isMuted
    }
}

@MainActor
public final class AudioManager: ObservableObject {
    public static let shared = AudioManager()

    @Published public var isPlaying: Bool = false
    @Published public var masterVolume: Float = 0.8
    @Published public var tracks: [SoundTrack] = [
        SoundTrack(id: "rain", name: "Pluie Douce", icon: "cloud.rain.fill", volume: 0.5),
        SoundTrack(id: "heavy_rain", name: "Pluie Forte", icon: "cloud.heavyrain.fill", volume: 0.0),
        SoundTrack(id: "thunder", name: "Tonnerre", icon: "cloud.bolt.fill", volume: 0.2),
        SoundTrack(id: "forest", name: "Forêt & Oiseaux", icon: "leaf.fill", volume: 0.0),
        SoundTrack(id: "ocean", name: "Vagues de l'Océan", icon: "water.waves", volume: 0.0),
        SoundTrack(id: "fireplace", name: "Feu de Cheminée", icon: "flame.fill", volume: 0.0),
        SoundTrack(id: "cafe", name: "Ambiance Café", icon: "cup.and.saucer.fill", volume: 0.0),
        SoundTrack(id: "night", name: "Nuit d'Été", icon: "moon.stars.fill", volume: 0.0),
        SoundTrack(id: "wind", name: "Brise & Vent", icon: "wind", volume: 0.0),
        SoundTrack(id: "brown_noise", name: "Bruit Brun", icon: "waveform", volume: 0.0)
    ]

    public init() {}

    public func togglePlayback() {
        isPlaying.toggle()
        HapticManager.shared.medium()
    }

    public func setTrackVolume(id: String, volume: Float) {
        if let index = tracks.firstIndex(where: { $0.id == id }) {
            tracks[index].volume = volume
            if volume > 0 && !isPlaying {
                isPlaying = true
            }
        }
    }

    public func muteAll() {
        for index in tracks.indices {
            tracks[index].volume = 0.0
        }
        isPlaying = false
        HapticManager.shared.light()
    }
}
