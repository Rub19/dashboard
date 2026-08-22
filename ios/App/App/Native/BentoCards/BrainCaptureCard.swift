import SwiftUI
import UIKit

struct BrainCaptureCard: View {
    @State private var prompt = ""
    @State private var isDictating = false

    var body: some View {
        LiquidGlassContainer {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.title2)
                        .foregroundStyle(.purple)
                    Spacer()
                    Button {
                        isDictating.toggle()
                        Haptic.medium()
                    } label: {
                        Image(systemName: isDictating ? "mic.fill" : "mic")
                            .foregroundStyle(isDictating ? .red : .primary)
                    }
                }

                Text("Brain")
                    .font(.headline)

                TextField("Idée rapide…", text: $prompt, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)

                HStack {
                    Spacer()
                    Button {
                        Haptic.success()
                        prompt = ""
                    } label: {
                        Text("Envoyer")
                            .font(.caption.weight(.semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(prompt.isEmpty)
                    .contextMenu {
                        Button("Copier") { UIPasteboard.general.string = prompt }
                        Button("Effacer") { prompt = "" }
                    }
                }
            }
        }
    }
}
