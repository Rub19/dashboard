import SwiftUI

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

struct EvalLockedView: View {
    let title: String
    let message: String
    let onAddAccount: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(.gray)

            Text(title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)

            Text(message)
                .font(.system(size: 19, weight: .regular))
                .foregroundStyle(.gray)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 340)

            Button(action: onAddAccount) {
                Label("Ajouter un compte", systemImage: "plus")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Theme.danger, in: .capsule)
            }
            .buttonStyle(.plain)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }
}

struct EvalLogoView: View {
    var size: CGFloat = 40
    var showText: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            ZStack {
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

                GeometryReader { geo in
                    let w = geo.size.width
                    let h = geo.size.height
                    Path { path in
                        path.move(to: CGPoint(x: w * 0.38, y: h * 0.24))
                        path.addLine(to: CGPoint(x: w * 0.74, y: h * 0.24))
                        path.addLine(to: CGPoint(x: w * 0.62, y: h * 0.38))
                        path.addLine(to: CGPoint(x: w * 0.26, y: h * 0.38))
                        path.closeSubpath()

                        path.move(to: CGPoint(x: w * 0.26, y: h * 0.44))
                        path.addLine(to: CGPoint(x: w * 0.62, y: h * 0.44))
                        path.addLine(to: CGPoint(x: w * 0.52, y: h * 0.56))
                        path.addLine(to: CGPoint(x: w * 0.34, y: h * 0.56))
                        path.closeSubpath()

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

struct EvalAppView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab: EvalTab = .profile
    @State private var selectedMatch: ValorantMatch?

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack(alignment: .bottom) {
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

            VStack(spacing: 8) {
                if selectedTab == .game {
                    EvalWalletBar(wallet: store.wallet)
                }

                evalTabBar
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 10)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .ethoneScreen()
        .navigationDestination(item: $selectedMatch) { match in
            ValorantMatchDetailView(match: match)
        }
    }

    private var evalTabBar: some View {
        GlassEffectContainer(spacing: 8) {
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
                                .foregroundStyle(isSelected ? Color(hex: 0xFD5B68) : Color.white.opacity(0.85))

                            Text(tab.rawValue)
                                .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                                .foregroundStyle(isSelected ? Color(hex: 0xFD5B68) : Color.white.opacity(0.75))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background {
                            if isSelected {
                                Capsule()
                                    .fill(Color(hex: 0xFD5B68).opacity(0.2))
                                    .glassEffect(.regular.interactive(), in: .capsule)
                                    .padding(.horizontal, 5)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .contentShape(Rectangle())
                    .sensoryFeedback(.selection, trigger: selectedTab)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .glassEffect(.regular.interactive(), in: .capsule)
            .overlay(Capsule().strokeBorder(Color.white.opacity(0.16), lineWidth: 1))
        }
        .shadow(color: .black.opacity(0.35), radius: 18, y: 8)
    }
}

struct EvalProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedMatch: ValorantMatch?

    @State private var showingAccountSheet = false

    private var store: ValorantStore { model.valorant }
    private var profile: ValorantProfile? { store.profile }

    private var totalMatchesCount: Int {
        return store.matches.count
    }

    private var totalWinsCount: Int {
        return store.matches.filter(\ .won).count
    }

    private var winRateText: String {
        guard totalMatchesCount > 0 else { return "—" }
        let wr = (Double(totalWinsCount) / Double(totalMatchesCount)) * 100.0
        return String(format: "%.1f %%", wr).replacingOccurrences(of: ".", with: ",")
    }

    private var recentSessionMatches: [ValorantMatch] {
        Array(store.matches.prefix(5))
    }

    private var sessionKdText: String {
        guard !recentSessionMatches.isEmpty else { return "—" }
        let kills = recentSessionMatches.reduce(0) { $0 + $1.kills }
        let deaths = max(1, recentSessionMatches.reduce(0) { $0 + $1.deaths })
        let kd = Double(kills) / Double(deaths)
        return String(format: "%.1f", kd).replacingOccurrences(of: ".", with: ",")
    }

    private var sessionDeltaText: String {
        guard !recentSessionMatches.isEmpty else { return "—" }
        let wins = recentSessionMatches.filter(\ .won).count
        let losses = recentSessionMatches.filter { !$0.won }.count
        let delta = (wins * 24) - (losses * 16)
        return "\(delta >= 0 ? "+" : "")\(delta) SC"
    }

    private var avgHsPercent: Int {
        guard !recentSessionMatches.isEmpty else { return 0 }
        return recentSessionMatches.reduce(0) { $0 + $1.headshotPercent } / recentSessionMatches.count
    }

    private var avgAdrValue: Int {
        guard !recentSessionMatches.isEmpty else { return 0 }
        let damageAndRounds = recentSessionMatches.compactMap { match -> (Int, Int)? in
            guard let damage = match.myPlayer?.damageMade else { return nil }
            let rounds = match.teamRounds + match.opponentRounds
            guard rounds > 0 else { return nil }
            return (damage, rounds)
        }
        guard !damageAndRounds.isEmpty else { return 0 }
        let totalDamage = damageAndRounds.reduce(0) { $0 + $1.0 }
        let totalRounds = damageAndRounds.reduce(0) { $0 + $1.1 }
        return totalDamage / max(1, totalRounds)
    }

    var body: some View {
        Group {
            if store.isConfigured {
                profileContent
            } else {
                EvalLockedView(
                    title: "Non connecté",
                    message: "Vous devez vous connecter pour accéder à cela.",
                    onAddAccount: { showingAccountSheet = true }
                )
            }
        }
        .sheet(isPresented: $showingAccountSheet) {
            ValorantSettingsSheet()
        }
        .alert("Action indisponible", isPresented: Binding(
            get: { store.socialActionMessage != nil },
            set: { if !$0 { store.socialActionMessage = nil } }
        )) {
            Button("OK", role: .cancel) { store.socialActionMessage = nil }
        } message: {
            Text(store.socialActionMessage ?? "")
        }
    }

    private var profileContent: some View {
        ScrollView {
            VStack(spacing: 16) {
                topNavHeader

                if let profile {
                    mainProfileCard(profile: profile)
                    if !store.matches.isEmpty {
                        careerSummaryCard(profile: profile)
                        sessionRecapRow
                        matchesListSection
                    } else if !store.isLoading {
                        emptyMatchesCard
                    }
                } else if !store.isLoading {
                    ContentUnavailableView(
                        "Profil indisponible",
                        systemImage: "person.crop.circle.badge.exclamationmark",
                        description: Text(store.errorMessage ?? "L’API n’a fourni aucune donnée pour ce compte.")
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
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
    }

    private var topNavHeader: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "desktopcomputer")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Color(hex: 0xFD5B68))
                    .frame(width: 44, height: 44)
                    .background(Color(hex: 0x161618), in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()

            Text(profile?.handle.split(separator: "#").first.map(String.init) ?? (store.playerName.isEmpty ? "Profil" : store.playerName))
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            Button {
                showingAccountSheet = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "line.3.horizontal")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    Image(systemName: "ellipsis")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 16)
                .frame(height: 44)
                .background(Color(hex: 0x161618), in: .capsule)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 4)
    }

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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private var emptyMatchesCard: some View {
        ContentUnavailableView(
            "Aucune partie synchronisée",
            systemImage: "clock.arrow.circlepath",
            description: Text("L’historique de ce compte n’est pas encore disponible dans l’API.")
        )
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private func mainProfileCard(profile: ValorantProfile) -> some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: 0) {
                    Text(profile.handle.split(separator: "#").first.map(String.init) ?? profile.handle)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    if let tag = profile.handle.split(separator: "#").dropFirst().first {
                        Text("#\(tag)")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                Spacer()
                Text(store.equipmentTitle)
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

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

            HStack(alignment: .top, spacing: 16) {
                NavigationLink {
                    EvalCareerSummaryView(profile: profile, matches: store.matches)
                } label: {
                    VStack(spacing: 6) {
                        if !profile.actName.isEmpty {
                            Text(profile.actName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                                .tracking(0.6)
                        }

                        ZStack {
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [Color(hex: 0xFD5B68).opacity(0.25), .clear],
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
                                        image.resizable().scaledToFit().frame(width: 52, height: 52)
                                    default:
                                        ProgressView().tint(.secondary)
                                    }
                                }
                            }
                        }

                        Text(profile.rank.isEmpty ? "RANG INDISPONIBLE" : profile.rank.uppercased())
                            .font(.system(size: 16, weight: .heavy))
                            .foregroundStyle(Color(hex: 0xFD5B68))

                        if profile.rr > 0 {
                            Text("\(profile.rr) SC")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }

                        if let leaderboardRank = profile.leaderboardRank {
                            Text("Rang \(leaderboardRank)")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 7)
                                .background(Color(hex: 0xFD5B68), in: .capsule)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)

                NavigationLink {
                    EvalCareerSummaryView(profile: profile, matches: store.matches)
                } label: {
                    HStack(alignment: .center, spacing: 0) {
                        VStack(spacing: 6) {
                            if !profile.actName.isEmpty {
                                Text(profile.actName)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                                    .tracking(0.6)
                            }

                            ZStack {
                                if let peakIconURL = ValorantProfile.tierIcon(profile.peakTier) {
                                    AsyncImage(url: peakIconURL) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image.resizable().scaledToFit().frame(width: 52, height: 52)
                                        default:
                                            ProgressView().tint(.secondary)
                                        }
                                    }
                                }
                            }
                            .frame(height: 76)

                            Text(profile.peakRank.isEmpty ? "RANG INDISPONIBLE" : profile.peakRank.uppercased())
                                .font(.system(size: 16, weight: .heavy))
                                .foregroundStyle(.white)

                            Text("Plus haut rang atteint")
                                .font(.system(size: 13))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                            .padding(.trailing, 4)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
            .padding(16)
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
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
        }
    }

    private func careerSummaryCard(profile: ValorantProfile) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Résumé de carrière")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
                NavigationLink {
                    EvalCareerSummaryView(profile: profile, matches: store.matches)
                } label: {
                    HStack(spacing: 4) {
                        Text("20 Actes")
                            .font(.system(size: 15, weight: .medium))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .buttonStyle(.plain)
            }

            if !profile.actName.isEmpty {
                HStack {
                    Spacer()
                    Text(profile.actName)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .tracking(0.6)
                    Spacer()
                }
            }

            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(winRateText)
                        .font(.system(size: 24, weight: .heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("Taux de victoire")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Text("\(totalWinsCount)")
                            .font(.system(size: 24, weight: .heavy).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x22C55E))
                        Text("/ \(totalMatchesCount)")
                            .font(.system(size: 24, weight: .heavy).monospacedDigit())
                            .foregroundStyle(.white)
                    }
                    Text("Victoires / Parties")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            HStack(spacing: 12) {
                actBadge(name: "V26 // ACTE VI", icon: "circle.fill", color: Color(hex: 0xFD5B68), tier: 26)
                actBadge(name: "V26 // ACTE V", icon: "circle.fill", color: Color(hex: 0xFD5B68).opacity(0.8), tier: 25)
                actBadge(name: "V26 // ACTE IV", icon: "circle.fill", color: Color(hex: 0x22C55E), tier: 23)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private func actBadge(name: String, icon: String, color: Color, tier: Int? = nil) -> some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.18))
                    .frame(width: 48, height: 48)

                if let tier, let url = ValorantProfile.tierIcon(tier) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable().scaledToFit().frame(width: 28, height: 28)
                        } else {
                            Image(systemName: icon)
                                .font(.system(size: 20))
                                .foregroundStyle(color)
                        }
                    }
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 20))
                        .foregroundStyle(color)
                }
            }
            Text(name)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .frame(maxWidth: .infinity)
    }

    private var sessionRecapRow: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 14) {
                Image(systemName: "archivebox.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(Color(hex: 0xFD5B68))

                VStack(alignment: .leading, spacing: 4) {
                    Text("Récap de session")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)

                    Text("Hier\n\(recentSessionMatches.count) parties")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            NavigationLink {
                if let profile {
                    EvalCareerSummaryView(profile: profile, matches: store.matches)
                }
            } label: {
                VStack(alignment: .leading, spacing: 14) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 20))
                        .foregroundStyle(Color(hex: 0xFD5B68))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Voir les statistiques")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)

                        Text("Win rate, K/D & more")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)
        }
    }

    private var matchesListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Matchs")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(.white)
                .padding(.top, 4)

            ForEach(store.matches) { match in
                Button {
                    selectedMatch = match
                } label: {
                    matchRowCard(match: match)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func matchRowCard(match: ValorantMatch) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "cube.transparent")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.8))
                Image(systemName: "desktopcomputer")
                    .font(.system(size: 15))
                    .foregroundStyle(.white.opacity(0.8))
                Text(match.mode.isEmpty || match.mode == "—" ? "Non classé" : match.mode)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)

            HStack {
                if let startedAt = match.startedAt {
                    Text(startedAt.formatted(.dateTime.day().month(.twoDigits).year(.twoDigits).hour().minute()).replacingOccurrences(of: "/", with: "/").replacingOccurrences(of: " ", with: " · "))
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                } else {
                    Text("17/10/26 · 01:00")
                        .font(.system(size: 12))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 2)
            .padding(.bottom, 12)

            ZStack(alignment: .leading) {
                mapSplashBanner(for: match.map)

                LinearGradient(
                    colors: [Color.black.opacity(0.8), Color.black.opacity(0.2), Color.black.opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )

                HStack(spacing: 14) {
                    if let agentURL = match.myPlayer?.agentIconURL {
                        AsyncImage(url: agentURL) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 82, height: 82)
                                    .clipped()
                            } else {
                                Color.clear.frame(width: 82, height: 82)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(match.agent.isEmpty || match.agent == "—" ? "Jett" : match.agent)
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(.white)

                        HStack(spacing: 6) {
                            Text(match.map.isEmpty || match.map == "—" ? "Ascent" : match.map)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.black.opacity(0.6), in: .capsule)

                            if match.kills >= 18 || match.id == store.matches.first?.id {
                                Text("MVP du match")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(Color(hex: 0xF5D78E))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color(hex: 0x785618).opacity(0.4), in: .capsule)
                                    .overlay(Capsule().strokeBorder(Color(hex: 0xF5D78E).opacity(0.5), lineWidth: 1))
                            }
                        }
                    }

                    Spacer()

                    Text(match.won ? "VICTOIRE" : "DÉFAITE")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(match.won ? Color(hex: 0x35B86B) : Color(hex: 0xFD5B68), in: .capsule)
                        .padding(.trailing, 14)
                }
            }
            .frame(height: 82)
            .clipped()

            HStack(spacing: 0) {
                Label("\(match.kills) / \(match.deaths) / \(match.assists)", systemImage: "scope")
                    .font(.system(size: 14, weight: .medium).monospacedDigit())
                Spacer()
                Label("\(match.scoreValue ?? 359)", systemImage: "chart.bar.fill")
                    .font(.system(size: 14, weight: .medium).monospacedDigit())
                Spacer()
                HStack(spacing: 6) {
                    Label("\(match.teamRounds) — \(match.opponentRounds)", systemImage: "flag.checkered")
                        .font(.system(size: 14, weight: .medium).monospacedDigit())
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private func mapSplashBanner(for mapName: String) -> some View {
        let splashURL: String = {
            let m = mapName.lowercased()
            if m.contains("ascent") {
                return "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png"
            } else if m.contains("bind") {
                return "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/splash.png"
            } else if m.contains("split") {
                return "https://media.valorant-api.com/maps/d960549e-485c-68e3-6170-719f11642671/splash.png"
            } else if m.contains("sunset") {
                return "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/splash.png"
            }
            return "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png"
        }()

        return AsyncImage(url: URL(string: splashURL)) { phase in
            if let img = phase.image {
                img.resizable().scaledToFill().frame(maxWidth: .infinity).frame(height: 82).clipped()
            } else {
                Color(hex: 0x1F222A).frame(height: 82)
            }
        }
    }
}

struct EvalCareerSummaryView: View {
    @Environment(\.dismiss) private var dismiss

    let profile: ValorantProfile
    let matches: [ValorantMatch]

    @State private var selectedQueue = "Compétition"

    private var queueMatches: [ValorantMatch] {
        let normalized = selectedQueue.folding(options: .diacriticInsensitive, locale: .current).lowercased()
        if normalized.contains("gauntlet") {
            return matches.filter { $0.mode.folding(options: .diacriticInsensitive, locale: .current).lowercased().contains("gauntlet") }
        }
        if normalized.contains("mort") {
            return matches.filter {
                let mode = $0.mode.folding(options: .diacriticInsensitive, locale: .current).lowercased()
                return mode.contains("deathmatch") || mode.contains("combat")
            }
        }
        return matches.filter {
            let mode = $0.mode.folding(options: .diacriticInsensitive, locale: .current).lowercased()
            return mode.contains("competitive") || mode.contains("compet") || mode.contains("ranked")
        }
    }

    private var wins: Int { queueMatches.filter(\ .won).count }
    private var winRate: String {
        guard !queueMatches.isEmpty else { return "—" }
        return String(format: "%.1f%%", Double(wins) / Double(queueMatches.count) * 100)
            .replacingOccurrences(of: ".", with: ",")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                queueSelector

                if !profile.actName.isEmpty {
                    actHeader
                }

                if selectedQueue == "Compétition", !profile.peakRank.isEmpty {
                    rankCard
                }

                if queueMatches.isEmpty {
                    noMatchesCard
                } else {
                    performanceCard
                }

                allTimeCard
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .navigationBarBackButtonHidden(true)
        .ethoneScreen()
    }

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Color(hex: 0x161618), in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()

            Text("Résumé de carrière")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()
        }
        .padding(.top, 4)
    }

    private var queueSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(["Gauntlet: Glitched", "Compétition", "Combat à mort"], id: \ .self) { queue in
                    Button {
                        withAnimation(Motion.snap) {
                            selectedQueue = queue
                        }
                    } label: {
                        Text(queue)
                            .font(.system(size: 15, weight: selectedQueue == queue ? .bold : .medium))
                            .foregroundStyle(selectedQueue == queue ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(
                                selectedQueue == queue ? Color(hex: 0xFD5B68).opacity(0.16) : Color(hex: 0x161618),
                                in: .capsule
                            )
                            .overlay(
                                Capsule().strokeBorder(selectedQueue == queue ? Color(hex: 0xFD5B68).opacity(0.4) : Color.clear, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var actHeader: some View {
        HStack {
            Text(profile.actName.isEmpty ? "V26 — ACTE VI" : profile.actName.replacingOccurrences(of: "//", with: "—"))
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)
            Spacer()
            Text("Actuel")
                .font(.system(size: 15))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 18)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private var noMatchesCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "display")
                .font(.system(size: 42))
                .foregroundStyle(.secondary)
            Text("Aucune partie jouée")
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
            Text("L’API n’a fourni aucune partie pour cette file et cet acte.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 42)
        .padding(.horizontal, 24)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Performance")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)

            HStack(spacing: 0) {
                careerMetric(value: "76,0%", label: "Taux de victoire", color: Color(hex: 0x2DD4BF))
                Divider().frame(height: 56).overlay(Color.white.opacity(0.08))
                careerMetric(value: "19 / 25", label: "Victoires / Parties", color: Color(hex: 0x22C55E))
            }
        }
        .padding(16)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private var rankCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Rang")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(.white)

            HStack(spacing: 0) {
                VStack(spacing: 6) {
                    if let icon = ValorantProfile.tierIcon(profile.tier) {
                        AsyncImage(url: icon) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFit().frame(width: 52, height: 52)
                            default:
                                Image(systemName: "shield.fill").font(.largeTitle).foregroundStyle(.secondary)
                            }
                        }
                    }

                    Text("IMMORTEL 3")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundStyle(Color(hex: 0xFD5B68))

                    Text("319 SC")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color(hex: 0x8E8E93))

                    Text("Rang 666")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 7)
                        .background(Color(hex: 0xFD5B68), in: .capsule)
                }
                .frame(maxWidth: .infinity)

                Divider().frame(height: 110).overlay(Color.white.opacity(0.08))

                VStack(spacing: 8) {
                    if let peakIcon = ValorantProfile.tierIcon(profile.peakTier) {
                        AsyncImage(url: peakIcon) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFit().frame(width: 52, height: 52)
                            default:
                                Image(systemName: "triangle.fill").font(.largeTitle).foregroundStyle(Color(hex: 0xF5D78E))
                            }
                        }
                    }

                    Text("Appuyer pour agrandir")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(16)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private var allTimeCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Statistiques de tous les temps")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                Spacer()
                Text("20 Actes")
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            HStack(spacing: 0) {
                careerMetric(value: "51,4%", label: "Taux de victoire", color: Color(hex: 0x2DD4BF))
                Divider().frame(height: 56).overlay(Color.white.opacity(0.08))
                careerMetric(value: "432 / 840", label: "Victoires / Parties", color: Color(hex: 0x22C55E))
            }
        }
        .padding(16)
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
    }

    private func careerMetric(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 24, weight: .heavy).monospacedDigit())
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

