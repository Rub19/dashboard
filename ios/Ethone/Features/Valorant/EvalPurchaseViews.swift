import SwiftUI
import WebKit

/// Historique Riot tel que renvoyé par `valorant_purchase_history` (page d'aide support.riotgames.com).
struct RiotPurchaseHistory: Codable {
    struct Payment: Codable, Hashable {
        let storefrontAccountCode: String?
        let dateCreatedStr: String?
        let paymentMethodId: String?
        let amount: String?
        let currency: String?
    }
    struct Delta: Codable, Hashable {
        let amount: Int?
        let type: String?
    }
    struct WalletTransaction: Codable, Hashable {
        let deltas: [Delta]?
        let createdTime: String?
    }
    struct Billing: Codable { let paymentHistory: [Payment]? }
    struct Ares: Codable { let walletTransactions: [WalletTransaction]? }
    struct Account: Codable { let billing: Billing?; let ares: Ares? }
    let account: Account?
    var fetchedAt: Date?

    var payments: [Payment] {
        (account?.billing?.paymentHistory ?? []).sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
    }
    var transactions: [WalletTransaction] {
        (account?.ares?.walletTransactions ?? []).sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) }
    }

    static let cacheKey = "valorant-personal-cache.purchase-history"
}

extension RiotPurchaseHistory.Payment {
    var date: Date? { dateCreatedStr.flatMap { try? Date($0, strategy: .iso8601) } }
    var value: Double { Double(amount ?? "") ?? 0 }
    var game: String { (storefrontAccountCode ?? "").hasPrefix("lol") ? "League of Legends" : "VALORANT" }
    var methodName: String {
        switch paymentMethodId ?? "" {
        case "epay": "Carte cadeau Riot"
        case "adyen", "adyencomponents-card": "Carte bancaire"
        case "paysafecard": "Paysafecard"
        case "riotaccess": "Riot Access"
        case "xbox": "Xbox"
        case "playstation": "PlayStation"
        case let other: other.isEmpty ? "—" : other
        }
    }
}

extension RiotPurchaseHistory.WalletTransaction {
    private static let format: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyyMMdd'T'HHmmss.SSS'Z'"
        return f
    }()
    var date: Date? { createdTime.flatMap { Self.format.date(from: $0) } }
}

/// Monnaies VALORANT (uuid valorant-api).
private enum EvalCurrency {
    static func name(_ id: String?) -> String {
        switch id {
        case "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741": "Valorant Points"
        case "e59aa87c-4cbf-517a-5983-6e81511be9b7": "Points de radianite"
        case "85ca954a-41f2-ce94-9b45-8ca3dd39a00d": "Crédits de royaume"
        default: "Monnaie"
        }
    }
    static func icon(_ id: String?) -> URL? {
        id.flatMap { URL(string: "https://media.valorant-api.com/currencies/\($0)/displayicon.png") }
    }
}

