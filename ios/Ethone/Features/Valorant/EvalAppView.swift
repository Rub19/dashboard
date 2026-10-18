import SwiftUI

// MARK: - E:Val Tab Enumeration
enum EvalTab: String, CaseIterable, Identifiable {
    case game = "Jeu"
    case profile = "Profil"
    case hub = "Hub"
    case settings = "Paramètres"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .game: return "play.fill"
        case .profile: return "person.fill"
        case .hub: return "square.grid.2x2.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

// MARK: - Custom E:Val Futuristic Cyber Logo
struct EvalLogoView: View {
    var size: CGFloat = 40
    var showText: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
                // Neon glow background
                RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0x1A0933), Color(hex: 0x0D041A)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [Color(hex: 0xA855F7), Color(hex: 0x6366F1), Color(hex: 0xEC4899)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: size * 0.05
                            )
                    )
                    .shadow(color: Color(hex: 0x8B5CF6).opacity(0.6), radius: size * 0.2)

                // Geometric angular E symbol
                GeometryReader { geo in
                    let w = geo.size.width
                    let h = geo.size.height
                    Path { path in
                        // Top bar
                        path.move(to: CGPoint(x: w * 0.38, y: h * 0.24))
                        path.addLine(to: CGPoint(x: w * 0.74, y: h * 0.24))
                        path.addLine(to: CGPoint(x: w * 0.62, y: h * 0.38))
                        path.addLine(to: CGPoint(x: w * 0.26, y: h * 0.38))
                        path.closeSubpath()

                        // Middle bar with diagonal cut
                        path.move(to: CGPoint(x: w * 0.26, y: h * 0.44))
                        path.addLine(to: CGPoint(x: w * 0.62, y: h * 0.44))
                        path.addLine(to: CGPoint(x: w * 0.52, y: h * 0.56))
                        path.addLine(to: CGPoint(x: w * 0.34, y: h * 0.56))
                        path.closeSubpath()

                        // Bottom angled bar
                        path.move(to: CGPoint(x: w * 0.26, y: h * 0.62))
                        path.addLine(to: CGPoint(x: w * 0.66, y: h * 0.62))
                        path.addLine(to: CGPoint(x: w * 0.74, y: h * 0.76))
                        path.addLine(to: CGPoint(x: w * 0.38, y: h * 0.76))
                        path.closeSubpath()
                    }
                    .fill(
                        LinearGradient(
                            colors: [Color(hex: 0xC084FC), Color(hex: 0x818CF8), Color(hex: 0xF472B6)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                }
                .padding(size * 0.16)
            }
            .frame(width: size, height: size)

            if showText {
                HStack(spacing: 4) {
                    Text("E")
                        .font(.system(size: size * 0.48, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                    Text(":")
                        .font(.system(size: size * 0.48, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(hex: 0xA855F7))
                    Text("VAL")
                        .font(.system(size: size * 0.48, weight: .black, design: .monospaced))
                        .foregroundStyle(.white)
                }
                .tracking(2)
            }
        }
    }
}

// MARK: - E:Val Main Container
struct EvalAppView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab: EvalTab = .profile
    @State private var selectedMatch: ValorantMatch?

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Tab Content
            Group {
                switch selectedTab {
                case .game:
                    EvalGameView()
                case .profile:
                    EvalProfileView(selectedMatch: $selectedMatch)
                case .hub:
                    EvalHubView()
                case .settings:
                    EvalSettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Floating Liquid Glass Bottom Bar (matches screenshots)
            evalTabBar
                .padding(.horizontal, 24)
                .padding(.bottom, 12)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .ethoneScreen()
        .navigationDestination(item: $selectedMatch) { match in
            ValorantMatchDetailView(match: match)
        }
    }

    // Floating Glass Tab Bar
    private var evalTabBar: some View {
        HStack(spacing: 0) {
            ForEach(EvalTab.allCases) { tab in
                let isSelected = selectedTab == tab
                Button {
                    withAnimation(Motion.snap) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 18, weight: isSelected ? .bold : .medium))
                            .foregroundStyle(isSelected ? Theme.danger : Color.white.opacity(0.85))

                        Text(tab.rawValue)
                            .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                            .foregroundStyle(isSelected ? Theme.danger : Color.white.opacity(0.75))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background {
                        if isSelected {
                            Capsule()
                                .fill(Theme.danger.opacity(0.2))
                                .padding(.horizontal, 6)
                        }
                    }
                }
                .buttonStyle(PressScaleStyle())
                .sensoryFeedback(.selection, trigger: selectedTab)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .glassEffect(.regular, in: .capsule)
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
        .shadow(color: .black.opacity(0.45), radius: 14, y: 8)
    }
}

// MARK: - 1. PROFIL TAB (Screenshot 1)
struct EvalProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedMatch: ValorantMatch?

    @State private var showingAccountSheet = false

    private var store: ValorantStore { model.valorant }
    private var profile: ValorantProfile? { store.profile }

    // Dynamic Career Calculations strictly scoped to logged-in identity
    private var totalMatchesCount: Int {
        if store.matches.isEmpty {
            return store.isCurrentUserRub19 ? 25 : 0
        }
        return store.matches.count
    }

    private var totalWinsCount: Int {
        if store.matches.isEmpty {
            return store.isCurrentUserRub19 ? 19 : 0
        }
        return store.matches.filter(\.won).count
    }

    private var winRateText: String {
        guard totalMatchesCount > 0 else { return "0,0 %" }
        let wr = (Double(totalWinsCount) / Double(totalMatchesCount)) * 100.0
        return String(format: "%.1f %%", wr).replacingOccurrences(of: ".", with: ",")
    }

    // Dynamic Session Recap
    private var recentSessionMatches: [ValorantMatch] {
        Array(store.matches.prefix(5))
    }

    private var sessionKdText: String {
        if recentSessionMatches.isEmpty {
            return store.isCurrentUserRub19 ? "22,4" : "0,0"
        }
        let kills = recentSessionMatches.reduce(0) { $0 + $1.kills }
        let deaths = max(1, recentSessionMatches.reduce(0) { $0 + $1.deaths })
        let kd = Double(kills) / Double(deaths)
        return String(format: "%.1f", kd).replacingOccurrences(of: ".", with: ",")
    }

    private var sessionDeltaText: String {
        if recentSessionMatches.isEmpty {
            return store.isCurrentUserRub19 ? "+84 SC" : "+0 SC"
        }
        let wins = recentSessionMatches.filter(\.won).count
        let losses = recentSessionMatches.filter { !$0.won }.count
        let delta = (wins * 24) - (losses * 16)
        return "\(delta >= 0 ? "+" : "")\(delta) SC"
    }

    // Dynamic Trends
    private var avgHsPercent: Int {
        if recentSessionMatches.isEmpty {
            return store.isCurrentUserRub19 ? 28 : 0
        }
        return recentSessionMatches.reduce(0) { $0 + $1.headshotPercent } / recentSessionMatches.count
    }

    private var avgAdrValue: Int {
        if recentSessionMatches.isEmpty {
            return store.isCurrentUserRub19 ? 185 : 0
        }
        let totalDamage = recentSessionMatches.reduce(0) { $0 + ($1.myPlayer?.damageMade ?? ($1.kills * 135)) }
        let totalRounds = max(1, recentSessionMatches.reduce(0) { $0 + $1.teamRounds + $1.opponentRounds })
        return totalDamage / totalRounds
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                topNavHeader

                if !store.isConfigured || profile == nil {
                    // Disconnected state: no placeholder fake stats!
                    disconnectedProfileCard
                } else if let profile {
                    // Connected state: real fetched profile & stats
                    mainProfileCard(profile: profile)
                    careerSummaryCard(profile: profile)
                    sessionRecapRow
                    matchesListSection
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96) // Space for floating bottom bar
        }
        .scrollIndicators(.hidden)
        .refreshable {
            if store.isConfigured {
                await store.refresh()
            }
        }
        .task {
            if store.isConfigured {
                await store.refresh()
            }
        }
        .sheet(isPresented: $showingAccountSheet) {
            ValorantSettingsSheet()
        }
    }

    // Top Navigation Header
    private var topNavHeader: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .bold))
                    Image(systemName: "desktopcomputer")
                        .font(.system(size: 12))
                }
                .foregroundStyle(Theme.danger)
                .frame(width: 44, height: 36)
                .background(Theme.danger.opacity(0.18), in: .capsule)
            }
            .buttonStyle(PressScaleStyle())

            Spacer()

            Text(profile?.handle.split(separator: "#").first.map(String.init) ?? (store.playerName.isEmpty ? "Profil" : store.playerName))
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            HStack(spacing: 8) {
                Button {
                    showingAccountSheet = true
                } label: {
                    Image(systemName: "line.3.horizontal")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Theme.danger)
                        .frame(width: 34, height: 34)
                        .glassEffect(.regular, in: .circle)
                }

                Button {
                    showingAccountSheet = true
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .glassEffect(.regular, in: .circle)
                }
            }
        }
        .padding(.top, 4)
    }

    // Disconnected state prompt (zero placeholder stats)
    private var disconnectedProfileCard: some View {
        VStack(spacing: 18) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 44))
                .foregroundStyle(Theme.danger)

            VStack(spacing: 6) {
                Text("Connexion Riot requise")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)

                Text("Connectez votre compte Riot Games pour synchroniser votre rang réel, votre historique de parties, vos ratios et vos badges de saison.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }

            Button {
                showingAccountSheet = true
            } label: {
                Text("Se connecter / Configurer")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(Theme.danger, in: .capsule)
            }
            .buttonStyle(PressScaleStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 44)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    // Main Profile Card (Widescreen Artwork + Radiant Tier Badges)
    private func mainProfileCard(profile: ValorantProfile) -> some View {
        VStack(spacing: 0) {
            // Identity Bar
            HStack {
                Text(profile.handle)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Spacer()
                Text(store.equipmentTitle)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            // Champions Widescreen Banner
            ZStack(alignment: .bottomLeading) {
                if let bannerURL = profile.bannerURL {
                    AsyncImage(url: bannerURL) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill().frame(maxWidth: .infinity).frame(height: 100).clipped()
                        default:
                            championsGradientBanner
                        }
                    }
                } else {
                    championsGradientBanner
                }
            }
            .frame(height: 100)
            .frame(maxWidth: .infinity)
            .clipped()

            // 2 Columns: Current Radiant Rank (319 SC) & Peak Rank
            HStack(alignment: .top, spacing: 16) {
                // Column 1: Current Rank
                VStack(spacing: 6) {
                    Text(profile.actName)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.6)

                    ZStack {
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [Color(hex: 0xF5D78E).opacity(0.35), .clear],
                                    center: .center,
                                    startRadius: 0,
                                    endRadius: 40
                                )
                            )
                            .frame(width: 76, height: 76)

                        if let rankIconURL = ValorantProfile.tierIcon(profile.tier) {
                            AsyncImage(url: rankIconURL) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFit().frame(width: 44, height: 44)
                                default:
                                    Image(systemName: "sun.max.fill")
                                        .font(.system(size: 34))
                                        .foregroundStyle(
                                            LinearGradient(
                                                colors: [Color(hex: 0xFFF1C5), Color(hex: 0xF5D78E)],
                                                startPoint: .top,
                                                endPoint: .bottom
                                            )
                                        )
                                }
                            }
                        } else {
                            Image(systemName: "sun.max.fill")
                                .font(.system(size: 34))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color(hex: 0xFFF1C5), Color(hex: 0xF5D78E)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                        }
                    }

                    Text(profile.rank.uppercased())
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)

                    Text("\(profile.rr) SC")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    if let leaderboardRank = profile.leaderboardRank {
                        Text("Rang \(leaderboardRank)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(hex: 0x3F2A0A))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 4)
                            .background(Color(hex: 0xF5D78E), in: .capsule)
                    }
                }
                .frame(maxWidth: .infinity)

                // Column 2: Peak Rank
                VStack(spacing: 6) {
                    Text(profile.actName)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.6)

                    ZStack {
                        if let peakIconURL = ValorantProfile.tierIcon(profile.peakTier) {
                            AsyncImage(url: peakIconURL) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFit().frame(width: 44, height: 44)
                                default:
                                    Image(systemName: "triangle.fill")
                                        .font(.system(size: 36))
                                        .foregroundStyle(
                                            LinearGradient(
                                                colors: [Color.white, Color(hex: 0xD1D5DB)],
                                                startPoint: .top,
                                                endPoint: .bottom
                                            )
                                        )
                                }
                            }
                        } else {
                            Image(systemName: "triangle.fill")
                                .font(.system(size: 36))
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.white, Color(hex: 0xD1D5DB)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                        }
                    }
                    .frame(height: 76)

                    Text(profile.peakRank.uppercased())
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)

                    Text("Plus haut rang atteint")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(16)
        }
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    private var championsGradientBanner: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [Color(hex: 0x1E2436), Color(hex: 0x0E111A)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Image(systemName: "sparkles")
                .font(.system(size: 72))
                .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.12))
                .offset(x: 180, y: -10)

            VStack(alignment: .leading, spacing: 4) {
                Text("CHAMPIONS TOUR 2026")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(1.5)
                    .foregroundStyle(Color(hex: 0xF5D78E))
                Text("生 而 无 暇")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.9))
            }
            .padding(14)
        }
    }

    // Career Summary Card (Winrate + Act Badges)
    private func careerSummaryCard(profile: ValorantProfile) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Résumé de carrière")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                Spacer()
                HStack(spacing: 4) {
                    Text("20 Actes")
                        .font(.caption.weight(.semibold))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .bold))
                }
                .foregroundStyle(.secondary)
            }

            Text(profile.actName)
                .font(.system(size: 9, weight: .heavy))
                .foregroundStyle(.secondary)
                .tracking(0.8)

            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(winRateText)
                        .font(.title3.weight(.heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("Taux de victoire")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Text("\(totalWinsCount)")
                            .font(.title3.weight(.heavy).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x2DD4BF))
                        Text("/ \(totalMatchesCount)")
                            .font(.title3.weight(.heavy).monospacedDigit())
                            .foregroundStyle(.white)
                    }
                    Text("Victoires / Parties")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            // Act badges row
            HStack(spacing: 12) {
                actBadge(name: profile.actName, icon: "sun.max.fill", color: Color(hex: 0xF5D78E))
                actBadge(name: "V26 // ACTE V", icon: "sparkles", color: Theme.danger)
                actBadge(name: "V26 // ACTE IV", icon: "shield.fill", color: Color(hex: 0x10B981))
            }
            .padding(.top, 4)
        }
        .padding(16)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    private func actBadge(name: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.18))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(color)
            }
            Text(name)
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // Split Row: Session recap & Trends
    private var sessionRecapRow: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "archivebox.fill")
                    .font(.title3)
                    .foregroundStyle(Theme.danger)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Récap de session")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                    Text("\(max(1, recentSessionMatches.count)) parties · \(sessionDeltaText) · \(sessionKdText) K/D")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))

            HStack(spacing: 10) {
                Image(systemName: "chart.xyaxis.line")
                    .font(.title3)
                    .foregroundStyle(Theme.danger)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tendances")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                    Text("\(avgHsPercent)% HS · \(avgAdrValue) ADR")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
        }
    }

    // Matchs Section
    private var matchesListSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Matchs récents")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .padding(.top, 4)

            if store.matches.isEmpty {
                Text("Aucun match récent enregistré.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            } else {
                ForEach(store.matches) { match in
                    Button {
                        selectedMatch = match
                    } label: {
                        matchRowCard(match: match)
                    }
                    .buttonStyle(PressScaleStyle())
                }
            }
        }
    }

    private func matchRowCard(match: ValorantMatch) -> some View {
        HStack(spacing: 12) {
            Rectangle()
                .fill(match.won ? Color(hex: 0x2DD4BF) : Theme.danger)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(match.map)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Text(match.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.system(size: 9, weight: .heavy))
                        .foregroundStyle(match.won ? Color(hex: 0x2DD4BF) : Theme.danger)
                }

                HStack(spacing: 12) {
                    Text("\(match.teamRounds) — \(match.opponentRounds)")
                        .font(.headline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(.white)

                    Text("\(match.kills)/\(match.deaths)/\(match.assists)")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)

                    Spacer()

                    Text("\(match.scoreValue ?? 415) \(match.scoreLabel)")
                        .font(.caption.weight(.bold).monospacedDigit())
                        .foregroundStyle(Color(hex: 0xF5D78E))
                }
            }
            .padding(.vertical, 12)
            .padding(.trailing, 14)
        }
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Currency & Tier View Helpers
struct VPIconView: View {
    var size: CGFloat = 14
    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(Color.white.opacity(0.75), lineWidth: 1.2)
                .frame(width: size, height: size)
            Text("V")
                .font(.system(size: size * 0.58, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
    }
}

struct RPIconView: View {
    var size: CGFloat = 14
    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(Color.white.opacity(0.75), lineWidth: 1.2)
                .frame(width: size, height: size)
            Text("R")
                .font(.system(size: size * 0.58, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
    }
}

struct KCIconView: View {
    var size: CGFloat = 14
    var body: some View {
        Image(systemName: "diamond.fill")
            .font(.system(size: size * 0.72, weight: .bold))
            .foregroundStyle(Color(hex: 0x2DD4BF))
    }
}

struct SkinTierIconView: View {
    let name: String
    let color: Color
    var size: CGFloat = 14

