import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth

    var body: some View {
        ZStack {
            AmbientBackground()
            switch auth.phase {
            case .launching:
                ProgressView().controlSize(.large)
            case .signedOut:
                LoginView()
            case .mfaRequired:
                MFAView()
            case .signedIn:
                MainTabs()
            }
        }
        .animation(.smooth, value: auth.phase)
        .preferredColorScheme(.dark)
        .task { await auth.restore() }
    }
}

struct MainTabs: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var selection: AppTab = .home

    var body: some View {
        TabView(selection: $selection) {
            Tab("Accueil", systemImage: "house.fill", value: AppTab.home) { HomeView() }
            Tab("Notes", systemImage: "note.text", value: AppTab.notes) { NotesView() }
            Tab("Tâches", systemImage: "checklist", value: AppTab.tasks) { TasksView() }
            Tab("Focus", systemImage: "timer", value: AppTab.focus) { FocusView() }
            Tab("Plus", systemImage: "ellipsis.circle.fill", value: AppTab.more) { MoreView() }
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .focusAccessory(model: model, selection: $selection)
        .task {
            await model.focus.restore()
            await model.refreshAll()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await model.refreshAll() } }
        }
        .onChange(of: model.requestedTab) { _, tab in
            if let tab {
                selection = tab
                model.requestedTab = nil
            }
        }
    }
}

private extension View {
    /// Mini-lecteur Focus au-dessus de la barre d'onglets, uniquement pendant une session.
    @ViewBuilder
    func focusAccessory(model: AppModel, selection: Binding<AppTab>) -> some View {
        if #available(iOS 26.1, *) {
            self.tabViewBottomAccessory(isEnabled: model.focus.isActive && selection.wrappedValue != .focus) {
                FocusMiniBar()
            }
        } else {
            self
        }
    }
}
