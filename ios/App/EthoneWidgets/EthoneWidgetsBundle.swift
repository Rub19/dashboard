import WidgetKit
import SwiftUI

@available(iOS 26.0, *)
@main
struct EthoneWidgetsBundle: WidgetBundle {
    var body: some Widget {
        EthoneWidget()
        EthoneStandByWidget()
        EthoneLiveActivity()
        EthoneFocusControl()
        EthoneNewNoteControl()
        EthoneBrainIdeaControl()
        EthonePresenceControl()
    }
}
