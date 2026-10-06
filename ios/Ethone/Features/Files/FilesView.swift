import SwiftUI
import UniformTypeIdentifiers

struct CloudFile: Identifiable, Decodable, Hashable {
    let id: String
    let driveFileId: String?
    let parentId: String?
    let name: String
    let mimeType: String?
    let isFolder: Bool
    let size: Int?
    let webViewLink: String?
    let thumbnailLink: String?
    let trashed: Bool?
    var isFavorite: Bool?
    let updatedAt: Date?

    var symbol: String {
        if isFolder { return "folder.fill" }
        let type = (mimeType ?? "").lowercased()
        if type.hasPrefix("image/") { return "photo.fill" }
        if type.hasPrefix("video/") { return "film.fill" }
        if type.hasPrefix("audio/") { return "waveform" }
        if type.contains("pdf") { return "doc.richtext.fill" }
        if type.contains("spreadsheet") || type.contains("excel") || type.contains("sheet") { return "tablecells.fill" }
        if type.contains("presentation") || type.contains("powerpoint") { return "rectangle.on.rectangle.angled.fill" }
        if type.contains("zip") || type.contains("archive") || type.contains("tar") { return "archivebox.fill" }
        if type.contains("text") || type.contains("markdown") { return "doc.plaintext.fill" }
        return "doc.fill"
    }

    var iconColor: Color {
        if isFolder { return Theme.warning }
        let type = (mimeType ?? "").lowercased()
        if type.hasPrefix("image/") { return Color.purple }
        if type.hasPrefix("video/") { return Color.pink }
        if type.hasPrefix("audio/") { return Color.cyan }
        if type.contains("pdf") { return Theme.danger }
        if type.contains("spreadsheet") || type.contains("excel") || type.contains("sheet") { return Theme.success }
        return Theme.accentSoft
    }

    var readableSize: String {
        guard let size, size > 0, !isFolder else { return isFolder ? "Dossier" : "" }
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }

    var isMedia: Bool {
        let type = (mimeType ?? "").lowercased()
        return type.hasPrefix("image/") || type.hasPrefix("video/") || type.hasPrefix("audio/")
    }

    var isDocument: Bool {
        let type = (mimeType ?? "").lowercased()
        return type.contains("pdf") || type.contains("doc") || type.contains("text") || type.contains("sheet") || type.contains("presentation")
    }
}

private struct FilesResponse: Decodable {
    let files: [CloudFile]
}

enum FileDisplayMode: String, CaseIterable {
    case list = "Liste"
    case grid = "Grille"

    var icon: String {
        switch self {
        case .list: return "list.bullet"
        case .grid: return "square.grid.2x2"
        }
    }
}

enum FileCategory: String, CaseIterable, Identifiable {
    case all = "Tous"
    case favorites = "Favoris"
    case folders = "Dossiers"
    case documents = "Documents"
    case media = "Médias"

    var id: String { rawValue }
    var icon: String {
        switch self {
        case .all: return "tray.full.fill"
        case .favorites: return "star.fill"
        case .folders: return "folder.fill"
        case .documents: return "doc.text.fill"
        case .media: return "photo.on.rectangle.angled"
        }
    }
}

struct FilesView: View {
    @Environment(AppModel.self) private var model
    @State private var path: [CloudFile] = []
    @State private var files: [CloudFile] = []
    @State private var query = ""
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var category: FileCategory = .all
    @State private var displayMode: FileDisplayMode = .list
    @State private var inspectingFile: CloudFile?
    @State private var showSharedLinks = false
    @State private var importingFile = false
    @Environment(\.openURL) private var openURL

    private var currentFolder: CloudFile? { path.last }

    private var filteredFiles: [CloudFile] {
        files.filter { file in
            switch category {
            case .all: return true
            case .favorites: return file.isFavorite == true
            case .folders: return file.isFolder
            case .documents: return file.isDocument
            case .media: return file.isMedia
            }
        }
    }

    private var totalBytes: Int64 {
        files.reduce(0) { $0 + Int64($1.size ?? 0) }
    }

    private var favoritesCount: Int {
        files.filter { $0.isFavorite == true }.count
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                metricsBar

                if !path.isEmpty {
                    breadcrumbBar
                }

                categoryFilterBar

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(Theme.danger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 4)
                }

