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
            intent: ChangePresenceIntent26(),
            phrases: [
                "Changer ma présence ETHONE",
                "ETHONE présence en ligne",
                "Mettre à jour ma présence ETHONE"
            ],
            shortTitle: "Présence ETHONE",
            systemImageName: "person.fill"
        )
    }
}
