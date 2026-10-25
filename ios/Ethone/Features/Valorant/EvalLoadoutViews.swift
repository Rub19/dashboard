import SwiftUI

struct LoadoutCatalog: Codable {
    struct Level: Codable, Hashable { let uuid: String; let displayName: String?; let levelItem: String? }
    struct Chroma: Codable, Hashable { let uuid: String; let displayName: String?; let fullRender: String?; let displayIcon: String?; let swatch: String? }
    struct Skin: Codable, Hashable, Identifiable {
        let uuid: String; let displayName: String; let displayIcon: String?; let levels: [Level]; let chromas: [Chroma]
        var id: String { uuid }
        var image: String? { chromas.first?.fullRender ?? displayIcon ?? chromas.first?.displayIcon }
    }
    struct Weapon: Codable, Identifiable { let uuid: String; let displayName: String; let defaultSkinUuid: String?; let skins: [Skin]; var id: String { uuid } }
    struct Buddy: Codable, Hashable { let uuid: String; let displayName: String; let displayIcon: String?; let levels: [Level] }
    struct Spray: Codable, Hashable, Identifiable { let uuid: String; let displayName: String; let fullTransparentIcon: String?; let displayIcon: String?; var id: String { uuid } }
    struct Card: Codable, Hashable, Identifiable { let uuid: String; let displayName: String; let smallArt: String?; let wideArt: String?; var id: String { uuid } }
    struct Title: Codable, Hashable, Identifiable { let uuid: String; let titleText: String?; var id: String { uuid } }

    var weapons: [Weapon] = []
    var buddies: [Buddy] = []
    var sprays: [Spray] = []
    var cards: [Card] = []
    var titles: [Title] = []
    var fetchedAt = Date.distantPast

    static func load() async -> LoadoutCatalog {
        let key = "valorant-api.loadout-catalog.fr"
        if let cached = DiskCache.read(LoadoutCatalog.self, key: key), Date().timeIntervalSince(cached.fetchedAt) < 86400 { return cached }
        struct Page<T: Decodable>: Decodable { let data: [T] }
        func fetch<T: Decodable>(_ path: String, _ type: T.Type) async -> [T] {
            guard let (data, _) = try? await URLSession.shared.data(from: URL(string: "https://valorant-api.com/v1/\(path)language=fr-FR")!),
                  let page = try? JSONDecoder().decode(Page<T>.self, from: data) else { return [] }
            return page.data
        }
        var catalog = LoadoutCatalog()
        catalog.weapons = await fetch("weapons?", Weapon.self)
        catalog.buddies = await fetch("buddies?", Buddy.self)
        catalog.sprays = await fetch("sprays?", Spray.self)
        catalog.cards = await fetch("playercards?", Card.self)
        catalog.titles = await fetch("playertitles?", Title.self).filter { ($0.titleText ?? "").isEmpty == false }
        catalog.fetchedAt = Date()
        if !catalog.weapons.isEmpty { DiskCache.write(catalog, key: key) }
        return catalog
    }
}

@MainActor
@Observable
final class RiotLoadoutModel {
    struct BuddyInstance: Hashable { let levelID: String; let instanceID: String }

    struct AppearanceProfile: Codable, Identifiable, Hashable {
        let id: UUID
        var name: String
        let loadout: JSONValue
        let createdAt: Date
        var pinned: Bool? = nil

        var cardURL: URL? {
            guard let id = loadout["Identity"]?["PlayerCardID"]?.stringValue, !id.isEmpty else { return nil }
            return URL(string: "https://media.valorant-api.com/playercards/\(id.lowercased())/smallart.png")
        }

        var summary: String {
            var parts: [String] = []
            if let card = loadout["Identity"]?["PlayerCardID"]?.stringValue, !card.isEmpty { parts.append("Carte") }
            if let title = loadout["Identity"]?["PlayerTitleID"]?.stringValue, !title.isEmpty { parts.append("Titre") }
            let guns = loadout["Guns"]?.arrayValue?.count ?? 0
            if guns > 0 { parts.append("\(guns) Armes") }
            if (loadout["Sprays"]?.arrayValue?.isEmpty == false) || (loadout["ActiveExpressions"]?.arrayValue?.isEmpty == false) { parts.append("Expressions") }
            return parts.joined(separator: ", ")
        }
    }

    private(set) var raw: JSONValue?
    private(set) var catalog = LoadoutCatalog()
    private(set) var ownedSkinLevels: Set<String> = []
    private(set) var ownedChromas: Set<String> = []
    private(set) var ownedBuddies: [BuddyInstance] = []
    private(set) var ownedSprays: Set<String> = []
    private(set) var ownedCards: Set<String> = []
    private(set) var ownedTitles: Set<String> = []
    private(set) var profiles: [AppearanceProfile] = []
    private(set) var isLoading = false
    private(set) var isSaving = false
    var message: String?

    private let api: APIClient
    init(api: APIClient) { self.api = api }

    private var profileCache: ValorantPersonalCache { ValorantPersonalCache(api: api, accountName: "_loadouts", accountTag: "_") }

    private static let types = (skinLevel: "e7c63390-eda7-46e0-bb7a-a6abdacd2433", chroma: "3ad1b2b2-acdb-4524-852f-954a76ddae0a",
                                buddy: "dd3bf334-87f3-40bd-b043-682a57a8dc3a", spray: "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475",
                                card: "3f296c07-64c3-494c-923b-fe692a4fa1bd", title: "de7caa6b-adf7-4588-bbd1-143831e786c6")

    private struct Entitlements: Decodable {
        struct E: Decodable { let ItemID: String; let InstanceID: String? }
        let Entitlements: [E]?
    }

    private var loadoutVersion = "v3"

