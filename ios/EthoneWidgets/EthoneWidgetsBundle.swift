import SwiftUI
import WidgetKit

@main
struct EthoneWidgetsBundle: WidgetBundle {
    var body: some Widget {
        FocusLiveActivity()
        EventLiveActivity()
        SummaryWidget()
        FocusControl()
        NewTaskControl()
        NewNoteControl()
    }
}
