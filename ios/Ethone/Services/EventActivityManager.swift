import ActivityKit
import Foundation

@MainActor
enum EventActivityManager {
    private static let lead: TimeInterval = 3600

    static func sync(events: [Item]) async {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let now = Date()
        let candidate = events
            .compactMap { event -> (Item, Date, Date)? in
                guard let start = event.startAt else { return nil }
                let end = event.endAt ?? start.addingTimeInterval(3600)
                guard end > now, start.timeIntervalSince(now) <= lead else { return nil }
                return (event, start, end)
            }
            .min { $0.1 < $1.1 }

        for activity in Activity<EventActivityAttributes>.activities where activity.attributes.eventId != candidate?.0.id {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
        guard let (event, start, end) = candidate else { return }

        let state = EventActivityAttributes.ContentState(startDate: start, endDate: end)
        let content = ActivityContent(state: state, staleDate: end)
        if let running = Activity<EventActivityAttributes>.activities.first(where: { $0.attributes.eventId == event.id }) {
            await running.update(content)
        } else {
            _ = try? Activity.request(attributes: EventActivityAttributes(eventId: event.id, title: event.title), content: content, pushType: nil)
        }
    }
}

