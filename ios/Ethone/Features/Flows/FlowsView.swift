import SwiftUI

struct FlowRecord: Identifiable, Decodable, Hashable {
    let id: String
    var label: String
    var count: Int
    let data: JSONValue?

    var templateId: String? { data?["templateId"]?.stringValue ?? data?["workspaceId"]?.stringValue }
}

/// Flows (espaces de travail automatisés) : mêmes lignes `ethone_user_data` (kind = flow) que le site.
struct FlowsView: View {
    @Environment(AppModel.self) private var model
    @State private var flows: [FlowRecord] = []
    @State private var newLabel = ""
    @State private var template = "personal"
    @State private var loading = true
    @State private var errorMessage: String?

    private let templates: [(id: String, label: String, symbol: String)] = [
        ("personal", "Personnel", "person.fill"),
        ("focus", "Focus", "scope"),
        ("studio", "Studio", "paintpalette.fill"),
        ("gaming", "Gaming", "gamecontroller.fill"),
    ]

    var body: some View {
        List {
            Section {
                Picker("Modèle", selection: $template) {
                    ForEach(templates, id: \.id) { entry in Label(entry.label, systemImage: entry.symbol).tag(entry.id) }
                }
                HStack {
                    TextField("Nom du flow (facultatif)", text: $newLabel).submitLabel(.done).onSubmit(create)
                    Button(action: create) { Image(systemName: "plus").fontWeight(.bold) }
                        .buttonStyle(.glassProminent)
                        .buttonBorderShape(.circle)
                }
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(flows) { flow in
                    HStack(spacing: 14) {
                        Image(systemName: symbol(for: flow)).font(.title3).foregroundStyle(Theme.accentSoft).frame(width: 30)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(flow.label).font(.headline)
                            Text("\(flow.count) exécution(s)").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Démarrer") { run(flow) }.buttonStyle(.glass)
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { remove(flow) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            } header: { Text("Vos flows").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if flows.isEmpty && !loading {
                ContentUnavailableView("Aucun flow", systemImage: "bolt", description: Text("Créez un flow à partir d'un modèle."))
            }
        }
        .navigationTitle("Flows")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func symbol(for flow: FlowRecord) -> String {
        templates.first { $0.id == flow.templateId }?.symbol ?? "bolt.fill"
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            flows = try await model.api.worker("api/user-data/flows", as: [FlowRecord].self)
            errorMessage = nil
        } catch {
            errorMessage = message(error)
        }
    }

    private func create() {
        let entry = templates.first { $0.id == template } ?? templates[0]
        let label = newLabel.trimmingCharacters(in: .whitespaces).isEmpty ? entry.label : newLabel.trimmingCharacters(in: .whitespaces)
        newLabel = ""
        Task {
            do {
                let body = APIClient.json([
                    "label": .string(label),
                    "slug": .string(""),
                    "data": .object(["templateId": .string(entry.id), "workspaceId": .string(entry.id)]),
                    "count": .number(0),
                ])
                let created: FlowRecord = try await model.api.worker("api/user-data/flows", method: "POST", body: body)
                flows.insert(created, at: 0)
                errorMessage = nil
            } catch {
                errorMessage = message(error)
            }
        }
    }

    private func run(_ flow: FlowRecord) {
        guard let index = flows.firstIndex(where: { $0.id == flow.id }) else { return }
        flows[index].count += 1
        let next = flows[index].count
        Task {
            do {
                try await model.api.workerVoid("api/user-data/flows", method: "PATCH", body: APIClient.json(["id": .string(flow.id), "count": .number(Double(next))]))
            } catch {
                if let current = flows.firstIndex(where: { $0.id == flow.id }) { flows[current].count -= 1 }
                errorMessage = message(error)
            }
        }
    }

    private func remove(_ flow: FlowRecord) {
        guard let index = flows.firstIndex(where: { $0.id == flow.id }) else { return }
        let removed = flows.remove(at: index)
        Task {
            do {
                try await model.api.workerVoid("api/user-data/flows", method: "DELETE", body: APIClient.json(["id": .string(removed.id)]))
            } catch {
                flows.insert(removed, at: min(index, flows.count))
                errorMessage = message(error)
            }
        }
    }

    private func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
