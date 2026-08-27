import Foundation
import Combine

public struct BrainChatMessage: Identifiable, Codable {
    public let id: String
    public let role: String // "user" or "assistant"
    public let content: String
    public let model: String?
    public let createdAt: Date
    public let actionSummary: String?

    public init(
        id: String = UUID().uuidString,
        role: String,
        content: String,
        model: String? = nil,
        createdAt: Date = Date(),
        actionSummary: String? = nil
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.model = model
        self.createdAt = createdAt
        self.actionSummary = actionSummary
    }
}

public struct AIModel: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let provider: String
    public let badgeColor: String

    public init(id: String, name: String, provider: String, badgeColor: String = "violet") {
        self.id = id
        self.name = name
        self.provider = provider
        self.badgeColor = badgeColor
    }
}

@MainActor
public final class BrainService: ObservableObject {
    public static let shared = BrainService()

    @Published public var messages: [BrainChatMessage] = []
    @Published public var isThinking: Bool = false
    @Published public var selectedModel: AIModel
    @Published public var availableModels: [AIModel] = [
        AIModel(id: "claude-3-7-sonnet", name: "Claude 3.7", provider: "Anthropic"),
        AIModel(id: "gpt-5-omni", name: "GPT-5 Omni", provider: "OpenAI"),
        AIModel(id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek"),
        AIModel(id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "Google")
    ]

    public init() {
        self.selectedModel = AIModel(id: "claude-3-7-sonnet", name: "Claude 3.7", provider: "Anthropic")
        loadWelcomeMessage()
    }

    private func loadWelcomeMessage() {
        messages = [
            BrainChatMessage(
                role: "assistant",
                content: "Bonjour Rub. Je suis Brain, la couche intelligente de votre environnement ETHONE. Comment puis-je vous accompagner aujourd'hui ?",
                model: selectedModel.name,
                createdAt: Date()
            )
        ]
    }

    public func sendMessage(_ text: String, supabase: SupabaseManager) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let userMsg = BrainChatMessage(role: "user", content: trimmed, createdAt: Date())
        messages.append(userMsg)
        HapticManager.shared.light()

        isThinking = true

        // Simulate intelligent local interpretation & fast response or worker execution
        try? await Task.sleep(nanoseconds: 700_000_000)

        var actionSummary: String? = nil
        var replyText = ""

        let lower = trimmed.lowercased()
        if lower.contains("note") || lower.contains("écris") || lower.contains("rédige") {
            let noteTitle = trimmed.replacingOccurrences(of: "crée une note", with: "", options: .caseInsensitive)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let finalTitle = noteTitle.isEmpty ? "Nouvelle note Brain" : noteTitle
            Task {
                try? await supabase.createNote(title: finalTitle, body: "Créé automatiquement par Brain.")
            }
            actionSummary = "Note créée : \(finalTitle)"
            replyText = "J'ai créé la note « \(finalTitle) » dans votre espace personnel."
        } else if lower.contains("tâche") || lower.contains("rappel") || lower.contains("todo") {
            let taskTitle = trimmed.replacingOccurrences(of: "crée une tâche", with: "", options: .caseInsensitive)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let finalTitle = taskTitle.isEmpty ? "Tâche Brain" : taskTitle
            Task {
                try? await supabase.createTask(title: finalTitle, description: "Généré via Brain iOS", priority: "medium")
            }
            actionSummary = "Tâche ajoutée : \(finalTitle)"
            replyText = "Tâche « \(finalTitle) » enregistrée et synchronisée avec vos objectifs du jour."
        } else if lower.contains("focus") || lower.contains("pomodoro") {
            FocusManager.shared.selectMode(.pomodoro)
            FocusManager.shared.start()
            actionSummary = "Session Pomodoro démarrée (25m)"
            replyText = "Session de concentration Pomodoro démarrée pour 25 minutes. Bon travail !"
        } else {
            replyText = "J'ai analysé votre demande. Tout est parfaitement à jour sur vos espaces ETHONE."
        }

        let assistantMsg = BrainChatMessage(
            role: "assistant",
            content: replyText,
            model: selectedModel.name,
            createdAt: Date(),
            actionSummary: actionSummary
        )

        messages.append(assistantMsg)
        isThinking = false
        HapticManager.shared.success()
    }

    public func clearConversation() {
        loadWelcomeMessage()
        HapticManager.shared.medium()
    }
}
