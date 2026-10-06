import SwiftUI

struct PollBuilderView: View {
    struct Question: Identifiable {
        let id = UUID()
        var title = ""
        var optionsText = ""
        var multiple = false

        var options: [String] { optionsText.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty } }
        var isValid: Bool { !title.trimmingCharacters(in: .whitespaces).isEmpty && options.count >= 2 }
    }

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let guild: DiscordGuild
    var onCreated: () -> Void = {}
    @State private var title = ""
    @State private var summary = ""
    @State private var anonymity = "PUBLIC"
    @State private var visibility = "LIVE"
    @State private var allowChange = true
    @State private var questions = [Question()]
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var native = false
    @State private var nativeChannelId = ""
    @State private var nativeDurationHours: Double = 24
    @State private var directory = GuildDirectory()

    private var valid: Bool {
        guard !title.trimmingCharacters(in: .whitespaces).isEmpty, let first = questions.first, first.isValid else { return false }
        if native { return !nativeChannelId.isEmpty }
        return questions.allSatisfy(\.isValid)
    }

    var body: some View {
        Form {
            Section("Sondage") {
                TextField("Titre", text: $title)
                TextField("Description (facultative)", text: $summary, axis: .vertical).lineLimit(1...4)
            }

            ForEach($questions) { $question in
                Section {
                    TextField("Question", text: $question.title)
                    TextField("Options (une par ligne, 2 minimum)", text: $question.optionsText, axis: .vertical).lineLimit(3...8)
                    Toggle("Plusieurs réponses possibles", isOn: $question.multiple)
                } header: { Text("Question \((questions.firstIndex { $0.id == question.id } ?? 0) + 1)") } footer: { if !question.isValid { Text("Une question et au moins deux options sont nécessaires.") } }
            }
            .onDelete { if !native { questions.remove(atOffsets: $0) } }

            if !native {
                Section {
                    Button("Ajouter une question", systemImage: "plus.circle.fill") { questions.append(Question()) }
                }
            }

            Section {
                Toggle("Sondage natif Discord", isOn: $native.animation())
                    .onChange(of: native) { _, isNative in
                        if isNative, questions.count > 1 { questions = Array(questions.prefix(1)) }
                    }
            } footer: {
                Text("Sondage intégré de Discord : simple et fiable, mais sans quorum, vote pondéré ni éligibilité. Un salon et une seule question, 32 jours maximum.")
            }

            if native {
                Section("Diffusion") {
                    Picker("Salon", selection: $nativeChannelId) {
                        Text("Choisir…").tag("")
                        ForEach(directory.channels) { Text("#\($0.name)").tag($0.id) }
                    }
                    Stepper(value: $nativeDurationHours, in: 1...768, step: 1) {
                        Text("Durée : \(Int(nativeDurationHours)) h")
                    }
                }
            } else {
                Section("Réglages") {
                    Picker("Votes", selection: $anonymity) {
                        Text("Publics").tag("PUBLIC")
                        Text("Anonymes").tag("ANONYMOUS")
                        Text("Totalement anonymes").tag("FULLY_ANONYMOUS")
                    }
                    Picker("Résultats visibles", selection: $visibility) {
                        Text("En direct").tag("LIVE")
                        Text("Après le vote").tag("AFTER_VOTE")
                        Text("À la fin").tag("AT_END")
                        Text("Staff seulement").tag("STAFF_ONLY")
                    }
                    Toggle("Autoriser à changer son vote", isOn: $allowChange)
                }
            }

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
        }
        .navigationTitle("Nouveau sondage")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) { Button("Créer") { Task { await submit() } }.disabled(!valid || saving) }
        }
        .task { await directory.load(guildId: guild.id, discord: model.discord) }
    }

    private func submit() async {
        saving = true
        defer { saving = false }
        let built: [JSONValue] = questions.map { question in
            let type = question.multiple ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE"
            return .object([
                "title": .string(question.title.trimmingCharacters(in: .whitespaces)),
                "type": .string(type),
                "minSelections": .number(1),
                "maxSelections": .number(question.multiple ? Double(question.options.count) : 1),
                "options": .array(question.options.map { .object(["label": .string($0)]) }),
            ])
        }
        var body: [String: JSONValue] = [
            "title": .string(title.trimmingCharacters(in: .whitespaces)),
            "description": .string(summary.trimmingCharacters(in: .whitespacesAndNewlines)),
            "type": .string(questions.first?.multiple == true ? "MULTIPLE_CHOICE" : "SINGLE_CHOICE"),
            "anonymity": .string(anonymity),
            "resultsVisibility": .string(visibility),
            "allowVoteChange": .bool(allowChange),
            "questions": .array(native ? Array(built.prefix(1)) : built),
        ]
        if native {
            body["native"] = .bool(true)
            body["channelId"] = .string(nativeChannelId)
            body["durationHours"] = .number(nativeDurationHours)
            body["allowMultiselect"] = .bool(questions.first?.multiple ?? false)
        }
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/polls", method: "POST", body: body)
            onCreated()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct FormBuilderView: View {
    struct FieldDraft: Identifiable {
        let id = UUID()
        var type = "SHORT_TEXT"
        var label = ""
        var required = true
        var placeholder = ""
        var optionsText = ""

        var needsOptions: Bool { ["SELECT", "MULTI_SELECT", "RADIO"].contains(type) }
        var options: [String] { optionsText.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty } }
        var isValid: Bool { !label.trimmingCharacters(in: .whitespaces).isEmpty && (!needsOptions || options.count >= 2) }
    }

    static let types: [(id: String, label: String)] = [
        ("SHORT_TEXT", "Texte court"), ("LONG_TEXT", "Texte long"), ("SELECT", "Liste déroulante"), ("MULTI_SELECT", "Choix multiples"),
        ("RADIO", "Choix unique"), ("CHECKBOX", "Case à cocher"), ("YES_NO", "Oui / Non"), ("NUMBER", "Nombre"), ("RATING", "Note"),
        ("EMAIL", "E-mail"), ("URL", "Lien"), ("DATE", "Date"), ("DISCORD_USER", "Membre Discord"), ("DISCORD_ROLE", "Rôle Discord"), ("DISCORD_CHANNEL", "Salon Discord"),
    ]

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let guild: DiscordGuild
    var onCreated: () -> Void = {}
    @State private var title = ""
    @State private var summary = ""
    @State private var category = "Général"
    @State private var fields = [FieldDraft()]
    @State private var saving = false
    @State private var errorMessage: String?

    private var valid: Bool { !title.trimmingCharacters(in: .whitespaces).isEmpty && !fields.isEmpty && fields.allSatisfy(\.isValid) }

    var body: some View {
        Form {
            Section("Formulaire") {
                TextField("Titre", text: $title)
                TextField("Description (facultative)", text: $summary, axis: .vertical).lineLimit(1...4)
                TextField("Catégorie", text: $category)
            }

            ForEach($fields) { $field in
                Section {
                    Picker("Type", selection: $field.type) { ForEach(Self.types, id: \.id) { Text($0.label).tag($0.id) } }
                    TextField("Question posée", text: $field.label)
                    if ["SHORT_TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "URL"].contains(field.type) {
                        TextField("Texte d'aide (facultatif)", text: $field.placeholder)
                    }
                    if field.needsOptions {
                        TextField("Options (une par ligne, 2 minimum)", text: $field.optionsText, axis: .vertical).lineLimit(3...8)
                    }
                    Toggle("Réponse obligatoire", isOn: $field.required)
                } header: { Text("Champ \((fields.firstIndex { $0.id == field.id } ?? 0) + 1)") } footer: { if !field.isValid { Text("Renseignez la question (et au moins deux options pour un choix).") } }
            }
            .onDelete { fields.remove(atOffsets: $0) }

            Section {
                Button("Ajouter un champ", systemImage: "plus.circle.fill") { fields.append(FieldDraft()) }
            } footer: {
                Text("Le formulaire est créé en brouillon : publiez-le ensuite depuis la liste des formulaires (glisser la ligne vers la gauche → Publier). Le salon du panneau et l'apparence se règlent depuis le site.")
            }

            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
        }
        .navigationTitle("Nouveau formulaire")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) { Button("Créer") { Task { await submit() } }.disabled(!valid || saving) }
        }
    }

    private func submit() async {
        saving = true
        defer { saving = false }
        let built: [JSONValue] = fields.enumerated().map { index, field in
            let options: [JSONValue] = field.options.enumerated().map { optionIndex, label in
                .object(["id": .string("opt-\(index)-\(optionIndex)"), "label": .string(label), "value": .string(label), "points": .number(0)])
            }
            return .object([
                "id": .string("field-\(index + 1)"),
                "type": .string(field.type),
                "label": .string(field.label.trimmingCharacters(in: .whitespaces)),
                "description": .string(""),
                "placeholder": .string(field.placeholder),
                "required": .bool(field.required),
                "options": .array(options),
                "sectionId": .string("sec-1"),
                "order": .number(Double(index)),
            ])
        }
        let body: [String: JSONValue] = [
            "title": .string(title.trimmingCharacters(in: .whitespaces)),
            "description": .string(summary.trimmingCharacters(in: .whitespacesAndNewlines)),
            "category": .string(category.trimmingCharacters(in: .whitespaces).isEmpty ? "Général" : category),
            "fields": .array(built),
        ]
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/forms", method: "POST", body: body)
            onCreated()
            dismiss()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

