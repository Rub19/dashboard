import SwiftUI

@main
struct EthoneApp: App {
    @State private var model = AppModel.shared
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(model.auth)
                .tint(Theme.accent)
                .onOpenURL { url in model.handle(url: url) }
        }
    }
}
