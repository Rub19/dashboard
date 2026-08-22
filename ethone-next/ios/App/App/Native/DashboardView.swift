import SwiftUI

struct DashboardView: View {
    @ObservedObject var manager: SupabaseManager
    @State private var showAuth = false
    @State private var selectedCard: String? = nil
    @Namespace private var animation

    let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("ETHONE")
                                .font(.largeTitle.weight(.black))
                                .foregroundStyle(.primary)

                            Text("Tableau de bord natif")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Button {
                            Haptic.light()
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

                    if let error = manager.errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .padding()
                            .background(RoundedRectangle(cornerRadius: 12).fill(.ultraThinMaterial))
                            .padding(.horizontal)
                    }

                    BentoGridView(columns: columns) {
                        BentoPressable(id: "focus", namespace: animation, onTap: { selectedCard = "focus" }) {
                            if #available(iOS 26.0, *) {
                                FocusTimerCard()
                            } else {
                                FocusFallbackCard()
                            }
                        }
                        .opacity(selectedCard == "focus" ? 0 : 1)

                        BentoPressable(id: "tasks", namespace: animation, onTap: { selectedCard = "tasks" }) {
                            TasksCard(manager: manager)
                        }
                        .opacity(selectedCard == "tasks" ? 0 : 1)

                        BentoPressable(id: "brain", namespace: animation, onTap: { selectedCard = "brain" }) {
                            BrainCaptureCard()
                        }
                        .opacity(selectedCard == "brain" ? 0 : 1)

                        BentoPressable(id: "storage", namespace: animation, onTap: { selectedCard = "storage" }) {
                            StorageMetricsCard()
                        }
                        .opacity(selectedCard == "storage" ? 0 : 1)
                    }
                    .padding(.horizontal)
                }
                .padding(.top, 24)
                .padding(.bottom, 120)
            }

            if let selected = selectedCard {
                FullScreenBentoCard(id: selected, namespace: animation) {
                    withAnimation(.spring(response: 0.45, dampingFraction: 0.8)) {
                        selectedCard = nil
                    }
                }
                .zIndex(1)
            }
        }
        .sheet(isPresented: $showAuth) {
            BiometricSheet()
        }
    }
}

struct FullScreenBentoCard: View {
    let id: String
    var namespace: Namespace.ID
    let onClose: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.opacity(0.6)
                .ignoresSafeArea()
                .onTapGesture { onClose() }

            LiquidGlassContainer {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text(title(for: id))
                            .font(.largeTitle.weight(.bold))
                        Spacer()
                        Button {
                            onClose()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .symbolEffect(.bounce, value: true)
                        }
                    }

                    Text("Vue plein écran avec matchedGeometryEffect.")
                        .font(.body)
                        .foregroundStyle(.secondary)

                    Spacer()
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .matchedGeometryEffect(id: id, in: namespace, properties: .position, anchor: .center, isSource: false)
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func title(for id: String) -> String {
        switch id {
        case "focus": return "Focus"
        case "tasks": return "Tâches"
        case "brain": return "Brain"
        case "storage": return "Stockage"
        default: return "ETHONE"
        }
    }
}

struct FocusFallbackCard: View {
    var body: some View {
        LiquidGlassContainer {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "target")
                        .font(.title2)
                    Spacer()
                    Text("25:00")
                        .font(.system(.title3, design: .rounded).monospacedDigit())
                        .fontWeight(.bold)
                }

                Text("Focus")
                    .font(.headline)

                Text("Mise à niveau vers iOS 26 pour le minuteur Live Activity.")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Spacer()
            }
        }
    }
}

struct BiometricSheet: View {
    @StateObject private var auth = BiometricAuth()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "faceid")
                .font(.system(size: 72))
                .symbolEffect(.bounce, value: auth.isUnlocked)

            Text("Déverrouiller ETHONE")
                .font(.title2.weight(.bold))

            Button {
                Task { await auth.authenticate() }
            } label: {
                Text("Utiliser Face ID / Touch ID")
                    .font(.headline)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Capsule().fill(.ultraThinMaterial))
            }

            if let error = auth.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding()
        .onChange(of: auth.isUnlocked) { _, unlocked in
            if unlocked { dismiss() }
        }
    }
}
