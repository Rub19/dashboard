import Foundation
import Network
import Observation

struct RiotChatPresence: Hashable {
    var show = "chat"
    var inValorant = false
    var state = ""
    var queueID = ""
    var mapPath = ""
    var partyID = ""
    var partySize = 1
    var maxPartySize = 5
    var allyScore = 0
    var enemyScore = 0
    var cardID = ""
    var tier = 0
    var isIdle = false
}

struct RiotChatFriend: Identifiable, Hashable {
    let id: String
    var name: String
    var tag: String
    var presence: RiotChatPresence?
}

@MainActor
@Observable
final class RiotChat {
    private(set) var friends: [RiotChatFriend] = []
    private(set) var isConnected = false
    private(set) var isConnecting = false
    private(set) var mapNames: [String: String] = [:]
    var error: String?

    private var connection: NWConnection?
    private var buffer = ""
    private var roster: [String: RiotChatFriend] = [:]
    private var presences: [String: RiotChatPresence] = [:]
    private var domain = ""
    private var readTask: Task<Void, Never>?
    private var pingTask: Task<Void, Never>?

    private enum ChatError: LocalizedError {
        case pas, auth, closed, timeout
        var errorDescription: String? {
            switch self {
            case .pas: "Riot a refusé le jeton de chat."
            case .auth: "Connexion au chat Riot refusée."
            case .closed: "Le chat Riot a fermé la connexion."
            case .timeout: "Le chat Riot ne répond pas."
            }
        }
    }

    func connect(_ session: RiotSession) async {
        guard !isConnected, !isConnecting else { return }
        guard let creds = await session.chatCredentials() else {
            error = "Connectez votre compte Riot dans Paramètres."
            return
        }
        isConnecting = true
        defer { isConnecting = false }
        if mapNames.isEmpty { mapNames = await Self.loadMapNames() }
        do {
            let pas = try await Self.pasToken(creds.accessToken)
            let affinity = Self.claim(pas, "affinity") ?? "eu1"
            let target = await Self.chatHost(affinity: affinity, creds: creds)
            domain = target.domain
            try await open(host: target.host)
            let header = "<?xml version=\"1.0\"?><stream:stream to=\"\(domain).pvp.net\" version=\"1.0\" xmlns:stream=\"http://etherx.jabber.org/streams\">"
            try await send(header)
            _ = try await read { $0.contains("</stream:features>") }
            try await send("<auth mechanism=\"X-Riot-RSO-PAS\" xmlns=\"urn:ietf:params:xml:ns:xmpp-sasl\"><rso_token>\(creds.accessToken)</rso_token><pas_token>\(pas)</pas_token></auth>")
            let auth = try await read { $0.contains("<success") || $0.contains("<failure") }
            guard auth.contains("<success") else { throw ChatError.auth }
            try await send(header)
            _ = try await read { $0.contains("</stream:features>") }
            try await send("<iq id=\"_xmpp_bind1\" type=\"set\"><bind xmlns=\"urn:ietf:params:xml:ns:xmpp-bind\"><puuid-mode xmlns=\"urn:riotgames:rso\" enabled=\"true\"/><resource>RC-ETHONE</resource></bind></iq>")
            _ = try await read { $0.contains("_xmpp_bind1") }
            try await send("<iq id=\"xmpp_entitlements_0\" type=\"set\"><entitlements xmlns=\"urn:riotgames:entitlements\"><token xmlns=\"\">\(creds.entitlements)</token></entitlements></iq>")
            _ = try await read { $0.contains("xmpp_entitlements_0") }
            try await send("<iq id=\"_xmpp_session1\" type=\"set\"><session xmlns=\"urn:ietf:params:xml:ns:xmpp-session\"><platform>riot</platform></session></iq>")
            _ = try await read { $0.contains("_xmpp_session1") }
            try await send("<iq type=\"get\" id=\"ethone_roster\"><query xmlns=\"jabber:iq:riotgames:roster\" last_state=\"true\"/></iq>")
            let rosterXML = try await read { $0.contains("ethone_roster") && $0.contains("</iq>") }
            parseRoster(rosterXML)
            isConnected = true
            error = nil
            try await send("<presence><show>offline</show><status></status></presence>")
            startReading()
            startPing()
        } catch {
            self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            disconnect()
        }
    }