    func load(_ session: RiotSession) async {
        guard let puuid = session.credentials?.puuid, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        catalog = await LoadoutCatalog.load()
        do {
            if let v3: JSONValue = try? await session.game("/personalization/v3/players/\(puuid)/playerloadout") {
                raw = v3
                loadoutVersion = "v3"
            } else {
                raw = try await session.game("/personalization/v2/players/\(puuid)/playerloadout")
                loadoutVersion = "v2"
            }
            message = nil
        } catch {
            message = "Équipement indisponible : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
        func owned(_ type: String) async -> [Entitlements.E] {
            let r: Entitlements? = try? await session.game("/store/v1/entitlements/\(puuid)/\(type)")
            return r?.Entitlements ?? []
        }
        ownedSkinLevels = Set(await owned(Self.types.skinLevel).map { $0.ItemID.lowercased() })
        ownedChromas = Set(await owned(Self.types.chroma).map { $0.ItemID.lowercased() })
        ownedBuddies = await owned(Self.types.buddy).compactMap { e in e.InstanceID.map { BuddyInstance(levelID: e.ItemID.lowercased(), instanceID: $0) } }
        ownedSprays = Set(await owned(Self.types.spray).map { $0.ItemID.lowercased() })
        ownedCards = Set(await owned(Self.types.card).map { $0.ItemID.lowercased() })
        ownedTitles = Set(await owned(Self.types.title).map { $0.ItemID.lowercased() })
        if let r = await profileCache.read("appearance_profiles", ttl: .infinity) {
            profiles = ValorantPersonalCache.decode([AppearanceProfile].self, from: r.payload) ?? []
        }
    }

    var guns: [JSONValue] { raw?["Guns"]?.arrayValue ?? [] }

    var sprays: [JSONValue] { raw?["Sprays"]?.arrayValue ?? [] }

    func gun(_ weaponID: String) -> JSONValue? {
        guns.first { $0["ID"]?.stringValue?.lowercased() == weaponID.lowercased() }
    }

    func spray(_ id: String?) -> LoadoutCatalog.Spray? {
        guard let id = id?.lowercased() else { return nil }
        return catalog.sprays.first { $0.uuid.lowercased() == id }
    }

    func ownedSkins(_ weapon: LoadoutCatalog.Weapon) -> [LoadoutCatalog.Skin] {
        weapon.skins.filter { skin in
            skin.uuid.lowercased() == weapon.defaultSkinUuid?.lowercased()
                || (skin.levels.first.map { ownedSkinLevels.contains($0.uuid.lowercased()) } ?? false)
        }
        .sorted { a, b in
            if a.uuid.lowercased() == weapon.defaultSkinUuid?.lowercased() { return true }
            if b.uuid.lowercased() == weapon.defaultSkinUuid?.lowercased() { return false }
            return a.displayName.localizedCaseInsensitiveCompare(b.displayName) == .orderedAscending
        }
    }

    func ownedLevels(_ skin: LoadoutCatalog.Skin) -> [LoadoutCatalog.Level] {
        skin.levels.enumerated().filter { $0.offset == 0 || ownedSkinLevels.contains($0.element.uuid.lowercased()) }.map(\.element)
    }

    func ownedChromas(_ skin: LoadoutCatalog.Skin) -> [LoadoutCatalog.Chroma] {
        skin.chromas.enumerated().filter { $0.offset == 0 || ownedChromas.contains($0.element.uuid.lowercased()) }.map(\.element)
    }

    func skin(_ id: String?) -> LoadoutCatalog.Skin? {
        guard let id = id?.lowercased() else { return nil }
        for w in catalog.weapons { if let s = w.skins.first(where: { $0.uuid.lowercased() == id }) { return s } }
        return nil
    }

    func chroma(_ id: String?) -> LoadoutCatalog.Chroma? {
        guard let id = id?.lowercased() else { return nil }
        for w in catalog.weapons { for s in w.skins { if let c = s.chromas.first(where: { $0.uuid.lowercased() == id }) { return c } } }
        return nil
    }

    func buddy(level id: String?) -> LoadoutCatalog.Buddy? {
        guard let id = id?.lowercased() else { return nil }
        return catalog.buddies.first { $0.levels.contains { $0.uuid.lowercased() == id } }
    }

    func freeBuddies(except weaponID: String) -> [BuddyInstance] {
        let used = Set(guns.filter { $0["ID"]?.stringValue?.lowercased() != weaponID.lowercased() }.compactMap { $0["CharmInstanceID"]?.stringValue })
        var seen = Set<String>()
        return ownedBuddies.filter { !used.contains($0.instanceID) && seen.insert($0.levelID).inserted }
    }

    private func setGun(_ weaponID: String, _ update: ([String: JSONValue]) -> [String: JSONValue]) {
        guard var root = raw?.objectValue else { return }
        root["Guns"] = .array(guns.map { g in
            guard g["ID"]?.stringValue?.lowercased() == weaponID.lowercased(), let obj = g.objectValue else { return g }
            return .object(update(obj))
        })
        raw = .object(root)
    }

    func equip(weaponID: String, skin: LoadoutCatalog.Skin, level: LoadoutCatalog.Level, chroma: LoadoutCatalog.Chroma, buddy: BuddyInstance?) {
        setGun(weaponID) { gun in
            var g = gun
            g["SkinID"] = .string(skin.uuid)
            g["SkinLevelID"] = .string(level.uuid)
            g["ChromaID"] = .string(chroma.uuid)
            if let buddy, let parent = self.buddy(level: buddy.levelID) {
                g["CharmInstanceID"] = .string(buddy.instanceID)
                g["CharmID"] = .string(parent.uuid)
                g["CharmLevelID"] = .string(buddy.levelID)
            } else {
                g.removeValue(forKey: "CharmInstanceID"); g.removeValue(forKey: "CharmID"); g.removeValue(forKey: "CharmLevelID")
            }
            return g
        }
    }

    func setIdentity(_ key: String, _ value: JSONValue) {
        guard var root = raw?.objectValue, var identity = root["Identity"]?.objectValue else { return }
        identity[key] = value
        root["Identity"] = .object(identity)
        raw = .object(root)
    }

    func setIncognito(_ value: Bool) {
        guard var root = raw?.objectValue else { return }
        root["Incognito"] = .bool(value)
        raw = .object(root)
    }

    func setSpray(slot index: Int, sprayID: String) {
        guard var root = raw?.objectValue, var sprays = root["Sprays"]?.arrayValue, sprays.indices.contains(index),
              var spray = sprays[index].objectValue else { return }
        spray["SprayID"] = .string(sprayID)
        spray["SprayLevelID"] = .null
        sprays[index] = .object(spray)
        root["Sprays"] = .array(sprays)
        raw = .object(root)
    }

    func randomize() {
        for weapon in catalog.weapons {
            let skins = ownedSkins(weapon)
            guard let skin = skins.randomElement(), let level = ownedLevels(skin).last, let chroma = skin.chromas.first,
                  let current = gun(weapon.uuid) else { continue }
            let charm = current["CharmInstanceID"]?.stringValue.flatMap { id in ownedBuddies.first { $0.instanceID == id } }
            equip(weaponID: weapon.uuid, skin: skin, level: level, chroma: chroma, buddy: charm)
        }
    }

    func save(_ session: RiotSession) async -> Bool {
        guard let puuid = session.credentials?.puuid, let raw, let body = RiotSession.json(raw) else { return false }
        isSaving = true
        defer { isSaving = false }
        do {
            self.raw = try await session.game("/personalization/\(loadoutVersion)/players/\(puuid)/playerloadout", method: "PUT", body: body)
            message = "Équipement mis à jour."
            return true
        } catch {
            message = "Échec : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
            await load(session)
            return false
        }
    }

    func saveProfile(name: String) {
        guard let raw else { return }
        profiles.insert(AppearanceProfile(id: UUID(), name: name, loadout: raw, createdAt: Date()), at: 0)
        persistProfiles()
    }

    func applyProfile(_ profile: AppearanceProfile, session: RiotSession) async -> Bool {
        guard var current = raw?.objectValue, let saved = profile.loadout.objectValue else { return false }
        for key in ["Guns", "Sprays", "Identity", "Incognito"] { if let v = saved[key] { current[key] = v } }
        raw = .object(current)
        return await save(session)
    }

    func togglePin(_ profile: AppearanceProfile) {
        guard let index = profiles.firstIndex(where: { $0.id == profile.id }) else { return }
        profiles[index].pinned = !(profiles[index].pinned ?? false)
        persistProfiles()
    }

    func deleteProfile(_ profile: AppearanceProfile) {
        profiles.removeAll { $0.id == profile.id }
        persistProfiles()
    }

    private func persistProfiles() {
        guard let payload = ValorantPersonalCache.encode(profiles) else { return }
        let cache = profileCache
        Task { await cache.save(payload, key: "appearance_profiles") }
    }

    var shareText: String {
        catalog.weapons.compactMap { w -> String? in
            guard let g = gun(w.uuid), let s = skin(g["SkinID"]?.stringValue) else { return nil }
            return "\(w.displayName) : \(s.displayName)"
        }
        .joined(separator: "\n")
    }
}

private enum LUI {
    static let card = EvalColors.card
    static let card2 = EvalColors.card2
    static let secondary = Color(hex: 0x8E8E93)
    static let accent = EvalAccent.color
    static let gold = Color(hex: 0xF5C518)
    static let green = Color(hex: 0x35C26B)
}

private struct LoadoutScreen<Content: View>: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    var trailing: AnyView? = nil
    @ViewBuilder let content: () -> Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                EvalNavHeader(title: title, trailing: trailing) { dismiss() }
                content()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}

