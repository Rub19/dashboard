import WidgetKit
import SwiftUI

@available(iOS 17.0, *)
@main
struct EthoneWidgetsBundle: WidgetBundle {
    var body: some Widget {
        EthoneWidget()
        EthoneStandByWidget()
        EthoneLiveActivity()
    }
}
