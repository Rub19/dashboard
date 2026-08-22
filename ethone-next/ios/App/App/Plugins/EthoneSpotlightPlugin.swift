import Capacitor
import CoreSpotlight
import MobileCoreServices

@objc(EthoneSpotlightPlugin)
public class EthoneSpotlightPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EthoneSpotlightPlugin"
    public let jsName = "EthoneSpotlight"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "indexItems", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteItems", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteAllItems", returnType: CAPPluginReturnPromise),
    ]

    @objc func indexItems(_ call: CAPPluginCall) {
        guard let items = call.getArray("items") as? [[String: Any]] else {
            call.reject("Missing items array")
            return
        }

        var searchableItems: [CSSearchableItem] = []
        for item in items {
            guard let id = item["id"] as? String,
                  let title = item["title"] as? String,
                  let contentType = item["contentType"] as? String,
                  let urlString = item["url"] as? String else { continue }

            let attributeSet = CSSearchableItemAttributeSet(itemContentType: contentType as String)
            attributeSet.title = title
            attributeSet.contentDescription = item["description"] as? String
            attributeSet.thumbnailData = (item["thumbnailData"] as? String)?.data(using: .utf8)

            let searchableItem = CSSearchableItem(uniqueIdentifier: id, domainIdentifier: "dev.ethone.app", attributeSet: attributeSet)
            searchableItem.attributeSet.relatedUniqueIdentifier = urlString
            searchableItems.append(searchableItem)
        }

        CSSearchableIndex.default().indexSearchableItems(searchableItems) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["indexed": searchableItems.count])
            }
        }
    }

    @objc func deleteItems(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids") as? [String] else {
            call.reject("Missing ids array")
            return
        }
        CSSearchableIndex.default().deleteSearchableItems(withIdentifiers: ids) { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["deleted": ids.count])
            }
        }
    }

    @objc func deleteAllItems(_ call: CAPPluginCall) {
        CSSearchableIndex.default().deleteAllSearchableItems { error in
            if let error = error {
                call.reject(error.localizedDescription)
            } else {
                call.resolve(["deletedAll": true])
            }
        }
    }
}