private func remote(_ string: String?) -> some View {
    AsyncImage(url: string.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFit() }
}

private func favoriteBadge() -> some View {
    Image(systemName: "star.circle.fill")
        .font(.system(size: 22))
        .symbolRenderingMode(.palette)
        .foregroundStyle(Color.black, LUI.gold)
        .accessibilityLabel("Favori")
}

private func selectedBadge() -> some View {
    Image(systemName: "checkmark.circle.fill")
        .font(.system(size: 22))
        .symbolRenderingMode(.palette)
        .foregroundStyle(Color.white, LUI.accent)
        .accessibilityLabel("Équipé")
}

private func rowDivider(_ leading: CGFloat) -> some View {
    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, leading)
}

private func favoritesFirst<T>(_ items: [T], favorites: Set<String>, id: (T) -> String, name: (T) -> String) -> [T] {
    items.sorted { a, b in
        let fa = favorites.contains(id(a).lowercased())
        let fb = favorites.contains(id(b).lowercased())
        if fa != fb { return fa }
        return name(a).localizedCaseInsensitiveCompare(name(b)) == .orderedAscending
    }
}

private func favoritesOnlyButton(_ isOn: Binding<Bool>) -> AnyView {
    AnyView(
        Button { withAnimation { isOn.wrappedValue.toggle() } } label: {
            Circle().fill(isOn.wrappedValue ? LUI.accent.opacity(0.28) : LUI.card).frame(width: 51, height: 51)
                .overlay(
                    Image(systemName: "star.circle.fill").font(.system(size: 26))
                        .symbolRenderingMode(.palette).foregroundStyle(Color.black, LUI.accent)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isOn.wrappedValue ? "Afficher tout" : "Afficher les favoris")
    )
}

private struct PickerCounters: View {
    let total: Int
    let shown: Int
    let favorites: Int
    let owned: Int

    var body: some View {
        HStack(spacing: 0) {
            item(total, "Total", LUI.secondary)
            item(shown, "Affichés", EvalColors.text)
            item(favorites, "Favoris", LUI.gold)
            item(owned, "Possédés", LUI.green)
        }
        .padding(.vertical, 8)
        .background(LUI.card, in: .capsule)
        .padding(.horizontal, 18)
    }

    private func item(_ value: Int, _ label: String, _ color: Color) -> some View {
        VStack(spacing: 1) {
            Text("\(value)").font(.system(size: 20, weight: .semibold).monospacedDigit()).foregroundStyle(color)
            Text(label).font(.system(size: 14)).foregroundStyle(LUI.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct FilterField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
            TextField("Filtrer", text: $text).autocorrectionDisabled()
            if !text.isEmpty {
                Button { text = "" } label: { Image(systemName: "xmark.circle.fill") }.buttonStyle(.plain)
            }
        }
        .foregroundStyle(LUI.secondary)
        .padding(.horizontal, 16)
        .frame(height: 46)
        .background(LUI.card, in: .capsule)
    }
}

private struct FavoriteMenu: ViewModifier {
    @Environment(AppModel.self) private var model
    let itemID: String
    let isFavorite: Bool

    func body(content: Content) -> some View {
        content.contextMenu {
            Button(isFavorite ? "Retirer des favoris" : "Ajouter aux favoris", systemImage: isFavorite ? "star.slash" : "star") {
                Task { await model.valorant.favorites.toggle(itemID, session: model.valorant.riot) }
            }
        }
    }
}

struct EvalWeaponLoadoutView: View {
    @Environment(AppModel.self) private var model
    private var loadout: RiotLoadoutModel { model.valorant.loadout }

    var body: some View {
        LoadoutScreen(title: "Armes") {
            if loadout.isLoading && loadout.raw == nil { ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 60) }
            if !loadout.isLoading && loadout.guns.isEmpty {
                ContentUnavailableView("Équipement indisponible", systemImage: "scope",
                                       description: Text(model.valorant.riot.isLinked ? (loadout.message ?? "Riot n’a renvoyé aucune arme équipée.") : "Connectez votre compte Riot dans Paramètres."))
                    .padding(.top, 40)
            }
            ForEach(loadout.catalog.weapons.filter { loadout.gun($0.uuid) != nil }) { weapon in
                let gun = loadout.gun(weapon.uuid)
                let chroma = loadout.chroma(gun?["ChromaID"]?.stringValue)
                let skin = loadout.skin(gun?["SkinID"]?.stringValue)
                VStack(alignment: .leading, spacing: 10) {
                    Text(weapon.displayName).font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.secondary).padding(.leading, 20)
                    NavigationLink { EvalSkinPickerView(weapon: weapon) } label: {
                        HStack(spacing: 8) {
                            Group {
                                if let level = gun?["CharmLevelID"]?.stringValue, !level.isEmpty {
                                    remote("https://media.valorant-api.com/buddylevels/\(level.lowercased())/displayicon.png")
                                } else {
                                    Color.clear
                                }
                            }
                            .frame(width: 53, height: 64)
                            remote(chroma?.fullRender ?? skin?.image).frame(height: 85).frame(maxWidth: .infinity)
                            Image(systemName: "chevron.right").font(.system(size: 17, weight: .semibold)).foregroundStyle(LUI.secondary)
                                .frame(width: 53, alignment: .trailing)
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 20)
                        .background(LUI.card, in: .rect(cornerRadius: 30))
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(weapon.displayName), \(skin?.displayName ?? "")")
                }
            }
        }
        .task { await model.valorant.loadout.load(model.valorant.riot) }
    }
}

struct EvalSkinPickerView: View {
    @Environment(AppModel.self) private var model
    let weapon: LoadoutCatalog.Weapon
    @State private var query = ""
    @State private var selected: LoadoutCatalog.Skin?

    var body: some View {
        let loadout = model.valorant.loadout
        let favorites = Set(model.valorant.favorites.current.values)
        let equipped = loadout.gun(weapon.uuid)?["SkinID"]?.stringValue?.lowercased()
        let skins = loadout.ownedSkins(weapon).filter { query.isEmpty || $0.displayName.localizedCaseInsensitiveContains(query) }
        LoadoutScreen(title: weapon.displayName) {
            FilterField(text: $query)
            VStack(spacing: 0) {
                ForEach(Array(skins.enumerated()), id: \.element.id) { index, skin in
                    Button { selected = skin } label: {
                        VStack(alignment: .leading, spacing: 10) {
                            remote(skin.image).frame(height: 64).frame(maxWidth: .infinity)
                            HStack(spacing: 10) {
                                Text(skin.displayName).font(.system(size: 20)).foregroundStyle(EvalColors.text).multilineTextAlignment(.leading)
                                Spacer(minLength: 8)
                                if isFavorite(skin, favorites) { favoriteBadge() }
                                if skin.uuid.lowercased() == equipped { selectedBadge() }
                            }
                        }
                        .padding(20)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    if index < skins.count - 1 { rowDivider(20) }
                }
            }
            .background(LUI.card, in: .rect(cornerRadius: 28))
        }
        .sheet(item: $selected) { skin in EvalSkinEquipSheet(weapon: weapon, skin: skin).presentationDetents([.large]) }
        .task { await model.valorant.favorites.load(model.valorant.riot) }
    }

    private func isFavorite(_ skin: LoadoutCatalog.Skin, _ favorites: Set<String>) -> Bool {
        if favorites.contains(skin.uuid.lowercased()) { return true }
        if skin.levels.contains(where: { favorites.contains($0.uuid.lowercased()) }) { return true }
        return skin.chromas.contains { favorites.contains($0.uuid.lowercased()) }
    }
}

struct EvalSkinEquipSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let weapon: LoadoutCatalog.Weapon
    let skin: LoadoutCatalog.Skin
    @State private var chroma: LoadoutCatalog.Chroma?
    @State private var level: LoadoutCatalog.Level?
    @State private var buddy: RiotLoadoutModel.BuddyInstance?
    @State private var buddyChosen = false

    var body: some View {
        let loadout = model.valorant.loadout
        let chromas = loadout.ownedChromas(skin)
        let levels = loadout.ownedLevels(skin)
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    remote((chroma ?? chromas.first)?.fullRender ?? skin.image).frame(height: 110).frame(maxWidth: .infinity)
                        .padding(20).background(LUI.card, in: .rect(cornerRadius: 22))
                    if chromas.count > 1 {
                        Text("Variante").font(.headline).foregroundStyle(LUI.secondary)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(chromas, id: \.uuid) { c in
                                    remote(c.swatch ?? c.displayIcon).frame(width: 51, height: 51).clipShape(Circle())
                                        .overlay(Circle().strokeBorder(.white, lineWidth: (chroma ?? chromas.first) == c ? 2 : 0))
                                        .onTapGesture { chroma = c }
                                }
                            }
                        }
                    }
                    if levels.count > 1 {
                        Text("Niveau").font(.headline).foregroundStyle(LUI.secondary)
                        Picker("Niveau", selection: Binding(get: { (level ?? levels.last)?.uuid ?? "" }, set: { id in level = levels.first { $0.uuid == id } })) {
                            ForEach(Array(levels.enumerated()), id: \.element.uuid) { i, l in Text("Niveau \(i + 1)").tag(l.uuid) }
                        }
                        .pickerStyle(.segmented)
                    }
                    Text("Porte-bonheur").font(.headline).foregroundStyle(LUI.secondary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            buddyCell(nil, current: currentBuddy(loadout))
                            ForEach(loadout.freeBuddies(except: weapon.uuid), id: \.instanceID) { b in buddyCell(b, current: currentBuddy(loadout)) }
                        }
                    }
                    if let message = loadout.message, !loadout.isSaving {
                        Text(message).font(.footnote).foregroundStyle(LUI.secondary)
                    }
                }
                .padding(16)
            }
            .background(EvalColors.background.ignoresSafeArea())
            .navigationTitle(skin.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(loadout.isSaving ? "Application…" : "Équiper") {
                        guard let c = chroma ?? chromas.first, let l = level ?? levels.last else { return }
                        loadout.equip(weaponID: weapon.uuid, skin: skin, level: l, chroma: c, buddy: currentBuddy(loadout))
                        Task {
                            if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() }
                            dismiss()
                        }
                    }
                    .disabled(loadout.isSaving || loadout.raw == nil)
                }
            }
        }
    }

    private func currentBuddy(_ loadout: RiotLoadoutModel) -> RiotLoadoutModel.BuddyInstance? {
        if buddyChosen { return buddy }
        guard let id = loadout.gun(weapon.uuid)?["CharmInstanceID"]?.stringValue else { return nil }
        return loadout.ownedBuddies.first { $0.instanceID == id }
    }

    private func buddyCell(_ b: RiotLoadoutModel.BuddyInstance?, current: RiotLoadoutModel.BuddyInstance?) -> some View {
        let selected = b?.instanceID == current?.instanceID
        return Group {
            if let b {
                remote("https://media.valorant-api.com/buddylevels/\(b.levelID)/displayicon.png").padding(8)
            } else {
                Image(systemName: "nosign").font(.system(size: 25)).foregroundStyle(LUI.secondary)
            }
        }
        .frame(width: 69, height: 69)
        .background(LUI.card, in: .rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(LUI.accent, lineWidth: selected ? 2 : 0))
        .onTapGesture { buddy = b; buddyChosen = true }
    }
}

