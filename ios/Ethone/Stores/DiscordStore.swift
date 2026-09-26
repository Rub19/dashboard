import AuthenticationServices
import Foundation
import Observation

struct DiscordUser: Decodable {
    let id: String
    let username: String
    let globalName: String?
    let avatar: String?

    var displayName: String { globalName ?? username }

    var avatarURL: URL? {
        guard let avatar else { return nil }
        return URL(string: "https://cdn.discordapp.com/avatars/\(id)/\(avatar).png?size=128")
    }
}

struct DiscordGuild: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
    let icon: String?
    let owner: Bool?
    let botPresent: Bool
    let memberCount: Int?

    var iconURL: URL? {
        guard let icon else { return nil }
        return URL(string: "https://cdn.discordapp.com/icons/\(id)/\(icon).png?size=128")
    }
}

struct DiscordModule: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
    let description: String?
    var enabled: Bool
}

struct GuildOverview: Decodable {
    struct GuildInfo: Decodable {
        let name: String
        let memberCount: Int
        let channelsCount: Int
        let rolesCount: Int
        let botPresent: Bool
    }
    struct BotStatus: Decodable {
        let online: Bool
        let uptimeMs: Double
        let pingMs: Double
    }
    struct Stats: Decodable {
        let totalCommands: Int?
        let commandsToday: Int?
    }
    let guild: GuildInfo
    let botStatus: BotStatus
    let stats: Stats
}

/// Centre de contrôle du bot Discord : connexion Discord (jeton propre au bot, distinct de la session Supabase) puis serveurs et modules.
@MainActor
@Observable
final class DiscordStore {
    private(set) var user: DiscordUser?
    private(set) var guilds: [DiscordGuild] = []
    private(set) var isLoading = false
    private(set) var isConnected: Bool
    var errorMessage: String?

    @ObservationIgnored private var token: String?
    private static let tokenKey = "discord-bot-token"

    init() {
        if let data = Keychain.get(Self.tokenKey), let saved = String(data: data, encoding: .utf8) {
            token = saved
            isConnected = true
        } else {
            isConnected = false
        }
    }

    // MARK: Connexion

    func signIn() async {
        isLoading = true
        defer { isLoading = false }
        do {
            var components = URLComponents(url: Config.botURL.appendingPathComponent("api/auth/login"), resolvingAgainstBaseURL: false)!
            components.queryItems = [URLQueryItem(name: "return_to", value: "ethone://discord-auth")]
            let callback = try await WebAuth.shared.authenticate(url: components.url!, callbackScheme: Config.oauthCallbackScheme)
            guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
                throw APIError.http(status: 400, code: nil, message: "La connexion Discord n'a pas abouti.")
            }

            var request = URLRequest(url: Config.botURL.appendingPathComponent("api/auth/mobile/exchange"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = APIClient.json(["code": .string(code)])
            let (data, http) = try await HTTP.send(request)
            guard (200..<300).contains(http.statusCode) else { throw HTTP.failure(status: http.statusCode, data: data) }
            struct Exchange: Decodable { let token: String }
            let exchange = try JSONDecoder().decode(Exchange.self, from: data)
            store(exchange.token)
            errorMessage = nil
            await refresh()
        } catch is CancellationError {
            // Fenêtre fermée par l'utilisateur.
        } catch {
            if let webError = error as? ASWebAuthenticationSessionError, webError.code == .canceledLogin { return }
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func signOut() {
        token = nil
        isConnected = false
        user = nil
        guilds = []
        Keychain.remove(Self.tokenKey)
    }

    // MARK: Données

    func refresh() async {
        guard isConnected else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            struct Me: Decodable { let user: DiscordUser }
            struct GuildList: Decodable { let guilds: [DiscordGuild] }
            async let me: Me = request("api/auth/me")
            async let list: GuildList = request("api/guilds")
            let (m, g) = try await (me, list)
            user = m.user
            guilds = g.guilds.sorted { ($0.botPresent ? 0 : 1, $0.name.lowercased()) < ($1.botPresent ? 0 : 1, $1.name.lowercased()) }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func overview(guildId: String) async throws -> GuildOverview {
        try await request("api/guilds/\(guildId)/overview")
    }

    func modules(guildId: String) async throws -> [DiscordModule] {
        struct Response: Decodable { let modules: [DiscordModule] }
        let response: Response = try await request("api/guilds/\(guildId)/modules")
        return response.modules
    }

    func setModule(guildId: String, moduleId: String, enabled: Bool) async throws {
        struct Ack: Decodable { let success: Bool? }
        let _: Ack = try await request("api/guilds/\(guildId)/modules/\(moduleId)", method: "PATCH", body: APIClient.json(["enabled": .bool(enabled)]))
    }

    // MARK: Réseau

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Data? = nil) async throws -> T {
        guard let token else { throw APIError.notSignedIn }
        var request = URLRequest(url: Config.botURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, http) = try await HTTP.send(request)
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 {
                signOut()
                throw APIError.http(status: 401, code: nil, message: "Session Discord expirée. Reconnectez-vous.")
            }
            throw HTTP.failure(status: http.statusCode, data: data)
        }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error.localizedDescription)
        }
    }

    private func store(_ newToken: String) {
        token = newToken
        isConnected = true
        Keychain.set(Data(newToken.utf8), for: Self.tokenKey)
    }
}
