import SwiftUI

/// Bundles à la une de la boutique Valorant (Worker ETHONE → HenrikDev, enrichi par le catalogue public valorant-api.com).
/// La boutique quotidienne PERSONNELLE du joueur n'est pas proposée : Riot n'a pas d'API publique pour elle, elle exigerait
/// les jetons de connexion Riot du joueur, qu'ETHONE ne demande ni ne stocke.
struct ValorantStoreView: View {
    @Environment(AppModel.self) private var model
    @State private var bundles: [FeaturedBundle] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loaded = false

    struct StoreItem: Decodable, Hashable {
        let name: String
        let type: String
        let image: String
        let basePrice: Int
        let price: Int
        let discountPercent: Int
    }

    struct FeaturedBundle: Decodable, Identifiable, Hashable {
        let uuid: String
        let name: String
        let image: String
        let price: Int
        let wholesaleOnly: Bool
        let expiresAt: String?
        let items: [StoreItem]
        var id: String { uuid.isEmpty ? name : uuid }
    }

    private struct Payload: Decodable { let bundles: [FeaturedBundle] }

    var body: some View {
        List {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            ForEach(bundles) { bundle in
                Section {
                    HStack(spacing: 14) {
                        remoteImage(bundle.image, size: 72)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(bundle.name).font(.headline)
                            Text("\(bundle.price.formatted()) VP" + (bundle.wholesaleOnly ? " · achat groupé uniquement" : ""))
                                .font(.subheadline).foregroundStyle(.secondary)
                            if let expiry = bundle.expiresAt.flatMap(ISODate.parse) {
                                Text(expiry, style: .relative).font(.caption.weight(.semibold)).foregroundStyle(.orange)
                                    + Text(" restant").font(.caption).foregroundStyle(.orange)
                            }
                        }
                    }
                    .listRowBackground(GlassRowBackground())

                    ForEach(Array(bundle.items.enumerated()), id: \.offset) { _, item in
                        HStack(spacing: 12) {
                            remoteImage(item.image, size: 44)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name).font(.subheadline.weight(.semibold))
                                Text(Self.typeLabel(item.type)).font(.caption2).foregroundStyle(.secondary).textCase(.uppercase)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(item.price.formatted()) VP").font(.footnote.monospacedDigit().weight(.bold))
                                if item.discountPercent > 0 {
                                    HStack(spacing: 4) {
                                        Text("\(item.basePrice.formatted())").strikethrough().foregroundStyle(.secondary)
                                        Text("-\(item.discountPercent) %").foregroundStyle(.green).bold()
                                    }
                                    .font(.caption2.monospacedDigit())
                                }
                            }
                        }
                        .listRowBackground(GlassRowBackground())
                    }
                }
            }

            if loaded && bundles.isEmpty && errorMessage == nil {
                Text("Aucun bundle à la une.").foregroundStyle(.secondary).listRowBackground(Color.clear)
            }

            Section {
                EmptyView()
            } footer: {
                Text("La boutique quotidienne personnelle (4 skins du jour, Marché nocturne) n'est pas affichée : Riot ne propose pas d'API publique pour elle et elle nécessiterait vos jetons de connexion Riot, qu'ETHONE ne demande ni ne stocke.")
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Boutique Valorant")
        .ethoneScreen()
        .overlay { if isLoading && bundles.isEmpty { ProgressView() } }
        .refreshable { await load() }
        .task { if !loaded { await load() } }
    }

    private func remoteImage(_ urlString: String, size: CGFloat) -> some View {
        AsyncImage(url: URL(string: urlString)) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFit()
            default: Image(systemName: "shippingbox.fill").foregroundStyle(.secondary)
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }

    private static func typeLabel(_ type: String) -> String {
        switch type {
        case "skin", "skin_level": "Skin"
        case "player_card": "Carte"
        case "spray": "Spray"
        case "buddy": "Porte-bonheur"
        case "title": "Titre"
        case "agent": "Agent"
        default: type
        }
    }

    private func load() async {
        isLoading = true
        defer { isLoading = false; loaded = true }
        // Le Worker utilise la clé HenrikDev enregistrée sur le compte ; à défaut, celle saisie dans cette app.
        var headers: [String: String] = [:]
        if !model.valorant.apiKey.isEmpty { headers["x-henrik-api-key"] = model.valorant.apiKey }
        do {
            let payload: Payload = try await model.api.worker("api/stats/valorant-store", headers: headers)
            bundles = payload.bundles
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