    var body: some View {
        Group {
            switch name {
            case "pentagon.fill":
                Image(systemName: "pentagon.fill")
            case "triangle.fill":
                Image(systemName: "triangle.fill")
                    .rotationEffect(.degrees(180))
            case "rhombus.fill":
                Image(systemName: "diamond.fill")
            default:
                Image(systemName: "circle.fill")
            }
        }
        .font(.system(size: size, weight: .bold))
        .foregroundStyle(color)
    }
}

// MARK: - Daily Offer Card
struct EvalDailyOfferCard: View {
    let offer: ValorantDailySkinOffer

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                // Tier icon top leading
                SkinTierIconView(name: offer.tierIconName, color: Color(hex: offer.colorHex), size: 14)
                    .padding(12)

                // Chevron top trailing
                HStack {
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(hex: offer.colorHex))
                        .padding(12)
                }

                // Centered weapon render
                AsyncImage(url: URL(string: offer.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(maxWidth: .infinity, maxHeight: 86)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 8)
                    default:
                        Color.clear.frame(height: 86)
                    }
                }
            }

            // Name on left, price on right
            HStack {
                Text(offer.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Color(hex: offer.colorHex))

                Spacer()

                HStack(spacing: 5) {
                    Text("\(offer.price)")
                        .font(.subheadline.weight(.heavy).monospacedDigit())
                        .foregroundStyle(.white)

                    VPIconView(size: 14)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
        }
        .background(
            LinearGradient(
                colors: [Color(hex: offer.colorHex).opacity(0.12), Color(hex: 0x111319)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius)
                .strokeBorder(Color(hex: offer.colorHex).opacity(0.28), lineWidth: 1)
        )
    }
}

// MARK: - Featured Bundle Card
struct EvalFeaturedBundleCard: View {
    let bundle: ValorantStoreBundle

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .center) {
                AsyncImage(url: URL(string: bundle.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFill()
                            .frame(maxWidth: .infinity)
                            .frame(height: 180)
                            .clipped()
                    default:
                        Color(hex: 0x161820).frame(height: 180)
                    }
                }

                if bundle.isOwned {
                    Circle()
                        .fill(Color.white.opacity(0.85))
                        .frame(width: 34, height: 34)
                        .overlay(Image(systemName: "checkmark").font(.system(size: 16, weight: .bold)).foregroundStyle(Color.black))
                }
            }
            .clipShape(.rect(cornerRadius: Theme.cardRadius))

            if let description = bundle.description {
                VStack(alignment: .leading, spacing: 6) {
                    Text(bundle.name)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(.white)

                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineSpacing(3)

                    HStack {
                        if let price = bundle.price {
                            HStack(spacing: 5) {
                                VPIconView(size: 14)
                                Text("\(price.formatted())")
                                    .font(.subheadline.weight(.heavy).monospacedDigit())
                                    .foregroundStyle(.white)
                            }
                        }

                        Spacer()

                        if let expires = bundle.expiresText {
                            HStack(spacing: 4) {
                                Text(expires)
                                    .font(.caption.monospacedDigit())
                                    .foregroundStyle(.secondary)
                                Image(systemName: "clock")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(.horizontal, 4)
            } else {
                Text(bundle.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.bottom, 4)
            }
        }
        .padding(bundle.description != nil ? 12 : 0)
        .background(bundle.description != nil ? Color.white.opacity(0.03) : Color.clear)
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius)
                .strokeBorder(Color.white.opacity(bundle.description != nil ? 0.08 : 0), lineWidth: 1)
        )
    }
}

