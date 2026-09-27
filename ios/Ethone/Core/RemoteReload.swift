import SwiftUI

/// Recharge un écran quand l'une des tables suivies change ailleurs (site, autre appareil, bot).
private struct RemoteReload: ViewModifier {
    @Environment(AppModel.self) private var model
    let tables: [String]
    let action: () async -> Void

    func body(content: Content) -> some View {
        content.onChange(of: tables.map { model.remoteChanges[$0] ?? 0 }) { _, _ in
            Task { await action() }
        }
    }
}

extension View {
    func reloadOnRemoteChange(_ tables: [String], _ action: @escaping () async -> Void) -> some View {
        modifier(RemoteReload(tables: tables, action: action))
    }
}
