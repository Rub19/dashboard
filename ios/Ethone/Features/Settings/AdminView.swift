import SwiftUI

/// Statistiques d'administration ETHONE (`/api/admin/stats`). Réservé au compte administrateur : le Worker répond 403 aux autres.
struct AdminView: View {
    @Environment(AppModel.self) private var model
    @State private var stats: JSONValue?
    @State private var loading = true
    @State private var forbidden = false
    @State private var errorMessage: String?

    private let groups: [(key: String, title: String, symbol: String)] = [
        ("content", "Contenu", "doc.text.fill"), ("mail", "Mail", "envelope.fill"), ("activity", "Activité", "waveform.path.ecg"),
    ]

    private static let labels: [String: String] = [
        "items": "Éléments", "notes": "Notes", "tasks": "Tâches", "events": "Événements", "files": "Fichiers",
        "aliases": "Alias mail", "messages": "Messages", "threads": "Fils", "aiUsage": "Appels IA", "userData": "Données utilisateur", "teamMembers": "Membres d'équipe",
    ]

    var body: some View {
        List {
            if forbidden {
                ContentUnavailableView("Accès réservé", systemImage: "lock.fill", description: Text("Ces statistiques ne sont visibles que par le compte administrateur d'ETHONE."))
                    .listRowBackground(Color.clear)
            } else if let stats {
                Section {
                    LabeledContent("Utilisateurs", value: "\(Int(stats["users"]?.doubleValue ?? 0))")
                    if let generated = stats["generatedAt"]?.stringValue.flatMap(ISODate.parse) {
                        LabeledContent("Généré", value: generated.formatted(date: .abbreviated, time: .shortened))
                    }
                }
                .listRowBackground(GlassRowBackground())

                ForEach(groups, id: \.key) { group in
                    if case .object(let values)? = stats[group.key] {
                        Section {
                            ForEach(values.keys.sorted(), id: \.self) { key in
                                LabeledContent(Self.labels[key] ?? key, value: "\(Int(values[key]?.doubleValue ?? 0))")
                            }
                        } header: { Label(group.title, systemImage: group.symbol).sectionTitle() }
                        .listRowBackground(GlassRowBackground())
                    }
                }
            }
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && stats == nil && !forbidden { ProgressView() } }
        .navigationTitle("Administration")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            stats = try await model.api.worker("api/admin/stats")
            forbidden = false
            errorMessage = nil
        } catch {
            if case APIError.http(let status, _, _) = error, status == 403 {
                forbidden = true
                errorMessage = nil
            } else {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