                if displayMode == .grid {
                    gridView
                } else {
                    listView
                }
            }
            .padding()
        }
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
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        displayMode = displayMode == .list ? .grid : .list
                    }
                } label: {
                    Image(systemName: displayMode.icon)
                }

                Button {
                    showSharedLinks = true
                } label: {
                    Image(systemName: "link.badge.plus")
                }

                Menu {
                    Button {
                        importingFile = true
                    } label: {
                        Label("Importer un fichier", systemImage: "arrow.up.doc")
                    }

                    Button {
                        Task { await load() }
                    } label: {
                        Label("Actualiser", systemImage: "arrow.clockwise")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .refreshable { await load() }
        .sheet(item: $inspectingFile) { file in
            FileInspectorSheet(file: file) {
                Task { await toggleFavorite(file) }
            }
        }
        .sheet(isPresented: $showSharedLinks) {
            NavigationStack {
                SharedLinksView()
            }
        }
        .fileImporter(isPresented: $importingFile, allowedContentTypes: [.item], allowsMultipleSelection: false) { _ in }
        .task(id: LoadKey(folder: currentFolder?.id, query: query)) {
            if !query.isEmpty { try? await Task.sleep(for: .milliseconds(350)) }
            if Task.isCancelled { return }
            await load()
        }
    }

    private var metricsBar: some View {
        HStack(spacing: 12) {
            metricItem(title: "Fichiers", value: "\(files.count)", icon: "doc.on.doc.fill", color: Theme.accentSoft)
            metricItem(title: "Espace", value: ByteCountFormatter.string(fromByteCount: totalBytes, countStyle: .file), icon: "internaldrive.fill", color: Theme.success)
            metricItem(title: "Favoris", value: "\(favoritesCount)", icon: "star.fill", color: Theme.warning)
        }
    }

    private func metricItem(title: String, value: String, icon: String, color: Color) -> some View {
        GlassCard(padding: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: icon)
                        .font(.footnote)
                        .foregroundStyle(color)
                    Spacer()
                }
                Text(value)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.primary)
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var breadcrumbBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                Button {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        path.removeAll()
                    }
                } label: {
                    GlassPill(text: "Racine", systemImage: "house.fill", tint: Theme.accentSoft.opacity(0.2))
                }

                ForEach(path.indices, id: \.self) { idx in
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    let isLast = idx == path.count - 1
                    Button {
                        if !isLast {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                path = Array(path.prefix(upTo: idx + 1))
                            }
                        }
                    } label: {
                        GlassPill(
                            text: path[idx].name,
                            systemImage: "folder.fill",
                            tint: isLast ? Theme.accentSoft.opacity(0.4) : nil
                        )
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(FileCategory.allCases) { cat in
                    let isSelected = category == cat
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            category = cat
                        }
                    } label: {
                        GlassPill(
                            text: cat.rawValue,
                            systemImage: cat.icon,
                            tint: isSelected ? Theme.accentSoft.opacity(0.45) : nil
                        )
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }

    private var listView: some View {
        LazyVStack(spacing: 10) {
            ForEach(filteredFiles) { file in
                Button {
                    handleTap(file)
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: file.symbol)
                            .font(.title3)
                            .foregroundStyle(file.iconColor)
                            .frame(width: 32)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(file.name)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)
                                .lineLimit(1)

                            HStack(spacing: 8) {
                                if !file.readableSize.isEmpty {
                                    Text(file.readableSize)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                if let date = file.updatedAt {
                                    Text(date.formatted(date: .abbreviated, time: .omitted))
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        Spacer()

                        if file.isFavorite == true {
                            Image(systemName: "star.fill")
                                .font(.footnote)
                                .foregroundStyle(Theme.warning)
                        }

                        if file.isFolder {
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        } else {
                            Button {
                                inspectingFile = file
                            } label: {
                                Image(systemName: "info.circle")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(12)
                    .glassEffect(Glass.regular, in: .rect(cornerRadius: Theme.cardRadius))
                }
                .buttonStyle(.plain)
                .contextMenu {
                    contextMenuForFile(file)
                }
            }
        }
    }

    private var gridView: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(filteredFiles) { file in
                Button {
                    handleTap(file)
                } label: {
                    GlassCard(padding: 12) {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: file.symbol)
                                    .font(.title2)
                                    .foregroundStyle(file.iconColor)

                                Spacer()

                                if file.isFavorite == true {
                                    Image(systemName: "star.fill")
                                        .font(.caption)
                                        .foregroundStyle(Theme.warning)
                                }
                            }

                            Spacer(minLength: 8)

                            Text(file.name)
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(2)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            Text(file.readableSize.isEmpty ? (file.isFolder ? "Dossier" : "Fichier") : file.readableSize)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(minHeight: 100)
                    }
                }
                .buttonStyle(.plain)
                .contextMenu {
                    contextMenuForFile(file)
                }
            }
        }
    }

    @ViewBuilder
    private func contextMenuForFile(_ file: CloudFile) -> some View {
        if file.isFolder {
            Button {
                path.append(file)
            } label: {
                Label("Ouvrir", systemImage: "folder")
            }
        } else if let link = file.webViewLink, let url = URL(string: link) {
            Button {
                openURL(url)
            } label: {
                Label("Ouvrir dans le cloud", systemImage: "safari")
            }

            ShareLink(item: url) {
                Label("Partager le lien", systemImage: "square.and.arrow.up")
            }
        }

        Button {
            Task { await toggleFavorite(file) }
        } label: {
            Label(
                file.isFavorite == true ? "Retirer des favoris" : "Ajouter aux favoris",
                systemImage: file.isFavorite == true ? "star.slash" : "star"
            )
        }

        Button {
            inspectingFile = file
        } label: {
            Label("Détails", systemImage: "info.circle")
        }
    }

    private func handleTap(_ file: CloudFile) {
        if file.isFolder {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                path.append(file)
            }
        } else if let link = file.webViewLink, let url = URL(string: link) {
            openURL(url)
        } else {
            inspectingFile = file
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

    private func toggleFavorite(_ file: CloudFile) async {
        let driveId = file.driveFileId ?? file.id
        guard !driveId.isEmpty else { return }
        let newStatus = !(file.isFavorite ?? false)
        do {
            try await model.api.workerVoid(
                "api/cloud/file/favorite",
                query: [URLQueryItem(name: "driveFileId", value: driveId)],
                body: APIClient.json(["favorite": .bool(newStatus)])
            )
            if let idx = files.firstIndex(where: { $0.id == file.id }) {
                files[idx].isFavorite = newStatus
            }
            if inspectingFile?.id == file.id {
                inspectingFile?.isFavorite = newStatus
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct FileInspectorSheet: View {
    let file: CloudFile
    let onFavoriteToggle: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 16) {
                        Image(systemName: file.symbol)
                            .font(.system(size: 38))
                            .foregroundStyle(file.iconColor)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(file.name)
                                .font(.headline)
                                .foregroundStyle(.primary)

                            Text(file.readableSize.isEmpty ? (file.isFolder ? "Dossier" : "Fichier") : file.readableSize)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(GlassRowBackground())

                Section("Informations") {
                    LabeledContent("Type MIME", value: file.mimeType ?? "—")
                    if let size = file.size, size > 0 {
                        LabeledContent("Taille exacte", value: "\(size) octets")
                    }
                    if let date = file.updatedAt {
                        LabeledContent("Modifié le", value: date.formatted(date: .long, time: .shortened))
                    }
                    LabeledContent("Favori", value: file.isFavorite == true ? "Oui" : "Non")
                }
                .listRowBackground(GlassRowBackground())

                Section {
                    if let link = file.webViewLink, let url = URL(string: link) {
                        Button {
                            openURL(url)
                        } label: {
                            Label("Ouvrir dans Google Drive", systemImage: "arrow.up.right.square")
                        }

                        ShareLink(item: url) {
                            Label("Partager l'URL", systemImage: "square.and.arrow.up")
                        }
                    }

                    Button {
                        onFavoriteToggle()
                    } label: {
                        Label(
                            file.isFavorite == true ? "Retirer des favoris" : "Ajouter aux favoris",
                            systemImage: file.isFavorite == true ? "star.slash" : "star"
                        )
                    }
                }
                .listRowBackground(GlassRowBackground())
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Détails du fichier")
            .navigationBarTitleDisplayMode(.inline)
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
    }
}