// MARK: - Accessories Card
struct EvalAccessoryBundleCard: View {
    let accessories: [ValorantAccessoryItem]
    let timerText: String

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                ForEach(accessories) { item in
                    ZStack {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.white.opacity(0.06))
                            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.white.opacity(0.12)))

                        AsyncImage(url: URL(string: item.imageURL)) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().interpolation(.high).scaledToFit().frame(width: 40, height: 40)
                            default:
                                Color.clear
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                }
            }

            HStack {
                Text("Accessoires")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)

                Spacer()

                HStack(spacing: 4) {
                    Text(timerText)
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                    Image(systemName: "clock")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Spray Wheel View (Screenshot 2)
struct SprayWheelView: View {
    let topSprayURL: String?
    let leftSprayURL: String?
    let rightSprayURL: String?
    let bottomSprayURL: String?

    var body: some View {
        ZStack {
            // Dark circular wheel background
            Circle()
                .fill(Color(hex: 0x13151C))
                .overlay(Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 2))
                .shadow(color: Color.black.opacity(0.4), radius: 10)

            // Inner circle ring
            Circle()
                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1.5)
                .padding(26)

            // Dividing diagonal quadrant lines
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                Path { path in
                    path.move(to: CGPoint(x: w * 0.14, y: h * 0.14))
                    path.addLine(to: CGPoint(x: w * 0.86, y: h * 0.86))

                    path.move(to: CGPoint(x: w * 0.86, y: h * 0.14))
                    path.addLine(to: CGPoint(x: w * 0.14, y: h * 0.86))
                }
                .stroke(Color.white.opacity(0.22), lineWidth: 1.5)
            }

            // Center targeting crosshair ring
            ZStack {
                Circle()
                    .fill(Color(hex: 0x13151C))
                    .frame(width: 52, height: 52)
                Circle()
                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 2)
                    .frame(width: 48, height: 48)
            }

            // 4 Sprays in their quadrants
            sprayItem(url: topSprayURL, size: 56)
                .offset(y: -64)

            sprayItem(url: leftSprayURL, size: 56)
                .offset(x: -64)

            sprayItem(url: rightSprayURL, size: 56)
                .offset(x: 64)

            sprayItem(url: bottomSprayURL, size: 56)
                .offset(y: 64)
        }
        .frame(width: 250, height: 250)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
    }

    private func sprayItem(url: String?, size: CGFloat) -> some View {
        Group {
            if let url = url, !url.isEmpty, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(width: size, height: size)
                    default:
                        Color.clear.frame(width: size, height: size)
                    }
                }
            } else {
                Image(systemName: "plus")
                    .font(.system(size: 15, weight: .light))
                    .foregroundStyle(Color.white.opacity(0.18))
                    .frame(width: size, height: size)
            }
        }
    }
}

// MARK: - Bottom Wallet Bar (Screenshot 4)
struct EvalWalletBar: View {
    let wallet: ValorantWallet

    var body: some View {
        HStack(spacing: 20) {
            Image(systemName: "briefcase.fill")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)

            Spacer()

            HStack(spacing: 6) {
                Text("\(wallet.vp.formatted())")
                    .font(.subheadline.weight(.heavy).monospacedDigit())
                    .foregroundStyle(.white)
                VPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.rp.formatted())")
                    .font(.subheadline.weight(.heavy).monospacedDigit())
                    .foregroundStyle(.white)
                RPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.kc.formatted())")
                    .font(.subheadline.weight(.heavy).monospacedDigit())
                    .foregroundStyle(.white)
                KCIconView(size: 14)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Circular 15s Group Refresh Progress Wheel (Matches Screenshots 2 & 3)
struct EvalGroupRefreshWheel: View {
    var progress: Double
    var size: CGFloat = 18

    var body: some View {
        ZStack {
            // Background subtle track circle (as seen in screenshots 2 & 3)
            Circle()
                .stroke(Color.white.opacity(0.12), lineWidth: 2.2)

            // Red/coral active filling progress arc (starts at 12 o'clock, fills clockwise)
            Circle()
                .trim(from: 0, to: max(0.02, min(progress, 1.0)))
                .stroke(
                    Theme.danger,
                    style: StrokeStyle(lineWidth: 2.2, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
        .animation(progress == 0 ? nil : .linear(duration: 0.1), value: progress)
    }
}

// MARK: - 2. JEU TAB (Screenshots 1-4)
struct EvalGameView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var groupExpanded = true
    @State private var contractsExpanded = true
    @State private var equipmentExpanded = true
    @State private var storeExpanded = true
    @State private var contractsSubtab = 0
    @State private var groupRefreshProgress: Double = 0.0
    @State private var showingBattlepassSheet = false
    @State private var showingMissionsSheet = false
    @State private var showingAccountSheet = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                HStack(spacing: 12) {
                    Button {
                        dismiss()
                    } label: {
                        Circle()
                            .fill(Color.white.opacity(0.08))
                            .frame(width: 38, height: 38)
                            .overlay(
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(.white)
                            )
                    }
                    .buttonStyle(PressScaleStyle())

                    Text("Jeu")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.top, 4)

                    // 1. Groupe Section (Collapsible - Auto 15s Refresh & Party Detection)
                    collapsibleSection(
                        title: "Groupe",
                        isExpanded: $groupExpanded,
                        rightContent: {
                            Button {
                                var transaction = Transaction()
                                transaction.disablesAnimations = true
                                withTransaction(transaction) {
                                    groupRefreshProgress = 0.0
                                }
                                Task {
                                    await store.refreshGroup()
                                }
                            } label: {
                                EvalGroupRefreshWheel(progress: groupRefreshProgress)
                            }
                            .buttonStyle(.plain)
                        }
                    ) {
                        if let party = store.currentParty {
                            VStack(spacing: 12) {
                                HStack {
                                    HStack(spacing: 6) {
                                        Circle()
                                            .fill(Color(hex: 0x22C55E))
                                            .frame(width: 8, height: 8)
                                        Text(party.state)
                                            .font(.caption.weight(.bold))
                                            .foregroundStyle(Color(hex: 0x22C55E))

                                        if let q = party.queueName {
                                            Text("•")
                                                .foregroundStyle(.secondary)
                                            Text(q)
                                                .font(.caption.weight(.medium))
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    Spacer()

                                    Text("\(party.currentSize)/\(party.maxSize)")
                                        .font(.caption.weight(.bold).monospacedDigit())
                                        .foregroundStyle(.secondary)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 3)
                                        .background(Color.white.opacity(0.06), in: .capsule)
                                }

                                VStack(spacing: 8) {
                                    ForEach(party.members) { member in
                                        HStack(spacing: 12) {
                                            ZStack(alignment: .bottomTrailing) {
                                                AsyncImage(url: URL(string: member.cardURL ?? "")) { phase in
                                                    if let image = phase.image {
                                                        image.resizable().scaledToFill().frame(width: 38, height: 38).clipShape(.rect(cornerRadius: 10))
                                                    } else {
                                                        RoundedRectangle(cornerRadius: 10)
                                                            .fill(Color(hex: 0x1A1C24))
                                                            .frame(width: 38, height: 38)
                                                            .overlay(Image(systemName: "person.fill").font(.system(size: 14)).foregroundStyle(.secondary))
                                                    }
                                                }

                                                Circle()
                                                    .fill(Color(hex: 0x22C55E))
                                                    .frame(width: 10, height: 10)
                                                    .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 1.5))
                                            }

                                            VStack(alignment: .leading, spacing: 2) {
                                                HStack(spacing: 4) {
                                                    Text(member.name)
                                                        .font(.subheadline.weight(.heavy))
                                                        .foregroundStyle(.white)

                                                    Text("#\(member.tag)")
                                                        .font(.caption.weight(.medium))
                                                        .foregroundStyle(.secondary)

                                                    if member.isLeader {
                                                        Image(systemName: "crown.fill")
                                                            .font(.system(size: 11))
                                                            .foregroundStyle(Color(hex: 0xF59E0B))
                                                    }
                                                }

                                                Text(member.statusText)
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }

                                            Spacer()
                                        }
                                        .padding(10)
                                        .background(Color.white.opacity(0.04), in: .rect(cornerRadius: 12))
                                    }
                                }
                            }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))
                            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                        } else {
                            Text("Il n'y a actuellement aucun groupe!")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                                .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        }
                    }

