import SwiftUI

enum BattlepassRewardResolver {
    struct Info: Codable, Hashable { let name: String; let icon: String }

    static func resolve(_ levels: [ValorantBattlepassLevel]) async -> [ValorantBattlepassLevel] {
        var out = levels
        await withTaskGroup(of: (Int, Info?).self) { group in
            for (index, level) in levels.enumerated() where level.name.isEmpty {
                group.addTask { (index, await info(type: level.rewardType, uuid: level.rewardUUID)) }
            }
            for await (index, info) in group {
                guard let info else { continue }
                let l = out[index]
                out[index] = ValorantBattlepassLevel(id: l.id, chapter: l.chapter, level: l.level, name: info.name, rewardType: l.rewardType,
                                                     rewardUUID: l.rewardUUID, iconURL: info.icon, xpCost: l.xpCost, isFree: l.isFree)
            }
        }
        return out
    }

    static func info(type: String, uuid: String) async -> Info? {
        guard !uuid.isEmpty else { return nil }
        let key = "valorant-api.reward.\(uuid.lowercased())"
        if let cached = DiskCache.read(Info.self, key: key) { return cached }
        let path: String
        switch type {
        case "Spray": path = "sprays"
        case "PlayerCard": path = "playercards"
        case "EquippableCharmLevel": path = "buddies/levels"
        case "EquippableSkinLevel": path = "weapons/skinlevels"
        case "Currency": path = "currencies"
        case "Title": path = "playertitles"
        case "Character": path = "agents"
        default: return nil
        }
        guard let url = URL(string: "https://valorant-api.com/v1/\(path)/\(uuid)?language=fr-FR"),
              let (data, _) = try? await URLSession.shared.data(from: url),
              let json = try? JSONDecoder().decode(JSONValue.self, from: data),
              let item = json["data"] else { return nil }
        let name = item["displayName"]?.stringValue ?? item["titleText"]?.stringValue ?? ""
        let icon = item["fullTransparentIcon"]?.stringValue ?? item["displayIcon"]?.stringValue ?? item["largeArt"]?.stringValue ?? ""
        let info = Info(name: name, icon: icon)
        if !name.isEmpty { DiskCache.write(info, key: key) }
        return info
    }
}

private struct ContractCard<Content: View>: View {
    @Environment(\.evalSurface) private var surface
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(surface, in: .rect(cornerRadius: 24))
    }
}

private struct ProgressBar: View {
    let value: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(EvalColors.text.opacity(0.1))
                Capsule().fill(EvalAccent.color).frame(width: geo.size.width * min(1, max(0, value)))
            }
        }
        .frame(height: 6)
    }
}

private let contractLocale = Locale(identifier: "fr_FR")

private func contractNumber(_ value: Int) -> String {
    value.formatted(.number.locale(contractLocale))
}

private func contractNumber(_ value: Double) -> String {
    value.formatted(.number.precision(.fractionLength(0...1)).locale(contractLocale))
}

private let contractDateFormatter: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "fr_FR")
    f.dateFormat = "dd/MM/yy · HH:mm"
    return f
}()

private func contractAgo(_ date: Date, now: Date) -> String {
    let s = Int(now.timeIntervalSince(date))
    guard s >= 0, s < 86400 else { return contractDateFormatter.string(from: date) }
    if s < 3600 { return "il y a \(max(1, s / 60))min" }
    return "il y a \(s / 3600)h \((s % 3600) / 60)min"
}

private func countdownLabel(_ date: Date?, days: Bool = false, size: CGFloat = 19) -> some View {
    HStack(spacing: 6) {
        TimelineView(.periodic(from: .now, by: 1)) { ctx in
            Text(remaining(date, now: ctx.date, days: days))
        }
        Image(systemName: "clock")
    }
    .font(.system(size: size).monospacedDigit())
    .foregroundStyle(Color(hex: 0x8E8E93))
}

