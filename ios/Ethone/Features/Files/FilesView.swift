import SwiftUI

struct CloudFile: Identifiable, Decodable, Hashable {
    let id: String
    let name: String
    let mimeType: String?
    let isFolder: Bool
    let size: Int?
    let webViewLink: String?
    let trashed: Bool?
    let isFavorite: Bool?
    let updatedAt: Date?

    var symbol: String {
        if isFolder { return "folder.fill" }
        let type = mimeType ?? ""
        if type.hasPrefix("image/") { return "photo.fill" }
        if type.hasPrefix("video/") { return "film.fill" }
        if type.hasPrefix("audio/") { return "waveform" }
        if type.contains("pdf") { return "doc.richtext.fill" }
        if type.contains("spreadsheet") || type.contains("excel") { return "tablecells.fill" }
        if type.contains("presentation") { return "rectangle.on.rectangle.angled.fill" }
        return "doc.fill"
    }

    var readableSize: String {
        guard let size, size > 0, !isFolder else { return "" }
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }
}

private struct FilesResponse: Decodable {
    let files: [CloudFile]
}

/// Fichiers synchronisés depuis Google Drive (index côté ETHONE) : navigation par dossiers, recherche, ouverture dans le navigateur.
struct FilesView: View {
    @Environment(AppModel.self) private var model
    @State private var path: [CloudFile] = []
    @State private var files: [CloudFile] = []
    @State private var query = ""
    @State private var loading = true
    @State private var errorMessage: String?
    @Environment(\.openURL) private var openURL

    private var currentFolder: CloudFile? { path.last }

    var body: some View {
        List {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if !path.isEmpty {
                Button {
                    path.removeLast()
                } label: {
                    Label("Dossier parent", systemImage: "arrow.up.left")
                }
                .listRowBackground(GlassRowBackground())
            }
            ForEach(files) { file in
                Button {
                    if file.isFolder {
                        path.append(file)
                    } else if let link = file.webViewLink, let url = URL(string: link) {
                        openURL(url)
                    }
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: file.symbol).font(.title3).foregroundStyle(file.isFolder ? Theme.warning : Theme.accentSoft).frame(width: 30)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(file.name).foregroundStyle(.primary).lineLimit(1)
                            if !file.readableSize.isEmpty { Text(file.readableSize).font(.caption).foregroundStyle(.secondary) }
                        }
                        Spacer()
                        if file.isFavorite == true { Image(systemName: "star.fill").foregroundStyle(Theme.warning) }
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if files.isEmpty && !loading {
                ContentUnavailableView(
                    query.isEmpty ? "Aucun fichier" : "Aucun résultat",
                    systemImage: "folder",
                    description: Text(query.isEmpty ? "Reliez Google Drive depuis ethone.dev → Connexions, puis synchronisez vos fichiers." : "Essayez un autre mot.")
                )
            } else if loading && files.isEmpty {
                ProgressView()
            }
        }
        .searchable(text: $query, prompt: "Rechercher un fichier")
        .navigationTitle(currentFolder?.name ?? "Fichiers")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: LoadKey(folder: currentFolder?.id, query: query)) {
            // Petite attente pour ne pas interroger à chaque lettre tapée.
            if !query.isEmpty { try? await Task.sleep(for: .milliseconds(350)) }
            if Task.isCancelled { return }
            await load()
        }
    }

    private struct LoadKey: Equatable {
        let folder: String?
        let query: String
    }

    private func load() async {
        loading = true
        defer { loading = false }
        var items: [URLQueryItem] = [URLQueryItem(name: "limit", value: "200")]
        if let folder = currentFolder, query.isEmpty { items.append(URLQueryItem(name: "parentId", value: folder.id)) }
        if !query.isEmpty { items.append(URLQueryItem(name: "q", value: query)) }
        do {
            let response: FilesResponse = try await model.api.worker("api/cloud/files", query: items)
            files = response.files.filter { $0.trashed != true }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
