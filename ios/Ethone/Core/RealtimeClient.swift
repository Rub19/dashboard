import Foundation

@MainActor
final class RealtimeClient {
    private static let tables: [(name: String, filtered: Bool)] = [
        ("tasks", true), ("ethone_items", true), ("ethone_habits", true), ("ethone_habit_completions", true),
        ("ethone_focus_sessions", true), ("ethone_user_data", true), ("ethone_user_state", true), ("user_settings", true),
        ("ethone_shared_spaces", false), ("ethone_space_tasks", false), ("ethone_space_notes", false), ("ethone_space_events", false),
    ]

    private let auth: AuthStore
    private let onChange: (String) -> Void
    private let onReconnect: () -> Void

    private var socket: URLSessionWebSocketTask?
    private var runTask: Task<Void, Never>?
    private var reference = 0
    private let topic = "realtime:ethone-ios"

    init(auth: AuthStore, onChange: @escaping (String) -> Void, onReconnect: @escaping () -> Void) {
        self.auth = auth
        self.onChange = onChange
        self.onReconnect = onReconnect
    }

    var isRunning: Bool { runTask != nil }

    func start() {
        guard runTask == nil else { return }
        runTask = Task { [weak self] in
            var attempt = 0
            while !Task.isCancelled {
                guard let self else { return }
                let connectedFor = await self.runOnce(isReconnect: attempt > 0)
                if Task.isCancelled { return }
                attempt = connectedFor > 60 ? 1 : min(attempt + 1, 6)
                let delay = min(30.0, pow(2.0, Double(attempt)))
                try? await Task.sleep(for: .seconds(delay))
            }
        }
    }

    func stop() {
        runTask?.cancel()
        runTask = nil
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
    }

    private func runOnce(isReconnect: Bool) async -> TimeInterval {
        let started = Date()
        guard let userId = auth.user?.id, let token = try? await auth.validAccessToken() else { return 0 }

        var components = URLComponents(url: Config.supabaseURL, resolvingAgainstBaseURL: false)!
        components.scheme = "wss"
        components.path = "/realtime/v1/websocket"
        components.queryItems = [URLQueryItem(name: "apikey", value: Config.supabaseAnonKey), URLQueryItem(name: "vsn", value: "1.0.0")]
        guard let url = components.url else { return 0 }

        let task = URLSession.shared.webSocketTask(with: url)
        socket = task
        task.maximumMessageSize = 8 * 1024 * 1024
        task.resume()

        let changes: [JSONValue] = Self.tables.map { table in
            var entry: [String: JSONValue] = ["event": .string("*"), "schema": .string("public"), "table": .string(table.name)]
            if table.filtered { entry["filter"] = .string("user_id=eq.\(userId)") }
            return .object(entry)
        }
        let join: [String: JSONValue] = [
            "config": .object([
                "broadcast": .object(["ack": .bool(false), "self": .bool(false)]),
                "presence": .object(["key": .string("")]),
                "postgres_changes": .array(changes),
                "private": .bool(false),
            ]),
            "access_token": .string(token),
        ]
        guard await send(event: "phx_join", topic: topic, payload: .object(join), joinRef: true) else { return 0 }

        let heartbeat = Task { [weak self] in
            var elapsed = 0
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(25))
                elapsed += 25
                guard let self, !Task.isCancelled else { return }
                _ = await self.send(event: "heartbeat", topic: "phoenix", payload: .object([:]))
                if elapsed >= 45 * 60, let fresh = try? await self.auth.validAccessToken() {
                    elapsed = 0
                    _ = await self.send(event: "access_token", topic: self.topic, payload: .object(["access_token": .string(fresh)]))
                }
            }
        }
        defer { heartbeat.cancel() }

        var announcedReconnect = false
        while !Task.isCancelled {
            do {
                let message = try await task.receive()
                let text: String?
                switch message {
                case .string(let value): text = value
                case .data(let data): text = String(data: data, encoding: .utf8)
                @unknown default: text = nil
                }
                guard let text, let data = text.data(using: .utf8), let frame = try? JSONDecoder().decode(JSONValue.self, from: data) else { continue }
                switch frame["event"]?.stringValue {
                case "phx_reply" where frame["topic"]?.stringValue == topic:
                    if frame["payload"]?["status"]?.stringValue == "ok", isReconnect, !announcedReconnect {
                        announcedReconnect = true
                        onReconnect()
                    }
                case "postgres_changes":
                    if let table = frame["payload"]?["data"]?["table"]?.stringValue { onChange(table) }
                case "phx_close", "phx_error":
                    task.cancel(with: .goingAway, reason: nil)
                default:
                    break
                }
            } catch {
                break
            }
        }
        task.cancel(with: .goingAway, reason: nil)
        return Date().timeIntervalSince(started)
    }

    private func send(event: String, topic: String, payload: JSONValue, joinRef: Bool = false) async -> Bool {
        reference += 1
        var frame: [String: JSONValue] = [
            "topic": .string(topic), "event": .string(event), "payload": payload, "ref": .string(String(reference)),
        ]
        if joinRef { frame["join_ref"] = .string(String(reference)) }
        guard let data = try? JSONEncoder().encode(JSONValue.object(frame)), let text = String(data: data, encoding: .utf8) else { return false }
        do {
            try await socket?.send(.string(text))
            return true
        } catch {
            return false
        }
    }
}

