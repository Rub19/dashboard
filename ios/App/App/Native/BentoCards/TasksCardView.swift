import SwiftUI

struct TasksCardView: View {
    @ObservedObject var service: SupabaseService

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "checkmark.circle")
                    .font(.title2)
                Spacer()
                Text("\(service.tasks.filter { $0.done }.count)/\(service.tasks.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("Tâches")
                .font(.headline)

            if service.tasks.isEmpty {
                Text("Aucune tâche")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(service.tasks.prefix(3)) { task in
                        Text(task.title)
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, minHeight: 140, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        .overlay(
                            LinearGradient(gradient: Gradient(colors: [Color.white.opacity(0.18), Color.clear]), startPoint: .top, endPoint: .bottom)
                                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        )
                )
        )
    }
}
