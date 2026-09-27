import SwiftUI
import WebKit

/// Navigateur intégré avec inspection d'adresse (schéma, chiffrement, en-têtes de sécurité) : équivalent iOS du labo « Navigateur » du site.
struct BrowserView: View {
    @State private var input = UserDefaults.standard.string(forKey: "ethone.browser.url") ?? "https://ethone.dev"
    @State private var current: URL?
    @State private var report: [(name: String, value: String, ok: Bool?)] = []
    @State private var inspecting = false
    @State private var showReport = false
    @State private var message: String?

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                TextField("Adresse ou recherche", text: $input)
                    .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .submitLabel(.go).onSubmit(go)
                    .padding(10)
                    .glassEffect(.regular, in: .rect(cornerRadius: 14))
                Button(action: go) { Image(systemName: "arrow.right.circle.fill").font(.title2) }
                Button {
                    showReport = true
                    Task { await inspect() }
                } label: { Image(systemName: "checkmark.shield").font(.title2) }
                .disabled(current == nil)
                .accessibilityLabel("Inspecter l'adresse")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            if let message { Text(message).font(.footnote).foregroundStyle(Theme.danger).padding(.horizontal, 12) }

            if let current {
                WebView(url: current)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
            } else {
                ContentUnavailableView("Navigateur", systemImage: "safari", description: Text("Saisissez une adresse https:// pour l'ouvrir ici."))
            }
        }
        .navigationTitle("Navigateur")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .sheet(isPresented: $showReport) {
            NavigationStack {
                List {
                    if inspecting { ProgressView() }
                    ForEach(report, id: \.name) { row in
                        HStack {
                            Text(row.name)
                            Spacer()
                            Text(row.value).foregroundStyle(row.ok == false ? Theme.danger : (row.ok == true ? Theme.success : Color.secondary)).multilineTextAlignment(.trailing)
                        }
                    }
                }
                .navigationTitle("Inspection")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { showReport = false } } }
            }
            .presentationDetents([.medium, .large])
        }
        .onAppear { if current == nil { go() } }
    }

    private func go() {
        message = nil
        var text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        if !text.contains("://") { text = text.contains(".") && !text.contains(" ") ? "https://" + text : "https://www.google.com/search?q=" + (text.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? text) }
        guard let url = URL(string: text), let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else {
            message = "Seules les adresses http et https sont ouvertes."
            return
        }
        if scheme == "http" { message = "Connexion non chiffrée (http) : évitez d'y saisir des informations sensibles." }
        UserDefaults.standard.set(url.absoluteString, forKey: "ethone.browser.url")
        input = url.absoluteString
        current = url
    }

    /// Requête réelle vers l'adresse : code de réponse, redirection, chiffrement et en-têtes de sécurité présents.
    private func inspect() async {
        guard let url = current else { return }
        inspecting = true
        defer { inspecting = false }
        report = []
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return }
            func header(_ name: String) -> String? { http.value(forHTTPHeaderField: name) }
            var rows: [(name: String, value: String, ok: Bool?)] = [
                ("Adresse finale", http.url?.absoluteString ?? url.absoluteString, nil),
                ("Code de réponse", "\(http.statusCode)", (200..<400).contains(http.statusCode)),
                ("Chiffrement (HTTPS)", (http.url?.scheme ?? url.scheme) == "https" ? "Oui" : "Non", (http.url?.scheme ?? url.scheme) == "https"),
            ]
            for (title, key) in [("Content-Security-Policy", "Content-Security-Policy"), ("Strict-Transport-Security", "Strict-Transport-Security"),
                                 ("X-Content-Type-Options", "X-Content-Type-Options"), ("X-Frame-Options", "X-Frame-Options"),
                                 ("Referrer-Policy", "Referrer-Policy"), ("Permissions-Policy", "Permissions-Policy")] {
                let value = header(key)
                rows.append((title, value.map { String($0.prefix(60)) } ?? "Absent", value != nil))
            }
            if let server = header("Server") { rows.append(("Serveur", server, nil)) }
            report = rows
        } catch {
            report = [("Erreur", (error as? LocalizedError)?.errorDescription ?? error.localizedDescription, false)]
        }
    }
}

private struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.allowsBackForwardNavigationGestures = true
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {
        if view.url != url && view.url?.absoluteString != url.absoluteString { view.load(URLRequest(url: url)) }
    }
}
