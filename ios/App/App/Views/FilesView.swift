import SwiftUI
import UniformTypeIdentifiers

public struct FileItem: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let size: String
    public let type: String
    public let date: String

    public init(id: String = UUID().uuidString, name: String, size: String, type: String, date: String) {
        self.id = id
        self.name = name
        self.size = size
        self.type = type
        self.date = date
    }

    public var icon: String {
        switch type {
        case "pdf": return "doc.richtext.fill"
        case "image": return "photo.fill"
        case "code": return "chevron.left.forwardslash.chevron.right"
        case "archive": return "archivebox.fill"
        default: return "doc.fill"
        }
    }

    public var tintColor: Color {
        switch type {
        case "pdf": return ETHTheme.rose
        case "image": return ETHTheme.cyan
        case "code": return ETHTheme.emerald
        case "archive": return ETHTheme.amber
        default: return ETHTheme.violet
        }
    }
}

public struct FilesView: View {
    @State private var files: [FileItem] = [
        FileItem(name: "ETHONE-Architecture-2026.pdf", size: "2.4 Mo", type: "pdf", date: "Aujourd'hui"),
        FileItem(name: "Dashboard-Mockup-4K.png", size: "4.8 Mo", type: "image", date: "Hier"),
        FileItem(name: "config.production.json", size: "14 Ko", type: "code", date: "26 août"),
        FileItem(name: "backup-user-data.zip", size: "12.8 Mo", type: "archive", date: "22 août")
    ]
    @State private var searchText = ""
    @State private var showingImporter = false

    public init() {}

    var filteredFiles: [FileItem] {
        if searchText.isEmpty { return files }
        return files.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                if filteredFiles.isEmpty {
                    ETHEmptyState(
                        icon: "folder.fill",
                        title: "Aucun fichier",
                        description: "Importez vos documents ou synchronisez avec votre stockage cloud."
                    )
                } else {
                    List {
                        ForEach(filteredFiles) { file in
                            HStack(spacing: 14) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(file.tintColor.opacity(0.15))
                                        .frame(width: 40, height: 40)
                                    Image(systemName: file.icon)
                                        .font(.system(size: 18))
                                        .foregroundStyle(file.tintColor)
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(file.name)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundStyle(.primary)
                                        .lineLimit(1)
                                    HStack(spacing: 8) {
                                        Text(file.size)
                                        Text("•")
                                        Text(file.date)
                                    }
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Menu {
                                    Button(action: {}) {
                                        Label("Partager", systemImage: "square.and.arrow.up")
                                    }
                                    Button(role: .destructive, action: {
                                        files.removeAll { $0.id == file.id }
                                    }) {
                                        Label("Supprimer", systemImage: "trash")
                                    }
                                } label: {
                                    Image(systemName: "ellipsis")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(.secondary)
                                        .padding(8)
                                }
                            }
                            .padding(.vertical, 4)
                            .listRowBackground(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(.ultraThinMaterial)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.08), lineWidth: 0.5))
                            )
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .padding(.bottom, 80)
                }
            }
            .navigationTitle("Fichiers")
            .searchable(text: $searchText, prompt: "Rechercher un fichier...")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingImporter = true }) {
                        Image(systemName: "arrow.up.doc.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(ETHTheme.emerald)
                    }
                }
            }
            .fileImporter(isPresented: $showingImporter, allowedContentTypes: [.item]) { result in
                if case .success(let url) = result {
                    let name = url.lastPathComponent
                    files.insert(FileItem(name: name, size: "1.0 Mo", type: "pdf", date: "À l'instant"), at: 0)
                    HapticManager.shared.success()
                }
            }
        }
    }
}
