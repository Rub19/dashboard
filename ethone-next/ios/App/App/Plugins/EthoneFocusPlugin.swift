import Capacitor
import WidgetKit

@objc(EthoneFocusPlugin)
public class EthoneFocusPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EthoneFocusPlugin"
    public let jsName = "EthoneFocus"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setFocusState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPresence", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getFocusState", returnType: CAPPluginReturnPromise),
    ]

    private let suite = UserDefaults(suiteName: "group.dev.ethone.app")

    @objc func setFocusState(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        suite?.set(active, forKey: "ethone_focus_active")
        if #available(iOS 18.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["active": active])
    }

    @objc func setPresence(_ call: CAPPluginCall) {
        let presence = call.getString("presence") ?? "En ligne"
        suite?.set(presence, forKey: "ethone_presence")
        if #available(iOS 18.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve(["presence": presence])
    }

    @objc func getFocusState(_ call: CAPPluginCall) {
        call.resolve([
            "active": suite?.bool(forKey: "ethone_focus_active") ?? false,
            "presence": suite?.string(forKey: "ethone_presence") ?? "En ligne",
        ])
    }
}
