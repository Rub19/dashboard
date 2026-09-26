import SwiftUI

struct BrainView: View {
    @Environment(AppModel.self) private var model
    @State private var input = ""
    @FocusState private var focused: Bool

    private var chat: BrainChat { model.brain }

    private let suggestions = [
        "Que dois-je faire aujourd'hui ?",
        "Résume mes tâches ouvertes",
        "Quelles habitudes me restent à valider ?",
        "Aide-moi à organiser ma journée",
    ]

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: 14) {
                    if chat.messages.isEmpty {
                        intro
                    }
                    ForEach(chat.messages) { message in
                        bubble(message).id(message.id)
                    }
                    if chat.isThinking {
                        HStack {
                            ProgressView()
                            Text("Brain réfléchit…").foregroundStyle(.secondary)
                            Spacer()
                        }
                        .padding(14)
                        .glassEffect(.regular, in: .rect(cornerRadius: 20))
                        .id("thinking")
                    }
                    if let message = chat.errorMessage {
                        GlassCard(tint: Theme.danger.opacity(0.2)) { Text(message).font(.subheadline) }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: chat.messages.count) { _, _ in
                withAnimation { proxy.scrollTo(chat.messages.last?.id, anchor: .bottom) }
            }
        }
        .safeAreaInset(edge: .bottom) { composer }
        .navigationTitle("Brain")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Picker("Moteur", selection: Binding(get: { chat.engine }, set: { chat.setEngine($0) })) {
                        ForEach(BrainChat.Engine.supported) { engine in Text(engine.label).tag(engine) }
                    }
                    Divider()
                    Button("Nouvelle conversation", systemImage: "square.and.pencil") { chat.reset() }
                } label: { Image(systemName: "ellipsis.circle") }
            }
        }
    }

    private var intro: some View {
        VStack(spacing: 16) {
            ETHBrainOrb()
                .frame(width: 110, height: 110)
            Text("Posez une question sur vos tâches, votre agenda ou vos habitudes.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            if chat.engine == .device, let reason = chat.deviceUnavailableReason {
                Text(reason).font(.footnote).foregroundStyle(Theme.warning).multilineTextAlignment(.center)
            }
            VStack(spacing: 10) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button {
                        send(suggestion)
                    } label: {
                        Text(suggestion).frame(maxWidth: .infinity).padding(.vertical, 6)
                    }
                    .buttonStyle(.glass)
                }
            }
        }
        .padding(.top, 20)
    }

    private func bubble(_ message: ChatMessage) -> some View {
        HStack {
            if message.role == .user { Spacer(minLength: 48) }
            Text(message.text)
                .textSelection(.enabled)
                .padding(14)
                .glassEffect(
                    message.role == .user ? Glass.regular.tint(Theme.accent.opacity(0.45)) : Glass.regular,
                    in: .rect(cornerRadius: 22)
                )
            if message.role == .assistant { Spacer(minLength: 48) }
        }
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("Demandez à Brain…", text: $input, axis: .vertical)
                .lineLimit(1...5)
                .focused($focused)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .glassEffect(.regular, in: .rect(cornerRadius: 24))
            Button {
                send(input)
            } label: {
                Image(systemName: "arrow.up").fontWeight(.bold).padding(6)
            }
            .buttonStyle(.glassProminent)
            .buttonBorderShape(.circle)
            .disabled(chat.isThinking || input.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    private func send(_ text: String) {
        input = ""
        let context = model.brainContext()
        Task { await chat.send(text, context: context) }
    }
}
