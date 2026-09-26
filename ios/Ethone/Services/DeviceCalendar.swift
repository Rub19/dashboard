import EventKit
import Foundation
import Observation
import SwiftUI

struct DeviceEvent: Identifiable, Hashable {
    let id: String
    let title: String
    let start: Date
    let end: Date
    let isAllDay: Bool
    let calendarName: String
    let colorHex: UInt32
}

/// Calendrier de l'iPhone (EventKit) : lecture seule, affiché à côté des événements ETHONE.
@MainActor
@Observable
final class DeviceCalendar {
    private(set) var authorized = false
    private(set) var events: [DeviceEvent] = []
    @ObservationIgnored private let store = EKEventStore()

    func requestAccess() async {
        do {
            authorized = try await store.requestFullAccessToEvents()
        } catch {
            authorized = false
        }
    }

    func refreshAuthorization() {
        authorized = EKEventStore.authorizationStatus(for: .event) == .fullAccess
    }

    func clear() { events = [] }

    func load(from start: Date, to end: Date) {
        guard authorized else {
            events = []
            return
        }
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        events = store.events(matching: predicate).map { event in
            DeviceEvent(
                id: event.eventIdentifier ?? UUID().uuidString,
                title: event.title ?? "Sans titre",
                start: event.startDate,
                end: event.endDate,
                isAllDay: event.isAllDay,
                calendarName: event.calendar?.title ?? "",
                colorHex: Self.hex(from: event.calendar?.cgColor)
            )
        }
        .sorted { $0.start < $1.start }
    }

    private static func hex(from color: CGColor?) -> UInt32 {
        guard let color, let converted = color.converted(to: CGColorSpace(name: CGColorSpace.sRGB)!, intent: .defaultIntent, options: nil),
              let c = converted.components, c.count >= 3 else { return 0x8B5CF6 }
        let r = UInt32(max(0, min(1, c[0])) * 255)
        let g = UInt32(max(0, min(1, c[1])) * 255)
        let b = UInt32(max(0, min(1, c[2])) * 255)
        return (r << 16) | (g << 8) | b
    }
}