struct EvalTitlePickerView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var favoritesOnly = false

    private static let noTitle = "d13e579c-435e-44d4-cec2-6eae5a3c5ed4"

    var body: some View {
        let loadout = model.valorant.loadout
        let favorites = Set(model.valorant.favorites.current.values)
        let current = loadout.raw?["Identity"]?["PlayerTitleID"]?.stringValue?.lowercased()
        let owned = favoritesFirst(loadout.catalog.titles.filter { loadout.ownedTitles.contains($0.uuid.lowercased()) },
                                   favorites: favorites, id: { $0.uuid }, name: { $0.titleText ?? "" })
        let shown = owned.filter {
            (!favoritesOnly || favorites.contains($0.uuid.lowercased())) && (query.isEmpty || ($0.titleText ?? "").localizedCaseInsensitiveContains(query))
        }
        let showNone = !favoritesOnly && query.isEmpty
        LoadoutScreen(title: "Choisir un titre", trailing: favoritesOnlyButton($favoritesOnly)) {
            PickerCounters(total: loadout.catalog.titles.count, shown: shown.count,
                           favorites: owned.filter { favorites.contains($0.uuid.lowercased()) }.count, owned: owned.count)
            FilterField(text: $query)
            if loadout.isLoading && owned.isEmpty {
                ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 40)
            } else if !model.valorant.riot.isLinked {
                Text("Connectez votre compte Riot dans Paramètres.").font(.system(size: 17)).foregroundStyle(LUI.secondary).padding(.horizontal, 4)
            } else if showNone || !shown.isEmpty {
                LazyVStack(spacing: 0) {
                    if showNone {
                        row(text: "Aucun titre", id: Self.noTitle, selected: current == nil || current == Self.noTitle, muted: true, favorite: false)
                        if !shown.isEmpty { rowDivider(22) }
                    }
                    ForEach(Array(shown.enumerated()), id: \.element.id) { index, title in
                        let favorite = favorites.contains(title.uuid.lowercased())
                        row(text: title.titleText ?? "", id: title.uuid, selected: title.uuid.lowercased() == current, muted: false, favorite: favorite)
                            .modifier(FavoriteMenu(itemID: title.uuid, isFavorite: favorite))
                        if index < shown.count - 1 { rowDivider(22) }
                    }
                }
                .background(LUI.card, in: .rect(cornerRadius: 28))
                .padding(.top, 12)
            } else {
                Text(favoritesOnly ? "Aucun titre favori." : "Aucun titre trouvé.").font(.system(size: 17)).foregroundStyle(LUI.secondary).frame(maxWidth: .infinity).padding(.top, 30)
            }
            if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary).padding(.horizontal, 4) }
        }
        .task {
            await loadout.load(model.valorant.riot)
            await model.valorant.favorites.load(model.valorant.riot)
        }
    }

    private func row(text: String, id: String, selected: Bool, muted: Bool, favorite: Bool) -> some View {
        let loadout = model.valorant.loadout
        return Button {
            guard !selected else { return }
            loadout.setIdentity("PlayerTitleID", .string(id))
            Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
        } label: {
            HStack(spacing: 10) {
                Text(text).font(.system(size: 20)).foregroundStyle(muted ? LUI.secondary : EvalColors.text).multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if favorite { favoriteBadge() }
                if selected { selectedBadge() }
            }
            .padding(.horizontal, 22)
            .frame(minHeight: 52)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .disabled(loadout.isSaving)
    }
}

