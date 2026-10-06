import SwiftUI
import UniformTypeIdentifiers

struct ClipView: View {
    @Environment(AppModel.self) private var model
    @State private var targetKind: ClipTarget = .note
    @State private var title = ""
    @State private var content = ""
    @State private var sourceURL = ""
    @State private var priority: TaskPriority = .medium
    @State private var hasDueDate = false
    @State private var dueDate = Date()
    @State private var isSaving = false
    @State private var savedSuccess = false
    @State private var errorMessage: String?

    enum ClipTarget: String, CaseIterable, Identifiable {
        case note = "Note"
        case task = "Tâche"

        var id: String { rawValue }

        var symbol: String {
            switch self {
            case .note: "note.text"
            case .task: "checklist"
            }
        }
    }

    enum TaskPriority: String, CaseIterable, Identifiable {
        case low = "Basse"
        case medium = "Moyenne"
        case high = "Haute"
        case urgent = "Urgente"

        var id: String { rawValue }

        var rawKey: String {
            switch self {
            case .low: "low"
            case .medium: "medium"
            case .high: "high"
            case .urgent: "urgent"
            }
        }

        var color: Color {
            switch self {
            case .low: Theme.accentSoft
            case .medium: Theme.accent
            case .high: Theme.warning
            case .urgent: Theme.danger
            }
        }
    }

