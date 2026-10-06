import SwiftUI

struct PluginsView: View {
    @Environment(AppModel.self) private var model
    @State private var store = PluginsStore()
    @State private var searchText = ""
    @State private var selectedType: PluginType = .all
    @State private var selectedFilter: PluginFilter = .all
    @State private var selectedPlugin: PluginItem?

    enum PluginFilter: String, CaseIterable, Identifiable {
        case all = "Tous"
        case installed = "Installés"
        case favorites = "Favoris"

        var id: String { rawValue }
    }

    private var filteredPlugins: [PluginItem] {
        PluginItem.all.filter { item in
            let matchesType = (selectedType == .all || item.type == selectedType)
            let matchesFilter: Bool = {
                switch selectedFilter {
                case .all: return true
                case .installed: return store.isInstalled(item.id)
                case .favorites: return store.isFavorite(item.id)
                }
            }()
            let matchesSearch = searchText.isEmpty ||
                item.name.localizedCaseInsensitiveContains(searchText) ||
                item.description.localizedCaseInsensitiveContains(searchText) ||
                item.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }

            return matchesType && matchesFilter && matchesSearch
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Picker("Filtre", selection: $selectedFilter) {
                    ForEach(PluginFilter.allCases) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(PluginType.allCases) { type in
                            Button {
                                selectedType = type
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: type.symbol)
                                    Text(type.rawValue)
                                }
                                .font(.subheadline.weight(selectedType == type ? .semibold : .regular))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .glassEffect(selectedType == type ? Glass.regular.tint(Color(hex: model.accentHex).opacity(0.25)) : Glass.regular, in: .capsule)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }

                if filteredPlugins.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "puzzlepiece.extension")
                            .font(.system(size: 40))
                            .foregroundStyle(.secondary)
                        Text("Aucun plugin trouvé")
                            .font(.headline)
                        Text("Essayez un autre mot-clé ou modifiez les filtres de catégorie.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    .padding(.horizontal)
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(filteredPlugins) { item in
                            pluginCard(item)
                                .onTapGesture {
                                    selectedPlugin = item
                                }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.top, 10)
            .padding(.bottom, 24)
        }
        .scrollContentBackground(.hidden)
        .searchable(text: $searchText, prompt: "Rechercher un widget, thème, IA...")
        .navigationTitle("Plugins & Extensions")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .sheet(item: $selectedPlugin) { item in
            PluginDetailSheet(item: item, store: store)
        }
    }

    private func pluginCard(_ item: PluginItem) -> some View {
        let isInstalled = store.isInstalled(item.id)
        let isEnabled = store.isEnabled(item.id)
        let isFavorite = store.isFavorite(item.id)

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: item.symbol)
                    .font(.title2)
                    .foregroundStyle(Color(hex: model.accentHex))
                    .frame(width: 44, height: 44)
                    .glassEffect(Glass.regular.tint(Color(hex: model.accentHex).opacity(0.15)), in: .rect(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    HStack {
                        Text(item.name)
                            .font(.headline)
                            .foregroundStyle(.primary)
                        Spacer()
                        Button {
                            store.toggleFavorite(item)
                        } label: {
                            Image(systemName: isFavorite ? "heart.fill" : "heart")
                                .foregroundStyle(isFavorite ? Theme.danger : .secondary)
                                .font(.subheadline)
                        }
                        .buttonStyle(.plain)
                    }

                    HStack(spacing: 8) {
                        Text(item.author)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(item.type.rawValue)
                            .font(.caption2.weight(.medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.white.opacity(0.08), in: Capsule())

                        HStack(spacing: 2) {
                            Image(systemName: "star.fill")
                                .font(.caption2)
                                .foregroundStyle(.yellow)
                            Text(String(format: "%.1f", item.rating))
                                .font(.caption2.weight(.semibold))
                        }
                    }
                }
            }

            Text(item.description)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack {
                Text("v\(item.version) · \(item.installCount) installs")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                Spacer()

                if isInstalled {
                    Toggle("", isOn: Binding(
                        get: { isEnabled },
                        set: { _ in store.toggleEnabled(item) }
                    ))
                    .labelsHidden()
                    .toggleStyle(SwitchToggleStyle(tint: Color(hex: model.accentHex)))

                    Button {
                        store.uninstall(item)
                    } label: {
                        Text("Retirer")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Theme.danger)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .glassEffect(Glass.regular, in: .capsule)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button {
                        store.install(item)
                    } label: {
                        Text("Installer")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(Color(hex: model.accentHex), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(isInstalled ? Glass.regular.tint(Color(hex: model.accentHex).opacity(0.1)) : Glass.regular, in: .rect(cornerRadius: 18))
    }
}

private struct PluginDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppModel.self) private var model
    let item: PluginItem
    let store: PluginsStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 16) {
                        Image(systemName: item.symbol)
                            .font(.system(size: 32))
                            .foregroundStyle(Color(hex: model.accentHex))
                            .frame(width: 64, height: 64)
                            .glassEffect(Glass.regular.tint(Color(hex: model.accentHex).opacity(0.2)), in: .rect(cornerRadius: 16))

                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.title3.bold())

                            Text(item.author)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)

                            HStack(spacing: 8) {
                                Text(item.verification.rawValue)
                                    .font(.caption2.bold())
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(item.verification.badgeColor.opacity(0.2), in: Capsule())
                                    .foregroundStyle(item.verification.badgeColor)

                                HStack(spacing: 2) {
                                    Image(systemName: "star.fill")
                                        .font(.caption2)
                                        .foregroundStyle(.yellow)
                                    Text("\(String(format: "%.1f", item.rating)) (\(item.reviewCount))")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("À propos").sectionTitle()
                        Text(item.longDescription)
                            .font(.subheadline)
                            .foregroundStyle(.primary)
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Fonctionnalités").sectionTitle()
                        ForEach(item.features, id: \.self) { feature in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(Color(hex: model.accentHex))
                                    .font(.subheadline)
                                Text(feature)
                                    .font(.subheadline)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Permissions").sectionTitle()
                        ForEach(item.permissions, id: \.self) { perm in
                            HStack(spacing: 6) {
                                Image(systemName: "lock.shield")
                                    .foregroundStyle(.secondary)
                                    .font(.caption)
                                Text(perm)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Informations").sectionTitle()
                        LabeledContent("Version", value: item.version)
                        LabeledContent("Type", value: item.type.rawValue)
                        LabeledContent("Mise à jour", value: item.lastUpdated)
                        LabeledContent("Installations", value: "\(item.installCount)")
                    }
                    .font(.footnote)
                    .padding(12)
                    .glassEffect(Glass.regular, in: .rect(cornerRadius: 14))

                    let isInstalled = store.isInstalled(item.id)
                    Button {
                        if isInstalled {
                            store.uninstall(item)
                        } else {
                            store.install(item)
                        }
                    } label: {
                        Text(isInstalled ? "Désinstaller ce plugin" : "Installer maintenant")
                            .font(.headline)
                            .foregroundStyle(isInstalled ? Theme.danger : .white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(isInstalled ? Color.red.opacity(0.15) : Color(hex: model.accentHex), in: RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.top, 8)
                }
                .padding()
            }
            .navigationTitle("Détails")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
    }
}
