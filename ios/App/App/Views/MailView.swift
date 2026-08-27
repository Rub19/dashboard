import SwiftUI

public struct MailMessageItem: Identifiable, Hashable {
    public let id: String
    public let sender: String
    public let subject: String
    public let snippet: String
    public let date: String
    public var isUnread: Bool

    public init(id: String = UUID().uuidString, sender: String, subject: String, snippet: String, date: String, isUnread: Bool = false) {
        self.id = id
        self.sender = sender
        self.subject = subject
        self.snippet = snippet
        self.date = date
        self.isUnread = isUnread
    }
}

public struct MailView: View {
    @State private var messages: [MailMessageItem] = [
        MailMessageItem(sender: "GitHub", subject: "[ETHONE] Déploiement Cloudflare Worker Réussi", snippet: "Le build v1.11.00 a été déployé avec succès sur raspy-fog-bf5b...", date: "18:42", isUnread: true),
        MailMessageItem(sender: "Supabase", subject: "Rapport hebdomadaire de base de données", snippet: "Votre instance Supabase est saine. Utilisation du stockage : 1.2 Mo / 1 Go.", date: "Hier", isUnread: false),
        MailMessageItem(sender: "Spotify Developer", subject: "Mise à jour des accès API", snippet: "Vos jetons OAuth PKCE sont configurés pour votre application ETHONE.", date: "24 août", isUnread: false)
    ]
    @State private var searchText = ""
    @State private var showingCompose = false

    public init() {}

    var filteredMessages: [MailMessageItem] {
        if searchText.isEmpty { return messages }
        return messages.filter {
            $0.subject.localizedCaseInsensitiveContains(searchText) ||
            $0.sender.localizedCaseInsensitiveContains(searchText) ||
            $0.snippet.localizedCaseInsensitiveContains(searchText)
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                if filteredMessages.isEmpty {
                    ETHEmptyState(
                        icon: "tray.fill",
                        title: "Boîte de réception vide",
                        description: "Tous vos e-mails ont été traités."
                    )
                } else {
                    List {
                        ForEach(filteredMessages) { msg in
                            NavigationLink(destination: MailDetailView(message: msg)) {
                                HStack(alignment: .top, spacing: 12) {
                                    Circle()
                                        .fill(msg.isUnread ? ETHTheme.emerald : Color.clear)
                                        .frame(width: 8, height: 8)
                                        .padding(.top, 6)

                                    VStack(alignment: .leading, spacing: 4) {
                                        HStack {
                                            Text(msg.sender)
                                                .font(.system(size: 15, weight: msg.isUnread ? .bold : .semibold))
                                                .foregroundStyle(.primary)
                                            Spacer()
                                            Text(msg.date)
                                                .font(.system(size: 12))
                                                .foregroundStyle(.secondary)
                                        }

                                        Text(msg.subject)
                                            .font(.system(size: 14, weight: msg.isUnread ? .semibold : .regular))
                                            .foregroundStyle(.primary)
                                            .lineLimit(1)

                                        Text(msg.snippet)
                                            .font(.system(size: 13))
                                            .foregroundStyle(.secondary)
                                            .lineLimit(2)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(.ultraThinMaterial)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.08), lineWidth: 0.5))
                            )
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    messages.removeAll { $0.id == msg.id }
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }
                                Button {
                                    if let idx = messages.firstIndex(where: { $0.id == msg.id }) {
                                        messages[idx].isUnread.toggle()
                                    }
                                } label: {
                                    Label(msg.isUnread ? "Lu" : "Non lu", systemImage: "envelope.badge")
                                }
                                .tint(ETHTheme.cyan)
                            }
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .padding(.bottom, 80)
                }
            }
            .navigationTitle("Mail")
            .searchable(text: $searchText, prompt: "Rechercher dans les mails...")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingCompose = true }) {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(ETHTheme.emerald)
                    }
                }
            }
            .sheet(isPresented: $showingCompose) {
                NavigationStack {
                    VStack(spacing: 12) {
                        TextField("À :", text: .constant(""))
                            .padding()
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        TextField("Objet :", text: .constant(""))
                            .padding()
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        TextEditor(text: .constant(""))
                            .padding()
                            .background(.ultraThinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(20)
                    .navigationTitle("Nouveau message")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Annuler") { showingCompose = false }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Envoyer") { showingCompose = false }
                        }
                    }
                }
            }
        }
    }
}

struct MailDetailView: View {
    let message: MailMessageItem
    @State private var brainSummary: String? = nil
    @State private var isSummarizing = false

    var body: some View {
        ZStack {
            AmbientBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(message.subject)
                            .font(.system(size: 20, weight: .bold))
                        HStack {
                            Text("De : \(message.sender)")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(ETHTheme.emerald)
                            Spacer()
                            Text(message.date)
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Brain Summary Button / Card
                    if let summary = brainSummary {
                        ETHGlassCard(cornerRadius: 16, padding: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(spacing: 6) {
                                    Image(systemName: "sparkles")
                                        .foregroundStyle(ETHTheme.violet)
                                    Text("Résumé IA Brain")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(ETHTheme.violet)
                                }
                                Text(summary)
                                    .font(.system(size: 13))
                                    .foregroundStyle(.primary)
                            }
                        }
                    } else {
                        Button(action: {
                            isSummarizing = true
                            HapticManager.shared.light()
                            Task {
                                try? await Task.sleep(nanoseconds: 600_000_000)
                                brainSummary = "Message clé : Confirmation de statut opérationnel. Aucune action urgente requise de votre part."
                                isSummarizing = false
                                HapticManager.shared.success()
                            }
                        }) {
                            HStack(spacing: 6) {
                                if isSummarizing {
                                    ProgressView().tint(ETHTheme.violet)
                                } else {
                                    Image(systemName: "sparkles")
                                }
                                Text(isSummarizing ? "Analyse en cours..." : "Résumer avec Brain")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(ETHTheme.violet)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(ETHTheme.violet.opacity(0.12))
                                    .overlay(Capsule().stroke(ETHTheme.violet.opacity(0.3), lineWidth: 0.8))
                            )
                        }
                        .disabled(isSummarizing)
                    }

                    Divider().background(Color.white.opacity(0.1))

                    Text(message.snippet)
                        .font(.system(size: 15))
                        .foregroundStyle(.primary)
                        .lineSpacing(6)

                    Spacer()
                }
                .padding(20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
