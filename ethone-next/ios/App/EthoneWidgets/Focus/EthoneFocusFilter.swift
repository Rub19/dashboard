import AppIntents

enum EthoneFocusMode: String, AppEnum {
    case work = "Travail"
    case personal = "Personnel"
    case zen = "Zen"

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Mode ETHONE"

    static var caseDisplayRepresentations: [EthoneFocusMode: DisplayRepresentation] = [
        .work: DisplayRepresentation(title: "Travail"),
        .personal: DisplayRepresentation(title: "Personnel"),
        .zen: DisplayRepresentation(title: "Zen"),
    ]
}

@available(iOS 17.0, *)
struct EthoneFocusFilter: SetFocusFilterIntent {
    static var title: LocalizedStringResource = "Filtre ETHONE"
    static var description = IntentDescription("Adapte le contenu ETHONE selon le mode de concentration.")

    @Parameter(title: "Mode ETHONE", default: .personal)
    var ethoneMode: EthoneFocusMode

    var displayRepresentation: DisplayRepresentation {
        ethoneMode.displayRepresentation
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")

        switch ethoneMode {
        case .work:
            shared?.set("work", forKey: "ethone_focus_filter")
            shared?.set(true, forKey: "ethone_filter_personal_notes")
            shared?.set(false, forKey: "ethone_zen_mode")
        case .personal:
            shared?.set("personal", forKey: "ethone_focus_filter")
            shared?.set(false, forKey: "ethone_filter_personal_notes")
            shared?.set(false, forKey: "ethone_zen_mode")
        case .zen:
            shared?.set("zen", forKey: "ethone_focus_filter")
            shared?.set(true, forKey: "ethone_zen_mode")
        }

        return .result()
    }
}
