import SwiftUI

struct RootView: View {
    @State private var selectedTab: Tab = .home

    var body: some View {
        ZStack(alignment: .bottom) {
            Group {
                switch selectedTab {
                case .home:
                    DashboardView()
                case .tasks:
                    TasksPlaceholderView()
                case .brain:
                    BrainPlaceholderView()
                case .notes:
                    NotesPlaceholderView()
                case .settings:
                    SettingsPlaceholderView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            NativeFloatingDock(selectedTab: $selectedTab)
        }
        .ignoresSafeArea(.keyboard)
    }
}
