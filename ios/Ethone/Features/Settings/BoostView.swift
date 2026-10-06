import Network
import SwiftUI
import UIKit

struct BoostView: View {
    @Environment(AppModel.self) private var model
    @State private var cacheBytes: Int64 = 0
    @State private var freeBytes: Int64 = 0
    @State private var thermal = ProcessInfo.processInfo.thermalState
    @State private var lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
    @State private var batteryLevel: Float = -1
    @State private var batteryState: UIDevice.BatteryState = .unknown
    @State private var network = "…"
    @State private var expensive = false
    @State private var latencies: [(name: String, value: String)] = []
    @State private var measuring = false
    @State private var cleared = false

    @State private var monitor: NWPathMonitor?

    var body: some View {
        List {
            Section {
                LabeledContent("État thermique", value: Self.thermalLabel(thermal))
                LabeledContent("Mode économie d'énergie", value: lowPower ? "Activé" : "Désactivé")
                if batteryLevel >= 0 {
                    LabeledContent("Batterie", value: "\(Int(batteryLevel * 100)) %" + (batteryState == .charging ? " (en charge)" : ""))
                }
                LabeledContent("Mémoire de l'appareil", value: ByteCountFormatter.string(fromByteCount: Int64(ProcessInfo.processInfo.physicalMemory), countStyle: .memory))
                LabeledContent("Stockage disponible", value: ByteCountFormatter.string(fromByteCount: freeBytes, countStyle: .file))
                LabeledContent("Réseau", value: network + (expensive ? " (données limitées)" : ""))
            } header: { Text("Appareil").sectionTitle() } footer: {
                if thermal == .serious || thermal == .critical { Text("L'appareil chauffe : iOS réduit les performances. Laissez-le refroidir.") }
                else if lowPower { Text("Le mode économie d'énergie réduit l'actualisation en arrière-plan.") }
            }
            .listRowBackground(GlassRowBackground())

            Section {
                if latencies.isEmpty && !measuring {
                    Text("Aucune mesure pour le moment.").foregroundStyle(.secondary)
                }
                ForEach(latencies, id: \.name) { LabeledContent($0.name, value: $0.value) }
                Button {
                    Task { await measure() }
                } label: {
                    HStack { Text("Mesurer la latence"); if measuring { Spacer(); ProgressView() } }
                }
                .disabled(measuring)
            } header: { Text("Services ETHONE").sectionTitle() } footer: {
                Text("Temps d'un aller-retour réel vers chaque service depuis votre connexion actuelle.")
            }
            .listRowBackground(GlassRowBackground())

            Section {
                LabeledContent("Cache de l'app", value: ByteCountFormatter.string(fromByteCount: cacheBytes, countStyle: .file))
                Button("Vider le cache", role: .destructive) {
                    DiskCache.clearAll()
                    cleared = true
                    refresh()
                    Task { await model.refreshAll() }
                }
                if cleared { Text("Cache vidé, données rechargées depuis le serveur.").font(.footnote).foregroundStyle(Theme.success) }
            } header: { Text("Cache").sectionTitle() } footer: {
                Text("Le cache permet d'ouvrir l'app avec les dernières données hors ligne. Le vider ne supprime aucune donnée du compte.")
            }
            .listRowBackground(GlassRowBackground())
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("Performance")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .onAppear {
            UIDevice.current.isBatteryMonitoringEnabled = true
            refresh()
            startMonitor()
        }
        .onDisappear {
            monitor?.cancel()
            monitor = nil
        }
        .refreshable { refresh() }
    }

    private static func thermalLabel(_ state: ProcessInfo.ThermalState) -> String {
        switch state {
        case .nominal: "Normal"
        case .fair: "Légèrement chaud"
        case .serious: "Chaud"
        case .critical: "Critique"
        @unknown default: "Inconnu"
        }
    }

    private func refresh() {
        cacheBytes = DiskCache.sizeInBytes()
        thermal = ProcessInfo.processInfo.thermalState
        lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        batteryLevel = UIDevice.current.batteryLevel
        batteryState = UIDevice.current.batteryState
        let values = try? URL(fileURLWithPath: NSHomeDirectory()).resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        freeBytes = values?.volumeAvailableCapacityForImportantUsage ?? 0
    }

    private func startMonitor() {
        monitor?.cancel()
        let active = NWPathMonitor()
        monitor = active
        active.pathUpdateHandler = { path in
            let kind: String
            if path.status != .satisfied { kind = "Hors ligne" }
            else if path.usesInterfaceType(.wifi) { kind = "Wi-Fi" }
            else if path.usesInterfaceType(.cellular) { kind = "Cellulaire" }
            else if path.usesInterfaceType(.wiredEthernet) { kind = "Ethernet" }
            else { kind = "Connecté" }
            Task { @MainActor in
                network = kind
                expensive = path.isExpensive
            }
        }
        active.start(queue: DispatchQueue(label: "dev.ethone.boost.network"))
    }

    private func measure() async {
        measuring = true
        defer { measuring = false }
        var results: [(name: String, value: String)] = []
        let targets: [(String, URL)] = [
            ("API ETHONE (Worker)", Config.workerURL),
            ("Base de données (Supabase)", Config.supabaseURL.appendingPathComponent("auth/v1/health")),
            ("Bot Discord", Config.botURL),
        ]
        for (name, url) in targets {
            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.timeoutInterval = 8
            request.setValue(Config.supabaseAnonKey, forHTTPHeaderField: "apikey")
            let start = ContinuousClock.now
            do {
                _ = try await URLSession.shared.data(for: request)
                let elapsed = start.duration(to: .now)
                let milliseconds = Int(Double(elapsed.components.seconds) * 1000 + Double(elapsed.components.attoseconds) / 1e15)
                results.append((name, "\(milliseconds) ms"))
            } catch {
                results.append((name, "Injoignable"))
            }
        }
        latencies = results
    }
}

