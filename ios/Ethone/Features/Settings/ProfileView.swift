import SwiftUI

/// Profil public : nom affiché, pseudo et visibilité (Worker `/api/profile`, comme la page Profil du site).
struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @State private var displayName = ""
    @State private var username = ""
    @State private var discoverable = false
    @State private var publicId: String?
    @State private var exists = false
    @State private var loading = true
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    AvatarView(url: model.auth.user?.avatarURL, name: displayName.isEmpty ? (model.auth.user?.displayName ?? "E") : displayName, size: 64, status: .online)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(displayName.isEmpty ? (model.auth.user?.displayName ?? "") : displayName).font(.headline)
                        Text(model.auth.user?.email ?? "").font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            .listRowBackground(GlassRowBackground())

            Section {
                TextField("Nom affiché", text: $displayName)
                TextField("Pseudo", text: $username).textInputAutocapitalization(.never).autocorrectionDisabled()
                Toggle("Profil découvrable", isOn: $discoverable)
                if let publicId { LabeledContent("Identifiant public", value: publicId) }
            } header: { Text("Informations").sectionTitle() } footer: {
                Text("Un profil découvrable peut être retrouvé par les autres utilisateurs d'ETHONE.")
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            Section {
                Button {
                    Task { await save() }
                } label: {
                    HStack { Text("Enregistrer"); if saving { Spacer(); ProgressView() } }
                }
                .disabled(saving || loading)
            }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Profil")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let profile: JSONValue = try await model.api.worker("api/profile")
            displayName = profile["display_name"]?.stringValue ?? ""
            username = profile["username"]?.stringValue ?? ""
            discoverable = profile["discoverable"]?.boolValue ?? false
            publicId = profile["public_id"]?.stringValue
            exists = true
            errorMessage = nil
        } catch {
            // Pas encore de profil : le premier enregistrement le crée (POST), comme sur le site.
            exists = false
            displayName = model.auth.user?.displayName ?? ""
            errorMessage = nil
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let body = APIClient.json([
            "display_name": .string(displayName.trimmingCharacters(in: .whitespaces)),
            "username": .string(username.trimmingCharacters(in: .whitespaces)),
            "discoverable": .bool(discoverable),
        ])
        do {
            let saved: JSONValue = try await model.api.worker("api/profile", method: exists ? "PATCH" : "POST", body: body)
            publicId = saved["public_id"]?.stringValue ?? publicId
            exists = true
            infoMessage = "Profil enregistré."
            errorMessage = nil
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
