import SwiftUI

/// Profils de travail (espaces : Personnel, Focus, Studio…) : mêmes profils que la page « Choisir un profil » du site (`/api/profiles`).
/// Changer de profil change les données spécifiques au profil (flows, macros, personas…) ; le site et l'app partagent le profil actif.
struct WorkspacesView: View {
    @Environment(AppModel.self) private var model
    @State private var profiles: [JSONValue] = []
    @State private var activeId = ""
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var newName = ""
    @State private var newType = "personal"
    @State private var newWorkspace = "personal"

    private static let types: [(id: String, label: String)] = [
        ("personal", "Personnel"), ("work", "Travail"), ("development", "Développement"), ("study", "Études"),
        ("gaming", "Jeu"), ("streaming", "Streaming"), ("creative", "Créatif"),
    ]
    private static let workspaces: [(id: String, label: String)] = [("personal", "Personnel"), ("focus", "Focus"), ("studio", "Studio")]

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            Section {
                ForEach(profiles, id: \.self) { profile in
                    let id = profile["id"]?.stringValue ?? ""
                    HStack(spacing: 12) {
                        Image(systemName: id == activeId ? "checkmark.circle.fill" : "circle").foregroundStyle(id == activeId ? Theme.success : Color.secondary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(profile["name"]?.stringValue ?? "Profil").font(.headline)
                            Text("\(Self.label(profile["type"]?.stringValue, in: Self.types)) · \(Self.label(profile["workspace_id"]?.stringValue ?? profile["workspace"]?.stringValue, in: Self.workspaces))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if id != activeId { Button("Activer") { Task { await activate(id) } }.buttonStyle(.glass) }
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        if id != activeId {
                            Button(role: .destructive) { Task { await remove(id) } } label: { Label("Supprimer", systemImage: "trash") }
                        }
                    }
                }
            } header: { Text("Vos profils").sectionTitle() }

            Section {
                TextField("Nom du profil", text: $newName)
                Picker("Type", selection: $newType) { ForEach(Self.types, id: \.id) { Text($0.label).tag($0.id) } }
                Picker("Espace", selection: $newWorkspace) { ForEach(Self.workspaces, id: \.id) { Text($0.label).tag($0.id) } }
                Button("Créer le profil") { Task { await create() } }.disabled(newName.trimmingCharacters(in: .whitespaces).isEmpty)
            } header: { Text("Nouveau profil").sectionTitle() }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && profiles.isEmpty { ProgressView() } }
        .navigationTitle("Profils de travail")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private static func label(_ id: String?, in list: [(id: String, label: String)]) -> String {
        list.first { $0.id == id }?.label ?? (id ?? "—")
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let data: JSONValue = try await model.api.worker("api/profiles")
            profiles = data["list"]?.arrayValue ?? []
            activeId = data["active"]?["id"]?.stringValue ?? profiles.first?["id"]?.stringValue ?? ""
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func activate(_ id: String) async {
        do {
            try await model.api.workerVoid("api/profiles/activate", body: APIClient.json(["id": .string(id)]))
            activeId = id
            errorMessage = nil
            // Les données liées au profil (flows, macros, personas…) changent : on prévient les écrans ouverts.
            await model.refreshAll()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func create() async {
        let name = newName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        do {
            try await model.api.workerVoid("api/profiles", body: APIClient.json([
                "name": .string(name), "type": .string(newType), "accent": .string("violet"), "workspace_id": .string(newWorkspace),
                "widgets": .array([]), "integrations": .array([]),
            ]))
            newName = ""
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func remove(_ id: String) async {
        do {
            try await model.api.workerVoid("api/profiles", method: "DELETE", body: APIClient.json(["id": .string(id)]))
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
