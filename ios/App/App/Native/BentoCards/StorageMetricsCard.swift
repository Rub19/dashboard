import SwiftUI
import Charts

struct StorageMetric: Identifiable {
    let id = UUID()
    let label: String
    let value: Double
    let color: Color
}

struct StorageMetricsCard: View {
    let data: [StorageMetric] = [
        StorageMetric(label: "Notes", value: 120, color: .cyan),
        StorageMetric(label: "Tâches", value: 45, color: .purple),
        StorageMetric(label: "Fichiers", value: 320, color: .orange),
        StorageMetric(label: "Libre", value: 1515, color: .gray.opacity(0.4)),
    ]

    var used: Double { data.filter { $0.label != "Libre" }.reduce(0) { $0 + $1.value } }
    var total: Double { data.reduce(0) { $0 + $1.value } }

    var body: some View {
        LiquidGlassContainer {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "internaldrive")
                        .font(.title2)
                    Spacer()
                    Text("\(Int((used / total) * 100)) %")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text("Stockage")
                    .font(.headline)

                Chart(data) { metric in
                    SectorMark(
                        angle: .value("Quantité", metric.value),
                        innerRadius: .ratio(0.5),
                        angularInset: 2
                    )
                    .foregroundStyle(metric.color)
                }
                .frame(height: 120)

                HStack {
                    ForEach(data) { metric in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(metric.color)
                                .frame(width: 6, height: 6)
                            Text(metric.label)
                                .font(.caption2)
                            Spacer()
                        }
                    }
                }
            }
        }
    }
}
