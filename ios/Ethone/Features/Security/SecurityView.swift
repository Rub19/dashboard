import SwiftUI

struct DeviceRecord: Identifiable, Decodable {
    let id: String
    let name: String
    let type: String?
    let platform: String?
    let browser: String?
    let trusted: Bool
    let sessionId: String?
    let revokedAt: Date?
    let lastSeenAt: Date?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, type, platform, browser, trusted
        case sessionId = "session_id"
        case revokedAt = "revoked_at"
        case lastSeenAt = "last_seen_at"
        case createdAt = "created_at"
    }

    var symbol: String {
        switch platform?.lowercased() {
        case "ios": return "iphone"
        case "ipados": return "ipad"
        case "android": return "smartphone"
        case "macos": return "laptopcomputer"
        default: return "desktopcomputer"
        }
    }
}

enum JWT {
    /// Lit une revendication du jeton (sans vérifier la signature : c'est le rôle du Worker).
    static func claim(_ name: String, in token: String) -> String? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var base64 = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return object[name] as? String
    }
}

/// Appareils connectés (mêmes lignes `ethone_devices` que le Centre de sécurité du site).
struct SecurityView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var devices: [DeviceRecord] = []
    @State private var loading = false
    @State private var errorMessage: String?
    @State private var confirmRevokeOthers = false

    private var currentSession: String? {
        auth.session.flatMap { JWT.claim("session_id", in: $0.accessToken) }
    }

    var body: some View {
        List {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            Section {
                ForEach(devices.filter { $0.revokedAt == nil }) { device in
                    row(device)
                        .listRowBackground(GlassRowBackground())
                        .swipeActions(edge: .trailing) {
                            if !isCurrent(device) {
                                Button(role: .destructive) { remove(device) } label: { Label("Retirer", systemImage: "trash") }
                            }
                        }
                }
            } header: { Text("Sessions actives").sectionTitle() }

            Section {
                Button(role: .destructive) { confirmRevokeOthers = true } label: {
                    Label("Déconnecter tous les autres appareils", systemImage: "iphone.slash")
                }
                .listRowBackground(GlassRowBackground())
                .disabled(devices.filter { $0.revokedAt == nil && !isCurrent($0) }.isEmpty)
            } footer: {
                Text("Les appareils retirés doivent se reconnecter. Cet appareil reste connecté.")
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if loading && devices.isEmpty { ProgressView() }
        }
        .navigationTitle("Sécurité")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .confirmationDialog("Déconnecter tous les autres appareils ?", isPresented: $confirmRevokeOthers, titleVisibility: .visible) {
            Button("Déconnecter", role: .destructive) { revokeOthers() }
        }
    }

    private func row(_ device: DeviceRecord) -> some View {
        HStack(spacing: 14) {
            Image(systemName: device.symbol).font(.title2).frame(width: 34).foregroundStyle(Theme.accentSoft)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text(device.name).font(.headline).lineLimit(1)
                    if isCurrent(device) { GlassPill(text: "Cet appareil", tint: Theme.success.opacity(0.45)) }
                }
                if let last = device.lastSeenAt {
                    Text("Actif \(last, format: .relative(presentation: .named))").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if device.trusted { Image(systemName: "checkmark.shield.fill").foregroundStyle(Theme.success) }
        }
        .padding(.vertical, 4)
    }

    private func isCurrent(_ device: DeviceRecord) -> Bool {
        guard let currentSession, let id = device.sessionId else { return false }
        return id == currentSession
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            devices = try await model.api.worker("api/auth/devices", as: [DeviceRecord].self)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func remove(_ device: DeviceRecord) {
        Task {
            do {
                let body = APIClient.json(["deviceId": .string(device.id)])
                try await model.api.workerVoid("api/auth/device/remove", body: body)
                await load()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func revokeOthers() {
        Task {
            do {
                try await model.api.workerVoid("api/auth/device/revoke-others", body: Data("{}".utf8))
                await load()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}
