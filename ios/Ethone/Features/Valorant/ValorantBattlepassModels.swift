import Foundation

struct ValorantBattlepassLevel: Identifiable, Hashable {
    let id: String
    let chapter: Int
    let level: Int
    let name: String
    let rewardType: String
    let rewardUUID: String
    let iconURL: String
    let xpCost: Int
    let isFree: Bool
}

struct ValorantMissionItem: Identifiable, Hashable {
    let id: String
    let title: String
    let type: String
    let xpGrant: Int
    let progressToComplete: Int
}
