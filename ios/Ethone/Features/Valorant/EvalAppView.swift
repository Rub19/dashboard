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
    var buttonTitle = "Ajouter un compte"
    var onAddAccount: (() -> Void)?

    var body: some View {
        VStack(spacing: 18) {
            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 46, weight: .medium))
                .foregroundStyle(.gray)

            Text(title)
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(EvalColors.text)

            Text(message)
                .font(.system(size: 22, weight: .regular))
                .foregroundStyle(.gray)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 340)

            if let onAddAccount {
                Button(action: onAddAccount) {
                    Label(buttonTitle, systemImage: "plus")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(Theme.danger, in: .capsule)
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(EvalColors.background)
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
                        .foregroundStyle(EvalColors.text)
                    Text(":")
                        .font(.system(size: size * 0.48, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(hex: 0xA855F7))
                    Text("VAL")
                        .font(.system(size: size * 0.48, weight: .black, design: .monospaced))
                        .foregroundStyle(EvalColors.text)
                }
                .tracking(2)
            }
        }
    }
}

struct EvalAppView: View {
    @Environment(AppModel.self) private var model

    @State private var selectedTab: EvalTab = .profile
    @State private var selectedMatch: ValorantMatch?
    @AppStorage(EvalAccent.key) private var accentHex = Int(EvalAccent.defaultHex)

    private var store: ValorantStore { model.valorant }

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab(EvalTab.game.rawValue, systemImage: EvalTab.game.icon, value: EvalTab.game) {
                NavigationStack {
                    EvalGameView()
                        .safeAreaInset(edge: .bottom) {
                            if store.riot.isLinked {
                                EvalWalletBar(wallet: store.wallet).padding(.horizontal, 16).padding(.bottom, 6)
                            }
                        }
                        .evalRoot()
                }
            }
            Tab(EvalTab.profile.rawValue, systemImage: EvalTab.profile.icon, value: EvalTab.profile) {
                NavigationStack {
                    EvalProfileView(selectedMatch: $selectedMatch)
                        .evalRoot()
                        .navigationDestination(item: $selectedMatch) { match in
                            ValorantMatchDetailView(match: match)
                        }
                }
            }
            Tab(EvalTab.hub.rawValue, systemImage: EvalTab.hub.icon, value: EvalTab.hub) {
                NavigationStack { EvalHubView().evalRoot() }
            }
            Tab(EvalTab.settings.rawValue, systemImage: EvalTab.settings.icon, value: EvalTab.settings) {
                NavigationStack { EvalSettingsView().evalRoot() }
            }
        }
        .tint(Color(hex: UInt32(truncatingIfNeeded: accentHex)))
        .id(accentHex)
        .tabBarMinimizeBehavior(.onScrollDown)
        .sensoryFeedback(.selection, trigger: selectedTab)
        .dynamicTypeSize(.xLarge)
        .evalColorScheme()
        .onAppear {
            let saved = UserDefaults.standard.string(forKey: EvalPlatform.key) ?? ""
            store.leaderboardPlatform = (EvalPlatform(rawValue: saved) ?? .pc).apiValue
        }
    }
}

private extension View {
    /// Racine d'un onglet E:VAL : en-tête maison, et glisser depuis le bord gauche ramène à Ethone.
    func evalRoot() -> some View {
        modifier(EvalRootModifier())
    }
}

private struct EvalRootModifier: ViewModifier {
    @Environment(AppModel.self) private var model

    func body(content: Content) -> some View {
        content
            .toolbar(.hidden, for: .navigationBar)
            .background(EvalColors.background.ignoresSafeArea())
            .containerBackground(EvalColors.background, for: .navigation)
            .overlay(alignment: .leading) {
                Color.clear
                    .frame(width: 22)
                    .contentShape(.rect)
                    .gesture(DragGesture(minimumDistance: 15).onEnded { value in
                        if value.translation.width > 70 { model.evalPresented = false }
                    })
            }
    }
}

/// Point d'entrée d'E:VAL dans Ethone (grille Plus, onglet épinglé, liens) : ouvre l'app plein écran.
struct EvalLauncherView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.isPresented) private var isPushed
    @State private var opened = false

    var body: some View {
        ContentUnavailableView {
            Label("E:VAL", systemImage: "scope")
        } description: {
            Text("Le tracker VALORANT s’ouvre en plein écran. Revenez à Ethone depuis ses Paramètres ou en glissant depuis le bord gauche.")
        } actions: {
            Button("Ouvrir E:VAL") { model.evalPresented = true }
                .buttonStyle(.glassProminent)
        }
        .onAppear {
            guard !opened else { return }
            opened = true
            model.evalPresented = true
        }
        .onDisappear { opened = false }
        .onChange(of: model.evalPresented) { _, shown in
            guard !shown else { return }
            if isPushed { dismiss() } else { model.requestedSelection = AppTab.home.rawValue }
        }
    }
}

