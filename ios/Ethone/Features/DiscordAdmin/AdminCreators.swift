import SwiftUI

struct CreateSpec {
    enum Kind {
        case text, multiline, number, toggle, channel, role, dateTime
        case choice([(id: String, label: String)])
    }

    struct Field {
        let key: String
        let label: String
        var kind: Kind = .text
        var required = true
        var initial = ""
        var hint: String? = nil
    }

    struct Context {
        let values: [String: String]
        let roleNames: [String: String]

        func text(_ key: String) -> String { values[key, default: ""].trimmingCharacters(in: .whitespacesAndNewlines) }
        func number(_ key: String) -> Double { Double(text(key).replacingOccurrences(of: ",", with: ".")) ?? 0 }
        func flag(_ key: String) -> Bool { values[key] == "true" }
        func date(_ key: String) -> Date { ISODate.parse(values[key, default: ""]) ?? Date() }
        func roleName(_ id: String) -> String { roleNames[id] ?? "Rôle" }
    }

    let title: String
    let path: String
    var method = "POST"
    let fields: [Field]
    let build: (Context) -> [String: JSONValue]
}

enum AdminCreators {
    static func creators(for moduleId: String) -> [CreateSpec] {
        switch moduleId {
        case "reminders": [reminder]
        case "tags": [tag]
        case "custom-commands": [command]
        case "events": [event]
        case "economy": [shopItem]
        case "leveling": [levelReward]
        case "invites": [inviteReward]
        case "giveaways": [giveaway]
        case "backups": [backup]
        case "server": [channel, role]
        case "secure-roles": [secureRole]
        case "streamers": [streamer]
        default: []
        }
    }

    static let streamer = CreateSpec(
        title: "Suivre un nouveau streamer", path: "",
        fields: [
            .init(key: "platform", label: "Plateforme", kind: .choice([("twitch", "Twitch"), ("youtube", "YouTube"), ("kick", "Kick")]), initial: "twitch"),
            .init(key: "username", label: "Pseudo du streamer", hint: "Nom d'utilisateur sur la plateforme"),
            .init(key: "channelId", label: "Salon d'annonce", kind: .channel),
            .init(key: "pingMode", label: "Mode de notification", kind: .choice([("default", "Par défaut du serveur"), ("none", "Aucun ping"), ("here", "@here"), ("everyone", "@everyone"), ("role", "Rôle spécifique")]), initial: "default"),
            .init(key: "pingRoleId", label: "Rôle à notifier (si rôle spécifique)", kind: .role, required: false),
            .init(key: "minViewers", label: "Spectateurs minimum", kind: .number, required: false, initial: "0"),
        ],
        build: { c in
            var payload: [String: JSONValue] = [
                "platform": .string(c.text("platform")),
                "username": .string(c.text("username")),
                "channelId": c.text("channelId").isEmpty ? .null : .string(c.text("channelId")),
                "pingMode": .string(c.text("pingMode")),
            ]
            if !c.text("pingRoleId").isEmpty {
                payload["pingRoleId"] = .string(c.text("pingRoleId"))
            }
            if c.number("minViewers") > 0 {
                payload["minViewers"] = .number(c.number("minViewers"))
            }
            return payload
        }
    )

    static let secureRole = CreateSpec(
        title: "Sécuriser un rôle", path: "/roles",
        fields: [
            .init(key: "roleId", label: "Rôle à sécuriser", kind: .role),
        ],
        build: { c in ["roleId": .string(c.text("roleId"))] }
    )

    static let reminder = CreateSpec(
        title: "Nouveau rappel", path: "/",
        fields: [
            .init(key: "in", label: "Dans combien de temps ?", initial: "1h", hint: "Ex. 10m, 2h, 1d, 1h30m (minimum 30 s)"),
            .init(key: "message", label: "Message", kind: .multiline),
            .init(key: "channelId", label: "Salon", kind: .channel),
            .init(key: "recurrence", label: "Répétition", kind: .choice([("none", "Aucune"), ("daily", "Tous les jours"), ("weekly", "Toutes les semaines")]), initial: "none"),
        ],
        build: { c in ["in": .string(c.text("in")), "message": .string(c.text("message")), "channelId": .string(c.text("channelId")), "recurrence": .string(c.text("recurrence"))] }
    )

    static let tag = CreateSpec(
        title: "Nouveau tag", path: "/{name}", method: "PUT",
        fields: [
            .init(key: "name", label: "Nom", hint: "Lettres minuscules, chiffres, _ et - (32 max.)"),
            .init(key: "content", label: "Contenu", kind: .multiline, hint: "2000 caractères maximum"),
        ],
        build: { c in ["content": .string(c.text("content"))] }
    )

