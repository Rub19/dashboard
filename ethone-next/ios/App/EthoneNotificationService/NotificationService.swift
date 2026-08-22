import UserNotifications

@available(iOS 26.0, *)
class NotificationService: UNNotificationServiceExtension {
    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        if let bestAttemptContent, let userInfo = request.content.userInfo as? [String: Any] {
            if let badge = userInfo["badge"] as? Int {
                bestAttemptContent.badge = NSNumber(value: badge)
            }

            if let title = userInfo["title"] as? String, !title.isEmpty {
                bestAttemptContent.title = title
            }

            if let body = userInfo["body"] as? String, !body.isEmpty {
                bestAttemptContent.body = body
            }

            if let category = userInfo["category"] as? String, !category.isEmpty {
                bestAttemptContent.categoryIdentifier = category
            }
        }

        contentHandler(bestAttemptContent ?? request.content)
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }
}
