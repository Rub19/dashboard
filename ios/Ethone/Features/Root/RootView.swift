import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @Environment(\.scenePhase) private var scenePhase

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
        .onChange(of: auth.phase) { _, phase in
            if phase == .signedOut {
                SpotlightIndexer.clear()
                DiskCache.clearAll()
                NotificationManager.clearAll()
            }
        }
        .overlay { if model.lock.isLocked && auth.phase == .signedIn { LockScreen() } }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background: model.lock.lockIfEnabled()
            case .active: Task { await model.lock.unlock() }
            default: break
            }
        }
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

/// Écran affiché tant que l'app est verrouillée (le contenu est masqué, y compris dans le sélecteur d'apps).
struct LockScreen: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 18) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 40))
                    .padding(26)
                    .glassEffect(Glass.regular.tint(Theme.accent.opacity(0.35)), in: .circle)
                Text("ETHONE est verrouillé").font(.title3.weight(.semibold))
                Button("Déverrouiller") { Task { await model.lock.unlock() } }
                    .buttonStyle(.glassProminent)
                if let message = model.lock.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger)
                }
            }
        }
        .task { await model.lock.unlock() }
    }
}
