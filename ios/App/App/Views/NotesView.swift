import SwiftUI

public struct NotesView: View {
    @EnvironmentObject var supabase: SupabaseManager
    @State private var searchText = ""
    @State private var showingAddSheet = false
    @State private var newTitle = ""
    @State private var newBody = ""

    public init() {}

    var filteredNotes: [NoteItem] {
        if searchText.isEmpty { return supabase.notes }
        return supabase.notes.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.body.localizedCaseInsensitiveContains(searchText)
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                AmbientBackground()

                if filteredNotes.isEmpty && !supabase.isLoading {
                    ETHEmptyState(
                        icon: "note.text",
                        title: "Aucune note",
                        description: "Créez votre première note manuellement ou demandez à Brain.",
                        buttonTitle: "Nouvelle Note",
                        action: { showingAddSheet = true }
                    )
                } else {
                    List {
                        ForEach(filteredNotes) { note in
                            NavigationLink(destination: NoteDetailView(note: note)) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(note.title)
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundStyle(.primary)

                                    Text(note.body)
                                        .font(.system(size: 13))
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                                .padding(.vertical, 4)
                            }
                            .listRowBackground(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(.ultraThinMaterial)
                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.1), lineWidth: 0.5))
                            )
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    Task {
                                        try? await supabase.deleteNote(id: note.id)
                                    }
                                } label: {
                                    Label("Supprimer", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .padding(.bottom, 80)
                }
            }
            .navigationTitle("Notes")
            .searchable(text: $searchText, prompt: "Rechercher dans vos notes...")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingAddSheet = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(ETHTheme.emerald)
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                NavigationStack {
                    Form {
                        Section(header: Text("Titre")) {
                            TextField("Titre de la note", text: $newTitle)
                        }
                        Section(header: Text("Contenu")) {
                            TextEditor(text: $newBody)
                                .frame(minHeight: 180)
                        }
                    }
                    .navigationTitle("Nouvelle Note")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Annuler") {
                                newTitle = ""
                                newBody = ""
                                showingAddSheet = false
                            }
                        }
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Enregistrer") {
                                let t = newTitle
                                let b = newBody
                                newTitle = ""
                                newBody = ""
                                showingAddSheet = false
                                Task {
                                    try? await supabase.createNote(title: t.isEmpty ? "Sans titre" : t, body: b)
                                }
                            }
                            .disabled(newTitle.isEmpty && newBody.isEmpty)
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
        }
    }
}

struct NoteDetailView: View {
    let note: NoteItem

    var body: some View {
        ZStack {
            AmbientBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(note.title)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(.primary)

                    Divider().background(Color.white.opacity(0.1))

                    Text(note.body)
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary)
                        .lineSpacing(6)

                    Spacer()
                }
                .padding(20)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
