import ActivityKit
import Foundation

@MainActor
enum ValorantActivityManager {
    private static var lastState: ValorantActivityAttributes.ContentState?

    static func sync(_ store: ValorantStore) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        guard let state = state(store) else {
            lastState = nil
            for activity in Activity<ValorantActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            return
        }
        guard state != lastState else { return }
        lastState = state
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(state.phase == "ingame" ? 3600 : 900))
        if let running = Activity<ValorantActivityAttributes>.activities.first {
            await running.update(content)
        } else {
            _ = try? Activity.request(attributes: ValorantActivityAttributes(startedAt: Date()), content: content, pushType: nil)
        }
    }

    private static func state(_ store: ValorantStore) -> ValorantActivityAttributes.ContentState? {
        if let match = store.live.match {
            let puuid = store.riot.credentials?.puuid.lowercased()
            let me = match.players.first { $0.id == puuid }
            let presence = store.chat.selfPresence
            return .init(
                phase: match.isPregame ? "pregame" : "ingame",
                since: Date(),
                phaseEnd: match.phaseEnd,
                mode: RiotPartyModel.queueName(match.queueID),
                map: store.mapName(forPath: match.mapPath) ?? "",
                agent: me.flatMap { store.agentName(id: $0.agentID) } ?? "",
                ally: match.isPregame ? 0 : presence?.allyScore ?? 0,
                enemy: match.isPregame ? 0 : presence?.enemyScore ?? 0,
                attacking: match.myTeam == "Red"
            )
        }
        if let party = store.party.party, party.isQueueing {
            return .init(phase: "queue", since: party.queueEntry ?? Date(), phaseEnd: nil,
                         mode: RiotPartyModel.queueName(party.queueID), map: "", agent: "", ally: 0, enemy: 0, attacking: false)
        }
        return nil
    }
}
