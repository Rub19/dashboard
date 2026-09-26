import UserNotifications

/// Enrichit les notifications push : pièce jointe image (`image_url` en HTTPS) et titre de secours.
/// Actif uniquement pour les push distants marqués `mutable-content` (nécessite un IPA signé côté APNs).
final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttempt = request.content.mutableCopy() as? UNMutableNotificationContent

        guard let content = bestAttempt else {
            contentHandler(request.content)
            return
        }
        if content.title.isEmpty { content.title = "ETHONE" }
        content.threadIdentifier = (request.content.userInfo["thread"] as? String) ?? content.threadIdentifier

        guard let raw = request.content.userInfo["image_url"] as? String, let url = URL(string: raw), url.scheme == "https" else {
            contentHandler(content)
            return
        }

        URLSession.shared.downloadTask(with: url) { location, _, _ in
            defer { contentHandler(content) }
            guard let location else { return }
            let destination = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
            do {
                try FileManager.default.moveItem(at: location, to: destination)
                let attachment = try UNNotificationAttachment(identifier: "image", url: destination)
                content.attachments = [attachment]
            } catch {
                // Sans image la notification reste lisible.
            }
        }.resume()
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttempt { contentHandler(bestAttempt) }
    }
}
