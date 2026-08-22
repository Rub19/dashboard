import AppIntents

@available(iOS 26.0, *)
struct EthoneAppShortcuts26: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: CreateNoteIntent26(),
            phrases: [
                "Créer une note dans ETHONE",
                "ETHONE nouvelle note",
                "Ajouter une note ETHONE"
            ],
            shortTitle: "Nouvelle note ETHONE",
            systemImageName: "doc.text"
        )

        AppShortcut(
            intent: StartFocusSessionIntent(),
            phrases: [
                "Démarrer Focus ETHONE",
                "ETHONE session de concentration",
                "Lancer le focus ETHONE"
            ],
            shortTitle: "Focus ETHONE",
            systemImageName: "target"
        )

        AppShortcut(
            intent: OpenProjectIntent(),
            phrases: [
                "Ouvrir le projet dans ETHONE",
                "ETHONE ouvrir projet",
                "Montrer le projet ETHONE"
            ],
            shortTitle: "Ouvrir projet ETHONE",
            systemImageName: "folder"
        )

        AppShortcut(
            intent: CompleteTaskIntent26(),
            phrases: [
                "Marquer la tâche ETHONE terminée",
                "ETHONE tâche faite",
                "Terminer la tâche ETHONE"
            ],
            shortTitle: "Tâche ETHONE terminée",
            systemImageName: "checkmark.circle"
        )
    }
}
