import SwiftUI

enum EvalStoreFormat {
    static let fr = Locale(identifier: "fr_FR")

    static func price(_ value: Int) -> String {
        value.formatted(.number.locale(fr))
    }

    static func day(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) { return "Aujourd'hui" }
        if calendar.isDateInYesterday(date) { return "Hier" }
        return date.formatted(.dateTime.day().month(.abbreviated).locale(fr))
    }
}

@MainActor
enum EvalSkinCatalog {
    private static var weapons: [ValorantWeaponItem] = []

    static func load() async -> [ValorantWeaponItem] {
        if !weapons.isEmpty { return weapons }
        struct Page: Decodable { let data: [ValorantWeaponItem] }
        guard let url = URL(string: "https://valorant-api.com/v1/weapons?language=fr-FR"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let page = try? JSONDecoder().decode(Page.self, from: data) else { return weapons }
        weapons = page.data
        return weapons
    }

    static func find(_ itemID: String, in weapons: [ValorantWeaponItem]) -> (weapon: ValorantWeaponItem, skin: ValorantWeaponItem.WeaponSkin)? {
        let id = itemID.lowercased()
        for weapon in weapons {
            if let skin = weapon.skins.first(where: { skin in
                (skin.levels ?? []).contains { $0.uuid.lowercased() == id } || (skin.chromas ?? []).contains { $0.uuid.lowercased() == id }
            }) {
                return (weapon, skin)
            }
        }
        return nil
    }
}

struct ValorantStoreView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private let secondary = Color(hex: 0x8E8E93)

    var body: some View {
        let store = model.valorant
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                EvalNavHeader(title: "Magasin d’accessoires") { dismiss() }

                VStack(spacing: 0) {
                    HStack(spacing: 8) {
                        Text("Vos crédits du Royaume")
                            .font(.system(size: 19))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Text(EvalStoreFormat.price(store.wallet.kc))
                            .font(.system(size: 19).monospacedDigit())
                            .foregroundStyle(secondary)
                        KCIconView(size: 22)
                    }
                    .padding(.horizontal, 20)
                    .frame(minHeight: 54)
                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 20)
                    HStack(spacing: 8) {
                        Text("Réinitialisation des offres")
                            .font(.system(size: 19))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in
                            Text(EvalCountdown.text(until: store.accessoriesEnd, now: ctx.date))
                        }
                        .font(.system(size: 19).monospacedDigit())
                        .foregroundStyle(secondary)
                        Image(systemName: "clock")
                            .font(.system(size: 19))
                            .foregroundStyle(secondary)
                    }
                    .padding(.horizontal, 20)
                    .frame(minHeight: 54)
                }
                .background(EvalColors.card, in: .rect(cornerRadius: 26))

                if store.accessories.isEmpty {
                    ContentUnavailableView(
                        "Aucun accessoire",
                        systemImage: "sparkles",
                        description: Text(store.riot.isLinked
                            ? "Le magasin d’accessoires n’a renvoyé aucune offre pour le moment."
                            : "Connectez votre compte Riot pour voir le magasin d’accessoires.")
                    )
                    .padding(.top, 30)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(store.accessories.enumerated()), id: \.element.id) { index, item in
                            HStack(spacing: 16) {
                                if item.imageURL.isEmpty {
                                    EvalTitleBadge(size: 62)
                                } else {
                                    AsyncImage(url: URL(string: item.imageURL)) { $0.image?.resizable().interpolation(.high).scaledToFit() }
                                        .frame(width: 62, height: 62)
                                }
                                Text(item.name)
                                    .font(.system(size: 19))
                                    .foregroundStyle(EvalColors.text)
                                    .lineLimit(3)
                                Spacer(minLength: 8)
                                Text(EvalStoreFormat.price(item.price))
                                    .font(.system(size: 19).monospacedDigit())
                                    .foregroundStyle(secondary)
                                KCIconView(size: 22)
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 14)
                            if index < store.accessories.count - 1 {
                                Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 20)
                            }
                        }
                    }
                    .padding(.vertical, 6)
                    .background(EvalColors.card, in: .rect(cornerRadius: 26))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .refreshable { await store.refreshRiot() }
    }
}

