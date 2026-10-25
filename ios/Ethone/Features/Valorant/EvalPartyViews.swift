import SwiftUI
import Observation

/// Groupe VALORANT en cours (glz /parties) : uniquement quand le client du jeu est ouvert.
struct RiotPartyState: Equatable {
    struct Member: Identifiable, Equatable {
        let id: String
        var name: String
        var tag: String
        let cardURL: URL?
        let isOwner: Bool
        let isReady: Bool
        let level: Int
        /// Ping par serveur (GamePodID -> ms).
        let pings: [String: Int]
        var tier = 0
        var tierIsCurrent = true
    }

    let id: String
    let state: String
    let isOpen: Bool
    let queueID: String
    let eligibleQueues: [String]
    let preferredPods: [String]
    let inviteCode: String?
    let queueEntry: Date?
    var members: [Member]

    var isQueueing: Bool { state.uppercased() == "MATCHMAKING" }
}

/// Lecture et actions du groupe via les endpoints glz utilisés par le client VALORANT.
@MainActor
@Observable
final class RiotPartyModel {
    private(set) var party: RiotPartyState?
    private(set) var isLoading = false
    private(set) var working = false
    private(set) var loaded = false
    var message: String?
    var currentSeason: String?
    private var tierCache: [String: (tier: Int, current: Bool)] = [:]

    func me(_ session: RiotSession) -> RiotPartyState.Member? {
        guard let puuid = session.credentials?.puuid else { return nil }
        return party?.members.first { $0.id == puuid }
    }

    func isLeader(_ session: RiotSession) -> Bool { me(session)?.isOwner ?? false }

    /// Serveurs connus du groupe, triés par ping (celui du joueur connecté).
    func pods(_ session: RiotSession) -> [(id: String, ping: Int)] {
        (me(session)?.pings ?? [:]).map { (id: $0.key, ping: $0.value) }.sorted { $0.ping < $1.ping }
    }

    func load(_ session: RiotSession) async {
        guard session.isLinked, let puuid = session.credentials?.puuid else { party = nil; return }
        isLoading = true
        defer { isLoading = false; loaded = true }
        guard let raw = try? await session.gameData("/parties/v1/players/\(puuid)", host: .glz),
              let player = try? JSONDecoder().decode(JSONValue.self, from: raw),
              let partyID = player["CurrentPartyID"]?.stringValue,
              let data = try? await session.gameData("/parties/v1/parties/\(partyID)", host: .glz),
              let json = try? JSONDecoder().decode(JSONValue.self, from: data) else {
            party = nil
            return
        }
        var state = Self.parse(json)
        let ids = state.members.map(\.id)
        if let namesData = try? await session.gameData("/name-service/v2/players", method: "PUT", body: RiotSession.json(ids)),
           let names = try? JSONDecoder().decode(JSONValue.self, from: namesData) {
            for entry in names.arrayValue ?? [] {
                guard let subject = entry["Subject"]?.stringValue, let index = state.members.firstIndex(where: { $0.id == subject }) else { continue }
                state.members[index].name = entry["GameName"]?.stringValue ?? ""
                state.members[index].tag = entry["TagLine"]?.stringValue ?? ""
            }
        }
        let season = currentSeason?.lowercased()
        let missing = ids.filter { $0 != puuid && tierCache[$0] == nil }
        await withTaskGroup(of: (String, RiotRankLookup.Rank?).self) { group in
            for id in missing { group.addTask { (id, await RiotRankLookup.fetch(session, puuid: id, season: season)) } }
            for await (id, rank) in group {
                if let rank { tierCache[id] = (rank.tier, rank.isCurrent) }
            }
        }
        for index in state.members.indices {
            if let hit = tierCache[state.members[index].id] {
                state.members[index].tier = hit.tier
                state.members[index].tierIsCurrent = hit.current
            }
        }
        party = state
    }