    static let command = CreateSpec(
        title: "Nouvelle commande", path: "/create",
        fields: [
            .init(key: "name", label: "Nom de la commande", hint: "Lettres, chiffres, _ et -"),
            .init(key: "description", label: "Description", required: false, initial: "Commande personnalisée"),
            .init(key: "response", label: "Message (facultatif si embed)", kind: .multiline, required: false),
            .init(key: "embedTitle", label: "Embed : titre", required: false),
            .init(key: "embedDescription", label: "Embed : texte", kind: .multiline, required: false),
            .init(key: "embedColor", label: "Embed : couleur", kind: .choice([("#6366F1", "Indigo"), ("#EF4444", "Rouge"), ("#F59E0B", "Ambre"), ("#10B981", "Vert"), ("#3B82F6", "Bleu"), ("#EC4899", "Rose"), ("#FFFFFF", "Blanc")]), required: false, initial: "#6366F1"),
            .init(key: "embedImage", label: "Embed : image (lien)", required: false),
            .init(key: "embedFooter", label: "Embed : pied de page", required: false),
            .init(key: "embedFields", label: "Embed : champs (un par ligne : Nom | Valeur)", kind: .multiline, required: false),
            .init(key: "buttonLabel", label: "Bouton lien : texte", required: false),
            .init(key: "buttonUrl", label: "Bouton lien : adresse (https://…)", required: false),
        ],
        build: { c in
            var response: [String: JSONValue] = [:]
            if !c.text("response").isEmpty { response["content"] = .string(c.text("response")) }
            let hasEmbed = !c.text("embedTitle").isEmpty || !c.text("embedDescription").isEmpty || !c.text("embedImage").isEmpty || !c.text("embedFields").isEmpty
            if hasEmbed {
                var embed: [String: JSONValue] = ["color": .string(c.text("embedColor").isEmpty ? "#6366F1" : c.text("embedColor"))]
                if !c.text("embedTitle").isEmpty { embed["title"] = .string(c.text("embedTitle")) }
                if !c.text("embedDescription").isEmpty { embed["description"] = .string(c.text("embedDescription")) }
                if !c.text("embedImage").isEmpty { embed["imageUrl"] = .string(c.text("embedImage")) }
                if !c.text("embedFooter").isEmpty { embed["footerText"] = .string(c.text("embedFooter")) }
                let lines = c.text("embedFields").components(separatedBy: .newlines)
                let fields: [JSONValue] = lines.compactMap { line in
                    let parts = line.split(separator: "|", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
                    guard parts.count == 2, !parts[0].isEmpty, !parts[1].isEmpty else { return nil }
                    return .object(["name": .string(parts[0]), "value": .string(parts[1]), "inline": .bool(false)])
                }
                if !fields.isEmpty { embed["fields"] = .array(fields) }
                response["embed"] = .object(embed)
            }
            if !c.text("buttonLabel").isEmpty, c.text("buttonUrl").lowercased().hasPrefix("http") {
                response["buttons"] = .array([.object(["label": .string(c.text("buttonLabel")), "url": .string(c.text("buttonUrl")), "style": .string("link")])])
            }
            if response.isEmpty { response["content"] = .string("(réponse vide)") }
            return [
                "name": .string(c.text("name")),
                "description": .string(c.text("description").isEmpty ? "Commande personnalisée" : c.text("description")),
                "triggerType": .string("both"),
                "enabled": .bool(true),
                "defaultActions": .array([.object(["type": .string("send_response"), "response": .object(response)])]),
            ]
        }
    )

    static let event = CreateSpec(
        title: "Nouvel événement", path: "/",
        fields: [
            .init(key: "title", label: "Titre"),
            .init(key: "description", label: "Description", kind: .multiline, required: false),
            .init(key: "startDate", label: "Début", kind: .dateTime),
            .init(key: "durationMinutes", label: "Durée (minutes)", kind: .number, initial: "120"),
            .init(key: "syncToDiscord", label: "Créer aussi l'événement Discord", kind: .toggle, required: false, initial: "false"),
        ],
        build: { c in
            let start = c.date("startDate")
            let minutes = max(15, c.number("durationMinutes"))
            return [
                "title": .string(c.text("title")),
                "description": .string(c.text("description")),
                "startDate": .string(ISODate.string(start)),
                "endDate": .string(ISODate.string(start.addingTimeInterval(minutes * 60))),
                "durationMinutes": .number(minutes),
                "syncToDiscord": .bool(c.flag("syncToDiscord")),
            ]
        }
    )

    static let shopItem = CreateSpec(
        title: "Nouvel article", path: "/shop",
        fields: [
            .init(key: "roleId", label: "Rôle vendu", kind: .role),
            .init(key: "label", label: "Nom de l'article"),
            .init(key: "description", label: "Description", required: false),
            .init(key: "price", label: "Prix", kind: .number, initial: "100"),
        ],
        build: { c in
            [
                "roleId": .string(c.text("roleId")), "roleName": .string(c.roleName(c.text("roleId"))),
                "label": .string(c.text("label")), "description": .string(c.text("description")),
                "price": .number(max(0, c.number("price"))), "enabled": .bool(true),
            ]
        }
    )

    static let levelReward = CreateSpec(
        title: "Nouvelle récompense", path: "/rewards",
        fields: [
            .init(key: "level", label: "Niveau", kind: .number, initial: "5"),
            .init(key: "roleId", label: "Rôle attribué", kind: .role),
            .init(key: "message", label: "Message (facultatif)", kind: .multiline, required: false),
        ],
        build: { c in
            [
                "id": .string("reward-\(UUID().uuidString.prefix(8).lowercased())"),
                "level": .number(max(1, c.number("level"))), "roleId": .string(c.text("roleId")),
                "message": c.text("message").isEmpty ? .null : .string(c.text("message")), "enabled": .bool(true),
            ]
        }
    )

    static let inviteReward = CreateSpec(
        title: "Nouvelle récompense d'invitations", path: "/rewards",
        fields: [
            .init(key: "name", label: "Nom de la récompense"),
            .init(key: "requiredValidInvites", label: "Invitations valides requises", kind: .number, initial: "5"),
            .init(key: "roleId", label: "Rôle attribué (facultatif)", kind: .role, required: false),
            .init(key: "xpAmount", label: "XP offerts (facultatif)", kind: .number, required: false, initial: "0"),
            .init(key: "message", label: "Message (facultatif)", kind: .multiline, required: false),
        ],
        build: { c in
            var body: [String: JSONValue] = [
                "name": .string(c.text("name")), "requiredValidInvites": .number(max(1, c.number("requiredValidInvites"))),
                "xpAmount": .number(max(0, c.number("xpAmount"))),
            ]
            if !c.text("roleId").isEmpty { body["roleId"] = .string(c.text("roleId")); body["roleName"] = .string(c.roleName(c.text("roleId"))) }
            if !c.text("message").isEmpty { body["message"] = .string(c.text("message")) }
            return body
        }
    )

    static let channel = CreateSpec(
        title: "Nouveau salon", path: "/channels",
        fields: [
            .init(key: "name", label: "Nom du salon", hint: "Sans espaces : Discord les remplace par des tirets."),
            .init(key: "type", label: "Type", kind: .choice([("0", "Textuel"), ("2", "Vocal"), ("4", "Catégorie"), ("5", "Annonces"), ("13", "Scène"), ("15", "Forum")]), initial: "0"),
            .init(key: "topic", label: "Sujet (facultatif)", required: false),
            .init(key: "isPrivate", label: "Salon privé (invisible pour @everyone)", kind: .toggle, required: false, initial: "false"),
            .init(key: "nsfw", label: "Contenu sensible (NSFW)", kind: .toggle, required: false, initial: "false"),
        ],
        build: { c in
            [
                "name": .string(c.text("name").lowercased().replacingOccurrences(of: " ", with: "-")),
                "type": .number(c.number("type")), "topic": .string(c.text("topic")),
                "isPrivate": .bool(c.flag("isPrivate")), "nsfw": .bool(c.flag("nsfw")),
            ]
        }
    )

    static let role = CreateSpec(
        title: "Nouveau rôle", path: "/roles",
        fields: [
            .init(key: "name", label: "Nom du rôle"),
            .init(key: "color", label: "Couleur", kind: .choice([("#99AAB5", "Gris"), ("#EF4444", "Rouge"), ("#F59E0B", "Ambre"), ("#10B981", "Vert"), ("#3B82F6", "Bleu"), ("#8B5CF6", "Violet"), ("#EC4899", "Rose")]), initial: "#99AAB5"),
            .init(key: "hoist", label: "Afficher séparément dans la liste des membres", kind: .toggle, required: false, initial: "false"),
            .init(key: "mentionable", label: "Mentionnable par tous", kind: .toggle, required: false, initial: "false"),
        ],
        build: { c in
            ["name": .string(c.text("name")), "color": .string(c.text("color")), "hoist": .bool(c.flag("hoist")), "mentionable": .bool(c.flag("mentionable"))]
        }
    )

    static let backup = CreateSpec(
        title: "Nouvelle sauvegarde", path: "/",
        fields: [
            .init(key: "name", label: "Nom de la sauvegarde"),
            .init(key: "description", label: "Description", required: false),
            .init(key: "isProtected", label: "Protéger contre la suppression", kind: .toggle, required: false, initial: "false"),
        ],
        build: { c in
            [
                "name": .string(c.text("name")), "description": .string(c.text("description")), "type": .string("FULL"),
                "isProtected": .bool(c.flag("isProtected")), "idempotencyKey": .string(UUID().uuidString),
            ]
        }
    )

    static let giveaway = CreateSpec(
        title: "Nouveau giveaway", path: "/create",
        fields: [
            .init(key: "channelId", label: "Salon", kind: .channel),
            .init(key: "prize", label: "Lot"),
            .init(key: "description", label: "Description", kind: .multiline, required: false),
            .init(key: "winnerCount", label: "Nombre de gagnants", kind: .number, initial: "1"),
            .init(key: "durationMinutes", label: "Durée", kind: .choice([("60", "1 heure"), ("360", "6 heures"), ("1440", "1 jour"), ("4320", "3 jours"), ("10080", "7 jours")]), initial: "1440"),
        ],
        build: { c in
            [
                "channelId": .string(c.text("channelId")), "prize": .string(c.text("prize")), "description": .string(c.text("description")),
                "winnerCount": .number(max(1, c.number("winnerCount"))), "durationMinutes": .number(c.number("durationMinutes")),
            ]
        }
    )
}

struct CreateFormView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let guild: DiscordGuild
    let moduleBase: String
    let spec: CreateSpec
    let directory: GuildDirectory
    var onCreated: () -> Void = {}
    @State private var values: [String: String] = [:]
    @State private var saving = false
    @State private var errorMessage: String?

