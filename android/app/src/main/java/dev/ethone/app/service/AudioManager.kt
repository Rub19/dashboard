package dev.ethone.app.service

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

data class SoundTrack(
    val id: String,
    val name: String,
    val iconName: String,
    var volume: Float = 0f
)

object AudioManager {
    var isPlaying by mutableStateOf(false)
        private set

    var masterVolume by mutableFloatStateOf(0.8f)

    val tracks = mutableStateListOf(
        SoundTrack("rain", "Pluie Douce", "water_drop", 0.5f),
        SoundTrack("heavy_rain", "Pluie Forte", "thunderstorm", 0.0f),
        SoundTrack("thunder", "Tonnerre Lointain", "bolt", 0.2f),
        SoundTrack("forest", "Forêt & Oiseaux", "park", 0.0f),
        SoundTrack("ocean", "Vagues de l'Océan", "waves", 0.0f),
        SoundTrack("fireplace", "Feu de Cheminée", "local_fire_department", 0.0f),
        SoundTrack("cafe", "Ambiance Café", "coffee", 0.0f),
        SoundTrack("night", "Nuit d'Été", "bedtime", 0.0f),
        SoundTrack("wind", "Brise & Vent", "air", 0.0f),
        SoundTrack("brown_noise", "Bruit Brun", "graphic_eq", 0.0f)
    )

    fun togglePlayback() {
        isPlaying = !isPlaying
    }

    fun setTrackVolume(id: String, volume: Float) {
        val index = tracks.indexOfFirst { it.id == id }
        if (index != -1) {
            tracks[index] = tracks[index].copy(volume = volume)
            if (volume > 0f && !isPlaying) {
                isPlaying = true
            }
        }
    }

    fun muteAll() {
        for (i in tracks.indices) {
            tracks[i] = tracks[i].copy(volume = 0f)
        }
        isPlaying = false
    }
}
