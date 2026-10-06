import Foundation
import SwiftUI

enum PluginType: String, CaseIterable, Identifiable {
    case all = "Tous"
    case widget = "Widgets"
    case theme = "Thèmes"
    case layout = "Dispositions"
    case automation = "Automatisations"
    case brain = "IA Brain"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .all: "sparkles"
        case .widget: "square.grid.2x2.fill"
        case .theme: "paintpalette.fill"
        case .layout: "rectangle.3.group.fill"
        case .automation: "bolt.fill"
        case .brain: "brain.head.profile"
        }
    }
}

enum PluginVerification: String, Identifiable {
    case verified = "Vérifié"
    case core = "ETHONE Core"
    case community = "Communauté"

    var id: String { rawValue }

    var badgeColor: Color {
        switch self {
        case .core: Theme.accent
        case .verified: Theme.success
        case .community: Theme.accentSoft
        }
    }
}

struct PluginItem: Identifiable, Hashable {
    let id: String
    let name: String
    let type: PluginType
    let version: String
    let author: String
    let description: String
    let longDescription: String
    let symbol: String
    let verification: PluginVerification
    let rating: Double
    let reviewCount: Int
    let installCount: Int
    let lastUpdated: String
    let features: [String]
    let permissions: [String]
    let tags: [String]

