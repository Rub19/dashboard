import Foundation
import WidgetKit

@MainActor
enum ValorantWidgetPublisher {
    private static var iconCache: [Int: Data] = [:]

    static func publish(_ store: ValorantStore) async {
        guard store.riot.isLinked else { return }
        let tier = store.liveRank?.tier ?? store.profile?.tier ?? 0
        var icon = iconCache[tier]
        if icon == nil, tier > 0, let url = ValorantProfile.tierIcon(tier), let (data, _) = try? await URLSession.shared.data(from: url) {
            iconCache[tier] = data
            icon = data
        }
        let levels = store.battlepassLevels.count
        let progress = store.battlepassLevelXP > 0 ? Double(store.battlepassCurrentXP) / Double(store.battlepassLevelXP) : 0
        let snapshot = ValorantWidgetSnapshot(
            updatedAt: Date(),
            name: store.riot.credentials?.gameName ?? store.playerName,
            tag: store.riot.credentials?.tagLine ?? store.tag,
            tier: tier,
            rankName: EvalRanks.name(tier),
            rankColor: EvalRanks.color(tier),
            rr: store.liveRank?.rr ?? store.profile?.rr ?? 0,
            rankIcon: icon,
            battlepassLevel: store.battlepassCurrentLevel,
            battlepassMax: levels,
            battlepassProgress: min(1, max(0, progress)),
            offers: store.storeOffers.map { .init(name: $0.name, price: $0.price, colorHex: $0.colorHex) },
            offersEnd: store.offersEnd
        )
        snapshot.save()
        WidgetCenter.shared.reloadTimelines(ofKind: "ValorantWidget")
    }
}
