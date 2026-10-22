import SwiftUI

// Profil d'un joueur quelconque (recherche, classement, amis, tableau des scores),
// historique de la boutique et liste de souhaits. Données : Worker HenrikDev (borné),
// Supabase et la boutique réelle du compte Riot connecté.

struct EvalPlayerProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let name: String
    let tag: String

    @State private var player: ValorantStore.PlayerSnapshot?
    @State private var error: String?
    @State private var selectedMatch: ValorantMatch?

    private var store: ValorantStore { model.valorant }

    private var summaries: [ValorantMatch] {
        guard let player else { return [] }
        return player.matches.compactMap { $0.summary(for: player.puuid) }
            .sorted { ($0.startedAt ?? .distantPast) > ($1.startedAt ?? .distantPast) }
    }

    private var currentSeason: EvalMMR.Season? {
        guard let player, let act = store.currentAct else { return nil }
        return player.mmr.seasons.first { $0.season.lowercased() == act.id.lowercased() }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                header
                if let player {
                    profileCard(player)
                    careerCard(player)
                    NavigationLink { EvalStatisticsView(player: player) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(EvalAccent.color)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Voir les statistiques").font(.system(size: 18, weight: .bold)).foregroundStyle(EvalColors.text)
                                Text("Taux de victoire, K/D et plus").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                            }
                            Spacer()
                            Image(systemName: "chevron.right").foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .padding(16)
                        .background(EvalColors.card, in: .rect(cornerRadius: 20))
                    }
                    .buttonStyle(.plain)
                    matchesSection
                } else if let error {
                    ContentUnavailableView("Profil indisponible", systemImage: "person.crop.circle.badge.exclamationmark", description: Text(error))
                        .padding(.top, 60)
                } else {
                    ProgressView().tint(.white).padding(.top, 80)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(item: $selectedMatch) { match in
            ValorantMatchDetailView(match: match, initialTarget: player?.puuid)
        }
        .task {
            await ValorantAssets.shared.load()
            guard player == nil else { return }
            do { player = try await store.loadPlayer(name: name, tag: tag) }
            catch { self.error = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
        }
    }

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text))
            }
            .buttonStyle(.plain)
            Spacer()
            Text(player?.name ?? name).font(.system(size: 22, weight: .bold)).foregroundStyle(EvalColors.text).lineLimit(1)
            Spacer()
            Menu {
                if let player {
                    let saved = savedPlayer(player)
                    Button(store.bookmarkedPlayers.contains { $0.id == saved.id } ? "Retirer des signets" : "Ajouter aux signets",
                           systemImage: "bookmark") { store.toggleBookmark(player: saved) }
                    if store.isFriend(puuid: player.puuid) {
                        Button("Retirer des amis", systemImage: "person.badge.minus", role: .destructive) { store.removeFriend(id: player.puuid) }
                    } else {
                        Button("Ajouter aux amis", systemImage: "person.badge.plus") { store.sendFriendRequest(name: player.name, tag: player.tag) }
                    }
                    ShareLink(item: "\(player.name)#\(player.tag)") { Label("Partager le Riot ID", systemImage: "square.and.arrow.up") }
                }
            } label: {
                Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                    .overlay(Image(systemName: "ellipsis").font(.system(size: 20, weight: .bold)).foregroundStyle(EvalAccent.color))
            }
        }
        .padding(.top, 4)
    }

    private func savedPlayer(_ p: ValorantStore.PlayerSnapshot) -> ValorantSavedPlayer {
        ValorantSavedPlayer(id: p.puuid, name: p.name, tag: p.tag, level: p.level, tier: p.tier, cardURL: p.cardURL?.absoluteString, title: nil)
    }

    private func profileCard(_ p: ValorantStore.PlayerSnapshot) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Text(p.name).foregroundStyle(EvalColors.text)
                Text("#\(p.tag)").foregroundStyle(Color(hex: 0x8E8E93))
                Spacer()
                if p.level > 0 { Text("Niveau \(p.level)").foregroundStyle(Color(hex: 0x8E8E93)) }
            }
            .font(.system(size: 20, weight: .semibold))
            .padding(16)
            AsyncImage(url: p.bannerURL) { $0.image?.resizable().scaledToFill() }
                .frame(height: 100).frame(maxWidth: .infinity).clipped()
                .background(Color(hex: 0x1E2436))
            HStack(alignment: .top) {
                rankColumn(title: store.currentAct?.name ?? "", tier: p.mmr.tier, subtitle: p.mmr.tier > 0 ? "\(p.mmr.rr) SC" : "0 SC",
                           badge: p.mmr.leaderboardRank > 0 ? "Rang \(p.mmr.leaderboardRank)" : nil)
                rankColumn(title: store.actName(p.mmr.peakSeason), tier: p.mmr.peakTier, subtitle: "Plus haut rang atteint", badge: nil)
            }
            .padding(16)
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private func rankColumn(title: String, tier: Int, subtitle: String, badge: String?) -> some View {
        VStack(spacing: 6) {
            Text(title).font(.system(size: 13, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
            Group {
                if tier > 0 {
                    AsyncImage(url: ValorantProfile.tierIcon(tier)) { $0.image?.resizable().scaledToFit() }
                } else {
                    Image(systemName: "questionmark.circle.fill").resizable().scaledToFit().foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .frame(width: 74, height: 74)
            Text(tier > 0 ? EvalRanks.name(tier).uppercased() : "NON CLASSÉ")
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(tier > 0 ? Color(hex: EvalRanks.color(tier)) : .white)
            Text(subtitle).font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
            if let badge {
                Text(badge).font(.system(size: 16, weight: .bold))
                    .foregroundStyle(tier == 27 ? Color.black.opacity(0.8) : .white)
                    .padding(.horizontal, 16).padding(.vertical, 6)
                    .background(Color(hex: EvalRanks.color(tier)), in: .capsule)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func careerCard(_ p: ValorantStore.PlayerSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Résumé de carrière").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text)
                Spacer()
                Text("\(p.mmr.seasons.count) \(p.mmr.seasons.count > 1 ? "Actes" : "Acte")").foregroundStyle(Color(hex: 0x8E8E93))
            }
            if let season = currentSeason {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(season.winRate.formatted(.percent.precision(.fractionLength(1)).locale(Locale(identifier: "fr_FR"))))
                            .font(.system(size: 28, weight: .heavy)).foregroundStyle(Color(hex: 0x2DD4BF))
                        Text("Taux de victoire").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(season.wins) / \(season.games)").font(.system(size: 28, weight: .heavy).monospacedDigit()).foregroundStyle(EvalColors.text)
                        Text("Victoires / Parties").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
            } else {
                Text("Aucune partie classée pendant l’acte en cours.").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            let recent = Array(p.mmr.seasons.suffix(3).reversed())
            if !recent.isEmpty {
                HStack {
                    ForEach(recent) { s in
                        VStack(spacing: 6) {
                            AsyncImage(url: ValorantProfile.tierIcon(s.endTier)) { $0.image?.resizable().scaledToFit() }.frame(width: 39, height: 39)
                            Text(store.actName(s.season).isEmpty ? s.short.uppercased() : store.actName(s.season))
                                .font(.system(size: 12, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93)).lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var matchesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Matchs").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text).padding(.leading, 4)
            if summaries.isEmpty {
                Text("Aucune partie enregistrée pour ce joueur.").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.leading, 4)
            }
            ForEach(summaries) { match in
                Button { selectedMatch = match } label: { EvalCompactMatchRow(match: match) }.buttonStyle(.plain)
            }
        }
    }
}

/// Ligne de match compacte (profil d'un autre joueur).
struct EvalCompactMatchRow: View {
    let match: ValorantMatch

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: match.myPlayer?.agentIconURL) { $0.image?.resizable().scaledToFill() }
                .frame(width: 53, height: 53).clipShape(.rect(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 3) {
                Text("\(match.map) · \(EvalProfileView.modeName(match.mode))").font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalColors.text)
                if let date = match.startedAt {
                    Text(date.formatted(.dateTime.day(.twoDigits).month(.twoDigits).hour().minute().locale(Locale(identifier: "fr_FR"))))
                        .font(.system(size: 14)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                Text("\(match.teamRounds) — \(match.opponentRounds)")
                    .font(.system(size: 17, weight: .bold).monospacedDigit())
                    .foregroundStyle(match.won ? Color(hex: 0x35C26B) : EvalAccent.color)
                Text("\(match.kills) / \(match.deaths) / \(match.assists)").font(.system(size: 14).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
            }
            Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(14)
        .background(EvalColors.card, in: .rect(cornerRadius: 18))
    }
}

// MARK: - Boutique

struct EvalShopHistoryView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var tab = 0
    @State private var sort = Sort.recent

    enum Sort: String, CaseIterable { case recent = "Plus récents", count = "Plus fréquents", name = "Nom", price = "Prix" }

    private struct Entry: Identifiable {
        let id: String
        let name: String
        let image: String
        let color: Color?
        let price: Int
        let count: Int
        let last: Date
    }

    private var skinEntries: [Entry] {
        var map: [String: Entry] = [:]
        for day in model.valorant.shopHistory {
            for offer in day.offers {
                let old = map[offer.id]
                map[offer.id] = Entry(id: offer.id, name: offer.name, image: offer.imageURL, color: Color(hex: offer.colorHex),
                                      price: offer.price, count: (old?.count ?? 0) + 1, last: max(old?.last ?? .distantPast, day.day))
            }
        }
        return sorted(Array(map.values))
    }

    private var accessoryEntries: [Entry] {
        var map: [String: Entry] = [:]
        var seen: [String: Set<Date>] = [:]
        for day in model.valorant.shopHistory {
            for item in day.accessories ?? [] {
                let week = Calendar.current.dateInterval(of: .weekOfYear, for: day.day)?.start ?? day.day
                let isNewRotation = seen[item.id, default: []].insert(week).inserted
                let old = map[item.id]
                map[item.id] = Entry(id: item.id, name: item.name, image: item.imageURL, color: nil, price: item.price,
                                     count: (old?.count ?? 0) + (isNewRotation ? 1 : 0), last: max(old?.last ?? .distantPast, day.day))
            }
        }
        return sorted(Array(map.values))
    }

    private func sorted(_ list: [Entry]) -> [Entry] {
        switch sort {
        case .recent: list.sorted { ($0.last, $0.count, $1.name) > ($1.last, $1.count, $0.name) }
        case .count: list.sorted { ($0.count, $0.last) > ($1.count, $1.last) }
        case .name: list.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .price: list.sorted { ($0.price, $0.last) > ($1.price, $1.last) }
        }
    }

    private func dayText(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) { return "Aujourd'hui" }
        if calendar.isDateInYesterday(date) { return "Hier" }
        return date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "fr_FR")))
    }

    var body: some View {
        let store = model.valorant
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                EvalNavHeader(title: "Historique de la boutique", trailing: AnyView(
                    Menu {
                        Picker("Trier", selection: $sort) {
                            ForEach(Sort.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                        }
                    } label: {
                        Circle().fill(EvalColors.card).frame(width: 51, height: 51)
                            .overlay(Image(systemName: "arrow.up.arrow.down").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalAccent.color))
                    }
                )) { dismiss() }
                Picker("", selection: $tab) {
                    Text("Skins").tag(0)
                    Text("Accessoires").tag(1)
                    Text("Rotations").tag(2)
                }
                .pickerStyle(.segmented)
                .padding(.bottom, 14)
                if store.shopHistory.isEmpty {
                    ContentUnavailableView("Aucune boutique enregistrée", systemImage: "clock.arrow.circlepath",
                                           description: Text("Chaque jour où vous ouvrez l’onglet Jeu avec votre compte Riot connecté, les offres du jour sont enregistrées ici."))
                        .padding(.top, 40)
                } else if tab == 2 {
                    ForEach(store.shopHistory) { day in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(day.day.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "fr_FR"))).capitalized)
                                .font(.system(size: 18, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.leading, 4)
                            ForEach(day.offers) { offer in EvalDailyOfferCard(offer: offer) }
                        }
                    }
                } else {
                    let list = tab == 0 ? skinEntries : accessoryEntries
                    if list.isEmpty {
                        ContentUnavailableView("Aucun accessoire enregistré", systemImage: "sparkles",
                                               description: Text("Les accessoires sont enregistrés à chaque nouvelle rotation du magasin d’accessoires."))
                            .padding(.top, 40)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(list.enumerated()), id: \.element.id) { index, entry in
                                row(entry, wished: tab == 0 && store.isWished(entry.id))
                                if index < list.count - 1 {
                                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 106)
                                }
                            }
                        }
                        .padding(.vertical, 6)
                        .background(EvalColors.card, in: .rect(cornerRadius: 28))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }

    private func row(_ entry: Entry, wished: Bool) -> some View {
        HStack(spacing: 14) {
            AsyncImage(url: URL(string: entry.image)) { $0.image?.resizable().scaledToFit() }
                .frame(width: 62, height: 34)
            HStack(spacing: 6) {
                if wished {
                    Image(systemName: "heart.circle.fill").font(.system(size: 16)).foregroundStyle(entry.color ?? EvalAccent.color)
                }
                Text(entry.name)
                    .font(.system(size: 19))
                    .foregroundStyle(entry.color ?? EvalColors.text)
                    .lineLimit(2)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(entry.count)×").font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalColors.text)
                Text(dayText(entry.last)).font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 20)
        .frame(minHeight: 70)
    }
}

struct EvalWishlistView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let store = model.valorant
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                EvalNavHeader(title: "Liste de souhaits") { dismiss() }
                if store.wishlist.isEmpty {
                    ContentUnavailableView("Liste vide", systemImage: "heart",
                                           description: Text("Ajoutez des skins avec le cœur depuis Armes → Skins. Ils sont signalés quand ils apparaissent dans votre boutique."))
                        .padding(.top, 40)
                }
                ForEach(store.wishlist) { item in
                    let inShop = store.storeOffers.contains { $0.id.lowercased() == item.id }
                    HStack(spacing: 14) {
                        AsyncImage(url: URL(string: item.icon)) { $0.image?.resizable().scaledToFit() }.frame(width: 110, height: 44)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(item.name).font(.system(size: 18, weight: .semibold)).foregroundStyle(EvalColors.text)
                            if inShop { Text("Dans votre boutique aujourd’hui").font(.system(size: 15, weight: .semibold)).foregroundStyle(Color(hex: 0x35C26B)) }
                        }
                        Spacer()
                        Button { store.toggleWish(id: item.id, name: item.name, icon: item.icon) } label: {
                            Image(systemName: "heart.fill").foregroundStyle(EvalAccent.color)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(16)
                    .background(EvalColors.card, in: .rect(cornerRadius: 18))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 110)
        }
        .scrollIndicators(.hidden)
        .background(EvalColors.background.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }
}
