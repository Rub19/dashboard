import SwiftUI

enum MatchDetailTab: String, CaseIterable, Identifiable {
    case summary = "Résumé"
    case scoreboard = "Tableau des scores"
    case rounds = "Manches"
    case details = "Détails"

    var id: String { rawValue }
}

enum PlayerSortCriteria: String, CaseIterable, Identifiable {
    case acs = "ACS"
    case kd = "K/D"
    case kills = "Kills"
    case damage = "ADR"
    case headshot = "HS%"

    var id: String { rawValue }
    var label: String { rawValue }
}

/// Écran complet des détails d'une partie Valorant façon VALPAW et Liquid Glass Apple iOS 26/27.
struct ValorantMatchDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let match: ValorantMatch

    @State private var selectedTab: MatchDetailTab = .scoreboard
    @State private var sortBy: PlayerSortCriteria = .acs
    @State private var targetedPlayerID: String?
    @State private var expandedPlayerIDs: Set<String> = []
    @State private var showingShareSheet = false

    private let assets = ValorantAssets.shared

    private var targetedPlayer: ValorantMatchPlayer? {
        if let targetedPlayerID {
            return match.players.first { $0.id == targetedPlayerID }
        }
        return match.myPlayer
    }

    private func sortPlayers(_ list: [ValorantMatchPlayer]) -> [ValorantMatchPlayer] {
        list.sorted { a, b in
            switch sortBy {
            case .acs: return a.score > b.score
            case .kd: return a.kd > b.kd
            case .kills: return a.kills > b.kills
            case .damage: return a.adr > b.adr
            case .headshot: return a.headshotPercent > b.headshotPercent
            }
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 18) {
                    customNavBar
                    tabsSelector

                    switch selectedTab {
                    case .scoreboard:
                        scoreboardTabContent
                    case .summary:
                        summaryTabContent
                    case .rounds:
                        roundsTabContent
                    case .details:
                        detailsTabContent
                    }
                }
                .padding(.bottom, 90) // Safe padding for docked bottom bar
            }

            if selectedTab == .scoreboard {
                bottomDockedBar
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
            }
        }
        .navigationBarBackButtonHidden(true)
        .ethoneScreen()
        .task {
            if targetedPlayerID == nil {
                targetedPlayerID = match.myPlayer?.id
            }
            await assets.load()
        }
    }

    // MARK: - Custom Navigation Bar
    private var customNavBar: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .glassEffect(.regular, in: .circle)
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            // Map and Score title
            HStack(spacing: 8) {
                Image(systemName: "rhombus.fill")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(match.map)
                    .font(.headline.weight(.heavy))
                    .foregroundStyle(.white)

                HStack(spacing: 4) {
                    Text("\(match.teamRounds)")
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("—")
                        .foregroundStyle(.secondary)
                    Text("\(match.opponentRounds)")
                        .foregroundStyle(Theme.danger)
                }
                .font(.headline.weight(.heavy).monospacedDigit())
            }

            Spacer()

            ShareLink(item: "Partie Valorant sur \(match.map) : \(match.won ? "Victoire" : "Défaite") \(match.teamRounds)-\(match.opponentRounds) (\(match.agent) \(match.kills)/\(match.deaths)/\(match.assists))") {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .glassEffect(.regular, in: .circle)
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
    }

    // MARK: - Segmented Tabs
    private var tabsSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(MatchDetailTab.allCases) { tab in
                    let isSelected = selectedTab == tab
                    Button {
                        withAnimation(Motion.snap) {
                            selectedTab = tab
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(.subheadline.weight(isSelected ? .bold : .medium))
                            .foregroundStyle(isSelected ? Theme.danger : .secondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background {
                                if isSelected {
                                    Capsule()
                                        .fill(Theme.danger.opacity(0.22))
                                        .overlay(Capsule().strokeBorder(Theme.danger.opacity(0.45), lineWidth: 1))
                                } else {
                                    Capsule()
                                        .fill(Color.white.opacity(0.04))
                                }
                            }
                    }
                    .buttonStyle(PressScaleStyle())
                    .sensoryFeedback(.selection, trigger: selectedTab)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Scoreboard Tab
    private var scoreboardTabContent: some View {
        VStack(alignment: .leading, spacing: 18) {
            // VOTRE ÉQUIPE
            VStack(alignment: .leading, spacing: 10) {
                Text("VOTRE ÉQUIPE")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(.secondary)
                    .tracking(0.8)
                    .padding(.horizontal, 16)

                VStack(spacing: 8) {
                    ForEach(sortPlayers(match.myTeamPlayers)) { player in
                        playerCard(player: player, isFriendlyTeam: true)
                    }
                }
                .padding(.horizontal, 16)
            }

            // ÉQUIPE ENNEMIE
            VStack(alignment: .leading, spacing: 10) {
                Text("ÉQUIPE ENNEMIE")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(.secondary)
                    .tracking(0.8)
                    .padding(.horizontal, 16)

                VStack(spacing: 8) {
                    ForEach(sortPlayers(match.enemyTeamPlayers)) { player in
                        playerCard(player: player, isFriendlyTeam: false)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Player Card Component
    private func playerCard(player: ValorantMatchPlayer, isFriendlyTeam: Bool) -> some View {
        let isTargeted = targetedPlayerID == player.id
        let isExpanded = expandedPlayerIDs.contains(player.id)
        let accentStripeColor = isFriendlyTeam ? Color(hex: 0x2DD4BF) : Theme.danger
        let partyColor = partyColor(for: player)

        return HStack(spacing: 0) {
            // Left vertical accent stripe
            Rectangle()
                .fill(accentStripeColor)
                .frame(width: 4)

            VStack(spacing: 12) {
                // Top identity row
                HStack(spacing: 10) {
                    // Agent rounded square portrait (matching screenshot DA)
                    agentAvatarView(for: player)
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(accentStripeColor.opacity(0.4), lineWidth: 1.2))

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(player.name)
                                .font(.subheadline.weight(player.isMe ? .heavy : .bold))
                                .foregroundStyle(player.isMe ? Theme.accent : .white)
                                .lineLimit(1)

                            if !player.tag.isEmpty {
                                Text("#\(player.tag)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }

                        // Rank badge
                        HStack(spacing: 4) {
                            if let rankIcon = player.rankIconURL {
                                AsyncImage(url: rankIcon) { img in
                                    img.resizable().scaledToFit()
                                } placeholder: {
                                    Image(systemName: "shield.fill")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                                .frame(width: 13, height: 13)
                            } else if player.tierNumber == 0 {
                                Image(systemName: "questionmark.circle.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.secondary)
                            }

                            Text(player.tierText.uppercased())
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(player.tierNumber == 27 ? Color(hex: 0xF5D78E) : .secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    // Action / Party pastille + Person status + Expand chevron
                    HStack(spacing: 6) {
                        if let partyColor {
                            Circle()
                                .fill(partyColor)
                                .frame(width: 7, height: 7)
                        }

                        Image(systemName: "person.fill")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 22, height: 22)
                            .background(Theme.danger.opacity(0.85), in: .circle)

                        Button {
                            withAnimation(Motion.snap) {
                                if expandedPlayerIDs.contains(player.id) {
                                    expandedPlayerIDs.remove(player.id)
                                } else {
                                    expandedPlayerIDs.insert(player.id)
                                }
                            }
                        } label: {
                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(.secondary)
                                .frame(width: 26, height: 26)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(PressScaleStyle())
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(Motion.snap) {
                        targetedPlayerID = player.id
                    }
                }

                // 4-column key figures row
                HStack(spacing: 0) {
                    // K/D
                    VStack(spacing: 2) {
                        Text(String(format: "%.2f", player.kd))
                            .font(.subheadline.weight(.bold).monospacedDigit())
                            .foregroundStyle(player.kd >= 1.0 ? Color(hex: 0x2DD4BF) : Theme.danger)
                        Text("K/D")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)

                    // K/D/A
                    VStack(spacing: 2) {
                        Text("\(player.kills) / \(player.deaths) / \(player.assists)")
                            .font(.subheadline.weight(.semibold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text("K/D/A")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)

                    // HS%
                    VStack(spacing: 2) {
                        Text("\(player.headshotPercent)%")
                            .font(.subheadline.weight(.semibold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text("HS%")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)

                    // ACS
                    VStack(spacing: 2) {
                        Text("\(player.score)")
                            .font(.subheadline.weight(.bold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text(match.scoreLabel)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(Motion.snap) {
                        targetedPlayerID = player.id
                    }
                }

                // Expanded stats section (matching screenshot 4)
                if isExpanded {
                    VStack(alignment: .leading, spacing: 10) {
                        Rectangle()
                            .fill(Color.white.opacity(0.08))
                            .frame(height: 1)
                            .padding(.top, 2)

                        VStack(spacing: 8) {
                            statLine(title: "ADR", value: "\(player.adr)")
                            statLine(title: "HS %", value: "\(player.headshotPercent)%")
                            statLine(title: "KAST", value: "\(player.kast)%")
                            statLine(title: "Premiers éliminations", value: "\(player.firstKills)")
                            statLine(title: "Premières morts", value: "\(player.firstDeaths)")
                            statLine(title: "Manches AFK", value: "\(player.afkRounds)")
                            statLine(title: "Poses", value: "\(player.plants)")
                        }

                        if !player.tags.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(player.tags, id: \.self) { tag in
                                        Text(tag)
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundStyle(.white.opacity(0.95))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 5)
                                            .background(Color.white.opacity(0.12), in: .capsule)
                                    }
                                }
                            }
                            .padding(.top, 4)
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)

            // Right vertical party indicator stripe (matching screenshot 3)
            if let partyColor {
                Rectangle()
                    .fill(partyColor)
                    .frame(width: 4)
            }
        }
        .glassEffect(isTargeted ? Glass.regular.tint(accentStripeColor.opacity(0.2)) : Glass.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius)
                .strokeBorder(isTargeted ? accentStripeColor.opacity(0.8) : Color.white.opacity(0.08), lineWidth: isTargeted ? 1.5 : 0.8)
        )
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
    }

    private func statLine(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.bold).monospacedDigit())
                .foregroundStyle(.white)
        }
    }

    private func partyColor(for player: ValorantMatchPlayer) -> Color? {
        guard let partyId = player.partyId, !partyId.isEmpty else { return nil }
        let teamList = player.team.lowercased() == "red" ? match.enemyTeamPlayers : match.myTeamPlayers
        let partyMembers = teamList.filter { $0.partyId == partyId }
        guard partyMembers.count > 1 else { return nil }

        let palette: [Color] = [
            Color(hex: 0xFF764A), // Orange / Coral (screenshot 3 PingLove & Mash)
            Color(hex: 0xF5C443), // Yellow / Amber (screenshot 3 soloking, 八点, chronix)
            Color(hex: 0x00CEC9), // Teal
            Color(hex: 0xA29BFE), // Lavender
        ]
        let distinctParties = Array(Set(teamList.compactMap(\.partyId))).sorted()
        guard let idx = distinctParties.firstIndex(of: partyId) else { return palette[0] }
        return palette[idx % palette.count]
    }

    @ViewBuilder
    private func agentAvatarView(for player: ValorantMatchPlayer) -> some View {
        if let icon = player.agentIconURL {
            AsyncImage(url: icon) { img in img.resizable().scaledToFill() } placeholder: { Color.primary.opacity(0.1) }
        } else if let assetURL = assets.agents[player.character.lowercased()] {
            AsyncImage(url: assetURL) { img in img.resizable().scaledToFill() } placeholder: { Color.primary.opacity(0.1) }
        } else {
            ZStack {
                Color.black.opacity(0.4)
                Text(String(player.character.prefix(1)).uppercased())
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Bottom Docked Bar
    private var bottomDockedBar: some View {
        HStack {
            // Targeted Player
            HStack(spacing: 8) {
                if let targeted = targetedPlayer {
                    agentAvatarView(for: targeted)
                        .frame(width: 28, height: 28)
                        .clipShape(Circle())
                        .overlay(Circle().strokeBorder(Color.white.opacity(0.3), lineWidth: 1))
                } else {
                    Image(systemName: "scope")
                        .font(.subheadline)
                        .foregroundStyle(Theme.accent)
                }

                VStack(alignment: .leading, spacing: 1) {
                    Text("JOUEUR CIBLÉ")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(.secondary)
                        .tracking(0.6)
                    Text(targetedPlayer?.handle ?? "Rub19#Boss")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Sort Menu
            Menu {
                ForEach(PlayerSortCriteria.allCases) { criteria in
                    Button {
                        sortBy = criteria
                    } label: {
                        HStack {
                            Text(criteria.label)
                            if sortBy == criteria {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                VStack(alignment: .trailing, spacing: 1) {
                    Text("TRIER")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(.secondary)
                        .tracking(0.6)
                    HStack(spacing: 4) {
                        Text(sortBy.label)
                            .font(.footnote.weight(.bold))
                            .foregroundStyle(.white)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.white.opacity(0.08), in: .capsule)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .glassEffect(.regular, in: .capsule)
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
        .shadow(color: .black.opacity(0.35), radius: 12, y: 6)
    }

    // MARK: - Summary Tab
    private var summaryTabContent: some View {
        VStack(spacing: 16) {
            // Hero Match Card with map artwork
            ZStack(alignment: .bottomLeading) {
                if let mapURL = assets.maps[match.map.lowercased()] {
                    AsyncImage(url: mapURL) { img in img.resizable().scaledToFill() } placeholder: { Color.primary.opacity(0.1) }
                        .frame(height: 140)
                        .frame(maxWidth: .infinity)
                        .clipped()
                        .overlay(LinearGradient(colors: [.black.opacity(0.8), .black.opacity(0.3)], startPoint: .leading, endPoint: .trailing))
                } else {
                    Rectangle().fill(Color.black.opacity(0.5)).frame(height: 140)
                }

                HStack(alignment: .bottom, spacing: 14) {
                    if let agentURL = assets.agents[match.agent.lowercased()] {
                        AsyncImage(url: agentURL) { img in img.resizable().scaledToFit() } placeholder: { Color.clear }
                            .frame(width: 100, height: 120)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(match.won ? "VICTOIRE" : "DÉFAITE")
                            .font(.caption.weight(.heavy))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(match.won ? Theme.success : Theme.danger, in: .capsule)

                        Text("\(match.teamRounds) — \(match.opponentRounds)")
                            .font(.title.weight(.heavy).monospacedDigit())
                            .foregroundStyle(.white)

                        Text("\(match.mode) · \(match.map)")
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    .padding(.bottom, 12)
                }
                .padding(.horizontal, 14)
            }
            .frame(height: 140)
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .padding(.horizontal, 16)

            // Performance Key Figures
            StatStrip(items: [
                (String(format: "%.2f", match.kd), "K/D"),
                ("\(match.kills)/\(match.deaths)/\(match.assists)", "K/D/A"),
                ("\(match.headshotPercent) %", "Tirs tête"),
                (match.scoreValue.map(String.init) ?? "—", match.scoreLabel),
            ])
            .padding(.horizontal, 16)

            // MVP Highlight
            if let mvp = match.players.max(by: { $0.score < $1.score }) {
                GlassCard {
                    HStack(spacing: 12) {
                        agentAvatarView(for: mvp)
                            .frame(width: 44, height: 44)
                            .clipShape(Circle())
                            .overlay(Circle().strokeBorder(Color(hex: 0xF5D78E), lineWidth: 2))

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 6) {
                                Text("MVP DU MATCH")
                                    .font(.system(size: 10, weight: .heavy))
                                    .foregroundStyle(Color(hex: 0xF5D78E))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: 0xF5D78E).opacity(0.2), in: .capsule)

                                Text(mvp.handle)
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(.white)
                            }

                            Text("\(mvp.score) \(match.scoreLabel) · \(mvp.kills) éliminations (\(String(format: "%.2f", mvp.kd)) K/D)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Rounds Tab
    private var roundsTabContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("HISTORIQUE DES MANCHES")
                .font(.caption.weight(.heavy))
                .foregroundStyle(.secondary)
                .tracking(0.8)
                .padding(.horizontal, 16)

            LazyVStack(spacing: 8) {
                ForEach(match.rounds) { round in
                    HStack(spacing: 12) {
                        Text("R\(round.id)")
                            .font(.caption.weight(.heavy).monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 32)

                        Circle()
                            .fill(round.won ? Theme.success : Theme.danger)
                            .frame(width: 10, height: 10)

                        Text(round.won ? "Victoire d'équipe" : "Manche adverse")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(round.won ? Theme.success : Theme.danger)

                        Spacer()

                        HStack(spacing: 4) {
                            Image(systemName: round.winType.contains("defused") ? "shield.fill" : (round.winType.contains("detonated") ? "flame.fill" : "scope"))
                                .font(.caption2)
                            Text(round.winType)
                                .font(.caption.weight(.medium))
                        }
                        .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .glassEffect(.regular, in: .rect(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Details & Economy Tab
    private var detailsTabContent: some View {
        VStack(spacing: 14) {
            if let player = targetedPlayer {
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Efficacité au combat — \(player.handle)").font(.headline)

                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Dégâts infligés").font(.caption).foregroundStyle(.secondary)
                                Text("\(player.damageMade)").font(.title3.weight(.bold)).foregroundStyle(.white)
                            }
                            Spacer()
                            VStack(alignment: .leading, spacing: 4) {
                                Text("ADR (Dégâts/Manche)").font(.caption).foregroundStyle(.secondary)
                                Text("\(player.adr)").font(.title3.weight(.bold)).foregroundStyle(.white)
                            }
                            Spacer()
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Précision tirs tête").font(.caption).foregroundStyle(.secondary)
                                Text("\(player.headshotPercent)%").font(.title3.weight(.bold)).foregroundStyle(Theme.accent)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
            }

            GlassCard {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Système de notation").font(.subheadline.weight(.semibold))
                    Text(match.scoring == .performance
                        ? "Score de performance actif (0-500) : note officielle introduite au patch 13.06 calculée à partir de l'impact réel et des trades."
                        : "Score de combat moyen (ACS) traditionnel : points par manche calculés sur l'ensemble des manches jouées.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
