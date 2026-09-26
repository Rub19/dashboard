import SwiftUI
import UserNotifications

/// Réglages des notifications : autorisation, rappels de tâches et d'événements, résumé du matin.
struct NotificationSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @AppStorage(NotificationPrefs.tasksKey) private var tasks = true
    @AppStorage(NotificationPrefs.eventsKey) private var events = true
    @AppStorage(NotificationPrefs.eventLeadKey) private var lead = 15
    @AppStorage(NotificationPrefs.briefingKey) private var briefing = false
    @AppStorage(NotificationPrefs.briefingHourKey) private var hour = 8
    @AppStorage(NotificationPrefs.briefingMinuteKey) private var minute = 0
    @State private var status: UNAuthorizationStatus = .notDetermined
    @State private var pendingCount = 0

    private var briefingTime: Binding<Date> {
        Binding(
            get: { Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date()) ?? Date() },
            set: {
                let parts = Calendar.current.dateComponents([.hour, .minute], from: $0)
                hour = parts.hour ?? 8
                minute = parts.minute ?? 0
            }
        )
    }

    var body: some View {
        List {
            Section {
                switch status {
                case .authorized, .provisional, .ephemeral:
                    Label("Notifications autorisées", systemImage: "bell.badge.fill").foregroundStyle(Theme.success)
                case .denied:
                    Label("Notifications refusées", systemImage: "bell.slash.fill").foregroundStyle(Theme.danger)
                    Button("Ouvrir les Réglages iOS") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }
                default:
                    Button("Autoriser les notifications") {
                        Task {
                            _ = await NotificationManager.requestAuthorization()
                            await refreshStatus()
                        }
                    }
                }
                LabeledContent("Rappels programmés", value: "\(pendingCount)")
            }
            .listRowBackground(GlassRowBackground())

            Section {
                Toggle("Échéances des tâches", isOn: $tasks)
                Toggle("Événements du calendrier", isOn: $events)
                if events {
                    Picker("Prévenir", selection: $lead) {
                        Text("À l'heure").tag(0)
                        Text("5 min avant").tag(5)
                        Text("15 min avant").tag(15)
                        Text("30 min avant").tag(30)
                        Text("1 h avant").tag(60)
                    }
                }
            } header: { Text("Rappels").sectionTitle() } footer: {
                Text("Les tâches avec échéance et les événements créés sur le site ou dans l'app reçoivent un rappel. Une échéance sans heure est rappelée à 9 h.")
            }
            .listRowBackground(GlassRowBackground())

            Section {
                Toggle("Résumé du matin", isOn: $briefing)
                if briefing {
                    DatePicker("Heure", selection: briefingTime, displayedComponents: .hourAndMinute)
                }
            } header: { Text("Résumé").sectionTitle() } footer: {
                Text("Chaque matin : nombre d'événements, de tâches à faire et de tâches en retard. Aucun résumé n'est envoyé un jour sans rien de prévu.")
            }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .task { await refreshStatus() }
        .onChange(of: tasks) { resync() }
        .onChange(of: events) { resync() }
        .onChange(of: lead) { resync() }
        .onChange(of: briefing) {
            if briefing { Task { _ = await NotificationManager.requestAuthorization(); await refreshStatus(); resync() } } else { resync() }
        }
        .onChange(of: hour) { resync() }
        .onChange(of: minute) { resync() }
    }

    private func refreshStatus() async {
        let center = UNUserNotificationCenter.current()
        status = await center.notificationSettings().authorizationStatus
        pendingCount = await center.pendingNotificationRequests().count
    }

    private func resync() {
        Task {
            await NotificationPlanner.resync(tasks: model.tasks.items, events: model.events.items)
            await refreshStatus()
        }
    }
}