private func remaining(_ date: Date?, now: Date, days: Bool) -> String {
    guard let date else { return "—" }
    let s = max(0, Int(date.timeIntervalSince(now)))
    let hms = "\(days ? (s % 86400) / 3600 : s / 3600):\(String(format: "%02d", (s % 3600) / 60)):\(String(format: "%02d", s % 60))"
    return days && s >= 86400 ? "\(s / 86400)j \(hms)" : hms
}

struct EvalBattlepassContractView: View {
    @Environment(AppModel.self) private var model
    @State private var showingProjection = false

    private var store: ValorantStore { model.valorant }
    private var xp: RiotAccountXP? { store.contracts.accountXP }

    var body: some View {
        VStack(spacing: 12) {
            ContractCard {
                HStack(spacing: 10) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.black)
                        .frame(width: 30, height: 30)
                        .background(EvalAccent.color, in: .circle)
                    Text(store.battlepassTitle.isEmpty ? "Passe de combat" : store.battlepassTitle)
                        .font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text).lineLimit(1).minimumScaleFactor(0.7)
                    Spacer()
                    countdownLabel(store.battlepassEndDate, days: true)
                }
                Divider().overlay(EvalColors.text.opacity(0.08))
                if let reward = store.battlepassCurrentReward {
                    HStack(spacing: 14) {
                        AsyncImage(url: URL(string: reward.iconURL)) { $0.image?.resizable().scaledToFit() }
                            .frame(width: 58, height: 58)
                            .background(EvalColors.text.opacity(0.04), in: .rect(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(reward.name.isEmpty ? reward.rewardType : reward.name)
                                .font(.system(size: 20, weight: .medium)).foregroundStyle(EvalColors.text).lineLimit(2)
                            Text("Niveau \(reward.level) / \(store.battlepassLevels.count)")
                                .font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
                        }
                    }
                }
                ProgressBar(value: Double(store.battlepassCurrentXP) / Double(max(1, store.battlepassLevelXP)))
                HStack {
                    Text("\(store.battlepassCurrentTierProgressPercent)%  —  \(contractNumber(store.battlepassCurrentXP)) / \(contractNumber(store.battlepassLevelXP)) XP")
                    Spacer()
                    Text("\(contractNumber(max(0, store.battlepassLevelXP - store.battlepassCurrentXP))) XP")
                    Image(systemName: "circle.dotted")
                }
                .font(.system(size: 16).monospacedDigit())
                .foregroundStyle(Color(hex: 0x8E8E93))
            }

            projection