struct EvalBundleDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let bundle: ValorantStoreBundle
    @State private var lines: [Line] = []
    @State private var loaded = false
    @State private var failed = false

    private let secondary = Color(hex: 0x8E8E93)

    struct Line: Identifiable {
        let id: String
        let name: String
        let image: String
        let price: Int
        let skin: ValorantWeaponItem.WeaponSkin?
        var isWeapon: Bool { skin != nil }
    }

    private struct Front: Decodable {
        struct Reward: Decodable { let ItemTypeID: String; let ItemID: String }
        struct Entry: Decodable { let Item: Reward; let BasePrice: Int?; let DiscountedPrice: Int? }
        struct Bundle: Decodable { let ID: String; let Items: [Entry]? }
        struct Featured: Decodable { let Bundles: [Bundle]? }
        let FeaturedBundle: Featured?
    }

    private var groups: [[Line]] {
        var result: [[Line]] = []
        for line in lines {
            if line.isWeapon, let last = result.last, last.first?.isWeapon == true {
                result[result.count - 1].append(line)
            } else {
                result.append([line])
            }
        }
        return result
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                EvalNavHeader(title: bundle.name) { dismiss() }

                header

                if !loaded {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 30)
                } else if failed {
                    ContentUnavailableView(
                        "Contenu indisponible",
                        systemImage: "shippingbox",
                        description: Text(model.valorant.riot.isLinked
                            ? "Le contenu de ce pack n’a pas pu être chargé depuis la boutique Riot."
                            : "Connectez votre compte Riot pour voir le contenu de ce pack.")
                    )
                } else {
                    ForEach(Array(groups.enumerated()), id: \.offset) { _, group in
                        if group.first?.isWeapon == true {
                            weaponCard(group)
                        } else if let line = group.first {
                            accessoryCard(line)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { if !loaded { await load() } }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 0) {
            Color.clear
                .aspectRatio(16 / 9, contentMode: .fit)
                .overlay {
                    AsyncImage(url: URL(string: bundle.imageURL)) { phase in
                        if let image = phase.image {
                            image.resizable().interpolation(.high).scaledToFill()
                        } else {
                            Color(hex: 0x161820)
                        }
                    }
                }
                .overlay(alignment: .bottomTrailing) {
                    if let price = bundle.price {
                        HStack(spacing: 8) {
                            Text(EvalStoreFormat.price(price))
                                .font(.system(size: 19, weight: .semibold).monospacedDigit())
                            VPIconView(size: 20)
                        }
                        .foregroundStyle(.white)
                        .frame(width: 260, height: 36)
                        .background(Color.black.opacity(0.55))
                        .rotationEffect(.degrees(-45))
                        .offset(x: 82, y: -32)
                    }
                }
                .clipped()

            if let description = bundle.description, !description.isEmpty {
                Text(description)
                    .font(.system(size: 19))
                    .foregroundStyle(EvalColors.text)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(20)
            }
        }
        .background(EvalColors.card)
        .clipShape(.rect(cornerRadius: 26))
    }

    private func priceLabel(_ value: Int) -> some View {
        HStack(spacing: 8) {
            Text(EvalStoreFormat.price(value))
                .font(.system(size: 19).monospacedDigit())
                .foregroundStyle(secondary)
            VPIconView(size: 20, color: secondary)
        }
    }

    private func accessoryCard(_ line: Line) -> some View {
        HStack(spacing: 16) {
            if line.image.isEmpty {
                EvalTitleBadge(size: 62)
            } else {
                AsyncImage(url: URL(string: line.image)) { $0.image?.resizable().interpolation(.high).scaledToFit() }
                    .frame(width: 62, height: 62)
            }
            Text(line.name)
                .font(.system(size: 19))
                .foregroundStyle(EvalColors.text)
                .lineLimit(3)
            Spacer(minLength: 8)
            priceLabel(line.price)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 20)
        .background(EvalColors.card, in: .rect(cornerRadius: 26))
    }

    private func weaponCard(_ group: [Line]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(group.enumerated()), id: \.element.id) { index, line in
                NavigationLink {
                    if let skin = line.skin { EvalSkinDetailView(skin: skin) }
                } label: {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Spacer()
                            AsyncImage(url: URL(string: line.image)) { $0.image?.resizable().interpolation(.high).scaledToFit() }
                                .frame(maxWidth: 240, maxHeight: 84)
                            Spacer()
                        }
                        .overlay(alignment: .trailing) {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(secondary)
                        }
                        HStack {
                            Text(line.name)
                                .font(.system(size: 19))
                                .foregroundStyle(EvalColors.text)
                                .lineLimit(2)
                            Spacer(minLength: 8)
                            priceLabel(line.price)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
                if index < group.count - 1 {
                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.horizontal, 20)
                }
            }
        }
        .padding(.vertical, 6)
        .background(EvalColors.card, in: .rect(cornerRadius: 26))
    }

    private func load() async {
        defer { loaded = true }
        let riot = model.valorant.riot
        guard let puuid = riot.credentials?.puuid,
              let data = try? await riot.gameData("/store/v3/storefront/\(puuid)", method: "POST", body: RiotSession.json([String: String]())),
              let front = try? JSONDecoder().decode(Front.self, from: data),
              let entry = front.FeaturedBundle?.Bundles?.first(where: { $0.ID.lowercased() == bundle.id.lowercased() }) else {
            failed = true
            return
        }
        let weapons = await EvalSkinCatalog.load()
        let looks = await LoadoutCatalog.load()
        lines = (entry.Items ?? []).compactMap { (item: Front.Entry) -> Line? in
            let id = item.Item.ItemID.lowercased()
            let price = item.DiscountedPrice ?? item.BasePrice ?? 0
            switch item.Item.ItemTypeID.lowercased() {
            case "e7c63390-eda7-46e0-bb7a-a6abdacd2433", "3ad1b2b2-acdb-4524-852f-954a76ddae0a":
                guard let match = EvalSkinCatalog.find(id, in: weapons) else { return nil }
                return Line(id: id, name: match.skin.displayName, image: match.skin.image ?? "", price: price, skin: match.skin)
            case "dd3bf334-87f3-40bd-b043-682a57a8dc3a":
                let buddy = looks.buddies.first { $0.levels.contains { $0.uuid.lowercased() == id } }
                return Line(id: id, name: buddy?.displayName ?? "Porte-bonheur", image: buddy?.displayIcon ?? "https://media.valorant-api.com/buddylevels/\(id)/displayicon.png", price: price, skin: nil)
            case "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475":
                let spray = looks.sprays.first { $0.uuid.lowercased() == id }
                return Line(id: id, name: spray?.displayName ?? "Graffiti", image: spray?.fullTransparentIcon ?? spray?.displayIcon ?? "https://media.valorant-api.com/sprays/\(id)/displayicon.png", price: price, skin: nil)
            case "3f296c07-64c3-494c-923b-fe692a4fa1bd":
                let card = looks.cards.first { $0.uuid.lowercased() == id }
                return Line(id: id, name: card?.displayName ?? "Carte", image: card?.smallArt ?? "https://media.valorant-api.com/playercards/\(id)/smallart.png", price: price, skin: nil)
            case "de7caa6b-adf7-4588-bbd1-143831e786c6":
                let title = looks.titles.first { $0.uuid.lowercased() == id }?.titleText
                return Line(id: id, name: title.map { "Titre « \($0) »" } ?? "Titre", image: "", price: price, skin: nil)
            default:
                return nil
            }
        }
        failed = lines.isEmpty
    }
}

