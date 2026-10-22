import SwiftUI

// Équipement VALORANT depuis le téléphone (comme VALPAW) : lecture de la collection possédée
// (entitlements) et écriture de l'équipement complet (PUT playerloadout) sur le compte Riot
// connecté. L'objet renvoyé à Riot est l'équipement reçu, modifié champ par champ, pour ne
// perdre aucune donnée inconnue de l'app. API non officielle.

// MARK: - Catalogue valorant-api

struct LoadoutCatalog: Codable {
    struct Level: Codable, Hashable { let uuid: String; let displayName: String?; let levelItem: String? }
    struct Chroma: Codable, Hashable { let uuid: String; let displayName: String?; let fullRender: String?; let displayIcon: String?; let swatch: String? }
    struct Skin: Codable, Hashable, Identifiable {
        let uuid: String; let displayName: String; let displayIcon: String?; let levels: [Level]; let chromas: [Chroma]
        var id: String { uuid }
        var image: String? { displayIcon ?? chromas.first?.fullRender ?? chromas.first?.displayIcon }
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

// MARK: - Modèle

@MainActor
@Observable
final class RiotLoadoutModel {
    struct BuddyInstance: Hashable { let levelID: String; let instanceID: String }

    struct AppearanceProfile: Codable, Identifiable, Hashable {
        let id: UUID
        var name: String
        let loadout: JSONValue
        let createdAt: Date
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

