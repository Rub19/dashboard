import SwiftUI

/// Message de la boîte ETHONE (`ethone_mail_messages`, via le Worker).
struct MailMessage: Identifiable, Decodable, Hashable {
    let id: String
    let threadId: String?
    let direction: String?
    let fromAddress: String?
    let fromName: String?
    let toAddresses: [String]?
    let subject: String?
    let bodyText: String?
    let bodyHtml: String?
    private var readFlag: Bool?
    var isStarred: Bool?
    let receivedAt: Date?
    let sentAt: Date?
    let brainSummary: String?

    enum CodingKeys: String, CodingKey {
        case id, direction, subject
        case threadId = "thread_id"
        case fromAddress = "from_address"
        case fromName = "from_name"
        case toAddresses = "to_addresses"
        case bodyText = "body_text"
        case bodyHtml = "body_html"
        case readFlag = "is_read"
        case isStarred = "is_starred"
        case receivedAt = "received_at"
        case sentAt = "sent_at"
        case brainSummary = "brain_summary"
    }

    /// Une projection du Worker peut omettre `is_read` : on considère alors le message comme lu.
    var isRead: Bool {
        get { readFlag ?? true }
        set { readFlag = newValue }
    }

    var date: Date? { receivedAt ?? sentAt }
    var sender: String { (fromName?.isEmpty == false ? fromName : fromAddress) ?? "Inconnu" }
    var title: String { (subject?.isEmpty == false ? subject : nil) ?? "(Sans objet)" }

    var readableBody: String {
        if let text = bodyText, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return text }
        return HTMLText.plain(from: bodyHtml ?? "")
    }
}

enum MailFolder: String, CaseIterable, Identifiable {
    case inbox, starred, sent, archive, spam, trash
    var id: String { rawValue }

    var label: String {
        switch self {
        case .inbox: return "Réception"
        case .starred: return "Suivis"
        case .sent: return "Envoyés"
        case .archive: return "Archives"
        case .spam: return "Indésirables"
        case .trash: return "Corbeille"
        }
    }

    var symbol: String {
        switch self {
        case .inbox: return "tray.fill"
        case .starred: return "star.fill"
        case .sent: return "paperplane.fill"
        case .archive: return "archivebox.fill"
        case .spam: return "xmark.bin.fill"
        case .trash: return "trash.fill"
        }
    }
}

@MainActor
@Observable
final class MailStore {
    private let api: APIClient
    private(set) var messages: [MailMessage] = []
    private(set) var unread = 0
    private(set) var isLoading = false
    private(set) var loadedOnce = false
    var errorMessage: String?

    init(api: APIClient) { self.api = api }

    func load(folder: MailFolder) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let list: [MailMessage] = try await api.worker("api/mail/inbox", query: [
                URLQueryItem(name: "folder", value: folder.rawValue),
                URLQueryItem(name: "limit", value: "50"),
            ])
            messages = list
            unread = list.filter { !$0.isRead }.count
            loadedOnce = true
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func markRead(_ message: MailMessage, read: Bool) async {
        guard let index = messages.firstIndex(where: { $0.id == message.id }) else { return }
        let before = messages[index]
        messages[index].isRead = read
        do {
            try await api.workerVoid("api/mail/read", body: APIClient.json(["id": .string(message.id), "is_read": .bool(read)]))
            unread = messages.filter { !$0.isRead }.count
        } catch {
            if let current = messages.firstIndex(where: { $0.id == message.id }) { messages[current] = before }
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func setStarred(_ message: MailMessage, _ starred: Bool) async {
        guard let index = messages.firstIndex(where: { $0.id == message.id }) else { return }
        let before = messages[index]
        messages[index].isStarred = starred
        do {
            try await api.workerVoid("api/mail/read", body: APIClient.json(["id": .string(message.id), "is_starred": .bool(starred)]))
        } catch {
            if let current = messages.firstIndex(where: { $0.id == message.id }) { messages[current] = before }
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct MailView: View {
    @Environment(AppModel.self) private var model
    @State private var folder: MailFolder = .inbox
    @State private var selected: MailMessage?

    var body: some View {
        List {
            if let message = model.mail.errorMessage {
                Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            ForEach(model.mail.messages) { message in
                Button { selected = message } label: { row(message) }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .leading) {
                        Button {
                            Task { await model.mail.markRead(message, read: !message.isRead) }
                        } label: { Label(message.isRead ? "Non lu" : "Lu", systemImage: message.isRead ? "envelope.badge" : "envelope.open") }
                        .tint(Theme.accent)
                    }
                    .swipeActions(edge: .trailing) {
                        Button {
                            Task { await model.mail.setStarred(message, !(message.isStarred ?? false)) }
                        } label: { Label("Suivre", systemImage: "star") }
                        .tint(Theme.warning)
                    }
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if model.mail.messages.isEmpty && model.mail.loadedOnce {
                ContentUnavailableView(folder.label, systemImage: folder.symbol, description: Text("Aucun message dans ce dossier."))
            } else if model.mail.isLoading && model.mail.messages.isEmpty {
                ProgressView()
            }
        }
        .navigationTitle("Mail")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Picker("Dossier", selection: $folder) {
                        ForEach(MailFolder.allCases) { folder in Label(folder.label, systemImage: folder.symbol).tag(folder) }
                    }
                } label: { Image(systemName: folder.symbol) }
            }
        }
        .refreshable { await model.mail.load(folder: folder) }
        .task(id: folder) { await model.mail.load(folder: folder) }
        .sheet(item: $selected) { message in MailDetailView(message: message) }
    }

    private func row(_ message: MailMessage) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Circle().fill(message.isRead ? Color.clear : Theme.accent).frame(width: 9, height: 9).padding(.top, 6)
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(message.sender).font(.headline).lineLimit(1)
                    Spacer()
                    if let date = message.date { Text(date, format: .dateTime.day().month(.abbreviated)).font(.caption).foregroundStyle(.secondary) }
                }
                Text(message.title).font(.subheadline).foregroundStyle(.primary).lineLimit(1)
                Text(message.readableBody).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
            }
            if message.isStarred == true { Image(systemName: "star.fill").foregroundStyle(Theme.warning) }
        }
        .padding(.vertical, 4)
    }
}

struct MailDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let message: MailMessage

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(message.title).font(.title2.bold())
                    HStack {
                        AvatarView(url: nil, name: message.sender, size: 40)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(message.sender).font(.headline)
                            if let address = message.fromAddress { Text(address).font(.caption).foregroundStyle(.secondary) }
                        }
                        Spacer()
                        if let date = message.date { Text(date, format: .dateTime.day().month().hour().minute()).font(.caption).foregroundStyle(.secondary) }
                    }
                    if let summary = message.brainSummary, !summary.isEmpty {
                        GlassCard(tint: Theme.violet.opacity(0.3)) {
                            Label(summary, systemImage: "sparkles").font(.subheadline)
                        }
                    }
                    GlassCard { Text(message.readableBody).textSelection(.enabled) }
                }
                .padding(16)
            }
            .navigationTitle("Message")
            .ethoneScreen()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Fermer") { dismiss() } } }
            .task { if !message.isRead { await model.mail.markRead(message, read: true) } }
        }
        .presentationDetents([.large])
        .presentationBackground(.clear)
    }
}
