import AuthenticationServices
import UIKit

/// Fenêtre de connexion Web système (ASWebAuthenticationSession), partagée par Supabase (OAuth) et le bot Discord.
@MainActor
final class WebAuth: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuth()
    private var session: ASWebAuthenticationSession?

    func authenticate(url: URL, callbackScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { callbackURL, error in
                if let error { continuation.resume(throwing: error) }
                else if let callbackURL { continuation.resume(returning: callbackURL) }
                else { continuation.resume(throwing: APIError.network("Aucune réponse de la fenêtre de connexion.")) }
            }
            authSession.presentationContextProvider = self
            authSession.prefersEphemeralWebBrowserSession = false
            self.session = authSession
            if !authSession.start() {
                continuation.resume(throwing: APIError.network("Impossible d'ouvrir la fenêtre de connexion."))
            }
        }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
            if let window = scene?.keyWindow { return window }
            if let scene { return ASPresentationAnchor(windowScene: scene) }
            return ASPresentationAnchor()
        }
    }
}