    func load(_ session: RiotSession) async {
        guard let puuid = session.credentials?.puuid, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }
        catalog = await LoadoutCatalog.load()
        do {
            raw = try await session.game("/personalization/v2/players/\(puuid)/playerloadout")
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

    // MARK: Lecture

    var guns: [JSONValue] { raw?["Guns"]?.arrayValue ?? [] }

    func gun(_ weaponID: String) -> JSONValue? {
        guns.first { $0["ID"]?.stringValue?.lowercased() == weaponID.lowercased() }
    }

    /// Skins possédés d'une arme (le skin par défaut l'est toujours).
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

    /// Porte-bonheur possédés et pas déjà accrochés à une autre arme.
    func freeBuddies(except weaponID: String) -> [BuddyInstance] {
        let used = Set(guns.filter { $0["ID"]?.stringValue?.lowercased() != weaponID.lowercased() }.compactMap { $0["CharmInstanceID"]?.stringValue })
        var seen = Set<String>()
        return ownedBuddies.filter { !used.contains($0.instanceID) && seen.insert($0.levelID).inserted }
    }

    // MARK: Écriture

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

    /// Un skin possédé au hasard (variante de base, niveau maximal possédé) sur chaque arme.
    func randomize() {
        for weapon in catalog.weapons {
            let skins = ownedSkins(weapon)
            guard let skin = skins.randomElement(), let level = ownedLevels(skin).last, let chroma = skin.chromas.first,
                  let current = gun(weapon.uuid) else { continue }
            let charm = current["CharmInstanceID"]?.stringValue.flatMap { id in ownedBuddies.first { $0.instanceID == id } }
            equip(weaponID: weapon.uuid, skin: skin, level: level, chroma: chroma, buddy: charm)
        }
    }

    /// Envoie l'équipement complet à Riot.
    func save(_ session: RiotSession) async -> Bool {
        guard let puuid = session.credentials?.puuid, let raw, let body = RiotSession.json(raw) else { return false }
        isSaving = true
        defer { isSaving = false }
        do {
            self.raw = try await session.game("/personalization/v2/players/\(puuid)/playerloadout", method: "PUT", body: body)
            message = "Équipement mis à jour."
            return true
        } catch {
            message = "Échec : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
            await load(session)
            return false
        }
    }

    // MARK: Profils d'apparence

    func saveProfile(name: String) {
        guard let raw else { return }
        profiles.insert(AppearanceProfile(id: UUID(), name: name, loadout: raw, createdAt: Date()), at: 0)
        persistProfiles()
    }

    func applyProfile(_ profile: AppearanceProfile, session: RiotSession) async -> Bool {
        // On garde Subject / Version du compte actuel : seul le contenu du profil est repris.
        guard var current = raw?.objectValue, let saved = profile.loadout.objectValue else { return false }
        for key in ["Guns", "Sprays", "Identity", "Incognito"] { if let v = saved[key] { current[key] = v } }
        raw = .object(current)
        return await save(session)
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

    /// Résumé texte de l'équipement (bouton Partager).
    var shareText: String {
        catalog.weapons.compactMap { w -> String? in
            guard let g = gun(w.uuid), let s = skin(g["SkinID"]?.stringValue) else { return nil }
            return "\(w.displayName) : \(s.displayName)"
        }
        .joined(separator: "\n")
    }
}

// MARK: - Écrans

private enum LUI {
    static let card = EvalColors.card
    static let secondary = Color(hex: 0x8E8E93)
    static let accent = EvalAccent.color
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
                VStack(alignment: .leading, spacing: 8) {
                    Text(weapon.displayName).font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.secondary).padding(.leading, 4)
                    NavigationLink { EvalSkinPickerView(weapon: weapon) } label: {
                        HStack {
                            if let level = gun?["CharmLevelID"]?.stringValue {
                                remote("https://media.valorant-api.com/buddylevels/\(level.lowercased())/displayicon.png").frame(width: 53, height: 53)
                            }
                            remote(chroma?.fullRender ?? skin?.image).frame(height: 80).frame(maxWidth: .infinity)
                            Image(systemName: "chevron.right").foregroundStyle(LUI.secondary)
                        }
                        .padding(20)
                        .background(LUI.card, in: .rect(cornerRadius: 22))
                    }
                    .buttonStyle(.plain)
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
        let equipped = loadout.gun(weapon.uuid)?["SkinID"]?.stringValue?.lowercased()
        LoadoutScreen(title: weapon.displayName) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                TextField("Recherche", text: $query)
            }
            .foregroundStyle(LUI.secondary)
            .padding(.horizontal, 16).frame(height: 50)
            .background(LUI.card, in: .capsule)
            VStack(spacing: 0) {
                ForEach(loadout.ownedSkins(weapon).filter { query.isEmpty || $0.displayName.localizedCaseInsensitiveContains(query) }) { skin in
                    Button { selected = skin } label: {
                        VStack(alignment: .leading, spacing: 10) {
                            remote(skin.image).frame(height: 64).frame(maxWidth: .infinity)
                            HStack {
                                Text(skin.displayName).font(.system(size: 21)).foregroundStyle(EvalColors.text)
                                Spacer()
                                if skin.uuid.lowercased() == equipped { Image(systemName: "checkmark.circle.fill").foregroundStyle(LUI.accent) }
                            }
                        }
                        .padding(18)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 18)
                }
            }
            .background(LUI.card, in: .rect(cornerRadius: 22))
        }
        .sheet(item: $selected) { skin in EvalSkinEquipSheet(weapon: weapon, skin: skin).presentationDetents([.large]) }
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
                }
                .padding(16)
            }
            .background(EvalColors.background.ignoresSafeArea())
            .navigationTitle(skin.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Équiper") {
                        guard let c = chroma ?? chromas.first, let l = level ?? levels.last else { return }
                        loadout.equip(weaponID: weapon.uuid, skin: skin, level: l, chroma: c, buddy: currentBuddy(loadout))
                        Task {
                            if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() }
                            dismiss()
                        }
                    }
                    .disabled(loadout.isSaving)
                }
            }
        }
    }

    /// Porte-bonheur actuellement sur l'arme, sauf si l'utilisateur en a choisi un autre.
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

    var body: some View {
        let loadout = model.valorant.loadout
        let current = loadout.raw?["Identity"]?["PlayerTitleID"]?.stringValue?.lowercased()
        LoadoutScreen(title: "Changer de titre") {
            HStack(spacing: 10) { Image(systemName: "magnifyingglass"); TextField("Recherche", text: $query) }
                .foregroundStyle(LUI.secondary).padding(.horizontal, 16).frame(height: 50).background(LUI.card, in: .capsule)
            VStack(spacing: 0) {
                ForEach(loadout.catalog.titles.filter { loadout.ownedTitles.contains($0.uuid.lowercased()) && (query.isEmpty || ($0.titleText ?? "").localizedCaseInsensitiveContains(query)) }) { title in
                    Button {
                        loadout.setIdentity("PlayerTitleID", .string(title.uuid))
                        Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
                    } label: {
                        HStack {
                            Text(title.titleText ?? "").font(.system(size: 20)).foregroundStyle(EvalColors.text)
                            Spacer()
                            if title.uuid.lowercased() == current { Image(systemName: "checkmark").foregroundStyle(LUI.accent) }
                        }
                        .padding(18).contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 18)
                }
            }
            .background(LUI.card, in: .rect(cornerRadius: 22))
        }
        .task { await loadout.load(model.valorant.riot) }
    }
}

