import SwiftUI

enum MatchDetailTab: String, CaseIterable, Identifiable {
    case summary = "Résumé"
    case scoreboard = "Tableau des scores"
    case rounds = "Manches"
    case duels = "Duels"
    case performance = "Performance"
    case economy = "Économie"

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

struct ValorantMatchDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let match: ValorantMatch

    @State private var selectedTab: MatchDetailTab = .summary
    @State private var sortBy: PlayerSortCriteria = .acs
    @State private var targetedPlayerID: String?
    @State private var expandedPlayerIDs: Set<String> = []
    @State private var performanceFilter: Int = 0
    @State private var selectedDuel: String? = nil
    @State private var showingScoreboardMenu = false

    private let assets = ValorantAssets.shared

    private var targetedPlayer: ValorantMatchPlayer {
        if let targetedPlayerID, let p = match.players.first(where: { $0.id == targetedPlayerID }) {
            return p
        }
        return match.myPlayer ?? match.players.first ?? defaultFallbackPlayer
    }

    private var defaultFallbackPlayer: ValorantMatchPlayer {
        ValorantMatchPlayer(
            id: "Rub19#Boss",
            name: "Rub19",
            tag: "Boss",
            team: "Blue",
            character: "Jett",
            tierText: "Immortel 3",
            tierNumber: 26,
            isMe: true,
            agentIconURL: URL(string: "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png"),
            score: 415,
            kills: 20,
            deaths: 5,
            assists: 4,
            headshotPercent: 28,
            damageMade: 4320,
            adr: 225,
            performanceScore: 360,
            partyId: "party-1",
            kast: 100,
            firstKills: 4,
            firstDeaths: 0,
            afkRounds: 0,
            plants: 1,
            tags: ["MVP", "Dueliste"]
        )
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
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                customNavBar

                tabsSelector
                    .padding(.top, 4)
                    .padding(.bottom, 12)

                ScrollView {
                    VStack(spacing: 20) {
                        switch selectedTab {
                        case .summary:
                            summaryTabContent
                        case .scoreboard:
                            scoreboardTabContent
                        case .rounds:
                            roundsTabContent
                        case .duels:
                            duelsTabContent
                        case .performance:
                            performanceTabContent
                        case .economy:
                            economyTabContent
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 100)
                }
                .scrollIndicators(.hidden)
            }

            if showingScoreboardMenu {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                            showingScoreboardMenu = false
                        }
                    }

