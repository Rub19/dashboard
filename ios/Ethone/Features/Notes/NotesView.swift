import SwiftUI

struct NotesView: View {
    @Environment(AppModel.self) private var model
    @State private var query = ""
    @State private var editing: NoteDraft?
    @Namespace private var zoom

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
                        VStack(alignment: .leading, spacing: 5) {
                            Text(note.title.isEmpty ? "Sans titre" : note.title)
                                .font(.headline)
                                .tracking(-0.2)
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                            if !note.plainBody.isEmpty {
                                Text(note.plainBody.replacingOccurrences(of: "\n", with: " "))
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                            Text(note.updatedAt, format: .relative(presentation: .named))
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .matchedTransitionSource(id: note.id, in: zoom)
                    .listRowBackground(Rectangle().fill(.thinMaterial))
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { await model.notes.delete(note) }
                        } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .animation(Motion.snap, value: filtered.map(\.id))
            .overlay {
                if model.notes.items.isEmpty && model.notes.hasLoaded {
                    ContentUnavailableView("Aucune note", systemImage: "note.text", description: Text("Touchez le crayon pour écrire votre première note. Elle apparaîtra aussitôt sur votre ordinateur."))
                } else if !query.isEmpty && filtered.isEmpty {
                    ContentUnavailableView.search(text: query)
                }
            }
            .refreshable { await model.notes.refresh() }
            .searchable(text: $query, prompt: "Rechercher une note")
            .navigationTitle("Notes")
            .ethoneScreen()
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { editing = NoteDraft(item: nil) } label: { Image(systemName: "square.and.pencil") }
                        .accessibilityLabel("Nouvelle note")
                        .matchedTransitionSource(id: "new-note", in: zoom)
                }
            }
            .sheet(item: $editing) { draft in
                NoteEditorView(draft: draft)
                    .navigationTransition(.zoom(sourceID: draft.item?.id ?? "new-note", in: zoom))
            }
        }
    }
}

struct NoteDraft: Identifiable {
    let id = UUID()
    let item: Item?
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
                    .font(.title2.weight(.semibold))
                    .tracking(-0.5)
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
                ToolbarItem(placement: .primaryAction) {
                    ShareLink(item: title + "\n\n" + text) { Image(systemName: "square.and.arrow.up") }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty && text.isEmpty)
                }
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

