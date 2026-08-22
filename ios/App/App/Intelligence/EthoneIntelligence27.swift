#if canImport(FoundationModels)
import FoundationModels
import Foundation

@available(iOS 27.0, *)
final class EthoneIntelligence27 {
    static let shared = EthoneIntelligence27()

    private var session: LanguageModelSession?

    private init() {}

    func prepareSession(instructions: String = "Tu es l'assistant ETHONE.") {
        session = LanguageModelSession(instructions: instructions)
    }

    func ask(_ prompt: String) async throws -> String {
        let model = SystemLanguageModel.default
        guard case .available = model.availability else {
            throw EthoneIntelligenceError.notAvailable
        }

        let activeSession = session ?? LanguageModelSession()
        let response = try await activeSession.respond(to: prompt)
        return response.content
    }

    func askStructured<T: Generable>(_ prompt: String, type: T.Type) async throws -> T {
        let activeSession = session ?? LanguageModelSession()
        let response = try await activeSession.respond(to: prompt, generating: T.self)
        return response.content
    }
}

@available(iOS 27.0, *)
enum EthoneIntelligenceError: Error {
    case notAvailable
}

@available(iOS 27.0, *)
@Generable
struct EthoneTaskSuggestion {
    let title: String
    let priority: String
    let tags: [String]
}
#endif
