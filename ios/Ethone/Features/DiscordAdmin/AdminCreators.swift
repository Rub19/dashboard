import SwiftUI

/// Formulaire de création guidé pour une ressource du bot (sondage, événement, rappel, tag, commande, article de boutique…).
/// Chaque formulaire construit le corps attendu par la route de création du bot (mêmes schémas que le panneau du site).
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
        let directory: GuildDirectory

        func text(_ key: String) -> String { values[key, default: ""].trimmingCharacters(in: .whitespacesAndNewlines) }
        func number(_ key: String) -> Double { Double(text(key).replacingOccurrences(of: ",", with: ".")) ?? 0 }
        func flag(_ key: String) -> Bool { values[key] == "true" }
        func date(_ key: String) -> Date { ISODate.parse(values[key, default: ""]) ?? Date() }
        func roleName(_ id: String) -> String { directory.roles.first { $0.id == id }?.name ?? "Rôle" }
    }

    let title: String
    /// `{clé}` est remplacé par la valeur du champ (ex. `/{name}` pour les tags).
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
        case "polls": [poll]
        case "events": [event]
        case "economy": [shopItem]
        case "leveling": [levelReward]
        case "giveaways": [giveaway]
        default: []
        }
    }

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
            .init(key: "response", label: "Réponse du bot", kind: .multiline),
        ],
        build: { c in
            [
                "name": .string(c.text("name")),
                "description": .string(c.text("description").isEmpty ? "Commande personnalisée" : c.text("description")),
                "triggerType": .string("both"),
                "enabled": .bool(true),
                "defaultActions": .array([.object(["type": .string("send_response"), "response": .object(["content": .string(c.text("response"))])])]),
            ]
        }
    )

    static let poll = CreateSpec(
        title: "Nouveau sondage", path: "/",
        fields: [
            .init(key: "title", label: "Titre"),
            .init(key: "description", label: "Description", kind: .multiline, required: false),
            .init(key: "question", label: "Question"),
            .init(key: "options", label: "Options (une par ligne, 2 minimum)", kind: .multiline),
        ],
        build: { c in
            let options = c.text("options").components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            return [
                "title": .string(c.text("title")),
                "description": .string(c.text("description")),
                "type": .string("SINGLE_CHOICE"),
                "questions": .array([.object(["title": .string(c.text("question")), "options": .array(options.map { .object(["label": .string($0)]) })])]),
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

/// Formulaire généré à partir d'un `CreateSpec`.
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
        let context = CreateSpec.Context(values: values, directory: directory)
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
