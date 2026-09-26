import Foundation
import Observation

#if canImport(FoundationModels)
import FoundationModels
#endif

struct ChatMessage: Identifiable, Hashable {
    enum Role { case user, assistant }
    let id = UUID()
    let role: Role
    var text: String
}

/// Assistant Brain : modèle Apple Intelligence sur l'appareil (FoundationModels, hors ligne et privé) ou Cloud ETHONE via le Worker.
@MainActor
@Observable
final class BrainChat {
    enum Engine: String, CaseIterable, Identifiable {
        case device, cloud
        var id: String { rawValue }
        var label: String { self == .device ? "Sur l'appareil (Apple Intelligence)" : "Cloud ETHONE" }
    }

    private(set) var messages: [ChatMessage] = []
    private(set) var isThinking = false
    var errorMessage: String?
    private(set) var engine: Engine

    @ObservationIgnored private let api: APIClient
    @ObservationIgnored private var deviceSession: Any?

    init(api: APIClient) {
        self.api = api
        let saved = UserDefaults.standard.string(forKey: "ethone.brain.engine").flatMap(Engine.init(rawValue:))
        self.engine = saved ?? .cloud
    }

    /// Explication lisible quand le modèle local n'est pas utilisable ; `nil` s'il est disponible.
    var deviceUnavailableReason: String? {
        #if canImport(FoundationModels)
        switch SystemLanguageModel.default.availability {
        case .available:
            return nil
        case .unavailable(let reason):
            switch reason {
            case .deviceNotEligible: return "Cet appareil ne prend pas en charge Apple Intelligence."
            case .appleIntelligenceNotEnabled: return "Activez Apple Intelligence dans Réglages > Apple Intelligence et Siri."
            case .modelNotReady: return "Le modèle Apple Intelligence est encore en cours de téléchargement."
            @unknown default: return "Apple Intelligence est indisponible pour le moment."
            }
        }
        #else
        return "Apple Intelligence n'est pas disponible dans cette version."
        #endif
    }

    func setEngine(_ newEngine: Engine) {
        engine = newEngine
        UserDefaults.standard.set(newEngine.rawValue, forKey: "ethone.brain.engine")
        deviceSession = nil
    }

    func reset() {
        messages = []
        deviceSession = nil
        errorMessage = nil
    }

    /// `context` : résumé factuel des données de l'utilisateur (tâches, agenda, habitudes) pour que Brain réponde à propos de SES données.
    func send(_ text: String, context: String) async {
        let prompt = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty, !isThinking else { return }
        messages.append(ChatMessage(role: .user, text: prompt))
        isThinking = true
        errorMessage = nil
        defer { isThinking = false }

        do {
            let answer: String
            switch engine {
            case .device: answer = try await askDevice(prompt, context: context)
            case .cloud: answer = try await askCloud(context: context)
            }
            messages.append(ChatMessage(role: .assistant, text: answer))
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    // MARK: Sur l'appareil

    private func askDevice(_ prompt: String, context: String) async throws -> String {
        #if canImport(FoundationModels)
        if let reason = deviceUnavailableReason { throw APIError.http(status: 503, code: nil, message: reason) }
        let session: LanguageModelSession
        if let existing = deviceSession as? LanguageModelSession {
            session = existing
        } else {
            session = LanguageModelSession(instructions: Self.instructions(context: context))
            deviceSession = session
        }
        let response = try await session.respond(to: prompt)
        return response.content
        #else
        throw APIError.http(status: 503, code: nil, message: "Apple Intelligence n'est pas disponible dans cette version.")
        #endif
    }

    // MARK: Cloud ETHONE

    private func askCloud(context: String) async throws -> String {
        var payload: [JSONValue] = [.object(["role": .string("system"), "content": .string(Self.instructions(context: context))])]
        for message in messages {
            payload.append(.object(["role": .string(message.role == .user ? "user" : "assistant"), "content": .string(message.text)]))
        }
        let body = APIClient.json(["messages": .array(payload)])
        let data: JSONValue = try await api.worker("api/brain/complete", method: "POST", body: body)
        if let content = data["content"]?.stringValue ?? data["text"]?.stringValue,
           !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return content.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        throw APIError.decoding("Brain n'a renvoyé aucune réponse.")
    }

    static func instructions(context: String) -> String {
        """
        Tu es Brain, l'assistant personnel d'ETHONE. Réponds toujours en français, de façon concise et utile.
        Ne prétends jamais avoir effectué une action (créer, supprimer, envoyer) : tu ne peux que conseiller.
        Si l'information demandée ne figure pas dans le contexte ci-dessous, dis-le franchement au lieu d'inventer.

        Contexte de l'utilisateur (données réelles) :
        \(context)
        """
    }
}
