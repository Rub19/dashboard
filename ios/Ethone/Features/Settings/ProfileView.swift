import SwiftUI

struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @State private var displayName = ""
    @State private var username = ""
    @State private var avatarURL = ""
    @State private var presenceStatus: PresenceStatus = .online
    @State private var statusText = ""
    @State private var statusEmoji = "💻"
    @State private var bio = ""
    @State private var discoverable = false
    @State private var publicId: String?
    @State private var exists = false
    @State private var loading = true
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var showAvatarSheet = false

    private let quickEmojis = ["💻", "🎮", "🎧", "📚", "☕", "🚀", "🎨", "🏋️", "🔥", "🌙"]

    private var currentAvatarString: String? {
        let trimmed = avatarURL.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty { return trimmed }
        return model.auth.user?.avatarURL?.absoluteString
    }

    var body: some View {
        List {
            Section {
                HStack(spacing: 16) {
                    AvatarView(
                        urlString: currentAvatarString,
                        name: displayName.isEmpty ? (model.auth.user?.displayName ?? "E") : displayName,
                        size: 72,
                        status: presenceStatus
                    )

                    VStack(alignment: .leading, spacing: 6) {
                        Text(displayName.isEmpty ? (model.auth.user?.displayName ?? "Utilisateur") : displayName)
                            .font(.headline)
                        Text(username.isEmpty ? (model.auth.user?.email ?? "") : "@\(username)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                        Button {
                            showAvatarSheet = true
                        } label: {
                            Label("Changer l'avatar", systemImage: "photo.badge.plus")
                                .font(.caption.weight(.medium))
                        }
                        .buttonStyle(.glass)
                    }
                }
                .padding(.vertical, 4)
            }
            .listRowBackground(GlassRowBackground())

            Section {
                Picker("Statut de présence", selection: $presenceStatus) {
                    ForEach(PresenceStatus.allCases) { status in
                        HStack(spacing: 8) {
                            Circle().fill(status.color).frame(width: 8, height: 8)
                            Text(status.label)
                        }
                        .tag(status)
                    }
                }

                HStack(spacing: 10) {
                    TextField("Émoji", text: $statusEmoji)
                        .frame(width: 36)
                        .multilineTextAlignment(.center)
                    Divider().frame(height: 18)
                    TextField("Message de statut...", text: $statusText)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(quickEmojis, id: \.self) { emoji in
                            Button {
                                statusEmoji = emoji
                            } label: {
                                Text(emoji).font(.body)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(statusEmoji == emoji ? Theme.accent.opacity(0.25) : Color.clear)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }
            } header: {
                Text("Présence & Statut").sectionTitle()
            }
            .listRowBackground(GlassRowBackground())

            Section {
                TextField("Nom affiché", text: $displayName)
                TextField("Pseudo", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Bio", text: $bio, axis: .vertical)
                    .lineLimit(2...4)
                Toggle("Profil découvrable", isOn: $discoverable)
                if let publicId {
                    LabeledContent("Identifiant public", value: publicId)
                }
            } header: {
                Text("Informations publiques").sectionTitle()
            } footer: {
                Text("Un profil découvrable peut être retrouvé par les autres utilisateurs d'ETHONE.")
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if let infoMessage {
                Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear)
            }

            Section {
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        Text("Enregistrer les modifications")
                            .fontWeight(.medium)
                        if saving {
                            Spacer()
                            ProgressView()
                        }
                    }
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
        .sheet(isPresented: $showAvatarSheet) {
            AvatarLibrarySheet(
                currentAvatar: $avatarURL,
                displayName: displayName.isEmpty ? (model.auth.user?.displayName ?? "E") : displayName
            )
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let profile: JSONValue = try await model.api.worker("api/profile")
            displayName = profile["display_name"]?.stringValue ?? ""
            username = profile["username"]?.stringValue ?? ""
            avatarURL = profile["avatar_url"]?.stringValue ?? ""
            bio = profile["bio"]?.stringValue ?? ""
            statusText = profile["status_text"]?.stringValue ?? ""
            if let emoji = profile["status_emoji"]?.stringValue, !emoji.isEmpty {
                statusEmoji = emoji
            }
            if let presenceStr = profile["presence_status"]?.stringValue,
               let p = PresenceStatus(rawValue: presenceStr) {
                presenceStatus = p
            }
            discoverable = profile["discoverable"]?.boolValue ?? false
            publicId = profile["public_id"]?.stringValue
            exists = true
            errorMessage = nil
        } catch {
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
            "username": .string(username.trimmingCharacters(in: .whitespaces).lowercased()),
            "discoverable": .bool(discoverable),
            "avatar_url": .string(avatarURL.trimmingCharacters(in: .whitespaces)),
            "presence_status": .string(presenceStatus.rawValue),
            "status_text": .string(statusText.trimmingCharacters(in: .whitespaces)),
            "status_emoji": .string(statusEmoji.trimmingCharacters(in: .whitespaces)),
            "bio": .string(bio.trimmingCharacters(in: .whitespaces)),
        ])
        do {
            let saved: JSONValue = try await model.api.worker("api/profile", method: exists ? "PATCH" : "POST", body: body)
            publicId = saved["public_id"]?.stringValue ?? publicId
            exists = true
            infoMessage = "Profil enregistré avec succès."
            errorMessage = nil
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct AvatarLibrarySheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var currentAvatar: String
    let displayName: String
    @State private var customURLInput = ""

    private let columns = [
        GridItem(.adaptive(minimum: 90, maximum: 110), spacing: 14)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 16) {
                        AvatarView(urlString: currentAvatar.isEmpty ? nil : currentAvatar, name: displayName, size: 64)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Aperçu de l'avatar").font(.headline)
                            Text(currentAvatar.isEmpty ? "Avatar par défaut ou du compte" : currentAvatar)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        Spacer()
                        if !currentAvatar.isEmpty {
                            Button("Effacer") {
                                currentAvatar = ""
                                customURLInput = ""
                            }
                            .font(.footnote)
                            .foregroundStyle(Theme.danger)
                        }
                    }
                    .padding()
                    .glassEffect(Glass.regular, in: .rect(cornerRadius: Theme.cardRadius))

                    VStack(alignment: .leading, spacing: 12) {
                        Text("ETHONE Originals").sectionTitle()
                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(AvatarCatalog.ethoneOriginals) { avatar in
                                avatarButton(avatar)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Jeux & Séries").sectionTitle()
                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(AvatarCatalog.popularPicks) { avatar in
                                avatarButton(avatar)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("URL personnalisée").sectionTitle()
                        GlassCard {
                            VStack(spacing: 12) {
                                TextField("https://...", text: $customURLInput)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .keyboardType(.URL)

                                Button {
                                    let trimmed = customURLInput.trimmingCharacters(in: .whitespaces)
                                    if !trimmed.isEmpty {
                                        currentAvatar = trimmed
                                    }
                                } label: {
                                    Text("Appliquer l'URL")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.glassProminent)
                                .disabled(customURLInput.trimmingCharacters(in: .whitespaces).isEmpty)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Bibliothèque d'avatars")
            .navigationBarTitleDisplayMode(.inline)
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") { dismiss() }
                }
            }
            .onAppear {
                if currentAvatar.hasPrefix("http://") || currentAvatar.hasPrefix("https://") {
                    customURLInput = currentAvatar
                }
            }
        }
    }

    private func avatarButton(_ avatar: LibraryAvatar) -> some View {
        let isSelected = currentAvatar == avatar.path
        return Button {
            currentAvatar = avatar.path
        } label: {
            VStack(spacing: 6) {
                AvatarView(urlString: avatar.path, name: avatar.name, size: 58)
                    .overlay(
                        Circle()
                            .stroke(isSelected ? Theme.accent : Color.clear, lineWidth: 3)
                    )
                Text(avatar.name)
                    .font(.caption2)
                    .foregroundStyle(isSelected ? Theme.accent : .primary)
                    .lineLimit(1)
            }
            .padding(6)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Theme.accent.opacity(0.12) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