            NavigationLink { EvalSeasonPassPage() } label: {
                Text("Voir \(store.battlepassTitle.isEmpty ? "le passe" : store.battlepassTitle)")
                    .font(.system(size: 20))
                    .foregroundStyle(EvalColors.text)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(EvalColors.card2, in: .capsule)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var projection: some View {
        let remainingXP = store.remainingBattlepassXP
        let reserve = store.missionsReserveXP
        let average = xp?.averageXP ?? 0
        let pace = xp?.matchesPerDay ?? 0
        let days = max(0, store.battlepassEndDate.map { $0.timeIntervalSinceNow / 86400 } ?? 0)
        let needed = average > 0 ? Int(ceil(Double(max(0, remainingXP - reserve)) / Double(average))) : nil
        let required = needed.map { days > 0 ? Double($0) / days : 0 }
        let finishDays = needed.flatMap { pace > 0 ? Double($0) / pace : nil }

        ContractCard {
            Button { withAnimation(.snappy) { showingProjection.toggle() } } label: {
                HStack(spacing: 12) {
                    Image(systemName: "clock").font(.system(size: 20)).foregroundStyle(EvalAccent.color)
                    Text(needed.map { "Encore ~\(contractNumber($0)) parties (\(contractNumber(pace)) / jour)" } ?? "Projection indisponible")
                        .font(.system(size: 19, weight: .medium)).foregroundStyle(EvalColors.text)
                    Spacer()
                    Image(systemName: showingProjection ? "chevron.up" : "chevron.down").foregroundStyle(Color(hex: 0x8E8E93))
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)

            if showingProjection {
                HStack {
                    Text("\(store.battlepassCompletionPercent)%").foregroundStyle(EvalAccent.color)
                    Spacer()
                    Text("Encore \(contractNumber(remainingXP)) XP").foregroundStyle(EvalColors.text)
                }
                .font(.system(size: 17, weight: .semibold))
                ProgressBar(value: Double(store.battlepassCompletionPercent) / 100)
                Divider().overlay(EvalColors.text.opacity(0.08))
                HStack {
                    Label("Missions hebdomadaires à venir", systemImage: "calendar.badge.plus")
                    Spacer()
                    Text("+\(contractNumber(reserve)) XP")
                }
                .font(.system(size: 16))
                .foregroundStyle(Color(hex: 0x8E8E93))

                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    tile("XP moy./Match", "chart.xyaxis.line", average > 0 ? contractNumber(average) : "—")
                    tile("Votre rythme", "figure.run", pace > 0 ? "\(contractNumber(pace)) / jour" : "—")
                    tile("Matchs restants", "flag.checkered", needed.map { "≈ \(contractNumber($0))" } ?? "—")
                    tile("Rythme requis", "clock", required.map { "\(contractNumber($0)) / jour" } ?? "—")
                }

                if let needed, let required {
                    let onTrack = needed == 0 || pace >= required
                    HStack(spacing: 14) {
                        Image(systemName: onTrack ? "calendar.badge.checkmark" : "calendar.badge.exclamationmark")
                            .font(.system(size: 28)).foregroundStyle(EvalAccent.color)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(onTrack ? "Dans les temps" : "En retard").font(.system(size: 19, weight: .semibold)).foregroundStyle(EvalAccent.color)
                            if let finishDays, needed > 0 {
                                Text("À ce rythme, vous devriez terminer vers le \(Date().addingTimeInterval(finishDays * 86400).formatted(.dateTime.day().month(.wide).locale(contractLocale))).")
                                    .font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                            } else if needed == 0 {
                                Text("Les missions à venir suffisent pour finir le passe.").font(.system(size: 15)).foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        }
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(EvalColors.card2, in: .rect(cornerRadius: 18))
                }

                Text("Basé sur vos \(min(20, xp?.history.count ?? 0)) dernières parties (XP réellement gagnée d’après Riot). Les missions hebdomadaires à venir sont déduites du total restant.")
                    .font(.system(size: 14)).foregroundStyle(Color(hex: 0x636366))
            }
        }
    }

    private func tile(_ title: String, _ icon: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon).font(.system(size: 15)).foregroundStyle(Color(hex: 0xAEAEB2)).lineLimit(1).minimumScaleFactor(0.8)
            Text(value).font(.system(size: 24, weight: .bold).monospacedDigit()).foregroundStyle(EvalColors.text).lineLimit(1).minimumScaleFactor(0.6)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(EvalColors.card2, in: .rect(cornerRadius: 18))
    }
}

struct EvalAccountXPView: View {
    @Environment(AppModel.self) private var model
    @State private var expanded = false

    private var store: ValorantStore { model.valorant }

