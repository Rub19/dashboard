import Foundation

/// Description déclarative d'une page du panneau Discord : où lire sa vue d'ensemble, ses réglages, ses listes et ses actions
/// dans l'API du bot (les mêmes routes que le site). Le moteur générique (`ModuleScreen`) les affiche et les modifie.
struct AdminModuleSpec: Identifiable {
    enum Scope { case guild, bot }

    struct ConfigSpec {
        let title: String
        let get: String
        let put: String
        var method: String = "PUT"
        /// Si vrai, le réglage n'est modifiable que si la réponse contient une clé `config`/`settings` (sinon on ne sait pas isoler les réglages).
        var strict = false
    }

    struct RowAction {
        let title: String
        /// `{id}` est remplacé par l'identifiant de la ligne.
        let path: String
        var method: String = "POST"
        var destructive = false
        var symbol = "bolt.fill"
        var body: [String: JSONValue] = [:]
    }

    struct ListSpec {
        let title: String
        let path: String
        var key: String? = nil
        var idKey = "id"
        /// Écran dédié à ouvrir au toucher d'une ligne (`formResponses`, `eventParticipants`) ; sinon le détail générique.
        var drill: String? = nil
        var rowActions: [RowAction] = []
    }

    struct ActionSpec {
        let title: String
        let path: String
        var method: String = "POST"
        var destructive = false
        var body: [String: JSONValue] = [:]
        var symbol = "bolt.fill"
    }

    let id: String
    let title: String
    let symbol: String
    let group: String
    var scope: Scope = .guild
    /// Chemin relatif à `api/`, avec `{g}` pour l'identifiant du serveur. Par défaut `guilds/{g}/<id>`.
    var base: String? = nil
    var overview: String? = "/overview"
    var configs: [ConfigSpec] = []
    var lists: [ListSpec] = []
    var actions: [ActionSpec] = []

    func url(_ sub: String, guildId: String) -> String {
        let root = (base ?? "guilds/{g}/\(id)").replacingOccurrences(of: "{g}", with: guildId)
        return "api/" + root + (sub == "/" ? "" : sub)
    }
}

enum AdminCatalog {
    static let groups = ["Modération et sécurité", "Communauté", "Engagement", "Serveur", "IA, musique et vocal", "Bot (propriétaire)"]

    static let all: [AdminModuleSpec] = guild + bot

    static let guild: [AdminModuleSpec] = moderation + community + engagement + serverGroup + media

    static let moderation: [AdminModuleSpec] = [
        .init(id: "automod", title: "AutoMod", symbol: "shield.checkered", group: groups[0],
              lists: [.init(title: "Règles", path: "/rules"), .init(title: "Historique", path: "/history")]),
        // Règles d'auto-modération natives de Discord : exécutées par Discord lui-même, même si le bot est hors ligne.
        .init(id: "automod-native", title: "AutoMod natif Discord", symbol: "checkmark.shield.fill", group: groups[0], overview: nil,
              lists: [.init(title: "Règles", path: "/", key: "rules", rowActions: [
                .init(title: "Activer / désactiver", path: "/{id}/toggle", method: "PATCH", symbol: "power"),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])],
              actions: [.init(title: "Créer les règles recommandées", path: "/recommended", symbol: "wand.and.stars")]),
        .init(id: "welcome", title: "Accueil et vérification", symbol: "hand.wave.fill", group: groups[0],
              configs: [
                .init(title: "Accueil", get: "/", put: "/", method: "PATCH"),
                .init(title: "Vérification", get: "/verification", put: "/verification"),
                .init(title: "Onboarding", get: "/onboarding", put: "/onboarding"),
              ],
              lists: [.init(title: "Modèles", path: "/templates")]),
        .init(id: "report-system", title: "Signalements", symbol: "exclamationmark.bubble.fill", group: groups[0], overview: nil,
              configs: [.init(title: "Réglages", get: "/config", put: "/config")]),
        .init(id: "secure-roles", title: "Rôles sécurisés", symbol: "lock.shield.fill", group: groups[0]),
        .init(id: "logs", title: "Journaux (réglages)", symbol: "list.bullet.clipboard.fill", group: groups[0],
              configs: [.init(title: "Journaux", get: "/config", put: "/config")]),
    ]

