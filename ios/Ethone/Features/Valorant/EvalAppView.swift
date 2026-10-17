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

    private var store: ValorantStore { model.valorant }
    private var profile: ValorantProfile? { store.profile }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    topNavHeader

                    // Main Radiant Rank & Banner Card (Screenshot 1)
                    mainProfileCard

                    // Career Summary Card (Screenshot 1)
                    careerSummaryCard

                    // 2-card Split Row: Récap de session & Tendances
                    sessionRecapRow

                    // Matchs Section
                    matchesListSection
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96) // Space for floating bottom bar
            }
            .scrollIndicators(.hidden)
            .ethoneScreen()
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

            Text(profile?.handle.split(separator: "#").first.map(String.init) ?? "Rub19")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)

            Spacer()

            HStack(spacing: 8) {
                Button {
                } label: {
                    Image(systemName: "line.3.horizontal")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Theme.danger)
                        .frame(width: 34, height: 34)
                        .glassEffect(.regular, in: .circle)
                }

                Button {
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

    // Main Profile Card (Widescreen Artwork + Radiant Tier Badges)
    private var mainProfileCard: some View {
        VStack(spacing: 0) {
            // Identity Bar
            HStack {
                Text(profile?.handle ?? "Rub19#Boss")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Spacer()
                Text("=^._.^=")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            // Champions Widescreen Banner
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
            .frame(height: 100)
            .frame(maxWidth: .infinity)
            .clipped()

            // 2 Columns: Current Radiant Rank (319 SC) & Peak Rank
            HStack(alignment: .top, spacing: 16) {
                // Column 1: Current Rank
                VStack(spacing: 6) {
                    Text("V26 // ACTE VI")
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

                    Text("RADIANT")
                        .font(.subheadline.weight(.heavy))
                        .foregroundStyle(.white)

                    Text("319 SC")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    Text("Rang 473")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Color(hex: 0x3F2A0A))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 4)
                        .background(Color(hex: 0xF5D78E), in: .capsule)
                }
                .frame(maxWidth: .infinity)

                // Column 2: Peak Rank
                VStack(spacing: 6) {
                    Text("V26 // ACTE VI")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.6)

                    ZStack {
                        Image(systemName: "triangle.fill")
                            .font(.system(size: 36))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.white, Color(hex: 0xD1D5DB)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )

                        Image(systemName: "eye.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(hex: 0xF5D78E))
                            .offset(y: 4)
                    }
                    .frame(height: 76)

                    Text("RADIANT")
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

    // Career Summary Card (Winrate + Act Badges)
    private var careerSummaryCard: some View {
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

            Text("V26 // ACTE VI")
                .font(.system(size: 9, weight: .heavy))
                .foregroundStyle(.secondary)
                .tracking(0.8)

            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("76,0 %")
                        .font(.title3.weight(.heavy).monospacedDigit())
                        .foregroundStyle(Color(hex: 0x2DD4BF))
                    Text("Taux de victoire")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: 2) {
                        Text("19")
                            .font(.title3.weight(.heavy).monospacedDigit())
                            .foregroundStyle(Color(hex: 0x2DD4BF))
                        Text("/ 25")
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
                actBadge(name: "V26 // ACTE VI", icon: "sun.max.fill", color: Color(hex: 0xF5D78E))
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
                    Text("Dernières heures")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
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
                    Text("Winrate, K/D & plus")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
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

                    Text("\(match.scoreValue ?? 415) ACS")
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

// MARK: - 2. JEU TAB (Screenshot 4)
struct EvalGameView: View {
    @State private var groupExpanded = true
    @State private var contractsExpanded = true
    @State private var equipmentExpanded = true
    @State private var contractsSubtab = 0

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    HStack {
                        Text("Jeu")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                        Spacer()
                    }
                    .padding(.top, 4)

                    // 1. Groupe Section (Collapsible)
                    collapsibleSection(
                        title: "Groupe",
                        isExpanded: $groupExpanded,
                        rightContent: {
                            Circle()
                                .stroke(Theme.danger, lineWidth: 2)
                                .frame(width: 14, height: 14)
                        }
                    ) {
                        Text("Il n'y a actuellement aucun groupe!")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))
                    }

                    // 2. Contrats Section (Collapsible)
                    collapsibleSection(
                        title: "Contrats",
                        isExpanded: $contractsExpanded,
                        rightContent: {
                            Image(systemName: "arrow.clockwise")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Theme.danger)
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

                            // Card 1: Checkpoints journaliers
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
                                                .background(Circle().fill(i == 0 ? Theme.danger : Color.white.opacity(0.06)))
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

                                HStack(spacing: 8) {
                                    Image(systemName: "checkmark.circle")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Text("Vous avez terminé toutes les missions disponibles.")
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))

                            // Card 3: Missions futures
                            HStack {
                                Text("30 missions hebdomadaires futures")
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.white)
                                Spacer()
                                HStack(spacing: 4) {
                                    Text("+689 100 XP")
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
                    }

                    // 3. Équipement Section (Collapsible)
                    collapsibleSection(
                        title: "Équipement",
                        isExpanded: $equipmentExpanded,
                        rightContent: {
                            Image(systemName: "arrow.clockwise")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Theme.danger)
                        }
                    ) {
                        VStack(spacing: 12) {
                            HStack {
                                Image(systemName: "pencil")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text("Changer de titre")
                                    .font(.subheadline)
                                    .foregroundStyle(.white)
                                Spacer()
                                Text("=^._.^=")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: Theme.cardRadius))
                            .clipShape(.rect(cornerRadius: Theme.cardRadius))

                            // Weapons loadout cards
                            HStack(spacing: 10) {
                                weaponLoadoutCard(name: "Vandal", skin: "Kuronami")
                                weaponLoadoutCard(name: "Phantom", skin: "Radiant Entertainment")
                                weaponLoadoutCard(name: "Mêlée", skin: "Kuronami no Yaiba")
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .ethoneScreen()
        }
    }

    private func weaponLoadoutCard(name: String, skin: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(name)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.secondary)
            Text(skin)
                .font(.system(size: 11, weight: .heavy))
                .foregroundStyle(.white)
                .lineLimit(1)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 12))
        .clipShape(.rect(cornerRadius: 12))
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
                    withAnimation(Motion.snap) {
                        isExpanded.wrappedValue.toggle()
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: isExpanded.wrappedValue ? "chevron.down" : "chevron.right")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Theme.danger)

                        Text(title)
                            .font(.headline.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)

                Spacer()

                rightContent()
            }

            if isExpanded.wrappedValue {
                content()
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}

