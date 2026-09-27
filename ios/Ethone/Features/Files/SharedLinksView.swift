import SwiftUI
import UniformTypeIdentifiers

/// Liens de partage et de dépôt ETHONE : colle un lien (ou un identifiant), consulte le fichier partagé ou dépose des fichiers,
/// comme les pages publiques `/share` et `/drop` du site. Ces liens sont publics : aucun compte n'est nécessaire côté Worker.
struct SharedLinksView: View {
    @Environment(\.openURL) private var openURL
    @State private var kind = "share"
    @State private var input = ""
    @State private var password = ""
    @State private var slug = ""
    @State private var payload: JSONValue?
    @State private var loading = false
    @State private var uploading = false
    @State private var importing = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    var body: some View {
        List {
            Section {
                Picker("Type de lien", selection: $kind) {
                    Text("Partage (télécharger)").tag("share")
                    Text("Dépôt (envoyer)").tag("drop")
                }
                .pickerStyle(.segmented)
                TextField("Lien ou identifiant", text: $input)
                    .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                SecureField("Mot de passe du lien (si demandé)", text: $password)
                Button {
                    Task { await resolve() }
                } label: {
                    HStack { Text("Ouvrir le lien"); if loading { Spacer(); ProgressView() } }
                }
                .disabled(loading || input.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            if let payload, kind == "share", let file = payload["file"] {
                Section {
                    Label(file["name"]?.stringValue ?? "Fichier", systemImage: "doc.fill").font(.headline)
                    LabeledContent("Taille", value: Self.bytes(file["size"]?.doubleValue ?? 0))
                    LabeledContent("Type", value: file["mimeType"]?.stringValue ?? "—")
                    if let share = payload["share"] {
                        LabeledContent("Téléchargements", value: "\(Int(share["downloadCount"]?.doubleValue ?? 0))" + (share["maxDownloads"]?.doubleValue.map { " / \(Int($0))" } ?? ""))
                        if let expires = share["expiresAt"]?.stringValue.flatMap(ISODate.parse) {
                            LabeledContent("Expire", value: expires.formatted(date: .abbreviated, time: .shortened))
                        }
                    }
                    Button("Télécharger", systemImage: "arrow.down.circle.fill") { download() }
                }
                .listRowBackground(GlassRowBackground())
            }

            if let payload, kind == "drop", let drop = payload["drop"] {
                Section {
                    Text(drop["title"]?.stringValue ?? "Dépôt").font(.headline)
                    if let description = drop["description"]?.stringValue, !description.isEmpty { Text(description).font(.subheadline).foregroundStyle(.secondary) }
                    LabeledContent("Fichiers", value: "\(Int(drop["fileCount"]?.doubleValue ?? 0)) / \(drop["maxFiles"]?.doubleValue.map { String(Int($0)) } ?? "∞")")
                    if let maxSize = drop["maxSize"]?.doubleValue, maxSize > 0 { LabeledContent("Taille max.", value: Self.bytes(maxSize)) }
                    if let expires = drop["expiresAt"]?.stringValue.flatMap(ISODate.parse) {
                        LabeledContent("Expire", value: expires.formatted(date: .abbreviated, time: .shortened))
                    }
                    Button {
                        importing = true
                    } label: {
                        HStack { Label("Envoyer des fichiers", systemImage: "arrow.up.circle.fill"); if uploading { Spacer(); ProgressView() } }
                    }
                    .disabled(uploading)
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Liens partagés")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .fileImporter(isPresented: $importing, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
            if case .success(let urls) = result { Task { await upload(urls) } }
        }
    }

    // MARK: Lien

    /// Accepte un lien complet (`…/share?slug=…&password=…`, `…/drop?slug=…`) ou un simple identifiant.
    private func parse() -> (slug: String, password: String?, kind: String?) {
        let raw = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: raw), let components = URLComponents(url: url, resolvingAgainstBaseURL: false), url.host != nil else {
            return (raw, nil, nil)
        }
        let items = components.queryItems ?? []
        let slug = items.first { $0.name == "slug" }?.value ?? url.lastPathComponent
        let inferred = url.path.contains("/drop") ? "drop" : (url.path.contains("/share") ? "share" : nil)
        return (slug, items.first { $0.name == "password" }?.value, inferred)
    }

    private func query(slug: String) -> [URLQueryItem] {
        var items = [URLQueryItem(name: "slug", value: slug)]
        if !password.isEmpty { items.append(URLQueryItem(name: "password", value: password)) }
        return items
    }

    private func endpoint(_ path: String, _ items: [URLQueryItem]) -> URL? {
        var components = URLComponents(url: Config.workerURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        components?.queryItems = items
        return components?.url
    }

    private func resolve() async {
        let parsed = parse()
        guard !parsed.slug.isEmpty else { return }
        if let inferred = parsed.kind { kind = inferred }
        if let embedded = parsed.password, password.isEmpty { password = embedded }
        slug = parsed.slug
        loading = true
        defer { loading = false }
        payload = nil
        infoMessage = nil
        do {
            let path = kind == "drop" ? "api/cloud/drops/resolve" : "api/cloud/shares/resolve"
            guard let url = endpoint(path, query(slug: slug)) else { return }
            var request = URLRequest(url: url)
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, http) = try await HTTP.send(request)
            guard (200..<300).contains(http.statusCode) else { throw HTTP.failure(status: http.statusCode, data: data) }
            let root = try JSONDecoder().decode(JSONValue.self, from: data)
            payload = root["data"]
            errorMessage = payload == nil || (kind == "drop" ? payload?["drop"] : payload?["file"]) == nil ? "Lien introuvable, expiré ou mot de passe incorrect." : nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func download() {
        if let url = endpoint("api/cloud/shares/download", query(slug: slug)) { openURL(url) }
    }

    private func upload(_ urls: [URL]) async {
        uploading = true
        defer { uploading = false }
        var sent = 0
        for url in urls {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
                let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
                guard let target = endpoint("api/cloud/drops/upload", query(slug: slug)) else { continue }
                var request = URLRequest(url: target)
                request.httpMethod = "POST"
                request.setValue(url.lastPathComponent, forHTTPHeaderField: "x-ethone-file-name")
                request.setValue(mime, forHTTPHeaderField: "x-ethone-file-mime")
                request.setValue(String(size), forHTTPHeaderField: "x-ethone-file-size")
                let (data, response) = try await URLSession.shared.upload(for: request, fromFile: url)
                guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                    throw HTTP.failure(status: (response as? HTTPURLResponse)?.statusCode ?? 0, data: data)
                }
                sent += 1
            } catch {
                errorMessage = "« \(url.lastPathComponent) » : " + ((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)
            }
        }
        if sent > 0 {
            infoMessage = "\(sent) fichier(s) envoyé(s)."
            await resolve()
        }
    }

    private static func bytes(_ value: Double) -> String {
        ByteCountFormatter.string(fromByteCount: Int64(value), countStyle: .file)
    }
}