    private static func parse(_ json: JSONValue) -> RiotPartyState {
        let members = (json["Members"]?.arrayValue ?? []).map { m in
            var pings: [String: Int] = [:]
            for p in m["Pings"]?.arrayValue ?? [] {
                if let pod = p["GamePodID"]?.stringValue, let ms = p["Ping"]?.intValue { pings[pod] = ms }
            }
            let card = m["PlayerIdentity"]?["PlayerCardID"]?.stringValue?.lowercased()
            return RiotPartyState.Member(
                id: m["Subject"]?.stringValue ?? "",
                name: "", tag: "",
                cardURL: card.flatMap { URL(string: "https://media.valorant-api.com/playercards/\($0)/smallart.png") },
                isOwner: m["IsOwner"]?.boolValue ?? false,
                isReady: m["IsReady"]?.boolValue ?? false,
                level: m["PlayerIdentity"]?["AccountLevel"]?.intValue ?? 0,
                pings: pings
            )
        }
        let code = json["InviteCode"]?.stringValue ?? json["inviteCode"]?.stringValue
        let entry = json["QueueEntryTime"]?.stringValue.flatMap { Self.riotDate.date(from: $0) }
        return RiotPartyState(
            id: json["ID"]?.stringValue ?? "",
            state: json["State"]?.stringValue ?? "",
            isOpen: json["Accessibility"]?.stringValue == "OPEN",
            queueID: json["MatchmakingData"]?["QueueID"]?.stringValue ?? "",
            eligibleQueues: (json["EligibleQueues"]?.arrayValue ?? []).compactMap(\.stringValue),
            preferredPods: (json["MatchmakingData"]?["PreferredGamePods"]?.arrayValue ?? []).compactMap(\.stringValue),
            inviteCode: (code?.isEmpty ?? true) ? nil : code,
            queueEntry: (entry?.timeIntervalSince1970 ?? 0) > 86400 ? entry : nil,
            members: members
        )
    }

    private static let riotDate: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy.MM.dd-HH.mm.ss"
        return f
    }()

    // MARK: Actions

    private func act(_ session: RiotSession, _ path: String, method: String = "POST", body: Data? = nil, success: String? = nil) async {
        working = true
        defer { working = false }
        do {
            try await session.gameData(path, host: .glz, method: method, body: body)
            if let success { message = success }
        } catch {
            message = "Échec : \((error as? LocalizedError)?.errorDescription ?? error.localizedDescription)"
        }
        await load(session)
    }

    func setReady(_ session: RiotSession, _ ready: Bool) async {
        guard let party, let puuid = session.credentials?.puuid else { return }
        await act(session, "/parties/v1/parties/\(party.id)/members/\(puuid)/setReady", body: RiotSession.json(["ready": ready]))
    }

    func setOpen(_ session: RiotSession, _ open: Bool) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/accessibility", body: RiotSession.json(["accessibility": open ? "OPEN" : "CLOSED"]))
    }

    func setQueue(_ session: RiotSession, _ queue: String) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/queue", body: RiotSession.json(["queueId": queue]))
    }

    func toggleMatchmaking(_ session: RiotSession) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/matchmaking/\(party.isQueueing ? "leave" : "join")")
    }

    func setPods(_ session: RiotSession, _ pods: [String]) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/preferredgamepods", body: RiotSession.json(["GamePodIDs": pods]), success: "Serveurs enregistrés.")
    }

    func generateCode(_ session: RiotSession) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/invitecode")
    }

    func disableCode(_ session: RiotSession) async {
        guard let party else { return }
        await act(session, "/parties/v1/parties/\(party.id)/invitecode", method: "DELETE")
    }

    func join(_ session: RiotSession, code: String) async {
        let clean = code.trimmingCharacters(in: .whitespaces).uppercased()
        guard !clean.isEmpty, let encoded = clean.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else { return }
        await act(session, "/parties/v1/players/joinbycode/\(encoded)", success: "Groupe rejoint.")
    }

    func invite(_ session: RiotSession, riotID: String) async {
        guard let party else { return }
        let parts = riotID.split(separator: "#", maxSplits: 1).map { String($0).trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2, !parts[0].isEmpty, !parts[1].isEmpty,
              let name = parts[0].addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
              let tag = parts[1].addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) else {
            message = "Format attendu : Nom#Tag"
            return
        }
        await act(session, "/parties/v1/parties/\(party.id)/invites/name/\(name)/tag/\(tag)", success: "Invitation envoyée à \(riotID).")
    }

    // MARK: Libellés

    static func queueName(_ id: String) -> String {
        switch id.lowercased() {
        case "competitive": "Compétition"
        case "unrated": "Non classé"
        case "swiftplay": "Vélocité"
        case "spikerush": "Spike Rush"
        case "deathmatch": "Combat à mort"
        case "hurm": "Combat à mort par équipe"
        case "ggteam": "Intensification"
        case "premier": "Premier"
        case "newmap": "Nouvelle carte"
        case "onefa": "Réplication"
        case "snowball": "Bataille de boules de neige"
        case "": "—"
        default: id.capitalized
        }
    }

    /// « aresriot.aws-…-1.eu-gp-frankfurt-1 » -> « Francfort ».
    static func podName(_ pod: String) -> String {
        let last = pod.split(separator: ".").last.map(String.init) ?? pod
        let parts = last.split(separator: "-").map(String.init)
        let city = parts.count >= 3 ? parts[2] : last
        let names = ["frankfurt": "Francfort", "paris": "Paris", "london": "Londres", "stockholm": "Stockholm", "warsaw": "Varsovie",
                     "madrid": "Madrid", "istanbul": "Istanbul", "bahrain": "Bahreïn", "riyadh": "Riyad", "mumbai": "Bombay",
                     "capetown": "Le Cap", "tokyo": "Tokyo", "seoul": "Séoul", "singapore": "Singapour", "sydney": "Sydney",
                     "hongkong": "Hong Kong", "tel": "Tel Aviv", "telaviv": "Tel Aviv", "dubai": "Dubaï", "virginia": "Virginie",
                     "oregon": "Oregon", "texas": "Texas", "illinois": "Illinois", "california": "Californie", "georgia": "Géorgie",
                     "saopaulo": "São Paulo", "santiago": "Santiago", "mexico": "Mexico", "miami": "Miami", "ohio": "Ohio"]
        return names[city.lowercased()] ?? city.capitalized
    }
}