    func disconnect() {
        readTask?.cancel()
        pingTask?.cancel()
        readTask = nil
        pingTask = nil
        connection?.cancel()
        connection = nil
        buffer = ""
        isConnected = false
    }

    private func open(host: String) async throws {
        let conn = NWConnection(host: NWEndpoint.Host(host), port: 5223, using: .tls)
        connection = conn
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            var resumed = false
            conn.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    if !resumed { resumed = true; continuation.resume() }
                case .failed(let error), .waiting(let error):
                    if !resumed { resumed = true; continuation.resume(throwing: error) }
                case .cancelled:
                    if !resumed { resumed = true; continuation.resume(throwing: ChatError.closed) }
                default:
                    break
                }
            }
            conn.start(queue: .global(qos: .userInitiated))
        }
    }

    private func send(_ text: String) async throws {
        guard let connection else { throw ChatError.closed }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connection.send(content: Data(text.utf8), completion: .contentProcessed { error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume() }
            })
        }
    }

    private func receiveChunk() async throws -> String {
        guard let connection else { throw ChatError.closed }
        return try await withCheckedThrowingContinuation { continuation in
            connection.receive(minimumIncompleteLength: 1, maximumLength: 262_144) { data, _, isComplete, error in
                if let error { continuation.resume(throwing: error); return }
                if let data, !data.isEmpty {
                    continuation.resume(returning: String(decoding: data, as: UTF8.self))
                } else if isComplete {
                    continuation.resume(throwing: ChatError.closed)
                } else {
                    continuation.resume(returning: "")
                }
            }
        }
    }

    private func read(until done: @escaping (String) -> Bool) async throws -> String {
        let deadline = Date().addingTimeInterval(15)
        let timer = Task { [weak self] in
            try? await Task.sleep(for: .seconds(15))
            if !Task.isCancelled { self?.connection?.cancel() }
        }
        defer { timer.cancel() }
        while !done(buffer) {
            if Date() > deadline { throw ChatError.timeout }
            buffer += try await receiveChunk()
        }
        let result = buffer
        buffer = ""
        return result
    }

    private func startReading() {
        readTask = Task { [weak self] in
            while let self, !Task.isCancelled, self.isConnected {
                do {
                    let chunk = try await self.receiveChunk()
                    self.buffer += chunk
                    self.consumeStanzas()
                } catch {
                    self.disconnect()
                    return
                }
            }
        }
    }

    private func startPing() {
        pingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(120))
                guard let self, self.isConnected else { return }
                try? await self.send(" ")
            }
        }
    }

    private static let presenceRegex = try! NSRegularExpression(pattern: "<presence\\b[^>]*?(?:/>|>[\\s\\S]*?</presence>)")
    private static let itemRegex = try! NSRegularExpression(pattern: "<item\\b([^>]*)>([\\s\\S]*?)</item>|<item\\b([^>]*)/>")

    private func consumeStanzas() {
        let ns = buffer as NSString
        let matches = Self.presenceRegex.matches(in: buffer, range: NSRange(location: 0, length: ns.length))
        guard let last = matches.last else {
            if buffer.count > 2_000_000 { buffer = "" }
            return
        }
        for match in matches { applyPresence(ns.substring(with: match.range)) }
        buffer = ns.substring(from: last.range.location + last.range.length)
        rebuild()
    }

    private func parseRoster(_ xml: String) {
        let ns = xml as NSString
        for match in Self.itemRegex.matches(in: xml, range: NSRange(location: 0, length: ns.length)) {
            let attrRange = match.range(at: 1).location != NSNotFound ? match.range(at: 1) : match.range(at: 3)
            let attrs = ns.substring(with: attrRange)
            let body = match.range(at: 2).location != NSNotFound ? ns.substring(with: match.range(at: 2)) : ""
            let jid = Self.attribute("jid", in: attrs) ?? ""
            let puuid = Self.attribute("puuid", in: attrs) ?? String(jid.split(separator: "@").first ?? "")
            guard !puuid.isEmpty, Self.attribute("subscription", in: attrs) ?? "both" == "both" else { continue }
            let idTag = Self.firstTag("id", in: body) ?? ""
            let name = Self.attribute("name", in: idTag) ?? Self.attribute("name", in: attrs) ?? ""
            let tag = Self.attribute("tagline", in: idTag) ?? ""
            guard !name.isEmpty else { continue }
            roster[puuid.lowercased()] = RiotChatFriend(id: puuid.lowercased(), name: Self.unescape(name), tag: Self.unescape(tag))
        }
        rebuild()
    }

    private func applyPresence(_ stanza: String) {
        let open = Self.firstTag("presence", in: stanza) ?? ""
        guard let from = Self.attribute("from", in: open) else { return }
        let puuid = String(from.split(separator: "@").first ?? "").lowercased()
        guard roster[puuid] != nil else { return }
        if Self.attribute("type", in: open) == "unavailable" {
            presences[puuid] = nil
            return
        }
        var presence = RiotChatPresence()
        presence.show = Self.text("show", in: stanza) ?? "chat"
        if presence.show == "offline" { presences[puuid] = nil; return }
        if let valorant = Self.section("valorant", in: stanza), let p = Self.text("p", in: valorant),
           let data = Data(base64Encoded: p), let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            presence.inValorant = true
            let match = json["matchPresenceData"] as? [String: Any] ?? json
            let party = json["partyPresenceData"] as? [String: Any] ?? json
            let player = json["playerPresenceData"] as? [String: Any] ?? json
            presence.state = match["sessionLoopState"] as? String ?? ""
            presence.queueID = match["queueId"] as? String ?? party["queueId"] as? String ?? ""
            presence.mapPath = match["matchMap"] as? String ?? ""
            presence.partyID = party["partyId"] as? String ?? ""
            presence.partySize = party["partySize"] as? Int ?? 1
            presence.maxPartySize = party["maxPartySize"] as? Int ?? 5
            presence.allyScore = party["partyOwnerMatchScoreAllyTeam"] as? Int ?? 0
            presence.enemyScore = party["partyOwnerMatchScoreEnemyTeam"] as? Int ?? 0
            presence.cardID = player["playerCardId"] as? String ?? ""
            presence.tier = player["competitiveTier"] as? Int ?? 0
            presence.isIdle = json["isIdle"] as? Bool ?? false
        }
        presences[puuid] = presence
    }

    private func rebuild() {
        friends = roster.values.map { friend in
            var copy = friend
            copy.presence = presences[friend.id]
            return copy
        }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func mapName(_ path: String) -> String? {
        guard !path.isEmpty else { return nil }
        return mapNames[path.lowercased()]
    }

    private static func attribute(_ name: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: "\\b\(name)=(['\"])(.*?)\\1") else { return nil }
        let ns = text as NSString
        guard let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)) else { return nil }
        return ns.substring(with: match.range(at: 2))
    }

    private static func firstTag(_ name: String, in text: String) -> String? {
        guard let range = text.range(of: "<\(name)\\b[^>]*>", options: .regularExpression) else { return nil }
        return String(text[range])
    }

    private static func text(_ name: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: "<\(name)>([\\s\\S]*?)</\(name)>") else { return nil }
        let ns = text as NSString
        guard let match = regex.firstMatch(in: text, range: NSRange(location: 0, length: ns.length)) else { return nil }
        return ns.substring(with: match.range(at: 1))
    }

    private static func section(_ name: String, in text: String) -> String? {
        guard let start = text.range(of: "<\(name)>"), let end = text.range(of: "</\(name)>", range: start.upperBound..<text.endIndex) else { return nil }
        return String(text[start.upperBound..<end.lowerBound])
    }

    private static func unescape(_ text: String) -> String {
        text.replacingOccurrences(of: "&apos;", with: "'").replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&lt;", with: "<").replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&amp;", with: "&")
    }

    private static func claim(_ jwt: String, _ key: String) -> String? {
        let parts = jwt.split(separator: ".")
        guard parts.count > 1 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 { payload += "=" }
        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json[key] as? String
    }

    private static func pasToken(_ accessToken: String) async throws -> String {
        var request = URLRequest(url: URL(string: "https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat")!)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw ChatError.pas }
        let token = String(decoding: data, as: UTF8.self).trimmingCharacters(in: CharacterSet(charactersIn: "\" \n"))
        guard token.split(separator: ".").count == 3 else { throw ChatError.pas }
        return token
    }

    private static let fallbackHosts: [String: (String, String)] = [
        "eu1": ("euw1.chat.si.riotgames.com", "eu1"), "eu2": ("eun1.chat.si.riotgames.com", "eu2"),
        "eu3": ("eu3.chat.si.riotgames.com", "eu3"), "na1": ("na2.chat.si.riotgames.com", "na1"),
        "la1": ("la1.chat.si.riotgames.com", "la1"), "la2": ("la2.chat.si.riotgames.com", "la2"),
        "br1": ("br.chat.si.riotgames.com", "br1"), "tr1": ("tr1.chat.si.riotgames.com", "tr1"),
        "ru1": ("ru1.chat.si.riotgames.com", "ru1"), "jp1": ("jp1.chat.si.riotgames.com", "jp1"),
        "kr1": ("kr1.chat.si.riotgames.com", "kr1"), "oc1": ("oc1.chat.si.riotgames.com", "oc1"),
        "as2": ("as2.chat.si.riotgames.com", "as2"), "asia": ("jp1.chat.si.riotgames.com", "jp1"),
        "us2": ("us2.chat.si.riotgames.com", "us2")
    ]

    private static func chatHost(affinity: String, creds: RiotSession.Credentials) async -> (host: String, domain: String) {
        var request = URLRequest(url: URL(string: "https://clientconfig.rpg.riotgames.com/api/v1/config/player?app=Riot%20Client")!)
        request.setValue("Bearer \(creds.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(creds.entitlements, forHTTPHeaderField: "X-Riot-Entitlements-JWT")
        if let (data, response) = try? await URLSession.shared.data(for: request),
           (response as? HTTPURLResponse)?.statusCode == 200,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let hosts = json["chat.affinities"] as? [String: String], let host = hosts[affinity] {
            let domains = json["chat.affinity_domains"] as? [String: String]
            return (host, domains?[affinity] ?? affinity)
        }
        let fallback = fallbackHosts[affinity] ?? ("\(affinity).chat.si.riotgames.com", affinity)
        return (fallback.0, fallback.1)
    }

    private struct MapNameCache: Codable { let fetchedAt: Date; let names: [String: String] }

    private static func loadMapNames() async -> [String: String] {
        let key = "valorant-api.map-names.fr"
        if let cached = DiskCache.read(MapNameCache.self, key: key), Date().timeIntervalSince(cached.fetchedAt) < 86400 { return cached.names }
        struct Map: Decodable { let displayName: String; let mapUrl: String? }
        struct Page: Decodable { let data: [Map] }
        guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/maps?language=fr-FR")!),
              let page = try? JSONDecoder().decode(Page.self, from: data) else { return [:] }
        let names = Dictionary(page.data.compactMap { map in map.mapUrl.map { ($0.lowercased(), map.displayName) } }, uniquingKeysWith: { a, _ in a })
        if !names.isEmpty { DiskCache.write(MapNameCache(fetchedAt: Date(), names: names), key: key) }
        return names
    }
}
