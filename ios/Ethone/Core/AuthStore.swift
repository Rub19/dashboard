import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import UIKit

struct SessionUser: Codable, Hashable {
    var id: String
    var email: String?
    var metadata: JSONValue?

    /// Nom à afficher : pseudo Discord/Google, sinon partie locale de l'e-mail.
    var displayName: String {
        for key in ["full_name", "name", "user_name", "preferred_username"] {
            if let value = metadata?[key]?.stringValue, !value.isEmpty { return value }
        }
        return email?.split(separator: "@").first.map(String.init) ?? "Vous"
    }

    var avatarURL: URL? {
        for key in ["avatar_url", "picture"] {
            if let value = metadata?[key]?.stringValue, let url = URL(string: value) { return url }
        }
        return nil
    }
}

struct Session: Codable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var user: SessionUser
}

private struct TokenResponse: Decodable {
    struct User: Decodable {
        let id: String
        let email: String?
        let user_metadata: JSONValue?
    }

    let access_token: String
    let refresh_token: String
    let expires_in: Int?
    let expires_at: Double?
    let user: User

    var session: Session {
        let expiry: Date
        if let expires_at { expiry = Date(timeIntervalSince1970: expires_at) }
        else { expiry = Date().addingTimeInterval(TimeInterval(expires_in ?? 3600)) }
        return Session(accessToken: access_token, refreshToken: refresh_token, expiresAt: expiry,
                       user: SessionUser(id: user.id, email: user.email, metadata: user.user_metadata))
    }
}

/// Session utilisateur : connexion Supabase (mot de passe, OAuth PKCE), 2FA du Worker, jetons dans le trousseau.
@MainActor
@Observable
final class AuthStore {
    enum Phase { case launching, signedOut, mfaRequired, signedIn }

    private(set) var phase: Phase = .launching
    private(set) var session: Session?
    var errorMessage: String?
    var isBusy = false

    @ObservationIgnored private var refreshTask: Task<Session, Error>?
    @ObservationIgnored private var oauthContext = OAuthPresentationContext()
    @ObservationIgnored private var oauthSession: ASWebAuthenticationSession?

    var user: SessionUser? { session?.user }

    // MARK: Démarrage

    func restore() async {
        guard let data = Keychain.get("session"), let saved = try? JSONDecoder.api.decode(Session.self, from: data) else {
            phase = .signedOut
            return
        }
        session = saved
        do {
            _ = try await validAccessToken()
            await registerDevice()
        } catch let error as APIError {
            if let status = error.statusCode, status == 400 || status == 401 || status == 403 {
                clear()
            } else {
                // Hors ligne : on garde la session et on ouvre l'app avec les données en cache.
                phase = .signedIn
            }
        } catch {
            phase = .signedIn
        }
    }

    // MARK: Connexion

