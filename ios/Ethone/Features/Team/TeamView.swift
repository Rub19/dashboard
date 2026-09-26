import SwiftUI

struct TeamMember: Identifiable, Decodable, Hashable {
    let id: String
    let email: String
    var role: String?
    var status: String?
    let displayName: String?

    enum CodingKeys: String, CodingKey {
        case id, email, role, status
        case displayName = "display_name"
    }

    var title: String { (displayName?.isEmpty == false ? displayName : nil) ?? email }
    var statusLabel: String { status == "active" ? "Actif" : "En attente" }
}

/// Équipe : membres suivis côté ETHONE. Le serveur n'envoie pas encore d'e-mail d'invitation : la ligne est créée « en attente ».
struct TeamView: View {
    @Environment(AppModel.self) private var model
    @State private var members: [TeamMember] = []
    @State private var email = ""
    @State private var role = "member"
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        List {
            Section {
                TextField("E-mail du membre", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Picker("Rôle", selection: $role) {
                    Text("Membre").tag("member")
                    Text("Administrateur").tag("admin")
                    Text("Lecteur").tag("viewer")
                }
                Button("Ajouter à l'équipe", action: add)
                    .buttonStyle(.glassProminent)
                    .disabled(!email.contains("@"))
            } footer: {
                Text("Le membre est ajouté « en attente » ; aucun e-mail d'invitation n'est envoyé pour l'instant.")
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(members) { member in
                    HStack(spacing: 12) {
                        AvatarView(url: nil, name: member.title, size: 38)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(member.title).lineLimit(1)
                            Text(member.email).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                        }
                        Spacer()
                        GlassPill(text: member.statusLabel, tint: (member.status == "active" ? Theme.success : Theme.warning).opacity(0.35))
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { remove(member) } label: { Label("Retirer", systemImage: "trash") }
                    }
                }
            } header: { Text("Membres").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if members.isEmpty && !loading {
                ContentUnavailableView("Équipe vide", systemImage: "person.3", description: Text("Ajoutez un premier membre."))
            }
        }
        .navigationTitle("Équipe")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            members = try await model.api.worker("api/team/members", as: [TeamMember].self)
            errorMessage = nil
        } catch {
            errorMessage = message(error)
        }
    }

    private func add() {
        let address = email.trimmingCharacters(in: .whitespaces)
        let chosenRole = role
        email = ""
        Task {
            do {
                try await model.api.workerVoid("api/team/members", body: APIClient.json(["email": .string(address), "role": .string(chosenRole)]))
                await load()
            } catch {
                errorMessage = message(error)
            }
        }
    }

    private func remove(_ member: TeamMember) {
        guard let index = members.firstIndex(where: { $0.id == member.id }) else { return }
        let removed = members.remove(at: index)
        Task {
            do {
                try await model.api.workerVoid("api/team/members", method: "DELETE", body: APIClient.json(["id": .string(removed.id)]))
            } catch {
                members.insert(removed, at: min(index, members.count))
                errorMessage = message(error)
            }
        }
    }

    private func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