    private var missing: Bool {
        spec.fields.contains { $0.required && values[$0.key, default: ""].trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isToggle($0) }
    }

    private func isToggle(_ field: CreateSpec.Field) -> Bool {
        if case .toggle = field.kind { return true }
        return false
    }

    var body: some View {
        Form {
            ForEach(spec.fields, id: \.key) { field in
                Section {
                    control(field)
                } header: { Text(field.label) } footer: {
                    if let hint = field.hint { Text(hint) }
                }
            }
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
        }
        .navigationTitle(spec.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Créer") { Task { await submit() } }.disabled(missing || saving)
            }
        }
        .onAppear {
            for field in spec.fields where values[field.key] == nil {
                if case .dateTime = field.kind { values[field.key] = ISODate.string(Date().addingTimeInterval(3600)) } else { values[field.key] = field.initial }
            }
        }
        .task { await directory.load(guildId: guild.id, discord: model.discord) }
    }

    @ViewBuilder
    private func control(_ field: CreateSpec.Field) -> some View {
        let binding = Binding(get: { values[field.key, default: ""] }, set: { values[field.key] = $0 })
        switch field.kind {
        case .text: TextField(field.label, text: binding).textInputAutocapitalization(.never)
        case .multiline: TextField(field.label, text: binding, axis: .vertical).lineLimit(3...8)
        case .number: TextField(field.label, text: binding).keyboardType(.decimalPad)
        case .toggle: Toggle(field.label, isOn: Binding(get: { values[field.key] == "true" }, set: { values[field.key] = $0 ? "true" : "false" }))
        case .channel:
            Picker(field.label, selection: binding) {
                Text("Choisir…").tag("")
                ForEach(directory.channels) { Text("#\($0.name)").tag($0.id) }
            }
        case .role:
            Picker(field.label, selection: binding) {
                Text("Choisir…").tag("")
                ForEach(directory.roles) { Text("@\($0.name)").tag($0.id) }
            }
        case .dateTime:
            DatePicker(field.label, selection: Binding(
                get: { ISODate.parse(values[field.key, default: ""]) ?? Date() },
                set: { values[field.key] = ISODate.string($0) }
            ))
        case .choice(let options):
            Picker(field.label, selection: binding) { ForEach(options, id: \.id) { Text($0.label).tag($0.id) } }
        }
    }

    private func submit() async {
        saving = true
        defer { saving = false }
        var path = spec.path
        for field in spec.fields {
            let raw = values[field.key, default: ""].trimmingCharacters(in: .whitespaces).lowercased()
            path = path.replacingOccurrences(of: "{\(field.key)}", with: raw.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? raw)
        }
        let context = CreateSpec.Context(values: values, roleNames: Dictionary(directory.roles.map { ($0.id, $0.name) }, uniquingKeysWith: { first, _ in first }))
        do {
            let root = moduleBase.replacingOccurrences(of: "{g}", with: guild.id)
            _ = try await model.discord.call("api/" + root + (path == "/" ? "" : path), method: spec.method, body: spec.build(context))
            onCreated()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

