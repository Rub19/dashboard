import PencilKit
import SwiftUI

/// Freeform-style canvas: finger or Apple Pencil, with Apple's tool palette.
struct DrawingCanvas: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    let canvas: PKCanvasView

    func makeUIView(context: Context) -> PKCanvasView {
        canvas.drawing = drawing
        canvas.drawingPolicy = .anyInput
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.alwaysBounceVertical = true
        canvas.delegate = context.coordinator
        canvas.tool = PKInkingTool(.pen, color: .label, width: 4)
        let picker = context.coordinator.picker
        picker.setVisible(true, forFirstResponder: canvas)
        picker.addObserver(canvas)
        DispatchQueue.main.async { canvas.becomeFirstResponder() }
        return canvas
    }

    func updateUIView(_ view: PKCanvasView, context: Context) {
        if view.drawing != drawing { view.drawing = drawing }
    }

    func makeCoordinator() -> Coordinator { Coordinator(drawing: $drawing) }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        var drawing: Binding<PKDrawing>
        let picker = PKToolPicker()
        init(drawing: Binding<PKDrawing>) { self.drawing = drawing }
        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) { drawing.wrappedValue = canvasView.drawing }
    }
}

struct ScratchpadView: View {
    @Environment(AppModel.self) private var model
    @State private var text = ""
    @State private var loaded = false
    @State private var lastSaved = ""
    @State private var status = "Enregistré"
    @State private var errorMessage: String?
    @State private var exportMessage: String?
    @AppStorage("ethone.scratchpad.mode") private var mode = "text"
    @State private var drawing = PKDrawing()
    @State private var canvas = PKCanvasView()

    private static var drawingURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("scratchpad.drawing")
    }

    private var drawingImage: Image {
        let bounds = drawing.bounds.isEmpty ? CGRect(x: 0, y: 0, width: 400, height: 400) : drawing.bounds.insetBy(dx: -24, dy: -24)
        return Image(uiImage: drawing.image(from: bounds, scale: 3))
    }

    private var words: Int { text.split { $0.isWhitespace }.count }

    var body: some View {
        VStack(spacing: 0) {
            Picker("Mode", selection: $mode) {
                Label("Texte", systemImage: "text.alignleft").tag("text")
                Label("Dessin", systemImage: "pencil.tip.crop.circle").tag("draw")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            if mode == "draw" {
                DrawingCanvas(drawing: $drawing, canvas: canvas)
                    .background(.thinMaterial, in: .rect(cornerRadius: 22))
                    .clipShape(.rect(cornerRadius: 22))
                    .padding(.horizontal, 16)
                    .accessibilityLabel("Zone de dessin")
                    .onChange(of: drawing) { _, value in
                        try? value.dataRepresentation().write(to: Self.drawingURL, options: .atomic)
                    }
            } else {
                TextEditor(text: $text)
                    .scrollContentBackground(.hidden)
                    .padding(12)
                    .glassEffect(.regular, in: .rect(cornerRadius: 22))
                    .padding(.horizontal, 16)
                    .accessibilityLabel("Bloc-notes")
            }

            HStack {
                Text("\(plural(words, "mot", "mots")), \(plural(text.count, "caractère", "caractères"))").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Text(errorMessage ?? status).font(.caption).foregroundStyle(errorMessage == nil ? Color.secondary : Theme.danger)
                    .contentTransition(.opacity)
                    .animation(Motion.swap, value: status)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)

            if let exportMessage {
                Text(exportMessage).font(.footnote).foregroundStyle(Theme.success).padding(.bottom, 6)
            }
        }
        .navigationTitle("Scratchpad")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Créer une note", systemImage: "note.text") { Task { await export(asTask: false) } }
                    Button("Créer une tâche", systemImage: "checkmark.circle") { Task { await export(asTask: true) } }
                    Button("Vider", systemImage: "trash", role: .destructive) { text = "" }
                } label: { Image(systemName: "ellipsis.circle") }
                .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && text.isEmpty)
            }
        }
        .toolbar {
            if mode == "draw" {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button { canvas.undoManager?.undo() } label: { Image(systemName: "arrow.uturn.backward") }
                        .accessibilityLabel("Annuler")
                    ShareLink(item: drawingImage, preview: SharePreview("Dessin ETHONE", image: drawingImage)) { Image(systemName: "square.and.arrow.up") }
                        .disabled(drawing.strokes.isEmpty)
                    Button(role: .destructive) { drawing = PKDrawing() } label: { Image(systemName: "trash") }
                        .accessibilityLabel("Effacer le dessin")
                        .disabled(drawing.strokes.isEmpty)
                }
            }
        }
        .task {
            if let data = try? Data(contentsOf: Self.drawingURL), let saved = try? PKDrawing(data: data) { drawing = saved }
            guard !loaded else { return }
            do {
                if let remote = try await UserStateClient(api: model.api).value("scratchpad")?.stringValue {
                    text = remote
                    lastSaved = remote
                }
                errorMessage = nil
            } catch {
                errorMessage = "Chargement impossible"
            }
            loaded = true
        }
        .reloadOnRemoteChange(["ethone_user_state"]) { await pullRemote() }
        .task(id: text) {
            guard loaded, text != lastSaved else { return }
            status = "Modifié…"
            try? await Task.sleep(for: .seconds(1))
            guard !Task.isCancelled else { return }
            do {
                try await UserStateClient(api: model.api).set("scratchpad", .string(text))
                lastSaved = text
                status = "Enregistré"
                errorMessage = nil
            } catch {
                errorMessage = "Erreur d'enregistrement"
            }
        }
    }

    private func pullRemote() async {
        guard loaded, text == lastSaved else { return }
        if let remote = try? await UserStateClient(api: model.api).value("scratchpad")?.stringValue, remote != text {
            lastSaved = remote
            text = remote
        }
    }

    private func export(asTask: Bool) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let lines = trimmed.components(separatedBy: .newlines)
        let title = String((lines.first ?? "").prefix(asTask ? 100 : 80))
        let body = lines.count > 1 ? lines.dropFirst().joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines) : (asTask ? "" : trimmed)
        if asTask {
            let data: JSONValue = .object(["category": .string("Général"), "priority": .string("medium"), "dueDate": .string(ISODate.string(Date()))])
            _ = await model.tasks.create(title: title.isEmpty ? "Tâche Scratchpad" : title, body: body.isEmpty ? nil : body, data: data)
            exportMessage = "Tâche créée."
        } else {
            _ = await model.notes.create(title: title.isEmpty ? "Note Scratchpad" : title, body: body.isEmpty ? nil : body)
            exportMessage = "Note créée."
        }
    }
}

