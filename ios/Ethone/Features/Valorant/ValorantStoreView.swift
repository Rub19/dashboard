import SwiftUI

struct ValorantStoreView: View {
    @Environment(AppModel.self) private var model
    @State private var bundles: [FeaturedBundle] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var loaded = false
    @State private var selectedBundle: FeaturedBundle?

    struct StoreItem: Codable, Hashable {
        let name: String
        let type: String
        let image: String
        let basePrice: Int
        let price: Int
        let discountPercent: Int
    }

    struct FeaturedBundle: Codable, Identifiable, Hashable {
        let uuid: String
        let name: String
        let image: String
        let price: Int
        let wholesaleOnly: Bool
        let expiresAt: String?
        let items: [StoreItem]
        var id: String { uuid.isEmpty ? name : uuid }
    }

    private struct Payload: Codable { let bundles: [FeaturedBundle] }
    private static let cacheTTL: TimeInterval = 24 * 60 * 60

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Boutique du jour")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button {
                        Task { await load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.headline.weight(.semibold))
                            .foregroundStyle(Theme.danger)
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 4)

            if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(Theme.danger)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.danger.opacity(0.12), in: .rect(cornerRadius: 18))
            }

            ForEach(bundles) { bundle in
                Button {
                    selectedBundle = bundle
                } label: {
                    VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 14) {
                        remoteImage(bundle.image, size: 86)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(bundle.name)
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                            Text("\(bundle.price.formatted()) VP" + (bundle.wholesaleOnly ? " · achat groupé uniquement" : ""))
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if let expiry = bundle.expiresAt.flatMap(ISODate.parse) {
                                Text(expiry, style: .relative)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.orange)
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(.secondary)
                    }
                    .padding(16)

                    ForEach(Array(bundle.items.enumerated()), id: \.offset) { index, item in
                        HStack(spacing: 12) {
                            remoteImage(item.image, size: 44)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.white)
                                Text(Self.typeLabel(item.type))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(item.price.formatted()) VP")
                                    .font(.footnote.monospacedDigit().weight(.bold))
                                    .foregroundStyle(.white)
                                if item.discountPercent > 0 {
                                    HStack(spacing: 4) {
                                        Text("\(item.basePrice.formatted())")
                                            .strikethrough()
                                            .foregroundStyle(.secondary)
                                        Text("-\(item.discountPercent) %")
                                            .foregroundStyle(.green)
                                            .bold()
                                    }
                                    .font(.caption2.monospacedDigit())
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        if index < bundle.items.count - 1 {
                            Divider().overlay(Color.white.opacity(0.08)).padding(.leading, 72)
                        }
                    }
                    }
                    .background(Color.white.opacity(0.08), in: .rect(cornerRadius: 26))
                }
                .buttonStyle(.plain)
            }

            if loaded && bundles.isEmpty && errorMessage == nil {
                    VStack(spacing: 10) {
                        Image(systemName: "bag")
                            .font(.system(size: 32))
                            .foregroundStyle(.secondary)
                        Text("Aucune offre disponible")
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("La boutique n’a renvoyé aucune offre pour le moment.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
            }

                Text("Les offres affichées proviennent uniquement de l’API disponible. Les skins quotidiens personnels ne sont pas inventés lorsqu’ils ne sont pas exposés.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .ethoneScreen()
        .overlay { if isLoading && bundles.isEmpty { ProgressView() } }
        .refreshable { await load() }
        .task { if !loaded { await load() } }
        .sheet(item: $selectedBundle) { bundle in
            bundleDetail(bundle)
        }
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
        let cache = model.valorant.isConfigured ? ValorantPersonalCache(
            api: model.api,
            accountName: model.valorant.playerName,
            accountTag: model.valorant.tag
        ) : nil
        if let cache,
           let cached = await cache.read("store", ttl: Self.cacheTTL),
           let payload = ValorantPersonalCache.decode(Payload.self, from: cached.payload) {
            bundles = payload.bundles
            if !cached.isStale { errorMessage = nil; return }
        }
        var headers: [String: String] = [:]
        if !model.valorant.apiKey.isEmpty { headers["x-henrik-api-key"] = model.valorant.apiKey }
        do {
            let payload: Payload = try await model.api.worker("api/stats/valorant-store", headers: headers)
            bundles = payload.bundles
            if let cache, let json = ValorantPersonalCache.encode(payload) {
                await cache.save(json, key: "store")
            }
            errorMessage = nil
        } catch {
            if bundles.isEmpty {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func bundleDetail(_ bundle: FeaturedBundle) -> some View {
            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        remoteImage(bundle.image, size: 180)
                            .frame(maxWidth: .infinity)

                        Text(bundle.name)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)

                        Text("\(bundle.price.formatted()) VP" + (bundle.wholesaleOnly ? " · achat groupé uniquement" : ""))
                            .font(.headline.monospacedDigit())
                            .foregroundStyle(Theme.danger)

                        if let expiry = bundle.expiresAt.flatMap(ISODate.parse) {
                            Label {
                                Text(expiry, style: .date)
                            } icon: {
                                Image(systemName: "clock")
                            }
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        VStack(alignment: .leading, spacing: 0) {
                            Text("Contenu")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                                .padding(.bottom, 8)

                            ForEach(Array(bundle.items.enumerated()), id: \.offset) { index, item in
                                HStack(spacing: 12) {
                                    remoteImage(item.image, size: 48)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(item.name)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(.white)
                                        Text(Self.typeLabel(item.type))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text("\(item.price.formatted()) VP")
                                        .font(.caption.monospacedDigit().weight(.bold))
                                        .foregroundStyle(.white)
                                }
                                .padding(.vertical, 10)
                                if index < bundle.items.count - 1 {
                                    Divider().overlay(Color.white.opacity(0.08))
                                }
                            }
                        }
                        .padding(16)
                        .background(Color.white.opacity(0.07), in: .rect(cornerRadius: 22))
                    }
                    .padding(16)
                }
                .navigationTitle("Détail de l’offre")
                .navigationBarTitleDisplayMode(.inline)
                .ethoneScreen()
            }
        }
}
