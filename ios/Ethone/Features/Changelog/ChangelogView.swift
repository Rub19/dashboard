import SwiftUI

enum ChangelogType: String, CaseIterable, Identifiable {
    case all = "Tous"
    case feature = "Nouveautés"
    case fix = "Correctifs"
    case update = "Améliorations"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .all: return "line.3.horizontal.decrease.circle"
        case .feature: return "sparkles"
        case .fix: return "wrench.and.screwdriver.fill"
        case .update: return "arrow.triangle.2.circlepath"
        }
    }
}

struct NativeChangelogEntry: Identifiable, Codable, Sendable {
    var id: String { version }
    let version: String
    let date: String
    let title: String
    let items: [String]
}

@MainActor
@Observable
final class ChangelogStore {
    var entries: [NativeChangelogEntry] = []
    var isLoading = false
    var errorMessage: String?

    init() {
        self.entries = Self.bundledEntries
    }

    func load() async {
        guard let url = URL(string: "https://ethone.dev/changelog.json") else { return }
        isLoading = true
        errorMessage = nil
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) {
                let decoded = try JSONDecoder().decode([NativeChangelogEntry].self, from: data)
                if !decoded.isEmpty {
                    self.entries = decoded
                }
            }
        } catch {
            if entries.isEmpty {
                entries = Self.bundledEntries
            }
        }
        isLoading = false
    }

    static let bundledEntries: [NativeChangelogEntry] = [
        NativeChangelogEntry(
            version: "v1.55.35",
            date: "2026-10-06",
            title: "Parité iOS Native : Journal des Modifications & Code Épuré",
            items: [
                "Nouveau module natif Changelog sur iOS : consultation fluide des notes de version, filtrage intelligent par catégorie (Nouveautés, Correctifs, Améliorations) et recherche en direct.",
                "Cartes Liquid Glass interactives avec dépliage dynamique et classification automatique des éléments.",
                "Deeplink universel et navigation directe via /changelog, ethone://changelog et la section Version de l'application.",
                "Épuration intégrale du code natif : suppression définitive de toutes les annotations et notes de commentaires dans l'ensemble des modules Swift."
            ]
        ),
        NativeChangelogEntry(
            version: "v1.55.34",
            date: "2026-10-06",
            title: "Parité iOS Native : Clip Rapide Liquid Glass",
            items: [
                "Nouvel écran natif Clip sur iOS : capture instantanée depuis le presse-papier avec extraction d'URL et détection de citations Markdown.",
                "Formulaire interactif Liquid Glass : bascule Note/Tâche, sélecteur de priorité, échéance et retours haptiques natifs.",
                "Routage universel et deeplinks via /clip et le schéma ethone://clip."
            ]
        ),
        NativeChangelogEntry(
            version: "v1.55.33",
            date: "2026-10-06",
            title: "Parité iOS Native : Marketplace de Plugins & Extensions Liquid Glass",
            items: [
                "Intégration native de l'écosystème Plugins & Extensions sur iOS avec catalogue complet (Widgets, Thèmes, Automatisations, IA Brain).",
                "Boutique interactive Liquid Glass avec recherche en direct, filtrage par onglets et sélecteur horizontal de catégories.",
                "Gestion locale des extensions : installation, désactivation instantanée et favoris persistants."
            ]
        ),
        NativeChangelogEntry(
            version: "v1.55.32",
            date: "2026-10-06",
            title: "Parité iOS Native : Studio Soundscape & Módules Discord",
            items: [
                "Intégration native de Soundscape sur iOS avec moteur de son procédural pur AVFoundation (ondes binaurales stéréo, fréquences Solfeggio 432-852 Hz, ambiances naturelles).",
                "Visualiseur d'ondes 60 FPS en Canvas SwiftUI et support de la lecture en arrière-plan avec minuterie de veille.",
                "Parité des modules de gestion Discord : alertes streamers (Twitch, YouTube, Kick) et mini-jeux & casino."
            ]
        ),
        NativeChangelogEntry(
            version: "v1.55.31",
            date: "2026-10-05",
            title: "Parité Mobile Intégrale & Optimisations de Rendu",
            items: [
                "Synchronisation en temps réel des actions Discord Admin sur mobile et tablette.",
                "Fluidité de l'interface Liquid Glass à 120 Hz ProMotion sur les appareils compatibles.",
                "Optimisation du cache mémoire et synchronisation en tâche de fond sécurisée."
            ]
        )
    ]
}

struct ChangelogView: View {
    @State private var store = ChangelogStore()
    @State private var filter: ChangelogType = .all
    @State private var search = ""
    @State private var expanded: Set<String> = []

