import SwiftUI
import WebKit

struct GamesView: View {
    private struct Game: Identifiable, Hashable {
        let id: String
        let label: String
        let symbol: String
        var url: URL { Config.workerURL.appendingPathComponent("api/games/\(id)") }
    }

    private let games = [
        Game(id: "dino", label: "Dino Corridor", symbol: "hare.fill"),
        Game(id: "breach", label: "ETHONE : BREACH", symbol: "bolt.shield.fill"),
    ]

    @State private var selected = "dino"

    var body: some View {
        VStack(spacing: 0) {
            Picker("Jeu", selection: $selected) {
                ForEach(games) { game in Label(game.label, systemImage: game.symbol).tag(game.id) }
            }
            .pickerStyle(.segmented)
            .padding(12)
            if let game = games.first(where: { $0.id == selected }) {
                GameWebView(url: game.url).id(game.id)
            }
        }
        .navigationTitle("Jeux")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct GameWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.scrollView.backgroundColor = .clear
        view.scrollView.bounces = false
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}
}

