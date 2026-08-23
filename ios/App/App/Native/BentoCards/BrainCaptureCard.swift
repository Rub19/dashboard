import SwiftUI
import UIKit

struct BrainCaptureCard: View {
    @State private var prompt = ""
    @State private var isDictating = false
    @State private var noteSaved = 0

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
                        HapticManager.shared.playGlassTap()
                    } label: {
                        Image(systemName: isDictating ? "mic.fill" : "mic")
                            .foregroundStyle(isDictating ? .red : .primary)
                    }
                    .ethoneSensoryFeedback(.selection, trigger: isDictating)
                }

                Text("Brain")
                    .font(.headline)

                TextField("Idée rapide…", text: $prompt, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...4)

                HStack {
                    Spacer()
                    Button {
                        noteSaved += 1
                        prompt = ""
                    } label: {
                        Text("Envoyer")
                            .font(.caption.weight(.semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(prompt.isEmpty)
                    .ethoneSensoryFeedback(.impact(weight: .medium), trigger: noteSaved)
                    .contextMenu {
                        Button("Copier") { UIPasteboard.general.string = prompt }
                        Button("Effacer") { prompt = "" }
                    }
                }
            }
        }
    }
}