    static let community: [AdminModuleSpec] = [
        .init(id: "reminders", title: "Rappels", symbol: "bell.fill", group: groups[1],
              lists: [.init(title: "Rappels", path: "/list", rowActions: [.init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash")])]),
        .init(id: "tags", title: "Tags", symbol: "tag.fill", group: groups[1],
              lists: [.init(title: "Tags", path: "/list", idKey: "name", rowActions: [.init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash")])]),
        .init(id: "custom-commands", title: "Commandes personnalisées", symbol: "terminal.fill", group: groups[1], overview: nil,
              lists: [.init(title: "Commandes", path: "/list", rowActions: [
                .init(title: "Activer / désactiver", path: "/{id}/toggle", symbol: "power"),
                .init(title: "Dupliquer", path: "/{id}/duplicate", symbol: "plus.square.on.square"),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])]),
        .init(id: "polls", title: "Sondages", symbol: "chart.bar.doc.horizontal.fill", group: groups[1],
              lists: [.init(title: "Sondages", path: "/", key: "polls", idKey: "id", rowActions: [
                .init(title: "Publier", path: "/{id}/publish", symbol: "paperplane.fill"),
                .init(title: "Mettre en pause", path: "/{id}/pause", symbol: "pause.fill"),
                .init(title: "Reprendre", path: "/{id}/resume", symbol: "play.fill"),
                .init(title: "Terminer", path: "/{id}/end", destructive: true, symbol: "stop.fill"),
                .init(title: "Dupliquer", path: "/{id}/duplicate", symbol: "plus.square.on.square"),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])]),
        .init(id: "events", title: "Événements", symbol: "calendar.badge.clock", group: groups[1], overview: "/stats/overview",
              lists: [.init(title: "Événements", path: "/", key: "events", drill: "eventParticipants", rowActions: [
                .init(title: "Dupliquer", path: "/{id}/duplicate", symbol: "plus.square.on.square"),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])]),
        .init(id: "forms", title: "Formulaires", symbol: "doc.text.fill", group: groups[1],
              lists: [.init(title: "Formulaires (toucher pour lire les réponses)", path: "/", key: "forms", drill: "formResponses", rowActions: [
                .init(title: "Publier", path: "/{id}/publish", symbol: "paperplane.fill"),
                .init(title: "Dupliquer", path: "/{id}/duplicate", symbol: "plus.square.on.square"),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])]),
        .init(id: "birthdays", title: "Anniversaires", symbol: "birthday.cake.fill", group: groups[1],
              configs: [.init(title: "Réglages", get: "/config", put: "/config")],
              lists: [.init(title: "Anniversaires", path: "/list")]),
        .init(id: "afk", title: "AFK", symbol: "moon.zzz.fill", group: groups[1],
              configs: [.init(title: "Réglages", get: "/config", put: "/config")]),
        .init(id: "counting", title: "Comptage", symbol: "number.circle.fill", group: groups[1],
              configs: [.init(title: "Réglages", get: "/overview", put: "/config", strict: true)],
              actions: [.init(title: "Remettre le compteur à zéro", path: "/reset", destructive: true, symbol: "arrow.counterclockwise")]),
        .init(id: "starboard", title: "Starboard", symbol: "star.fill", group: groups[1],
              configs: [.init(title: "Réglages", get: "/config", put: "/config")],
              lists: [.init(title: "Messages épinglés", path: "/entries")]),
        .init(id: "sticky", title: "Messages épinglés (sticky)", symbol: "pin.fill", group: groups[1]),
        .init(id: "highlights", title: "Highlights", symbol: "highlighter", group: groups[1]),
        .init(id: "suggestions", title: "Suggestions (réglages)", symbol: "lightbulb.fill", group: groups[1],
              configs: [.init(title: "Réglages", get: "/config/settings", put: "/config/settings")]),
    ]

    static let engagement: [AdminModuleSpec] = [
        .init(id: "economy", title: "Économie", symbol: "banknote.fill", group: groups[2],
              configs: [.init(title: "Réglages", get: "/config", put: "/config", method: "PATCH")],
              lists: [
                .init(title: "Classement", path: "/leaderboard"),
                .init(title: "Boutique", path: "/shop", key: "items", idKey: "id", rowActions: [.init(title: "Supprimer", path: "/shop/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Transactions", path: "/transactions"),
              ]),
        .init(id: "leveling", title: "Niveaux", symbol: "chart.line.uptrend.xyaxis", group: groups[2],
              configs: [.init(title: "Réglages", get: "/config", put: "/config", method: "PATCH")],
              lists: [
                .init(title: "Classement", path: "/leaderboard"),
                .init(title: "Récompenses", path: "/rewards", idKey: "id", rowActions: [.init(title: "Supprimer", path: "/rewards/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Boosts d'XP", path: "/boosts", idKey: "id", rowActions: [.init(title: "Supprimer", path: "/boosts/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
              ],
              actions: [.init(title: "Réinitialiser tous les niveaux", path: "/reset", destructive: true, symbol: "arrow.counterclockwise")]),
        .init(id: "invites", title: "Invitations", symbol: "person.badge.plus.fill", group: groups[2],
              configs: [.init(title: "Réglages", get: "/settings", put: "/settings")],
              lists: [
                .init(title: "Classement", path: "/leaderboard"), .init(title: "Liens", path: "/links"),
                .init(title: "Récompenses", path: "/rewards", rowActions: [.init(title: "Supprimer", path: "/rewards/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Campagnes", path: "/campaigns"),
              ],
              actions: [.init(title: "Synchroniser les invitations", path: "/sync", symbol: "arrow.triangle.2.circlepath")]),
        .init(id: "stats", title: "Statistiques d'activité", symbol: "chart.xyaxis.line", group: groups[2],
              configs: [.init(title: "Réglages", get: "/config", put: "/config")],
              lists: [.init(title: "Classement", path: "/leaderboard")]),
        .init(id: "server-stats", title: "Salons de statistiques", symbol: "gauge.with.dots.needle.67percent", group: groups[2],
              configs: [.init(title: "Réglages", get: "/config", put: "/config")],
              actions: [.init(title: "Rafraîchir les salons", path: "/refresh", symbol: "arrow.triangle.2.circlepath")]),
        .init(id: "statroles", title: "Rôles automatiques par statistiques", symbol: "person.crop.circle.badge.checkmark", group: groups[2],
              actions: [.init(title: "Lancer maintenant", path: "/run", symbol: "play.fill")]),
        .init(id: "analytics", title: "Analytique du serveur", symbol: "chart.pie.fill", group: groups[2]),
        .init(id: "calendar", title: "Calendrier du serveur", symbol: "calendar", group: groups[2], overview: nil,
              lists: [.init(title: "Calendrier", path: "/")]),
    ]

    static let serverGroup: [AdminModuleSpec] = [
        .init(id: "server", title: "Serveur", symbol: "server.rack", group: groups[3],
              configs: [.init(title: "Réglages du serveur", get: "/settings", put: "/settings")],
              lists: [
                .init(title: "Santé", path: "/health"),
                .init(title: "Salons", path: "/channels", key: "channels", rowActions: [.init(title: "Supprimer", path: "/channels/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Rôles", path: "/roles", key: "roles", rowActions: [.init(title: "Supprimer", path: "/roles/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Émojis", path: "/emojis", rowActions: [.init(title: "Supprimer", path: "/emojis/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Webhooks", path: "/webhooks", rowActions: [.init(title: "Supprimer", path: "/webhooks/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Audit Discord", path: "/audit"),
              ]),
        .init(id: "roles", title: "Rôles à réaction et autorôles", symbol: "person.2.badge.gearshape.fill", group: groups[3], overview: nil,
              lists: [
                .init(title: "Autorôle", path: "/autorole"),
                .init(title: "Panneaux", path: "/panels", rowActions: [
                    .init(title: "Synchroniser", path: "/panels/{id}/sync", symbol: "arrow.triangle.2.circlepath"),
                    .init(title: "Dupliquer", path: "/panels/{id}/duplicate", symbol: "plus.square.on.square"),
                    .init(title: "Supprimer", path: "/panels/{id}", method: "DELETE", destructive: true, symbol: "trash"),
                ]),
              ]),
        .init(id: "backups", title: "Sauvegardes", symbol: "externaldrive.fill.badge.timemachine", group: groups[3],
              configs: [.init(title: "Réglages", get: "/settings", put: "/settings")],
              lists: [.init(title: "Sauvegardes", path: "/", key: "backups", idKey: "id", rowActions: [
                .init(title: "Protéger / déprotéger", path: "/{id}/protect", method: "PATCH", symbol: "lock.fill"),
                .init(title: "Tester", path: "/{id}/test", symbol: "checkmark.seal.fill"),
                .init(title: "Restaurer les éléments manquants", path: "/{id}/restore", destructive: true, symbol: "arrow.counterclockwise.circle.fill",
                      body: ["safetyLevel": .string("SAFE"), "mode": .string("RESTORE_MISSING")]),
                .init(title: "Supprimer", path: "/{id}", method: "DELETE", destructive: true, symbol: "trash"),
              ])]),
        .init(id: "settings", title: "Réglages généraux du bot", symbol: "gearshape.fill", group: groups[3], base: "guilds/{g}", overview: nil,
              configs: [.init(title: "Réglages", get: "/settings", put: "/settings", method: "PATCH")],
              lists: [.init(title: "Santé de la configuration", path: "/settings/health")]),
    ]

    static let media: [AdminModuleSpec] = [
        .init(id: "ai", title: "Assistant IA", symbol: "sparkles", group: groups[4],
              configs: [
                .init(title: "Personnalité", get: "/personality", put: "/personality"),
                .init(title: "Réglages", get: "/settings", put: "/settings"),
              ],
              lists: [
                .init(title: "Base de connaissances", path: "/knowledge", rowActions: [.init(title: "Supprimer", path: "/knowledge/{id}", method: "DELETE", destructive: true, symbol: "trash")]),
                .init(title: "Outils", path: "/tools"), .init(title: "Analytique", path: "/analytics"),
              ]),
        .init(id: "music", title: "Musique", symbol: "music.note.list", group: groups[4], overview: "/state",
              configs: [.init(title: "Réglages", get: "/settings", put: "/settings")],
              lists: [.init(title: "Playlists", path: "/playlists"), .init(title: "Favoris", path: "/favorites"), .init(title: "Historique", path: "/history")],
              actions: [
                .init(title: "Pause", path: "/pause", symbol: "pause.fill"), .init(title: "Reprendre", path: "/resume", symbol: "play.fill"),
                .init(title: "Piste suivante", path: "/skip", symbol: "forward.fill"), .init(title: "Piste précédente", path: "/previous", symbol: "backward.fill"),
                .init(title: "Arrêter", path: "/stop", destructive: true, symbol: "stop.fill"),
              ]),
        .init(id: "voice", title: "Salons vocaux", symbol: "waveform", group: groups[4],
              configs: [.init(title: "Réglages", get: "/settings", put: "/settings")],
              lists: [.init(title: "Hubs", path: "/hubs"), .init(title: "Salons actifs", path: "/rooms"), .init(title: "Sessions", path: "/sessions")]),
    ]

    static let bot: [AdminModuleSpec] = [
        .init(id: "control", title: "Centre de contrôle", symbol: "gauge.high", group: groups[5], scope: .bot, base: "bot",
              lists: [
                .init(title: "Commandes", path: "/commands"), .init(title: "Événements", path: "/events"),
                .init(title: "Tâches planifiées", path: "/jobs", rowActions: [.init(title: "Lancer maintenant", path: "/jobs/{id}/run", symbol: "play.fill")]),
                .init(title: "Erreurs", path: "/errors", idKey: "fingerprint", rowActions: [.init(title: "Marquer résolue", path: "/errors/{id}/resolve", symbol: "checkmark.circle.fill")]),
                .init(title: "Intégrations", path: "/integrations", rowActions: [.init(title: "Tester", path: "/integrations/{id}/test", symbol: "checkmark.seal.fill")]),
                .init(title: "Performance", path: "/performance"), .init(title: "Télémétrie", path: "/telemetry"),
                .init(title: "IA (usage)", path: "/ai"), .init(title: "Sécurité du bot", path: "/security"), .init(title: "Réglages du bot", path: "/settings"),
              ],
              actions: [
                .init(title: "Optimiser les performances", path: "/performance/optimize", symbol: "speedometer"),
                .init(title: "Redémarrer le bot", path: "/restart", destructive: true, symbol: "restart.circle.fill"),
                .init(title: "Mettre à jour le bot", path: "/update", destructive: true, symbol: "arrow.down.circle.fill"),
              ]),
        .init(id: "presence", title: "Présence du bot", symbol: "person.wave.2.fill", group: groups[5], scope: .bot, base: "bot/presence", overview: "/",
              lists: [
                .init(title: "Rotation", path: "/rotation"), .init(title: "Planning", path: "/schedule"),
                .init(title: "Profils", path: "/profiles", rowActions: [.init(title: "Appliquer", path: "/profiles/{id}/apply", symbol: "checkmark.circle.fill")]),
                .init(title: "Serveurs", path: "/servers"), .init(title: "Identité", path: "/identity"), .init(title: "Historique", path: "/history"),
              ]),
        .init(id: "owner-shield", title: "Owner Shield", symbol: "shield.lefthalf.filled.badge.checkmark", group: groups[5], scope: .bot, base: "bot/owner-shield", overview: "/status",
              configs: [.init(title: "Réglages", get: "/config", put: "/config", method: "POST")],
              actions: [
                .init(title: "Activer partout", path: "/enable-all", symbol: "checkmark.shield.fill"),
                .init(title: "Désactiver partout", path: "/disable-all", destructive: true, symbol: "xmark.shield.fill"),
              ]),
    ]
}