    var body: some View {
        if let xp = store.contracts.accountXP {
            VStack(spacing: 12) {
                ContractCard {
                    HStack {
                        Text("Niveau de compte").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text)
                        Spacer()
                        Text("\(xp.level)").font(.system(size: 22, weight: .bold).monospacedDigit()).foregroundStyle(EvalAccent.color)
                    }
                    Divider().overlay(EvalColors.text.opacity(0.08))
                    ProgressBar(value: Double(xp.xp) / Double(RiotAccountXP.xpPerLevel))
                    HStack {
                        Text("\(contractNumber(xp.xp)) / \(contractNumber(RiotAccountXP.xpPerLevel)) XP")
                        Spacer()
                        Text("\(contractNumber(max(0, RiotAccountXP.xpPerLevel - xp.xp))) restants")
                    }
                    .font(.system(size: 16).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
                    Divider().overlay(EvalColors.text.opacity(0.08))
                    HStack {
                        Text("Première victoire du jour").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
                        Spacer()
                        if let next = xp.nextFirstWin, next > Date() {
                            countdownLabel(next, size: 16)
                        } else {
                            Text("Disponible").font(.system(size: 16, weight: .semibold)).foregroundStyle(EvalAccent.color)
                        }
                    }
                }

                if !xp.history.isEmpty {
                    ContractCard {
                        HStack {
                            Text("XP récent").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text)
                            Spacer()
                            Text("Derniers \(expanded ? min(10, xp.history.count) : min(3, xp.history.count)) matchs")
                                .font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        Divider().overlay(EvalColors.text.opacity(0.08))
                        ForEach(xp.history.prefix(expanded ? 10 : 3)) { entry in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text("+\(entry.delta) XP").font(.system(size: 20, weight: .medium).monospacedDigit()).foregroundStyle(EvalColors.text)
                                    Spacer()
                                    if let date = entry.date {
                                        TimelineView(.periodic(from: .now, by: 60)) { ctx in
                                            Text(contractAgo(date, now: ctx.date))
                                        }
                                        .font(.system(size: 15).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
                                    }
                                }
                                if !entry.sources.isEmpty {
                                    VStack(spacing: 0) {
                                        ForEach(Array(entry.sources.enumerated()), id: \.element.id) { index, source in
                                            if index > 0 {
                                                Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 44)
                                            }
                                            HStack {
                                                Label(sourceLabel(source), systemImage: sourceIcon(source))
                                                Spacer()
                                                Text("+\(source.amount)").monospacedDigit()
                                            }
                                            .font(.system(size: 16))
                                            .foregroundStyle(Color(hex: 0xAEAEB2))
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 6)
                                        }
                                    }
                                    .background(EvalColors.card2, in: .rect(cornerRadius: 12))
                                }
                            }
                        }
                        if xp.history.count > 3 {
                            Button { withAnimation(.snappy) { expanded.toggle() } } label: {
                                Label(expanded ? "Voir moins" : "Afficher plus", systemImage: expanded ? "chevron.up" : "chevron.down")
                                    .labelStyle(TrailingIconLabel())
                                    .font(.system(size: 18))
                                    .foregroundStyle(Color(hex: 0x8E8E93))
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        } else {
            ContractCard {
                Text(store.contracts.isLoading ? "Chargement…" : "XP du compte indisponible pour le moment.")
                    .font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
            }
        }
    }

    private func sourceLabel(_ source: RiotAccountXP.Source) -> String {
        source.id == "first-win-of-the-day" ? "Première victoire" : source.label
    }

    private func sourceIcon(_ source: RiotAccountXP.Source) -> String {
        source.id == "first-win-of-the-day" ? "star.fill" : source.icon
    }
}

private struct TrailingIconLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 6) { configuration.title; configuration.icon }
    }
}

private let kingdomCreditsIcon = URL(string: "https://media.valorant-api.com/currencies/85ca954a-41f2-ce94-9b45-8ca3dd39a00d/displayicon.png")

private struct CreditsIcon: View {
    var size: CGFloat = 16
    var body: some View {
        AsyncImage(url: kingdomCreditsIcon) { $0.image?.resizable().scaledToFit() }.frame(width: size, height: size)
    }
}

struct EvalAgentContractsSummary: View {
    @Environment(AppModel.self) private var model
    private var contracts: RiotContractsModel { model.valorant.contracts }

