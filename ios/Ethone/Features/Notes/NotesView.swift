import SwiftUI

struct NotesView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var editing: NoteDraft?

    private var filtered: [Item] {
        let sorted = model.notes.items.sorted { $0.updatedAt > $1.updatedAt }
        guard !query.isEmpty else { return sorted }
        return sorted.filter { $0.title.localizedCaseInsensitiveContains(query) || $0.plainBody.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack {
            List {
                if let message = model.notes.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
                }
                ForEach(filtered) { note in
                    Button {
                        editing = NoteDraft(item: note)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(note.title).font(.headline).foregroundStyle(.primary).lineLimit(1)
                            if !note.plainBody.isEmpty {
                                Text(note.plainBody).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                            }
                            Text(note.updatedAt, format: .dateTime.day().month(.abbreviated).hour().minute())
                                .font(.caption).foregroundStyle(.tertiary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(GlassRowBackground())
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { await model.notes.delete(note) }
                        } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .overlay {
                if model.notes.items.isEmpty && model.notes.hasLoaded {
                    ContentUnavailableView("Aucune note", systemImage: "note.text", description: Text("Créez votre première note avec le bouton +."))
                }
            }
            .refreshable { await model.notes.refresh() }
            .searchable(text: $query, prompt: "Rechercher une note")
            .navigationTitle("Notes")
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { editing = NoteDraft(item: nil) } label: { Image(systemName: "square.and.pencil") }
                }
            }
            .sheet(item: $editing) { draft in
                NoteEditorView(draft: draft)
            }
        }
    }
}

struct NoteDraft: Identifiable {
    let id = UUID()
    let item: Item?
}

struct GlassRowBackground: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .fill(Color.clear)
            .glassEffect(.regular, in: .rect(cornerRadius: 20))
            .padding(.vertical, 3)
    }
}

struct NoteEditorView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let draft: NoteDraft

    @State private var title: String
    @State private var text: String
    @State private var saving = false
    private let originalText: String

    init(draft: NoteDraft) {
        self.draft = draft
        let plain = draft.item?.plainBody ?? ""
        _title = State(initialValue: draft.item?.title ?? "")
        _text = State(initialValue: plain)
        originalText = plain
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                TextField("Titre", text: $title)
                    .font(.title2.bold())
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: 18))
                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .padding(10)
                    .glassEffect(.regular, in: .rect(cornerRadius: 18))
                if let message = model.notes.errorMessage {
                    Text(message).font(.footnote).foregroundStyle(Theme.danger)
                }
            }
            .padding(16)
            .navigationTitle(draft.item == nil ? "Nouvelle note" : "Modifier")
            .ethoneScreen()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Fermer") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { save() }
                        .disabled(saving || title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.large])
        .presentationBackground(.clear)
    }

    private func save() {
        saving = true
        let trimmedTitle = title.trimmingCharacters(in: .whitespaces)
        Task {
            if let item = draft.item {
                // Le site stocke le corps en HTML riche : on ne le réécrit que si le texte a réellement changé (pour ne pas perdre la mise en forme).
                let body: String? = text == originalText ? nil : HTMLText.html(from: text)
                await model.notes.update(item, title: trimmedTitle, body: body)
            } else {
                await model.notes.create(title: trimmedTitle, body: HTMLText.html(from: text))
            }
            saving = false
            if model.notes.errorMessage == nil { dismiss() }
        }
    }
}
