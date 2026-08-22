import AppIntents

struct EthoneAppShortcuts: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: QuickNoteIntent(),
            phrases: [
                "Créer une note dans ETHONE",
                "Ajouter une note rapide à ETHONE",
                "ETHONE nouvelle note",
            ],
            shortTitle: "Nouvelle note ETHONE",
            systemImageName: "doc.text"
        )

        AppShortcut(
            intent: CaptureBrainIdeaIntent(),
            phrases: [
                "Ajouter une idée Brain dans ETHONE",
                "ETHONE capture une idée",
                "Noter une idée dans ETHONE",
            ],
            shortTitle: "Idée ETHONE",
            systemImageName: "brain"
        )

        AppShortcut(
            intent: ToggleFocusIntent(),
            phrases: [
                "Activer le mode Focus ETHONE",
                "Désactiver le mode Focus ETHONE",
                "Basculer le Focus ETHONE",
            ],
            shortTitle: "Focus ETHONE",
            systemImageName: "target"
        )
    }
}
