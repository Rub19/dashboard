import SwiftUI

extension JSONValue {
    var objectValue: [String: JSONValue]? {
        if case .object(let value) = self { return value }
        return nil
    }

    var isScalar: Bool {
        switch self {
        case .object, .array: false
        default: true
        }
    }

    var displayText: String {
        switch self {
        case .null: return "—"
        case .bool(let value): return value ? "Oui" : "Non"
        case .number(let value): return value == value.rounded() && abs(value) < 1e15 ? String(Int(value)) : String(format: "%.2f", value)
        case .string(let value):
            if value.count >= 19, value.contains("T"), let date = ISODate.parse(value) { return date.formatted(date: .abbreviated, time: .shortened) }
            return value
        case .array(let value): return "\(value.count) élément(s)"
        case .object(let value): return "\(value.count) champ(s)"
        }
    }

    private func value(atPath path: String) -> JSONValue? {
        var current = self
        for segment in path.split(separator: ".") {
            guard case .object(let dictionary) = current, let next = dictionary[String(segment)] else { return nil }
            current = next
        }
        return current
    }

    static func firstArray(in response: JSONValue, key: String? = nil) -> [JSONValue]? {
        if let array = response.arrayValue { return array }
        guard case .object(let dictionary) = response else { return nil }
        if let key {
            if let array = dictionary[key]?.arrayValue { return array }
            if key.contains("."), let array = response.value(atPath: key)?.arrayValue { return array }
        }
        for usual in ["items", "list", "entries", "data", "results", "rows"] {
            if let array = dictionary[usual]?.arrayValue { return array }
        }
        for name in dictionary.keys.sorted() { if let array = dictionary[name]?.arrayValue { return array } }
        return nil
    }

    static func config(in response: JSONValue) -> (value: JSONValue, isWrapped: Bool) {
        guard case .object(var dictionary) = response else { return (response, false) }
        for key in ["config", "settings", "data"] {
            if let inner = dictionary[key], case .object = inner { return (inner, true) }
        }
        dictionary.removeValue(forKey: "success")
        dictionary.removeValue(forKey: "error")
        return (.object(dictionary), false)
    }
}

enum AdminText {
    static func label(_ key: String) -> String {
        var result = ""
        for character in key {
            if character.isUppercase, !result.isEmpty { result.append(" ") }
            result.append(character.isUppercase ? Character(character.lowercased()) : character)
        }
        return result.prefix(1).uppercased() + result.dropFirst()
    }

    static let titleKeys = ["title", "name", "label", "prize", "userTag", "tag", "username", "displayName", "guildName", "command", "question", "topic", "preview", "text", "id"]
    static let subtitleKeys = ["status", "type", "category", "description", "userTag", "authorTag", "channelName", "action", "level", "xp", "balance", "score", "count", "weight", "enabled", "secured", "isIgnored", "value"]

    static func title(of item: JSONValue) -> String {
        guard case .object(let dictionary) = item else { return item.displayText }
        for key in titleKeys {
            if let text = dictionary[key], text.isScalar, text != .null {
                let shown = text.displayText
                if !shown.isEmpty { return shown }
            }
        }
        return dictionary.keys.sorted().first.map { "\(label($0)) : \(dictionary[$0]?.displayText ?? "")" } ?? "Élément"
    }

    static func subtitle(of item: JSONValue) -> String {
        guard case .object(let dictionary) = item else { return "" }
        let used = titleKeys.first { dictionary[$0]?.isScalar == true && dictionary[$0] != .null }
        var parts: [String] = []
        for key in subtitleKeys where key != used {
            if let value = dictionary[key], value.isScalar, value != .null {
                let shown = value.displayText
                if !shown.isEmpty, shown.count <= 60 { parts.append("\(label(key)) : \(shown)") }
            }
            if parts.count == 3 { break }
        }
        return parts.joined(separator: " · ")
    }

    static func date(of item: JSONValue) -> Date? {
        guard case .object(let dictionary) = item else { return nil }
        for key in dictionary.keys.sorted() where key.hasSuffix("At") || key == "timestamp" || key == "date" {
            if let raw = dictionary[key]?.stringValue, let date = ISODate.parse(raw) { return date }
        }
        return nil
    }
}

@MainActor
@Observable
final class GuildDirectory {
    struct Entry: Identifiable, Hashable { let id: String; let name: String }
    private(set) var channels: [Entry] = []
    private(set) var roles: [Entry] = []
    private var loaded = false