struct EvalCardPickerView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let loadout = model.valorant.loadout
        let current = loadout.raw?["Identity"]?["PlayerCardID"]?.stringValue?.lowercased()
        LoadoutScreen(title: "Carte de joueur") {
            LazyVStack(spacing: 12) {
                ForEach(loadout.catalog.cards.filter { loadout.ownedCards.contains($0.uuid.lowercased()) }) { card in
                    Button {
                        loadout.setIdentity("PlayerCardID", .string(card.uuid))
                        Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
                    } label: {
                        AsyncImage(url: card.wideArt.flatMap(URL.init(string:))) { $0.image?.resizable().scaledToFill() }
                            .frame(height: 90).frame(maxWidth: .infinity).clipped()
                            .clipShape(.rect(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(LUI.accent, lineWidth: card.uuid.lowercased() == current ? 3 : 0))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .task { await loadout.load(model.valorant.riot) }
    }
}

struct EvalSprayLoadoutView: View {
    @Environment(AppModel.self) private var model
    @State private var slot: Int?

    private let slotNames = ["Haut", "Droite", "Bas", "Gauche"]

    var body: some View {
        let loadout = model.valorant.loadout
        let sprays = loadout.raw?["Sprays"]?.arrayValue ?? []
        LoadoutScreen(title: "Roue des sprays") {
            VStack(spacing: 0) {
                ForEach(sprays.indices, id: \.self) { i in
                    let id = sprays[i]["SprayID"]?.stringValue?.lowercased()
                    let spray = loadout.catalog.sprays.first { $0.uuid.lowercased() == id }
                    Button { slot = i } label: {
                        HStack(spacing: 14) {
                            remote(spray?.fullTransparentIcon ?? spray?.displayIcon).frame(width: 64, height: 64)
                            VStack(alignment: .leading) {
                                Text(i < slotNames.count ? slotNames[i] : "Emplacement \(i + 1)").font(.system(size: 15)).foregroundStyle(LUI.secondary)
                                Text(spray?.displayName ?? "Aucun").font(.system(size: 20)).foregroundStyle(EvalColors.text)
                            }
                            Spacer()
                            Image(systemName: "chevron.right").foregroundStyle(LUI.secondary)
                        }
                        .padding(16).contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 16)
                }
            }
            .background(LUI.card, in: .rect(cornerRadius: 22))
        }
        .sheet(item: Binding(get: { slot.map(SlotID.init) }, set: { slot = $0?.value })) { s in
            NavigationStack {
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 3), spacing: 12) {
                        ForEach(loadout.catalog.sprays.filter { loadout.ownedSprays.contains($0.uuid.lowercased()) }) { spray in
                            remote(spray.fullTransparentIcon ?? spray.displayIcon).frame(height: 90).padding(8)
                                .background(LUI.card, in: .rect(cornerRadius: 14))
                                .onTapGesture {
                                    loadout.setSpray(slot: s.value, sprayID: spray.uuid)
                                    slot = nil
                                    Task { if await loadout.save(model.valorant.riot) { await model.valorant.refreshRiot() } }
                                }
                        }
                    }
                    .padding(16)
                }
                .background(EvalColors.background.ignoresSafeArea())
                .navigationTitle("Choisir un spray")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
        .task { await loadout.load(model.valorant.riot) }
    }

    private struct SlotID: Identifiable { let value: Int; var id: Int { value } }
}

struct EvalPrivacySettingsView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let loadout = model.valorant.loadout
        LoadoutScreen(title: "Confidentialité") {
            toggle("Mode incognito", "Masque votre nom aux joueurs hors de votre groupe pendant les parties.",
                   value: loadout.raw?["Incognito"]?.boolValue ?? false) { loadout.setIncognito($0) }
            toggle("Masquer le niveau du compte", "Votre niveau n’est plus affiché aux autres joueurs.",
                   value: loadout.raw?["Identity"]?["HideAccountLevel"]?.boolValue ?? false) { loadout.setIdentity("HideAccountLevel", .bool($0)) }
        }
        .task { await loadout.load(model.valorant.riot) }
    }

    private func toggle(_ title: String, _ footer: String, value: Bool, set: @escaping (Bool) -> Void) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(title, isOn: Binding(get: { value }, set: { v in
                set(v)
                Task { _ = await model.valorant.loadout.save(model.valorant.riot) }
            }))
            .tint(LUI.accent).foregroundStyle(EvalColors.text)
            .padding(18).background(LUI.card, in: .rect(cornerRadius: 22))
            Text(footer).font(.footnote).foregroundStyle(LUI.secondary).padding(.horizontal, 4)
        }
    }
}

struct EvalAppearanceProfilesView: View {
    @Environment(AppModel.self) private var model
    @State private var naming = false
    @State private var name = ""
    @State private var toApply: RiotLoadoutModel.AppearanceProfile?

    var body: some View {
        let loadout = model.valorant.loadout
        LoadoutScreen(title: "Profils d'apparences", trailing: AnyView(Button { name = ""; naming = true } label: {
            Circle().fill(LUI.card).frame(width: 51, height: 51)
                .overlay(Image(systemName: "plus").font(.system(size: 21, weight: .semibold)).foregroundStyle(LUI.accent))
        }.buttonStyle(.plain))) {
            Text("Enregistrez votre équipement complet (skins, porte-bonheur, sprays, carte, titre) et réappliquez-le en un toucher.")
                .font(.system(size: 17)).foregroundStyle(LUI.secondary)
            if let message = loadout.message { Text(message).font(.footnote).foregroundStyle(LUI.secondary) }
            ForEach(loadout.profiles) { profile in
                Button { toApply = profile } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(profile.name).font(.system(size: 21, weight: .semibold)).foregroundStyle(EvalColors.text)
                            Text(profile.createdAt.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "fr_FR"))))
                                .font(.system(size: 15)).foregroundStyle(LUI.secondary)
                        }
                        Spacer()
                        Image(systemName: "arrow.up.right").foregroundStyle(LUI.accent)
                    }
                    .padding(18).background(LUI.card, in: .rect(cornerRadius: 20))
                }
                .buttonStyle(.plain)
                .contextMenu { Button("Supprimer", systemImage: "trash", role: .destructive) { loadout.deleteProfile(profile) } }
            }
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
}
