import SwiftUI
import Observation

@MainActor
@Observable
final class RiotFavoritesModel {
    struct Preset: Codable, Identifiable, Hashable {
        let id: UUID
        var name: String
        let items: [String]
        let createdAt: Date
    }

    private(set) var presets: [Preset] = []
    private(set) var current: [String: String] = [:]
    private(set) var isLoading = false
    private(set) var isApplying = false
    var message: String?

    private let api: APIClient
    init(api: APIClient) { self.api = api }

    private var cache: ValorantPersonalCache { ValorantPersonalCache(api: api, accountName: "_favorites", accountTag: "_") }

    private struct Favorites: Decodable {
        struct Item: Decodable { let FavoriteID: String?; let ItemID: String? }
        let FavoritedContent: [String: Item]?
    }

    func load(_ session: RiotSession) async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        if let r = await cache.read("favorite_presets", ttl: .infinity) {
            presets = ValorantPersonalCache.decode([Preset].self, from: r.payload) ?? []
        }
        guard let puuid = session.credentials?.puuid else { return }
        do {
            let favorites: Favorites = try await session.game("/favorites/v1/players/\(puuid)/favorites")
            current = (favorites.FavoritedContent ?? [:]).reduce(into: [:]) { result, entry in
                result[entry.key] = (entry.value.ItemID ?? entry.key).lowercased()
            }
            message = nil
        } catch {
            message = "Favoris indisponibles : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
    }

    func saveCurrent(name: String) {
        guard !current.isEmpty else {
            message = "Vous n’avez aucun favori à enregistrer."
            return
        }
        presets.insert(Preset(id: UUID(), name: name, items: Array(Set(current.values)).sorted(), createdAt: Date()), at: 0)
        persist()
    }

    func delete(_ preset: Preset) {
        presets.removeAll { $0.id == preset.id }
        persist()
    }

    func apply(_ preset: Preset, session: RiotSession) async -> Bool {
        guard let puuid = session.credentials?.puuid, !isApplying else { return false }
        isApplying = true
        defer { isApplying = false }
        let wanted = Set(preset.items.map { $0.lowercased() })
        let have = Set(current.values)
        let removals = current.filter { !wanted.contains($0.value) }.map(\.key)
        let additions = wanted.subtracting(have)
        var failures = 0
        for key in removals {
            do { try await session.gameData("/favorites/v1/players/\(puuid)/favorites/\(key)", method: "DELETE") } catch { failures += 1 }
        }
        for item in additions {
            do {
                try await session.gameData("/favorites/v1/players/\(puuid)/favorites", method: "POST", body: RiotSession.json(["ItemID": item]))
            } catch { failures += 1 }
        }
        await load(session)
        message = failures == 0 ? "« \(preset.name) » appliqué." : "« \(preset.name) » appliqué avec \(failures) erreur(s)."
        return failures == 0
    }

    private func persist() {
        guard let payload = ValorantPersonalCache.encode(presets) else { return }
        let cache = cache
        Task { await cache.save(payload, key: "favorite_presets") }
    }
}

struct EvalFavoritePresetsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var naming = false
    @State private var name = ""
    @State private var toApply: RiotFavoritesModel.Preset?

    private var favorites: RiotFavoritesModel { model.valorant.favorites }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                EvalNavHeader(title: "Préréglages des Favoris") { dismiss() }
                if favorites.presets.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "star.square.on.square")
                            .font(.system(size: 46))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Text("Aucun préréglage de favoris")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                        Text("Enregistrez vos favoris actuels sous forme de préréglage pour pouvoir passer d’un ensemble à l’autre en un toucher.")
                            .font(.system(size: 17))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 60)
                    .padding(.horizontal, 12)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(favorites.presets.enumerated()), id: \.element.id) { index, preset in
                            EvalSwipeRow(actions: [EvalSwipeRow.Action(title: "Supprimer", icon: "trash", color: Color(hex: 0xFF3B30), isFullSwipe: true) { favorites.delete(preset) }]) {
                                Button { toApply = preset } label: {
                                    HStack(spacing: 14) {
                                        Image(systemName: "star.fill")
                                            .font(.system(size: 18))
                                            .foregroundStyle(EvalAccent.color)
                                            .frame(width: 44, height: 44)
                                            .background(EvalAccent.color.opacity(0.15), in: .circle)
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(preset.name).font(.system(size: 19, weight: .semibold)).foregroundStyle(EvalColors.text)
                                            Text("\(preset.items.count) favoris · \(preset.createdAt.formatted(.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "fr_FR"))))")
                                                .font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
                                    }
                                    .padding(.horizontal, 18)
                                    .frame(minHeight: 72)
                                    .contentShape(.rect)
                                }
                                .buttonStyle(.plain)
                            }
                            if index < favorites.presets.count - 1 {
                                Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 76)
                            }
                        }
                    }
                    .background(EvalColors.card, in: .rect(cornerRadius: 26))
                    .clipShape(.rect(cornerRadius: 26))
                }
                if let message = favorites.message {
                    Text(message).font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 6)
                }
                Button { name = ""; naming = true } label: {
                    Text(favorites.isApplying ? "Application…" : "Enregistrer les favoris actuels")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(EvalAccent.color, in: .capsule)
                }
                .buttonStyle(.plain)
                .disabled(favorites.isApplying || !model.valorant.riot.isLinked)
                .padding(.top, 6)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await favorites.load(model.valorant.riot) }
        .alert("Nommer le préréglage", isPresented: $naming) {
            TextField("Nom", text: $name)
            Button("Annuler", role: .cancel) {}
            Button("Enregistrer") { favorites.saveCurrent(name: name.isEmpty ? "Favoris" : name) }
        }
        .confirmationDialog("Appliquer « \(toApply?.name ?? "") » ?", isPresented: Binding(get: { toApply != nil }, set: { if !$0 { toApply = nil } }), titleVisibility: .visible) {
            Button("Appliquer") {
                guard let preset = toApply else { return }
                Task { _ = await favorites.apply(preset, session: model.valorant.riot) }
            }
        } message: {
            Text("Vos favoris Riot actuels seront remplacés par ceux de ce préréglage.")
        }
    }
}