struct EvalPartyCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.evalSurface) private var surface
    @State private var showingSettings = false

    private var store: ValorantStore { model.valorant }
    private var partyModel: RiotPartyModel { store.party }

    var body: some View {
        Group {
            if partyModel.party == nil, !partyModel.loaded {
                ProgressView().tint(EvalColors.text).frame(maxWidth: .infinity).padding(.vertical, 24)
            } else if let party = partyModel.party {
                VStack(spacing: 0) {
                    VStack(spacing: 10) {
                        ForEach(party.members) { member in memberRow(member) }
                    }
                    .padding(.bottom, 14)

                    Divider().overlay(EvalColors.text.opacity(0.08))

                    controls(party).padding(.top, 14)
                }
            } else {
                Text("Il n'y a actuellement aucun groupe!")
                    .font(.system(size: 18))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .padding(.horizontal, 12)
                    .background(surface, in: .rect(cornerRadius: 18))
            }
        }
        .sheet(isPresented: $showingSettings) { EvalPartySettingsSheet() }
        .alert("Groupe", isPresented: Binding(get: { partyModel.message != nil }, set: { if !$0 { partyModel.message = nil } })) {
            Button("OK", role: .cancel) { partyModel.message = nil }
        } message: {
            Text(partyModel.message ?? "")
        }
    }

    private func memberRow(_ member: RiotPartyState.Member) -> some View {
        let isMe = member.id == store.riot.credentials?.puuid
        return HStack(spacing: 14) {
            AsyncImage(url: member.cardURL) { phase in
                if let image = phase.image { image.resizable().scaledToFill() } else { EvalColors.card2 }
            }
                .frame(width: 50, height: 50)
                .clipShape(.rect(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 3) {
                (Text(member.name).foregroundStyle(EvalColors.text) + Text("#\(member.tag)").foregroundStyle(Color(hex: 0x8E8E93)))
                    .font(.system(size: 19, weight: .medium))
                    .lineLimit(1)
                Text(member.isReady ? "Prêt" : "Pas prêt")
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }
            .overlay(alignment: .trailing) {
                if member.isOwner {
                    Image(systemName: "crown")
                        .font(.system(size: 38, weight: .light))
                        .foregroundStyle(EvalColors.text.opacity(0.18))
                        .offset(x: 60)
                        .allowsHitTesting(false)
                }
            }
            Spacer()
            if !isMe {
                if store.friends.contains(where: { $0.id.lowercased() == member.id.lowercased() }) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(EvalAccent.color)
                }
                rankBadge(member)
            }
            if isMe {
                Toggle("Prêt", isOn: Binding(
                    get: { member.isReady },
                    set: { value in Task { await partyModel.setReady(store.riot, value) } }
                ))
                .labelsHidden()
                .tint(EvalAccent.color)
                .disabled(partyModel.working)
            }
        }
        .padding(14)
        .background(surface, in: .rect(cornerRadius: 18))
    }

    private func rankBadge(_ member: RiotPartyState.Member) -> some View {
        ZStack {
            Circle().fill(Color.black)
            Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 2)
            if let url = ValorantProfile.tierIcon(member.tier) {
                AsyncImage(url: url) { $0.image?.resizable().scaledToFit() }.padding(10)
            }
            if !member.tierIsCurrent, member.tier > 0 {
                Image(systemName: "clock")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(2)
                    .background(Color.black, in: .circle)
                    .offset(y: 13)
            }
        }
        .frame(width: 46, height: 46)
    }

    private func controls(_ party: RiotPartyState) -> some View {
        let leader = partyModel.isLeader(store.riot)
        return HStack {
            HStack(spacing: 0) {
                accessButton(open: true, selected: party.isOpen, enabled: leader)
                accessButton(open: false, selected: !party.isOpen, enabled: leader)
            }
            .padding(4)
            .background(surface, in: .capsule)

            Spacer()

            if leader {
                Button { Task { await partyModel.toggleMatchmaking(store.riot) } } label: {
                    HStack(spacing: 8) {
                        if party.isQueueing { queueTimer(party) } else { Text("Démarrer") }
                        Image(systemName: party.isQueueing ? "pause.fill" : "play.fill")
                    }
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(EvalAccent.color)
                    .padding(.horizontal, 22)
                    .padding(.vertical, 12)
                    .background(surface, in: .capsule)
                }
                .buttonStyle(.plain)
                .disabled(partyModel.working)
            } else if party.isQueueing {
                HStack(spacing: 6) {
                    Text("Recherche…")
                    queueTimer(party)
                }
                .font(.system(size: 17))
                .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Spacer()

            Button { showingSettings = true } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(EvalAccent.color)
                    .frame(width: 50, height: 50)
                    .background(surface, in: .circle)
            }
            .buttonStyle(.plain)
        }
    }

    private func queueTimer(_ party: RiotPartyState) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { ctx in
            let seconds = max(0, Int(ctx.date.timeIntervalSince(party.queueEntry ?? ctx.date)))
            Text(String(format: "%02d:%02d", seconds / 60, seconds % 60)).monospacedDigit()
        }
    }

    private func accessButton(open: Bool, selected: Bool, enabled: Bool) -> some View {
        Button {
            Task { await partyModel.setOpen(store.riot, open) }
        } label: {
            Image(systemName: open ? "lock.open" : "lock")
                .font(.system(size: 19))
                .foregroundStyle(selected ? EvalAccent.color : Color(hex: 0x8E8E93))
                .frame(width: 46, height: 40)
                .background(selected ? Color.black.opacity(0.45) : .clear, in: .capsule)
        }
        .buttonStyle(.plain)
        .disabled(!enabled || selected || partyModel.working)
        .accessibilityLabel(open ? "Groupe public" : "Groupe privé")
    }
}