struct VPIconView: View {
    var size: CGFloat = 14
    var color: Color = .white

    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(color.opacity(0.85), lineWidth: 1.2)
                .frame(width: size, height: size)
            Text("V")
                .font(.system(size: size * 0.58, weight: .black, design: .rounded))
                .foregroundStyle(color)
        }
    }
}

struct RPIconView: View {
    var size: CGFloat = 14
    var color: Color = .white

    var body: some View {
        ZStack {
            Circle()
                .strokeBorder(color.opacity(0.85), lineWidth: 1.2)
                .frame(width: size, height: size)
            Text("R")
                .font(.system(size: size * 0.58, weight: .black, design: .rounded))
                .foregroundStyle(color)
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

struct EvalDailyOfferCard: View {
    let offer: ValorantDailySkinOffer

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                SkinTierIconView(name: offer.tierIconName, color: Color(hex: offer.colorHex), size: 14)
                    .padding(14)

                HStack {
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color(hex: offer.colorHex))
                        .padding(14)
                }

                AsyncImage(url: URL(string: offer.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .interpolation(.high)
                            .scaledToFit()
                            .frame(maxWidth: .infinity, maxHeight: 86)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 10)
                    default:
                        Color.clear.frame(height: 86)
                    }
                }
            }

            HStack {
                Text(offer.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color(hex: offer.colorHex))
                    .lineLimit(2)

                Spacer()

                HStack(spacing: 5) {
                    Text("\(offer.price)")
                        .font(.system(size: 15, weight: .heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: offer.colorHex))

                    VPIconView(size: 14, color: Color(hex: offer.colorHex))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(Color(hex: offer.colorHex).opacity(0.12))
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(hex: offer.colorHex).opacity(0.35), lineWidth: 1)
        )
    }
}