    static let all: [PluginItem] = [
        PluginItem(
            id: "widget-github-activity",
            name: "GitHub Activity Live",
            type: .widget,
            version: "2.4.1",
            author: "ETHONE Core",
            description: "Commits, pull requests et streak de contributions GitHub en direct.",
            longDescription: "Affichez votre flux de commits, le statut de vos PRs et votre streak de contributions en temps réel avec micro-animations.",
            symbol: "chevron.left.forwardslash.chevron.right",
            verification: .core,
            rating: 4.9,
            reviewCount: 342,
            installCount: 14200,
            lastUpdated: "2026-08-30",
            features: [
                "Flux de commits en temps réel",
                "Indicateur de pull requests ouvertes",
                "Streak de contributions",
                "Raccourci 1-clic vers les dépôts",
            ],
            permissions: ["Lecture des contributions GitHub"],
            tags: ["github", "code", "dev", "git"]
        ),
        PluginItem(
            id: "widget-spotify-player",
            name: "Spotify Now Playing 3D",
            type: .widget,
            version: "3.1.0",
            author: "ETHONE Media",
            description: "Pochette d'album, contrôles de lecture et barre fluide synchronisée.",
            longDescription: "Contrôlez Spotify directement depuis votre tableau de bord. Profitez d'une vue interactive avec synchronisation de la lecture.",
            symbol: "music.note",
            verification: .core,
            rating: 4.9,
            reviewCount: 819,
            installCount: 28400,
            lastUpdated: "2026-09-01",
            features: [
                "Pochette d'album haute résolution",
                "Barre de progression fluide",
                "Contrôles Play / Pause / Skip",
                "Ambiance lumineuse synchronisée",
            ],
            permissions: ["Contrôle de lecture Spotify"],
            tags: ["spotify", "musique", "media", "audio"]
        ),
        PluginItem(
            id: "theme-tokyo-night",
            name: "Tokyo Night Neo",
            type: .theme,
            version: "2.0.4",
            author: "ETHONE Design",
            description: "Palette néon sombre inspirée de la nuit tokyoïte avec reflets violets et cyans.",
            longDescription: "Un thème d'ambiance nocturne haut de gamme avec des surfaces ultra-douces et des touches cyan et magenta délicatement équilibrées.",
            symbol: "moon.stars.fill",
            verification: .verified,
            rating: 4.9,
            reviewCount: 612,
            installCount: 22100,
            lastUpdated: "2026-08-25",
            features: [
                "Palette nocturne sombre haute lisibilité",
                "Accents cyan et néon magenta",
                "Dégradés maillés dynamiques",
            ],
            permissions: ["Apparence"],
            tags: ["thème", "dark", "tokyo", "néon"]
        ),
        PluginItem(
            id: "theme-minimal-monochrome",
            name: "Pure Monochrome",
            type: .theme,
            version: "3.0.0",
            author: "ETHONE Minimal",
            description: "Design épuré noir et blanc sans distraction pour une concentration maximale.",
            longDescription: "L'élégance du noir absolu et du blanc pur. Idéal pour travailler de nuit ou sur écran OLED.",
            symbol: "circle.lefthalf.filled",
            verification: .core,
            rating: 4.8,
            reviewCount: 420,
            installCount: 16800,
            lastUpdated: "2026-08-15",
            features: [
                "Contraste noir profond",
                "Typographie claire et nette",
                "Économie d'énergie pour écrans OLED",
            ],
            permissions: ["Apparence"],
            tags: ["thème", "minimal", "noir", "blanc"]
        ),
        PluginItem(
            id: "automation-smart-focus",
            name: "Focus Shield Pro",
            type: .automation,
            version: "1.8.0",
            author: "ETHONE Productivity",
            description: "Désactivation automatique des notifications et statut Discord synchronisé.",
            longDescription: "Active automatiquement le mode Ne Pas Déranger et actualise votre statut Discord lorsque vous démarrez une session de concentration.",
            symbol: "shield.lefthalf.filled",
            verification: .core,
            rating: 4.9,
            reviewCount: 512,
            installCount: 19800,
            lastUpdated: "2026-09-02",
            features: [
                "Mise en sourdine des notifications non critiques",
                "Mise à jour du statut Discord 'En concentration'",
                "Bilan de productivité automatique",
            ],
            permissions: ["Statut Discord", "Notifications"],
            tags: ["focus", "pomodoro", "automatisation", "discord"]
        ),
        PluginItem(
            id: "automation-daily-briefing",
            name: "Daily Briefing Express",
            type: .automation,
            version: "2.1.0",
            author: "ETHONE Automation",
            description: "Synthèse matinale quotidienne de votre agenda, météo et tâches clés.",
            longDescription: "Chaque matin, recevez un résumé concis comprenant la météo du jour, vos rendez-vous et vos 3 tâches prioritaires.",
            symbol: "sun.max.fill",
            verification: .verified,
            rating: 4.8,
            reviewCount: 388,
            installCount: 12500,
            lastUpdated: "2026-08-28",
            features: [
                "Résumé matinal à l'heure souhaitée",
                "Météo locale et prévisions",
                "Événements du calendrier et rappels",
            ],
            permissions: ["Calendrier", "Tâches", "Météo"],
            tags: ["matin", "briefing", "agenda", "tâches"]
        ),
        PluginItem(
            id: "brain-code-reviewer",
            name: "Brain Code Companion",
            type: .brain,
            version: "1.5.0",
            author: "ETHONE Intelligence",
            description: "Revue de code contextuelle et suggestions d'optimisation via IA.",
            longDescription: "Équipe l'assistant Brain de compétences avancées d'analyse de code, de refactorisation et de détection de vulnérabilités.",
            symbol: "sparkles",
            verification: .core,
            rating: 5.0,
            reviewCount: 720,
            installCount: 24300,
            lastUpdated: "2026-09-04",
            features: [
                "Analyse syntaxique et typage",
                "Suggestions de refactorisation propres",
                "Détection des mauvaises pratiques",
            ],
            permissions: ["Contexte Brain"],
            tags: ["ia", "brain", "code", "développement"]
        ),
        PluginItem(
            id: "layout-bento-studio",
            name: "Bento Studio Grid",
            type: .layout,
            version: "2.2.0",
            author: "ETHONE Design",
            description: "Disposition modulaire asymétrique type Bento Box optimisée pour iPad et écran large.",
            longDescription: "Organisez vos modules favoris dans une grille Bento moderne inspirée d'Apple Design, réorganisable et parfaitement équilibrée.",
            symbol: "square.split.2x2.fill",
            verification: .verified,
            rating: 4.7,
            reviewCount: 290,
            installCount: 9400,
            lastUpdated: "2026-08-22",
            features: [
                "Grille Bento auto-adaptative",
                "Supports d'écrans multi-tailles",
                "Disposition ergonomique",
            ],
            permissions: ["Disposition de l'interface"],
            tags: ["layout", "bento", "grille", "design"]
        ),
    ]
}
