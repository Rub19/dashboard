package dev.ethone.app.service

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import dev.ethone.app.data.SupabaseClient
import kotlinx.coroutines.delay
import java.util.UUID

data class BrainMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String, // "user" or "assistant"
    val content: String,
    val model: String? = null,
    val actionSummary: String? = null
)

data class AIModel(
    val id: String,
    val name: String,
    val provider: String
)

object BrainService {
    val availableModels = listOf(
        AIModel("claude-3-7", "Claude 3.7 Sonnet", "Anthropic"),
        AIModel("gpt-5-omni", "GPT-5 Omni", "OpenAI"),
        AIModel("deepseek-r1", "DeepSeek R1", "DeepSeek"),
        AIModel("gemini-2-5", "Gemini 2.5 Pro", "Google")
    )

    var selectedModel by mutableStateOf(availableModels[0])

    var isThinking by mutableStateOf(false)
        private set

    val messages = mutableStateListOf(
        BrainMessage(
            role = "assistant",
            content = "Bonjour Rub. Je suis Brain, votre copilote pour l'écosystème ETHONE. Que souhaitez-vous accomplir aujourd'hui ?",
            model = "Claude 3.7 Sonnet"
        )
    )

    suspend fun sendMessage(text: String, client: SupabaseClient) {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return

        messages.add(BrainMessage(role = "user", content = trimmed))
        isThinking = true

        delay(650)

        val lower = trimmed.lowercase()
        var actionSummary: String? = null
        val replyText: String

        when {
            lower.contains("note") || lower.contains("écris") -> {
                val title = trimmed.replace("crée une note", "", ignoreCase = true).trim()
                val finalTitle = if (title.isEmpty()) "Note Brain Android" else title
                client.createNote(title = finalTitle, body = "Créé automatiquement par Brain.")
                actionSummary = "Note créée : $finalTitle"
                replyText = "J'ai créé la note « $finalTitle » dans vos notes ETHONE."
            }
            lower.contains("tâche") || lower.contains("rappel") || lower.contains("todo") -> {
                val title = trimmed.replace("crée une tâche", "", ignoreCase = true).trim()
                val finalTitle = if (title.isEmpty()) "Tâche Brain" else title
                client.createTask(title = finalTitle)
                actionSummary = "Tâche ajoutée : $finalTitle"
                replyText = "Tâche « $finalTitle » enregistrée avec succès."
            }
            lower.contains("focus") || lower.contains("pomodoro") -> {
                FocusManager.selectPreset(FocusPreset.Pomodoro)
                FocusManager.start()
                actionSummary = "Session Pomodoro démarrée (25m)"
                replyText = "Session Focus de 25 minutes démarrée. Bon travail !"
            }
            else -> {
                replyText = "J'ai analysé votre demande. Vos données sont synchronisées sur l'ensemble de vos appareils ETHONE."
            }
        }

        messages.add(
            BrainMessage(
                role = "assistant",
                content = replyText,
                model = selectedModel.name,
                actionSummary = actionSummary
            )
        )
        isThinking = false
    }

    fun clearMessages() {
        messages.clear()
        messages.add(
            BrainMessage(
                role = "assistant",
                content = "Bonjour Rub. Que puis-je faire pour vous ?",
                model = selectedModel.name
            )
        )
    }
}
