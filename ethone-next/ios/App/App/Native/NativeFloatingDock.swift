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
                let selected = selectedTab == tab
                Button {
                    Haptic.rigid()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: icon)
                            .font(.system(size: 22, weight: .semibold))
                            .symbolEffect(.bounce, value: selected)
                        Text(label)
                            .font(.caption2)
                    }
                    .foregroundStyle(selected ? .primary : .secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        selected
                            ? Capsule().fill(.thinMaterial)
                                .overlay(Capsule().stroke(Color.white.opacity(0.2), lineWidth: 0.5))
                            : nil
                    )
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule()
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.white.opacity(0.35), Color.white.opacity(0.05), Color.clear]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.8
                        )
                )
        )
        .shadow(color: Color.black.opacity(0.45), radius: 28, x: 0, y: 14)
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }
}

enum Tab: String, CaseIterable {
    case home, tasks, brain, notes, settings
}