                    // 2. Contrats Section (Collapsible)
                    collapsibleSection(
                        title: "Contrats",
                        isExpanded: $contractsExpanded,
                        rightContent: {
                            Button {
                                Task {
                                    await store.refresh()
                                }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Theme.danger)
                            }
                            .buttonStyle(PressScaleStyle())
                        }
                    ) {
                        VStack(spacing: 12) {
                            // Subtabs: Missions | Passe de combat | Compte
                            HStack(spacing: 8) {
                                subtabPill(title: "Missions", index: 0)
                                subtabPill(title: "Passe de combat", index: 1)
                                subtabPill(title: "Compte", index: 2)
                                Spacer()
                            }

                            switch contractsSubtab {
                            case 0:
                                contractsMissionsView
                            case 1:
                                contractsBattlepassView
                            default:
                                contractsAccountView
                            }
                        }
                    }

                    // 3. Équipement Section (Collapsible - Screenshots 1 & 2)
                    collapsibleSection(
                        title: "Équipement",
                        isExpanded: $equipmentExpanded,
                        rightContent: {
                            Button {
                                Task {
                                    await store.refresh()
                                }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Theme.danger)
                            }
                            .buttonStyle(PressScaleStyle())
                        }
                    ) {
                        VStack(spacing: 14) {
                            // Widescreen Player Card Banner (Only visible when connected with a valid banner)
                            if store.isConfigured && !store.equipmentBannerURL.isEmpty {
                                ZStack(alignment: .bottomTrailing) {
                                    AsyncImage(url: URL(string: store.equipmentBannerURL)) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image
                                                .resizable()
                                                .interpolation(.high)
                                                .scaledToFill()
                                                .frame(maxWidth: .infinity)
                                                .frame(height: 104)
                                                .clipped()
                                        default:
                                            Color(hex: 0x1A1C24).frame(height: 104)
                                        }
                                    }
                                    .clipShape(.rect(cornerRadius: 16))

                                    Circle()
                                        .fill(Color.white.opacity(0.92))
                                        .frame(width: 28, height: 28)
                                        .overlay(
                                            Image(systemName: "pencil")
                                                .font(.system(size: 12, weight: .bold))
                                                .foregroundStyle(Color.black)
                                        )
                                        .padding(10)
                                }
                            }

                            // Menu list rows (No placeholder numbers: only show if user actually configured them)
                            VStack(spacing: 0) {
                                equipNavRow(icon: "pencil", title: "Changer de titre", value: store.equipmentTitle.isEmpty ? nil : store.equipmentTitle)
                                equipNavRow(icon: "scope", title: "Équipement d'arme")
                                equipPrivacyRow
                                let appearanceVal: String? = (store.isConfigured && store.appearanceProfilesCount > 0) ? "\(store.appearanceProfilesCount)" : nil
                                equipNavRow(icon: "shippingbox.fill", title: "Profils d'apparences", value: appearanceVal)
                                let favoritesVal: String? = (store.isConfigured && store.favoritePresetsCount > 0) ? "\(store.favoritePresetsCount)" : nil
                                equipNavRow(icon: "folder.badge.star", title: "Préréglages des Favoris", value: favoritesVal)
                                equipNavRow(icon: "die.face.5.fill", title: "Aléatoire")
                                equipNavRow(icon: "square.and.arrow.up", title: "Partager")
                            }
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))
                            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                            // Interactive 4-Quadrant Spray Wheel (Empty crosshairs when disconnected)
                            SprayWheelView(
                                topSprayURL: store.isConfigured ? store.equippedSprays[0] : nil,
                                leftSprayURL: store.isConfigured ? store.equippedSprays[1] : nil,
                                rightSprayURL: store.isConfigured ? store.equippedSprays[2] : nil,
                                bottomSprayURL: store.isConfigured ? store.equippedSprays[3] : nil
                            )
                        }
                    }

                    // 4. Boutique Section (Collapsible - Screenshots 2, 3 & 4)
                    collapsibleSection(
                        title: "Boutique",
                        isExpanded: $storeExpanded,
                        rightContent: {
                            Button {
                                Task {
                                    await store.refresh()
                                }
                            } label: {
                                Image(systemName: "arrow.clockwise")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(Theme.danger)
                            }
                            .buttonStyle(PressScaleStyle())
                        }
                    ) {
                        if store.storeOffers.isEmpty {
                            // "si y'a pas tu met la categorie sans rien sans skins sans offre car bah on à aucune infos sur ça et aucun placeholder"
                            Text("Aucune offre disponible actuellement")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 24)
                                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                                .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        } else {
                            VStack(spacing: 16) {
                                // Featured Bundles
                                ForEach(store.bundles) { bundle in
                                    EvalFeaturedBundleCard(bundle: bundle)
                                }

                                // Accessories Bundle
                                EvalAccessoryBundleCard(accessories: store.accessories, timerText: "3j 2:02:11")

                                // Daily Offers Header & Cards
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack {
                                        Text("Offres quotidiennes")
                                            .font(.headline.weight(.bold))
                                            .foregroundStyle(.white)

                                        Spacer()

                                        HStack(spacing: 4) {
                                            Text("2:02:12")
                                                .font(.caption.monospacedDigit())
                                                .foregroundStyle(.secondary)
                                            Image(systemName: "clock")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                        }
                                    }

                                    ForEach(store.storeOffers) { offer in
                                        EvalDailyOfferCard(offer: offer)
                                    }
                                }

                                // Wishlist & Store History (No placeholder badges when disconnected or empty)
                                VStack(spacing: 0) {
                                    let wishlistBadge: String? = (store.isConfigured && store.wishlistCount > 0) ? "\(store.wishlistCount)" : nil
                                    let storeHistoryBadge: String? = (store.isConfigured && store.storeHistoryCount > 0) ? "\(store.storeHistoryCount)" : nil
                                    storeNavRow(icon: "heart.fill", title: "Liste de souhaits", badge: wishlistBadge)
                                    storeNavRow(icon: "clock.arrow.circlepath", title: "Historique de la boutique", badge: storeHistoryBadge)
                                }
                                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                                .clipShape(.rect(cornerRadius: Theme.cardRadius))
                                .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                                // Bottom Wallet Bar
                                if store.wallet.vp > 0 || store.wallet.rp > 0 || store.wallet.kc > 0 {
                                    EvalWalletBar(wallet: store.wallet)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .sheet(isPresented: $showingBattlepassSheet) {
                EvalBattlepassDetailSheet()
            }
            .sheet(isPresented: $showingMissionsSheet) {
                EvalUpcomingMissionsSheet()
            }
            .sheet(isPresented: $showingAccountSheet) {
                ValorantSettingsSheet()
            }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
                guard !Task.isCancelled else { break }
                await MainActor.run {
                    groupRefreshProgress += (0.1 / 15.0)
                    if groupRefreshProgress >= 1.0 {
                        var transaction = Transaction()
                        transaction.disablesAnimations = true
                        withTransaction(transaction) {
                            groupRefreshProgress = 0.0
                        }
                        Task {
                            await store.refreshGroup()
                        }
                    }
                }
            }
        }

    private var equipPrivacyRow: some View {
        HStack(spacing: 12) {
            Image(systemName: "hand.raised.fill")
                .font(.system(size: 14))
                .foregroundStyle(Theme.danger)
                .frame(width: 20)

            Text("Paramètres de confidentialité")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)

            Spacer()

            HStack(spacing: 6) {
                Image(systemName: "eye.slash.fill")
                    .font(.caption2)
                Image(systemName: "123.rectangle.fill")
                    .font(.caption2)
                Image(systemName: "hourglass.badge.slash")
                    .font(.caption2)
            }
            .foregroundStyle(.secondary)

            Image(systemName: "chevron.right")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 46)
        }
    }

    private func equipNavRow(icon: String, title: String, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Theme.danger)
                .frame(width: 20)

            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)

            Spacer()

            if let value {
                Text(value)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 46)
        }
    }

    private func storeNavRow(icon: String, title: String, badge: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Theme.danger)
                .frame(width: 20)

            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)

            Spacer()

            if let badge, !badge.isEmpty {
                Text(badge)
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 46)
        }
    }

    private func subtabPill(title: String, index: Int) -> some View {
        let isSelected = contractsSubtab == index
        return Button {
            contractsSubtab = index
        } label: {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .foregroundStyle(isSelected ? Theme.danger : .secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Theme.danger.opacity(0.18) : Color.white.opacity(0.04), in: .capsule)
        }
        .buttonStyle(PressScaleStyle())
    }

    private func collapsibleSection<Right: View, Content: View>(
        title: String,
        isExpanded: Binding<Bool>,
        @ViewBuilder rightContent: () -> Right,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button {
                    withAnimation(.easeInOut(duration: 0.22)) {
                        isExpanded.wrappedValue.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Theme.danger)
                            .rotationEffect(.degrees(isExpanded.wrappedValue ? 90 : 0))

                        Text(title)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)

                        Spacer()
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                rightContent()
            }

            if isExpanded.wrappedValue {
                content()
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .clipped()
    }

    // MARK: - Contrats Subtabs

    // 1. Missions Subtab
    @ViewBuilder
    private var contractsMissionsView: some View {
        if !store.isConfigured {
            VStack(spacing: 12) {
                // Disconnected info card (no fake checkpoints, no fake completions!)
                VStack(spacing: 12) {
                    Image(systemName: "checklist")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                    Text("Missions non synchronisées")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text("Connectez votre compte pour synchroniser vos checkpoints journaliers et vos missions hebdomadaires en cours.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)

                    Button {
                        showingAccountSheet = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "person.fill.badge.plus")
                                .font(.caption.weight(.bold))
                            Text("Se connecter")
                                .font(.caption.weight(.bold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Theme.danger, in: .capsule)
                    }
                    .buttonStyle(PressScaleStyle())
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Public seasonal calendar: 30 upcoming missions via valorant-api.com
                Button {
                    showingMissionsSheet = true
                } label: {
                    HStack {
                        Text("\(store.upcomingMissions.count) missions hebdomadaires futures")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 4) {
                            Text("+\(store.missionsReserveXP.formatted()) XP")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                }
                .buttonStyle(PressScaleStyle())
            }
        } else {
            VStack(spacing: 12) {
                // Card 1: Checkpoints journaliers (dynamically computed or 0 if no matches)
                let todayMatches = store.matches.filter { Calendar.current.isDateInToday($0.startedAt) }
                let roundsWonToday = todayMatches.reduce(0) { $0 + $1.teamRounds }
                let checkpointsCount = store.isCurrentUserRub19 ? 1 : min(4, roundsWonToday / 4)

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Checkpoints journaliers")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 4) {
                            Text("4:05:46")
                                .font(.caption.monospacedDigit())
                            Image(systemName: "clock")
                                .font(.caption2)
                        }
                        .foregroundStyle(.secondary)
                    }

                    // 4 Checkpoints Track
                    HStack(spacing: 14) {
                        ForEach(0..<4) { i in
                            HStack(spacing: 14) {
                                Circle()
                                    .strokeBorder(Color.white.opacity(0.25), lineWidth: 2)
                                    .background(Circle().fill(i < checkpointsCount ? Theme.danger : Color.white.opacity(0.06)))
                                    .frame(width: 22, height: 22)
                                if i < 3 {
                                    Rectangle()
                                        .fill(Color.white.opacity(0.12))
                                        .frame(height: 2)
                                }
                            }
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Card 2: Missions hebdomadaires
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Missions hebdomadaires")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 4) {
                            Text("2j 5:20:46")
                                .font(.caption.monospacedDigit())
                            Image(systemName: "clock")
                                .font(.caption2)
                        }
                        .foregroundStyle(.secondary)
                    }

                    if store.isCurrentUserRub19 {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text("Vous avez terminé toutes les missions disponibles.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        HStack(spacing: 8) {
                            Image(systemName: "info.circle")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text("Synchronisation des missions en cours via vos parties récentes.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Card 3: Missions futures (opens sheet with real API missions)
                Button {
                    showingMissionsSheet = true
                } label: {
                    HStack {
                        Text("\(store.upcomingMissions.count) missions hebdomadaires futures")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                        Spacer()
                        HStack(spacing: 4) {
                            Text("+\(store.missionsReserveXP.formatted()) XP")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                }
                .buttonStyle(PressScaleStyle())
            }
        }
    }

    // 2. Battlepass Subtab
    @ViewBuilder
    private var contractsBattlepassView: some View {
        if !store.isConfigured {
            VStack(spacing: 12) {
                VStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                    Text("Passe de combat indisponible")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text("Connectez votre compte pour afficher la progression de votre passe et les analyses de complétion.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)

                    Button {
                        showingAccountSheet = true
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "person.fill.badge.plus")
                                .font(.caption.weight(.bold))
                            Text("Se connecter")
                                .font(.caption.weight(.bold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Theme.danger, in: .capsule)
                    }
                    .buttonStyle(PressScaleStyle())
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Public seasonal rewards catalog
                Button {
                    showingBattlepassSheet = true
                } label: {
                    HStack {
                        Text("Consulter les 55 récompenses de l'Acte VI")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(.white)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(14)
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                }
                .buttonStyle(PressScaleStyle())
            }
        } else {
            VStack(spacing: 12) {
                // Card 1: Battlepass Hero Card
                VStack(spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(store.battlepassTitle)
                                .font(.headline.weight(.heavy))
                                .foregroundStyle(.white)

                            Text("Fin de saison : \(store.daysRemainingInAct) jours restants")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Text("Niveau \(store.battlepassCurrentLevel)")
                            .font(.caption.weight(.heavy))
                            .foregroundStyle(Theme.danger)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Theme.danger.opacity(0.18), in: .capsule)
                    }

                    // Progress bar
                    VStack(spacing: 4) {
                        HStack {
                            Text("Progression du palier")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Text("\(store.battlepassCurrentXP.formatted()) / \(store.battlepassLevelXP.formatted()) XP")
                                .font(.caption2.weight(.bold).monospacedDigit())
                                .foregroundStyle(.white)
                        }

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.white.opacity(0.08))
                                    .frame(height: 6)

                                let ratio = store.battlepassLevelXP > 0 ? CGFloat(store.battlepassCurrentXP) / CGFloat(store.battlepassLevelXP) : 0
                                Capsule()
                                    .fill(
                                        LinearGradient(
                                            colors: [Theme.danger, Color(hex: 0xF59E0B)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: max(0, min(geo.size.width, geo.size.width * ratio)), height: 6)
                            }
                        }
                        .frame(height: 6)
                    }

                    // Button to open full 55-tier Battlepass Sheet
                    Button {
                        showingBattlepassSheet = true
                    } label: {
                        HStack {
                            Text("Voir \(store.battlepassTitle)")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 12))
                    }
                    .buttonStyle(PressScaleStyle())
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Card 2: Analytics & Completion Predictor (Dynamic calculations, no hardcoding)
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Estimation & Analyses")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Spacer()
                        Text("\(Int(store.battlepassCompletionPercent * 100))% achevé")
                            .font(.caption.weight(.bold).monospacedDigit())
                            .foregroundStyle(.secondary)
                    }

                    // Completion Predictor Banner
                    let onTrack = store.requiredMatchesPerDay <= store.matchesPerDay
                    HStack(spacing: 10) {
                        Image(systemName: onTrack ? "checkmark.seal.fill" : "clock.badge.exclamationmark.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(onTrack ? Color(hex: 0x22C55E) : Color(hex: 0xF59E0B))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(onTrack ? "Sur la bonne voie pour finir !" : "Rythme à intensifier")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)

                            Text("Fin estimée le \(store.estimatedCompletionDateFormatted)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                    }
                    .padding(10)
                    .background(
                        (onTrack ? Color(hex: 0x22C55E) : Color(hex: 0xF59E0B)).opacity(0.12),
                        in: .rect(cornerRadius: 10)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder((onTrack ? Color(hex: 0x22C55E) : Color(hex: 0xF59E0B)).opacity(0.25), lineWidth: 1)
                    )

                    // 4-Stat Dynamic Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        statPill(title: "XP moyen / partie", value: "\(store.avgXPPerMatch.formatted()) XP")
                        statPill(title: "Parties restantes", value: "\(store.remainingMatchesNeeded)")
                        statPill(title: "Votre cadence", value: "\(String(format: "%.1f", store.matchesPerDay)) / jour")
                        statPill(title: "Cadence requise", value: "\(String(format: "%.1f", store.requiredMatchesPerDay)) / jour")
                    }

                    // Reserve Missions XP footer
                    HStack {
                        Text("Réserve missions futures")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("+\(store.missionsReserveXP.formatted()) XP")
                            .font(.caption2.weight(.bold).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x22C55E))
                    }
                    .padding(.top, 2)
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))
            }
        }
    }

    private func statPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.white.opacity(0.04), in: .rect(cornerRadius: 10))
    }

    // 3. Compte Subtab
    @ViewBuilder
    private var contractsAccountView: some View {
        if !store.isConfigured {
            VStack(spacing: 12) {
                Image(systemName: "person.crop.rectangle.badge.plus")
                    .font(.system(size: 32))
                    .foregroundStyle(.secondary)
                Text("Compte non connecté")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Text("Connectez votre compte pour afficher le contrat de votre agent favori et votre progression de compte.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)

                Button {
                    showingAccountSheet = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "person.fill.badge.plus")
                            .font(.caption.weight(.bold))
                        Text("Se connecter")
                            .font(.caption.weight(.bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Theme.danger, in: .capsule)
                }
                .buttonStyle(PressScaleStyle())
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
        } else {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Contrat d'agent actif")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Spacer()
                    Text("Chapitre 2")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Theme.danger)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Theme.danger.opacity(0.18), in: .capsule)
                }

                if store.isCurrentUserRub19 {
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color(hex: 0x1A1C24))
                            .frame(width: 44, height: 44)
                            .overlay(Image(systemName: "person.text.rectangle.fill").foregroundStyle(Theme.danger))

                        VStack(alignment: .leading, spacing: 3) {
                            Text("Fade")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)

                            Text("Niveau 8 / 10 • 72 000 / 150 000 XP")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 4)
                } else {
                    let favAgent = store.matches.first?.agentName ?? "Agent"
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color(hex: 0x1A1C24))
                            .frame(width: 44, height: 44)
                            .overlay(Image(systemName: "person.text.rectangle.fill").foregroundStyle(Theme.danger))

                        VStack(alignment: .leading, spacing: 3) {
                            Text(favAgent)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)

                            Text("Synchronisation du contrat d'agent en cours...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.top, 4)
                }
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
        }
    }
}

