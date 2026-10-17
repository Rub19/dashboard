import SwiftUI

/// The website's avatar library (`/avatars/library/catalog.json`), shared by the site and the app.
struct AvatarLibraryCatalog: Codable {
    struct Avatar: Codable, Identifiable, Hashable { let id: String; let name: String; let series: String; let url: String }
    struct Collection: Codable, Identifiable { let id: String; let label: String; let items: [Avatar] }
    let collections: [Collection]

    static let url = URL(string: "https://ethone.dev/avatars/library/catalog.json")!
}

/// Streaming-style avatar picker: big preview over a blurred backdrop, one horizontal row per series.
/// The choice is saved to the account right away, so the website shows it too.
struct AvatarLibrarySheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Binding var currentAvatar: String
    let displayName: String

    @State private var catalog: AvatarLibraryCatalog?
    @State private var selectedPlatformID = "crunchyroll"
    @State private var selection = ""
    @State private var query = ""
    @State private var customURL = ""
    @State private var loadError: String?
    @State private var saving = false
    @State private var saveError: String?

    private var selectedAvatar: AvatarLibraryCatalog.Avatar? {
        catalog?.collections.lazy.flatMap(\.items).first { $0.url == selection }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    hero
                    if let saveError { Text(saveError).font(.footnote).foregroundStyle(Theme.danger).padding(.horizontal, 16) }
                    if let catalog {
                        let trimmed = query.trimmingCharacters(in: .whitespaces)
                        if trimmed.isEmpty {
                            platformCategoriesBar(catalog)
                            if let collection = catalog.collections.first(where: { $0.id == selectedPlatformID }) ?? catalog.collections.first {
                                collectionSection(collection)
                            }
                        } else {
                            searchResults(catalog, trimmed)
                        }
                    } else if let loadError {
                        Text(loadError).font(.footnote).foregroundStyle(.secondary).padding(.horizontal, 16)
                    } else {
                        ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                    }
                    customSection
                }
                .padding(.bottom, 30)
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .automatic), prompt: "Personnage ou série")
            .navigationTitle("Modifier l'avatar")
            .navigationBarTitleDisplayMode(.inline)
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button { Task { await save() } } label: {
                        if saving { ProgressView() } else { Text("Terminé").bold() }
                    }
                    .disabled(saving || selection == currentAvatar)
                }
            }
            .task {
                selection = currentAvatar.isEmpty ? (model.ethoneAvatar ?? "") : currentAvatar
                await load()
                if let matched = catalog?.collections.first(where: { col in col.items.contains(where: { $0.url == selection }) }) {
                    selectedPlatformID = matched.id
                }
            }
        }
    }

    private var hero: some View {
        ZStack {
            AvatarView(urlString: selection.isEmpty ? nil : selection, name: displayName, size: 160)
                .blur(radius: 40)
                .scaleEffect(2.6)
                .opacity(0.55)
                .frame(maxWidth: .infinity)
                .frame(height: 230)
                .clipped()
                .overlay(LinearGradient(colors: [.clear, Color.black.opacity(0.45)], startPoint: .top, endPoint: .bottom))
                .accessibilityHidden(true)
            VStack(spacing: 10) {
                AvatarView(urlString: selection.isEmpty ? nil : selection, name: displayName, size: 118)
                    .overlay(Circle().strokeBorder(.white.opacity(0.9), lineWidth: 3))
                    .shadow(color: .black.opacity(0.35), radius: 16, y: 8)
                    .id(selection)
                    .transition(.scale(scale: 0.86).combined(with: .opacity))
                Text(displayName).font(.headline)
                Text(selectedAvatar.map { "\($0.name) · \($0.series)" } ?? (selection.isEmpty ? "Aucun avatar" : "Image personnalisée"))
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            .animation(Motion.snap, value: selection)
        }
        .frame(height: 230)
    }

    private func platformBrandColor(_ id: String) -> Color {
        switch id {
        case "crunchyroll": Color(hex: 0xF47521)
        case "netflix": Color(hex: 0xE50914)
        case "hbo": Color(hex: 0x9933FF)
        case "disney": Color(hex: 0x113CCF)
        case "prime-video": Color(hex: 0x00A8E1)
        default: Theme.accent
        }
    }

    private func platformCategoriesBar(_ catalog: AvatarLibraryCatalog) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(catalog.collections) { collection in
                    let isSelected = selectedPlatformID == collection.id
                    let brandColor = platformBrandColor(collection.id)
                    Button {
                        withAnimation(Motion.snap) {
                            selectedPlatformID = collection.id
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(brandColor)
                                .frame(width: 8, height: 8)
                            Text(collection.label)
                                .font(.subheadline.weight(isSelected ? .bold : .medium))
                                .foregroundStyle(isSelected ? .white : .secondary)
                            Text("\(collection.items.count)")
                                .font(.caption2.monospacedDigit())
                                .foregroundStyle(isSelected ? .white.opacity(0.8) : .tertiary)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1.5)
                                .background(isSelected ? Color.white.opacity(0.18) : Color.white.opacity(0.06), in: .capsule)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .glassEffect(isSelected ? Glass.regular.tint(brandColor.opacity(0.45)) : Glass.regular, in: .capsule)
                        .overlay(
                            Capsule().strokeBorder(isSelected ? brandColor.opacity(0.8) : Color.white.opacity(0.08), lineWidth: isSelected ? 1.5 : 0.8)
                        )
                    }
                    .buttonStyle(PressScaleStyle())
                    .sensoryFeedback(.selection, trigger: selectedPlatformID)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 2)
        }
    }

    private func collectionSection(_ collection: AvatarLibraryCatalog.Collection) -> some View {
        let series = collection.items.reduce(into: [String]()) { if !$0.contains($1.series) { $0.append($1.series) } }
        return VStack(alignment: .leading, spacing: 14) {
            Text(collection.label).font(.title3.weight(.bold)).tracking(-0.4).padding(.horizontal, 16)
            ForEach(series, id: \.self) { name in
                VStack(alignment: .leading, spacing: 8) {
                    if series.count > 1 {
                        Text(name).font(.subheadline.weight(.semibold)).padding(.horizontal, 16)
                    }
                    row(collection.items.filter { $0.series == name })
                }
            }
        }
    }

    private func searchResults(_ catalog: AvatarLibraryCatalog, _ text: String) -> some View {
        let words = text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil).split(separator: " ")
        let found = catalog.collections.flatMap(\.items).filter { avatar in
            let hay = "\(avatar.name) \(avatar.series)".folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
            return words.allSatisfy { hay.contains($0) }
        }
        return VStack(alignment: .leading, spacing: 10) {
            Text(plural(found.count, "résultat", "résultats")).sectionTitle().padding(.horizontal, 16)
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 12)], spacing: 16) {
                ForEach(found) { tile($0) }
            }
            .padding(.horizontal, 16)
        }
    }

    private func row(_ items: [AvatarLibraryCatalog.Avatar]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 14) {
                ForEach(items) { tile($0).frame(width: 84) }
            }
            .scrollTargetLayout()
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
        }
        .scrollTargetBehavior(.viewAligned)
    }

    private func tile(_ avatar: AvatarLibraryCatalog.Avatar) -> some View {
        let selected = avatar.url == selection
        return Button {
            selection = avatar.url
        } label: {
            VStack(spacing: 6) {
                AvatarView(urlString: avatar.url, name: avatar.name, size: 84)
                    .overlay(Circle().strokeBorder(selected ? Theme.accent : .clear, lineWidth: 3))
                    .overlay(alignment: .bottomTrailing) {
                        if selected {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title3)
                                .symbolRenderingMode(.palette)
                                .foregroundStyle(.white, Theme.accent)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                Text(avatar.name).font(.caption2).foregroundStyle(selected ? Theme.accent : .secondary).lineLimit(1)
            }
        }
        .buttonStyle(PressScaleStyle())
        .sensoryFeedback(.selection, trigger: selected)
        .accessibilityLabel("\(avatar.name), \(avatar.series)")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var customSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Image personnalisée").sectionTitle()
            GlassCard {
                VStack(spacing: 12) {
                    TextField("https://…", text: $customURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                    HStack {
                        Button("Utiliser cette image") { selection = customURL.trimmingCharacters(in: .whitespaces) }
                            .buttonStyle(.glassProminent)
                            .disabled(!customURL.trimmingCharacters(in: .whitespaces).hasPrefix("https://"))
                        Spacer()
                        Button("Retirer l'avatar", role: .destructive) { selection = "" }
                            .disabled(selection.isEmpty)
                    }
                }
            }
        }
        .padding(.horizontal, 16)
    }

    private func load() async {
        if catalog == nil, let cached = DiskCache.read(AvatarLibraryCatalog.self, key: "avatar-catalog") { catalog = cached }
        do {
            let (data, response) = try await URLSession.shared.data(from: AvatarLibraryCatalog.url)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let fresh = try JSONDecoder().decode(AvatarLibraryCatalog.self, from: data)
            catalog = fresh
            DiskCache.write(fresh, key: "avatar-catalog")
        } catch {
            if catalog == nil { loadError = "Impossible de charger la bibliothèque d'avatars pour le moment." }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let body = APIClient.json(["avatar_url": .string(selection)])
        do {
            let _: JSONValue = try await model.api.worker("api/profile", method: "PATCH", body: body)
            currentAvatar = selection
            await model.refreshProfile()
            dismiss()
        } catch {
            saveError = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
