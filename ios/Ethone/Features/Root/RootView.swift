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
        .preferredColorScheme(model.themePreset.isLight ? .light : .dark)
        .task { await auth.restore() }
        .onChange(of: auth.phase) { _, phase in
            if phase == .signedIn { model.startRealtime() }
            if phase == .signedOut {
                model.stopRealtime()
                SpotlightIndexer.clear()
                DiskCache.clearAll()
                NotificationManager.clearAll()
            }
        }
        .overlay { if model.lock.isLocked && auth.phase == .signedIn { LockScreen() } }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background:
                model.lock.lockIfEnabled()
                BackgroundSync.schedule()
            case .active:
                Task { await model.lock.unlock() }
                if auth.phase == .signedIn { model.startRealtime() }
            default: break
            }
        }
    }
}

struct MainTabs: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var selection: String = AppTab.home.rawValue

    var body: some View {
        TabView(selection: $selection) {
            Tab("Accueil", systemImage: "house.fill", value: AppTab.home.rawValue) {
                NavigationStack { HomeView() }
            }
            ForEach(model.pinnedTabs, id: \.self) { destination in
                Tab(destination.item?.title ?? "", systemImage: destination.item?.icon ?? "square", value: destination.rawValue) {
                    NavigationStack { destinationView(destination) }
                }
            }
            Tab("Plus", systemImage: "square.grid.2x2.fill", value: AppTab.more.rawValue) { MoreView() }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
        .focusAccessory(model: model, selection: selection)
        .task {
            await model.focus.restore()
            await model.refreshAll()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await model.refreshAll() } }
        }
        .onChange(of: model.requestedSelection) { _, tab in
            if let tab {
                selection = tab
                model.requestedSelection = nil
            }
        }
        .onChange(of: model.pinnedTabs) { _, pinned in
            if ![AppTab.home.rawValue, AppTab.more.rawValue].contains(selection), !pinned.map(\.rawValue).contains(selection) {
                selection = AppTab.more.rawValue
            }
        }
    }
}

private extension View {
    @ViewBuilder
    func focusAccessory(model: AppModel, selection: String) -> some View {
        if #available(iOS 26.1, *) {
            self.tabViewBottomAccessory(isEnabled: model.focus.isActive && selection != MoreDestination.focus.rawValue) {
                FocusMiniBar()
            }
        } else {
            self
        }
    }
}

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

