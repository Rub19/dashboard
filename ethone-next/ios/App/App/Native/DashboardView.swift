import SwiftUI

struct DashboardView: View {
    @ObservedObject var manager: SupabaseManager
    @State private var showAuth = false

    let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]

    var body: some View {
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
                    BentoPressable {
                        if #available(iOS 26.0, *) {
                            FocusTimerCard()
                        } else {
                            FocusFallbackCard()
                        }
                    }

                    BentoPressable {
                        TasksCard(manager: manager)
                    }

                    BentoPressable {
                        BrainCaptureCard()
                    }

                    BentoPressable {
                        StorageMetricsCard()
                    }
                }
                .padding(.horizontal)
            }
            .padding(.top, 24)
            .padding(.bottom, 120)
        }
        .sheet(isPresented: $showAuth) {
            BiometricSheet()
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