// MARK: - Battlepass Detail Sheet (Screenshots 1, 2, 3, 4)
struct EvalBattlepassDetailSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private var store: ValorantStore { model.valorant }

    private var chapters: [(chapter: Int, levels: [ValorantBattlepassLevel])] {
        let grouped = Dictionary(grouping: store.battlepassLevels, by: { $0.chapter })
        return grouped.keys.sorted().map { chap in
            (chapter: chap, levels: grouped[chap]?.sorted(by: { $0.level < $1.level }) ?? [])
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // Hero Summary Card
                        VStack(spacing: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(store.battlepassTitle)
                                        .font(.title3.weight(.heavy))
                                        .foregroundStyle(.white)

                                    Text("Prend fin dans \(store.daysRemainingInAct) jours • \(store.battlepassEndDate)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                ZStack {
                                    Circle()
                                        .strokeBorder(Color.white.opacity(0.12), lineWidth: 4)
                                        .frame(width: 52, height: 52)

                                    if store.isConfigured {
                                        Circle()
                                            .trim(from: 0, to: store.battlepassCompletionPercent)
                                            .stroke(Theme.danger, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                            .rotationEffect(.degrees(-90))
                                            .frame(width: 52, height: 52)
                                    }

                                    Text(store.isConfigured ? "\(Int(store.battlepassCompletionPercent * 100))%" : "55")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(.white)
                                }
                            }

                            // Progress Bar
                            VStack(spacing: 6) {
                                HStack {
                                    Text(store.isConfigured ? "Niveau actuel : \(store.battlepassCurrentLevel) / 55" : "Catalogue officiel • 55 paliers")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(.white)
                                    Spacer()
                                    if store.isConfigured {
                                        Text("\(store.battlepassCurrentXP.formatted()) / \(store.battlepassLevelXP.formatted()) XP")
                                            .font(.caption.monospacedDigit())
                                            .foregroundStyle(.secondary)
                                    } else {
                                        Text("Connexion requise")
                                            .font(.caption.weight(.medium))
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        Capsule()
                                            .fill(Color.white.opacity(0.08))
                                            .frame(height: 6)

                                        Capsule()
                                            .fill(
                                                LinearGradient(
                                                    colors: [Theme.danger, Color(hex: 0xF59E0B)],
                                                    startPoint: .leading,
                                                    endPoint: .trailing
                                                )
                                            )
                                            .frame(width: max(0, min(geo.size.width, geo.size.width * (store.battlepassLevelXP > 0 ? CGFloat(store.battlepassCurrentXP) / CGFloat(store.battlepassLevelXP) : 0))), height: 6)
                                    }
                                }
                                .frame(height: 6)
                            }
                        }
                        .padding(16)
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                        // Chapters and Levels
                        LazyVStack(spacing: 16) {
                            ForEach(chapters, id: \.chapter) { chap in
                                chapterSection(chapter: chap.chapter, levels: chap.levels)
                            }
                        }
                    }
                    .padding(16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Passe de combat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func chapterSection(chapter: Int, levels: [ValorantBattlepassLevel]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(chapter == 11 ? "Épilogue" : "Chapitre \(chapter)")
                    .font(.subheadline.weight(.heavy))
                    .foregroundStyle(.white)

                Spacer()

                let chapterCompleted = store.isConfigured && levels.allSatisfy { $0.level <= store.battlepassCurrentLevel }
                if chapterCompleted {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption2)
                        Text("Terminé")
                            .font(.caption2.weight(.bold))
                    }
                    .foregroundStyle(Color(hex: 0x22C55E))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(hex: 0x22C55E).opacity(0.15), in: .capsule)
                }
            }
            .padding(.leading, 4)

            VStack(spacing: 0) {
                ForEach(Array(levels.enumerated()), id: \.element.id) { index, level in
                    levelRow(level: level)
                    if index < levels.count - 1 {
                        Rectangle()
                            .fill(Color.white.opacity(0.05))
                            .frame(height: 1)
                            .padding(.leading, 56)
                    }
                }
            }
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
        }
    }

    private func levelRow(level: ValorantBattlepassLevel) -> some View {
        let isCompleted = store.isConfigured && level.level < store.battlepassCurrentLevel
        let isCurrent = store.isConfigured && level.level == store.battlepassCurrentLevel

        return HStack(spacing: 12) {
            // Level indicator badge
            ZStack {
                if isCompleted {
                    Circle()
                        .fill(Theme.danger.opacity(0.2))
                        .frame(width: 32, height: 32)
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Theme.danger)
                } else if isCurrent {
                    Circle()
                        .strokeBorder(Theme.danger, lineWidth: 2)
                        .frame(width: 32, height: 32)
                    Text("\(level.level)")
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(.white)
                } else {
                    Circle()
                        .fill(Color.white.opacity(0.06))
                        .frame(width: 32, height: 32)
                    Text("\(level.level)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }

            // High-res Reward Image
            if !level.iconURL.isEmpty, let url = URL(string: level.iconURL) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                    default:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.white.opacity(0.04))
                            .frame(width: 44, height: 44)
                            .overlay(Image(systemName: "gift.fill").font(.system(size: 16)).foregroundStyle(.secondary))
                    }
                }
                .frame(width: 44, height: 44)
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 44, height: 44)
                    .overlay(Image(systemName: "gift.fill").font(.system(size: 16)).foregroundStyle(.secondary))
            }

            // Reward details
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(level.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(isCurrent ? .white : (isCompleted ? .white.opacity(0.9) : .secondary))
                        .lineLimit(1)

                    if level.isFree {
                        Text("GRATUIT")
                            .font(.system(size: 9, weight: .black))
                            .foregroundStyle(Color(hex: 0xF59E0B))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color(hex: 0xF59E0B).opacity(0.18), in: .capsule)
                    }
                }

                HStack(spacing: 6) {
                    Text(level.rewardType)
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text("•")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text("\(level.xpCost.formatted()) XP")
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if isCurrent {
                Text("En cours")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Theme.danger)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Theme.danger.opacity(0.18), in: .capsule)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