// MARK: - Paramètres du groupe

struct EvalPartySettingsSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var showingCode = false
    @State private var showingInvite = false
    @State private var showingJoin = false
    @State private var riotID = ""
    @State private var joinCode = ""

    private var store: ValorantStore { model.valorant }
    private var partyModel: RiotPartyModel { store.party }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "gearshape").font(.system(size: 36)).foregroundStyle(EvalAccent.color)
                        Text("Paramètres du groupe").font(.system(size: 24, weight: .bold)).foregroundStyle(EvalColors.text)
                        Text("Ajustez votre file d’attente, gérez les codes de groupe et configurez vos préférences de serveur.")
                            .font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                    .background(EvalColors.card2, in: .rect(cornerRadius: 26))

                    if let party = partyModel.party {
                        let leader = partyModel.isLeader(store.riot)
                        VStack(spacing: 0) {
                            HStack(spacing: 18) {
                                rowIcon("list.bullet")
                                Text("File d’attente").font(.system(size: 20)).foregroundStyle(EvalColors.text)
                                Spacer()
                                Menu {
                                    ForEach(party.eligibleQueues.isEmpty ? [party.queueID] : party.eligibleQueues, id: \.self) { queue in
                                        Button {
                                            Task { await partyModel.setQueue(store.riot, queue) }
                                        } label: {
                                            if queue == party.queueID { Label(RiotPartyModel.queueName(queue), systemImage: "checkmark") } else { Text(RiotPartyModel.queueName(queue)) }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(RiotPartyModel.queueName(party.queueID))
                                        Image(systemName: "chevron.up.chevron.down").font(.system(size: 14))
                                    }
                                    .font(.system(size: 19))
                                    .foregroundStyle(EvalAccent.color)
                                }
                                .disabled(!leader)
                            }
                            .settingsRow()

                            divider
                            Button { showingCode = true } label: {
                                HStack(spacing: 18) {
                                    rowIcon("character.cursor.ibeam")
                                    Text("Groupe Code").font(.system(size: 20)).foregroundStyle(EvalColors.text)
                                    Spacer()
                                    Text(party.inviteCode ?? "-").font(.system(size: 19)).foregroundStyle(Color(hex: 0x8E8E93))
                                    chevron
                                }
                                .settingsRow()
                            }
                            .buttonStyle(.plain)

                            divider
                            NavigationLink { EvalPartyServersView() } label: {
                                HStack(spacing: 18) {
                                    rowIcon("server.rack")
                                    Text("Serveurs").font(.system(size: 20)).foregroundStyle(EvalColors.text)
                                    Spacer()
                                    Text("\(party.preferredPods.count) / \(partyModel.pods(store.riot).count)")
                                        .font(.system(size: 19)).foregroundStyle(Color(hex: 0x8E8E93))
                                    chevron
                                }
                                .settingsRow()
                            }
                            .buttonStyle(.plain)
                            .disabled(!leader)
                        }
                        .background(EvalColors.card2, in: .rect(cornerRadius: 26))

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Inviter des joueurs").font(.system(size: 18, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.leading, 20)
                            Button { riotID = ""; showingInvite = true } label: {
                                HStack(spacing: 18) {
                                    rowIcon("person.badge.plus")
                                    Text("Inviter par Nom & Tag").font(.system(size: 20)).foregroundStyle(EvalAccent.color)
                                    Spacer()
                                }
                                .settingsRow()
                            }
                            .buttonStyle(.plain)
                            .background(EvalColors.card2, in: .rect(cornerRadius: 26))
                        }
                    } else {
                        Text("Ouvrez VALORANT sur votre PC pour gérer votre groupe.")
                            .font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(18)
            }
            .background(EvalColors.card.ignoresSafeArea())
            .navigationTitle("Paramètres du groupe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }.tint(EvalAccent.color)
                }
            }
        }
        .sheet(isPresented: $showingCode) { codeSheet.presentationDetents([.height(300)]) }
        .alert("Inviter par Nom & Tag", isPresented: $showingInvite) {
            TextField("Nom#Tag", text: $riotID).textInputAutocapitalization(.never).autocorrectionDisabled()
            Button("Inviter") { Task { await partyModel.invite(store.riot, riotID: riotID) } }
            Button("Annuler", role: .cancel) {}
        }
        .alert("Rejoindre par code", isPresented: $showingJoin) {
            TextField("Code", text: $joinCode).textInputAutocapitalization(.characters).autocorrectionDisabled()
            Button("Rejoindre") { Task { await partyModel.join(store.riot, code: joinCode) } }
            Button("Annuler", role: .cancel) {}
        }
        .alert("Groupe", isPresented: Binding(get: { partyModel.message != nil }, set: { if !$0 { partyModel.message = nil } })) {
            Button("OK", role: .cancel) { partyModel.message = nil }
        } message: {
            Text(partyModel.message ?? "")
        }
        .evalColorScheme()
    }

    private var codeSheet: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let code = partyModel.party?.inviteCode {
                    Button { UIPasteboard.general.string = code } label: {
                        HStack { Text(code).font(.system(size: 22, weight: .bold).monospaced()).foregroundStyle(EvalColors.text); Spacer(); Image(systemName: "doc.on.doc") }
                            .settingsRow()
                    }
                    .buttonStyle(.plain)
                    divider
                    Button { Task { await partyModel.disableCode(store.riot) } } label: {
                        Text("Désactiver le code").font(.system(size: 20)).foregroundStyle(EvalAccent.color).frame(maxWidth: .infinity, alignment: .leading).settingsRow()
                    }
                    .buttonStyle(.plain)
                } else {
                    Button { Task { await partyModel.generateCode(store.riot) } } label: {
                        Text("Générer un code").font(.system(size: 20)).foregroundStyle(EvalAccent.color).frame(maxWidth: .infinity, alignment: .leading).settingsRow()
                    }
                    .buttonStyle(.plain)
                    .disabled(!partyModel.isLeader(store.riot))
                }
                divider
                Button { joinCode = ""; showingCode = false; showingJoin = true } label: {
                    Text("Rejoindre une partie par code").font(.system(size: 20)).foregroundStyle(EvalAccent.color).frame(maxWidth: .infinity, alignment: .leading).settingsRow()
                }
                .buttonStyle(.plain)
            }
            .background(EvalColors.card2, in: .rect(cornerRadius: 26))
            .padding(18)
            .frame(maxHeight: .infinity, alignment: .top)
            .navigationTitle("Groupe Code")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingCode = false } label: { Image(systemName: "xmark") }.tint(EvalAccent.color)
                }
            }
        }
    }

    private func rowIcon(_ name: String) -> some View {
        Image(systemName: name).font(.system(size: 24)).foregroundStyle(EvalAccent.color).frame(width: 36)
    }

    private var chevron: some View {
        Image(systemName: "chevron.right").font(.system(size: 16, weight: .semibold)).foregroundStyle(Color(hex: 0x636366))
    }

    private var divider: some View {
        Divider().overlay(EvalColors.text.opacity(0.1)).padding(.leading, 72)
    }
}

