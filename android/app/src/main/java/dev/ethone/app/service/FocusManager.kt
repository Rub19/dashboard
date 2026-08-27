package dev.ethone.app.service

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import dev.ethone.app.ui.theme.EthoneAmber
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthoneViolet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

enum class FocusPreset(val label: String, val durationMinutes: Int, val tint: Color) {
    Pomodoro("Pomodoro", 25, EthoneEmerald),
    DeepWork("Deep Work", 50, EthoneViolet),
    Sprint("Sprint", 10, EthoneAmber),
    ShortBreak("Pause Courte", 5, EthoneCyan)
}

object FocusManager {
    private val scope = CoroutineScope(Dispatchers.Main)
    private var timerJob: Job? = null

    var currentPreset by mutableStateOf(FocusPreset.Pomodoro)
        private set

    var isRunning by mutableStateOf(false)
        private set

    var isPaused by mutableStateOf(false)
        private set

    var totalSeconds by mutableIntStateOf(25 * 60)
        private set

    var remainingSeconds by mutableIntStateOf(25 * 60)
        private set

    var completedSessions by mutableIntStateOf(0)
        private set

    val progress: Float
        get() = if (totalSeconds > 0) (totalSeconds - remainingSeconds).toFloat() / totalSeconds.toFloat() else 0f

    val formattedTime: String
        get() {
            val minutes = remainingSeconds / 60
            val seconds = remainingSeconds % 60
            return String.format("%02d:%02d", minutes, seconds)
        }

    fun selectPreset(preset: FocusPreset) {
        if (isRunning) return
        currentPreset = preset
        totalSeconds = preset.durationMinutes * 60
        remainingSeconds = totalSeconds
    }

    fun start() {
        if (isRunning) return
        isRunning = true
        isPaused = false

        timerJob = scope.launch {
            while (isActive && remainingSeconds > 0) {
                delay(1000)
                if (!isPaused) {
                    remainingSeconds--
                }
            }
            if (remainingSeconds <= 0) {
                completeSession()
            }
        }
    }

    fun pause() {
        if (!isRunning || isPaused) return
        isPaused = true
    }

    fun resume() {
        if (!isRunning || !isPaused) return
        isPaused = false
    }

    fun stop() {
        timerJob?.cancel()
        timerJob = null
        isRunning = false
        isPaused = false
        remainingSeconds = totalSeconds
    }

    private fun completeSession() {
        stop()
        completedSessions++
    }
}
