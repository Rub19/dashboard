import SwiftUI

// MARK: - Page de niveaux (passe de saison, contrat d'agent)

struct ContractLevelRow: Identifiable, Hashable {
    enum State: Hashable { case done, current(Double, String), next, locked, free }
    enum Cost: Hashable { case xp, credits }

    let id: String
    let chapter: Int
    let number: Int?
    let type: String
    let uuid: String
    let amount: Int
    let cost: Cost
    let state: State
}

struct EvalContractLevelsPage: View {
    @Environment(\.dismiss) private var dismiss
    let title: String
    let rows: [ContractLevelRow]

    @State private var infos: [String: BattlepassRewardResolver.Info] = [:]
    @State private var preview: ContractLevelRow?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { dismiss() } label: {
                    Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                        .frame(width: 50, height: 50).background(EvalColors.card, in: .circle)
                }
                .buttonStyle(.plain)
                Spacer()
                Text(title).font(.system(size: 21, weight: .bold)).foregroundStyle(EvalColors.text).lineLimit(1).minimumScaleFactor(0.7)
                Spacer()
                Color.clear.frame(width: 50, height: 50)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 8)

            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    ForEach(chapters, id: \.self) { chapter in
                        Text("Chapitre \(chapter)").font(.system(size: 19, weight: .semibold)).foregroundStyle(Color(hex: 0x8E8E93)).padding(.leading, 20)
                        let items = rows.filter { $0.chapter == chapter }
                        VStack(spacing: 0) {
                            ForEach(Array(items.enumerated()), id: \.element.id) { index, row in
                                rowView(row)
                                if index < items.count - 1 { Divider().overlay(EvalColors.text.opacity(0.08)).padding(.leading, 98) }
                            }
                        }
                        .background(EvalColors.card, in: .rect(cornerRadius: 26))
                    }
                    if rows.isEmpty {
                        Text("Chargement…").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93)).frame(maxWidth: .infinity)
                    }
                }
                .padding(18)
                .padding(.bottom, 20)
            }
        }
        .background(EvalColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task(id: rows.count) { await resolve() }
        .sheet(item: $preview) { row in previewSheet(row).presentationDetents([.medium]) }
    }

    private var chapters: [Int] { Array(Set(rows.map(\.chapter))).sorted() }

    private func resolve() async {
        var pending: [String: String] = [:]
        for row in rows where infos[row.uuid] == nil && !row.uuid.isEmpty { pending[row.uuid] = row.type }
        await withTaskGroup(of: (String, BattlepassRewardResolver.Info?).self) { group in
            for (uuid, type) in pending {
                group.addTask { (uuid, await BattlepassRewardResolver.info(type: type, uuid: uuid)) }
            }
            for await (uuid, info) in group { if let info { infos[uuid] = info } }
        }
    }

    private func rowView(_ row: ContractLevelRow) -> some View {
        let info = infos[row.uuid]
        let canPreview = row.type != "Title" && !(info?.icon.isEmpty ?? true)
        return Button { if canPreview { preview = row } } label: {
            HStack(spacing: 16) {
                Group {
                    if row.type == "Title" {
                        EvalTitleBadge(size: 64)
                    } else {
                        AsyncImage(url: URL(string: info?.icon ?? "")) { $0.image?.resizable().scaledToFit() }
                    }
                }
                .frame(width: 64, height: 64)
                .clipShape(.rect(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 6) {
                    Text(info?.name ?? row.type).font(.system(size: 20)).foregroundStyle(EvalColors.text).lineLimit(2).multilineTextAlignment(.leading)
                    if row.state != .free { costLine(row) }
                }
                Spacer(minLength: 8)
                ring(row)
                Image(systemName: "chevron.right").font(.system(size: 16, weight: .semibold)).foregroundStyle(Color(hex: 0x636366))
                    .opacity(canPreview ? 1 : 0)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    private func costLine(_ row: ContractLevelRow) -> some View {
        HStack(spacing: 6) {
            switch row.state {
            case .done: Image(systemName: "checkmark.circle.fill")
            case .current, .next: Image(systemName: "arrow.right.circle.fill")
            default: Image(systemName: "circle.dotted")
            }
            if row.cost == .credits {
                AsyncImage(url: URL(string: "https://media.valorant-api.com/currencies/85ca954a-41f2-ce94-9b45-8ca3dd39a00d/displayicon.png")) { $0.image?.resizable().scaledToFit() }
                    .frame(width: 15, height: 15)
            }
            if case .current(_, let text) = row.state {
                Text(text)
            } else {
                Text(row.cost == .xp ? "\(row.amount.formatted()) XP" : row.amount.formatted())
            }
        }
        .font(.system(size: 17).monospacedDigit())
        .foregroundStyle(Color(hex: 0x8E8E93))
    }

    @ViewBuilder
    private func ring(_ row: ContractLevelRow) -> some View {
        if let number = row.number {
            ZStack {
                Circle().stroke(EvalColors.text.opacity(0.12), lineWidth: 4)
                switch row.state {
                case .done:
                    Circle().stroke(EvalAccent.color, lineWidth: 4)
                    Image(systemName: "checkmark").font(.system(size: 20, weight: .semibold)).foregroundStyle(EvalColors.text)
                case .current(let progress, _):
                    Circle().trim(from: 0, to: progress).stroke(EvalAccent.color, style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
                    Text("\(number)").font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                default:
                    Text("\(number)").font(.system(size: 18, weight: .semibold).monospacedDigit()).foregroundStyle(EvalColors.text)
                }
            }
            .frame(width: 46, height: 46)
        } else {
            Color.clear.frame(width: 46, height: 46)
        }
    }

    private func previewSheet(_ row: ContractLevelRow) -> some View {
        let info = infos[row.uuid]
        return VStack(spacing: 18) {
            AsyncImage(url: URL(string: info?.icon ?? "")) { $0.image?.resizable().scaledToFit() }
                .frame(maxWidth: .infinity, maxHeight: 220)
            Text(info?.name ?? "").font(.system(size: 24, weight: .bold)).foregroundStyle(EvalColors.text).multilineTextAlignment(.center)
            if let number = row.number {
                Text("Niveau \(number)").font(.system(size: 17)).foregroundStyle(Color(hex: 0x8E8E93))
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(EvalColors.card.ignoresSafeArea())
        .evalColorScheme()
    }
}

/// Passe de combat de l'acte en cours, chapitre par chapitre.
struct EvalSeasonPassPage: View {
    @Environment(AppModel.self) private var model
    @State private var contract: RiotContractCatalog.Contract?

    private var store: ValorantStore { model.valorant }

    var body: some View {
        EvalContractLevelsPage(title: store.battlepassTitle.isEmpty ? "Passe de combat" : store.battlepassTitle, rows: rows)
            .task {
                let catalog = await RiotContractCatalog.load()
                contract = catalog?.battlepass(actID: store.currentAct?.id) ?? catalog?.contracts.first { $0.id == RiotGameService.battlepassContract }
            }
    }

    private var rows: [ContractLevelRow] {
        guard let contract else { return [] }
        let reached = store.battlepassCurrentLevel
        var number = 0
        var out: [ContractLevelRow] = []
        for (index, level) in contract.levels.enumerated() {
            if level.isFree {
                out.append(ContractLevelRow(id: "free-\(index)", chapter: level.chapter, number: nil, type: level.type, uuid: level.uuid, amount: 0, cost: .xp, state: .free))
                continue
            }
            number += 1
            let state: ContractLevelRow.State
            if number <= reached {
                state = .done
            } else if number == reached + 1 {
                state = .current(Double(store.battlepassCurrentXP) / Double(max(1, level.xp)), "\(store.battlepassCurrentXP.formatted()) / \(level.xp.formatted())")
            } else {
                state = .locked
            }
            out.append(ContractLevelRow(id: "\(index)", chapter: level.chapter, number: number, type: level.type, uuid: level.uuid, amount: level.xp, cost: .xp, state: state))
        }
        return out
    }
}

/// Contrat d'un agent : niveaux à acheter en crédits de royaume.
struct EvalAgentContractPage: View {
    @Environment(AppModel.self) private var model
    let agent: RiotAgentContract

    private var store: ValorantStore { model.valorant }

    var body: some View {
        EvalContractLevelsPage(title: agent.name, rows: rows)
    }

    private var rows: [ContractLevelRow] {
        guard let contract = store.contracts.catalog?.contracts.first(where: { $0.id == agent.contractID }) else { return [] }
        var number = 0
        var out: [ContractLevelRow] = []
        for (index, level) in contract.levels.enumerated() {
            if level.isFree {
                out.append(ContractLevelRow(id: "free-\(index)", chapter: level.chapter, number: nil, type: level.type, uuid: level.uuid, amount: 0, cost: .credits, state: .free))
                continue
            }
            number += 1
            let state: ContractLevelRow.State = number <= agent.levelReached ? .done : (number == agent.levelReached + 1 ? .next : .locked)
            out.append(ContractLevelRow(id: "\(index)", chapter: level.chapter, number: number, type: level.type, uuid: level.uuid, amount: level.dough, cost: .credits, state: state))
        }
        return out
    }
}

// MARK: - Missions hebdomadaires à venir (dépliable, groupées par semaine)

struct EvalUpcomingMissionsCard: View {
    @Environment(AppModel.self) private var model
    @State private var expanded = false

    private var store: ValorantStore { model.valorant }

    private var weeks: [(date: Date, missions: [ValorantMissionItem])] {
        var grouped: [Date: [ValorantMissionItem]] = [:]
        for mission in store.upcomingMissions {
            guard let start = mission.activates else { continue }
            grouped[Calendar.current.startOfDay(for: start), default: []].append(mission)
        }
        return grouped.keys.sorted().map { (date: $0, missions: grouped[$0] ?? []) }
    }

    private static let relative: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "fr_FR")
        f.unitsStyle = .full
        return f
    }()

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Button { withAnimation(.snappy) { expanded.toggle() } } label: {
                HStack(spacing: 10) {
                    Text("\(store.upcomingMissions.count) missions hebdomadaires futures")
                        .font(.system(size: 19, weight: .semibold)).foregroundStyle(EvalColors.text).lineLimit(1).minimumScaleFactor(0.75)
                    Spacer(minLength: 6)
                    Text("+\(store.missionsReserveXP.formatted()) XP").font(.system(size: 16).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
                    Image(systemName: expanded ? "chevron.up" : "chevron.down").font(.system(size: 16, weight: .semibold)).foregroundStyle(EvalColors.text)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)

            if expanded {
                ForEach(weeks, id: \.date) { week in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(Self.relative.localizedString(for: week.date, relativeTo: Date()))
                                .font(.system(size: 19, weight: .semibold)).foregroundStyle(EvalColors.text)
                            Spacer()
                            Text("+\(week.missions.reduce(0) { $0 + $1.xpGrant }.formatted()) XP")
                                .font(.system(size: 16).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
                        }
                        Divider().overlay(EvalColors.text.opacity(0.08))
                        ForEach(week.missions) { mission in
                            HStack(alignment: .lastTextBaseline) {
                                Text(mission.title).font(.system(size: 18)).foregroundStyle(EvalColors.text)
                                Spacer(minLength: 8)
                                Text("+\(mission.xpGrant.formatted()) XP").font(.system(size: 16).monospacedDigit()).foregroundStyle(Color(hex: 0x8E8E93))
                            }
                        }
                    }
                    .padding(18)
                    .background(EvalColors.card2, in: .rect(cornerRadius: 20))
                }
                if weeks.isEmpty {
                    Text("Aucune mission annoncée pour la suite de l’acte.").font(.system(size: 16)).foregroundStyle(Color(hex: 0x8E8E93))
                }
            }
        }
        .padding(18)
        .background(EvalColors.card, in: .rect(cornerRadius: 24))
    }
}