struct EvalCardPickerView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var favoritesOnly = false

    var body: some View {
        let loadout = model.valorant.loadout
        let favorites = Set(model.valorant.favorites.current.values)
        let current = loadout.raw?["Identity"]?["PlayerCardID"]?.stringValue?.lowercased()
        let owned = favoritesFirst(loadout.catalog.cards.filter { loadout.ownedCards.contains($0.uuid.lowercased()) },
                                   favorites: favorites, id: { $0.uuid }, name: { $0.displayName })
        let shown = owned.filter {
            (!favoritesOnly || favorites.contains($0.uuid.lowercased())) && (query.isEmpty || $0.displayName.localizedCaseInsensitiveContains(query))
        }
        LoadoutScreen(title: "Choisir une carte", trailing: favoritesOnlyButton($favoritesOnly)) {
            PickerCounters(total: loadout.catalog.cards.count, shown: shown.count,
                           favorites: owned.filter { favorites.contains($0.uuid.lowercased()) }.count, owned: owned.count)
            FilterField(text: $query)
            if loadout.isLoading && owned.isEmpty {
                ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 40)
            } else if !model.valorant.riot.isLinked {
                Text("Connectez votre compte Riot dans Paramètres.").font(.system(size: 17)).foregroundStyle(LUI.secondary).padding(.horizontal, 4)
            } else if shown.isEmpty {
                Text(favoritesOnly ? "Aucune carte favorite." : "Aucune carte trouvée.").font(.system(size: 17)).foregroundStyle(LUI.secondary).frame(maxWidth: .infinity).padding(.top, 30)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(Array(shown.enumerated()), id: \.element.id) { index, card in
                        let favorite = favorites.contains(card.uuid.lowercased())
                        row(card, selected: card.uuid.lowercased() == current, favorite: favorite)
                            .modifier(FavoriteMenu(itemID: card.uuid, isFavorite: favorite))
                        if index < shown.count - 1 { rowDivider(82) }
                    }
                }
                .background(LUI.card, in: .rect(cornerRadius: 28))
                .padding(.top, 12)
            }
            if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary).padding(.horizontal, 4) }
        }
        .task {
            await loadout.load(model.valorant.riot)
            await model.valorant.favorites.load(model.valorant.riot)
        }
    }

    private func row(_ card: LoadoutCatalog.Card, selected: Bool, favorite: Bool) -> some View {
        let loadout = model.valorant.loadout
        return Button {
            guard !selected else { return }
            loadout.setIdentity("PlayerCardID", .string(card.uuid))
            Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
        } label: {
            HStack(spacing: 14) {
                AsyncImage(url: card.smallArt.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFill() }
                    .frame(width: 48, height: 48)
                    .background(LUI.card2)
                    .clipShape(.rect(cornerRadius: 3))
                Text(card.displayName).font(.system(size: 19)).foregroundStyle(EvalColors.text).multilineTextAlignment(.leading)
                Spacer(minLength: 8)
                if selected { selectedBadge() }
                if favorite { favoriteBadge() }
            }
            .padding(.horizontal, 20)
            .frame(minHeight: 78)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .disabled(loadout.isSaving)
    }
}