/// Ouvre la page d'historique Riot et intercepte la réponse JSON dans la WebView.
/// Les cookies Riot restent dans la WebView ; seul le JSON de l'historique remonte à l'app.
struct RiotPurchaseCaptureView: UIViewRepresentable {
    static let page = URL(string: "https://support.riotgames.com/en-us/valorant/billing/checking-your-purchase-history")!
    var onCapture: (Data) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onCapture: onCapture) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let hook = """
        (function () {
          const match = (u) => String(u || '').includes('valorant_purchase_history');
          const send = (t) => { try { window.webkit.messageHandlers.purchases.postMessage(t); } catch (e) {} };
          const f = window.fetch;
          window.fetch = async function (...args) {
            const res = await f.apply(this, args);
            const url = (args[0] && args[0].url) || args[0];
            if (match(url) && res.ok) res.clone().text().then(send);
            return res;
          };
          const open = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function (m, url) {
            if (match(url)) this.addEventListener('load', () => { if (this.status === 200) send(this.responseText); });
            return open.apply(this, arguments);
          };
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: hook, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController.add(context.coordinator, name: "purchases")
        let view = WKWebView(frame: .zero, configuration: config)
        view.load(URLRequest(url: Self.page))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "purchases")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        let onCapture: (Data) -> Void
        init(onCapture: @escaping (Data) -> Void) { self.onCapture = onCapture }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let text = message.body as? String, let data = text.data(using: .utf8) else { return }
            onCapture(data)
        }
    }
}

struct EvalPurchaseHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var history = DiskCache.read(RiotPurchaseHistory.self, key: RiotPurchaseHistory.cacheKey)
    @State private var tab = 0
    @State private var capturing = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { dismiss() } label: {
                    Circle().fill(Color(hex: 0x1C1C1E)).frame(width: 51, height: 51)
                        .overlay(Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white))
                }
                .buttonStyle(.plain)
                Spacer()
                Text("Historique des achats").font(.system(size: 22, weight: .bold)).foregroundStyle(.white)
                Spacer()
                Button { capturing = true } label: {
                    Circle().fill(Color(hex: 0x1C1C1E)).frame(width: 51, height: 51)
                        .overlay(Image(systemName: "arrow.clockwise").font(.system(size: 18, weight: .semibold)).foregroundStyle(.white))
                }
                .buttonStyle(.plain)
                .opacity(history == nil ? 0 : 1)
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)

            if let history {
                Picker("", selection: $tab) {
                    Text("Paiements").tag(0)
                    Text("Transactions").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(16)
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if tab == 0 { payments(history) } else { transactions(history) }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 110)
                }
            } else {
                ContentUnavailableView(
                    "Historique des achats",
                    systemImage: "creditcard",
                    description: Text(error ?? "Connectez-vous au support Riot : l’app lit vos paiements et transactions depuis cette page. Rien n’est envoyé à Ethone, tout reste sur votre téléphone.")
                )
                .frame(maxHeight: .infinity)
                Button { capturing = true } label: {
                    Text("Charger depuis Riot")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(hex: 0xFD5B68), in: .capsule)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .padding(.bottom, 110)
            }
        }
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $capturing) {
            NavigationStack {
                RiotPurchaseCaptureView { data in
                    guard var decoded = try? JSONDecoder().decode(RiotPurchaseHistory.self, from: data), decoded.account != nil else {
                        error = "Réponse Riot illisible. Réessayez."
                        capturing = false
                        return
                    }
                    decoded.fetchedAt = .now
                    DiskCache.write(decoded, key: RiotPurchaseHistory.cacheKey)
                    history = decoded
                    error = nil
                    capturing = false
                }
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle("Support Riot")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Fermer") { capturing = false } } }
            }
        }
    }

    @ViewBuilder
    private func payments(_ history: RiotPurchaseHistory) -> some View {
        let list = history.payments
        let totals = Dictionary(grouping: list, by: { $0.currency ?? "" }).mapValues { $0.reduce(0) { $0 + $1.value } }
        VStack(alignment: .leading, spacing: 6) {
            Text("Total dépensé").font(.system(size: 16, weight: .medium)).foregroundStyle(.white.opacity(0.6))
            ForEach(totals.keys.sorted(), id: \.self) { code in
                Text(totals[code, default: 0].formatted(.currency(code: code)))
                    .font(.system(size: 32, weight: .bold).monospacedDigit()).foregroundStyle(.white)
            }
            Text("\(list.count) paiements").font(.system(size: 15)).foregroundStyle(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

        if list.isEmpty {
            ContentUnavailableView("Aucun paiement", systemImage: "creditcard")
        }
        ForEach(Array(list.enumerated()), id: \.offset) { _, payment in
            HStack(spacing: 12) {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Color(hex: 0xFD5B68))
                    .frame(width: 46, height: 46)
                    .background(Color(hex: 0xFD5B68).opacity(0.15), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text(payment.methodName).font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                    Text("\(payment.game) · \(payment.date?.formatted(date: .abbreviated, time: .shortened) ?? "—")")
                        .font(.system(size: 15)).foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
                Text(payment.value.formatted(.currency(code: payment.currency ?? "USD")))
                    .font(.system(size: 18, weight: .bold).monospacedDigit()).foregroundStyle(.white)
            }
            .padding(14)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 18))
        }
    }

    @ViewBuilder
    private func transactions(_ history: RiotPurchaseHistory) -> some View {
        let rows = history.transactions.flatMap { tx in
            (tx.deltas ?? []).compactMap { delta in delta.amount.map { (date: tx.date, amount: $0, type: delta.type) } }
        }
        if rows.isEmpty {
            ContentUnavailableView("Aucune transaction", systemImage: "arrow.left.arrow.right")
        }
        ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
            HStack(spacing: 12) {
                AsyncImage(url: EvalCurrency.icon(row.type)) { image in
                    image.resizable().scaledToFit()
                } placeholder: { Color.clear }
                .frame(width: 30, height: 30)
                .frame(width: 46, height: 46)
                .background(Color.white.opacity(0.06), in: .circle)
                VStack(alignment: .leading, spacing: 2) {
                    Text(EvalCurrency.name(row.type)).font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                    Text(row.date?.formatted(date: .abbreviated, time: .shortened) ?? "—")
                        .font(.system(size: 15)).foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
                Text(row.amount >= 0 ? "+\(row.amount.formatted())" : row.amount.formatted())
                    .font(.system(size: 18, weight: .bold).monospacedDigit())
                    .foregroundStyle(row.amount >= 0 ? Color(hex: 0x35C26B) : Color(hex: 0xFD5B68))
            }
            .padding(14)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 18))
        }
    }
}
