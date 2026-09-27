import SwiftUI

/// Lecteur musique du bot : titre en cours, file d'attente, commandes, volume, recherche et lecture d'un titre.
struct MusicPlayerView: View {
    @Environment(AppModel.self) private var model
    let guild: DiscordGuild
    @State private var state: JSONValue?
    @State private var query = ""
    @State private var results: [JSONValue] = []
    @State private var searching = false
    @State private var volume = 50.0
    @State private var errorMessage: String?
    @State private var infoMessage: String?

    private var current: JSONValue? {
        for key in ["currentTrack", "current", "nowPlaying", "track"] {
            if let value = state?[key], case .object = value { return value }
        }
        return nil
    }

    private var queue: [JSONValue] { state?["queue"]?.arrayValue ?? [] }

    var body: some View {
        List {
            if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear) }
            if let infoMessage { Text(infoMessage).font(.footnote).foregroundStyle(Theme.success).listRowBackground(Color.clear) }

            Section {
                if let current {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(current["title"]?.stringValue ?? "Titre en cours").font(.headline)
                        Text(current["author"]?.stringValue ?? current["artist"]?.stringValue ?? "").font(.subheadline).foregroundStyle(.secondary)
                    }
                } else {
                    Text("Rien n'est en cours de lecture.").foregroundStyle(.secondary)
                }
                HStack(spacing: 18) {
                    control("backward.fill", "Précédent", "previous")
                    control("pause.fill", "Pause", "pause")
                    control("play.fill", "Reprendre", "resume")
                    control("forward.fill", "Suivant", "skip")
                    control("stop.fill", "Arrêter", "stop")
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.glass)

                HStack {
                    Image(systemName: "speaker.fill")
                    Slider(value: $volume, in: 0...100, step: 5) { editing in
                        if !editing { Task { await send("volume", ["volume": .number(volume)]) } }
                    }
                    Image(systemName: "speaker.wave.3.fill")
                }
            } header: { Text("Lecture").sectionTitle() }
            .listRowBackground(GlassRowBackground())

            Section {
                HStack {
                    TextField("Rechercher un titre ou coller un lien", text: $query)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search).onSubmit { Task { await search() } }
                    Button { Task { await search() } } label: { Image(systemName: "magnifyingglass") }
                        .disabled(query.trimmingCharacters(in: .whitespaces).isEmpty || searching)
                }
                ForEach(Array(results.enumerated()), id: \.offset) { _, item in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item["title"]?.stringValue ?? "Titre").font(.subheadline.weight(.semibold)).lineLimit(2)
                            Text(item["author"]?.stringValue ?? item["artist"]?.stringValue ?? "").font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Lire") { Task { await play(item) } }.buttonStyle(.glass)
                    }
                }
            } header: { Text("Ajouter").sectionTitle() } footer: {
                Text("Le bot doit être dans un salon vocal du serveur pour lire un titre.")
            }
            .listRowBackground(GlassRowBackground())

            if !queue.isEmpty {
                Section {
                    ForEach(Array(queue.enumerated()), id: \.offset) { index, item in
                        Text("\(index + 1). \(item["title"]?.stringValue ?? "Titre")").font(.subheadline)
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) { Task { await removeFromQueue(index) } } label: { Label("Retirer", systemImage: "trash") }
                            }
                    }
                } header: { Text("File d'attente · \(queue.count)").sectionTitle() }
                .listRowBackground(GlassRowBackground())
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Musique")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .refreshable { await load() }
        .task {
            // Rafraîchit l'état toutes les 5 secondes tant que l'écran est ouvert.
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func control(_ symbol: String, _ label: String, _ action: String) -> some View {
        Button { Task { await send(action, [:]) } } label: { Image(systemName: symbol).frame(width: 28, height: 28) }
            .accessibilityLabel(label)
    }

    private func load() async {
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/music/state")
            state = response["state"] ?? response
            if let level = state?["volume"]?.doubleValue { volume = level }
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func send(_ action: String, _ body: [String: JSONValue]) async {
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/music/\(action)", method: "POST", body: body)
            infoMessage = nil
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func search() async {
        let text = query.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        searching = true
        defer { searching = false }
        do {
            let response = try await model.discord.call("api/guilds/\(guild.id)/music/search", query: [URLQueryItem(name: "q", value: text), URLQueryItem(name: "limit", value: "8")])
            results = response["results"]?.arrayValue ?? []
            errorMessage = results.isEmpty ? "Aucun résultat." : nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func play(_ item: JSONValue) async {
        let target = item["url"]?.stringValue ?? item["uri"]?.stringValue ?? item["title"]?.stringValue ?? query
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/music/play", method: "POST", body: ["query": .string(target)])
            infoMessage = "Ajouté à la file."
            errorMessage = nil
            await load()
        } catch {
            infoMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func removeFromQueue(_ index: Int) async {
        do {
            _ = try await model.discord.call("api/guilds/\(guild.id)/music/queue/\(index)", method: "DELETE")
            await load()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
