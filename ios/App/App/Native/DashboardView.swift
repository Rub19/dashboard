import SwiftUI

public struct DashboardView: View {
    @ObservedObject var manager: SupabaseManager
    var onSelectTab: ((Tab) -> Void)? = nil

    @State private var showAuth = false
    @State private var selectedCard: String? = nil
    @Namespace private var animation

    let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    public init(manager: SupabaseManager, onSelectTab: ((Tab) -> Void)? = nil) {
        self.manager = manager
        self.onSelectTab = onSelectTab
    }

    public var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header with Greeting
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 6) {
                                Text("Bonjour Rub")
                                    .font(.system(size: 26, weight: .bold))
                                    .foregroundStyle(.primary)
                                ETHStatusBadge(label: "En ligne", tone: ETHTheme.emerald)
                            }

                            Text("Votre espace personnel intelligent")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Button {
                            HapticManager.shared.light()
                            showAuth.toggle()
                        } label: {
                            Image(systemName: "faceid")
                                .font(.title3)
                                .foregroundStyle(.primary)
                                .padding(10)
                                .background(Circle().fill(.ultraThinMaterial))
                        }
                    }
                    .padding(.horizontal)

                    // Hero Brain Briefing Card
                    ETHGlassCard(cornerRadius: 22, padding: 16) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                HStack(spacing: 8) {
                                    ETHBrainOrb(state: .idle, size: 28)
                                    Text("Briefing Brain")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(.primary)
                                }
                                Spacer()
                                ETHModelBadge("Claude 3.7")
                            }

                            Text("Vous avez \(manager.tasks.filter { !$0.done }.count) tâches en cours aujourd'hui. Aucun conflit d'agenda détecté.")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .lineLimit(2)

                            HStack {
                                Spacer()
                                Button(action: { onSelectTab?(.brain) }) {
                                    HStack(spacing: 4) {
                                        Text("Consulter Brain")
                                            .font(.system(size: 13, weight: .semibold))
                                        Image(systemName: "arrow.right")
                                            .font(.system(size: 11, weight: .bold))
                                    }
                                    .foregroundStyle(ETHTheme.violet)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Bento Grid
                    BentoGridView(columns: columns) {
                        BentoPressable(id: "focus", namespace: animation, onTap: { onSelectTab?(.focus) }) {
                            if #available(iOS 26.0, *) {
                                FocusTimerCard()
                            } else {
                                FocusFallbackCard()
                            }
                        }

                        BentoPressable(id: "tasks", namespace: animation, onTap: { onSelectTab?(.tasks) }) {
                            TasksCard(manager: manager)
                        }

                        BentoPressable(id: "brain", namespace: animation, onTap: { onSelectTab?(.brain) }) {
                            BrainCaptureCard()
                        }

                        BentoPressable(id: "storage", namespace: animation, onTap: { onSelectTab?(.settings) }) {
                            StorageMetricsCard()
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.top, 24)
                .padding(.bottom, 120)
            }
        }
        .sheet(isPresented: $showAuth) {
            BiometricSheet()
        }
    }
}