    private var filteredEntries: [NativeChangelogEntry] {
        store.entries.filter { entry in
            let matchesSearch = search.isEmpty ||
                entry.version.localizedCaseInsensitiveContains(search) ||
                entry.title.localizedCaseInsensitiveContains(search) ||
                entry.items.contains { $0.localizedCaseInsensitiveContains(search) }

            if !matchesSearch { return false }

            switch filter {
            case .all:
                return true
            case .feature:
                return entry.items.contains { classify($0) == .feature }
            case .fix:
                return entry.items.contains { classify($0) == .fix }
            case .update:
                return entry.items.contains { classify($0) == .update }
            }
        }
    }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                currentVersionBanner

                filterBar

                if store.isLoading && store.entries.isEmpty {
                    ProgressView("Chargement des versions…")
                        .padding(.vertical, 40)
                } else if filteredEntries.isEmpty {
                    emptyState
                } else {
                    ForEach(filteredEntries) { entry in
                        entryCard(entry)
                    }
                }
            }
            .padding()
        }
        .scrollContentBackground(.hidden)
        .searchable(text: $search, prompt: "Rechercher une version ou fonctionnalité…")
        .navigationTitle("Journal des versions")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .task {
            if let first = store.entries.first {
                expanded.insert(first.version)
            }
            await store.load()
            if let first = store.entries.first {
                expanded.insert(first.version)
            }
        }
        .refreshable {
            await store.load()
        }
    }

    private var currentVersionBanner: some View {
        GlassCard {
            HStack(spacing: 14) {
                ZStack {
                    Circle()
                        .fill(Theme.accent.opacity(0.18))
                        .frame(width: 46, height: 46)
                    Image(systemName: "sparkles")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Theme.accent)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text("ETHONE")
                            .font(.headline)
                        GlassBadge(text: appVersionString, color: Theme.accent)
                    }
                    Text("Toutes les évolutions, nouveautés et corrections de l'application.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .padding(14)
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ChangelogType.allCases) { type in
                    Button {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                            filter = type
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: type.symbol)
                                .font(.system(size: 12, weight: .semibold))
                            Text(type.rawValue)
                                .font(.subheadline)
                                .fontWeight(filter == type ? .semibold : .regular)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(filter == type ? Theme.accent : Color.primary.opacity(0.08))
                        )
                        .foregroundStyle(filter == type ? .white : .primary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 2)
        }
    }

    private func entryCard(_ entry: NativeChangelogEntry) -> some View {
        let isExpanded = expanded.contains(entry.version)

        return GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Button {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        if isExpanded {
                            expanded.remove(entry.version)
                        } else {
                            expanded.insert(entry.version)
                        }
                    }
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 8) {
                                GlassBadge(text: entry.version, color: Theme.accent)
                                if !entry.date.isEmpty {
                                    Text(entry.date)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            Text(entry.title)
                                .font(.headline)
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                        }

                        Spacer()

                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle")
                            .font(.system(size: 18))
                            .foregroundStyle(.secondary)
                            .padding(.top, 2)
                    }
                }
                .buttonStyle(.plain)

                if isExpanded {
                    Divider()
                        .background(Color.white.opacity(0.12))

                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(Array(entry.items.enumerated()), id: \.offset) { _, item in
                            let cat = classify(item)
                            if filter == .all || filter == cat {
                                HStack(alignment: .top, spacing: 10) {
                                    Image(systemName: cat.symbol)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(categoryColor(cat))
                                        .frame(width: 18, height: 18)
                                        .padding(.top, 2)

                                    Text(item)
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(16)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("Aucune mise à jour correspondante")
                .font(.headline)
            Text("Essayez d'ajuster vos termes de recherche ou de sélectionner une autre catégorie.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 40)
        .padding(.horizontal, 24)
    }

    private var appVersionString: String {
        (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String).map { "v\($0)" } ?? "v1.55.35"
    }

    private func classify(_ text: String) -> ChangelogType {
        let lower = text.lowercased()
        if lower.contains("corrige") || lower.contains("fix") || lower.contains("résol") || lower.contains("bug") || lower.contains("patch") {
            return .fix
        }
        if lower.contains("nouveau") || lower.contains("ajout") || lower.contains("support") || lower.contains("intègre") {
            return .feature
        }
        return .update
    }

    private func categoryColor(_ cat: ChangelogType) -> Color {
        switch cat {
        case .feature: return Theme.accent
        case .fix: return Theme.info
        case .update: return Theme.warning
        case .all: return .primary
        }
    }
}