struct EvalPartyServersView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var selected: Set<String> = []

    private var store: ValorantStore { model.valorant }

    var body: some View {
        let pods = store.party.pods(store.riot)
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                VStack(spacing: 0) {
                    ForEach(Array(pods.enumerated()), id: \.element.id) { index, pod in
                        Button {
                            if selected.contains(pod.id) { selected.remove(pod.id) } else { selected.insert(pod.id) }
                        } label: {
                            HStack(spacing: 14) {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundStyle(EvalAccent.color)
                                    .opacity(selected.contains(pod.id) ? 1 : 0)
                                    .frame(width: 26)
                                Text(RiotPartyModel.podName(pod.id))
                                    .font(.system(size: 20))
                                    .foregroundStyle(selected.contains(pod.id) ? .white : Color(hex: 0xAEAEB2))
                                Spacer()
                                Text("\(pod.ping)")
                                    .font(.system(size: 20).monospacedDigit())
                                    .foregroundStyle(pod.ping < 60 ? Color(hex: 0x35C26B) : pod.ping < 100 ? Color(hex: 0xF5A524) : Color(hex: 0xFD5B68))
                            }
                            .settingsRow()
                        }
                        .buttonStyle(.plain)
                        if index < pods.count - 1 { Divider().overlay(EvalColors.text.opacity(0.1)).padding(.leading, 58) }
                    }
                }
                .background(EvalColors.card2, in: .rect(cornerRadius: 26))

                Text("Le paramètre optimal équilibre un faible ping avec des temps d’attente raisonnables. Vous pouvez sélectionner des serveurs préférés, mais les temps d’attente peuvent augmenter. Les préférences ne sont pas garanties.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.horizontal, 20)

                if pods.isEmpty {
                    Text("Aucun ping disponible : le jeu doit être ouvert.").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .padding(18)
        }
        .background(EvalColors.card.ignoresSafeArea())
        .navigationTitle("Sélection du serveur")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task {
                        await store.party.setPods(store.riot, Array(selected))
                        dismiss()
                    }
                } label: { Image(systemName: "checkmark") }
                .buttonStyle(.glassProminent)
                .tint(EvalAccent.color)
                .disabled(selected.isEmpty)
            }
        }
        .onAppear { selected = Set(store.party.party?.preferredPods ?? []) }
    }
}

private extension View {
    func settingsRow() -> some View {
        padding(.horizontal, 18).frame(minHeight: 62).contentShape(.rect)
    }
}
