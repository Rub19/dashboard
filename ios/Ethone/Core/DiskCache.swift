import Foundation

/// Cache JSON local (dossier Caches) : l'app s'ouvre avec les dernières données même hors ligne.
enum DiskCache {
    private static var directory: URL {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("EthoneCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    private static func file(_ key: String) -> URL {
        let safe = key.replacingOccurrences(of: "[^A-Za-z0-9_.-]", with: "_", options: .regularExpression)
        return directory.appendingPathComponent(safe + ".json")
    }

    static func write<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder.api.encode(value) else { return }
        try? data.write(to: file(key), options: .atomic)
    }

    static func read<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = try? Data(contentsOf: file(key)) else { return nil }
        return try? JSONDecoder.api.decode(T.self, from: data)
    }

    static func clearAll() {
        try? FileManager.default.removeItem(at: directory)
    }
}