    func load(guildId: String, discord: DiscordStore) async {
        guard !loaded else { return }
        loaded = true
        func entries(_ response: JSONValue?, key: String) -> [Entry] {
            guard let response, let array = JSONValue.firstArray(in: response, key: key) else { return [] }
            return array.compactMap { item in
                guard let id = item["id"]?.stringValue, let name = item["name"]?.stringValue else { return nil }
                return Entry(id: id, name: name)
            }
        }
        channels = entries(try? await discord.call("api/guilds/\(guildId)/server/channels"), key: "channels")
        roles = entries(try? await discord.call("api/guilds/\(guildId)/server/roles"), key: "roles")
    }

    func name(_ id: String, roles useRoles: Bool) -> String {
        (useRoles ? roles : channels).first { $0.id == id }?.name ?? id
    }
}

struct DiscordModuleHubView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild

    var body: some View {
        List {
            ForEach(AdminCatalog.groups, id: \.self) { group in
                let modules = AdminCatalog.all.filter { $0.group == group }
                if !modules.isEmpty {
                    Section {
                        ForEach(modules) { spec in
                            NavigationLink { ModuleScreen(guild: guild, spec: spec) } label: { Label(spec.title, systemImage: spec.symbol) }
                        }
                    } header: { Text(group).sectionTitle() } footer: {
                        if group == AdminCatalog.groups.last { Text("Réservé au propriétaire du bot : le bot répond « accès refusé » aux autres comptes.") }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Tous les modules")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }
}

struct ModuleScreen: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let spec: AdminModuleSpec
    @State private var overview: JSONValue?
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var pendingAction: AdminModuleSpec.ActionSpec?
    @State private var directory = GuildDirectory()

    private var facts: [(label: String, value: String)] {
        guard case .object(let dictionary)? = overview else { return [] }
        var result: [(String, String)] = []
        for key in dictionary.keys.sorted() {
            guard let value = dictionary[key] else { continue }
            if value.isScalar, value != .null {
                result.append((AdminText.label(key), value.displayText))
            } else if case .object(let inner) = value {
                for innerKey in inner.keys.sorted() where inner[innerKey]?.isScalar == true && inner[innerKey] != .null {
                    result.append(("\(AdminText.label(key)) · \(AdminText.label(innerKey))", inner[innerKey]!.displayText))
                }
            } else if case .array(let array) = value {
                result.append((AdminText.label(key), "\(array.count)"))
            }
        }
        return Array(result.prefix(30))
    }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            if !facts.isEmpty {
                Section {
                    ForEach(facts, id: \.label) { LabeledContent($0.label, value: $0.value) }
                } header: { Text("Vue d'ensemble").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if spec.id == "polls" || spec.id == "forms" {
                Section {
                    if spec.id == "polls" {
                        NavigationLink { PollBuilderView(guild: guild) { Task { await load() } } } label: { Label("Nouveau sondage", systemImage: "plus.circle.fill") }
                    } else {
                        NavigationLink { FormBuilderView(guild: guild) { Task { await load() } } } label: { Label("Nouveau formulaire", systemImage: "plus.circle.fill") }
                    }
                } header: { Text("Créer").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if spec.id == "music" {
                Section {
                    NavigationLink { MusicPlayerView(guild: guild) } label: { Label("Lecteur", systemImage: "play.circle.fill") }
                } header: { Text("Lecteur").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !AdminCreators.creators(for: spec.id).isEmpty {
                Section {
                    ForEach(AdminCreators.creators(for: spec.id), id: \.title) { creator in
                        NavigationLink {
                            CreateFormView(guild: guild, moduleBase: spec.base ?? "guilds/{g}/\(spec.id)", spec: creator, directory: directory) { Task { await load() } }
                        } label: { Label(creator.title, systemImage: "plus.circle.fill") }
                    }
                } header: { Text("Créer").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !spec.configs.isEmpty {
                Section {
                    ForEach(spec.configs, id: \.get) { config in
                        NavigationLink { ConfigEditorView(guild: guild, spec: spec, config: config, directory: directory) } label: { Label(config.title, systemImage: "slider.horizontal.3") }
                    }
                } header: { Text("Réglages").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !spec.lists.isEmpty {
                Section {
                    ForEach(spec.lists, id: \.path) { list in
                        NavigationLink { GenericListView(guild: guild, spec: spec, list: list) } label: { Label(list.title, systemImage: "list.bullet") }
                    }
                } header: { Text("Contenu").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }

            if !spec.actions.isEmpty {
                Section {
                    ForEach(spec.actions, id: \.path) { action in
                        Button(role: action.destructive ? .destructive : nil) {
                            if action.destructive { pendingAction = action } else { Task { await run(action) } }
                        } label: { Label(action.title, systemImage: action.symbol) }
                    }
                } header: { Text("Actions").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && overview == nil && spec.overview != nil { ProgressView() } }
        .navigationTitle(spec.title)
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .confirmationDialog(pendingAction?.title ?? "", isPresented: Binding(get: { pendingAction != nil }, set: { if !$0 { pendingAction = nil } }), titleVisibility: .visible, presenting: pendingAction) { action in
            Button("Confirmer", role: .destructive) { Task { await run(action) } }
        } message: { _ in Text("Cette action s'applique immédiatement.") }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let path = spec.overview else { return }
        do {
            overview = try await model.discord.call(spec.url(path, guildId: guild.id))
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func run(_ action: AdminModuleSpec.ActionSpec) async {
        do {
            _ = try await model.discord.call(spec.url(action.path, guildId: guild.id), method: action.method, body: action.body)
            infoMessage = "« \(action.title) » effectué."
            errorMessage = nil
            await load()
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct GenericListView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let spec: AdminModuleSpec
    let list: AdminModuleSpec.ListSpec
    @State private var items: [JSONValue] = []
    @State private var single: JSONValue?
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var infoMessage: String?
    @State private var pending: (row: JSONValue, action: AdminModuleSpec.RowAction)?
    @State private var promptTarget: (row: JSONValue, action: AdminModuleSpec.RowAction)?
    @State private var promptInput = ""
    @State private var query = ""

    private var shown: [JSONValue] {
        let text = query.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return items }
        return items.filter { AdminText.title(of: $0).localizedCaseInsensitiveContains(text) || AdminText.subtitle(of: $0).localizedCaseInsensitiveContains(text) }
    }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            if let single {
                Section { JSONFieldsView(value: single) }.listRowBackground(GlassRowBackground())
            }

            ForEach(Array(shown.enumerated()), id: \.offset) { _, item in
                NavigationLink {
                    switch list.drill {
                    case "formResponses": FormResponsesView(guild: guild, form: item)
                    case "eventParticipants": EventParticipantsView(guild: guild, event: item)
                    default: JSONDetailView(title: AdminText.title(of: item), value: item)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(AdminText.title(of: item)).font(.headline).lineLimit(2)
                        let subtitle = AdminText.subtitle(of: item)
                        if !subtitle.isEmpty { Text(subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(2) }
                        if let date = AdminText.date(of: item) { Text(date.formatted(date: .abbreviated, time: .shortened)).font(.caption2).foregroundStyle(.tertiary) }
                    }
                }
                .listRowBackground(GlassRowBackground())
                .swipeActions(edge: .trailing) {
                    ForEach(Array(list.rowActions.enumerated()), id: \.offset) { _, action in
                        Button(role: action.destructive ? .destructive : nil) {
                            if action.textPrompt != nil {
                                promptInput = item["name"]?.stringValue ?? ""
                                promptTarget = (item, action)
                            } else if action.destructive {
                                pending = (item, action)
                            } else {
                                Task { await run(action, on: item) }
                            }
                        } label: { Label(action.title, systemImage: action.symbol) }
                        .tint(action.destructive ? .red : Theme.accent)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if items.isEmpty && single == nil && !loading { ContentUnavailableView("Rien à afficher", systemImage: "tray", description: Text("Cette liste est vide.")) }
            if loading && items.isEmpty && single == nil { ProgressView() }
        }
        .searchable(text: $query, prompt: "Filtrer")
        .navigationTitle(list.title)
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task { await load() }
        .confirmationDialog(pending?.action.title ?? "", isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } }), titleVisibility: .visible) {
            Button("Confirmer", role: .destructive) {
                if let target = pending { Task { await run(target.action, on: target.row) } }
                pending = nil
            }
        } message: { Text("Cette action s'applique immédiatement.") }
        .alert(promptTarget?.action.title ?? "Modifier", isPresented: Binding(get: { promptTarget != nil }, set: { if !$0 { promptTarget = nil } })) {
            TextField("Nom", text: $promptInput)
            Button("Annuler", role: .cancel) { promptTarget = nil }
            Button("Enregistrer") {
                if let target = promptTarget {
                    var body = target.action.body
                    body[target.action.textPromptKey] = .string(promptInput.trimmingCharacters(in: .whitespaces))
                    Task { await run(target.action, on: target.row, customBody: body) }
                }
                promptTarget = nil
            }
        } message: {
            if let text = promptTarget?.action.textPrompt { Text(text) }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call(spec.url(list.path, guildId: guild.id), query: [URLQueryItem(name: "limit", value: "100")])
            if let array = JSONValue.firstArray(in: response, key: list.key) {
                items = array
                single = nil
            } else {
                items = []
                single = JSONValue.config(in: response).value
            }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func run(_ action: AdminModuleSpec.RowAction, on row: JSONValue, customBody: [String: JSONValue]? = nil) async {
        guard let id = row[list.idKey]?.displayTextID ?? row["id"]?.displayTextID else {
            errorMessage = "Identifiant de la ligne introuvable."
            return
        }
        let encoded = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        do {
            _ = try await model.discord.call(
                spec.url(action.path.replacingOccurrences(of: "{id}", with: encoded), guildId: guild.id),
                method: action.method,
                body: customBody ?? action.body
            )
            infoMessage = "« \(action.title) » effectué."
            errorMessage = nil
            await load()
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

extension JSONValue {
    var displayTextID: String? {
        switch self {
        case .string(let value): value.isEmpty ? nil : value
        case .number(let value): String(Int(value))
        default: nil
        }
    }
}

struct JSONFieldsView: View {
    let value: JSONValue

    var body: some View {
        if case .object(let dictionary) = value {
            ForEach(dictionary.keys.sorted(), id: \.self) { key in
                if let field = dictionary[key] { fieldRow(key, field) }
            }
        } else {
            Text(value.displayText)
        }
    }

    @ViewBuilder
    private func fieldRow(_ key: String, _ field: JSONValue) -> some View {
        switch field {
        case .object, .array:
            DisclosureGroup(AdminText.label(key) + " (\(field.displayText))") {
                if case .array(let array) = field {
                    ForEach(Array(array.prefix(50).enumerated()), id: \.offset) { _, element in
                        if element.isScalar { Text(element.displayText).font(.footnote) } else { JSONFieldsView(value: element) }
                    }
                } else {
                    JSONFieldsView(value: field)
                }
            }
        default:
            LabeledContent(AdminText.label(key)) { Text(field.displayText).multilineTextAlignment(.trailing).textSelection(.enabled) }
        }
    }
}

struct JSONDetailView: View {
    let title: String
    let value: JSONValue

    var body: some View {
        List {
            Section { JSONFieldsView(value: value) }.listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }
}

struct ConfigEditorView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    let spec: AdminModuleSpec
    let config: AdminModuleSpec.ConfigSpec
    let directory: GuildDirectory
    @State private var original: [String: JSONValue] = [:]
    @State private var draft: [String: JSONValue] = [:]
    @State private var editable = true
    @State private var loading = true
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    private var changedKeys: [String] { draft.keys.filter { draft[$0] != original[$0] }.sorted() }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }
            if !editable {
                Text("Les réglages de cette page ne sont pas exposés séparément par le bot : modifiez-les depuis le site.")
                    .font(.footnote).foregroundStyle(.secondary).listRowBackground(Color.clear)
            }

            Section {
                ConfigObjectView(values: $draft, directory: directory, disabled: !editable)
            }
            .listRowBackground(GlassRowBackground())
            .disabled(!editable)
        }
        .scrollContentBackground(.hidden)
        .overlay { if loading && draft.isEmpty { ProgressView() } }
        .navigationTitle(config.title)
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Enregistrer") { Task { await save() } }.disabled(changedKeys.isEmpty || saving || !editable)
            }
        }
        .task {
            await load()
            await directory.load(guildId: guild.id, discord: model.discord)
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let response = try await model.discord.call(spec.url(config.get, guildId: guild.id))
            let extracted = JSONValue.config(in: response)
            let dictionary = extracted.value.objectValue ?? [:]
            original = dictionary
            draft = dictionary
            editable = !config.strict || extracted.isWrapped
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        var body: [String: JSONValue] = [:]
        for key in changedKeys { body[key] = draft[key] }
        do {
            _ = try await model.discord.call(spec.url(config.put, guildId: guild.id), method: config.method, body: body)
            original = draft
            infoMessage = "Réglages enregistrés."
            errorMessage = nil
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct ConfigObjectView: View {
    @Binding var values: [String: JSONValue]
    let directory: GuildDirectory
    let disabled: Bool

    private func isChannelKey(_ key: String) -> Bool { key.lowercased().hasSuffix("channelid") }
    private func isRoleKey(_ key: String) -> Bool { key.lowercased().hasSuffix("roleid") }
    private func isChannelListKey(_ key: String) -> Bool { key.lowercased().hasSuffix("channelids") }
    private func isRoleListKey(_ key: String) -> Bool { key.lowercased().hasSuffix("roleids") }

    var body: some View {
        ForEach(values.keys.sorted(), id: \.self) { key in
            row(key)
        }
    }

    @ViewBuilder
    private func row(_ key: String) -> some View {
        let title = AdminText.label(key)
        switch values[key] {
        case .bool?:
            Toggle(title, isOn: Binding(get: { values[key]?.boolValue ?? false }, set: { values[key] = .bool($0) }))
        case .number?:
            HStack {
                Text(title)
                Spacer()
                TextField("0", text: Binding(
                    get: { values[key]?.displayText ?? "" },
                    set: { if let number = Double($0.replacingOccurrences(of: ",", with: ".")) { values[key] = .number(number) } }
                ))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 140)
            }
        case .string?, .null?:
            if isChannelKey(key) {
                picker(key, title: title, entries: directory.channels, symbol: "#")
            } else if isRoleKey(key) {
                picker(key, title: title, entries: directory.roles, symbol: "@")
            } else if values[key] == .null {
                EmptyView()
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.caption).foregroundStyle(.secondary)
                    TextField(title, text: Binding(get: { values[key]?.stringValue ?? "" }, set: { values[key] = .string($0) }), axis: .vertical)
                        .lineLimit(1...6)
                }
            }
        case .array(let array)?:
            if isChannelListKey(key) || isRoleListKey(key) {
                IdListRow(title: title, ids: array.compactMap(\.stringValue), entries: isRoleListKey(key) ? directory.roles : directory.channels) { newIds in
                    values[key] = .array(newIds.map { .string($0) })
                }
            } else if array.allSatisfy({ $0.isScalar }) && !array.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title + " (séparés par des virgules)").font(.caption).foregroundStyle(.secondary)
                    TextField(title, text: Binding(
                        get: { array.map(\.displayText).joined(separator: ", ") },
                        set: { text in
                            let parts = text.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                            let numeric = array.allSatisfy { $0.doubleValue != nil }
                            values[key] = .array(parts.map { numeric ? (Double($0).map { JSONValue.number($0) } ?? .string($0)) : .string($0) })
                        }
                    ), axis: .vertical)
                }
            } else {
                LabeledContent(title, value: "\(array.count) élément(s)")
            }
        case .object?:
            DisclosureGroup(title) {
                ConfigObjectView(values: Binding(
                    get: { values[key]?.objectValue ?? [:] },
                    set: { values[key] = .object($0) }
                ), directory: directory, disabled: disabled)
            }
        case nil:
            EmptyView()
        }
    }

    private func picker(_ key: String, title: String, entries: [GuildDirectory.Entry], symbol: String) -> some View {
        let current = values[key]?.stringValue ?? ""
        return Picker(title, selection: Binding(get: { current }, set: { values[key] = $0.isEmpty ? .null : .string($0) })) {
            Text("Aucun").tag("")
            if !current.isEmpty && !entries.contains(where: { $0.id == current }) { Text(current).tag(current) }
            ForEach(entries) { Text("\(symbol)\($0.name)").tag($0.id) }
        }
    }
}

private struct IdListRow: View {
    let title: String
    let ids: [String]
    let entries: [GuildDirectory.Entry]
    let onChange: ([String]) -> Void
    @State private var showing = false

    var body: some View {
        Button {
            showing = true
        } label: {
            HStack {
                Text(title).foregroundStyle(.primary)
                Spacer()
                Text(ids.isEmpty ? "Aucun" : "\(ids.count) sélectionné(s)").foregroundStyle(.secondary)
            }
        }
        .sheet(isPresented: $showing) {
            NavigationStack {
                List(entries) { entry in
                    Button {
                        var next = ids
                        if let index = next.firstIndex(of: entry.id) { next.remove(at: index) } else { next.append(entry.id) }
                        onChange(next)
                    } label: {
                        HStack {
                            Text(entry.name).foregroundStyle(.primary)
                            Spacer()
                            if ids.contains(entry.id) { Image(systemName: "checkmark").foregroundStyle(Theme.accent) }
                        }
                    }
                }
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { showing = false } } }
            }
        }
    }
}
