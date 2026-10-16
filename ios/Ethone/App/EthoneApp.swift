import CoreSpotlight
import SwiftUI

@main
struct EthoneApp: App {
    @State private var model = AppModel.shared
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    init() {
        let large = UIFont.systemFont(ofSize: 34, weight: .semibold)
        UINavigationBar.appearance().largeTitleTextAttributes = [
            .font: UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: large),
            .kern: -0.9,
        ]
        UINavigationBar.appearance().titleTextAttributes = [
            .font: UIFontMetrics(forTextStyle: .headline).scaledFont(for: UIFont.systemFont(ofSize: 17, weight: .semibold)),
            .kern: -0.2,
        ]
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(model.auth)
                .tint(Color(hex: Theme.readableTint(model.accentHex)))
                .onOpenURL { url in model.handle(url: url) }
                .onContinueUserActivity(CSSearchableItemActionType) { activity in
                    if let id = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String, let tab = SpotlightIndexer.tab(for: id) {
                        model.requestedTab = tab
                    }
                }
        }
    }
}
