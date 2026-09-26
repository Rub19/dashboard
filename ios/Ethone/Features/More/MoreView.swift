import SwiftUI
import UserNotifications

struct MoreView: View {
    @Environment(AppModel.self) private var model
    @Environment(AuthStore.self) private var auth
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var confirmSignOut = false

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.morePath) {
            List {
                Section {
                    NavigationLink(value: MoreDestination.habits) {
                        Label("Habitudes", systemImage: "flame.fill")
                    }
                    .listRowBackground(GlassRowBackground())
                } header: { Text("Applications").sectionTitle() }

                Section {
                    HStack(spacing: 14) {
                        AvatarView(url: auth.user?.avatarURL, name: auth.user?.displayName ?? "E", size: 56, status: .online)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(auth.user?.displayName ?? "").font(.headline)
                            Text(auth.user?.email ?? "").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                    .listRowBackground(GlassRowBackground())
                }

                Section {
                    HStack {
                        Label("Notifications", systemImage: "bell.badge.fill")
                        Spacer()
                        switch notificationStatus {
                        case .authorized, .provisional, .ephemeral:
                            Text("Activées").foregroundStyle(Theme.success)
                        case .denied:
                            Button("Réglages") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                            }
                        default:
                            Button("Activer") {
                                Task {
                                    await NotificationManager.requestAuthorization()
                                    await refreshStatus()
                                }
                            }
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                } header: { Text("Rappels").sectionTitle() } footer: {
                    Text("Rappels de tâches et d'habitudes, fin de session de concentration. Les notifications envoyées par le serveur nécessitent une version signée de l'app.")
                }

                Section {
                    Button(role: .destructive) { confirmSignOut = true } label: {
                        Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                    .listRowBackground(GlassRowBackground())
                }

                Section {
                    LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—")
                        .listRowBackground(GlassRowBackground())
                }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Plus")
            .navigationDestination(for: MoreDestination.self) { destination in
                switch destination {
                case .habits: HabitsView()
                }
            }
            .task { await refreshStatus() }
            .confirmationDialog("Se déconnecter d'ETHONE ?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Se déconnecter", role: .destructive) { Task { await auth.signOut() } }
            }
        }
    }

    private func refreshStatus() async {
        notificationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }
}