struct EvalProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedMatch: ValorantMatch?

    @State private var showingRiotLogin = false
    @State private var showingAccountSheet = false
    @State private var showingSessionRecap = false
    @AppStorage("eval.autoSyncMatches") private var autoSync = true

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
        var session: [ValorantMatch] = []
        for match in store.matches {
            guard let start = match.startedAt else { break }
            if let last = session.last?.startedAt, last.timeIntervalSince(start) > 3 * 3600 { break }
            session.append(match)
        }
        return session
    }

    private var sessionDayText: String {
        guard let date = recentSessionMatches.first?.startedAt else { return "" }
        if Calendar.current.isDateInToday(date) { return "Aujourd’hui" }
        if Calendar.current.isDateInYesterday(date) { return "Hier" }
        return date.formatted(.dateTime.day().month(.wide).locale(Locale(identifier: "fr_FR")))
    }

    /// Bilan de l'acte en cours (MMR HenrikDev) pour la carte « Résumé de carrière ».
    private var currentActSeason: EvalMMR.Season? {
        guard let act = store.currentAct else { return nil }
        return store.mmr.seasons.first { $0.season.lowercased() == act.id.lowercased() }
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
        return "\(wins)V – \(recentSessionMatches.count - wins)D"
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
                    onAddAccount: { showingRiotLogin = true }
                )
            }
        }
        .sheet(isPresented: $showingRiotLogin) { EvalRiotLoginSheet() }
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
            await ValorantAssets.shared.load()
            if store.isConfigured && autoSync {
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
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(EvalAccent.color)
                    .frame(width: 51, height: 51)
                    .background(EvalColors.card, in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()

            Text(profile?.handle.split(separator: "#").first.map(String.init) ?? (store.playerName.isEmpty ? "Profil" : store.playerName))
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            Button {
                showingAccountSheet = true
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "line.3.horizontal")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(EvalAccent.color)
                    Image(systemName: "ellipsis")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                }
                .padding(.horizontal, 16)
                .frame(height: 44)
                .background(EvalColors.card, in: .capsule)
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 4)
    }

    private var disconnectedProfileCard: some View {
        VStack(spacing: 18) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.system(size: 51))
                .foregroundStyle(Theme.danger)

            VStack(spacing: 6) {
                Text("Connexion Riot requise")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(EvalColors.text)

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
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var emptyMatchesCard: some View {
        ContentUnavailableView(
            "Aucune partie synchronisée",
            systemImage: "clock.arrow.circlepath",
            description: Text("L’historique de ce compte n’est pas encore disponible dans l’API.")
        )
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func mainProfileCard(profile: ValorantProfile) -> some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: 0) {
                    Text(profile.handle.split(separator: "#").first.map(String.init) ?? profile.handle)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                    if let tag = profile.handle.split(separator: "#").dropFirst().first {
                        Text("#\(tag)")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                Spacer()
                Text(store.equipmentTitle)
                    .font(.system(size: 16, weight: .medium, design: .monospaced))
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
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                                .tracking(0.6)
                        }

                        ZStack {
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [Color(hex: EvalRanks.color(profile.tier)).opacity(0.25), .clear],
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
                                        image.resizable().scaledToFit().frame(width: 60, height: 60)
                                    default:
                                        ProgressView().tint(.secondary)
                                    }
                                }
                            }
                        }

                        Text(profile.rank.isEmpty ? "RANG INDISPONIBLE" : profile.rank.uppercased())
                            .font(.system(size: 18, weight: .heavy))
                            .foregroundStyle(Color(hex: EvalRanks.color(profile.tier)))

                        if profile.rr > 0 {
                            Text("\(profile.rr) SC")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }

                        if let leaderboardRank = profile.leaderboardRank {
                            Text("Rang \(leaderboardRank)")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(EvalColors.text)
                                .padding(.horizontal, 18)
                                .padding(.vertical, 7)
                                .foregroundStyle(profile.tier == 27 ? Color.black.opacity(0.8) : .white)
                                .background(Color(hex: EvalRanks.color(profile.tier)), in: .capsule)
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
                            if !store.actName(store.mmr.peakSeason).isEmpty {
                                Text(store.actName(store.mmr.peakSeason))
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                                    .tracking(0.6)
                            }

                            ZStack {
                                if let peakIconURL = ValorantProfile.tierIcon(profile.peakTier) {
                                    AsyncImage(url: peakIconURL) { phase in
                                        switch phase {
                                        case .success(let image):
                                            image.resizable().scaledToFit().frame(width: 60, height: 60)
                                        default:
                                            ProgressView().tint(.secondary)
                                        }
                                    }
                                }
                            }
                            .frame(height: 76)

                            Text(profile.peakRank.isEmpty ? "RANG INDISPONIBLE" : profile.peakRank.uppercased())
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundStyle(Color(hex: EvalRanks.color(profile.peakTier)))

                            Text("Plus haut rang atteint")
                                .font(.system(size: 15))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                            .padding(.trailing, 4)
                    }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
            }
            .padding(16)
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var championsGradientBanner: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(
                colors: [Color(hex: 0x1E2436), Color(hex: 0x0E111A)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Image(systemName: "sparkles")
                .font(.system(size: 83))
                .foregroundStyle(Color(hex: 0xF5D78E).opacity(0.12))
                .offset(x: 180, y: -10)
        }
    }

    private func careerSummaryCard(profile: ValorantProfile) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Résumé de carrière")
                    .font(.system(size: 21, weight: .bold))
                    .foregroundStyle(EvalColors.text)
                Spacer()
                NavigationLink {
                    EvalCareerSummaryView(profile: profile, matches: store.matches)
                } label: {
                    HStack(spacing: 4) {
                        Text("\(store.mmr.seasons.count) \(store.mmr.seasons.count > 1 ? "Actes" : "Acte")")
                            .font(.system(size: 17, weight: .medium))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .buttonStyle(.plain)
            }

            if !profile.actName.isEmpty {
                HStack {
                    Spacer()
                    Text(profile.actName)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .tracking(0.6)
                    Spacer()
                }
            }

            if let season = currentActSeason {
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(season.winRate.formatted(.percent.precision(.fractionLength(1)).locale(Locale(identifier: "fr_FR"))))
                        .font(.system(size: 28, weight: .heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("Taux de victoire")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Text("\(season.wins)")
                            .font(.system(size: 28, weight: .heavy).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x22C55E))
                        Text("/ \(season.games)")
                            .font(.system(size: 28, weight: .heavy).monospacedDigit())
                            .foregroundStyle(EvalColors.text)
                    }
                    Text("Victoires / Parties")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
            }

            // Trois derniers actes classés réels (MMR HenrikDev), rien si aucun.
            let recentActs = Array(store.mmr.seasons.suffix(3).reversed())
            if !recentActs.isEmpty {
                HStack(spacing: 12) {
                    ForEach(recentActs) { season in
                        actBadge(name: store.actName(season.season).isEmpty ? season.short.uppercased() : store.actName(season.season),
                                 icon: "circle.fill",
                                 color: season.winRate >= 0.5 ? Color(hex: 0x22C55E) : EvalAccent.color,
                                 tier: season.endTier)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func actBadge(name: String, icon: String, color: Color, tier: Int? = nil) -> some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.18))
                    .frame(width: 55, height: 55)

                if let tier, let url = ValorantProfile.tierIcon(tier) {
                    AsyncImage(url: url) { phase in
                        if let img = phase.image {
                            img.resizable().scaledToFit().frame(width: 32, height: 32)
                        } else {
                            Image(systemName: icon)
                                .font(.system(size: 23))
                                .foregroundStyle(color)
                        }
                    }
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 23))
                        .foregroundStyle(color)
                }
            }
            Text(name)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .frame(maxWidth: .infinity)
    }

    private var sessionRecapRow: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 14) {
                Image(systemName: "archivebox.fill")
                    .font(.system(size: 23))
                    .foregroundStyle(EvalAccent.color)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Récap de session")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(EvalColors.text)

                    Text("\(sessionDayText)\n\(recentSessionMatches.count) \(recentSessionMatches.count > 1 ? "parties" : "partie") · \(sessionDeltaText)")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(EvalColors.card, in: .rect(cornerRadius: 20))
            .contentShape(.rect)
            .onTapGesture { if !recentSessionMatches.isEmpty { showingSessionRecap = true } }
            .sheet(isPresented: $showingSessionRecap) {
                EvalSessionRecapSheet(matches: recentSessionMatches.compactMap { store.evalMatches[$0.id] }, puuid: store.puuid)
                    .presentationDragIndicator(.visible)
            }

            NavigationLink {
                EvalStatisticsView()
            } label: {
                VStack(alignment: .leading, spacing: 14) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 23))
                        .foregroundStyle(EvalAccent.color)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Voir les statistiques")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(EvalColors.text)

                        Text("Win rate, K/D & more")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(EvalColors.card, in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)
        }
    }

    private var matchesListSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Matchs")
                .font(.system(size: 21, weight: .bold))
                .foregroundStyle(EvalColors.text)
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
                    .font(.system(size: 17))
                    .foregroundStyle(.white.opacity(0.8))
                Image(systemName: "desktopcomputer")
                    .font(.system(size: 17))
                    .foregroundStyle(.white.opacity(0.8))
                Text(Self.modeName(match.mode))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(EvalColors.text)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)

            HStack {
                if let startedAt = match.startedAt {
                    Text(startedAt.formatted(.dateTime.day().month(.twoDigits).year(.twoDigits).hour().minute()).replacingOccurrences(of: "/", with: "/").replacingOccurrences(of: " ", with: " · "))
                        .font(.system(size: 14))
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
                    if let agentURL = Self.portraitURL(match.myPlayer?.agentIconURL) {
                        AsyncImage(url: agentURL) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 96, height: 82, alignment: .top)
                                    .clipped()
                            } else {
                                Color.clear.frame(width: 82, height: 82)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text(match.agent)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(EvalColors.text)

                        HStack(spacing: 6) {
                            Text(match.map)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.black.opacity(0.6), in: .capsule)

                            if let mvp = Self.mvpLabel(match) {
                                Text(mvp)
                                    .font(.system(size: 13, weight: .bold))
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
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundStyle(EvalColors.text)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(match.won ? Color(hex: 0x35B86B) : EvalAccent.color, in: .capsule)
                        .padding(.trailing, 14)
                }
            }
            .frame(height: 82)
            .clipped()

            HStack(spacing: 0) {
                Label("\(match.kills) / \(match.deaths) / \(match.assists)", systemImage: "scope")
                    .font(.system(size: 16, weight: .medium).monospacedDigit())
                Spacer()
                Label(match.scoreValue.map(String.init) ?? "—", systemImage: "chart.bar.fill")
                    .font(.system(size: 16, weight: .medium).monospacedDigit())
                Spacer()
                HStack(spacing: 6) {
                    if let change = store.mmr.history.first(where: { $0.match.lowercased() == match.id.lowercased() })?.change {
                        Text(change >= 0 ? "+\(change)" : "\(change)")
                            .font(.system(size: 15, weight: .bold).monospacedDigit())
                            .foregroundStyle(change >= 0 ? Color(hex: 0x35C26B) : EvalAccent.color)
                    }
                    Label("\(match.teamRounds) — \(match.opponentRounds)", systemImage: "flag.checkered")
                        .font(.system(size: 16, weight: .medium).monospacedDigit())
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
            .foregroundStyle(EvalColors.text)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    static func modeName(_ mode: String) -> String {
        switch mode.lowercased() {
        case "competitive": return "Compétition"
        case "unrated": return "Non classé"
        case "swiftplay": return "Vélocité"
        case "deathmatch": return "Combat à mort"
        case "team deathmatch": return "Combat à mort par équipe"
        case "spike rush": return "Spike Rush"
        case "premier": return "Premier"
        case "": return "Partie"
        default: return mode
        }
    }

    /// Portrait en buste de l'agent (même UUID que l'icône renvoyée pour le match).
    static func portraitURL(_ icon: URL?) -> URL? {
        guard let icon, icon.pathComponents.count >= 3 else { return icon }
        let uuid = icon.pathComponents[icon.pathComponents.count - 2]
        return URL(string: "https://media.valorant-api.com/agents/\(uuid)/fullportrait.png")
    }

    /// MVP réel : meilleur ACS du match, sinon de l'équipe.
    static func mvpLabel(_ match: ValorantMatch) -> String? {
        guard let me = match.myPlayer, match.players.count > 1 else { return nil }
        if match.players.allSatisfy({ $0.score <= me.score }) { return "MVP du match" }
        if match.myTeamPlayers.allSatisfy({ $0.score <= me.score }) { return "MVP d’équipe" }
        return nil
    }

    private func mapSplashBanner(for mapName: String) -> some View {
        AsyncImage(url: ValorantAssets.shared.splashes[mapName.lowercased()]) { phase in
            if let img = phase.image {
                img.resizable().scaledToFill().frame(maxWidth: .infinity).frame(height: 82).clipped()
            } else {
                Color(hex: 0x1F222A).frame(height: 82)
            }
        }
    }
}

struct EvalCareerSummaryView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    let profile: ValorantProfile
    let matches: [ValorantMatch]

    @State private var selectedQueue = "Compétition"
    @State private var showPeak = false

    private var store: ValorantStore { model.valorant }
    private var mmr: EvalMMR { store.mmr }
    private static let competitive = "Compétition"

    /// Compétition (MMR HenrikDev) + chaque autre mode présent dans les matchs sauvegardés.
    private var queues: [String] {
        var seen: [String] = [Self.competitive]
        for match in matches {
            let mode = Self.queueName(match.mode)
            if !mode.isEmpty, !seen.contains(mode) { seen.append(mode) }
        }
        return seen
    }

    private static func queueName(_ mode: String) -> String {
        switch mode.lowercased() {
        case "competitive": return competitive
        case "unrated": return "Non classé"
        case "deathmatch": return "Combat à mort"
        case "team deathmatch": return "Combat à mort par équipe"
        case "swiftplay": return "Vélocité"
        case "spike rush": return "Spike Rush"
        case "premier": return "Premier"
        default: return mode
        }
    }

    private var queueMatches: [ValorantMatch] { matches.filter { Self.queueName($0.mode) == selectedQueue } }

    private var currentSeason: EvalMMR.Season? {
        guard let act = store.currentAct else { return nil }
        return mmr.seasons.first { $0.season.lowercased() == act.id.lowercased() }
    }

    private var previousSeasons: [EvalMMR.Season] {
        mmr.seasons.filter { $0.season.lowercased() != store.currentAct?.id.lowercased() }.reversed()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                header
                queueSelector
                if selectedQueue == Self.competitive {
                    actHeader
                    if mmr.tier > 0 || currentSeason != nil {
                        rankAndPerformanceCard
                    } else {
                        emptyCard("Ce joueur n’a joué aucune partie classée pendant \(profile.actName.isEmpty ? "cet acte" : profile.actName).")
                    }
                    if !mmr.seasons.isEmpty { allTimeCard }
                    if !previousSeasons.isEmpty { previousActsCard }
                } else if queueMatches.isEmpty {
                    emptyCard("Aucune partie de ce mode dans l’historique enregistré.")
                } else {
                    recentQueueCard
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .navigationBarBackButtonHidden(true)
        .ethoneScreen()
        .sheet(isPresented: $showPeak) {
            VStack(spacing: 16) {
                tierImage(mmr.peakTier, size: 160)
                Text("Pic : \(EvalRanks.name(mmr.peakTier))").font(.title3.bold())
                if !store.actName(mmr.peakSeason).isEmpty {
                    Text(store.actName(mmr.peakSeason)).foregroundStyle(.secondary)
                }
            }
            .presentationDetents([.medium])
        }
    }

    private var header: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(EvalColors.text)
                    .frame(width: 51, height: 51)
                    .background(EvalColors.card, in: .circle)
            }
            .buttonStyle(.plain)
            Spacer()
            Text("Résumé de carrière").font(.headline.weight(.bold)).foregroundStyle(EvalColors.text)
            Spacer()
            Color.clear.frame(width: 51, height: 51)
        }
        .padding(.top, 4)
    }

    private var queueSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(queues, id: \.self) { queue in
                    let selected = selectedQueue == queue
                    Button {
                        withAnimation(Motion.snap) { selectedQueue = queue }
                    } label: {
                        Text(queue)
                            .font(.system(size: 17, weight: selected ? .bold : .medium))
                            .foregroundStyle(selected ? EvalAccent.color : Color(hex: 0x8E8E93))
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(selected ? EvalColors.card2 : .clear, in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var actHeader: some View {
        HStack {
            Text(profile.actName.isEmpty ? "Acte en cours" : profile.actName)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(EvalColors.text)
            Spacer()
            Text("Actuel").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(18)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func emptyCard(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "desktopcomputer").font(.system(size: 46)).foregroundStyle(Color(hex: 0x8E8E93))
            Text("Aucune partie jouée").font(.system(size: 20, weight: .bold)).foregroundStyle(EvalColors.text)
            Text(message)
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .padding(.horizontal, 16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func tierImage(_ tier: Int, size: CGFloat) -> some View {
        AsyncImage(url: ValorantProfile.tierIcon(tier)) { phase in
            if let image = phase.image { image.resizable().scaledToFit() } else { Color.clear }
        }
        .frame(width: size, height: size)
    }

    private var rankAndPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Rang").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: 0x8E8E93))
            HStack(spacing: 0) {
                VStack(spacing: 8) {
                    tierImage(mmr.tier, size: 96)
                    Text(EvalRanks.name(mmr.tier).uppercased())
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(Color(hex: EvalRanks.color(mmr.tier)))
                    Text("\(mmr.rr) SC").font(.system(size: 17, weight: .semibold)).foregroundStyle(EvalColors.text)
                    if mmr.leaderboardRank > 0 {
                        Text("Rang \(mmr.leaderboardRank)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 7)
                            .background(Color(hex: EvalRanks.color(mmr.tier)).opacity(0.75), in: .capsule)
                            .overlay(Capsule().strokeBorder(Color(hex: EvalRanks.color(mmr.tier)), lineWidth: 1.5))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)

                Divider().frame(height: 120).overlay(EvalColors.text.opacity(0.08))

                Button { showPeak = true } label: {
                    VStack(spacing: 10) {
                        tierImage(mmr.peakTier, size: 96)
                        Text("Appuyer pour agrandir").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                .disabled(mmr.peakTier == 0)
            }
            .background(Color(hex: 0x222226), in: .rect(cornerRadius: 18))

            if let season = currentSeason {
                Text("Performance").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: 0x8E8E93))
                ratioCard(wins: season.wins, total: season.games)
            }
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var allTimeCard: some View {
        let wins = mmr.seasons.reduce(0) { $0 + $1.wins }
        let games = mmr.seasons.reduce(0) { $0 + $1.games }
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Statistiques de tous les temps").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: 0x8E8E93))
                Spacer()
                Text("\(mmr.seasons.count) \(mmr.seasons.count > 1 ? "Actes" : "Acte")").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            ratioCard(wins: wins, total: games)
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var previousActsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Actes précédents").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: 0x8E8E93))
                Spacer()
                Text("\(previousSeasons.count)").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            VStack(spacing: 8) {
                ForEach(previousSeasons) { season in
                    HStack(spacing: 12) {
                        tierImage(season.endTier, size: 32)
                        Text(store.actName(season.season).isEmpty ? season.short.uppercased() : store.actName(season.season))
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Text(percent(season.winRate))
                            .font(.system(size: 17, weight: .bold).monospacedDigit())
                            .foregroundStyle(season.winRate >= 0.5 ? Color(hex: 0x35C26B) : .white)
                        Text("\(season.wins)/\(season.games)")
                            .font(.system(size: 15).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(hex: 0x222226), in: .rect(cornerRadius: 14))
                }
            }
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private var recentQueueCard: some View {
        let wins = queueMatches.filter(\.won).count
        return VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Parties enregistrées").font(.system(size: 18, weight: .bold)).foregroundStyle(Color(hex: 0x8E8E93))
                Spacer()
                Text("\(queueMatches.count)").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            ratioCard(wins: wins, total: queueMatches.count)
        }
        .padding(16)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
    }

    private func percent(_ value: Double) -> String {
        value.formatted(.percent.precision(.fractionLength(1)).locale(Locale(identifier: "fr_FR")))
    }

    private func ratioCard(wins: Int, total: Int) -> some View {
        let rate = total == 0 ? 0 : Double(wins) / Double(total)
        let color = rate >= 0.5 ? Color(hex: 0x35C26B) : EvalAccent.color
        return HStack(spacing: 0) {
            VStack(spacing: 4) {
                Text(percent(rate)).font(.system(size: 30, weight: .heavy).monospacedDigit()).foregroundStyle(color)
                Text("Taux de victoire").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            .frame(maxWidth: .infinity)
            Divider().frame(height: 56).overlay(EvalColors.text.opacity(0.08))
            VStack(spacing: 4) {
                HStack(spacing: 0) {
                    Text("\(wins)").foregroundStyle(color)
                    Text(" / \(total)").foregroundStyle(EvalColors.text)
                }
                .font(.system(size: 30, weight: .heavy).monospacedDigit())
                Text("Victoires / Parties").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.vertical, 18)
        .background(Color(hex: 0x222226), in: .rect(cornerRadius: 18))
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
    var wished = false

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topLeading) {
                SkinTierIconView(name: offer.tierIconName, color: Color(hex: offer.colorHex), size: 14)
                    .padding(14)

                HStack {
                    Spacer()
                    if wished {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(EvalAccent.color)
                    }
                    Image(systemName: "chevron.right")
                        .font(.system(size: 15, weight: .semibold))
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
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(Color(hex: offer.colorHex))
                    .lineLimit(2)

                Spacer()

                HStack(spacing: 5) {
                    Text("\(offer.price)")
                        .font(.system(size: 17, weight: .heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: offer.colorHex))

                    VPIconView(size: 14, color: Color(hex: offer.colorHex))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(Color(hex: offer.colorHex).opacity(0.12))
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color(hex: offer.colorHex).opacity(0.35), lineWidth: 1)
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
                        .fill(EvalColors.text.opacity(0.85))
                        .frame(width: 39, height: 39)
                        .overlay(Image(systemName: "checkmark").font(.system(size: 18, weight: .bold)).foregroundStyle(Color.black))
                }
            }
            .clipShape(.rect(cornerRadius: Theme.cardRadius))

            if let description = bundle.description {
                VStack(alignment: .leading, spacing: 6) {
                    Text(bundle.name)
                        .font(.title3.weight(.heavy))
                        .foregroundStyle(EvalColors.text)

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
                                    .foregroundStyle(EvalColors.text)
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
                    .foregroundStyle(EvalColors.text)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.bottom, 4)
            }
        }
        .padding(bundle.description != nil ? 12 : 0)
        .background(bundle.description != nil ? EvalColors.text.opacity(0.03) : Color.clear)
        .clipShape(.rect(cornerRadius: Theme.cardRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cardRadius)
                .strokeBorder(EvalColors.text.opacity(bundle.description != nil ? 0.08 : 0), lineWidth: 1)
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
                            .fill(EvalColors.text.opacity(0.06))
                            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(EvalColors.text.opacity(0.12)))

                        if item.imageURL.isEmpty {
                            EvalTitleBadge(size: 46)
                        } else {
                            AsyncImage(url: URL(string: item.imageURL)) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().interpolation(.high).scaledToFit().frame(width: 46, height: 46)
                                default:
                                    Color.clear
                                }
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
                    .foregroundStyle(EvalColors.text)

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
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))
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
                .overlay(Circle().strokeBorder(EvalColors.text.opacity(0.18), lineWidth: 2))
                .shadow(color: Color.black.opacity(0.4), radius: 10)

            Circle()
                .strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1.5)
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
                .stroke(EvalColors.text.opacity(0.22), lineWidth: 1.5)
            }

            ZStack {
                Circle()
                    .fill(Color(hex: 0x13151C))
                    .frame(width: 60, height: 60)
                Circle()
                    .strokeBorder(EvalColors.text.opacity(0.35), lineWidth: 2)
                    .frame(width: 55, height: 55)
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
                    .font(.system(size: 17, weight: .light))
                    .foregroundStyle(EvalColors.text.opacity(0.18))
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
                    .font(.system(size: 16, weight: .bold).monospacedDigit())
                    .foregroundStyle(EvalColors.text)
                VPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.rp.formatted())")
                    .font(.system(size: 16, weight: .bold).monospacedDigit())
                    .foregroundStyle(EvalColors.text)
                RPIconView(size: 14)
            }

            HStack(spacing: 6) {
                Text("\(wallet.kc.formatted())")
                    .font(.system(size: 16, weight: .bold).monospacedDigit())
                    .foregroundStyle(EvalColors.text)
                KCIconView(size: 14)
            }

            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(EvalColors.card.opacity(0.92), in: .capsule)
        .overlay(Capsule().strokeBorder(EvalColors.text.opacity(0.12), lineWidth: 1))
    }
}

struct EvalGroupRefreshWheel: View {
    var progress: Double
    var size: CGFloat = 18

    var body: some View {
        ZStack {
            Circle()
                .stroke(EvalColors.text.opacity(0.12), lineWidth: 2.2)

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
    @State private var showingRiotLogin = false
    @State private var confirmRandom = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        Group {
            if store.riot.isLinked {
                gameContent
            } else {
                EvalLockedView(
                    title: "Compte Riot non connecté",
                    message: store.isConfigured
                        ? "Votre profil \(store.profile?.handle ?? "") est bien suivi. La boutique, le portefeuille et l’équipement demandent en plus une connexion à votre compte Riot."
                        : "Connectez votre compte Riot pour voir votre boutique, votre portefeuille, votre équipement et votre groupe.",
                    buttonTitle: "Connecter mon compte Riot",
                    onAddAccount: { showingRiotLogin = true }
                )
            }
        }
        .sheet(isPresented: $showingRiotLogin) { EvalRiotLoginSheet() }
        .task { await store.refreshRiot() }
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
                    EvalPartyCard()
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
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(EvalAccent.color)
                        }
                        .buttonStyle(.plain)
                    }
                ) {
                    VStack(spacing: 12) {
                        ScrollView(.horizontal) {
                            HStack(spacing: 8) {
                                subtabPill(title: "Missions", index: 0)
                                subtabPill(title: "Passe de combat", index: 1)
                                subtabPill(title: "Compte", index: 2)
                                subtabPill(title: "Agents", index: 3)
                            }
                        }
                        .scrollIndicators(.hidden)

                        switch contractsSubtab {
                        case 0:
                            contractsMissionsView
                        case 1:
                            EvalBattlepassContractView()
                        case 2:
                            EvalAccountXPView()
                        default:
                            EvalAgentContractsSummary()
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
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(EvalAccent.color)
                        }
                        .buttonStyle(.plain)
                    }
                ) {
                    VStack(spacing: 14) {
                        if store.isConfigured && !store.equipmentBannerURL.isEmpty {
                            NavigationLink { EvalCardPickerView() } label: {
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
                                        EvalColors.card.frame(height: 104)
                                    }
                                }
                                .clipShape(.rect(cornerRadius: 16))

                                Circle()
                                    .fill(EvalColors.text.opacity(0.92))
                                    .frame(width: 32, height: 32)
                                    .overlay(
                                        Image(systemName: "pencil")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(Color.black)
                                    )
                                    .padding(10)
                            }
                            }
                            .buttonStyle(.plain)
                        }

                        VStack(spacing: 0) {
                            NavigationLink { EvalTitlePickerView() } label: {
                                equipNavRow(icon: "pencil", title: "Changer de titre", value: store.equipmentTitle.isEmpty ? nil : store.equipmentTitle).contentShape(.rect)
                            }.buttonStyle(.plain)
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)
                            NavigationLink { EvalWeaponLoadoutView() } label: {
                                equipNavRow(icon: "scope", title: "Équipement d'arme").contentShape(.rect)
                            }.buttonStyle(.plain)
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)
                            NavigationLink { EvalPrivacySettingsView() } label: { equipPrivacyRow.contentShape(.rect) }.buttonStyle(.plain)
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)
                            let appearanceVal: String? = store.appearanceProfilesCount > 0 ? "\(store.appearanceProfilesCount)" : nil
                            NavigationLink { EvalAppearanceProfilesView() } label: {
                                equipNavRow(icon: "shippingbox.fill", title: "Profils d'apparences", value: appearanceVal).contentShape(.rect)
                            }.buttonStyle(.plain)
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)
                            Button { confirmRandom = true } label: {
                                equipNavRow(icon: "die.face.5.fill", title: store.loadout.isSaving ? "Application…" : "Aléatoire").contentShape(.rect)
                            }.buttonStyle(.plain)
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)
                            ShareLink(item: store.loadout.shareText.isEmpty ? "Mon équipement VALORANT" : store.loadout.shareText) {
                                equipNavRow(icon: "square.and.arrow.up", title: "Partager").contentShape(.rect)
                            }.buttonStyle(.plain)
                        }
                        .background(EvalColors.card, in: .rect(cornerRadius: 20))
                        .task { await store.loadout.load(store.riot) }
                        .confirmationDialog("Équiper un skin possédé au hasard sur chaque arme ?", isPresented: $confirmRandom, titleVisibility: .visible) {
                            Button("Équiper au hasard") {
                                Task {
                                    await store.loadout.load(store.riot)
                                    store.loadout.randomize()
                                    if await store.loadout.save(store.riot) { await store.refreshRiot() }
                                }
                            }
                        }

                        NavigationLink { EvalSprayLoadoutView() } label: {
                        SprayWheelView(
                            topSprayURL: store.isConfigured ? store.equippedSprays[0] : nil,
                            leftSprayURL: store.isConfigured ? store.equippedSprays[1] : nil,
                            rightSprayURL: store.isConfigured ? store.equippedSprays[2] : nil,
                            bottomSprayURL: store.isConfigured ? store.equippedSprays[3] : nil
                        )
                        }
                        .buttonStyle(.plain)
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
                .foregroundStyle(EvalColors.text)
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
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                    Spacer()
                    HStack(spacing: 6) {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in Text(EvalCountdown.text(until: store.accessoriesEnd, now: ctx.date)) }
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .background(EvalColors.card, in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Offres quotidiennes")
                        .font(.system(size: 23, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                    Spacer()
                    HStack(spacing: 5) {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in Text(EvalCountdown.text(until: store.offersEnd, now: ctx.date)) }
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(.horizontal, 4)
                .padding(.top, 4)

                let wished = store.storeOffers.filter { store.isWished($0.id) }
                if !wished.isEmpty {
                    Label("\(wished.map(\.name).joined(separator: ", ")) \(wished.count > 1 ? "sont" : "est") dans votre boutique !", systemImage: "heart.fill")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(EvalAccent.color)
                        .padding(.horizontal, 4)
                }
                ForEach(store.storeOffers) { offer in
                    EvalDailyOfferCard(offer: offer, wished: store.isWished(offer.id))
                }
            }

            ForEach(store.bundles) { bundle in
                EvalFeaturedBundleCard(bundle: bundle)
            }

            VStack(spacing: 0) {
                NavigationLink { EvalWishlistView() } label: {
                HStack {
                    Image(systemName: "heart")
                        .font(.system(size: 18))
                        .foregroundStyle(EvalAccent.color)
                        .frame(width: 24)
                    Text("Liste de souhaits")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(EvalColors.text)
                    Spacer()
                    Text("\(store.wishlistCount)")
                        .font(.system(size: 17))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 16)
                .contentShape(.rect)
                }
                .buttonStyle(.plain)

                Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 54)

                NavigationLink {
                    EvalShopHistoryView()
                } label: {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 18))
                            .foregroundStyle(EvalAccent.color)
                            .frame(width: 24)
                        Text("Historique de la boutique")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Text("\(store.storeHistoryCount)")
                            .font(.system(size: 17))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
                .buttonStyle(.plain)
            }
            .background(EvalColors.card, in: .rect(cornerRadius: 20))
        }
    }

    private var equipPrivacyRow: some View {
        HStack(spacing: 12) {
            Image(systemName: "hand.raised.fill")
                .font(.system(size: 18))
                .foregroundStyle(EvalAccent.color)
                .frame(width: 24)

            Text("Paramètres de confidentialité")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(EvalColors.text)

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
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func equipNavRow(icon: String, title: String, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(EvalAccent.color)
                .frame(width: 24)

            Text(title)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(EvalColors.text)

            Spacer()

            if let value {
                Text(value)
                    .font(.system(size: 17))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
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
                    .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                    .foregroundStyle(isSelected ? EvalAccent.color : Color(hex: 0x8E8E93))

                if hasChevron {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(isSelected ? EvalAccent.color : Color(hex: 0x8E8E93))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                isSelected ? EvalAccent.color.opacity(0.16) : EvalColors.card,
                in: .capsule
            )
            .overlay(
                Capsule().strokeBorder(isSelected ? EvalAccent.color.opacity(0.4) : Color.clear, lineWidth: 1)
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
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(EvalAccent.color)
                            .rotationEffect(.degrees(isExpanded.wrappedValue ? 90 : 0))

                        Text(title)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(EvalColors.text)

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
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                    Spacer()
                    HStack(spacing: 5) {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in Text(EvalCountdown.text(until: store.dailyEnd, now: ctx.date)) }
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }

                HStack(spacing: 0) {
                    ForEach(0..<4) { i in
                        let done = store.dailyMilestones.indices.contains(i) && store.dailyMilestones[i]
                        ZStack {
                            Circle().fill(done ? EvalAccent.color : EvalColors.text.opacity(0.06))
                            Image(systemName: done ? "checkmark" : "smallcircle.filled.circle")
                                .font(.system(size: done ? 18 : 22, weight: done ? .bold : .regular))
                                .foregroundStyle(done ? Color.white : EvalColors.text.opacity(0.25))
                        }
                        .frame(width: 36, height: 36)

                        if i < 3 {
                            let next = store.dailyMilestones.indices.contains(i + 1) && store.dailyMilestones[i + 1]
                            Rectangle()
                                .fill(done && next ? EvalAccent.color : EvalColors.text.opacity(0.12))
                                .frame(height: 2)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
            }
            .padding(16)
            .background(EvalColors.card, in: .rect(cornerRadius: 20))

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Missions hebdomadaires")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(EvalColors.text)
                    Spacer()
                    HStack(spacing: 5) {
                        TimelineView(.periodic(from: .now, by: 1)) { ctx in Text(EvalCountdown.text(until: store.weeklyMissionsEnd, now: ctx.date)) }
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Image(systemName: "clock")
                            .font(.system(size: 15))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }

                let pending = store.activeMissions.filter { !$0.complete }
                if !store.activeMissions.isEmpty && pending.isEmpty {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 18))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                        Text("Vous avez terminé toutes les missions disponibles.")
                            .font(.system(size: 16))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.top, 2)
                }
                ForEach(pending) { mission in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(mission.title).font(.system(size: 16, weight: .medium)).foregroundStyle(EvalColors.text)
                            Spacer()
                            Text("+\(mission.xp.formatted()) XP").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        ProgressView(value: Double(min(mission.progress, mission.target)), total: Double(max(1, mission.target)))
                            .tint(EvalAccent.color)
                        Text("\(mission.progress.formatted()) / \(mission.target.formatted())").font(.system(size: 14)).foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.top, 4)
                }
            }
            .padding(16)
            .background(EvalColors.card, in: .rect(cornerRadius: 20))

            EvalUpcomingMissionsCard()
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
                .strokeBorder(EvalColors.text.opacity(0.12), lineWidth: 4)
                .frame(width: 60, height: 60)

            if store.isConfigured {
                Circle()
                    .trim(from: 0, to: CGFloat(store.battlepassCompletionPercent) / 100.0)
                    .stroke(Theme.danger, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: 60, height: 60)
            }

            Text(store.battlepassLevels.isEmpty ? "—" : "\(store.battlepassCompletionPercent)%")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(EvalColors.text)
        }
    }

    private var progressBar: some View {
        VStack(spacing: 6) {
            HStack {
                Text(store.battlepassLevels.isEmpty ? "Données indisponibles" : "Niveau actuel : \(store.battlepassCurrentLevel) / 55")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(EvalColors.text)
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
                        .fill(EvalColors.text.opacity(0.08))
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
                        .foregroundStyle(EvalColors.text)

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
        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))
    }

    var body: some View {
        NavigationStack {
            ZStack {
                EvalColors.background.ignoresSafeArea()

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
                            .font(.system(size: 23))
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
                    .foregroundStyle(EvalColors.text)

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
                            .fill(EvalColors.text.opacity(0.05))
                            .frame(height: 1)
                            .padding(.leading, 56)
                    }
                }
            }
            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
            .clipShape(.rect(cornerRadius: Theme.cardRadius))
            .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))
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
                        .frame(width: 37, height: 37)
                    Image(systemName: "checkmark")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Theme.danger)
                } else if isCurrent {
                    Circle()
                        .strokeBorder(Theme.danger, lineWidth: 2)
                        .frame(width: 37, height: 37)
                    Text("\(level.level)")
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundStyle(EvalColors.text)
                } else {
                    Circle()
                        .fill(EvalColors.text.opacity(0.06))
                        .frame(width: 37, height: 37)
                    Text("\(level.level)")
                        .font(.system(size: 14, weight: .medium))
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
                            .frame(width: 51, height: 51)
                    default:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(EvalColors.text.opacity(0.04))
                            .frame(width: 51, height: 51)
                            .overlay(Image(systemName: "gift.fill").font(.system(size: 18)).foregroundStyle(.secondary))
                    }
                }
                .frame(width: 51, height: 51)
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(EvalColors.text.opacity(0.04))
                    .frame(width: 51, height: 51)
                    .overlay(Image(systemName: "gift.fill").font(.system(size: 18)).foregroundStyle(.secondary))
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(level.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(isCurrent ? .white : (isCompleted ? .white.opacity(0.9) : .secondary))
                        .lineLimit(1)

                    if level.isFree {
                        Text("GRATUIT")
                            .font(.system(size: 10, weight: .black))
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
                EvalColors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        VStack(spacing: 8) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Réserve de missions futures")
                                        .font(.headline.weight(.heavy))
                                        .foregroundStyle(EvalColors.text)

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
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))

                        VStack(spacing: 0) {
                            ForEach(Array(store.upcomingMissions.enumerated()), id: \.element.id) { index, mission in
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(EvalColors.text.opacity(0.06))
                                            .frame(width: 39, height: 39)

                                        Image(systemName: "calendar.badge.clock")
                                            .font(.system(size: 16))
                                            .foregroundStyle(Theme.danger)
                                    }

                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(mission.title)
                                            .font(.subheadline.weight(.medium))
                                            .foregroundStyle(EvalColors.text)

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
                                        .fill(EvalColors.text.opacity(0.05))
                                        .frame(height: 1)
                                        .padding(.leading, 56)
                                }
                            }
                        }
                        .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                        .clipShape(.rect(cornerRadius: Theme.cardRadius))
                        .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))
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
                            .font(.system(size: 23))
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
            EvalColors.background.ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        hubGroupSection(title: "Réseaux sociaux") {
                            NavigationLink {
                                EvalFriendsView()
                            } label: {
                                hubRowView(icon: "person.2", title: "Amis", badge: "\(store.friends.count)")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalPlayersSearchView()
                            } label: {
                                hubRowView(icon: "bookmark", title: "Signets", badge: "\(store.userBookmarksCount)")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalNameHistoryView()
                            } label: {
                                hubRowView(icon: "person.text.rectangle", title: "Historique des pseudos")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalLeaderboardView()
                            } label: {
                                hubRowView(icon: "trophy", title: "Classement")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalPurchaseHistoryView()
                            } label: {
                                hubRowView(icon: "creditcard", title: "Historique des achats")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalPlayerSettingsView()
                            } label: {
                                hubRowView(icon: "slider.horizontal.2.square", title: "Paramètres du joueur", badge: "\(store.playerSettingsCount)")
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

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalAgentsView()
                            } label: {
                                hubRowView(icon: "person", title: "Agents")
                            }
                            .buttonStyle(.plain)

                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                            NavigationLink {
                                EvalWeaponsView()
                            } label: {
                                hubRowView(icon: "scope", title: "Armes")
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 10)
                    .padding(.bottom, 24)
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
                .foregroundStyle(EvalColors.text)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private func hubGroupSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(Color(hex: 0x8E8E93))
                .padding(.leading, 20)

            VStack(spacing: 0) {
                content()
            }
            .background(EvalColors.card, in: .rect(cornerRadius: 28))
        }
    }

    private func hubRowView(icon: String, title: String, badge: String? = nil) -> some View {
        HStack(spacing: 18) {
            Image(systemName: icon)
                .font(.system(size: 25))
                .foregroundStyle(EvalAccent.color)
                .frame(width: 36)

            Text(title)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(EvalColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            Spacer(minLength: 8)

            if let badge {
                Text(badge)
                    .font(.system(size: 22))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color(hex: 0x636366))
        }
        .padding(.horizontal, 18)
        .frame(minHeight: 66)
        .contentShape(.rect)
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

                    if store.isConfigured && !store.friends.isEmpty {
                        HStack(spacing: 10) {
                            Image(systemName: "magnifyingglass").font(.system(size: 21, weight: .medium))
                            TextField("Rechercher des amis", text: $searchQuery)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                        }
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.horizontal, 16)
                        .frame(height: 50)
                        .background(EvalColors.card, in: .capsule)
                    }

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
        .navigationDestination(item: $selectedFriend) { friend in
            EvalPlayerProfileView(name: friend.name, tag: friend.tag)
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
                        .fill(EvalColors.text.opacity(0.08))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(EvalColors.text)
                        )
                }
                .buttonStyle(PressScaleStyle())

                NavigationLink {
                    EvalFriendHistoryView()
                } label: {
                    Circle()
                        .fill(EvalColors.text.opacity(0.08))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "person.crop.circle.badge.clock")
                                .font(.system(size: 17))
                                .foregroundStyle(Theme.danger)
                        )
                }
                .buttonStyle(PressScaleStyle())
            }

            Spacer()

            Text("Amis")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

            Spacer()

            HStack(spacing: 8) {
                Button {
                    showingSettingsSheet = true
                } label: {
                    Circle()
                        .fill(EvalColors.text.opacity(0.08))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "ellipsis")
                                .font(.system(size: 17, weight: .bold))
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
                        .fill(EvalColors.text.opacity(0.08))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "person.crop.circle.badge.plus")
                                .font(.system(size: 17))
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
                                .frame(width: 51, height: 51)
                                .clipShape(.rect(cornerRadius: 12))
                        default:
                            RoundedRectangle(cornerRadius: 12)
                                .fill(EvalColors.card)
                                .frame(width: 51, height: 51)
                                .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                        }
                    }
                } else {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(EvalColors.card)
                        .frame(width: 51, height: 51)
                        .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                }

                Circle()
                    .fill(Color(hex: 0x8E8E93))
                    .frame(width: 15, height: 15)
                    .overlay(Circle().strokeBorder(EvalColors.card, lineWidth: 2))
                    .offset(x: 2, y: 2)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(store.playerName.isEmpty ? "Aucun compte" : store.playerName)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(EvalColors.text)

                    Text(store.tag.isEmpty ? "" : "#\(store.tag)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                }

                Text("Statut en jeu indisponible")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(14)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private var disconnectedConnectCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.badge.gearshape.fill")
                .font(.system(size: 46))
                .foregroundStyle(Theme.danger)

            VStack(spacing: 6) {
                Text("Connexion Riot requise")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(EvalColors.text)

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
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
        .clipShape(.rect(cornerRadius: 20))
    }

    private var emptyFriendsCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 46))
                .foregroundStyle(.secondary)

            Text("Aucun ami sur ce compte")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)

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
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
        ZStack {
            if friend.isPartyLeader {
                HStack {
                    Spacer()
                    Image(systemName: "crown")
                        .font(.system(size: 51, weight: .light))
                        .foregroundStyle(EvalColors.text.opacity(0.04))
                        .offset(x: -60)
                    Spacer()
                }
            }

            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    ZStack(alignment: .bottomTrailing) {
                        AsyncImage(url: URL(string: friend.avatarURL ?? "")) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().scaledToFill().frame(width: 51, height: 51).clipShape(.rect(cornerRadius: 12))
                            default:
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(EvalColors.card)
                                    .frame(width: 51, height: 51)
                                    .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                            }
                        }

                        if friend.isInGame {
                            Circle()
                                .fill(Color(hex: 0xFD4556))
                                .frame(width: 15, height: 15)
                                .overlay(Rectangle().fill(Color.white).frame(width: 7, height: 2))
                                .overlay(Circle().strokeBorder(EvalColors.card, lineWidth: 2))
                                .offset(x: 2, y: 2)
                        } else if friend.isOnline {
                            Circle()
                                .fill(Color(hex: 0x22C55E))
                                .frame(width: 15, height: 15)
                                .overlay(Circle().strokeBorder(EvalColors.card, lineWidth: 2))
                                .offset(x: 2, y: 2)
                        }
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 4) {
                            Text(friend.name)
                                .font(.subheadline.weight(.heavy))
                                .foregroundStyle(EvalColors.text)

                            Text("#\(friend.tag)")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.secondary)
                        }

                        if let queue = friend.queueState {
                            Text(queue)
                                .font(.caption.weight(.medium))
                                .foregroundStyle(EvalColors.text)
                            if let mode = friend.gameMode {
                                Text(mode)
                                    .font(.caption2)
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        } else if friend.isInGame {
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
                                        .foregroundStyle(EvalColors.text)
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
                        if let url = friend.rankIconURL {
                            AsyncImage(url: url) { phase in
                                if let image = phase.image {
                                    image
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 37, height: 37)
                                } else {
                                    Image(systemName: "rhombus.fill")
                                        .font(.system(size: 23))
                                        .foregroundStyle(tierRingColor(tier: friend.tierNumber))
                                }
                            }
                        } else {
                            Image(systemName: "rhombus.fill")
                                .font(.system(size: 23))
                                .foregroundStyle(tierRingColor(tier: friend.tierNumber))
                        }

                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                }
                .padding(14)

                if friend.otherPartyMembersCount > 0 {
                    Divider()
                        .overlay(EvalColors.text.opacity(0.06))
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
        }
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                        image.resizable().scaledToFill().frame(width: 51, height: 51).clipShape(.rect(cornerRadius: 12))
                    default:
                        RoundedRectangle(cornerRadius: 12)
                            .fill(EvalColors.card)
                            .frame(width: 51, height: 51)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }
                .opacity(0.65)

                Circle()
                    .fill(Color(hex: 0x64748B))
                    .frame(width: 13, height: 13)
                    .overlay(Circle().strokeBorder(EvalColors.card, lineWidth: 2))
                    .offset(x: 2, y: 2)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(friend.name)
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(EvalColors.text.opacity(0.85))

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
                            image.resizable().scaledToFit().frame(width: 32, height: 32).opacity(0.8)
                        default:
                            Image(systemName: "shield.fill")
                                .font(.system(size: 21))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .background(EvalColors.card, in: .rect(cornerRadius: 20))
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
                    .foregroundStyle(EvalColors.text)

                Text("Entre le Riot ID du joueur que tu veux ajouter.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(spacing: 0) {
                TextField("Nom", text: $name)
                    .font(.subheadline)
                    .foregroundStyle(EvalColors.text)
                    .padding(12)

                Rectangle()
                    .fill(EvalColors.text.opacity(0.08))
                    .frame(height: 1)

                TextField("Identifiant", text: $tag)
                    .font(.subheadline)
                    .foregroundStyle(EvalColors.text)
                    .padding(12)
            }
            .background(EvalColors.text.opacity(0.06), in: .rect(cornerRadius: 12))

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
                        .background(EvalColors.text.opacity(0.08), in: .rect(cornerRadius: 14))
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
                        .background(EvalColors.text.opacity(0.08), in: .rect(cornerRadius: 14))
                }
                .buttonStyle(PressScaleStyle())
            }
        }
        .padding(22)
        .frame(maxWidth: 320)
        .glassEffect(.regular, in: .rect(cornerRadius: 24))
        .clipShape(.rect(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(EvalColors.text.opacity(0.12), lineWidth: 1))
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
                    .foregroundStyle(EvalColors.text)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Circle()
                        .fill(EvalColors.text.opacity(0.08))
                        .frame(width: 37, height: 37)
                        .overlay(Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).foregroundStyle(.secondary))
                }
            }
            .padding(.top, 14)

            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 23))
                            .foregroundStyle(Theme.danger)

                        Text("Ouvrir le profil directement")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(EvalColors.text)

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
                            .font(.system(size: 23))
                            .foregroundStyle(Theme.danger)

                        Text("Trier les joueurs hors ligne par dernière connexion")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(EvalColors.text)

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
                            .fill(EvalColors.text.opacity(0.08))
                            .frame(width: 44, height: 44)
                            .overlay(Image(systemName: "chevron.left").font(.system(size: 16, weight: .bold)).foregroundStyle(EvalColors.text))
                    }
                    .buttonStyle(PressScaleStyle())

                    Text("Changements de la liste d'amis")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(EvalColors.text)

                    Spacer()
                }
                .padding(.top, 4)

                VStack(spacing: 0) {
                    ForEach(Array(store.friendHistory.enumerated()), id: \.element.id) { index, event in
                        HStack(spacing: 14) {
                            Group {
                                switch event.type {
                                case .requestAccepted, .added:
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
                            .font(.system(size: 23))
                            .frame(width: 24)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.handle)
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(EvalColors.text)

                                Text(event.type.rawValue)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)

                                Text(event.timestampText)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary.opacity(0.7))
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 14)

                        if index < store.friendHistory.count - 1 {
                            Rectangle()
                                .fill(EvalColors.text.opacity(0.05))
                                .frame(height: 1)
                                .padding(.leading, 52)
                        }
                    }
                }
                .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                .clipShape(.rect(cornerRadius: Theme.cardRadius))
                .overlay(RoundedRectangle(cornerRadius: Theme.cardRadius).strokeBorder(EvalColors.text.opacity(0.08), lineWidth: 1))
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
                        image.resizable().scaledToFill().frame(width: 62, height: 62).clipShape(.rect(cornerRadius: 14))
                    default:
                        RoundedRectangle(cornerRadius: 14)
                            .fill(EvalColors.card)
                            .frame(width: 62, height: 62)
                            .overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(friend.handle)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(EvalColors.text)

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
                            .font(.system(size: 17))
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
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.danger)
                    .frame(width: 22)

                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(EvalColors.text)

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
    @State private var showingRiotLogin = false
    @State private var confirmRiotSignOut = false
    @AppStorage(EvalAccent.key) private var accentHex = Int(EvalAccent.defaultHex)
    @AppStorage(EvalTheme.key) private var theme = EvalTheme.system.rawValue
    @AppStorage(EvalPlatform.key) private var platform = EvalPlatform.pc.rawValue

    private var store: ValorantStore { model.valorant }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                topBar

                Button { model.evalPresented = false } label: {
                    HStack(spacing: 18) {
                        Image(systemName: "arrow.uturn.backward.circle.fill")
                            .font(.system(size: 25))
                            .foregroundStyle(EvalAccent.color)
                        Text("Retour à Ethone")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x636366))
                    }
                    .padding(.horizontal, 18)
                    .frame(minHeight: 62)
                    .background(EvalColors.card, in: .rect(cornerRadius: 24))
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)

                VStack(alignment: .leading, spacing: 8) {
                    VStack(spacing: 0) {
                        ForEach(store.savedAccounts, id: \.self) { handle in
                            let active = handle == "\(store.playerName)#\(store.tag)"
                            Button { if !active { store.switchAccount(handle) } } label: {
                                HStack(spacing: 12) {
                                    Group {
                                        if active, let url = store.profile?.cardURL {
                                            AsyncImage(url: url) { $0.image?.resizable().scaledToFill() }
                                        } else {
                                            EvalColors.card.overlay(Image(systemName: "person.fill").foregroundStyle(.secondary))
                                        }
                                    }
                                    .frame(width: 51, height: 51)
                                    .clipShape(.rect(cornerRadius: 10))
                                    VStack(alignment: .leading, spacing: 2) {
                                        let parts = handle.split(separator: "#", maxSplits: 1).map(String.init)
                                        (Text(parts.first ?? handle).foregroundStyle(EvalColors.text) + Text(parts.count > 1 ? "#\(parts[1])" : "").foregroundStyle(.secondary))
                                            .font(.system(size: 20, weight: .semibold))
                                        if active, let level = store.profile?.level, level > 0 {
                                            Text("Niveau \(level)").font(.caption).foregroundStyle(.secondary)
                                        }
                                    }
                                    Spacer()
                                    if active, let tier = store.profile?.tier, tier > 0 {
                                        AsyncImage(url: ValorantProfile.tierIcon(tier)) { $0.image?.resizable().scaledToFit() }.frame(width: 39, height: 39)
                                    }
                                }
                                .padding(16)
                                .contentShape(.rect)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                if let creds = store.riot.credentials, "\(creds.gameName)#\(creds.tagLine)".lowercased() == handle.lowercased() {
                                    Button("Déconnecter le compte Riot", systemImage: "gamecontroller") { confirmRiotSignOut = true }
                                }
                                Button("Retirer ce compte", systemImage: "trash", role: .destructive) { store.removeAccount(handle) }
                            }
                            Divider().overlay(EvalColors.text.opacity(0.06)).padding(.leading, 16)
                        }

                        Button {
                            showingRiotLogin = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "plus")
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundStyle(EvalAccent.color)
                                Text("Ajouter un compte")
                                    .font(.system(size: 22, weight: .medium))
                                    .foregroundStyle(EvalColors.text)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                            .padding(16)
                        }
                        .buttonStyle(.plain)
                    }
                    .background(EvalColors.card, in: .rect(cornerRadius: 28))

                    if let error = store.riot.lastError {
                        Text(error).font(.system(size: 15)).foregroundStyle(EvalAccent.color).padding(.horizontal, 6)
                    }
                    Text("Ajouter un compte ouvre la connexion Riot officielle. Touchez un compte pour l’afficher, appuyez longuement pour le retirer.")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.horizontal, 6)
                }

                VStack(alignment: .leading, spacing: 8) {
                    let current = EvalPlatform(rawValue: platform) ?? .pc
                    HStack(spacing: 12) {
                        Image(systemName: current.icon)
                            .font(.system(size: 21))
                            .foregroundStyle(EvalAccent.color)
                        Text(current.label)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Menu {
                            Picker("Plateforme", selection: $platform) {
                                ForEach(EvalPlatform.allCases) { option in
                                    Label(option.label, systemImage: option.icon).tag(option.rawValue)
                                }
                            }
                        } label: {
                            Text("Modifier")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(EvalAccent.color)
                        }
                    }
                    .padding(16)
                    .background(EvalColors.card, in: .rect(cornerRadius: 28))

                    Text("Sélectionnez la plateforme sur laquelle vous jouez. Vous pouvez consulter les données des autres plateformes en utilisant le sélecteur de plateforme sur n'importe quel profil.")
                        .font(.system(size: 15))
                        .foregroundStyle(Color(hex: 0x8E8E93))
                        .padding(.horizontal, 6)
                }

                VStack(spacing: 0) {
                    NavigationLink {
                        EvalStorageView()
                    } label: {
                        settingsNavRow(icon: "arrow.up.arrow.down", title: "Stockage et données")
                    }
                    .buttonStyle(.plain)

                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                    NavigationLink {
                        EvalAdvancedSettingsView()
                    } label: {
                        settingsNavRow(icon: "slider.horizontal.2.square", title: "Paramètres avancés")
                    }
                    .buttonStyle(.plain)
                }
                .background(EvalColors.card, in: .rect(cornerRadius: 28))

                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "sun.max")
                            .font(.system(size: 25))
                            .foregroundStyle(EvalAccent.color)
                            .frame(width: 36)
                        Text("Thème")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Picker("Thème", selection: $theme) {
                            ForEach(EvalTheme.allCases) { option in
                                Text(option.label).tag(option.rawValue)
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)

                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                    HStack(spacing: 18) {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 25))
                            .foregroundStyle(EvalAccent.color)
                            .frame(width: 36)
                        Text("Couleur d'accentuation")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        ColorPicker("Couleur d'accentuation", selection: Binding(
                            get: { Color(hex: UInt32(truncatingIfNeeded: accentHex)) },
                            set: { accentHex = Int(EvalAccent.hex(of: $0)) }
                        ), supportsOpacity: false)
                        .labelsHidden()
                        .scaleEffect(1.25)
                    }
                    .padding(.horizontal, 18)
                    .frame(minHeight: 66)
                }
                .background(EvalColors.card, in: .rect(cornerRadius: 28))

                VStack(spacing: 0) {
                    NavigationLink { EvalAboutView() } label: {
                    HStack(spacing: 18) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 25))
                            .foregroundStyle(EvalAccent.color)
                            .frame(width: 36)
                        Text("À propos")
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(EvalColors.text)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x8E8E93))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 20)
                    .contentShape(.rect)
                    }
                    .buttonStyle(.plain)

                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                    Link(destination: URL(string: "https://discord.gg/ethone")!) {
                        HStack(spacing: 18) {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 25))
                                .foregroundStyle(EvalAccent.color)
                                .frame(width: 36)
                            Text("Serveur Discord")
                                .font(.system(size: 22, weight: .medium))
                                .foregroundStyle(EvalColors.text)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 20)
                    }

                    Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 72)

                    NavigationLink { EvalFAQView() } label: {
                        HStack(spacing: 18) {
                            Image(systemName: "questionmark.circle")
                                .font(.system(size: 25))
                                .foregroundStyle(EvalAccent.color)
                                .frame(width: 36)
                            Text("FAQ")
                                .font(.system(size: 22, weight: .medium))
                                .foregroundStyle(EvalColors.text)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 20)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
                .background(EvalColors.card, in: .rect(cornerRadius: 28))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 96)
        }
        .scrollIndicators(.hidden)
        .onAppear { store.leaderboardPlatform = (EvalPlatform(rawValue: platform) ?? .pc).apiValue }
        .onChange(of: platform) { _, value in store.leaderboardPlatform = (EvalPlatform(rawValue: value) ?? .pc).apiValue }
        .sheet(isPresented: $showingRiotLogin) { EvalRiotLoginSheet(fresh: store.riot.isLinked) }
        .confirmationDialog("Déconnecter le compte Riot ?", isPresented: $confirmRiotSignOut, titleVisibility: .visible) {
            Button("Déconnecter", role: .destructive) { Task { await store.unlinkRiot() } }
        }
    }

    private var topBar: some View {
        HStack {
            Spacer()
            Text("Paramètres")
                .font(.headline.weight(.bold))
                .foregroundStyle(EvalColors.text)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private func settingsNavRow(icon: String, title: String, detail: String? = nil) -> some View {
        HStack(spacing: 18) {
            Image(systemName: icon)
                .font(.system(size: 25))
                .foregroundStyle(EvalAccent.color)
                .frame(width: 36)

            Text(title)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(EvalColors.text)

            Spacer()

            if let detail {
                Text(detail)
                    .font(.system(size: 17))
                    .foregroundStyle(Color(hex: 0x8E8E93))
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color(hex: 0x636366))
        }
        .padding(.horizontal, 18)
        .frame(minHeight: 66)
        .contentShape(.rect)
    }
}

/// Connexion Riot : page officielle auth.riotgames.com, rien ne transite par Ethone.
struct EvalRiotLoginSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    var fresh = false
    @State private var working = false

    var body: some View {
        NavigationStack {
            ZStack {
                RiotLoginView(fresh: fresh) { access, id, expires in
                    working = true
                    Task {
                        await model.valorant.linkRiot(accessToken: access, idToken: id, expiresIn: expires)
                        working = false
                        dismiss()
                    }
                }
                if working { ProgressView().tint(.white).padding(24).background(.ultraThinMaterial, in: .rect(cornerRadius: 16)) }
            }
            .safeAreaInset(edge: .bottom) {
                Text("Connexion sur la page officielle de Riot Games. Votre mot de passe n’est jamais lu ni envoyé par Ethone. API non officielle : Riot peut la bloquer à tout moment.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(.ultraThinMaterial)
            }
            .navigationTitle("Compte Riot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } } }
        }
    }
}

struct EvalRiotAccountRow: View {
    @Environment(AppModel.self) private var model
    @State private var showingLogin = false
    @State private var confirmSignOut = false

    var body: some View {
        let riot = model.valorant.riot
        VStack(alignment: .leading, spacing: 8) {
            Button {
                if riot.isLinked { confirmSignOut = true } else { showingLogin = true }
            } label: {
                HStack(spacing: 14) {
                    Image(systemName: "gamecontroller.fill").font(.system(size: 21)).foregroundStyle(EvalAccent.color).frame(width: 28)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(riot.isLinked ? "Compte Riot connecté" : "Connecter mon compte Riot")
                            .font(.system(size: 18, weight: .medium)).foregroundStyle(EvalColors.text)
                        if let creds = riot.credentials {
                            Text("\(creds.gameName)#\(creds.tagLine) · \(creds.region.uppercased())").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                        }
                    }
                    Spacer()
                    Text(riot.isLinked ? "Déconnecter" : "Connexion").font(.system(size: 17)).foregroundStyle(EvalAccent.color)
                }
                .padding(16)
                .background(EvalColors.card, in: .rect(cornerRadius: 20))
            }
            .buttonStyle(.plain)
            if let error = riot.lastError {
                Text(error).font(.footnote).foregroundStyle(EvalAccent.color).padding(.horizontal, 4)
            }
            Text("Boutique, portefeuille, équipement, passe de combat et groupe viennent du compte Riot connecté.")
                .font(.footnote).foregroundStyle(Color(hex: 0x8E8E93)).padding(.horizontal, 4)
        }
        .sheet(isPresented: $showingLogin) { EvalRiotLoginSheet() }
        .confirmationDialog("Déconnecter le compte Riot ?", isPresented: $confirmSignOut, titleVisibility: .visible) {
            Button("Déconnecter", role: .destructive) { Task { await model.valorant.unlinkRiot() } }
        }
    }
}
