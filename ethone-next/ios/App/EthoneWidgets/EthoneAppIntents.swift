import AppIntents
import UIKit

struct CreateNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Créer une note ETHONE"
    static var description = IntentDescription("Crée rapidement une nouvelle note dans ETHONE.")

    @Parameter(title: "Titre")
    var title: String

    @Parameter(title: "Contenu")
    var body: String

    init() {}

    init(title: String, body: String) {
        self.title = title
        self.body = body
    }

    func perform() async throws -> some IntentResult {
        let url = URL(string: "ethone://notes/new?title=\(title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&body=\(body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

struct ActivateFocusIntent: AppIntent {
    static var title: LocalizedStringResource = "Activer le mode Focus ETHONE"
    static var description = IntentDescription("Lance une session de concentration dans ETHONE.")

    @Parameter(title: "Durée", default: 25)
    var minutes: Int

    init() {}

    init(minutes: Int) {
        self.minutes = minutes
    }

    func perform() async throws -> some IntentResult {
        let url = URL(string: "ethone://focus?minutes=\(minutes)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

struct ChangePresenceIntent: AppIntent {
    static var title: LocalizedStringResource = "Changer ma présence ETHONE"
    static var description = IntentDescription("Change le statut de présence dans ETHONE.")

    @Parameter(title: "Présence")
    var status: String

    init() {}

    init(status: String) {
        self.status = status
    }

    func perform() async throws -> some IntentResult {
        let url = URL(string: "ethone://system?status=\(status.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

@available(iOS 18.0, *)
@AssistantIntent(schema: .system.search)
struct EthoneSystemSearchIntent: AppIntent {
    var criteria: StringSearchCriteria

    func perform() async throws -> some IntentResult {
        let encoded = criteria.term.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone:///search?q=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

struct AddBrainIdeaFromSiriIntent: AppIntent {
    static var title: LocalizedStringResource = "Ajouter une idée Brain ETHONE"
    static var description = IntentDescription("Ajoute une idée dans le Brain ETHONE via Siri.")

    @Parameter(title: "Idée")
    var idea: String

    init() {}

    init(idea: String) {
        self.idea = idea
    }

    func perform() async throws -> some IntentResult {
        let shared = UserDefaults(suiteName: "group.dev.ethone.app")
        shared?.set(idea, forKey: "ethone_brain_idea")

        let encoded = idea.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://brain?idea=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}

struct OpenNoteFromSiriIntent: AppIntent {
    static var title: LocalizedStringResource = "Ouvrir une note ETHONE"
    static var description = IntentDescription("Ouvre une note spécifique dans ETHONE.")

    @Parameter(title: "Titre")
    var title: String

    init() {}

    init(title: String) {
        self.title = title
    }

    func perform() async throws -> some IntentResult {
        let encoded = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let url = URL(string: "ethone://notes?q=\(encoded)")!
        await MainActor.run {
            UIApplication.shared.open(url, options: [:])
        }
        return .result()
    }
}
