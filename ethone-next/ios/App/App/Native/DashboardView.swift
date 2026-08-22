import SwiftUI

struct DashboardView: View {
    @StateObject private var service = SupabaseService()

    let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("ETHONE")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(.primary)

                Text("Tableau de bord natif")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: columns, spacing: 12) {
                    FocusCardView()
                    TasksCardView(service: service)
                    BrainCardView()
                    StorageCardView()
                }

                if let error = service.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding()
                }
            }
            .padding()
        }
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color.black, Color(red: 0.06, green: 0.06, blue: 0.08)]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
        .onAppear {
            Task {
                await service.fetchAll()
            }
        }
    }
}
