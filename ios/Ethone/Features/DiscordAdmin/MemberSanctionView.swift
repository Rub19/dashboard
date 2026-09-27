import SwiftUI

/// Fiche d'un membre et sanctions (avertissement, exclusion temporaire, expulsion, bannissement) : crée une « case » de modération
/// dans le bot, comme le panneau du site. Chaque envoi porte une clé d'idempotence : un double appui n'applique pas deux fois la sanction.
struct MemberSanctionView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let member: JSONValue
    @State private var action = "WARN"
    @State private var reason = ""
    @State private var duration = 3600
    @State private var confirming = false
    @State private var sending = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    private static let actions: [(id: String, label: String)] = [
        ("WARN", "Avertissement"), ("TIMEOUT", "Exclusion temporaire"), ("KICK", "Expulsion"), ("BAN", "Bannissement"),
    ]
    private static let durations: [(seconds: Int, label: String)] = [
        (300, "5 minutes"), (3600, "1 heure"), (86_400, "1 jour"), (604_800, "7 jours"), (2_419_200, "28 jours"),
    ]

    private var name: String { member["displayName"]?.stringValue ?? member["username"]?.stringValue ?? "Membre" }
    private var isBot: Bool { member["bot"]?.boolValue == true }

    var body: some View {
        Form {
            Section {
                LabeledContent("Membre", value: name)
                LabeledContent("Pseudo", value: "@\(member["username"]?.stringValue ?? "")")
                if let joined = member["joinedAt"]?.stringValue.flatMap(ISODate.parse) {
                    LabeledContent("A rejoint", value: joined.formatted(date: .abbreviated, time: .omitted))
                }
                if let created = member["createdAt"]?.stringValue.flatMap(ISODate.parse) {
                    LabeledContent("Compte créé", value: created.formatted(date: .abbreviated, time: .omitted))
                }
                if let risk = member["riskScore"]?.doubleValue { LabeledContent("Score de risque", value: "\(Int(risk))") }
                if let roles = member["roles"]?.arrayValue, !roles.isEmpty {
                    LabeledContent("Rôles", value: roles.compactMap { $0["name"]?.stringValue }.joined(separator: ", "))
                }
            }

            Section {
                Picker("Action", selection: $action) { ForEach(Self.actions, id: \.id) { Text($0.label).tag($0.id) } }
                if action == "TIMEOUT" {
                    Picker("Durée", selection: $duration) { ForEach(Self.durations, id: \.seconds) { Text($0.label).tag($0.seconds) } }
                }
                TextField("Motif (visible dans les journaux)", text: $reason, axis: .vertical).lineLimit(2...5)
                Button(role: .destructive) {
                    confirming = true
                } label: {
                    HStack { Text("Appliquer la sanction"); if sending { Spacer(); ProgressView() } }
                }
                .disabled(sending || reason.trimmingCharacters(in: .whitespaces).isEmpty)
            } header: { Text("Sanction") } footer: {
                if isBot { Text("Ce membre est un bot.") }
                else { Text("Un motif est obligatoire. La sanction est enregistrée dans les cases de modération du serveur.") }
            }

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success) }
        }
        .navigationTitle(name)
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("\(Self.label(action)) : \(name) ?", isPresented: $confirming, titleVisibility: .visible) {
            Button("Confirmer", role: .destructive) { Task { await apply() } }
        } message: { Text("L'action est appliquée immédiatement sur Discord.") }
    }

    private static func label(_ id: String) -> String { actions.first { $0.id == id }?.label ?? id }

    private func apply() async {
        guard let userId = member["id"]?.stringValue else { return }
        sending = true
        defer { sending = false }
        var body: [String: JSONValue] = [
            "userId": .string(userId),
            "userTag": .string(member["username"]?.stringValue ?? name),
            "action": .string(action),
            "reason": .string(reason.trimmingCharacters(in: .whitespacesAndNewlines)),
            "idempotencyKey": .string(UUID().uuidString),
        ]
        if action == "TIMEOUT" { body["durationSeconds"] = .number(Double(duration)) }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/moderation/cases", method: "POST", body: body)
            infoMessage = "Sanction appliquée."
            errorMessage = nil
            reason = ""
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
