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

            dockedPlayerBar
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
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
                    lobbyMetricRow(title: "ACS", value: "\(targetedPlayer.score)", delta: "+220")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "ADR", value: "\(targetedPlayer.adr)", delta: "+136")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "HS%", value: "\(targetedPlayer.headshotPercent)%", delta: "+9%")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "KAST", value: "\(targetedPlayer.kast)%", delta: "+29%")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "K/D", value: String(format: "%.2f", targetedPlayer.kd), delta: "+2.95")
                    Divider().overlay(Color.white.opacity(0.06))
                    lobbyMetricRow(title: "FK / round", value: "0.27", delta: "+0.21")
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
                        highlightPill(text: "3K x3")
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
                .foregroundStyle(Color(hex: 0x2DD4BF))
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

                        HStack(spacing: 4) {
                            Image(systemName: "rhombus.fill")
                                .font(.system(size: 8))
                                .foregroundStyle(player.tierNumber >= 24 ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                            Text(player.tierText.uppercased())
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(player.tierNumber >= 24 ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                        }
                    }

                    Spacer()

                    HStack(spacing: 10) {
                        Circle()
                            .fill(Color(hex: 0xFD5B68).opacity(0.85))
                            .frame(width: 20, height: 20)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.white)
                            )

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
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .buttonStyle(.plain)
                    }
                }

                HStack(spacing: 0) {
                    VStack(spacing: 2) {
                        Text(String(format: "%.2f", player.kd))
                            .font(.system(size: 14, weight: .bold).monospacedDigit())
                            .foregroundStyle(player.kd >= 1.0 ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
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
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                }

                roundsKillsGrid
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            HStack(spacing: 12) {
                Image(systemName: "map")
                    .font(.system(size: 20))
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
        let roundsCount = 12
        let roundsWon = [1, 2, 3, 4, 6, 8, 9, 10, 11, 12]

        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .center, spacing: 10) {
                ForEach(1...roundsCount, id: \.self) { r in
                    let won = roundsWon.contains(r)

                    VStack(spacing: 6) {
                        VStack(spacing: 4) {
                            ForEach(0..<(won ? 3 : 1), id: \.self) { _ in
                                Circle()
                                    .fill(Color(hex: 0x222224))
                                    .frame(width: 26, height: 26)
                                    .overlay(
                                        Image(systemName: "person.crop.circle.fill")
                                            .font(.system(size: 22))
                                            .foregroundStyle(Color(hex: 0x2DD4BF))
                                    )
                                    .overlay(Circle().strokeBorder(Color(hex: 0x2DD4BF), lineWidth: 1.5))
                            }
                        }
                        .frame(height: 120, alignment: .bottom)

                        Text("\(r)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(won ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                            .frame(width: 30, height: 30)
                            .background(
                                won ? Color(hex: 0x2DD4BF).opacity(0.12) : Color(hex: 0xFD5B68).opacity(0.12),
                                in: .rect(cornerRadius: 6)
                            )

                        VStack(spacing: 4) {
                            ForEach(0..<(won ? 1 : 4), id: \.self) { _ in
                                Circle()
                                    .fill(Color(hex: 0x222224))
                                    .frame(width: 26, height: 26)
                                    .overlay(
                                        Image(systemName: "person.crop.circle.fill")
                                            .font(.system(size: 22))
                                            .foregroundStyle(Color(hex: 0xFD5B68))
                                    )
                                    .overlay(Circle().strokeBorder(Color(hex: 0xFD5B68), lineWidth: 1.5))
                            }
                        }
                        .frame(height: 120, alignment: .top)
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
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)

                duelMatrixGrid
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            HStack(spacing: 6) {
                Image(systemName: "hand.tap.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: 0x8E8E93))
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
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("PREMIERS SANGS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("8")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 4) {
                    Text("TAUX DE VICTOIRE")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("67%")
                        .font(.system(size: 22, weight: .heavy))
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                }
                .frame(maxWidth: .infinity)
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private func duelCard(icon: String, title: String, allyAgent: String, enemyAgent: String, score: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(hex: 0xFD5B68))
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            HStack(spacing: 10) {
                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(.white)
                    )

                VStack(spacing: 2) {
                    Text(score)
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }

                Circle()
                    .fill(Color(hex: 0x222224))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    )
            }
            .frame(maxWidth: .infinity)
        }
        .padding(14)
        .frame(maxWidth: .infinity)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 16))
    }

    private var duelMatrixGrid: some View {
        let allies = ["Jett", "Reyna", "Phoenix", "Harbor", "Skye"]
        let enemies = ["Sova", "Chamber", "Jett", "Neon", "Iso"]
        let gridValues: [[(Int, Int)]] = [
            [(6, 1), (1, 1), (3, 1), (5, 1), (5, 1)],
            [(2, 0), (4, 2), (3, 1), (1, 1), (2, 0)],
            [(1, 1), (3, 2), (2, 3), (1, 1), (3, 1)],
            [(2, 2), (2, 1), (1, 1), (2, 0), (1, 1)],
            [(0, 3), (2, 1), (2, 1), (3, 1), (0, 0)]
        ]

        return VStack(spacing: 6) {
            HStack(spacing: 6) {
                Color.clear.frame(width: 36, height: 36)
                ForEach(enemies, id: \.self) { en in
                    Circle()
                        .fill(Color(hex: 0xFD5B68).opacity(0.18))
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 30))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                        )
                }
            }

            ForEach(0..<allies.count, id: \.self) { row in
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color(hex: 0x2DD4BF).opacity(0.18))
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 30))
                                .foregroundStyle(Color(hex: 0x2DD4BF))
                        )

                    ForEach(0..<enemies.count, id: \.self) { col in
                        let pair = gridValues[row][col]
                        let won = pair.0 > pair.1
                        let lost = pair.0 < pair.1
                        let even = pair.0 == pair.1

                        VStack {
                            HStack(spacing: 2) {
                                Text("\(pair.0)")
                                    .foregroundStyle(won ? Color(hex: 0x2DD4BF) : .white)
                                Text(":")
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                                Text("\(pair.1)")
                                    .foregroundStyle(lost ? Color(hex: 0xFD5B68) : .white)
                            }
                            .font(.system(size: 11, weight: .bold).monospacedDigit())
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(
                            won ? Color(hex: 0x2DD4BF).opacity(0.14) :
                            (lost ? Color(hex: 0xFD5B68).opacity(0.14) : Color(hex: 0x222224)),
                            in: .rect(cornerRadius: 6)
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
                    performanceRoundRow(round: 1, won: true, weapon: "gun", kills: 3, deaths: 0, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 2, won: true, weapon: "gun", kills: 4, deaths: 0, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 3, won: true, weapon: "rifle", kills: 3, deaths: 0, assists: 1)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 4, won: true, weapon: "rifle", kills: 1, deaths: 0, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 5, won: false, weapon: "rifle", kills: 1, deaths: 1, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 6, won: true, weapon: "rifle", kills: 1, deaths: 1, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 7, won: false, weapon: "rifle", kills: 0, deaths: 1, assists: 1)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 8, won: true, weapon: "rifle", kills: 1, deaths: 1, assists: 0)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 9, won: true, weapon: "rifle", kills: 0, deaths: 0, assists: 1)
                    Divider().overlay(Color.white.opacity(0.06))
                    performanceRoundRow(round: 10, won: true, weapon: "rifle", kills: 1, deaths: 0, assists: 0)
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
                    performanceFilter == index ? Color(hex: 0x3A3A3C) : Color.clear,
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
                        path.addCurve(to: CGPoint(x: w * 0.2, y: h * 0.2), control1: CGPoint(x: w * 0.08, y: h * 0.4), control2: CGPoint(x: w * 0.12, y: h * 0.2))
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
                        path.addCurve(to: CGPoint(x: w * 0.2, y: h * 0.2), control1: CGPoint(x: w * 0.08, y: h * 0.4), control2: CGPoint(x: w * 0.12, y: h * 0.2))
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

    private func performanceRoundRow(round: Int, won: Bool, weapon: String, kills: Int, deaths: Int, assists: Int) -> some View {
        HStack(spacing: 12) {
            Text("\(round)")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(won ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                .frame(width: 22)

            Image(systemName: weapon == "gun" ? "target" : "scope")
                .font(.system(size: 13))
                .foregroundStyle(Color(hex: 0x8E8E93))

            HStack(spacing: -6) {
                ForEach(0..<max(1, kills), id: \.self) { _ in
                    Circle()
                        .fill(Color(hex: 0x222224))
                        .frame(width: 22, height: 22)
                        .overlay(
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                        )
                }
            }

            Spacer()

            Text("\(kills)/\(deaths)/\(assists)")
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
                    econMetricRow(title: "Dépense moyenne", value: "2 296", delta: "=", isUp: nil)
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Équipement moyen", value: "3 967", delta: "+264", isUp: true)
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Dégâts / 1 k dépensés", value: "123", delta: "+73", isUp: true)
                    Divider().overlay(Color.white.opacity(0.06))
                    econMetricRow(title: "Mort avec en réserve", value: "27 400", delta: "+13 211", isUp: false)
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
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private func econMetricRow(title: String, value: String, delta: String, isUp: Bool?) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 15))
                .foregroundStyle(.white)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(value)
                    .font(.system(size: 15, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)

                if let isUp {
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 9, weight: .bold))
                        Text(delta)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(isUp ? Color(hex: 0x2DD4BF) : Color(hex: 0xFD5B68))
                } else {
                    Text(delta)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
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
                    path.move(to: CGPoint(x: 0, y: h * 0.9))
                    path.addCurve(to: CGPoint(x: w * 0.25, y: h * 0.25), control1: CGPoint(x: w * 0.08, y: h * 0.6), control2: CGPoint(x: w * 0.15, y: h * 0.25))
                    path.addCurve(to: CGPoint(x: w * 0.55, y: h * 0.3), control1: CGPoint(x: w * 0.35, y: h * 0.25), control2: CGPoint(x: w * 0.45, y: h * 0.3))
                    path.addCurve(to: CGPoint(x: w, y: h * 0.2), control1: CGPoint(x: w * 0.7, y: h * 0.3), control2: CGPoint(x: w * 0.85, y: h * 0.2))
                }
                .stroke(Color(hex: 0x2DD4BF), lineWidth: 2)

                Path { path in
                    path.move(to: CGPoint(x: 0, y: h * 0.9))
                    path.addCurve(to: CGPoint(x: w * 0.2, y: h * 0.55), control1: CGPoint(x: w * 0.08, y: h * 0.85), control2: CGPoint(x: w * 0.12, y: h * 0.55))
                    path.addCurve(to: CGPoint(x: w * 0.3, y: h * 0.75), control1: CGPoint(x: w * 0.25, y: h * 0.55), control2: CGPoint(x: w * 0.28, y: h * 0.75))
                    path.addCurve(to: CGPoint(x: w * 0.6, y: h * 0.45), control1: CGPoint(x: w * 0.4, y: h * 0.4), control2: CGPoint(x: w * 0.5, y: h * 0.45))
                    path.addCurve(to: CGPoint(x: w * 0.75, y: h * 0.7), control1: CGPoint(x: w * 0.65, y: h * 0.45), control2: CGPoint(x: w * 0.7, y: h * 0.7))
                    path.addCurve(to: CGPoint(x: w, y: h * 0.5), control1: CGPoint(x: w * 0.85, y: h * 0.5), control2: CGPoint(x: w * 0.92, y: h * 0.5))
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
                    agentAvatarView(for: targetedPlayer)
                        .frame(width: 28, height: 28)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 1) {
                        Text("JOUEUR CIBLÉ")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Text(targetedPlayer.handle)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(.white)
                    }

                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.leading, 4)
                }
            }
            .buttonStyle(.plain)

            Spacer()

            if selectedTab == .scoreboard {
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
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundStyle(Color(hex: 0x222224))
            }
        }
    }
}
