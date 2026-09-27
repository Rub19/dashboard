import SwiftUI

/// Système : vue d'ensemble des espaces et des flows (mêmes lignes `ethone_user_data` que la page Système du site)
/// et état de la synchronisation de l'app.
struct SystemView: View {
    @Environment(AppModel.self) private var model
    @State private var spaces: [FlowRecord] = []
    @State private var flows: [FlowRecord] = []
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }

            Section {
                GlassEffectContainer(spacing: 12) {
                    HStack(spacing: 12) {
                        tile("\(spaces.count)", "Espaces", "square.grid.2x2.fill")
                        tile("\(flows.count)", "Flows", "bolt.fill")
                        tile("\(flows.reduce(0) { $0 + $1.count })", "Exécutions", "play.fill")
                    }
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }

            Section {
                LabeledContent("Notes", value: "\(model.notes.items.count)")
                LabeledContent("Tâches ouvertes", value: "\(model.tasks.items.filter { !$0.isDone }.count)")
                LabeledContent("Événements", value: "\(model.events.items.count)")
                LabeledContent("Habitudes actives", value: "\(model.habits.activeHabits.count)")
                LabeledContent("Compte", value: model.auth.user?.email ?? "—")
                LabeledContent("Version de l'app", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—")
            } header: { Text("Données synchronisées").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            if !spaces.isEmpty {
                Section {
                    ForEach(spaces.prefix(8)) { space in
                        Label(space.label, systemImage: "square.grid.2x2")
                    }
                } header: { Text("Espaces récents").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !flows.isEmpty {
                Section {
                    ForEach(flows.prefix(8)) { flow in
                        HStack {
                            Label(flow.label, systemImage: "bolt")
                            Spacer()
                            Text("\(flow.count) exéc.").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                } header: { Text("Flows récents").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && spaces.isEmpty && flows.isEmpty { ProgressView() } }
        .navigationTitle("Système")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .reloadOnRemoteChange(["ethone_user_data"]) { await load() }
    }

    private func tile(_ value: String, _ label: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol).foregroundStyle(Theme.accentSoft)
            Text(value).font(.title3.weight(.bold).monospacedDigit())
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 18))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            async let s: [FlowRecord] = model.api.worker("api/user-data/spaces")
            async let f: [FlowRecord] = model.api.worker("api/user-data/flows")
            (spaces, flows) = try await (s, f)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