struct EvalSprayLoadoutView: View {
    @Environment(AppModel.self) private var model
    @State private var slot: Int?

    private let slotNames = ["Haut", "Gauche", "Droite", "Bas"]
    private let offsets = [CGSize(width: 0, height: -96), CGSize(width: -96, height: 0), CGSize(width: 96, height: 0), CGSize(width: 0, height: 96)]

    var body: some View {
        let loadout = model.valorant.loadout
        let sprays = loadout.sprays
        LoadoutScreen(title: "Expressions") {
            if loadout.isLoading && loadout.raw == nil {
                ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 60)
            } else if sprays.isEmpty {
                ContentUnavailableView("Expressions indisponibles", systemImage: "circle.grid.cross",
                                       description: Text(model.valorant.riot.isLinked ? (loadout.message ?? "Riot n’a renvoyé aucune expression équipée.") : "Connectez votre compte Riot dans Paramètres."))
                    .padding(.top, 40)
            } else {
                wheel(loadout, sprays)
                VStack(spacing: 0) {
                    ForEach(sprays.indices, id: \.self) { i in
                        let spray = loadout.spray(sprays[i]["SprayID"]?.stringValue)
                        Button { slot = i } label: {
                            HStack(spacing: 14) {
                                remote(spray?.fullTransparentIcon ?? spray?.displayIcon).frame(width: 52, height: 52)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(i < slotNames.count ? slotNames[i] : "Emplacement \(i + 1)").font(.system(size: 15)).foregroundStyle(LUI.secondary)
                                    Text(spray?.displayName ?? "Aucune").font(.system(size: 19)).foregroundStyle(EvalColors.text).lineLimit(1)
                                }
                                Spacer(minLength: 8)
                                Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold)).foregroundStyle(LUI.secondary)
                            }
                            .padding(.horizontal, 20)
                            .frame(minHeight: 72)
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        .disabled(loadout.isSaving)
                        if i < sprays.count - 1 { rowDivider(86) }
                    }
                }
                .background(LUI.card, in: .rect(cornerRadius: 28))
                if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary).padding(.horizontal, 4) }
            }
        }
        .sheet(item: Binding(get: { slot.map(SlotID.init) }, set: { slot = $0?.value })) { s in
            EvalSprayPickerSheet(slot: s.value, slotName: s.value < slotNames.count ? slotNames[s.value] : "Emplacement \(s.value + 1)")
        }
        .task {
            await loadout.load(model.valorant.riot)
            await model.valorant.favorites.load(model.valorant.riot)
        }
    }

    private func wheel(_ loadout: RiotLoadoutModel, _ sprays: [JSONValue]) -> some View {
        ZStack {
            Circle().fill(LUI.card2)
                .overlay(Circle().strokeBorder(EvalColors.text.opacity(0.55), lineWidth: 2).padding(10))
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                Path { path in
                    path.move(to: CGPoint(x: w * 0.1, y: h * 0.1))
                    path.addLine(to: CGPoint(x: w * 0.9, y: h * 0.9))
                    path.move(to: CGPoint(x: w * 0.9, y: h * 0.1))
                    path.addLine(to: CGPoint(x: w * 0.1, y: h * 0.9))
                }
                .stroke(EvalColors.background, lineWidth: 8)
            }
            Circle().fill(EvalColors.background).frame(width: 104, height: 104)
                .overlay(Circle().strokeBorder(EvalColors.text.opacity(0.55), lineWidth: 2).padding(8))
            ForEach(0..<min(4, sprays.count), id: \.self) { i in
                let spray = loadout.spray(sprays[i]["SprayID"]?.stringValue)
                Button { slot = i } label: {
                    Group {
                        if let spray {
                            remote(spray.fullTransparentIcon ?? spray.displayIcon)
                        } else {
                            Image(systemName: "plus").font(.system(size: 22, weight: .light)).foregroundStyle(EvalColors.text.opacity(0.25))
                        }
                    }
                    .frame(width: 80, height: 80)
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .disabled(loadout.isSaving)
                .accessibilityLabel("\(slotNames[i]) : \(spray?.displayName ?? "Aucune")")
                .offset(offsets[i])
            }
        }
        .frame(width: 320, height: 320)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
    }

    private struct SlotID: Identifiable { let value: Int; var id: Int { value } }
}

