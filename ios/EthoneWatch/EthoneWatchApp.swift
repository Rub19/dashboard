import SwiftUI

@main
struct EthoneWatchApp: App {
    @State private var model = WatchModel()

    var body: some Scene {
        WindowGroup {
            WatchRootView()
                .environment(model)
        }
    }
}
