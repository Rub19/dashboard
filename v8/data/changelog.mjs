function entry(version, date, title, items) {
  return Object.freeze({
    version,
    date,
    title,
    items: Object.freeze(items.map((item) => Object.freeze({ ...item })))
  });
}

export const CHANGELOG_KIND_ICONS = Object.freeze({
  feature: "sparkles",
  fix: "wrench",
  improvement: "trending-up",
  cleanup: "eraser",
  i18n: "languages"
});

export const CHANGELOG_KIND_LABELS = Object.freeze({
  feature: "Nouveau",
  fix: "Corrige",
  improvement: "Amélioré",
  cleanup: "Nettoyage",
  i18n: "Traduction"
});

export const CHANGELOG = Object.freeze([
  entry("v176", "2026-08-01", "Accent personnalisé et accueil désencombré", [
    { kind: "feature", text: "Nouveau sélecteur de couleur d'accent personnalisée dans les Préférences : choisissez n'importe quelle couleur (pas seulement les 5 presets) et elle se propage instantanément à toute l'interface." },
    { kind: "fix", text: "Les swatches d'accent (presets et personnalisé) reflètent désormais correctement l'accent actif en toutes circonstances, un décalage d'affichage préexistant." },
    { kind: "improvement", text: "Les cartes Live Now de l'accueil sont regroupées dans une grille compacte à plusieurs colonnes au lieu de s'empiler verticalement sur toute la hauteur de la page." }
  ]),
  entry("v163 - v175", "2026-07-31 -> 2026-08-01", "Correctifs Live Now : ancrage du badge, Riot Games et Minecraft", [
    { kind: "fix", text: "Le badge \"Actualisé à\" des cartes Live Now s'ancre désormais précisément dans le coin de la carte, même quand une carte voisine plus haute étirait la grille." },
    { kind: "fix", text: "Riot Games (Valorant / League of Legends) ne reste plus bloqué sur \"En préparation\" après une reconnexion : la vérification automatique post-configuration couvre désormais ce type de connexion." },
    { kind: "fix", text: "Suppression d'une carte générique redondante qui s'affichait en double pour Riot Games sur la page Activité." }
  ]),
  entry("v159 - v162", "2026-07-31", "Connexions fiables et Automations traduites", [
    { kind: "fix", text: "Les connexions \"publiques\" (Météo, Minecraft, profil Twitch public) s'activent désormais automatiquement des l'enregistrement, au lieu d'exiger un clic cache sur \"Tester\" pour passer a l'état connecté." },
    { kind: "cleanup", text: "Suppression du backend Henrik / Riot API, code mort jamais appelé depuis le passage a Tracker.gg pour Valorant et League of Legends." },
    { kind: "i18n", text: "Traduction complète (EN / ES / DE) du selecteur de Thème, de l'onglet Automations, du détail météo et du badge de fraîcheur des cartes Live Now." }
  ]),
  entry("v153 - v158", "2026-07-31", "Correctifs mobile et nettoyage du guide Riot", [
    { kind: "fix", text: "Le badge \"Actualisé a\" ne chevauche plus le texte des cartes Live Now, sur mobile comme sur desktop." },
    { kind: "improvement", text: "Onze cartes Live Now supplementaires (Minecraft, Steam, Google Calendar, Todoist, LoL, Twitch, Last.fm, Tracker.gg, Google Drive, YouTube, Reddit) se compactent désormais proprement sur petit écran." },
    { kind: "fix", text: "Le guide de connexion Riot Games décrivait a tort un passage par Tracker.gg pour une clé qui n'était jamais utilisée ; le guide reflète maintenant l'intégration reelle." },
    { kind: "feature", text: "Un vrai moteur d'automatisation dans Brain : créez des règles (\"a l'ouverture d'une page\", \"au passage vers un Space\", \"a une heure précise\") qui déclenchent un changement de Space, de densité ou de thème." }
  ]),
  entry("v148 - v152", "2026-07-30", "Thème clair, popup météo et catalogue allégé", [
    { kind: "feature", text: "Nouveau mode \"Jour\" (clair) et mode \"Automatique\" qui suit les préférences système, avec un selecteur visuel a swatches de couleurs comme le Density Engine." },
    { kind: "feature", text: "Cliquer sur la carte météo ouvre désormais un détail complet (prévisions sur 3 jours, vent, humidité) au lieu d'un texte tronqué." },
    { kind: "fix", text: "La recherche de ville météo réessaie automatiquement avec des tirets (\"Brive-la-Gaillarde\") quand le nom simple ne trouve aucun résultat." },
    { kind: "cleanup", text: "Retrait des intégrations redondantes ou impossibles a livrer : Apple Music, Google Docs, Google Tasks, Battle.net, YouTube Music, Google Photos, Health Connect." }
  ]),
  entry("v143 - v147", "2026-07-29", "Brain prend vie et vraies icônes de marque", [
    { kind: "feature", text: "Brain peut désormais répondre via un vrai modele d'IA (Groq, gratuit) au lieu d'un mode contextuel simule sans génération de texte." },
    { kind: "improvement", text: "Les cartes Live Now affichent les vraies icônes de marque (Discord, Steam, Spotify, Notion, Reddit, Todoist, Google Drive, Google Calendar, Last.fm, Valorant, League of Legends) au lieu d'icônes génériques." },
    { kind: "feature", text: "Contrôle de lecture Spotify (lecture, pause, suivant, précédent) directement depuis la carte Live Now." }
  ]),
  entry("v132 - v142", "2026-07-28 -> 2026-07-29", "Dix nouvelles intégrations Live Now", [
    { kind: "feature", text: "Valorant, League of Legends, Twitch, Last.fm, Tracker.gg (Apex Legends), Reddit, YouTube et Google Drive rejoignent Live Now." },
    { kind: "improvement", text: "Presence Discord en temps reel via WebSocket (Lanyard) au lieu d'un sondage périodique — les mises a jour sont désormais instantanées." },
    { kind: "fix", text: "Connexions OAuth GitHub, Google Calendar, Notion, Todoist et Spotify (PKCE) entièrement câblées, chacune avec sa carte Live Now dédiée." }
  ]),
  entry("v107 - v131", "2026-07-15 -> 2026-07-27", "Fondations de l'experience V8", [
    { kind: "feature", text: "Refonte complète de l'authentification (connexion, inscription, mot de passe oublié) et nouvel écran de demarrage ETHONE." },
    { kind: "improvement", text: "Améliorations générales de performance de l'interface et premières cartes Live Now (Discord, Météo, Steam)." }
  ])
]);

export function latestChangelogVersion() {
  return CHANGELOG[0]?.version || "";
}
