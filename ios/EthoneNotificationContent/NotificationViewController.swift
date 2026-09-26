import SwiftUI
import UIKit
import UserNotifications
import UserNotificationsUI

/// Interface personnalisée des notifications ETHONE (appui long / déploiement) : verre + icône de catégorie.
final class NotificationViewController: UIViewController, UNNotificationContentExtension {
    private var hosting: UIHostingController<NotificationCard>?

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content
        let card = NotificationCard(title: content.title, message: content.body, category: content.categoryIdentifier)

        hosting?.view.removeFromSuperview()
        hosting?.removeFromParent()

        let controller = UIHostingController(rootView: card)
        controller.view.backgroundColor = .clear
        addChild(controller)
        view.addSubview(controller.view)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        controller.didMove(toParent: self)
        hosting = controller
        preferredContentSize = CGSize(width: view.bounds.width, height: 120)
    }
}

private struct NotificationCard: View {
    let title: String
    let message: String
    let category: String

    private var symbol: String {
        switch category {
        case "ETHONE_TASK": return "checklist"
        case "ETHONE_HABIT": return "flame.fill"
        case "ETHONE_FOCUS": return "timer"
        default: return "bell.fill"
        }
    }

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.title2)
                .foregroundStyle(Color(red: 0.88, green: 0.11, blue: 0.35))
                .frame(width: 48, height: 48)
                .glassEffect(.regular, in: .circle)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline).lineLimit(2)
                if !message.isEmpty { Text(message).font(.subheadline).foregroundStyle(.secondary).lineLimit(3) }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity)
    }
}