private struct EvalSprayPickerSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let slot: Int
    let slotName: String
    @State private var query = ""

    var body: some View {
        let loadout = model.valorant.loadout
        let favorites = Set(model.valorant.favorites.current.values)
        let current = loadout.sprays.indices.contains(slot) ? loadout.sprays[slot]["SprayID"]?.stringValue?.lowercased() : nil
        let owned = favoritesFirst(loadout.catalog.sprays.filter { loadout.ownedSprays.contains($0.uuid.lowercased()) },
                                   favorites: favorites, id: { $0.uuid }, name: { $0.displayName })
        let shown = owned.filter { query.isEmpty || $0.displayName.localizedCaseInsensitiveContains(query) }
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    FilterField(text: $query)
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
                        ForEach(shown) { spray in
                            let favorite = favorites.contains(spray.uuid.lowercased())
                            let selected = spray.uuid.lowercased() == current
                            Button {
                                guard !selected else { dismiss(); return }
                                loadout.setSpray(slot: slot, sprayID: spray.uuid)
                                dismiss()
                                Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
                            } label: {
                                VStack(spacing: 6) {
                                    remote(spray.fullTransparentIcon ?? spray.displayIcon).frame(height: 76)
                                    Text(spray.displayName).font(.system(size: 12)).foregroundStyle(EvalColors.text)
                                        .lineLimit(2).multilineTextAlignment(.center).frame(height: 30, alignment: .top)
                                }
                                .padding(8)
                                .frame(maxWidth: .infinity)
                                .background(LUI.card, in: .rect(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(LUI.accent, lineWidth: selected ? 2 : 0))
                                .overlay(alignment: .topTrailing) { if favorite { favoriteBadge().padding(6) } }
                                .contentShape(.rect)
                            }
                            .buttonStyle(.plain)
                            .disabled(loadout.isSaving)
                            .modifier(FavoriteMenu(itemID: spray.uuid, isFavorite: favorite))
                        }
                    }
                }
                .padding(16)
            }
            .background(EvalColors.background.ignoresSafeArea())
            .navigationTitle("Expression · \(slotName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } } }
        }
    }
}

struct EvalPrivacySettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let loadout = model.valorant.loadout
        let identity = loadout.raw?["Identity"]?.objectValue ?? [:]
        let rankKey = identity.keys.sorted().first { $0.localizedCaseInsensitiveContains("rank") && identity[$0]?.boolValue != nil }
        LoadoutScreen(title: "Confidentialité") {
            if loadout.isLoading && loadout.raw == nil {
                ProgressView().tint(.white).frame(maxWidth: .infinity).padding(.top, 60)
            } else if loadout.raw == nil {
                ContentUnavailableView("Paramètres indisponibles", systemImage: "hand.raised",
                                       description: Text(model.valorant.riot.isLinked ? (loadout.message ?? "Riot n’a renvoyé aucun équipement.") : "Connectez votre compte Riot dans Paramètres."))
                    .padding(.top, 40)
            } else {
                VStack(spacing: 0) {
                    toggle("Incognito", "Masque votre nom aux joueurs en dehors de votre groupe.",
                           value: loadout.raw?["Incognito"]?.boolValue ?? false) { loadout.setIncognito($0) }
                    rowDivider(18)
                    toggle("Masquer le niveau de compte", "Masque votre niveau de compte aux autres joueurs.",
                           value: identity["HideAccountLevel"]?.boolValue ?? false) { loadout.setIdentity("HideAccountLevel", .bool($0)) }
                    if let rankKey {
                        rowDivider(18)
                        toggle("Masquer le rang de l’acte précédent", "Masque votre rang de l’acte précédent sur votre carte de joueur.",
                               value: identity[rankKey]?.boolValue ?? false) { loadout.setIdentity(rankKey, .bool($0)) }
                    }
                }
                .background(LUI.card, in: .rect(cornerRadius: 22))
                if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary).padding(.horizontal, 4) }
            }
        }
        .task { await loadout.load(model.valorant.riot) }
    }

    private func toggle(_ title: String, _ subtitle: String, value: Bool, set: @escaping (Bool) -> Void) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 20)).foregroundStyle(EvalColors.text).lineLimit(1)
                Text(subtitle).font(.system(size: 16)).foregroundStyle(LUI.secondary).lineLimit(1)
            }
            Spacer(minLength: 8)
            Toggle(title, isOn: Binding(get: { value }, set: { v in
                set(v)
                Task { _ = await model.valorant.loadout.save(model.valorant.riot) }
            }))
            .labelsHidden()
            .tint(LUI.accent)
            .disabled(model.valorant.loadout.isSaving)
        }
        .padding(.horizontal, 18)
        .frame(minHeight: 74)
    }
}