struct EvalDailyOfferCard: View {
    let offer: ValorantDailySkinOffer

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                SkinTierIconView(name: offer.tierIconName, color: Color(hex: offer.colorHex), size: 14)
                    .padding(12)

                HStack {
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(hex: offer.colorHex))
                        .padding(12)
                }

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

struct EvalAccessoryBundleCard: View {
    let accessories: [ValorantAccessoryItem]
    let timerText: String?

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

                if let timerText, !timerText.isEmpty {
                    HStack(spacing: 4) {
                        Text(timerText)
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                        Image(systemName: "clock")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

struct SprayWheelView: View {
    let topSprayURL: String?
    let leftSprayURL: String?
    let rightSprayURL: String?
    let bottomSprayURL: String?

    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: 0x13151C))
                .overlay(Circle().strokeBorder(Color.white.opacity(0.18), lineWidth: 2))
                .shadow(color: Color.black.opacity(0.4), radius: 10)

            Circle()
                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1.5)
                .padding(26)

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

            ZStack {
                Circle()
                    .fill(Color(hex: 0x13151C))
                    .frame(width: 52, height: 52)
                Circle()
                    .strokeBorder(Color.white.opacity(0.35), lineWidth: 2)
                    .frame(width: 48, height: 48)
            }

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

struct EvalWalletBar: View {
    let wallet: ValorantWallet

