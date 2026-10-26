import SwiftUI

struct EvalDiscordRecapView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var channels: [(id: String, name: String)] = []
    @State private var loading = false
    @State private var message: String?
    @State private var guildId = ValorantStore.recapGuildId ?? ""
    @State private var channelId = ValorantStore.recapChannelId ?? ""

    private var guilds: [DiscordGuild] { model.discord.guilds.filter(\.botPresent) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                EvalNavHeader(title: "Récap sur Discord") { dismiss() }
                Text("Après chaque partie, le bot ETHONE publie le résultat (score, K/D/A, ACS, HS%, agent, rang) dans le salon choisi.")
                    .font(.system(size: 16)).foregroundStyle(EvalUI.secondary)
                if !model.discord.isConnected {
                    Button {
                        Task {
                            await model.discord.signIn()
                            if model.discord.isConnected { await model.discord.refresh() }
                        }
                    } label: {
                        Label(model.discord.isLoading ? "Connexion…" : "Se connecter à Discord", systemImage: "person.badge.key")
                            .font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                            .frame(maxWidth: .infinity).frame(height: 50)
                            .background(Color(hex: 0x5865F2), in: .capsule)
                    }
                    .buttonStyle(.plain)
                    .disabled(model.discord.isLoading)
                    if let error = model.discord.errorMessage {
                        Text(error).font(.footnote).foregroundStyle(EvalUI.secondary)
                    }
                } else {
                    VStack(spacing: 0) {
                        picker("Serveur", selection: guildId, options: guilds.map { ($0.id, $0.name) }) { id in
                            guildId = id
                            channelId = ""
                            Task { await loadChannels() }
                        }
                        Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 18)
                        picker("Salon", selection: channelId, options: channels.map { ($0.id, "#" + $0.name) }) { channelId = $0 }
                            .disabled(guildId.isEmpty || loading)
                    }
                    .background(EvalUI.card, in: .rect(cornerRadius: 22))
                    Button { save() } label: {
                        Text(ValorantStore.recapChannelId == nil ? "Activer le récap" : "Enregistrer")
                            .font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
                            .frame(maxWidth: .infinity).frame(height: 50)
                            .background(EvalAccent.color, in: .capsule)
                    }
                    .buttonStyle(.plain)
                    .disabled(guildId.isEmpty || channelId.isEmpty)
                    .opacity(guildId.isEmpty || channelId.isEmpty ? 0.5 : 1)
                    if ValorantStore.recapChannelId != nil {
                        Button {
                            Task {
                                do {
                                    try await model.valorant.postTestRecap()
                                    message = "Récap de test publié."
                                } catch {
                                    message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                                }
                            }
                        } label: {
                            Label("Publier un test", systemImage: "paperplane")
                                .font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalAccent.color)
                                .frame(maxWidth: .infinity).frame(height: 46)
                                .background(EvalUI.card, in: .capsule)
                        }
                        .buttonStyle(.plain)
                        Button("Désactiver le récap", role: .destructive) {
                            ValorantStore.setRecap(guild: nil, channel: nil, latestMatch: nil)
                            guildId = ""
                            channelId = ""
                            message = "Récap désactivé."
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                if let message { Text(message).font(.footnote).foregroundStyle(EvalUI.secondary) }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            if model.discord.guilds.isEmpty { await model.discord.refresh() }
            if !guildId.isEmpty { await loadChannels() }
        }
    }

    private func picker(_ title: String, selection: String, options: [(String, String)], onSelect: @escaping (String) -> Void) -> some View {
        Menu {
            ForEach(options, id: \.0) { id, name in Button(name) { onSelect(id) } }
        } label: {
            HStack {
                Text(title).font(.system(size: 18)).foregroundStyle(EvalColors.text)
                Spacer()
                Text(options.first { $0.0 == selection }?.1 ?? "Choisir").font(.system(size: 17)).foregroundStyle(EvalUI.secondary).lineLimit(1)
                Image(systemName: "chevron.up.chevron.down").font(.system(size: 13)).foregroundStyle(EvalUI.secondary)
            }
            .padding(18)
            .contentShape(.rect)
        }
    }

    private func loadChannels() async {
        guard !guildId.isEmpty else { return }
        loading = true
        defer { loading = false }
        do {
            let json = try await model.discord.call("api/guilds/\(guildId)/valorant/channels")
            channels = (json["channels"]?.arrayValue ?? []).compactMap { c in
                guard let id = c["id"]?.stringValue, let name = c["name"]?.stringValue else { return nil }
                return (id, name)
            }
            message = nil
        } catch {
            message = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func save() {
        ValorantStore.setRecap(guild: guildId, channel: channelId, latestMatch: model.valorant.matches.first?.id)
        message = "Le prochain match sera publié dans ce salon."
    }
}
