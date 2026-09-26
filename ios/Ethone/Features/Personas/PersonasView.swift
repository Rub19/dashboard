import SwiftUI

struct PersonaRecord: Identifiable, Decodable, Hashable {
    let id: String
    var label: String
    let data: JSONValue?

    var theme: ThemePreset { ThemePreset.resolve(legacy: data?["theme"]?.stringValue) }
}

/// Personas : profils d'ambiance (nom + thème), mêmes lignes `ethone_user_data` (kind = persona) que le site.
/// Appliquer une persona change le thème de l'app.
struct PersonasView: View {
    @Environment(AppModel.self) private var model
    @State private var personas: [PersonaRecord] = []
    @State private var label = ""
    @State private var theme: ThemePreset = .obsidian
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        List {
            Section {
                TextField("Nom de la persona", text: $label)
                Picker("Thème", selection: $theme) {
                    ForEach(ThemePreset.allCases) { Text($0.label).tag($0) }
                }
                Button("Créer", action: add).disabled(label.trimmingCharacters(in: .whitespaces).isEmpty)
            } header: { Text("Nouvelle persona").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(personas) { persona in
                    HStack(spacing: 12) {
                        Circle().fill(Color(hex: persona.theme.accent)).frame(width: 26, height: 26)
                            .overlay(Circle().stroke(Color.primary.opacity(0.2), lineWidth: 1))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(persona.label).font(.headline)
                            Text(persona.theme.label).font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        if model.themePreset == persona.theme {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.success).accessibilityLabel("Active")
                        } else {
                            Button("Appliquer") { model.setTheme(persona.theme) }.buttonStyle(.glass)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { remove(persona) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            } header: { Text("Vos personas").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if personas.isEmpty && !loading {
                ContentUnavailableView("Aucune persona", systemImage: "person.crop.circle.badge.plus", description: Text("Associez un nom à un thème."))
            }
        }
        .navigationTitle("Personas")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            personas = try await model.api.worker("api/user-data/personas", as: [PersonaRecord].self)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func add() {
        let name = label.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        label = ""
        Task {
            do {
                let body = APIClient.json(["label": .string(name), "slug": .string(""), "data": .object(["theme": .string(theme.rawValue)])])
                let created: PersonaRecord = try await model.api.worker("api/user-data/personas", method: "POST", body: body)
                personas.insert(created, at: 0)
                errorMessage = nil
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func remove(_ persona: PersonaRecord) {
        guard let index = personas.firstIndex(where: { $0.id == persona.id }) else { return }
        let removed = personas.remove(at: index)
        Task {
            do {
                try await model.api.workerVoid("api/user-data/personas", method: "DELETE", body: APIClient.json(["id": .string(removed.id)]))
            } catch {
                personas.insert(removed, at: min(index, personas.count))
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