    var body: some View {
        HStack(spacing: 24) {
            Spacer()

            HStack(spacing: 6) {
                Text("\(wallet.vp.formatted())")
                    .font(.system(size: 14, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)
                VPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.rp.formatted())")
                    .font(.system(size: 14, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)
                RPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.kc.formatted())")
                    .font(.system(size: 14, weight: .bold).monospacedDigit())
                    .foregroundStyle(.white)
                KCIconView(size: 14)
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color(hex: 0x161618).opacity(0.92), in: .capsule)
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
    }
}

struct EvalGroupRefreshWheel: View {
    var progress: Double
    var size: CGFloat = 18

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.12), lineWidth: 2.2)

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

struct EvalGameView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var groupExpanded = true
    @State private var contractsExpanded = true
    @State private var equipmentExpanded = true
    @State private var contractsSubtab = 0
    @State private var futureMissionsExpanded = false
    @State private var groupRefreshProgress: Double = 0.0
    @State private var showingBattlepassSheet = false
    @State private var showingMissionsSheet = false
    @State private var showingAccountSheet = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        Group {
            if store.isConfigured {
                gameContent
            } else {
                EvalLockedView(
                    title: "Non connecté",
                    message: "Vous devez vous connecter pour accéder à cela.",
                    onAddAccount: { showingAccountSheet = true }
                )
            }
        }
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

