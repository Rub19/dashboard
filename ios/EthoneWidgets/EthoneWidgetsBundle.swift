import SwiftUI
import WidgetKit

@main
struct EthoneWidgetsBundle: WidgetBundle {
    var body: some Widget {
        FocusLiveActivity()
        EventLiveActivity()
        ValorantLiveActivity()
        ValorantWidget()
        SummaryWidget()
        FocusControl()
        NewTaskControl()
        NewNoteControl()
    }
}