    var body: some View {
        Form {
            Section {
                Button {
                    pasteFromClipboard()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "doc.on.clipboard.fill")
                            .font(.title2)
                            .foregroundStyle(Color(hex: model.accentHex))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Coller depuis le presse-papier")
                                .font(.headline)
                                .foregroundStyle(.primary)
                            Text("Détecte automatiquement le lien, l'extrait et le titre")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "arrow.right.circle.fill")
                            .foregroundStyle(Color(hex: model.accentHex))
                    }
                    .padding(.vertical, 4)
                }
            }
            .listRowBackground(GlassRowBackground())

            Section("Destination") {
                Picker("Type d'élément", selection: $targetKind) {
                    ForEach(ClipTarget.allCases) { target in
                        Label(target.rawValue, systemImage: target.symbol).tag(target)
                    }
                }
                .pickerStyle(.segmented)
            }
            .listRowBackground(GlassRowBackground())

            Section("Détails du clip") {
                TextField("Titre", text: $title)
                    .font(.body)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Contenu / Extrait")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextEditor(text: $content)
                        .frame(minHeight: 100)
                        .scrollContentBackground(.hidden)
                }

                HStack {
                    Image(systemName: "link")
                        .foregroundStyle(.secondary)
                    TextField("Source (URL facultative)", text: $sourceURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if let url = URL(string: sourceURL), UIApplication.shared.canOpenURL(url) {
                        Link(destination: url) {
                            Image(systemName: "arrow.up.right.square")
                                .foregroundStyle(Color(hex: model.accentHex))
                        }
                    }
                }
            }
            .listRowBackground(GlassRowBackground())

            if targetKind == .task {
                Section("Paramètres de la tâche") {
                    Picker("Priorité", selection: $priority) {
                        ForEach(TaskPriority.allCases) { p in
                            Text(p.rawValue).tag(p)
                        }
                    }

                    Toggle("Échéance", isOn: $hasDueDate)
                    if hasDueDate {
                        DatePicker("Date limite", selection: $dueDate, displayedComponents: [.date, .hourAndMinute])
                    }
                }
                .listRowBackground(GlassRowBackground())
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(Theme.danger)
                }
                .listRowBackground(Color.clear)
            }

            if savedSuccess {
                Section {
                    HStack(spacing: 10) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Theme.success)
                        Text("Enregistré avec succès dans vos \(targetKind == .note ? "Notes" : "Tâches") !")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Theme.success)
                    }
                }
                .listRowBackground(Color.clear)
            }

            Section {
                Button {
                    Task { await saveClip() }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                                .padding(.trailing, 6)
                        } else {
                            Image(systemName: "tray.and.arrow.down.fill")
                        }
                        Text(isSaving ? "Enregistrement..." : "Enregistrer dans ETHONE")
                            .font(.headline)
                        Spacer()
                    }
                    .padding(.vertical, 6)
                }
                .disabled(isSaving || title.trimmingCharacters(in: .whitespaces).isEmpty && content.trimmingCharacters(in: .whitespaces).isEmpty)
                .listRowBackground(Color(hex: model.accentHex))
                .foregroundStyle(.white)

                if !title.isEmpty || !content.isEmpty || !sourceURL.isEmpty {
                    Button(role: .destructive) {
                        resetForm()
                    } label: {
                        HStack {
                            Spacer()
                            Text("Effacer le formulaire")
                                .font(.subheadline)
                            Spacer()
                        }
                    }
                    .listRowBackground(GlassRowBackground())
                }
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Clip")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }

    private func pasteFromClipboard() {
        guard let text = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return }

        savedSuccess = false
        errorMessage = nil

        if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue) {
            let matches = detector.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
            if let firstMatch = matches.first, let url = firstMatch.url {
                sourceURL = url.absoluteString
                let host = url.host ?? ""
                if text == url.absoluteString {
                    title = "Lien : \(host)"
                    content = ""
                } else {
                    let extracted = text.replacingOccurrences(of: url.absoluteString, with: "").trimmingCharacters(in: .whitespacesAndNewlines)
                    title = extracted.components(separatedBy: .newlines).first?.prefix(80).description ?? "Extrait de \(host)"
                    content = extracted
                }
                return
            }
        }

        let lines = text.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        if let firstLine = lines.first {
            title = String(firstLine.prefix(80))
            if lines.count > 1 {
                content = lines.dropFirst().joined(separator: "\n")
            } else {
                content = text
            }
        } else {
            title = "Note rapide"
            content = text
        }
    }

    private func saveClip() async {
        isSaving = true
        errorMessage = nil
        savedSuccess = false
        defer { isSaving = false }

        let cleanTitle = title.trimmingCharacters(in: .whitespaces).isEmpty ? "Clip" : title.trimmingCharacters(in: .whitespaces)

        var finalBodyParts: [String] = []
        let cleanContent = content.trimmingCharacters(in: .whitespaces)
        if !cleanContent.isEmpty {
            if !sourceURL.trimmingCharacters(in: .whitespaces).isEmpty {
                let quote = cleanContent.components(separatedBy: .newlines).map { "> " + $0 }.joined(separator: "\n")
                finalBodyParts.append(quote)
            } else {
                finalBodyParts.append(cleanContent)
            }
        }

        let cleanURL = sourceURL.trimmingCharacters(in: .whitespaces)
        if !cleanURL.isEmpty {
            finalBodyParts.append("Source : \(cleanURL)")
        }

        let bodyText = finalBodyParts.joined(separator: "\n\n")

        switch targetKind {
        case .note:
            let result = await model.notes.create(title: cleanTitle, body: bodyText.isEmpty ? nil : bodyText)
            if result != nil {
                savedSuccess = true
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                errorMessage = model.notes.errorMessage ?? "Erreur lors de la création de la note."
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        case .task:
            var taskData: [String: JSONValue] = [
                "priority": .string(priority.rawKey)
            ]
            if hasDueDate {
                taskData["dueDate"] = .string(ISODate.string(dueDate))
            }
            let result = await model.tasks.create(
                title: cleanTitle,
                body: bodyText.isEmpty ? nil : bodyText,
                data: .object(taskData)
            )
            if result != nil {
                savedSuccess = true
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                errorMessage = model.tasks.errorMessage ?? "Erreur lors de la création de la tâche."
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
    }

    private func resetForm() {
        title = ""
        content = ""
        sourceURL = ""
        hasDueDate = false
        savedSuccess = false
        errorMessage = nil
    }
}
