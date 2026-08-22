import SwiftUI

struct AmbientBackground: View {
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if #available(iOS 18.0, *) {
                MeshGradient(
                    width: 3,
                    height: 3,
                    points: [
                        MeshPoint(x: 0, y: 0),
                        MeshPoint(x: 0.5, y: 0),
                        MeshPoint(x: 1, y: 0),
                        MeshPoint(x: 0, y: 0.5),
                        MeshPoint(x: 0.5, y: 0.5),
                        MeshPoint(x: 1, y: 0.5),
                        MeshPoint(x: 0, y: 1),
                        MeshPoint(x: 0.5, y: 1),
                        MeshPoint(x: 1, y: 1),
                    ],
                    colors: colorScheme == .dark ? [
                        Color(red: 0.05, green: 0.02, blue: 0.08),
                        Color(red: 0.08, green: 0.04, blue: 0.12),
                        Color(red: 0.03, green: 0.01, blue: 0.06),
                        Color(red: 0.01, green: 0.03, blue: 0.05),
                        Color(red: 0.10, green: 0.08, blue: 0.14),
                        Color(red: 0.04, green: 0.02, blue: 0.07),
                        Color(red: 0.02, green: 0.01, blue: 0.03),
                        Color(red: 0.06, green: 0.05, blue: 0.09),
                        Color(red: 0.02, green: 0.01, blue: 0.04),
                    ] : [
                        Color(red: 0.92, green: 0.94, blue: 0.96),
                        Color(red: 0.88, green: 0.90, blue: 0.94),
                        Color(red: 0.95, green: 0.93, blue: 0.96),
                        Color(red: 0.86, green: 0.88, blue: 0.92),
                        Color(red: 0.90, green: 0.92, blue: 0.95),
                        Color(red: 0.94, green: 0.92, blue: 0.96),
                        Color(red: 0.96, green: 0.95, blue: 0.97),
                        Color(red: 0.84, green: 0.86, blue: 0.90),
                        Color(red: 0.91, green: 0.93, blue: 0.95),
                    ]
                )
                .ignoresSafeArea()
                .opacity(0.65)
            } else {
                LinearGradient(
                    gradient: Gradient(colors: [
                        colorScheme == .dark
                            ? Color(red: 0.05, green: 0.03, blue: 0.08)
                            : Color(red: 0.92, green: 0.92, blue: 0.96),
                        colorScheme == .dark
                            ? Color(red: 0.02, green: 0.02, blue: 0.03)
                            : Color(red: 0.86, green: 0.88, blue: 0.92),
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
            }
        }
    }
}
