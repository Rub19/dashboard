import SwiftUI

struct RootView: View {
    @State private var selectedTab: Tab = .home
    @StateObject private var supabase = SupabaseManager()

    var body: some View {
        ZStack(alignment: .bottom) {
            AmbientBackground()

            Group {
                switch selectedTab {
                case .home:
                    DashboardView(manager: supabase)
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
        .environmentObject(supabase)
        .ignoresSafeArea(.keyboard)
        .task {
            await supabase.syncAll()
        }
    }
}

struct TasksPlaceholderView: View {
    var body: some View {
        VStack {
            Text("Tâches")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.secondary)
            Text("Vue native complète en cours d'assemblage")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

struct BrainPlaceholderView: View {
    var body: some View {
        VStack {
            Text("Brain")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.secondary)
        }
    }
}

struct NotesPlaceholderView: View {
    var body: some View {
        VStack {
            Text("Notes")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.secondary)
        }
    }
}

struct SettingsPlaceholderView: View {
    var body: some View {
        VStack {
            Text("Réglages")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.secondary)
        }
    }
}