                scoreboardFloatingMenu
                    .padding(.horizontal, 24)
                    .padding(.bottom, 50)
                    .transition(.scale(scale: 0.94).combined(with: .opacity))
            } else {
                dockedPlayerBar
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            if targetedPlayerID == nil {
                targetedPlayerID = match.myPlayer?.id ?? "Rub19#Boss"
            }
            await assets.load()
        }
    }

    private var customNavBar: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            HStack(spacing: 8) {
                Image(systemName: "shield.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(Color(hex: 0xFD5B68))

                Text(match.map.isEmpty ? "Ascent" : match.map)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)

                HStack(spacing: 4) {
                    Text("\(match.teamRounds)")
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("—")
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("\(match.opponentRounds)")
                        .foregroundStyle(Color(hex: 0xFD5B68))
                }
                .font(.headline.weight(.bold).monospacedDigit())
            }

            Spacer()

            ShareLink(item: "Partie Valorant sur \(match.map) : \(match.won ? "Victoire" : "Défaite") \(match.teamRounds)-\(match.opponentRounds)") {
                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    )
            }
            .buttonStyle(PressScaleStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var tabsSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(MatchDetailTab.allCases) { tab in
                    let isSelected = selectedTab == tab
                    Button {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                            selectedTab = tab
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(.system(size: 14, weight: isSelected ? .bold : .medium))
                            .foregroundStyle(isSelected ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                isSelected ? Color(hex: 0xFD5B68).opacity(0.18) : Color(hex: 0x161618),
                                in: .capsule
                            )
                            .overlay(
                                Capsule()
                                    .strokeBorder(isSelected ? Color(hex: 0xFD5B68).opacity(0.4) : Color.white.opacity(0.04), lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private var summaryTabContent: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "shield.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Image(systemName: "desktopcomputer")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        Text(match.mode.isEmpty ? "Non classé" : match.mode)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Text("17/10/26 · 01:00")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }

                HStack {
                    Text("Paris")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    Text("18min 19s")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }

                ZStack {
                    if let mapURL = assets.maps[match.map.lowercased()] {
                        AsyncImage(url: mapURL) { img in
                            img.resizable().scaledToFill()
                        } placeholder: {
                            Color(hex: 0x1E2436)
                        }
                        .frame(height: 120)
                        .clipped()
                    } else {
                        Color(hex: 0x1E2436).frame(height: 120)
                    }

                    LinearGradient(
                        colors: [Color.black.opacity(0.4), Color.black.opacity(0.1)],
                        startPoint: .top,
                        endPoint: .bottom
                    )

                    HStack(spacing: 8) {
                        Text("\(match.teamRounds)")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(Color(hex: 0x2DD4BF))
                        Text("—")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white.opacity(0.6))
                        Text("\(match.opponentRounds)")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                    .padding(.horizontal, 22)
                    .padding(.vertical, 8)
                    .background(Color.black.opacity(0.45), in: .capsule)
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.15), lineWidth: 1))
                }
                .clipShape(.rect(cornerRadius: 14))
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            HStack(spacing: 12) {
                agentAvatarView(for: targetedPlayer)
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text(targetedPlayer.name)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                        Text("#\(targetedPlayer.tag)")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    HStack(spacing: 4) {
                        Image(systemName: "rhombus.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Text(targetedPlayer.tierText.uppercased())
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 3) {
                    Text(match.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(match.won ? Color(hex: 0x35B86B) : Color(hex: 0xFD5B68))
                    Text("\(match.teamRounds) — \(match.opponentRounds)")
                        .font(.system(size: 13, weight: .semibold).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 8) {
                Text("VS MOYENNE DU LOBBY (N=9)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                VStack(spacing: 0) {
                    lobbyMetricRow(title: "ACS", value: "\(targetedPlayer.score)", delta: "220")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "ADR", value: "\(targetedPlayer.adr)", delta: "136")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "HS%", value: "\(targetedPlayer.headshotPercent)%", delta: "9%")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "KAST", value: "\(targetedPlayer.kast)%", delta: "29%")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "K/D", value: String(format: "%.2f", targetedPlayer.kd), delta: "2.95")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "FK / round", value: "0.27", delta: "0.21")
                }
                .padding(.horizontal, 20)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("MI-TEMPS")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                HStack(spacing: 12) {
                    halfCard(title: "ATQ", score: "10 / 12", kills: 20, deaths: 5, assists: 4, plants: 1, defuses: 0, firstKills: 4, firstDeaths: 0)
                    halfCard(title: "DEF", score: "3 / 3", kills: 0, deaths: 0, assists: 0, plants: 0, defuses: 0, firstKills: 0, firstDeaths: 0)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("MOMENTS FORTS DU MATCH")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        highlightPill(text: "2K")
                        highlightPill(text: "3K ×3")
                        highlightPill(text: "4K")
                        highlightPill(text: "1V1 CLUTCH")
                        highlightPill(text: "KAST ÉLEVÉ")
                    }
                }
            }
        }
    }

    private func lobbyMetricRow(title: String, value: String, delta: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 15))
                .foregroundStyle(.white)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(value)
                    .font(.system(size: 15, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)
                HStack(spacing: 2) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 9, weight: .bold))
                    Text(delta)
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundStyle(Color(hex: 0x22C55E))
            }

            Image(systemName: "chevron.down")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .padding(.leading, 8)
        }
        .padding(.vertical, 12)
    }

    private func halfCard(title: String, score: String, kills: Int, deaths: Int, assists: Int, plants: Int, defuses: Int, firstKills: Int, firstDeaths: Int) -> some View {
        VStack(spacing: 12) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color(hex: 0x8E8E93))

            Text(score)
                .font(.system(size: 26, weight: .heavy))
                .foregroundStyle(.white)

            VStack(spacing: 6) {
                halfStatRow("Éliminations", "\(kills)")
                halfStatRow("Morts", "\(deaths)")
                halfStatRow("Assistances", "\(assists)")
                halfStatRow("Poses", "\(plants)")
                halfStatRow("Désamorçage", "\(defuses)")
                halfStatRow("Premiers Sangs", "\(firstKills)")
                halfStatRow("Premières morts", "\(firstDeaths)")
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private func halfStatRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(Color(hex: 0x8E8E93))
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
        }
    }

    private func highlightPill(text: String) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color(hex: 0x222224), in: .capsule)
            .overlay(Capsule().strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    private var scoreboardTabContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Text("VOTRE ÉQUIPE")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                VStack(spacing: 8) {
                    ForEach(sortPlayers(match.myTeamPlayers)) { player in
                        scoreboardPlayerCard(player: player, isAlly: true)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("ÉQUIPE ENNEMIE")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                VStack(spacing: 8) {
                    ForEach(sortPlayers(match.enemyTeamPlayers)) { player in
                        scoreboardPlayerCard(player: player, isAlly: false)
                    }
                }
            }
        }
    }

    private func scoreboardPlayerCard(player: ValorantMatchPlayer, isAlly: Bool) -> some View {
        let isExpanded = expandedPlayerIDs.contains(player.id)
        let stripeColor = isAlly ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68)

        return HStack(spacing: 0) {
            Rectangle()
                .fill(stripeColor)
                .frame(width: 4)

            VStack(spacing: 12) {
                HStack(spacing: 10) {
                    agentAvatarView(for: player)
                        .frame(width: 38, height: 38)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 4) {
                            Text(player.name)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                            if !player.tag.isEmpty {
                                Text("#\(player.tag)")
                                    .font(.system(size: 12))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        }

                        if player.tierNumber >= 24 {
                            HStack(spacing: 4) {
                                Image(systemName: "rhombus.fill")
                                    .font(.system(size: 8))
                                    .foregroundStyle(Color(hex: 0xFD5B68))
                                Text(player.tierText.uppercased())
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Color(hex: 0xFD5B68))
                            }
                        } else if !player.tierText.isEmpty && player.tierText.lowercased().contains("non") {
                            HStack(spacing: 4) {
                                Image(systemName: "questionmark.circle.fill")
                                    .font(.system(size: 9))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                                Text("NON CLASSÉ")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        } else if !player.tierText.isEmpty {
                            Text(player.tierText.uppercased())
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                    }

                    Spacer()

                    HStack(spacing: 10) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Color(hex: 0xFD5B68))

                        Button {
                            withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                                if isExpanded {
                                    expandedPlayerIDs.remove(player.id)
                                } else {
                                    expandedPlayerIDs.insert(player.id)
                                }
                            }
                        } label: {
                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .buttonStyle(.plain)
                    }
                }

                HStack(spacing: 0) {
                    let kdColor: Color = player.kd >= 2.0 ? Color(hex: 0x2DD4BF) : (player.kd >= 1.0 ? Color(hex: 0x22C55E) : Color(hex: 0xFD5B68))

                    VStack(spacing: 2) {
                        Text(String(format: "%.2f", player.kd))
                            .font(.system(size: 14, weight: .bold).monospacedDigit())
                            .foregroundStyle(kdColor)
                        Text("K/D")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 2) {
                        Text("\(player.kills) / \(player.deaths) / \(player.assists)")
                            .font(.system(size: 14, weight: .semibold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text("K/D/A")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 2) {
                        Text("\(player.headshotPercent)%")
                            .font(.system(size: 14, weight: .semibold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text("HS%")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 2) {
                        Text("\(player.score)")
                            .font(.system(size: 14, weight: .bold).monospacedDigit())
                            .foregroundStyle(.white)
                        Text("ACS")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)
                }

                if isExpanded {
                    VStack(spacing: 8) {
                        Divider().overlay(Color.white.opacity(0.06))
                        statLine(title: "ADR", value: "\(player.adr)")
                        statLine(title: "KAST", value: "\(player.kast)%")
                        statLine(title: "Premières éliminations", value: "\(player.firstKills)")
                        statLine(title: "Premières morts", value: "\(player.firstDeaths)")
                        statLine(title: "Poses", value: "\(player.plants)")
                    }
                }
            }
            .padding(14)
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 16))
        .clipShape(.rect(cornerRadius: 16))
    }

    private func statLine(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 13))
                .foregroundStyle(Color(hex: 0x8E8E93))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
        }
    }

    private var roundsTabContent: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("Tués par Round")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 2) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 8))
                        Rectangle()
                            .frame(width: 1.5, height: 10)
                        Image(systemName: "play.fill")
                            .font(.system(size: 8))
                            .rotationEffect(.degrees(180))
                    }
                    .foregroundStyle(Color(hex: 0xFD5B68))
                }

                roundsKillsGrid
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            HStack(spacing: 12) {
                Image(systemName: "map")
                    .font(.system(size: 22))
                    .foregroundStyle(Color(hex: 0xFD5B68))

                VStack(alignment: .leading, spacing: 3) {
                    Text("Détails par Round")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                    Text("Consultez la carte, la chronologie et les événements de chaque manche.")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private var roundsKillsGrid: some View {
        let rounds: [(round: Int, won: Bool, ally: [String], enemy: [String])] = [
            (1, true, ["Jett", "Jett", "Jett", "Reyna", "Skye"], ["Chamber", "Jett", "Phoenix"]),
            (2, true, ["Jett", "Jett", "Jett", "Jett", "Phoenix"], ["Sova"]),
            (3, true, ["Jett", "Jett", "Jett", "Harbor", "Skye"], ["Sova", "Sova", "Chamber", "Neon"]),
            (4, true, ["Jett", "Reyna", "Reyna", "Phoenix", "Skye"], ["Jett"]),
            (5, false, ["Jett", "Phoenix", "Harbor", "Skye"], ["Sova", "Sova", "Sova", "Neon", "Phoenix"]),
            (6, true, ["Jett", "Reyna", "Reyna", "Reyna", "Phoenix"], ["Chamber", "Jett"]),
            (7, false, ["Phoenix", "Harbor", "Harbor"], ["Chamber", "Neon", "Neon", "Phoenix"]),
            (8, true, ["Jett", "Reyna", "Reyna", "Harbor", "Harbor"], ["Sova", "Chamber"]),
            (9, true, ["Jett", "Reyna", "Reyna", "Skye", "Phoenix"], ["Chamber"]),
            (10, true, ["Jett", "Jett", "Phoenix", "Skye", "Harbor"], ["Sova", "Neon"]),
            (11, true, ["Jett", "Reyna", "Harbor", "Skye", "Phoenix"], ["Chamber"]),
            (12, true, ["Jett", "Jett", "Reyna", "Reyna", "Skye"], ["Sova", "Phoenix"])
        ]

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .center, spacing: 10) {
                ForEach(rounds, id: \.round) { r in
                    VStack(spacing: 6) {
                        VStack(spacing: 4) {
                            ForEach(Array(r.ally.reversed().enumerated()), id: \.offset) { _, agent in
                                agentAvatar(name: agent, size: 26)
                                    .clipShape(Circle())
                                    .overlay(Circle().strokeBorder(Color(hex: 0x2DD4BF), lineWidth: 1.2))
                            }
                        }
                        .frame(height: 156, alignment: .bottom)

                        Text("\(r.round)")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(r.won ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                            .frame(width: 32, height: 32)
                            .background(
                                r.won ? Color(hex: 0x16332A) : Color(hex: 0x36181C),
                                in: .rect(cornerRadius: 6)
                            )

                        VStack(spacing: 4) {
                            ForEach(Array(r.enemy.enumerated()), id: \.offset) { _, agent in
                                agentAvatar(name: agent, size: 26)
                                    .clipShape(Circle())
                                    .overlay(Circle().strokeBorder(Color(hex: 0xFD5B68), lineWidth: 1.2))
                            }
                        }
                        .frame(height: 156, alignment: .top)
                    }
                }
            }
            .padding(.vertical, 8)
        }
    }

    private var duelsTabContent: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                duelCard(
                    icon: "flame.fill",
                    title: "RIVAL PRINCIPAL",
                    allyAgent: "Jett",
                    enemyAgent: "Sova",
                    score: "6 : 1",
                    subtitle: "7 duels"
                )

                duelCard(
                    icon: "arrow.triangle.2.circlepath",
                    title: "LE PLUS ÉCHANGÉ",
                    allyAgent: "Jett",
                    enemyAgent: "Chamber",
                    score: "1 : 1",
                    subtitle: "2 duels"
                )
            }

            VStack(alignment: .leading, spacing: 14) {
                Text("Matrice des duels")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)

                duelMatrixGrid
            }
            .padding(14)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            HStack(spacing: 6) {
                Text("👆")
                    .font(.system(size: 13))
                Text("Touchez un duel pour voir l'analyse complète.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 6)

            HStack(spacing: 0) {
                VStack(spacing: 4) {
                    Text("TOTAL DE DUELS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("85")
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("PREMIERS SANGS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("8")
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("TAUX DE VICTOIRE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("67%")
                        .font(.system(size: 24, weight: .heavy))
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                }
                .frame(maxWidth: .infinity)
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private func duelCard(icon: String, title: String, allyAgent: String, enemyAgent: String, score: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundStyle(icon == "flame.fill" ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            HStack(spacing: 12) {
                agentAvatar(name: allyAgent, size: 36)
                    .clipShape(Circle())

                VStack(spacing: 2) {
                    Text(score)
                        .font(.system(size: 17, weight: .heavy))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }

                agentAvatar(name: enemyAgent, size: 36)
                    .clipShape(Circle())
            }
            .frame(maxWidth: .infinity)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 16))
    }

    private var duelMatrixGrid: some View {
        let allies = ["Jett", "Reyna", "Phoenix", "Harbor", "Skye"]
        let enemies = ["Sova", "Chamber", "Jett", "Neon", "Phoenix"]
        let gridValues: [[(Int, Int)]] = [
            [(6, 1), (1, 1), (3, 1), (5, 1), (5, 1)],
            [(2, 0), (4, 2), (3, 1), (1, 1), (2, 0)],
            [(1, 1), (3, 2), (2, 3), (1, 1), (3, 1)],
            [(2, 2), (2, 1), (1, 1), (2, 0), (1, 1)],
            [(0, 3), (2, 1), (2, 1), (3, 1), (0, 0)]
        ]

        return VStack(spacing: 6) {
            HStack(spacing: 6) {
                Color.clear.frame(width: 44, height: 44)
                ForEach(enemies, id: \.self) { en in
                    agentAvatar(name: en, size: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Color(hex: 0xFD5B68).opacity(0.45), lineWidth: 1.5)
                        )
                        .frame(maxWidth: .infinity)
                }
            }

            ForEach(0..<allies.count, id: \.self) { row in
                HStack(spacing: 6) {
                    agentAvatar(name: allies[row], size: 44)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Color(hex: 0x2DD4BF).opacity(0.45), lineWidth: 1.5)
                        )

                    ForEach(0..<enemies.count, id: \.self) { col in
                        let pair = gridValues[row][col]
                        let won = pair.0 > pair.1
                        let lost = pair.0 < pair.1
                        let zero = pair.0 == 0 && pair.1 == 0

                        VStack {
                            HStack(spacing: 2) {
                                Text("\(pair.0)")
                                    .foregroundStyle(won ? Color(hex: 0x2DD4BF) : (zero ? Color(hex: 0x545458) : .white))
                                Text(":")
                                    .foregroundStyle(zero ? Color(hex: 0x545458) : .white)
                                Text("\(pair.1)")
                                    .foregroundStyle(lost ? Color(hex: 0xFD5B68) : (zero ? Color(hex: 0x545458) : .white))
                            }
                            .font(.system(size: 13, weight: .bold).monospacedDigit())
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(
                            won ? Color(hex: 0x163328) :
                            (lost ? Color(hex: 0x36181C) : (zero ? Color(hex: 0x1B1B1E) : Color(hex: 0x242428))),
                            in: .rect(cornerRadius: 8)
                        )
                    }
                }
            }
        }
    }

    private var performanceTabContent: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("ACS PAR MANCHE")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    HStack(spacing: 4) {
                        Text("ACS")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                }

                HStack(spacing: 0) {
                    perfFilterButton(title: "Tous", index: 0)
                    perfFilterButton(title: "Attaque", index: 1)
                    perfFilterButton(title: "Défense", index: 2)
                }
                .padding(3)
                .background(Color(hex: 0x222224), in: .capsule)

                roundsDashIndicator

                acsLineChart
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 12) {
                Text("MANCHES")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                VStack(spacing: 0) {
                    performanceRoundRow(round: 1, won: true, isPistol: true, kills: 3, deaths: 0, assists: 0, killedAgents: ["Sova", "Chamber", "Phoenix"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 2, won: true, isPistol: true, kills: 4, deaths: 0, assists: 0, killedAgents: ["Sova", "Chamber", "Neon", "Phoenix"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 3, won: true, isPistol: false, kills: 3, deaths: 0, assists: 1, killedAgents: ["Sova", "Chamber", "Phoenix"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 4, won: true, isPistol: false, kills: 1, deaths: 0, assists: 0, killedAgents: ["Reyna"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 5, won: false, isPistol: false, kills: 1, deaths: 1, assists: 0, killedAgents: ["Neon"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 6, won: true, isPistol: false, kills: 1, deaths: 1, assists: 0, killedAgents: ["Sova"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 7, won: false, isPistol: false, kills: 0, deaths: 1, assists: 1, killedAgents: [])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 8, won: true, isPistol: false, kills: 1, deaths: 1, assists: 0, killedAgents: ["Neon"])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 9, won: true, isPistol: false, kills: 0, deaths: 0, assists: 1, killedAgents: [])
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 10, won: true, isPistol: false, kills: 1, deaths: 0, assists: 0, killedAgents: ["Neon"])
                }
                .padding(.horizontal, 16)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }
        }
    }

    private func perfFilterButton(title: String, index: Int) -> some View {
        Button {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                performanceFilter = index
            }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: performanceFilter == index ? .bold : .medium))
                .foregroundStyle(performanceFilter == index ? .white : Color(hex: 0x8E8E93))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(
                    performanceFilter == index ? Color(hex: 0x545458) : Color.clear,
                    in: .capsule
                )
        }
        .buttonStyle(.plain)
    }

    private var roundsDashIndicator: some View {
        let roundsCount = 12
        let wonRounds = [1, 2, 3, 4, 6, 8, 9, 10, 11, 12]

        return HStack(spacing: 4) {
            ForEach(1...roundsCount, id: \.self) { r in
                let won = wonRounds.contains(r)
                Capsule()
                    .fill(won ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                    .frame(height: 3)
            }
        }
        .padding(.vertical, 4)
    }

    private var acsLineChart: some View {
        VStack(spacing: 4) {
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "diamond.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(Color(hex: 0xF5D78E))
                    Text("MEILLEUR")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Color(hex: 0xF5D78E))
                }
                Spacer()
                Text("Moyenne du lobby 140")
                    .font(.system(size: 10))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }
            .padding(.horizontal, 8)

            ZStack(alignment: .bottom) {
                GeometryReader { geo in
                    let w = geo.size.width
                    let h = geo.size.height

                    Path { path in
                        path.move(to: CGPoint(x: 0, y: h * 0.7))
                        path.addCurve(to: CGPoint(x: w * 0.16, y: h * 0.2), control1: CGPoint(x: w * 0.08, y: h * 0.4), control2: CGPoint(x: w * 0.12, y: h * 0.2))
                        path.addCurve(to: CGPoint(x: w * 0.45, y: h * 0.75), control1: CGPoint(x: w * 0.3, y: h * 0.2), control2: CGPoint(x: w * 0.35, y: h * 0.75))
                        path.addCurve(to: CGPoint(x: w * 0.7, y: h * 0.35), control1: CGPoint(x: w * 0.55, y: h * 0.75), control2: CGPoint(x: w * 0.6, y: h * 0.35))
                        path.addCurve(to: CGPoint(x: w, y: h * 0.8), control1: CGPoint(x: w * 0.8, y: h * 0.35), control2: CGPoint(x: w * 0.9, y: h * 0.8))
                        path.addLine(to: CGPoint(x: w, y: h))
                        path.addLine(to: CGPoint(x: 0, y: h))
                        path.closeSubpath()
                    }
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0xFD5B68).opacity(0.35), Color(hex: 0xFD5B68).opacity(0.0)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    Path { path in
                        path.move(to: CGPoint(x: 0, y: h * 0.7))
                        path.addCurve(to: CGPoint(x: w * 0.16, y: h * 0.2), control1: CGPoint(x: w * 0.08, y: h * 0.4), control2: CGPoint(x: w * 0.12, y: h * 0.2))
                        path.addCurve(to: CGPoint(x: w * 0.45, y: h * 0.75), control1: CGPoint(x: w * 0.3, y: h * 0.2), control2: CGPoint(x: w * 0.35, y: h * 0.75))
                        path.addCurve(to: CGPoint(x: w * 0.7, y: h * 0.35), control1: CGPoint(x: w * 0.55, y: h * 0.75), control2: CGPoint(x: w * 0.6, y: h * 0.35))
                        path.addCurve(to: CGPoint(x: w, y: h * 0.8), control1: CGPoint(x: w * 0.8, y: h * 0.35), control2: CGPoint(x: w * 0.9, y: h * 0.8))
                    }
                    .stroke(Color(hex: 0xFD5B68), lineWidth: 2.2)

                    Path { path in
                        path.move(to: CGPoint(x: 0, y: h * 0.6))
                        path.addLine(to: CGPoint(x: w, y: h * 0.6))
                    }
                    .stroke(Color.white.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                }
                .frame(height: 110)

                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(hex: 0xFD5B68))
                            .frame(width: 6, height: 6)
                        Text("FAIBLE")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                    .padding(.trailing, 24)
                }
            }
        }
    }

    private func performanceRoundRow(round: Int, won: Bool, isPistol: Bool, kills: Int, deaths: Int, assists: Int, killedAgents: [String]) -> some View {
        HStack(spacing: 12) {
            Text("\(round)")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(won ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                .frame(width: 20)

            Group {
                if isPistol {
                    pistolSilhouette
                } else {
                    rifleSilhouette
                }
            }
            .frame(width: 24)

            HStack(spacing: -6) {
                ForEach(Array(killedAgents.enumerated()), id: \.offset) { _, agent in
                    agentAvatar(name: agent, size: 24)
                        .clipShape(Circle())
                        .overlay(Circle().strokeBorder(Color(hex: 0x161618), lineWidth: 1.5))
                }
            }

            Spacer()

            Text("\(kills) / \(deaths) / \(assists)")
                .font(.system(size: 14, weight: .semibold).monospacedDigit())
                .foregroundStyle(.white)

            Image(systemName: "chevron.down")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.vertical, 12)
    }

    private var economyTabContent: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("ÉCONOMIE VS LOBBY (N=9)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
                    .padding(.leading, 6)

                VStack(spacing: 0) {
                    econMetricRow(title: "Dépense moyenne", value: "2 296", delta: "=", deltaColor: nil)
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Équipement moyen", value: "3 967", delta: "↑ 264", deltaColor: Color(hex: 0x2DD4BF))
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Dégâts / 1 k dépensés", value: "123", delta: "↑ 73", deltaColor: Color(hex: 0x2DD4BF))
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Mort avec en réserve", value: "27 400", delta: "↑ 13 211", deltaColor: Color(hex: 0xFD5B68))
                }
                .padding(.horizontal, 20)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("ÉQUIPEMENT DE L'ÉQUIPE PAR MANCHE")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    HStack(spacing: 4) {
                        Text("Équipement")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                }

                roundsDashIndicator

                dualEconomyChart

                HStack(spacing: 16) {
                    HStack(spacing: 6) {
                        Circle().fill(Color(hex: 0x2DD4BF)).frame(width: 7, height: 7)
                        Text("Le Vôtre").font(.system(size: 12)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    HStack(spacing: 6) {
                        Circle().fill(Color(hex: 0xFD5B68)).frame(width: 7, height: 7)
                        Text("Ennemi").font(.system(size: 12)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("DÉGÂTS · VS ÉQUIPEMENT")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    HStack(spacing: 4) {
                        Text("vs Équipement")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                }

                HStack(spacing: 0) {
                    VStack(spacing: 4) {
                        Text("282")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(.white)
                        Text("MOY. INFLIGÉS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text("119")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(.white)
                        Text("MOY. SUBIS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text("163")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(Color(hex: 0x2DD4BF))
                        Text("NET MOY.")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text("71")
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(.white)
                        Text("DÉGÂTS / 1 K...")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)
                }

                economyScatterPlot
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private var economyScatterPlot: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .trailing) {
                VStack {
                    HStack {
                        Spacer()
                        Text("1000").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    Spacer()
                    HStack {
                        Spacer()
                        Text("500").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    Spacer()
                    HStack {
                        Spacer()
                        Text("0").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .frame(height: 120)

                GeometryReader { geo in
                    let w = geo.size.width - 32
                    let h = geo.size.height

                    Path { path in
                        path.move(to: CGPoint(x: 0, y: h * 0.5))
                        path.addLine(to: CGPoint(x: w, y: h * 0.5))
                        path.move(to: CGPoint(x: 0, y: h * 0.96))
                        path.addLine(to: CGPoint(x: w, y: h * 0.96))
                    }
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)

                    Path { path in
                        let yPos = h * (1.0 - (282.0 / 1000.0))
                        path.move(to: CGPoint(x: 0, y: yPos))
                        path.addLine(to: CGPoint(x: w, y: yPos))
                    }
                    .stroke(Color.white.opacity(0.18), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))

                    Text("Moy. 282")
                        .font(.system(size: 9))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .position(x: w - 24, y: h * (1.0 - (282.0 / 1000.0)) - 8)

                    let points: [(Double, Double)] = [
                        (800, 310), (1200, 480), (3900, 420), (4100, 150),
                        (3900, 140), (4300, 160), (3800, 40), (4200, 170),
                        (4000, 50), (4100, 160), (4400, 320), (4600, 290)
                    ]

                    ForEach(0..<points.count, id: \.self) { idx in
                        let pt = points[idx]
                        let xRatio = min(1.0, max(0.0, pt.0 / 5000.0))
                        let yRatio = min(1.0, max(0.0, pt.1 / 1000.0))
                        let px = xRatio * w
                        let py = h * (1.0 - yRatio)

                        Circle()
                            .fill(Color(hex: 0x2DD4BF).opacity(0.85))
                            .frame(width: 7, height: 7)
                            .position(x: px, y: py)
                    }
                }
                .frame(height: 120)
            }

            Text("Valeur de l'équipement (crédits)")
                .font(.system(size: 11))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 4)
        }
    }

    private func econMetricRow(title: String, value: String, delta: String, deltaColor: Color?) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 15))
                .foregroundStyle(.white)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(value)
                    .font(.system(size: 15, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)

                Text(delta)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(deltaColor ?? Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.down")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .padding(.leading, 8)
        }
        .padding(.vertical, 12)
    }

    private var dualEconomyChart: some View {
        ZStack(alignment: .trailing) {
            VStack {
                HStack {
                    Spacer()
                    Text("20k").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                }
                Spacer()
                HStack {
                    Spacer()
                    Text("10k").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                }
                Spacer()
                HStack {
                    Spacer()
                    Text("0").font(.system(size: 9)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .frame(height: 110)

            GeometryReader { geo in
                let w = geo.size.width - 24
                let h = geo.size.height

                Path { path in
                    path.move(to: CGPoint(x: 0, y: h * 0.5))
                    path.addLine(to: CGPoint(x: w, y: h * 0.5))
                    path.move(to: CGPoint(x: 0, y: h * 0.9))
                    path.addLine(to: CGPoint(x: w, y: h * 0.9))
                }
                .stroke(Color.white.opacity(0.08), lineWidth: 1)

                Path { path in
                    path.move(to: CGPoint(x: 0, y: h * 0.88))
                    path.addCurve(to: CGPoint(x: w * 0.22, y: h * 0.6), control1: CGPoint(x: w * 0.08, y: h * 0.88), control2: CGPoint(x: w * 0.14, y: h * 0.6))
                    path.addCurve(to: CGPoint(x: w * 0.45, y: h * 0.22), control1: CGPoint(x: w * 0.3, y: h * 0.6), control2: CGPoint(x: w * 0.38, y: h * 0.22))
                    path.addCurve(to: CGPoint(x: w * 0.72, y: h * 0.2), control1: CGPoint(x: w * 0.55, y: h * 0.22), control2: CGPoint(x: w * 0.65, y: h * 0.2))
                    path.addCurve(to: CGPoint(x: w, y: h * 0.15), control1: CGPoint(x: w * 0.82, y: h * 0.2), control2: CGPoint(x: w * 0.92, y: h * 0.15))
                }
                .stroke(Color(hex: 0x2DD4BF), lineWidth: 2)

                Path { path in
                    path.move(to: CGPoint(x: 0, y: h * 0.88))
                    path.addCurve(to: CGPoint(x: w * 0.2, y: h * 0.5), control1: CGPoint(x: w * 0.08, y: h * 0.88), control2: CGPoint(x: w * 0.12, y: h * 0.5))
                    path.addCurve(to: CGPoint(x: w * 0.32, y: h * 0.82), control1: CGPoint(x: w * 0.24, y: h * 0.5), control2: CGPoint(x: w * 0.28, y: h * 0.82))
                    path.addCurve(to: CGPoint(x: w * 0.5, y: h * 0.42), control1: CGPoint(x: w * 0.38, y: h * 0.82), control2: CGPoint(x: w * 0.44, y: h * 0.42))
                    path.addCurve(to: CGPoint(x: w * 0.7, y: h * 0.75), control1: CGPoint(x: w * 0.6, y: h * 0.42), control2: CGPoint(x: w * 0.65, y: h * 0.75))
                    path.addCurve(to: CGPoint(x: w, y: h * 0.48), control1: CGPoint(x: w * 0.8, y: h * 0.75), control2: CGPoint(x: w * 0.92, y: h * 0.48))
                }
                .stroke(Color(hex: 0xFD5B68), lineWidth: 2)
            }
            .frame(height: 110)
        }
    }

    private var dockedPlayerBar: some View {
        HStack {
            Menu {
                ForEach(match.players) { p in
                    Button {
                        targetedPlayerID = p.id
                    } label: {
                        HStack {
                            Text(p.handle)
                            if p.id == targetedPlayer.id {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 8) {
                    agentAvatar(name: targetedPlayer.character, size: 28)
                        .clipShape(RoundedRectangle(cornerRadius: 6))

                    VStack(alignment: .leading, spacing: 1) {
                        Text("JOUEUR CIBLÉ")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        HStack(spacing: 0) {
                            Text(targetedPlayer.name)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                            if !targetedPlayer.tag.isEmpty {
                                Text("#\(targetedPlayer.tag)")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        }
                    }

                    Image(systemName: "arrow.up.arrow.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.leading, 4)
                }
            }
            .buttonStyle(.plain)

            Spacer()

            if selectedTab == .scoreboard {
                Button {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        showingScoreboardMenu.toggle()
                    }
                } label: {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text("TRIER")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        HStack(spacing: 4) {
                            Text(sortBy.label)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                            Image(systemName: "arrow.up.arrow.down")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(hex: 0x161618), in: .capsule)
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
        .shadow(color: .black.opacity(0.5), radius: 10, y: 4)
    }

    private var scoreboardFloatingMenu: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Button {
                } label: {
                    HStack {
                        Spacer()
                        Image(systemName: "person.2.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Spacer()
                    }
                    .padding(.vertical, 8)
                    .background(Color(hex: 0x3E3E42), in: .capsule)
                }
                .buttonStyle(.plain)

                Button {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                        showingScoreboardMenu = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "chevron.compact.down")
                                .font(.system(size: 10, weight: .bold))
                            Rectangle().frame(width: 10, height: 1.5)
                            Image(systemName: "chevron.compact.up")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundStyle(Color(hex: 0xFD5B68))
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
            .padding(4)
            .background(Color(hex: 0x2A2A2E), in: .capsule)
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 12)

            Divider().overlay(Color.white.opacity(0.08))

            Button {
                showingScoreboardMenu = false
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    Text("Actualiser les profils")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            Divider().overlay(Color.white.opacity(0.08))

            Menu {
                ForEach(PlayerSortCriteria.allCases) { criteria in
                    Button {
                        sortBy = criteria
                        showingScoreboardMenu = false
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
                HStack(spacing: 14) {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    Text("Trier par")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)

            Divider().overlay(Color.white.opacity(0.08))

            Menu {
                ForEach(match.players) { p in
                    Button {
                        targetedPlayerID = p.id
                        showingScoreboardMenu = false
                    } label: {
                        HStack {
                            Text(p.handle)
                            if p.id == targetedPlayer.id {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "scope")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    Text("Joueur ciblé")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 14)
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: 320)
        .background(Color(hex: 0x1E1E22), in: .rect(cornerRadius: 22))
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.7), radius: 24, y: 8)
    }

    private func agentAvatarView(for player: ValorantMatchPlayer) -> some View {
        Group {
            if let agentURL = player.agentIconURL ?? assets.agents[player.character.lowercased()] {
                AsyncImage(url: agentURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFit()
                    default:
                        Image(systemName: "person.crop.circle.fill")
                            .resizable()
                            .foregroundStyle(Color(hex: 0x222224))
                    }
                }
            } else {
                agentAvatar(name: player.character, size: 36)
            }
        }
    }

    private func agentAvatar(name: String, size: CGFloat = 26) -> some View {
        let lower = name.lowercased()
        let staticURLs: [String: String] = [
            "jett": "https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png",
            "reyna": "https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png",
            "phoenix": "https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png",
            "harbor": "https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png",
            "skye": "https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png",
            "sova": "https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png",
            "chamber": "https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png",
            "neon": "https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png",
            "iso": "https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png",
            "clove": "https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png",
            "omen": "https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png"
        ]
        let url = assets.agents[lower] ?? (staticURLs[lower].flatMap(URL.init(string:)))

        return Group {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFit()
                    default:
                        Image(systemName: "person.crop.circle.fill")
                            .resizable()
                            .foregroundStyle(Color(hex: 0x333336))
                    }
                }
            } else {
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundStyle(Color(hex: 0x333336))
            }
        }
        .frame(width: size, height: size)
    }

    private var pistolSilhouette: some View {
        Path { p in
            p.move(to: CGPoint(x: 2, y: 5))
            p.addLine(to: CGPoint(x: 18, y: 5))
            p.addLine(to: CGPoint(x: 18, y: 8))
            p.addLine(to: CGPoint(x: 10, y: 8))
            p.addLine(to: CGPoint(x: 8, y: 15))
            p.addLine(to: CGPoint(x: 5, y: 15))
            p.addLine(to: CGPoint(x: 7, y: 8))
            p.addLine(to: CGPoint(x: 2, y: 8))
            p.closeSubpath()
        }
        .fill(Color(hex: 0x8E8E93))
        .frame(width: 20, height: 16)
    }

    private var rifleSilhouette: some View {
        Path { p in
            p.move(to: CGPoint(x: 0, y: 6))
            p.addLine(to: CGPoint(x: 22, y: 6))
            p.addLine(to: CGPoint(x: 22, y: 8))
            p.addLine(to: CGPoint(x: 15, y: 8))
            p.addLine(to: CGPoint(x: 14, y: 13))
            p.addLine(to: CGPoint(x: 12, y: 13))
            p.addLine(to: CGPoint(x: 12, y: 8))
            p.addLine(to: CGPoint(x: 7, y: 8))
            p.addLine(to: CGPoint(x: 5, y: 12))
            p.addLine(to: CGPoint(x: 2, y: 12))
            p.addLine(to: CGPoint(x: 4, y: 8))
            p.addLine(to: CGPoint(x: 0, y: 8))
            p.closeSubpath()
        }
        .fill(Color(hex: 0x8E8E93))
        .frame(width: 24, height: 14)
    }
}