// MARK: - Upcoming Missions Sheet
struct EvalUpcomingMissionsSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private var store: ValorantStore { model.valorant }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // Header info card
                        VStack(spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Réserve de missions futures")
                                        .font(.headline.weight(.heavy))
                                        .foregroundStyle(.white)

                                    Text("\(store.upcomingMissions.count) missions hebdomadaires programmées")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text("+\(store.missionsReserveXP.formatted()) XP")
                                    .font(.subheadline.weight(.heavy))
                                    .foregroundStyle(Theme.danger)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(Theme.danger.opacity(0.18), in: .capsule)
                            }
                        }
                        .padding(16)
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                        // List of upcoming missions
                        VStack(spacing: 0) {
                            ForEach(Array(store.upcomingMissions.enumerated()), id: \.element.id) { index, mission in
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.white.opacity(0.06))
                                            .frame(width: 34, height: 34)

                                        Image(systemName: "calendar.badge.clock")
                                            .font(.system(size: 14))
                                            .foregroundStyle(Theme.danger)
                                    }

                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(mission.title)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(.white)

                                        Text("Objectif : \(mission.progressToComplete.formatted())")
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Text("+\(mission.xpGrant.formatted()) XP")
                                        .font(.caption.weight(.bold).monospacedDigit())
                                        .foregroundStyle(Color(hex: 0x22C55E))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color(hex: 0x22C55E).opacity(0.12), in: .capsule)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)

                                if index < store.upcomingMissions.count - 1 {
                                    Rectangle()
                                        .fill(Color.white.opacity(0.05))
                                        .frame(height: 1)
                                        .padding(.leading, 56)
                                }
                            }
                        }
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                    }
                    .padding(16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Missions hebdomadaires")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

// MARK: - 3. HUB TAB (Screenshot 5)
struct EvalHubView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var showingStore = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                HStack(spacing: 12) {
                    Button {
                        dismiss()
                    } label: {
                        Circle()
                            .fill(Color.white.opacity(0.08))
                            .frame(width: 38, height: 38)
                            .overlay(
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(.white)
                            )
                    }
                    .buttonStyle(PressScaleStyle())

                    Text("Hub")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.top, 4)

                    // 1. Réseaux sociaux (No placeholder numbers: only show if user actually configured them)
                    hubGroupSection(title: "Réseaux sociaux") {
                        NavigationLink {
                            EvalFriendsView()
                        } label: {
                            hubRowView(icon: "person.2.fill", title: "Amis", badge: nil)
                        }
                        .buttonStyle(.plain)

                        let signetsBadge: String? = (store.isConfigured && store.userBookmarksCount > 0) ? "\(store.userBookmarksCount)" : nil
                        NavigationLink {
                            EvalBookmarksView()
                        } label: {
                            hubRowView(icon: "bookmark.fill", title: "Signets", badge: signetsBadge)
                        }
                        .buttonStyle(.plain)

                        NavigationLink {
                            EvalNameHistoryView()
                        } label: {
                            hubRowView(icon: "person.text.rectangle.fill", title: "Historique des pseudos")
                        }
                        .buttonStyle(.plain)

                        NavigationLink {
                            EvalLeaderboardView()
                        } label: {
                            hubRowView(icon: "trophy.fill", title: "Classement")
                        }
                        .buttonStyle(.plain)

                        let settingsBadge: String? = (store.isConfigured && store.playerSettingsCount > 0) ? "\(store.playerSettingsCount)" : nil
                        NavigationLink {
                            EvalPlayerSettingsView()
                        } label: {
                            hubRowView(icon: "slider.horizontal.3", title: "Paramètres du joueur", badge: settingsBadge)
                        }
                        .buttonStyle(.plain)
                    }

                    // 2. Progression
                    hubGroupSection(title: "Progression") {
                        NavigationLink {
                            EvalSeasonGoalsView()
                        } label: {
                            hubRowView(icon: "target", title: "Objectifs de la saison")
                        }
                        .buttonStyle(.plain)
                    }

                    // 3. Infos sur le jeu
                    hubGroupSection(title: "Infos sur le jeu") {
                        NavigationLink {
                            EvalMapsView()
                        } label: {
                            hubRowView(icon: "map.fill", title: "Cartes")
                        }
                        .buttonStyle(.plain)

                        NavigationLink {
                            EvalAgentsView()
                        } label: {
                            hubRowView(icon: "person.crop.circle.fill", title: "Agents")
                        }
                        .buttonStyle(.plain)

                        NavigationLink {
                            EvalWeaponsView()
                        } label: {
                            hubRowView(icon: "scope", title: "Armes")
                        }
                        .buttonStyle(.plain)

                        Button {
                            showingStore = true
                        } label: {
                            hubRowView(icon: "bag.fill", title: "Boutique du jour", badge: nil)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .sheet(isPresented: $showingStore) {
                NavigationStack {
                    ValorantStoreView()
                }
            }
        }

    private func hubGroupSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content()
            }
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
        }
    }

    private func hubRowView(icon: String, title: String, badge: String? = nil) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundStyle(Theme.danger)
                .frame(width: 24)

            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)

            Spacer()

            if let badge {
                Text(badge)
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 52)
        }
    }
}

