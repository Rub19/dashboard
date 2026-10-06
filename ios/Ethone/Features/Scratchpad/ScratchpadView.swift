import SwiftUI

struct ScratchpadView: View {
    @Environment(AppModel.self) private var model
    @State private var text = ""
    @State private var loaded = false
    @State private var lastSaved = ""
    @State private var status = "Enregistré"
    @State private var errorMessage: String?
    @State private var exportMessage: String?

    private var words: Int { text.split { $0.isWhitespace }.count }

    var body: some View {
        VStack(spacing: 0) {
            TextEditor(text: $text)
                .scrollContentBackground(.hidden)
                .padding(12)
                .glassEffect(.regular, in: .rect(cornerRadius: 22))
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .accessibilityLabel("Bloc-notes")

            HStack {
                Text("\(words) mot(s) · \(text.count) caractère(s)").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Text(errorMessage ?? status).font(.caption).foregroundStyle(errorMessage == nil ? Color.secondary : Theme.danger)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)

            if let exportMessage {
                Text(exportMessage).font(.footnote).foregroundStyle(Theme.success).padding(.bottom, 6)
            }
        }
        .navigationTitle("Scratchpad")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Créer une note", systemImage: "note.text") { Task { await export(asTask: false) } }
                    Button("Créer une tâche", systemImage: "checkmark.circle") { Task { await export(asTask: true) } }
                    Button("Vider", systemImage: "trash", role: .destructive) { text = "" }
                } label: { Image(systemName: "ellipsis.circle") }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && text.isEmpty)
            }
        }
        .task {
            guard !loaded else { return }
            do {
                if let remote = try await UserStateClient(api: model.api).value("scratchpad")?.stringValue {
                    text = remote
                    lastSaved = remote
                }
                errorMessage = nil
            } catch {
                errorMessage = "Chargement impossible"
            }
            loaded = true
        }
        .reloadOnRemoteChange(["ethone_user_state"]) { await pullRemote() }
        .task(id: text) {
            guard loaded, text != lastSaved else { return }
            status = "Modifié…"
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled else { return }
            do {
                try await UserStateClient(api: model.api).set("scratchpad", .string(text))
                lastSaved = text
                status = "Enregistré"
                errorMessage = nil
            } catch {
                errorMessage = "Erreur d'enregistrement"
            }
        }
    }

    private func pullRemote() async {
        guard loaded, text == lastSaved else { return }
        if let remote = try? await UserStateClient(api: model.api).value("scratchpad")?.stringValue, remote != text {
            lastSaved = remote
            text = remote
        }
    }

    private func export(asTask: Bool) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let lines = trimmed.components(separatedBy: .newlines)
        let title = String((lines.first ?? "").prefix(asTask ? 100 : 80))
        let body = lines.count > 1 ? lines.dropFirst().joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines) : (asTask ? "" : trimmed)
        if asTask {
            let data: JSONValue = .object(["category": .string("Général"), "priority": .string("medium"), "dueDate": .string(ISODate.string(Date()))])
            _ = await model.tasks.create(title: title.isEmpty ? "Tâche Scratchpad" : title, body: body.isEmpty ? nil : body, data: data)
            exportMessage = "Tâche créée."
        } else {
            _ = await model.notes.create(title: title.isEmpty ? "Note Scratchpad" : title, body: body.isEmpty ? nil : body)
            exportMessage = "Note créée."
        }
    }
}