    var body: some View {
        VStack(spacing: 12) {
            ContractCard {
                Text("Contrats des agents").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text)
                Divider().overlay(EvalColors.text.opacity(0.08))
                HStack {
                    stat("\(contracts.agentsOwned)/\(contracts.agentsTotal)", "Déverrouillé")
                    stat("\(contracts.agentsCompleted)", "Terminé")
                }
                Divider().overlay(EvalColors.text.opacity(0.08))
                ProgressBar(value: Double(contracts.creditsSpent) / Double(max(1, contracts.creditsTotal)))
                HStack {
                    CreditsIcon()
                    Text("\(contractNumber(contracts.creditsSpent)) / \(contractNumber(contracts.creditsTotal))")
                    Spacer()
                    CreditsIcon()
                    Text(contractNumber(max(0, contracts.creditsTotal - contracts.creditsSpent))).fontWeight(.semibold).foregroundStyle(EvalColors.text)
                }
                .font(.system(size: 17).monospacedDigit())
                .foregroundStyle(Color(hex: 0x8E8E93))
            }
            NavigationLink { EvalAgentContractsView() } label: {
                Text("Voir les contrats des agents")
                    .font(.system(size: 20))
                    .foregroundStyle(EvalColors.text)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(EvalColors.card2, in: .capsule)
            }
            .buttonStyle(.plain)
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.system(size: 22, weight: .bold).monospacedDigit()).foregroundStyle(EvalColors.text)
            Text(label).font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
        }
        .frame(maxWidth: .infinity)
    }
}

struct EvalAgentContractsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    private var store: ValorantStore { model.valorant }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 14) {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                        .frame(width: 50, height: 50).background(EvalColors.card, in: .circle)
                }
                .buttonStyle(.plain)
                Text("Contrats des agents").font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text)
                Spacer()
                HStack(spacing: 8) {
                    Text(contractNumber(store.wallet.kc)).font(.system(size: 19, weight: .medium).monospacedDigit())
                    CreditsIcon(size: 22)
                }
                .foregroundStyle(EvalColors.text)
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(EvalColors.card, in: .capsule)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 8)

            ScrollView {
                VStack(spacing: 0) {
                    ForEach(Array(store.contracts.agentContracts.enumerated()), id: \.element.id) { index, agent in
                        NavigationLink { EvalAgentContractPage(agent: agent) } label: {
                        HStack(spacing: 14) {
                            AsyncImage(url: URL(string: agent.icon)) { $0.image?.resizable().scaledToFill() }
                                .frame(width: 52, height: 52)
                                .background(EvalColors.card2)
                                .clipShape(.rect(cornerRadius: 14))
                            VStack(alignment: .leading, spacing: 4) {
                                Text(agent.name).font(.system(size: 20, weight: .medium)).foregroundStyle(EvalColors.text)
                                HStack(spacing: 6) {
                                    if let cost = agent.nextCost {
                                        Image(systemName: "arrow.right.circle.fill")
                                        CreditsIcon(size: 14)
                                        Text(contractNumber(cost)).monospacedDigit()
                                    } else {
                                        Image(systemName: "checkmark.circle.fill")
                                        Text("Terminé")
                                    }
                                }
                                .font(.system(size: 16))
                                .foregroundStyle(Color(hex: 0x8E8E93))
                            }
                            Spacer()
                            ZStack {
                                Circle().stroke(EvalColors.text.opacity(0.12), lineWidth: 4)
                                Circle()
                                    .trim(from: 0, to: Double(agent.levelReached) / Double(max(1, agent.maxLevel)))
                                    .stroke(EvalAccent.color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                    .rotationEffect(.degrees(-90))
                                Text("\(agent.levelReached)").font(.system(size: 17, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                            }
                            .frame(width: 42, height: 42)
                            Image(systemName: "chevron.right").font(.system(size: 16, weight: .semibold)).foregroundStyle(Color(hex: 0x636366))
                        }
                        .padding(.horizontal, 18)
                        .frame(minHeight: 80)
                        .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                        if index < store.contracts.agentContracts.count - 1 {
                            Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 84)
                        }
                    }
                }
                .background(EvalColors.card, in: .rect(cornerRadius: 26))
                .padding(18)

                if store.contracts.agentContracts.isEmpty {
                    Text(store.contracts.isLoading ? "Chargement…" : "Contrats indisponibles pour le moment.")
                        .font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
        }
        .background(EvalColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.contracts.load(store.riot) }
    }
}