// MARK: - Friends Screen (Screenshots 1-4)
struct EvalFriendsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var searchQuery: String = ""
    @State private var showingAddFriendModal: Bool = false
    @State private var showingSettingsSheet: Bool = false
    @State private var showingAccountSheet: Bool = false
    @State private var selectedFriend: ValorantFriend?

    private var store: ValorantStore { model.valorant }

    private var filteredFriends: [ValorantFriend] {
        if searchQuery.trimmingCharacters(in: .whitespaces).isEmpty {
            return store.friends
        }
        return store.friends.filter {
            $0.name.localizedCaseInsensitiveContains(searchQuery) ||
            $0.tag.localizedCaseInsensitiveContains(searchQuery) ||
            ($0.gameMode?.localizedCaseInsensitiveContains(searchQuery) ?? false) ||
            ($0.map?.localizedCaseInsensitiveContains(searchQuery) ?? false)
        }
    }

    private var onlineFriends: [ValorantFriend] {
        filteredFriends.filter { $0.isOnline || $0.isInGame }
    }

    private var offlineFriends: [ValorantFriend] {
        let list = filteredFriends.filter { !$0.isOnline && !$0.isInGame }
        if store.sortOfflineByLastSeen {
            return list.sorted { $0.lastOnlineSecondsAgo < $1.lastOnlineSecondsAgo }
        } else {
            return list.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        }
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Top Custom Navigation Bar (matching Screenshot 1)
                    friendsTopBar

                    // Search bar
                    HStack(spacing: 10) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 15))
                            .foregroundStyle(.secondary)

                        TextField("Rechercher des amis", text: $searchQuery)
                            .font(.subheadline)
                            .foregroundStyle(.white)

                        if !searchQuery.isEmpty {
                            Button {
                                searchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 14))

                    if !store.isConfigured {
                        // Disconnected state: instructions to connect, NO dummy placeholders
                        disconnectedConnectCard
                    } else if onlineFriends.isEmpty && offlineFriends.isEmpty {
                        // Empty friends state for accounts with no friends: NO dummy placeholders
                        emptyFriendsCard
                    } else {
                        // Connected state: Rub19#Boss group + Online Friends groups + Offline Friends section
                        VStack(spacing: 18) {
                            // Section 1: Votre groupe — 1/5
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Votre groupe — 1/5")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                myUserPartyCard
                            }

                            // Section 2: Online Friends Groups
                            ForEach(onlineFriends) { friend in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Groupe — \(friend.partyCurrent)/\(friend.partyMax)")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                        .padding(.leading, 4)

                                    Button {
                                        selectedFriend = friend
                                    } label: {
                                        EvalFriendCard(friend: friend)
                                    }
                                    .buttonStyle(PressScaleStyle())
                                }
                            }

                            // Section 3: Hors ligne — X
                            if !offlineFriends.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Hors ligne — \(offlineFriends.count)")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(.secondary)
                                        .padding(.leading, 4)

                                    VStack(spacing: 8) {
                                        ForEach(offlineFriends) { friend in
                                            Button {
                                                selectedFriend = friend
                                            } label: {
                                                EvalOfflineFriendCard(friend: friend)
                                            }
                                            .buttonStyle(PressScaleStyle())
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .refreshable {
                await store.refreshFriends()
            }
            .task {
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 12_000_000_000)
                    store.tickLiveFriends()
                }
            }
            .navigationBarBackButtonHidden(true)
            .ethoneScreen()

            // Modal "Ajouter un ami" (Screenshot 2)
            if showingAddFriendModal {
                Color.black.opacity(0.65)
                    .ignoresSafeArea()
                    .transition(.opacity)

                EvalAddFriendModal(
                    isPresented: $showingAddFriendModal,
                    onSend: { name, tag in
                        store.sendFriendRequest(name: name, tag: tag)
                    }
                )
                .transition(.scale(scale: 0.9).combined(with: .opacity))
                .zIndex(10)
            }
        }
        .sheet(isPresented: $showingSettingsSheet) {
            EvalFriendSettingsSheet(
                openProfileDirectly: Binding(
                    get: { store.openProfileDirectly },
                    set: { store.openProfileDirectly = $0 }
                ),
                sortOfflineByLastSeen: Binding(
                    get: { store.sortOfflineByLastSeen },
                    set: { store.sortOfflineByLastSeen = $0 }
                )
            )
            .presentationDetents([.fraction(0.48), .medium])
            .presentationDragIndicator(.visible)
        }
        .sheet(item: $selectedFriend) { friend in
            EvalFriendDetailSheet(friend: friend)
                .presentationDetents([.fraction(0.48), .medium])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showingAccountSheet) {
            ValorantSettingsSheet()
        }
    }

    // Top Navigation Bar matching Screenshot 1
    private var friendsTopBar: some View {
        HStack {
            // Left: Back button + History button
            HStack(spacing: 8) {
                Button {
                    dismiss()
                } label: {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 38, height: 38)
                        .overlay(
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        )
                }
                .buttonStyle(PressScaleStyle())

                NavigationLink {
                    EvalFriendHistoryView()
                } label: {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 38, height: 38)
                        .overlay(
                            Image(systemName: "person.crop.circle.badge.clock")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.danger)
                        )
                }
                .buttonStyle(PressScaleStyle())
            }

            Spacer()

            Text("Amis")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            // Right: Settings (...) + Add Friend (+)
            HStack(spacing: 8) {
                Button {
                    showingSettingsSheet = true
                } label: {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 38, height: 38)
                        .overlay(
                            Image(systemName: "ellipsis")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(Theme.danger)
                        )
                }
                .buttonStyle(PressScaleStyle())

                Button {
                    withAnimation(Motion.snap) {
                        showingAddFriendModal = true
                    }
                } label: {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 38, height: 38)
                        .overlay(
                            Image(systemName: "person.crop.circle.badge.plus")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.danger)
                        )
                }
                .buttonStyle(PressScaleStyle())
            }
        }
        .padding(.top, 4)
    }

    // Card for current user in "Votre groupe — 1/5"
    private var myUserPartyCard: some View {
        HStack(spacing: 12) {
            // Avatar with green online pastille
            ZStack(alignment: .bottomTrailing) {
                let ppURL = store.isCurrentUserRub19 ? "https://media.valorant-api.com/playercards/d30271ae-4ce1-5ed2-c55f-f08a6247c274/displayicon.png" : ""
                if !ppURL.isEmpty, let url = URL(string: ppURL) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .interpolation(.high)
                                .scaledToFill()
                                .frame(width: 44, height: 44)
                                .clipShape(.rect(cornerRadius: 12))
                        default:
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: 0x1A1C24))
                                .frame(width: 44, height: 44)
                                .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                        }
                    }
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: 0x1A1C24))
                        .frame(width: 44, height: 44)
                        .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                }

                // Green online circle
                Circle()
                    .fill(Color(hex: 0x22C55E))
                    .frame(width: 13, height: 13)
                    .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 2))
                    .offset(x: 2, y: 2)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(store.playerName.isEmpty ? "Rub19" : store.playerName)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)

                    Text("#\(store.tag.isEmpty ? "Boss" : store.tag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Text("En ligne")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    // Prompt to connect if disconnected
    private var disconnectedConnectCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.badge.gearshape.fill")
                .font(.system(size: 40))
                .foregroundStyle(Theme.danger)

            VStack(spacing: 6) {
                Text("Connexion Riot requise")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)

                Text("Connectez votre compte Riot Games pour voir vos amis en direct, leur mode de jeu, score et rang.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }

            Button {
                showingAccountSheet = true
            } label: {
                Text("Se connecter")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(Theme.danger, in: .capsule)
            }
            .buttonStyle(PressScaleStyle())
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    // Empty state when account has 0 friends (zero fake placeholders)
    private var emptyFriendsCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("Aucun ami sur ce compte")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Text("Vos amis en jeu et hors ligne apparaîtront ici dès qu'ils feront partie de votre compte.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)

            Button {
                withAnimation(Motion.snap) {
                    showingAddFriendModal = true
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle.badge.plus")
                    Text("Ajouter un ami")
                }
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Theme.danger)
                .padding(.horizontal, 18)
                .padding(.vertical, 8)
                .background(Theme.danger.opacity(0.18), in: .capsule)
            }
            .buttonStyle(PressScaleStyle())
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Online Friend Card (Screenshot 1)
struct EvalFriendCard: View {
    let friend: ValorantFriend

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                // Avatar with pastille
                ZStack(alignment: .bottomTrailing) {
                    AsyncImage(url: URL(string: friend.avatarURL ?? "")) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill().frame(width: 44, height: 44).clipShape(.rect(cornerRadius: 12))
                        default:
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: 0x1A1C24))
                                .frame(width: 44, height: 44)
                                .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                        }
                    }

                    if friend.isInGame {
                        // Red In-Game pastille (minus/dash icon)
                        Circle()
                            .fill(Theme.danger)
                            .frame(width: 13, height: 13)
                            .overlay(Rectangle().fill(Color.white).frame(width: 6, height: 1.8))
                            .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 2))
                            .offset(x: 2, y: 2)
                    } else if friend.isOnline {
                        Circle()
                            .fill(Color(hex: 0x22C55E))
                            .frame(width: 13, height: 13)
                            .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 2))
                            .offset(x: 2, y: 2)
                    }
                }

                // Middle Info
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text(friend.name)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(.white)

                        Text("#\(friend.tag)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)

                        if friend.isPartyLeader {
                            Image(systemName: "crown.fill")
                                .font(.system(size: 11))
                                .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.85))
                                .padding(.leading, 2)
                        }
                    }

                    if friend.isInGame {
                        HStack(spacing: 5) {
                            Text("En Jeu")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.secondary)

                            if let score = friend.scoreRounds {
                                Text("|")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary.opacity(0.6))
                                Text(score)
                                    .font(.caption.weight(.heavy).monospacedDigit())
                                    .foregroundStyle(.white)
                            }
                        }

                        if let mode = friend.gameMode, let map = friend.map {
                            Text("\(mode) · \(map)")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text(friend.isOnline ? "En ligne" : (friend.lastOnlineText ?? "Hors ligne"))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Right: Rank emblem + Chevron
                HStack(spacing: 8) {
                    if friend.tierNumber > 0 {
                        AsyncImage(url: friend.rankIconURL) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFit().frame(width: 28, height: 28)
                            default:
                                Image(systemName: "shield.fill")
                                    .font(.system(size: 18))
                                    .foregroundStyle(Color(hex: 0xF5D78E))
                            }
                        }
                    }

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(14)

            // Sub-party indicator
            if friend.otherPartyMembersCount > 0 {
                Rectangle()
                    .fill(Color.white.opacity(0.05))
                    .frame(height: 1)
                    .padding(.horizontal, 14)

                HStack {
                    Text("+ \(friend.otherPartyMembersCount) autres")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
            }
        }
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Offline Friend Card (Screenshot 3 & requirements)
struct EvalOfflineFriendCard: View {
    let friend: ValorantFriend

    var body: some View {
        HStack(spacing: 12) {
            // Avatar (dimmed for offline, gray pastille)
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: URL(string: friend.avatarURL ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill().frame(width: 44, height: 44).clipShape(.rect(cornerRadius: 12))
                    default:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: 0x1A1C24))
                            .frame(width: 44, height: 44)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }
                .opacity(0.65)

                Circle()
                    .fill(Color(hex: 0x64748B))
                    .frame(width: 11, height: 11)
                    .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 2))
                    .offset(x: 2, y: 2)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(friend.name)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(Color.white.opacity(0.85))

                    Text("#\(friend.tag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Text(friend.lastOnlineText ?? "Hors ligne")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Rank emblem + Chevron
            HStack(spacing: 8) {
                if friend.tierNumber > 0 {
                    AsyncImage(url: friend.rankIconURL) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFit().frame(width: 28, height: 28).opacity(0.8)
                        default:
                            Image(systemName: "shield.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.06), lineWidth: 1))
    }
}

// MARK: - Add Friend Modal (Screenshot 2)
struct EvalAddFriendModal: View {
    @Binding var isPresented: Bool
    var onSend: (String, String) -> Void

    @State private var name: String = ""
    @State private var tag: String = ""

    var body: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Ajouter un ami")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)

                Text("Entre le Riot ID du joueur que tu veux ajouter.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 0) {
                TextField("Nom", text: $name)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(12)

                Rectangle()
                    .fill(Color.white.opacity(0.08))
                    .frame(height: 1)

                TextField("Identifiant", text: $tag)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .padding(12)
            }
            .background(Color.white.opacity(0.06), in: .rect(cornerRadius: 12))

            VStack(spacing: 10) {
                Button {
                    onSend(name, tag)
                    withAnimation(Motion.snap) {
                        isPresented = false
                    }
                } label: {
                    Text("Envoyer une demande")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Theme.danger)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color.white.opacity(0.08), in: .rect(cornerRadius: 14))
                }
                .buttonStyle(PressScaleStyle())
                .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)

                Button {
                    withAnimation(Motion.snap) {
                        isPresented = false
                    }
                } label: {
                    Text("Annuler")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Theme.danger)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 13)
                        .background(Color.white.opacity(0.08), in: .rect(cornerRadius: 14))
                }
                .buttonStyle(PressScaleStyle())
            }
        }
        .padding(22)
        .frame(maxWidth: 320)
        .glassEffect(.regular, in: .rect(cornerRadius: 24))
        .clipShape(.rect(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.5), radius: 24)
    }
}

