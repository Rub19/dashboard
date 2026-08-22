import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(EthoneSpotlightPlugin())
        bridge?.registerPluginInstance(EthoneFocusPlugin())
    }
}
