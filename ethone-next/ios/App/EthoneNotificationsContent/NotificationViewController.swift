import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet var label: UILabel?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        label = UILabel(frame: view.bounds)
        label?.numberOfLines = 0
        label?.textAlignment = .center
        label?.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        if let label = label {
            view.addSubview(label)
        }
    }

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content
        let info = content.userInfo

        let body = content.body
        let aura = info["aura"] as? String ?? "ETHONE"

        label?.text = "\(aura)\n\(body)"
    }

    func didReceive(_ response: UNNotificationResponse, completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {
        completion(.doNotDismiss)
    }
}
