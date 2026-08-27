import SwiftUI

public struct BrainView: View {
    @ObservedObject var brain = BrainService.shared
    @EnvironmentObject var supabase: SupabaseManager
    @State private var inputText: String = ""
    @State private var showingModelSheet = false

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                VStack(spacing: 0) {
                    // Top Header bar
                    HStack {
                        Button(action: { showingModelSheet = true }) {
                            HStack(spacing: 6) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(ETHTheme.violet)
                                Text(brain.selectedModel.name)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(.primary)
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(
                                Capsule()
                                    .fill(.ultraThinMaterial)
                                    .overlay(Capsule().stroke(Color.white.opacity(0.15), lineWidth: 0.8))
                            )
                        }

                        Spacer()

                        Button(action: { brain.clearConversation() }) {
                            Image(systemName: "trash")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .padding(8)
                                .background(Circle().fill(.ultraThinMaterial))
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                    // Chat messages scroll view
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 16) {
                                // Brain Orb Top Hero
                                VStack(spacing: 12) {
                                    ETHBrainOrb(state: brain.isThinking ? .thinking : .idle, size: 54)
                                        .padding(.top, 12)
                                }

                                ForEach(brain.messages) { msg in
                                    BrainMessageBubble(message: msg)
                                        .id(msg.id)
                                }

                                if brain.isThinking {
                                    HStack(spacing: 8) {
                                        ProgressView()
                                            .tint(ETHTheme.violet)
                                        Text("Brain réfléchit...")
                                            .font(.system(size: 13, weight: .medium))
                                            .foregroundStyle(.secondary)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 16)
                                    .id("thinking_indicator")
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 90)
                        }
                        .onChange(of: brain.messages.count) { _ in
                            if let last = brain.messages.last {
                                withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                            }
                        }
                    }

                    // Input Bar
                    VStack(spacing: 0) {
                        Divider().background(Color.white.opacity(0.08))
                        HStack(spacing: 10) {
                            TextField("Demandez ou ordonnez à Brain...", text: $inputText, axis: .vertical)
                                .lineLimit(1...4)
                                .font(.system(size: 15))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(
                                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                                        .fill(.ultraThinMaterial)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                                .stroke(Color.white.opacity(0.12), lineWidth: 0.8)
                                        )
                                )

                            Button(action: send) {
                                ZStack {
                                    Circle()
                                        .fill(inputText.trimmingCharacters(in: .whitespaces).isEmpty ? Color.white.opacity(0.1) : ETHTheme.violet)
                                        .frame(width: 40, height: 40)
                                    Image(systemName: "arrow.up")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(Color.white)
                                }
                            }
                            .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || brain.isThinking)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(.ultraThinMaterial)
                    }
                }
            }
            .navigationTitle("Brain")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingModelSheet) {
                ModelPickerSheet(brain: brain)
            }
        }
    }

    private func send() {
        let text = inputText
        inputText = ""
        Task {
            await brain.sendMessage(text, supabase: supabase)
        }
    }
}

struct BrainMessageBubble: View {
    let message: BrainChatMessage

    var isUser: Bool { message.role == "user" }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 40) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                if !isUser, let model = message.model {
                    ETHModelBadge(model)
                }

                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundStyle(isUser ? Color.white : Color.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(isUser ? AnyShapeStyle(ETHTheme.violet.opacity(0.85)) : AnyShapeStyle(.ultraThinMaterial))
                            .overlay(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .stroke(Color.white.opacity(isUser ? 0.3 : 0.1), lineWidth: 0.8)
                            )
                    )

                if let action = message.actionSummary {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(ETHTheme.emerald)
                        Text(action)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(ETHTheme.emerald)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(ETHTheme.emerald.opacity(0.12)))
                }
            }

            if !isUser { Spacer(minLength: 40) }
        }
    }
}

struct ModelPickerSheet: View {
    @ObservedObject var brain: BrainService
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Modèles IA Disponibles")) {
                    ForEach(brain.availableModels) { model in
                        Button(action: {
                            brain.selectedModel = model
                            HapticManager.shared.selection()
                            dismiss()
                        }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(model.name)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundStyle(.primary)
                                    Text(model.provider)
                                        .font(.system(size: 13))
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if brain.selectedModel.id == model.id {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(ETHTheme.violet)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Choisir le modèle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fermer") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
