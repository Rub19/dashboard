import SwiftUI
import UIKit

public enum Tab: String, CaseIterable {
    case home = "Home"
    case brain = "Brain"
    case tasks = "Tâches"
    case focus = "Focus"
    case notes = "Notes"
    case settings = "Réglages"

    public var icon: String {
        switch self {
        case .home: return "house.fill"
        case .brain: return "sparkles"
        case .tasks: return "checkmark.circle.fill"
        case .focus: return "timer"
        case .notes: return "note.text"
        case .settings: return "gearshape.fill"
        }
    }
}

public struct NativeFloatingDock: View {
    @Binding var selectedTab: Tab

    public init(selectedTab: Binding<Tab>) {
        self._selectedTab = selectedTab
    }

    public var body: some View {
        HStack(spacing: 4) {
            ForEach(Tab.allCases, id: \.self) { tab in
                let selected = selectedTab == tab
                Button {
                    HapticManager.shared.selection()
                    withAnimation(ETHTheme.springSnappy) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundStyle(selected ? ETHTheme.emerald : .secondary)

                        Text(tab.rawValue)
                            .font(.system(size: 10, weight: selected ? .bold : .medium))
                            .foregroundStyle(selected ? .primary : .secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        selected
                            ? Capsule()
                                .fill(Color.white.opacity(0.1))
                                .overlay(Capsule().stroke(ETHTheme.emerald.opacity(0.3), lineWidth: 0.8))
                            : nil
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(
                    Capsule()
                        .stroke(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.30),
                                    Color.white.opacity(0.08),
                                    Color.clear
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.8
                        )
                )
        )
        .shadow(color: Color.black.opacity(0.45), radius: 24, x: 0, y: 12)
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }
}
