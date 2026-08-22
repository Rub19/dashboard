import SwiftUI
import UIKit

struct NativeFloatingDock: View {
    @Binding var selectedTab: Tab

    let items: [(Tab, String, String)] = [
        (.home, "Home", "house"),
        (.tasks, "Tasks", "checkmark.circle"),
        (.brain, "Brain", "sparkles"),
        (.notes, "Notes", "note.text"),
        (.settings, "Settings", "gearshape")
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items, id: \.0) { tab, label, icon in
                Button {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    selectedTab = tab
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: icon)
                            .font(.system(size: 20, weight: .medium))
                        Text(label)
                            .font(.caption2)
                    }
                    .foregroundStyle(selectedTab == tab ? Color.white : Color.white.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule()
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.45), radius: 24, x: 0, y: 12)
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }
}

enum Tab: String, CaseIterable {
    case home, tasks, brain, notes, settings
}

struct TasksPlaceholderView: View {
    var body: some View {
        Text("Tâches natives")
            .font(.title)
            .foregroundStyle(.secondary)
    }
}

struct BrainPlaceholderView: View {
    var body: some View {
        Text("Brain natif")
            .font(.title)
            .foregroundStyle(.secondary)
    }
}

struct NotesPlaceholderView: View {
    var body: some View {
        Text("Notes natives")
            .font(.title)
            .foregroundStyle(.secondary)
    }
}

struct SettingsPlaceholderView: View {
    var body: some View {
        Text("Réglages natifs")
            .font(.title)
            .foregroundStyle(.secondary)
    }
}
