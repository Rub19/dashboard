import Foundation
import Observation

struct SharedSpace: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
    let role: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, role
        case createdAt = "created_at"
    }
}

struct SpaceTask: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var isCompleted: Bool
    var priority: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, title, priority
        case isCompleted = "is_completed"
        case createdAt = "created_at"
    }
}

/// Espaces partagés (liste de tâches commune) : espaces via le Worker, tâches via Supabase (RLS).
@MainActor
@Observable
final class SpacesStore {
    private let api: APIClient
    private(set) var spaces: [SharedSpace] = []
    private(set) var isLoading = false
    private(set) var loadedOnce = false
    var errorMessage: String?

    init(api: APIClient) { self.api = api }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            spaces = try await api.worker("api/shared-spaces", as: [SharedSpace].self)
            loadedOnce = true
            errorMessage = nil
        } catch {
            errorMessage = message(error)
        }
    }

    func create(name: String) async {
        do {
            try await api.workerVoid("api/shared-spaces", body: APIClient.json(["name": .string(name)]))
            await refresh()
        } catch {
            errorMessage = message(error)
        }
    }

    func delete(_ space: SharedSpace) async {
        let before = spaces
        spaces.removeAll { $0.id == space.id }
        do {
            try await api.workerVoid("api/shared-spaces", method: "DELETE", body: APIClient.json(["id": .string(space.id)]))
        } catch {
            spaces = before
            errorMessage = message(error)
        }
    }

    // MARK: Tâches d'un espace

    func tasks(in space: SharedSpace) async throws -> [SpaceTask] {
        try await api.list("ethone_space_tasks", query: [
            URLQueryItem(name: "space_id", value: "eq.\(space.id)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
        ])
    }

    func addTask(in space: SharedSpace, title: String) async throws -> SpaceTask {
        try await api.insert("ethone_space_tasks", fields: [
            "space_id": .string(space.id),
            "title": .string(title),
            "is_completed": .bool(false),
            "priority": .string("medium"),
        ], userColumn: "created_by")
    }

    func setCompleted(_ task: SpaceTask, _ done: Bool) async throws {
        let _: SpaceTask? = try await api.patch("ethone_space_tasks", id: task.id, fields: ["is_completed": .bool(done)])
    }

    func deleteTask(_ task: SpaceTask) async throws {
        try await api.remove("ethone_space_tasks", id: task.id)
    }

    private func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
