import SwiftUI

/// Mail settings mirrored from the website: ETHONE addresses, signatures, forwards and blocked senders.
struct MailSettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var aliases: [JSONValue] = []
    @State private var signatures: [JSONValue] = []
    @State private var forwards: [JSONValue] = []
    @State private var blocked: [JSONValue] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var newAlias = ""
    @State private var newForward = ""
    @State private var editingSignature: SignatureDraft?
    @State private var verifying: JSONValue?
    @State private var code = ""

    var body: some View {
        List {
            if let errorMessage {
                Label(errorMessage, systemImage: "exclamationmark.circle.fill").font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            Section {
                ForEach(aliases, id: \.self) { alias in
                    HStack(spacing: 12) {
                        IconTile(systemImage: "at", color: Theme.accent)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(alias["alias"]?.stringValue ?? "").font(.body.monospaced()).lineLimit(1).minimumScaleFactor(0.8)
                            if let name = alias["display_name"]?.stringValue, !name.isEmpty {
                                Text(name).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if alias["is_primary"]?.boolValue == true {
                            Text("Principale").font(.caption.weight(.medium)).foregroundStyle(.secondary)
                        } else {
                            Button("Principale") { Task { await setPrimary(alias) } }.font(.caption.weight(.medium)).buttonStyle(.glass)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .contextMenu {
                        if let address = alias["alias"]?.stringValue {
                            Button("Copier l'adresse", systemImage: "doc.on.doc") { UIPasteboard.general.string = address }
                        }
                    }
                }
                HStack {
                    TextField("nouvelle-adresse", text: $newAlias)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text("@ethone.dev").foregroundStyle(.secondary)
                    Button { Task { await createAlias(random: false) } } label: { Image(systemName: "plus") }
                        .disabled(newAlias.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .listRowBackground(GlassRowBackground())
                Button("Créer une adresse aléatoire", systemImage: "shuffle") { Task { await createAlias(random: true) } }
                    .listRowBackground(GlassRowBackground())
            } header: { Text("Mes adresses").sectionTitle() } footer: {
                Text("Les mails envoyés à ces adresses arrivent dans votre boîte ETHONE. Une adresse aléatoire protège votre adresse principale.")
            }

            Section {
                ForEach(signatures, id: \.self) { signature in
                    Button {
                        editingSignature = SignatureDraft(id: signature["id"]?.stringValue, name: signature["name"]?.stringValue ?? "", content: signature["content"]?.stringValue ?? "", isDefault: signature["is_default"]?.boolValue == true)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(signature["name"]?.stringValue ?? "").foregroundStyle(.primary)
                                Text(signature["content"]?.stringValue ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            }
                            Spacer()
                            if signature["is_default"]?.boolValue == true { Text("Par défaut").font(.caption.weight(.medium)).foregroundStyle(.secondary) }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { Task { await remove("api/mail/signatures", signature) } } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
                Button("Ajouter une signature", systemImage: "plus") { editingSignature = SignatureDraft(id: nil, name: "", content: "", isDefault: signatures.isEmpty) }
                    .listRowBackground(GlassRowBackground())
            } header: { Text("Signatures").sectionTitle() }

            Section {
                ForEach(forwards, id: \.self) { forward in
                    let verified = forward["verified_at"]?.stringValue != nil
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(forward["destination"]?.stringValue ?? "").lineLimit(1)
                            HStack(spacing: 6) {
                                Circle().fill(verified ? Theme.success : Theme.warning).frame(width: 7, height: 7)
                                Text(verified ? "Vérifiée" : "En attente du code").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if verified {
                            Toggle("Actif", isOn: Binding(
                                get: { forward["is_active"]?.boolValue == true },
                                set: { value in Task { await setForwardActive(forward, value) } }
                            ))
                            .labelsHidden()
                        } else {
                            Button("Code") { code = ""; verifying = forward }.buttonStyle(.glass)
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) { Task { await remove("api/mail/forwards", forward) } } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
                HStack {
                    TextField("adresse@exemple.com", text: $newForward)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button { Task { await createForward() } } label: { Image(systemName: "plus") }
                        .disabled(!newForward.contains("@"))
                }
                .listRowBackground(GlassRowBackground())
            } header: { Text("Transferts").sectionTitle() } footer: {
                Text("Chaque mail reçu est aussi envoyé à cette adresse, une fois confirmée avec le code reçu.")
            }

            Section {
                ForEach(blocked, id: \.self) { entry in
                    HStack {
                        Image(systemName: "hand.raised.fill").foregroundStyle(Theme.danger)
                        Text(entry["email"]?.stringValue ?? entry["domain"]?.stringValue ?? "").lineLimit(1)
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button { Task { await remove("api/mail/blocked", entry) } } label: { Label("Débloquer", systemImage: "hand.raised.slash") }.tint(Theme.accent)
                    }
                }
                if blocked.isEmpty {
                    Text("Aucun expéditeur bloqué. Bloquez-en un depuis un message.").font(.footnote).foregroundStyle(.secondary).listRowBackground(GlassRowBackground())
                }
            } header: { Text("Expéditeurs bloqués").sectionTitle() }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && aliases.isEmpty && signatures.isEmpty { ProgressView() } }
        .navigationTitle("Réglages Mail")
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .sheet(item: $editingSignature) { draft in
            SignatureEditor(draft: draft) { await load() }
        }
        .alert("Code de confirmation", isPresented: Binding(get: { verifying != nil }, set: { if !$0 { verifying = nil } })) {
            TextField("123456", text: $code).keyboardType(.numberPad)
            Button("Valider") { if let forward = verifying { Task { await verify(forward) } } }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Saisissez le code à 6 chiffres envoyé à l'adresse de transfert.")
        }
    }

    private func call(_ work: () async throws -> Void) async {
        do {
            try await work()
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        async let a: [JSONValue]? = try? model.api.worker("api/mail/alias")
        async let s: [JSONValue]? = try? model.api.worker("api/mail/signatures")
        async let f: [JSONValue]? = try? model.api.worker("api/mail/forwards")
        async let b: [JSONValue]? = try? model.api.worker("api/mail/blocked")
        let (aliases, signatures, forwards, blocked) = await (a, s, f, b)
        self.aliases = aliases ?? []
        self.signatures = signatures ?? []
        self.forwards = forwards ?? []
        self.blocked = blocked ?? []
    }

    private func createAlias(random: Bool) async {
        let name = newAlias.trimmingCharacters(in: .whitespaces).lowercased()
        await call {
            let body: [String: JSONValue] = random ? ["random": .bool(true)] : ["alias": .string(name)]
            try await model.api.workerVoid("api/mail/alias", body: APIClient.json(body))
            newAlias = ""
        }
        await load()
    }

    private func setPrimary(_ alias: JSONValue) async {
        guard let id = alias["id"]?.stringValue else { return }
        await call { try await model.api.workerVoid("api/mail/alias", method: "PATCH", body: APIClient.json(["id": .string(id), "is_primary": .bool(true)])) }
        await load()
    }

    private func createForward() async {
        let destination = newForward.trimmingCharacters(in: .whitespaces)
        await call {
            try await model.api.workerVoid("api/mail/forwards", body: APIClient.json(["destination": .string(destination)]))
            newForward = ""
        }
        await load()
    }

    private func setForwardActive(_ forward: JSONValue, _ active: Bool) async {
        guard let id = forward["id"]?.stringValue else { return }
        await call { try await model.api.workerVoid("api/mail/forwards", method: "PATCH", body: APIClient.json(["id": .string(id), "active": .bool(active)])) }
        await load()
    }

    private func verify(_ forward: JSONValue) async {
        guard let id = forward["id"]?.stringValue else { return }
        let digits = code
        await call { try await model.api.workerVoid("api/mail/forwards/verify", body: APIClient.json(["id": .string(id), "code": .string(digits)])) }
        verifying = nil
        await load()
    }

    private func remove(_ path: String, _ row: JSONValue) async {
        guard let id = row["id"]?.stringValue else { return }
        await call { try await model.api.workerVoid(path, method: "DELETE", body: APIClient.json(["id": .string(id)])) }
        await load()
    }
}

struct SignatureDraft: Identifiable {
    let id: String?
    var name: String
    var content: String
    var isDefault: Bool
    var identity: String { id ?? "new" }
}

extension SignatureDraft: Hashable {}

private struct SignatureEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var draft: SignatureDraft
    let onSaved: () async -> Void
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Nom (ex : Pro)", text: $draft.name)
                TextField("Signature", text: $draft.content, axis: .vertical).lineLimit(4...10)
                Toggle("Signature par défaut", isOn: $draft.isDefault)
                if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle(draft.id == nil ? "Nouvelle signature" : "Signature")
            .navigationBarTitleDisplayMode(.inline)
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { Task { await save() } }.disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func save() async {
        var body: [String: JSONValue] = ["name": .string(draft.name), "content": .string(draft.content), "is_default": .bool(draft.isDefault)]
        if let id = draft.id { body["id"] = .string(id) }
        do {
            try await model.api.workerVoid("api/mail/signatures", body: APIClient.json(body))
            await onSaved()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