struct EvalAppearanceProfilesView: View {
    @Environment(AppModel.self) private var model
    @State private var naming = false
    @State private var name = ""
    @State private var toApply: RiotLoadoutModel.AppearanceProfile?
    @State private var editing = false

    var body: some View {
        let loadout = model.valorant.loadout
        let pinned = loadout.profiles.filter { $0.pinned == true }
        let others = loadout.profiles.filter { $0.pinned != true }
        LoadoutScreen(title: "Profils d'apparences", trailing: AnyView(HStack(spacing: 10) {
            Button { toApply = loadout.profiles.randomElement() } label: {
                Circle().fill(LUI.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: "dice").font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.accent))
            }
            .buttonStyle(.plain)
            .disabled(loadout.profiles.isEmpty)
            .accessibilityLabel("Surprenez-moi")
            Button { withAnimation { editing.toggle() } } label: {
                Circle().fill(LUI.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: editing ? "checkmark" : "pencil").font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.accent))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(editing ? "Terminé" : "Modifier")
        })) {
            if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary) }
            if !pinned.isEmpty { section("Épinglé", pinned) }
            if !others.isEmpty { section("Préréglages", others) }
            if loadout.profiles.isEmpty {
                Text("Enregistrez votre équipement complet (skins, porte-bonheur, sprays, carte, titre) et réappliquez-le en un toucher.")
                    .font(.system(size: 17)).foregroundStyle(LUI.secondary)
            }
            Button { name = ""; naming = true } label: {
                HStack(spacing: 18) {
                    Image(systemName: "plus").font(.system(size: 24, weight: .regular))
                    Text("Enregistrer l’équipement actuel").font(.system(size: 21))
                    Spacer()
                }
                .foregroundStyle(LUI.accent)
                .padding(.horizontal, 22)
                .frame(height: 64)
                .background(LUI.card, in: .capsule)
            }
            .buttonStyle(.plain)
            .disabled(loadout.raw == nil)
            .padding(.top, 6)
        }
        .task { await loadout.load(model.valorant.riot) }
        .alert("Nommer le profil", isPresented: $naming) {
            TextField("Titre", text: $name)
            Button("Annuler", role: .cancel) {}
            Button("Sauvegarder") { loadout.saveProfile(name: name.isEmpty ? "Profil" : name) }
        }
        .confirmationDialog("Appliquer « \(toApply?.name ?? "") » ?", isPresented: Binding(get: { toApply != nil }, set: { if !$0 { toApply = nil } }), titleVisibility: .visible) {
            Button("Appliquer") {
                guard let p = toApply else { return }
                Task { if await loadout.applyProfile(p, session: model.valorant.riot) { await model.valorant.refreshRiot() } }
            }
        } message: {
            Text("Votre équipement actuel sera remplacé.")
        }
    }

    private func section(_ title: String, _ list: [RiotLoadoutModel.AppearanceProfile]) -> some View {
        let loadout = model.valorant.loadout
        return VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.secondary).padding(.leading, 20)
            VStack(spacing: 0) {
                ForEach(Array(list.enumerated()), id: \.element.id) { index, profile in
                    HStack(spacing: 14) {
                        if editing {
                            Button { loadout.deleteProfile(profile) } label: {
                                Image(systemName: "minus.circle.fill").font(.system(size: 22)).foregroundStyle(Color(hex: 0xFF3B30))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Supprimer")
                        }
                        Button { if !editing { toApply = profile } } label: {
                            HStack(spacing: 14) {
                                AsyncImage(url: profile.cardURL) { $0.image?.resizable().scaledToFill() }
                                    .frame(width: 44, height: 44)
                                    .background(LUI.card2)
                                    .clipShape(.rect(cornerRadius: 9))
                                VStack(alignment: .leading, spacing: 3) {
                                    HStack(spacing: 6) {
                                        Text(profile.name).font(.system(size: 19)).foregroundStyle(EvalColors.text)
                                        if profile.pinned == true {
                                            Image(systemName: "pin.fill").font(.system(size: 13)).foregroundStyle(LUI.gold)
                                        }
                                    }
                                    Text(profile.summary).font(.system(size: 15)).foregroundStyle(LUI.secondary).lineLimit(1)
                                }
                                Spacer()
                                if editing {
                                    Button { loadout.togglePin(profile) } label: {
                                        Image(systemName: profile.pinned == true ? "pin.slash" : "pin").font(.system(size: 18)).foregroundStyle(LUI.accent)
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityLabel(profile.pinned == true ? "Désépingler" : "Épingler")
                                } else {
                                    Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold)).foregroundStyle(LUI.secondary)
                                }
                            }
                            .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        .disabled(loadout.isSaving)
                    }
                    .padding(.horizontal, 20)
                    .frame(minHeight: 78)
                    if index < list.count - 1 { rowDivider(78) }
                }
            }
            .background(LUI.card, in: .rect(cornerRadius: 26))
        }
    }
}
