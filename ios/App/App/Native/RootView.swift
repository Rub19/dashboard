import SwiftUI

public struct RootView: View {
    @State private var selectedTab: Tab = .home
    @StateObject private var supabase = SupabaseManager()

    public init() {}

    public var body: some View {
        ZStack(alignment: .bottom) {
            AmbientBackground()

            Group {
                switch selectedTab {
                case .home:
                    DashboardView(manager: supabase, onSelectTab: { tab in
                        selectedTab = tab
                    })
                case .brain:
                    BrainView()
                case .tasks:
                    TasksView()
                case .focus:
                    FocusView()
                case .notes:
                    NotesView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            NativeFloatingDock(selectedTab: $selectedTab)
        }
        .environmentObject(supabase)
        .ignoresSafeArea(.keyboard)
        .task {
            await supabase.syncAll()
        }
    }
}