struct EvalOfferDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let levelID: String
    let name: String
    @State private var skin: ValorantWeaponItem.WeaponSkin?
    @State private var failed = false

    init(levelID: String, name: String = "") {
        self.levelID = levelID
        self.name = name
    }

    init(offer: ValorantDailySkinOffer) {
        self.init(levelID: offer.id, name: offer.name)
    }

    var body: some View {
        if let skin {
            EvalSkinDetailView(skin: skin)
        } else {
            ScrollView {
                VStack(spacing: 16) {
                    EvalNavHeader(title: name.isEmpty ? "Détail de l’offre" : name) { dismiss() }
                    if failed {
                        ContentUnavailableView("Skin introuvable", systemImage: "questionmark.square.dashed",
                                               description: Text("Ce skin n’a pas été trouvé dans le catalogue VALORANT."))
                            .padding(.top, 40)
                    } else {
                        ProgressView().padding(.top, 60)
                    }
                }
                .padding(.horizontal, 16)
            }
            .background(EvalColors.background.ignoresSafeArea())
            .navigationBarBackButtonHidden(true)
            .toolbar(.hidden, for: .navigationBar)
            .task {
                let weapons = await EvalSkinCatalog.load()
                if let match = EvalSkinCatalog.find(levelID, in: weapons) {
                    skin = match.skin
                } else {
                    failed = true
                }
            }
        }
    }
}