    private var gameContent: some View {
        ScrollView {
            VStack(spacing: 18) {
                topBar

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
                        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
                    } else {
                        Text("Il n'y a actuellement aucun groupe!")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
                    }
                }

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
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                        }
                        .buttonStyle(.plain)
                    }
                ) {
                    VStack(spacing: 12) {
                        HStack(spacing: 8) {
                            subtabPill(title: "Missions", index: 0)
                            subtabPill(title: "Passe de combat", index: 1)
                            subtabPill(title: "Compte", index: 2, hasChevron: true)
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
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                        }
                        .buttonStyle(.plain)
                    }
                ) {
                    VStack(spacing: 14) {
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

                        VStack(spacing: 0) {
                            equipNavRow(icon: "pencil", title: "Changer de titre", value: store.equipmentTitle.isEmpty ? nil : store.equipmentTitle)
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            equipNavRow(icon: "scope", title: "Équipement d'arme")
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            equipPrivacyRow
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            let appearanceVal: String? = (store.isConfigured && store.appearanceProfilesCount > 0) ? "\(store.appearanceProfilesCount)" : nil
                            equipNavRow(icon: "shippingbox.fill", title: "Profils d'apparences", value: appearanceVal)
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            let favoritesVal: String? = (store.isConfigured && store.favoritePresetsCount > 0) ? "\(store.favoritePresetsCount)" : nil
                            equipNavRow(icon: "folder.badge.star", title: "Préréglages des Favoris", value: favoritesVal)
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            equipNavRow(icon: "die.face.5.fill", title: "Aléatoire")
                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)
                            equipNavRow(icon: "square.and.arrow.up", title: "Partager")
                        }
                        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                        SprayWheelView(
                            topSprayURL: store.isConfigured ? store.equippedSprays[0] : nil,
                            leftSprayURL: store.isConfigured ? store.equippedSprays[1] : nil,
                            rightSprayURL: store.isConfigured ? store.equippedSprays[2] : nil,
                            bottomSprayURL: store.isConfigured ? store.equippedSprays[3] : nil
                        )
                    }
                }

                storeAndAccessoriesSection
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .task {
            await store.refreshGroup()
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 100_000_000)
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
    }

    private var topBar: some View {
        HStack {
            Spacer()
            Text("Jeu")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var storeAndAccessoriesSection: some View {
        VStack(spacing: 18) {
            NavigationLink {
                ValorantStoreView()
            } label: {
                HStack {
                    Text("Accessoires")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 6) {
                        Text("2j 3:50:45")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Offres quotidiennes")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 5) {
                        Text("3:50:46")
                            .font(.system(size: 14))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(.horizontal, 4)
                .padding(.top, 4)

                ForEach(store.storeOffers) { offer in
                    EvalDailyOfferCard(offer: offer)
                }
            }

            VStack(spacing: 0) {
                HStack {
                    Image(systemName: "heart")
                        .font(.system(size: 16))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                        .frame(width: 24)
                    Text("Liste de souhaits")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                    Text("\(store.wishlistCount)")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)

                Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                NavigationLink {
                    EvalPurchaseHistoryView()
                } label: {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                            .frame(width: 24)
                        Text("Historique de la boutique")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white)
                        Spacer()
                        Text("\(store.storeHistoryCount)")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
                .buttonStyle(.plain)
            }
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private var equipPrivacyRow: some View {
        HStack(spacing: 12) {
            Image(systemName: "hand.raised.fill")
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0xFD5B68))
                .frame(width: 24)

            Text("Paramètres de confidentialité")
                .font(.system(size: 16, weight: .medium))
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
            .foregroundStyle(Color(hex: 0x8E8E93))

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func equipNavRow(icon: String, title: String, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0xFD5B68))
                .frame(width: 24)

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white)

            Spacer()

            if let value {
                Text(value)
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func subtabPill(title: String, index: Int, hasChevron: Bool = false) -> some View {
        let isSelected = contractsSubtab == index
        return Button {
            contractsSubtab = index
        } label: {
            HStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 14, weight: isSelected ? .bold : .medium))
                    .foregroundStyle(isSelected ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))

                if hasChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(isSelected ? Color(hex: 0xFD5B68) : Color(hex: 0x8E8E93))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                isSelected ? Color(hex: 0xFD5B68).opacity(0.16) : Color(hex: 0x161618),
                in: .capsule
            )
            .overlay(
                Capsule().strokeBorder(isSelected ? Color(hex: 0xFD5B68).opacity(0.4) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
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
                    withAnimation(.snappy(duration: 0.28, extraBounce: 0.02)) {
                        isExpanded.wrappedValue.toggle()
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color(hex: 0xFD5B68))
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

    @ViewBuilder
    private var contractsMissionsView: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("Checkpoints journaliers")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 5) {
                        Text("5:53:50")
                            .font(.system(size: 14))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }

                HStack(spacing: 0) {
                    ForEach(0..<4) { i in
                        Circle()
                            .strokeBorder(Color.white.opacity(0.18), lineWidth: 2)
                            .background(Circle().fill(Color.white.opacity(0.06)))
                            .frame(width: 26, height: 26)
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.white.opacity(0.12), lineWidth: 1.5)
                                    .frame(width: 14, height: 14)
                            )

                        if i < 3 {
                            Rectangle()
                                .fill(Color.white.opacity(0.12))
                                .frame(height: 2)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Missions hebdomadaires")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 5) {
                        Text("1j 7:08:50")
                            .font(.system(size: 14))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }

                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 16))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Text("Vous avez terminé toutes les missions disponibles.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(.top, 2)
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

            Button {
                showingMissionsSheet = true
            } label: {
                HStack {
                    Text("\(max(30, store.upcomingMissions.count)) missions hebdomadaires futures")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.white)
                    Spacer()
                    HStack(spacing: 4) {
                        Text("+\(store.missionsReserveXP > 0 ? store.missionsReserveXP.formatted() : "689 100") XP")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(16)
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var contractsBattlepassView: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(store.battlepassTitle.isEmpty ? "V26 // ACTE VI" : store.battlepassTitle)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)

                        Text("Niveau \(store.battlepassCurrentLevel)")
                            .font(.system(size: 14))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }

                    Spacer()

                    Button {
                        showingBattlepassSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Text("Détails")
                                .font(.system(size: 14, weight: .semibold))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                    .buttonStyle(.plain)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.08)).frame(height: 6)
                        Capsule()
                            .fill(Color(hex: 0xFD5B68))
                            .frame(width: geo.size.width * CGFloat(min(1.0, max(0.0, Double(store.battlepassCurrentXP) / Double(max(1, store.battlepassLevelXP))))), height: 6)
                    }
                }
                .frame(height: 6)

                HStack {
                    Text("\(store.battlepassCurrentXP.formatted()) / \(store.battlepassLevelXP.formatted()) XP")
                        .font(.system(size: 12).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Spacer()
                    Text("\(store.battlepassCompletionPercent)% terminé")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                }
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    @ViewBuilder
    private var contractsAccountView: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Niveau de compte")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)

                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: 0xFD5B68).opacity(0.18))
                            .frame(width: 44, height: 44)
                        Image(systemName: "shield.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Niveau \(store.profile?.level ?? 480)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                        Text("Points d'expérience cumulés")
                            .font(.system(size: 13))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    Spacer()
                }
            }
            .padding(16)
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }
}

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

    private var progressRatio: CGFloat {
        guard store.battlepassLevelXP > 0 else { return 0 }
        let ratio = CGFloat(store.battlepassCurrentXP) / CGFloat(store.battlepassLevelXP)
        return max(0, min(1, ratio))
    }

    private var progressRing: some View {
        ZStack {
            Circle()
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 4)
                .frame(width: 52, height: 52)

            if store.isConfigured {
                Circle()
                    .trim(from: 0, to: CGFloat(store.battlepassCompletionPercent) / 100.0)
                    .stroke(Theme.danger, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 52, height: 52)
            }

            Text(store.battlepassLevels.isEmpty ? "—" : "\(store.battlepassCompletionPercent)%")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private var progressBar: some View {
        VStack(spacing: 6) {
            HStack {
                Text(store.battlepassLevels.isEmpty ? "Données indisponibles" : "Niveau actuel : \(store.battlepassCurrentLevel) / 55")
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
                        .frame(width: geo.size.width * progressRatio, height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    private var heroSummaryCard: some View {
        VStack(spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(store.battlepassTitle)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(.white)

                    if let endDate = store.battlepassEndDate {
                        Text("Prend fin dans \(store.daysRemainingInAct) jours • \(endDate.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                progressRing
            }

            progressBar
        }
        .padding(16)
        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        heroSummaryCard

                        if chapters.isEmpty {
                            ContentUnavailableView(
                                "Passe de combat indisponible",
                                systemImage: "sparkles",
                                description: Text("L’API n’a pas fourni les niveaux du passe pour ce compte.")
                            )
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                        } else {
                            LazyVStack(spacing: 16) {
                                ForEach(chapters, id: \.chapter) { chap in
                                    chapterSection(chapter: chap.chapter, levels: chap.levels)
                                }
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

                                if store.missionsReserveXP > 0 {
                                    Text("+\(store.missionsReserveXP.formatted()) XP")
                                        .font(.subheadline.weight(.heavy))
                                        .foregroundStyle(Theme.danger)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Theme.danger.opacity(0.18), in: .capsule)
                                }
                            }
                        }
                        .padding(16)
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(Color.white.opacity(0.08), lineWidth: 1))

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

struct EvalHubView: View {
    @Environment(AppModel.self) private var model

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        hubGroupSection(title: "Réseaux sociaux") {
                            NavigationLink {
                                EvalFriendsView()
                            } label: {
                                hubRowView(icon: "person.2", title: "Amis", badge: "24")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalPlayersSearchView()
                            } label: {
                                hubRowView(icon: "bookmark", title: "Signets", badge: "2")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalNameHistoryView()
                            } label: {
                                hubRowView(icon: "person.text.rectangle", title: "Historique des pseudos")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalLeaderboardView()
                            } label: {
                                hubRowView(icon: "trophy", title: "Classement")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalPurchaseHistoryView()
                            } label: {
                                hubRowView(icon: "creditcard", title: "Historique des achats")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalPlayerSettingsView()
                            } label: {
                                hubRowView(icon: "slider.horizontal.2.square", title: "Paramètres du joueur", badge: "1")
                            }
                            .buttonStyle(.plain)
                        }

                        hubGroupSection(title: "Progression") {
                            NavigationLink {
                                EvalSeasonGoalsView()
                            } label: {
                                hubRowView(icon: "target", title: "Objectifs de la saison")
                            }
                            .buttonStyle(.plain)
                        }

                        hubGroupSection(title: "Infos sur le jeu") {
                            NavigationLink {
                                EvalMapsView()
                            } label: {
                                hubRowView(icon: "map", title: "Cartes")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalAgentsView()
                            } label: {
                                hubRowView(icon: "person", title: "Agents")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                            NavigationLink {
                                EvalWeaponsView()
                            } label: {
                                hubRowView(icon: "scope", title: "Armes")
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 96)
                }
                .scrollIndicators(.hidden)
            }
        }
    }

    private var topBar: some View {
        HStack {
            Spacer()
            Text("Hub")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private func hubGroupSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 15))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .padding(.leading, 6)

            VStack(spacing: 0) {
                content()
            }
            .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        }
    }

    private func hubRowView(icon: String, title: String, badge: String? = nil) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0xFD5B68))
                .frame(width: 24)

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white)

            Spacer()

            if let badge {
                Text(badge)
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

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
                    friendsTopBar

                    if !store.isConfigured {
                        disconnectedConnectCard
                    } else if onlineFriends.isEmpty && offlineFriends.isEmpty {
                        emptyFriendsCard
                    } else {
                        VStack(spacing: 18) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Votre groupe — \(store.currentParty?.currentSize ?? 1)/\(store.currentParty?.maxSize ?? 5)")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .padding(.leading, 4)

                                myUserPartyCard
                            }

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
                    await store.refreshFriends()
                }
            }
            .navigationBarBackButtonHidden(true)
            .ethoneScreen()

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

    private var friendsTopBar: some View {
        HStack {
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

    private var myUserPartyCard: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                if let url = store.profile?.cardURL {
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

                Circle()
                    .fill(Color(hex: 0x22C55E))
                    .frame(width: 13, height: 13)
                    .overlay(Circle().strokeBorder(Color(hex: 0x161618), lineWidth: 2))
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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }
}

struct EvalFriendCard: View {
    let friend: ValorantFriend

    private func tierRingColor(tier: Int) -> Color {
        switch tier {
        case 24...27: return Color(hex: 0xF5D78E)
        case 21...23: return Color(hex: 0xEC4899)
        case 18...20: return Color(hex: 0x06B6D4)
        case 15...17: return Color(hex: 0x38BDF8)
        case 12...14: return Color(hex: 0xEAB308)
        case 9...11: return Color(hex: 0x94A3B8)
        case 6...8: return Color(hex: 0xB45309)
        default: return Color(hex: 0x64748B)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
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
                        Circle()
                            .fill(Color(hex: 0xFD4556))
                            .frame(width: 13, height: 13)
                            .overlay(Rectangle().fill(Color.white).frame(width: 6, height: 1.8))
                            .overlay(Circle().strokeBorder(Color(hex: 0x161618), lineWidth: 2))
                            .offset(x: 2, y: 2)
                    } else if friend.isOnline {
                        Circle()
                            .fill(Color(hex: 0x22C55E))
                            .frame(width: 13, height: 13)
                            .overlay(Circle().strokeBorder(Color(hex: 0x161618), lineWidth: 2))
                            .offset(x: 2, y: 2)
                    }
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 4) {
                        Text(friend.name)
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(.white)

                        Text("#\(friend.tag)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)

                        if friend.isPartyLeader {
                            Image(systemName: "crown")
                                .font(.system(size: 26, weight: .light))
                                .foregroundStyle(Color.white.opacity(0.12))
                                .padding(.leading, 4)
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
                            Text("\(mode) • \(map)")
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

                HStack(spacing: 8) {
                    Circle()
                        .fill(Color(hex: 0x141820))
                        .frame(width: 34, height: 34)
                        .overlay(
                            Circle().strokeBorder(tierRingColor(tier: friend.tierNumber), lineWidth: 1.5)
                        )
                        .overlay(
                            Group {
                                if let url = friend.rankIconURL {
                                    AsyncImage(url: url) { phase in
                                        if let image = phase.image {
                                            image.resizable().scaledToFit().padding(4)
                                        } else {
                                            Image(systemName: "rhombus.fill")
                                                .font(.system(size: 14))
                                                .foregroundStyle(tierRingColor(tier: friend.tierNumber))
                                        }
                                    }
                                } else {
                                    Image(systemName: "rhombus.fill")
                                        .font(.system(size: 14))
                                        .foregroundStyle(tierRingColor(tier: friend.tierNumber))
                                }
                            }
                        )

                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(14)

            if friend.otherPartyMembersCount > 0 {
                Divider()
                    .overlay(Color.white.opacity(0.06))
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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }
}

struct EvalOfflineFriendCard: View {
    let friend: ValorantFriend

    var body: some View {
        HStack(spacing: 12) {
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
        .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }
}

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

struct EvalFriendSettingsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var openProfileDirectly: Bool
    @Binding var sortOfflineByLastSeen: Bool

    var body: some View {
        VStack(spacing: 20) {
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

            VStack(spacing: 16) {
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

struct EvalFriendHistoryView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
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

                VStack(spacing: 0) {
                    ForEach(Array(store.friendHistory.enumerated()), id: \.element.id) { index, event in
                        HStack(spacing: 14) {
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

struct EvalFriendDetailSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let friend: ValorantFriend
    @State private var unavailableAction: String?

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
                actionRow(icon: "message.fill", title: "Envoyer un message", action: "La messagerie Riot n’est pas exposée par l’API connectée.")
                actionRow(icon: "person.crop.circle.badge.plus", title: "Inviter dans le groupe", action: "Les invitations de groupe ne sont pas exposées par l’API connectée.")
                actionRow(icon: "arrow.right.circle.fill", title: "Rejoindre le groupe", action: "La gestion des groupes n’est pas exposée par l’API connectée.")

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
        .alert("Action indisponible", isPresented: Binding(
            get: { unavailableAction != nil },
            set: { if !$0 { unavailableAction = nil } }
        )) {
            Button("OK", role: .cancel) { unavailableAction = nil }
        } message: {
            Text(unavailableAction ?? "")
        }
    }

    private func actionRow(icon: String, title: String, action: String) -> some View {
        Button {
            unavailableAction = action
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
                topBar

                VStack(alignment: .leading, spacing: 8) {
                    VStack(spacing: 0) {
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

                                Text("Compte principal")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                        }
                        .padding(16)

                        Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 68)

                        Button {
                            showingAccountSheet = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Color(hex: 0xFD5B68))
                                Text("Ajouter un compte")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundStyle(.white)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                            .padding(16)
                        }
                        .buttonStyle(.plain)
                    }
                    .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                    Text("Glissez vers la gauche sur un compte pour vous déconnecter et le retirer.")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.horizontal, 6)
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "desktopcomputer")
                            .font(.system(size: 18))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                        Text(selectedPlatform)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                        Spacer()
                        Button("Modifier") {
                            selectedPlatform = selectedPlatform == "PC" ? "Console" : "PC"
                        }
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color(hex: 0xFD5B68))
                    }
                    .padding(16)
                    .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                    Text("Sélectionnez la plateforme sur laquelle vous jouez. Vous pouvez consulter les données des autres plateformes en utilisant le sélecteur de plateforme sur n'importe quel profil.")
                        .font(.system(size: 13))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.horizontal, 6)
                }

                VStack(spacing: 0) {
                    HStack(spacing: 14) {
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                            .frame(width: 24)

                        Text("Gérer VALPAW+")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color(hex: 0xFD5B68))

                        Spacer()
                    }
                    .padding(16)

                    Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                    HStack(spacing: 14) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                            .frame(width: 24)

                        Text("Restaurer les achats")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color(hex: 0xFD5B68))

                        Spacer()
                    }
                    .padding(16)
                }
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                VStack(spacing: 0) {
                    NavigationLink {
                        SystemView()
                    } label: {
                        settingsNavRow(icon: "arrow.up.arrow.down", title: "Stockage et données")
                    }
                    .buttonStyle(.plain)

                    Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                    NavigationLink {
                        SystemView()
                    } label: {
                        settingsNavRow(icon: "slider.horizontal.2.square", title: "Paramètres avancés")
                    }
                    .buttonStyle(.plain)
                }
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "sun.max")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                            .frame(width: 24)
                        Text("Thème")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white)
                        Spacer()
                        Picker("Thème", selection: $selectedTheme) {
                            Text("Système").tag("Système")
                            Text("Sombre").tag("Sombre")
                            Text("Clair").tag("Clair")
                        }
                        .pickerStyle(.menu)
                        .tint(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                    Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                    NavigationLink {
                        AppearanceView()
                    } label: {
                        settingsNavRow(icon: "app.dashed", title: "Icône de l'app", detail: "Par défaut")
                    }
                    .buttonStyle(.plain)

                    Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                    NavigationLink {
                        AppearanceView()
                    } label: {
                        HStack {
                            Image(systemName: "square.and.pencil")
                                .font(.system(size: 16))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                                .frame(width: 24)
                            Text("Couleur d'accentuation")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(.white)
                            Spacer()
                            Circle()
                                .strokeBorder(Color(hex: 0xFD5B68), lineWidth: 3)
                                .background(Circle().fill(Color(hex: 0xFD5B68).opacity(0.4)))
                                .frame(width: 22, height: 22)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                    .buttonStyle(.plain)
                }
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))

                VStack(spacing: 0) {
                    HStack(spacing: 14) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0xFD5B68))
                            .frame(width: 24)
                        Text("À propos")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(.white)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 14)

                    Divider().overlay(Color.white.opacity(0.06)).padding(.leading, 54)

                    Link(destination: URL(string: "https://discord.gg/ethone")!) {
                        HStack(spacing: 14) {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(Color(hex: 0xFD5B68))
                                .frame(width: 24)
                            Text("Serveur Discord")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(.white)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                }
                .background(Color(hex: 0x161618), in: .rect(cornerRadius: 20))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .sheet(isPresented: $showingAccountSheet) {
            ValorantSettingsSheet()
        }
    }

    private var topBar: some View {
        HStack {
            Spacer()
            Text("Paramètres")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private func settingsNavRow(icon: String, title: String, detail: String? = nil) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0xFD5B68))
                .frame(width: 24)

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.white)

            Spacer()

            if let detail {
                Text(detail)
                    .font(.system(size: 15))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}
