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
  entry("v184", "2026-08-01", "Recherches plus fluides", [
    { kind: "fix", text: "Command HUD (Ctrl+K) : chaque frappe relançait immédiatement un calcul de pertinence sur toutes les commandes, dans les 4 langues. Léger lissage ajouté pour éviter les à-coups en tapant vite." },
    { kind: "fix", text: "La recherche dans l'historique Brain reconstruisait aussi tout l'onglet Chat à chaque frappe, sans rapport avec la recherche. Séparé et lissé." },
    { kind: "fix", text: "Renommer une note reparcourait toute la liste affichée à chaque frappe pour retrouver la bonne ligne. Ciblage direct désormais." }
  ]),
  entry("v183", "2026-08-01", "Textes qui se chevauchaient : corrigés", [
    { kind: "fix", text: "Les menus contextuels (clic droit / actions sur une ligne) pouvaient afficher un intitulé long sur plusieurs lignes qui débordait par-dessus l'option suivante au lieu de le raccourcir avec des points de suspension. Corrigé sur les deux systèmes de menu de l'application." },
    { kind: "fix", text: "Même souci sur le fil d'Ariane (en-tête), les titres des choix de thème et de densité dans les Préférences, les libellés du panneau \"Personnaliser\" de l'accueil et d'Activity, les onglets de la fiche connexion, et les liens de ressources compacts : le texte pouvait s'étirer ou se couper au milieu d'un caractère au lieu de se terminer proprement par \"…\"." }
  ]),
  entry("v182", "2026-08-01", "163 traductions cassées réparées", [
    { kind: "fix", text: "En corrigeant les accents manquants la semaine dernière, 163 textes ont perdu leur traduction anglais/espagnol/allemand sans que ça se voie en français : le correctif changeait le texte affiché mais pas la clé interne utilisée pour retrouver sa traduction, qui devait rester identique au caractère près. Recherché et réparé un par un dans tout le catalogue." },
    { kind: "fix", text: "22 entrées du dictionnaire de traduction étaient dupliquées (souvent avec des traductions légèrement différentes) ; seule la plus récente comptait vraiment, les autres étaient invisibles et trompeuses. Nettoyées." }
  ]),
  entry("v181", "2026-08-01", "Densité d'affichage sur le Calendrier", [
    { kind: "improvement", text: "Le Calendrier propose désormais le même réglage de densité (automatique, confortable, compacte) que Tasks, Notes, Files, Activity et Connections. Il était déjà sensible à ce réglage global, il manquait juste le bouton pour le changer depuis cette page." }
  ]),
  entry("v180", "2026-08-01", "Préférences : de vraies sections, une à la fois", [
    { kind: "fix", text: "Les 7 sections des Préférences (Profil, Apparence, Brain, Sons, Workspace, Système, Developer) ressemblaient à des onglets mais s'affichaient toutes en même temps, empilées sur toute la hauteur de la page. Un seul onglet s'affiche désormais à la fois, avec navigation complète au clavier (flèches haut/bas, Début/Fin)." }
  ]),
  entry("v179", "2026-08-01", "Catalogue de connexions moins chargé", [
    { kind: "improvement", text: "Chaque carte du catalogue de connexions n'affiche plus qu'un seul bouton principal (plus Déconnecter si besoin) au lieu de 4 actions côte à côte. Changer de méthode et lancer un diagnostic restent disponibles en un clic, dans la fiche détaillée." }
  ]),
  entry("v178", "2026-08-01", "Personnalisez vos widgets Live Now sur l'accueil", [
    { kind: "feature", text: "Bouton \"Personnaliser\" au-dessus des cartes Live Now de l'accueil : réordonnez chaque widget (Spotify, Discord, Minecraft...) ou masquez ceux qui ne vous intéressent pas, comme sur la page Activity." },
    { kind: "improvement", text: "Vos préférences d'ordre et de visibilité sont sauvegardées et synchronisées avec votre compte, comme le reste de vos réglages." }
  ]),
  entry("v177", "2026-08-01", "Minecraft réparé et centaines d'accents manquants corrigés", [
    { kind: "fix", text: "Minecraft ne s'affichait plus jamais dans Live Now : Mojang a fermé en 2023 l'API que le Worker utilisait pour retrouver un pseudo. Bascule vers un miroir maintenu qui répond exactement au même format." },
    { kind: "fix", text: "Riot Games (Valorant / League of Legends) affichait un message vague \"backend sécurisé requis\" même quand la connexion échouait pour une autre raison ; le message nomme désormais précisément ce qui manque (ex : votre clé API Tracker.gg)." },
    { kind: "fix", text: "Des centaines de mots français affichés sans accent (é, è, à, ê, ç...) dans les guides de connexion, les notifications et les libellés de l'interface ont été corrigés pour une lecture plus naturelle." }
  ]),
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
