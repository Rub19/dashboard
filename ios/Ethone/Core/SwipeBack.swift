import UIKit

/// Les écrans qui cachent la barre de navigation (E:VAL, en-têtes perso) perdent le swipe retour d'iOS.
/// On le rétablit partout : glisser de gauche à droite revient à l'écran précédent.
extension UINavigationController: @retroactive UIGestureRecognizerDelegate {
    override open func viewDidLoad() {
        super.viewDidLoad()
        interactivePopGestureRecognizer?.delegate = self
        // iOS 26 : swipe retour depuis n'importe où sur l'écran, pas seulement le bord.
        interactiveContentPopGestureRecognizer?.delegate = self
    }

    public func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        viewControllers.count > 1
    }
}