// MARK: - 3. HUB TAB (Screenshot 5)
struct EvalHubView: View {
    @State private var showingStore = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        Text("Hub")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                        Spacer()
                    }
                    .padding(.top, 4)

                    // 1. Réseaux sociaux
                    hubGroupSection(title: "Réseaux sociaux") {
                        hubNavRow(icon: "person.2.fill", title: "Amis", badge: "19")
                        hubNavRow(icon: "bookmark.fill", title: "Signets", badge: "2")
                        hubNavRow(icon: "person.text.rectangle.fill", title: "Historique des pseudos")
                        hubNavRow(icon: "trophy.fill", title: "Classement")
                        hubNavRow(icon: "creditcard.fill", title: "Historique des achats")
                        hubNavRow(icon: "slider.horizontal.3", title: "Paramètres du joueur", badge: "1")
                    }

                    // 2. Progression
                    hubGroupSection(title: "Progression") {
                        hubNavRow(icon: "target", title: "Objectifs de la saison")
                    }

                    // 3. Infos sur le jeu
                    hubGroupSection(title: "Infos sur le jeu") {
                        hubNavRow(icon: "map.fill", title: "Cartes")
                        hubNavRow(icon: "person.crop.circle.fill", title: "Agents")
                        hubNavRow(icon: "scope", title: "Armes")
                        Button {
                            showingStore = true
                        } label: {
                            hubRowView(icon: "bag.fill", title: "Boutique du jour", badge: "Skins")
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 96)
            }
            .scrollIndicators(.hidden)
            .ethoneScreen()
            .sheet(isPresented: $showingStore) {
                NavigationStack {
                    ValorantStoreView()
                }
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

    private func hubNavRow(icon: String, title: String, badge: String? = nil) -> some View {
        NavigationLink {
            HubDetailPlaceholderView(title: title)
        } label: {
            hubRowView(icon: icon, title: title, badge: badge)
        }
        .buttonStyle(.plain)
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

// Sub-screen for Hub entries
struct HubDetailPlaceholderView: View {
    let title: String

    var body: some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
            Text("Données synchronisées avec votre profil Riot.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .ethoneScreen()
        .navigationTitle(title)
    }
}

// MARK: - 4. PARAMÈTRES TAB (Screenshot 3 - Paywalls Removed)
struct EvalSettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var showingAccountSheet = false
    @State private var selectedTheme = "Système"
    @State private var selectedPlatform = "PC"

    private var store: ValorantStore { model.valorant }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack {
                        Text("Paramètres")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                        Spacer()
                    }
                    .padding(.top, 4)

                    // 1. Ajouter un compte
                    VStack(alignment: .leading, spacing: 6) {
                        Button {
                            showingAccountSheet = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "plus")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(Theme.danger)
                                Text("Ajouter un compte")
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
            .ethoneScreen()
            .sheet(isPresented: $showingAccountSheet) {
                ValorantSettingsSheet()
            }
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