    func signIn(email: String, password: String) async {
        await run {
            let body = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])
            let response = try await self.tokenRequest(grant: "password", body: body)
            self.store(response.session)
            await self.registerDevice()
        }
    }

    /// Connexion via Discord, Google… avec PKCE dans une session Web système (mot de passe jamais vu par l'app).
    func signInWithOAuth(provider: String) async {
        await run {
            let verifier = Self.randomVerifier()
            let challenge = Self.challenge(for: verifier)
            var components = URLComponents(url: Config.supabaseURL.appendingPathComponent("auth/v1/authorize"), resolvingAgainstBaseURL: false)!
            components.queryItems = [
                URLQueryItem(name: "provider", value: provider),
                URLQueryItem(name: "redirect_to", value: Config.oauthRedirect),
                URLQueryItem(name: "code_challenge", value: challenge),
                URLQueryItem(name: "code_challenge_method", value: "s256"),
            ]
            let callback = try await self.webAuthenticate(url: components.url!)
            guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
                throw APIError.http(status: 400, code: nil, message: "La connexion n'a pas abouti.")
            }
            let body = try JSONSerialization.data(withJSONObject: ["auth_code": code, "code_verifier": verifier])
            let response = try await self.tokenRequest(grant: "pkce", body: body)
            self.store(response.session)
            await self.registerDevice()
        }
    }

    func verifyMFA(code: String? = nil, backupCode: String? = nil) async {
        await run {
            var payload: [String: String] = [:]
            if let code { payload["code"] = code }
            if let backupCode { payload["backupCode"] = backupCode }
            let body = try JSONSerialization.data(withJSONObject: payload)
            let token = try await self.validAccessToken()
            let request = WorkerHTTP.request(path: "api/auth/totp/challenge", method: "POST", body: body, token: token)
            let (data, http) = try await HTTP.send(request)
            guard (200..<300).contains(http.statusCode) else { throw HTTP.failure(status: http.statusCode, data: data) }
            self.phase = .signedIn
        }
    }

    func signOut() async {
        if let token = session?.accessToken {
            let request = WorkerHTTP.request(path: "api/signout", method: "POST", token: token)
            _ = try? await HTTP.send(request)
            var logout = URLRequest(url: Config.supabaseURL.appendingPathComponent("auth/v1/logout"))
            logout.httpMethod = "POST"
            logout.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
            logout.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            _ = try? await HTTP.send(logout)
        }
        clear()
    }

    /// Une réponse du Worker signale que la session n'est plus valable : on réagit au bon endroit.
    func handle(_ error: Error) {
        guard let api = error as? APIError else { return }
        switch api {
        case .sessionRevoked: clear()
        case .mfaRequired: phase = .mfaRequired
        default: break
        }
    }

    // MARK: Jetons

    /// Jeton d'accès valable (rafraîchi si nécessaire ; un seul rafraîchissement à la fois).
    func validAccessToken() async throws -> String {
        guard let current = session else { throw APIError.notSignedIn }
        if current.expiresAt.timeIntervalSinceNow > 60 { return current.accessToken }
        return try await forceRefresh().accessToken
    }

    @discardableResult
    func forceRefresh() async throws -> Session {
        if let refreshTask { return try await refreshTask.value }
        guard let refreshToken = session?.refreshToken else { throw APIError.notSignedIn }
        let task = Task { () -> Session in
            let body = try JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])
            let response = try await self.tokenRequest(grant: "refresh_token", body: body)
            return response.session
        }
        refreshTask = task
        defer { refreshTask = nil }
        let refreshed = try await task.value
        store(refreshed)
        return refreshed
    }

    // MARK: Interne

    private func run(_ work: @escaping () async throws -> Void) async {
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            try await work()
        } catch is CancellationError {
            // Fenêtre de connexion fermée par l'utilisateur.
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            // Annulation volontaire : pas de message d'erreur.
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func tokenRequest(grant: String, body: Data) async throws -> TokenResponse {
        var components = URLComponents(url: Config.supabaseURL.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: grant)]
        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        let (data, http) = try await HTTP.send(request)
        guard (200..<300).contains(http.statusCode) else {
            var failure = HTTP.failure(status: http.statusCode, data: data)
            if case .http(let status, let code, _) = failure, code == "invalid_credentials" || status == 400 {
                if grant == "password" { failure = .http(status: status, code: code, message: "E-mail ou mot de passe incorrect.") }
            }
            throw failure
        }
        do {
            return try JSONDecoder().decode(TokenResponse.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    private func store(_ newSession: Session) {
        session = newSession
        if let data = try? JSONEncoder.api.encode(newSession) { Keychain.set(data, for: "session") }
    }

    private func clear() {
        session = nil
        Keychain.remove("session")
        phase = .signedOut
    }

    /// Enregistre l'appareil auprès du Worker : il crée la ligne de session révocable et indique si un 2FA est en attente.
    private func registerDevice() async {
        do {
            let token = try await validAccessToken()
            let request = WorkerHTTP.request(path: "api/auth/device", method: "POST", body: Data("{}".utf8), token: token)
            let (data, http) = try await HTTP.send(request)
            if (200..<300).contains(http.statusCode) {
                let envelope = try? JSONDecoder.api.decode(WorkerEnvelope<JSONValue>.self, from: data)
                let pending = envelope?.data?["mfa_pending"]?.boolValue ?? false
                phase = pending ? .mfaRequired : .signedIn
            } else {
                let failure = HTTP.failure(status: http.statusCode, data: data)
                if case .mfaRequired = failure { phase = .mfaRequired }
                else if case .sessionRevoked = failure { clear() }
                else { phase = .signedIn }
            }
        } catch {
            // Le Worker peut être injoignable : ne bloque jamais l'ouverture de l'app.
            phase = .signedIn
        }
    }

    // MARK: OAuth (PKCE)

    private static func randomVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 48)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64URLEncoded
    }

    private static func challenge(for verifier: String) -> String {
        Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
    }

    private func webAuthenticate(url: URL) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: Config.oauthCallbackScheme) { callbackURL, error in
                if let error { continuation.resume(throwing: error) }
                else if let callbackURL { continuation.resume(returning: callbackURL) }
                else { continuation.resume(throwing: APIError.network("Aucune réponse de la fenêtre de connexion.")) }
            }
            authSession.presentationContextProvider = self.oauthContext
            authSession.prefersEphemeralWebBrowserSession = false
            self.oauthSession = authSession
            if !authSession.start() {
                continuation.resume(throwing: APIError.network("Impossible d'ouvrir la fenêtre de connexion."))
            }
        }
    }
}

private final class OAuthPresentationContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        return scene?.keyWindow ?? ASPresentationAnchor()
    }
}

extension Data {
    var base64URLEncoded: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
