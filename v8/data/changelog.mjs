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
  improvement: "Ameliore",
  cleanup: "Nettoyage",
  i18n: "Traduction"
});

export const CHANGELOG = Object.freeze([
  entry("v159 - v162", "2026-07-31", "Connexions fiables et Automations traduites", [
    { kind: "fix", text: "Les connexions \"publiques\" (Meteo, Minecraft, profil Twitch public) s'activent desormais automatiquement des l'enregistrement, au lieu d'exiger un clic cache sur \"Tester\" pour passer a l'etat connecte." },
    { kind: "cleanup", text: "Suppression du backend Henrik / Riot API, code mort jamais appele depuis le passage a Tracker.gg pour Valorant et League of Legends." },
    { kind: "i18n", text: "Traduction complete (EN / ES / DE) du selecteur de Theme, de l'onglet Automations, du detail meteo et du badge de fraicheur des cartes Live Now." }
  ]),
  entry("v153 - v158", "2026-07-31", "Correctifs mobile et nettoyage du guide Riot", [
    { kind: "fix", text: "Le badge \"Actualise a\" ne chevauche plus le texte des cartes Live Now, sur mobile comme sur desktop." },
    { kind: "improvement", text: "Onze cartes Live Now supplementaires (Minecraft, Steam, Google Calendar, Todoist, LoL, Twitch, Last.fm, Tracker.gg, Google Drive, YouTube, Reddit) se compactent desormais proprement sur petit ecran." },
    { kind: "fix", text: "Le guide de connexion Riot Games decrivait a tort un passage par Tracker.gg pour une cle qui n'etait jamais utilisee ; le guide reflete maintenant l'integration reelle." },
    { kind: "feature", text: "Un vrai moteur d'automatisation dans Brain : creez des regles (\"a l'ouverture d'une page\", \"au passage vers un Space\", \"a une heure precise\") qui declenchent un changement de Space, de densite ou de theme." }
  ]),
  entry("v148 - v152", "2026-07-30", "Theme clair, popup meteo et catalogue allege", [
    { kind: "feature", text: "Nouveau mode \"Jour\" (clair) et mode \"Automatique\" qui suit les preferences systeme, avec un selecteur visuel a swatches de couleurs comme le Density Engine." },
    { kind: "feature", text: "Cliquer sur la carte meteo ouvre desormais un detail complet (previsions sur 3 jours, vent, humidite) au lieu d'un texte tronque." },
    { kind: "fix", text: "La recherche de ville meteo reessaie automatiquement avec des tirets (\"Brive-la-Gaillarde\") quand le nom simple ne trouve aucun resultat." },
    { kind: "cleanup", text: "Retrait des integrations redondantes ou impossibles a livrer : Apple Music, Google Docs, Google Tasks, Battle.net, YouTube Music, Google Photos, Health Connect." }
  ]),
  entry("v143 - v147", "2026-07-29", "Brain prend vie et vraies icones de marque", [
    { kind: "feature", text: "Brain peut desormais repondre via un vrai modele d'IA (Groq, gratuit) au lieu d'un mode contextuel simule sans generation de texte." },
    { kind: "improvement", text: "Les cartes Live Now affichent les vraies icones de marque (Discord, Steam, Spotify, Notion, Reddit, Todoist, Google Drive, Google Calendar, Last.fm, Valorant, League of Legends) au lieu d'icones generiques." },
    { kind: "feature", text: "Controle de lecture Spotify (lecture, pause, suivant, precedent) directement depuis la carte Live Now." }
  ]),
  entry("v132 - v142", "2026-07-28 -> 2026-07-29", "Dix nouvelles integrations Live Now", [
    { kind: "feature", text: "Valorant, League of Legends, Twitch, Last.fm, Tracker.gg (Apex Legends), Reddit, YouTube et Google Drive rejoignent Live Now." },
    { kind: "improvement", text: "Presence Discord en temps reel via WebSocket (Lanyard) au lieu d'un sondage periodique — les mises a jour sont desormais instantanees." },
    { kind: "fix", text: "Connexions OAuth GitHub, Google Calendar, Notion, Todoist et Spotify (PKCE) entierement cablees, chacune avec sa carte Live Now dediee." }
  ]),
  entry("v107 - v131", "2026-07-15 -> 2026-07-27", "Fondations de l'experience V8", [
    { kind: "feature", text: "Refonte complete de l'authentification (connexion, inscription, mot de passe oublie) et nouvel ecran de demarrage ETHONE." },
    { kind: "improvement", text: "Ameliorations generales de performance de l'interface et premieres cartes Live Now (Discord, Meteo, Steam)." }
  ])
]);

export function latestChangelogVersion() {
  return CHANGELOG[0]?.version || "";
}