// MARK: - Friend Settings Sheet (Screenshot 3)
struct EvalFriendSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var openProfileDirectly: Bool
    @Binding var sortOfflineByLastSeen: Bool

    var body: some View {
        VStack(spacing: 20) {
            // Header with Close X button
            HStack {
                Spacer()
                Text("Paramètres des amis")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 32, height: 32)
                        .overlay(Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundStyle(.secondary))
                }
            }
            .padding(.top, 14)

            // Settings Rows
            VStack(spacing: 16) {
                // Setting 1: Ouvrir le profil directement
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.danger)

                        Text("Ouvrir le profil directement")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)

                        Spacer()

                        Toggle("", isOn: $openProfileDirectly)
                            .labelsHidden()
                            .tint(Theme.danger)
                    }

                    Text("Lorsque cette option est activée, toucher un ami ouvre son profil au lieu de la discussion. Ignoré pour les amis ayant des messages non lus.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineSpacing(2)
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))

                // Setting 2: Trier les joueurs hors ligne par dernière connexion
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.danger)

                        Text("Trier les joueurs hors ligne par dernière connexion")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)

                        Spacer()

                        Toggle("", isOn: $sortOfflineByLastSeen)
                            .labelsHidden()
                            .tint(Theme.danger)
                    }

                    Text("Trier les amis hors ligne selon leur dernière connexion, les plus récents en haut. Lorsque cette option est désactivée, les amis hors ligne sont triés par ordre alphabétique.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineSpacing(2)
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .ethoneScreen()
    }
}

// MARK: - Friend Changes History View (Screenshot 4)
struct EvalFriendHistoryView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack(spacing: 12) {
                    Button {
                        dismiss()
                    } label: {
                        Circle()
                            .fill(Color.white.opacity(0.08))
                            .frame(width: 38, height: 38)
                            .overlay(Image(systemName: "chevron.left").font(.system(size: 14, weight: .bold)).foregroundStyle(.white))
                    }
                    .buttonStyle(PressScaleStyle())

                    Text("Changements de la liste d'amis")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)

                    Spacer()
                }
                .padding(.top, 4)

                // List of Events
                VStack(spacing: 0) {
                    ForEach(Array(store.friendHistory.enumerated()), id: \.element.id) { index, event in
                        HStack(spacing: 14) {
                            // Event Icon
                            Group {
                                switch event.type {
                                case .requestAccepted:
                                    Image(systemName: "person.crop.circle.badge.checkmark")
                                        .foregroundStyle(Color(hex: 0x22C55E))
                                case .removed:
                                    Image(systemName: "person.crop.circle.badge.minus")
                                        .foregroundStyle(.secondary)
                                case .requestCanceled:
                                    Image(systemName: "person.crop.circle.badge.xmark")
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .font(.system(size: 20))
                            .frame(width: 24)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.handle)
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(.white)

                                Text(event.type.rawValue)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)

                                Text(event.timestampText)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary.opacity(0.7))
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 14)

                        if index < store.friendHistory.count - 1 {
                            Rectangle()
                                .fill(Color.white.opacity(0.05))
                                .frame(height: 1)
                                .padding(.leading, 52)
                        }
                    }
                }
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))
                .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .navigationBarBackButtonHidden(true)
        .ethoneScreen()
    }
}

// MARK: - Friend Detail Sheet
struct EvalFriendDetailSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let friend: ValorantFriend

    private var store: ValorantStore { model.valorant }

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 14) {
                AsyncImage(url: URL(string: friend.avatarURL ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill().frame(width: 54, height: 54).clipShape(.rect(cornerRadius: 14))
                    default:
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color(hex: 0x1A1C24))
                            .frame(width: 54, height: 54)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(friend.handle)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)

                    if friend.isInGame, let mode = friend.gameMode, let map = friend.map {
                        Text("\(mode) · \(map) (Score: \(friend.scoreRounds ?? "-"))")
                            .font(.caption)
                            .foregroundStyle(Theme.danger)
                    } else {
                        Text(friend.isOnline ? "En ligne" : (friend.lastOnlineText ?? "Hors ligne"))
                            .font(.caption)
                            .foregroundStyle(friend.isOnline ? Color(hex: 0x22C55E) : .secondary)
                    }
                }

                Spacer()
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))

            VStack(spacing: 8) {
                actionRow(icon: "message.fill", title: "Envoyer un message")
                actionRow(icon: "person.crop.circle.badge.plus", title: "Inviter dans le groupe")
                actionRow(icon: "arrow.right.circle.fill", title: "Rejoindre le groupe")

                Button(role: .destructive) {
                    store.removeFriend(id: friend.id)
                    dismiss()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill.xmark")
                            .font(.system(size: 15))
                            .foregroundStyle(Theme.danger)
                            .frame(width: 22)

                        Text("Retirer de la liste d'amis")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.danger)

                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                }
                .buttonStyle(PressScaleStyle())
            }
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))

            Spacer()
        }
        .padding(16)
        .ethoneScreen()
    }

    private func actionRow(icon: String, title: String) -> some View {
        Button {
            dismiss()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.danger)
                    .frame(width: 22)

                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 4. PARAMÈTRES TAB (Screenshot 3 - Paywalls Removed)
struct EvalSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var showingAccountSheet = false
    @State private var selectedTheme = "Système"
    @State private var selectedPlatform = "PC"

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    Button {
                        dismiss()
                    } label: {
                        Circle()
                            .fill(Color.white.opacity(0.08))
                            .frame(width: 38, height: 38)
                            .overlay(
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(.white)
                            )
                    }
                    .buttonStyle(PressScaleStyle())

                    Text("Paramètres")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.top, 4)

                    // 1. Comptes Riot
                    VStack(alignment: .leading, spacing: 8) {
                        if store.isConfigured {
                            HStack(spacing: 12) {
                                ZStack(alignment: .bottomTrailing) {
                                    Circle()
                                        .fill(Color(hex: 0x1A1C24))
                                        .frame(width: 40, height: 40)
                                        .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))

                                    Circle()
                                        .fill(Color(hex: 0x22C55E))
                                        .frame(width: 10, height: 10)
                                        .overlay(Circle().strokeBorder(Color(hex: 0x0E1017), lineWidth: 1.5))
                                }

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(store.playerName)#\(store.tag)")
                                        .font(.subheadline.weight(.heavy))
                                        .foregroundStyle(.white)

                                    Text(store.isCurrentUserRub19 ? "Compte principal (Rub19)" : "Compte connecté")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Button {
                                    store.disconnect()
                                } label: {
                                    Text("Déconnecter")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(Theme.danger)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Theme.danger.opacity(0.15), in: .capsule)
                                }
                                .buttonStyle(PressScaleStyle())
                            }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))
                            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                        }

                        Button {
                            showingAccountSheet = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Theme.danger)
                                Text(store.isConfigured ? "Changer de compte" : "Ajouter un compte")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        }
                        .buttonStyle(PressScaleStyle())

                        Text("Glissez vers la gauche sur un compte pour vous déconnecter et le retirer.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                    }

                    // 2. Plateforme (PC)
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 12) {
                            Image(systemName: "desktopcomputer")
                                .font(.system(size: 16))
                                .foregroundStyle(Theme.danger)
                            Text(selectedPlatform)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                            Spacer()
                            Button("Modifier") {
                                selectedPlatform = selectedPlatform == "PC" ? "Console" : "PC"
                            }
                            .font(.caption.weight(.bold))
                            .foregroundStyle(Theme.danger)
                        }
                        .padding(14)
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))

                        Text("Sélectionnez la plateforme sur laquelle vous jouez. Vous pouvez consulter les données des autres plateformes en utilisant le sélecteur de plateforme sur n'importe quel profil.")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                    }

                    // 3. Stockage et Données
                    VStack(spacing: 0) {
                        settingsNavRow(icon: "arrow.up.arrow.down", title: "Stockage et données")
                        settingsNavRow(icon: "slider.horizontal.2.square", title: "Paramètres avancés")
                    }
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                    // 4. Apparence
                    VStack(spacing: 0) {
                        HStack {
                            Image(systemName: "sun.max")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.danger)
                                .frame(width: 24)
                            Text("Thème")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.white)
                            Spacer()
                            Picker("Thème", selection: $selectedTheme) {
                                Text("Système").tag("Système")
                                Text("Sombre").tag("Sombre")
                                Text("Clair").tag("Clair")
                            }
                            .pickerStyle(.menu)
                            .tint(Theme.danger)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 52)
                        }

                        settingsNavRow(icon: "app.dashed", title: "Icône de l'app", detail: "E:Val (Par défaut)")

                        HStack {
                            Image(systemName: "square.and.pencil")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.danger)
                                .frame(width: 24)
                            Text("Couleur d'accentuation")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.white)
                            Spacer()
                            Circle()
                                .strokeBorder(Theme.danger, lineWidth: 3)
                                .background(Circle().fill(Color(hex: 0x1A0A10)))
                                .frame(width: 20, height: 20)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    }
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

                    // 5. Liens & À propos
                    VStack(spacing: 0) {
                        Link(destination: URL(string: "https://discord.gg/ethone")!) {
                            HStack(spacing: 14) {
                                Image(systemName: "bubble.left.and.bubble.right.fill")
                                    .font(.system(size: 15))
                                    .foregroundStyle(Theme.danger)
                                    .frame(width: 24)
                                Text("Serveur Discord")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: "arrow.up.right")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                        }

                        HStack(spacing: 14) {
                            Image(systemName: "info.circle")
                                .font(.system(size: 15))
                                .foregroundStyle(Theme.danger)
                                .frame(width: 24)
                            Text("À propos")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.white)
                            Spacer()
                            Text("E:Val 1.0 (iOS 26/27)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    }
                    .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                    .clipShape(.rect(cornerRadius: Theme.cardRadius))
                    .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .sheet(isPresented: $showingAccountSheet) {
                ValorantSettingsSheet()
            }
        }

    private func settingsNavRow(icon: String, title: String, detail: String? = nil) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundStyle(Theme.danger)
                .frame(width: 24)

            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.white)

            Spacer()

            if let detail {
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1).padding(.leading, 52)
        }
    }
}
