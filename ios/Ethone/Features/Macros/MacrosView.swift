import SwiftUI

struct MacroRecord: Identifiable, Decodable, Hashable {
    let id: String
    var label: String
    let data: JSONValue?

    var action: String { data?["action"]?.stringValue ?? "navigate" }
    var href: String { data?["href"]?.stringValue ?? "/" }
    var setting: String { data?["setting"]?.stringValue ?? "" }
}

/// Macros : mêmes lignes `ethone_user_data` (kind = macro) que le site. « Ouvrir une page » est exécutable sur iOS
/// (la page web est traduite vers l'écran équivalent) ; « Basculer un réglage » n'existe que sur le site.
struct MacrosView: View {
    @Environment(AppModel.self) private var model
    @State private var macros: [MacroRecord] = []
    @State private var label = ""
    @State private var href = "/tasks"
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    var body: some View {
        List {
            Section {
                TextField("Nom de la macro", text: $label)
                Picker("Ouvrir", selection: $href) {
                    ForEach(AppModel.webPages, id: \.path) { Text($0.title).tag($0.path) }
                }
                Button("Ajouter", action: add).disabled(label.trimmingCharacters(in: .whitespaces).isEmpty)
            } header: { Text("Nouvelle macro").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if let infoMessage {
                Text(infoMessage).font(.footnote).foregroundStyle(.secondary).listRowBackground(Color.clear)
            }

            Section {
                ForEach(macros) { macro in
                    HStack(spacing: 12) {
                        Image(systemName: "wand.and.stars").foregroundStyle(Theme.accentSoft).frame(width: 28)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(macro.label).font(.headline)
                            Text(macro.action == "navigate" ? "Ouvrir \(macro.href)" : "Basculer \(macro.setting)")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Lancer") { run(macro) }.buttonStyle(.glass)
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { remove(macro) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            } header: { Text("Vos macros").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if macros.isEmpty && !loading {
                ContentUnavailableView("Aucune macro", systemImage: "wand.and.stars", description: Text("Créez un raccourci vers une page."))
            }
        }
        .navigationTitle("Macros")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            macros = try await model.api.worker("api/user-data/macros", as: [MacroRecord].self)
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
                let body = APIClient.json([
                    "label": .string(name),
                    "slug": .string(""),
                    "data": .object(["action": .string("navigate"), "href": .string(href)]),
                ])
                let created: MacroRecord = try await model.api.worker("api/user-data/macros", method: "POST", body: body)
                macros.insert(created, at: 0)
                errorMessage = nil
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func run(_ macro: MacroRecord) {
        guard macro.action == "navigate" else {
            infoMessage = "« Basculer un réglage » n'est disponible que sur le site."
            return
        }
        infoMessage = model.openWebPage(macro.href) ? nil : "Cette page du site n'a pas d'équivalent dans l'app."
    }

    private func remove(_ macro: MacroRecord) {
        guard let index = macros.firstIndex(where: { $0.id == macro.id }) else { return }
        let removed = macros.remove(at: index)
        Task {
            do {
                try await model.api.workerVoid("api/user-data/macros", method: "DELETE", body: APIClient.json(["id": .string(removed.id)]))
            } catch {
                macros.insert(removed, at: min(index, macros.count))
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
