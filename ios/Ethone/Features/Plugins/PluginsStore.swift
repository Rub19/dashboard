import Foundation
import Observation

@MainActor
@Observable
final class PluginsStore {
    private let installedKey = "ethone_installed_plugins"
    private let enabledKey = "ethone_enabled_plugins"
    private let favoritesKey = "ethone_favorite_plugins"

    var installedIds: Set<String> = []
    var enabledIds: Set<String> = []
    var favoriteIds: Set<String> = []

    init() {
        load()
    }

    private func load() {
        if let stored = UserDefaults.standard.stringArray(forKey: installedKey) {
            installedIds = Set(stored)
        } else {
            installedIds = ["widget-github-activity", "theme-minimal-monochrome"]
        }

        if let stored = UserDefaults.standard.stringArray(forKey: enabledKey) {
            enabledIds = Set(stored)
        } else {
            enabledIds = ["widget-github-activity", "theme-minimal-monochrome"]
        }

        if let stored = UserDefaults.standard.stringArray(forKey: favoritesKey) {
            favoriteIds = Set(stored)
        } else {
            favoriteIds = ["widget-github-activity", "widget-spotify-player"]
        }
    }

    private func save() {
        UserDefaults.standard.set(Array(installedIds), forKey: installedKey)
        UserDefaults.standard.set(Array(enabledIds), forKey: enabledKey)
        UserDefaults.standard.set(Array(favoriteIds), forKey: favoritesKey)
    }

    func isInstalled(_ id: String) -> Bool {
        installedIds.contains(id)
    }

    func isEnabled(_ id: String) -> Bool {
        enabledIds.contains(id)
    }

    func isFavorite(_ id: String) -> Bool {
        favoriteIds.contains(id)
    }

    func install(_ item: PluginItem) {
        installedIds.insert(item.id)
        enabledIds.insert(item.id)
        save()
    }

    func uninstall(_ item: PluginItem) {
        installedIds.remove(item.id)
        enabledIds.remove(item.id)
        save()
    }

    func toggleEnabled(_ item: PluginItem) {
        if enabledIds.contains(item.id) {
            enabledIds.remove(item.id)
        } else {
            enabledIds.insert(item.id)
        }
        save()
    }

    func toggleFavorite(_ item: PluginItem) {
        if favoriteIds.contains(item.id) {
            favoriteIds.remove(item.id)
        } else {
            favoriteIds.insert(item.id)
        }
        save()
    }
}
