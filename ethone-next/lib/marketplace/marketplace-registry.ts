/**
 * ETHONE Marketplace Intelligence 2.0 — Central Item Registry
 *
 * Defines the unified schema for all discoverable and installable ecosystem assets:
 * Widgets, Themes, Layouts, Automations, Brain Plugins, and Extensions.
 */

export type MarketplaceItemType =
  | "widget"
  | "theme"
  | "layout"
  | "automation"
  | "brain"
  | "extension";

export type MarketplaceCategory =
  | "productivity"
  | "development"
  | "gaming"
  | "media"
  | "ai"
  | "communication"
  | "finance"
  | "system"
  | "lifestyle";

export type VerificationTier =
  | "verified"
  | "audited"
  | "community"
  | "trending"
  | "optimized";

export interface MarketplacePermission {
  id: string;
  name: string;
  description: string;
  level: "read" | "write" | "system";
}

export interface MarketplaceDependency {
  id: string;
  name: string;
  type: "connection" | "widget" | "plugin";
  required: boolean;
  connectRoute?: string;
  description: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  type: MarketplaceItemType;
  category: MarketplaceCategory;
  version: string;
  author: string;
  authorVerified?: boolean;
  description: string;
  longDescription?: string;
  icon: string;
  iconBg?: string;
  verification: VerificationTier;
  rating: number;
  reviewCount: number;
  installCount: number;
  lastUpdated: string;
  changelog?: string[];
  features: string[];
  permissions: MarketplacePermission[];
  dependencies: MarketplaceDependency[];
  compatibility: {
    minEthoneVersion: string;
    workspaces: ("personal" | "focus" | "studio" | "gaming" | "all")[];
    performanceImpact: "low" | "medium" | "high";
  };
  tags: string[];
  // Preview metadata
  preview?: {
    themeId?: string;
    widgetId?: string;
    accentHex?: string;
    layoutBlueprint?: { colSpan: number; rowSpan?: number; position: string };
  };
  // Base match score for context fallback
  baseMatchScore: number;
}

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // ─── WIDGETS ─────────────────────────────────────────────────────────────
  {
    id: "widget-github-activity",
    name: "GitHub Activity Live",
    type: "widget",
    category: "development",
    version: "2.4.1",
    author: "ETHONE Core",
    authorVerified: true,
    description: "Visualisez vos commits, pull requests et contributions GitHub directement depuis votre Home.",
    longDescription: "Un widget ultra-performant affichant votre flux de commits, le statut de vos PRs et votre streak de contributions en temps réel avec micro-animations.",
    icon: "code-2",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    verification: "verified",
    rating: 4.9,
    reviewCount: 342,
    installCount: 14200,
    lastUpdated: "2026-08-30",
    changelog: [
      "Support des revues de PR en temps réel",
      "Optimisation du cache mémoire",
      "Affichage compact pour mobile",
    ],
    features: [
      "Flux de commits en temps réel",
      "Indicateur de statut des pull requests ouvertes",
      "Streak de contributions et calendrier de push",
      "Raccourci 1-clic vers les dépôts favoris",
    ],
    permissions: [
      { id: "github.read", name: "GitHub Activity", description: "Lecture de vos contributions et dépôts publics", level: "read" },
    ],
    dependencies: [
      { id: "github", name: "Connexion GitHub", type: "connection", required: true, connectRoute: "/connections/", description: "Liaison OAuth GitHub active requise." },
    ],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["personal", "studio", "all"],
      performanceImpact: "low",
    },
    tags: ["github", "code", "dev", "commits", "git"],
    preview: {
      widgetId: "github-activity",
      layoutBlueprint: { colSpan: 6, position: "Home Top Row" },
    },
    baseMatchScore: 97,
  },
  {
    id: "widget-spotify-player",
    name: "Spotify Now Playing 3D",
    type: "widget",
    category: "media",
    version: "3.1.0",
    author: "ETHONE Media",
    authorVerified: true,
    description: "Carte 3D interactive avec pochette de vinyle rotative, contrôles de lecture et paroles live.",
    longDescription: "Contrôlez Spotify directement depuis votre tableau de bord. Profitez d'une vue 3D dynamique avec extraction automatique des couleurs d'accent de la pochette d'album.",
    icon: "music",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    verification: "verified",
    rating: 4.9,
    reviewCount: 819,
    installCount: 28400,
    lastUpdated: "2026-09-01",
    changelog: [
      "Effet de rotation 3D réactif au pointeur",
      "Extraction automatique de la couleur dominante",
      "Boutons de skip et pause instantanés",
    ],
    features: [
      "Pochette d'album 3D avec inclinaison gyroscopique",
      "Barre de progression fluide synchronisée",
      "Contrôles Play / Pause / Skip / Shuffle",
      "Ambiance aura réactive à la musique",
    ],
    permissions: [
      { id: "spotify.playback", name: "Spotify Playback", description: "Lecture et contrôle de la lecture en cours", level: "write" },
    ],
    dependencies: [
      { id: "spotify", name: "Connexion Spotify", type: "connection", required: true, connectRoute: "/connections/", description: "Liaison de votre compte Spotify." },
    ],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["all"],
      performanceImpact: "low",
    },
    tags: ["spotify", "musique", "media", "audio", "nowplaying"],
    preview: {
      widgetId: "spotify-3d",
      layoutBlueprint: { colSpan: 6, position: "Bento Grid" },
    },
    baseMatchScore: 93,
  },
  {
    id: "widget-discord-presence",
    name: "Discord Live Card",
    type: "widget",
    category: "communication",
    version: "2.3.0",
    author: "ETHONE Social",
    authorVerified: true,
    description: "Statut Discord en direct (Lanyard), activité en jeu, statut vocal et rich presence.",
    longDescription: "Intégrez votre profil Discord avec badge d'avatar en temps réel, statut en ligne/occupé et détails de votre session de jeu actuelle.",
    icon: "message-square",
    iconBg: "bg-indigo-500/15 text-indigo-400",
    verification: "verified",
    rating: 4.8,
    reviewCount: 520,
    installCount: 19800,
    lastUpdated: "2026-08-28",
    changelog: [
      "Support vocal et détection de stream",
      "Badge d'avatar circulaire haute résolution",
    ],
    features: [
      "Statut Discord en temps réel (Lanyard WebSocket)",
      "Affichage du jeu ou de l'application en cours",
      "Badge d'avatar synchronisé",
      "Raccourci vers votre serveur Discord",
    ],
    permissions: [
      { id: "discord.presence", name: "Discord Presence", description: "Lecture du statut et des activités", level: "read" },
    ],
    dependencies: [
      { id: "discord", name: "Identifiant Discord", type: "connection", required: true, connectRoute: "/connections/", description: "ID utilisateur Discord configuré." },
    ],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["personal", "gaming", "all"],
      performanceImpact: "low",
    },
    tags: ["discord", "chat", "gaming", "social", "presence"],
    preview: {
      widgetId: "discord-live",
      layoutBlueprint: { colSpan: 6, position: "Bento Grid" },
    },
    baseMatchScore: 95,
  },
  {
    id: "widget-valorant-tracker",
    name: "Valorant Ranked Tracker",
    type: "widget",
    category: "gaming",
    version: "2.0.4",
    author: "ETHONE Gaming",
    authorVerified: true,
    description: "Suivi de votre rang Valorant, gains de RR, K/D ratio et historique des 5 derniers matchs.",
    longDescription: "Le widget ultime pour les joueurs compétitifs de Valorant : badge de rang avec aura animée, calcul automatique du winrate et historique des parties.",
    icon: "swords",
    iconBg: "bg-rose-500/15 text-rose-400",
    verification: "audited",
    rating: 4.9,
    reviewCount: 412,
    installCount: 11500,
    lastUpdated: "2026-08-25",
    changelog: ["Ajout de l'acte en cours", "Support des matchs personnalisés"],
    features: [
      "Affichage du rang et de l'icône officielle",
      "Delta RR par match (+/-)",
      "Ratio Kill/Death et score de combat moyen",
      "Dernier match avec détails de carte et d'agent",
    ],
    permissions: [
      { id: "riot.stats", name: "Riot / Henrik API", description: "Lecture des statistiques de jeu publiques", level: "read" },
    ],
    dependencies: [
      { id: "valorant", name: "Pseudo Riot Games", type: "connection", required: true, connectRoute: "/connections/", description: "Pseudo Riot Games et tag configurés." },
    ],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["gaming", "all"],
      performanceImpact: "low",
    },
    tags: ["valorant", "riot", "gaming", "esport", "fps"],
    preview: {
      widgetId: "valorant-ranked",
      layoutBlueprint: { colSpan: 6, position: "Gaming Row" },
    },
    baseMatchScore: 91,
  },
  {
    id: "widget-weather-live",
    name: "Météo Vivante & Prévisions",
    type: "widget",
    category: "lifestyle",
    version: "2.2.0",
    author: "ETHONE Core",
    authorVerified: true,
    description: "Conditions météo en direct, températures ressenties, indice UV et prévisions sur 5 jours.",
    longDescription: "Un widget météo élégant avec illustrations dynamiques de jour et de nuit, probabilités de précipitations et radar thermique.",
    icon: "cloud-sun",
    iconBg: "bg-amber-500/15 text-amber-400",
    verification: "verified",
    rating: 4.7,
    reviewCount: 650,
    installCount: 22000,
    lastUpdated: "2026-08-20",
    changelog: ["Vitesse du vent et hygrométrie ajoutées"],
    features: [
      "Température actuelle et ressentie",
      "Prévisions sur 5 jours avec min/max",
      "Indice UV, humidité et vitesse du vent",
      "Changement de thème météo jour/nuit automatique",
    ],
    permissions: [
      { id: "weather.location", name: "Localisation Météo", description: "Lecture de la ville configurée", level: "read" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["all"],
      performanceImpact: "low",
    },
    tags: ["meteo", "weather", "previsions", "climat"],
    preview: {
      widgetId: "weather-live",
      layoutBlueprint: { colSpan: 6, position: "Home Right" },
    },
    baseMatchScore: 86,
  },

  // ─── THEMES ──────────────────────────────────────────────────────────────
  {
    id: "theme-cyber-neon",
    name: "Cyber Neon AMOLED",
    type: "theme",
    category: "system",
    version: "3.0.0",
    author: "ETHONE Studio",
    authorVerified: true,
    description: "Thème noir profond AMOLED avec accents néon magenta et bleu électrique pour setup gaming.",
    longDescription: "Conçu pour les écrans OLED et les setups gaming nocturnes. Réduit la fatigue oculaire tout en apportant une esthétique cyberpunk futuriste à votre OS.",
    icon: "palette",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
    verification: "optimized",
    rating: 4.9,
    reviewCount: 489,
    installCount: 16700,
    lastUpdated: "2026-09-02",
    features: [
      "Fond noir 100% AMOLED (#090611)",
      "Bordures néon violettes et roses luminescentes",
      "Glow atmosphérique haute performance",
      "Compatible avec tous les widgets 3D",
    ],
    permissions: [],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["gaming", "all"],
      performanceImpact: "low",
    },
    tags: ["theme", "cyber", "neon", "amoled", "dark"],
    preview: {
      themeId: "cyber-neon",
      accentHex: "#ec4899",
    },
    baseMatchScore: 89,
  },
  {
    id: "theme-minimal-monochrome",
    name: "Minimal Monochrome Studio",
    type: "theme",
    category: "productivity",
    version: "3.0.0",
    author: "ETHONE Design",
    authorVerified: true,
    description: "Esthétique épurée inspirée du design scandinave. Zéro distraction, contraste optimisé.",
    longDescription: "Un thème pensé pour les séances de Deep Work intensives. Typographie soignée, tons de gris subtils et bordures ultra-fines pour sublimer votre contenu.",
    icon: "circle",
    iconBg: "bg-zinc-500/15 text-zinc-300",
    verification: "verified",
    rating: 4.8,
    reviewCount: 310,
    installCount: 12400,
    lastUpdated: "2026-08-15",
    features: [
      "Palette de gris équilibrée",
      "Contraste accessible WCAG AAA",
      "Idéal pour le travail de rédaction et de code",
    ],
    permissions: [],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["focus", "studio", "all"],
      performanceImpact: "low",
    },
    tags: ["theme", "minimal", "monochrome", "focus", "clean"],
    preview: {
      themeId: "minimal",
      accentHex: "#a1a1aa",
    },
    baseMatchScore: 92,
  },
  {
    id: "theme-aurora-boreal",
    name: "Northern Aurora Glass",
    type: "theme",
    category: "lifestyle",
    version: "3.0.0",
    author: "ETHONE Studio",
    authorVerified: true,
    description: "Verre dépoli profond avec lueur boréale émeraude et cyan. Expérience visuelle immersive.",
    longDescription: "Inspiré des aurores boréales arctiques. Les panneaux flottants s'illuminent d'un dégradé turquoise apaisant qui réagit à votre activité.",
    icon: "sparkles",
    iconBg: "bg-cyan-500/15 text-cyan-400",
    verification: "verified",
    rating: 4.9,
    reviewCount: 574,
    installCount: 18900,
    lastUpdated: "2026-08-29",
    features: [
      "Effet de verre poli avec flou gaussien",
      "Accents turquoise et émeraude dynamiques",
      "Reflets d'ambiance cosmique",
    ],
    permissions: [],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["all"],
      performanceImpact: "low",
    },
    tags: ["theme", "aurora", "glass", "cyan", "emerald"],
    preview: {
      themeId: "aurora",
      accentHex: "#06b6d4",
    },
    baseMatchScore: 90,
  },

  // ─── LAYOUTS ─────────────────────────────────────────────────────────────
  {
    id: "layout-developer-command",
    name: "Developer Command Center",
    type: "layout",
    category: "development",
    version: "1.3.0",
    author: "ETHONE Workspaces",
    authorVerified: true,
    description: "Disposition optimisée pour les développeurs : GitHub, VS Code, Notes techniques et Brain Copilot.",
    longDescription: "Un agencement pensé pour maximiser la productivité logicielle : flux de commits à gauche, copilote IA au centre, et gestionnaire de tâches techniques à droite.",
    icon: "layout-grid",
    iconBg: "bg-sky-500/15 text-sky-400",
    verification: "audited",
    rating: 4.9,
    reviewCount: 290,
    installCount: 9800,
    lastUpdated: "2026-08-22",
    features: [
      "Organisation en 3 colonnes symétriques",
      "Priorité haute accordée à GitHub et au terminal",
      "Intégration directe des tickets et bugs",
    ],
    permissions: [
      { id: "layout.write", name: "Modification du Layout", description: "Applique un nouvel agencement de widgets", level: "write" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["studio", "personal", "all"],
      performanceImpact: "low",
    },
    tags: ["layout", "developer", "dev", "grid", "workspace"],
    baseMatchScore: 96,
  },
  {
    id: "layout-gaming-command",
    name: "Ultimate Gaming Setup",
    type: "layout",
    category: "gaming",
    version: "1.2.0",
    author: "ETHONE Gaming",
    authorVerified: true,
    description: "Disposition gaming : Discord, Spotify 3D, Trackers Valorant/LoL et monitoring système.",
    longDescription: "L'agencement parfait pour vos sessions de jeu : discutez avec vos coéquipiers, contrôlez votre musique et surveillez votre rang sans quitter votre écran.",
    icon: "gamepad-2",
    iconBg: "bg-rose-500/15 text-rose-400",
    verification: "verified",
    rating: 4.8,
    reviewCount: 360,
    installCount: 14100,
    lastUpdated: "2026-08-19",
    features: [
      "Cartes 3D mises en avant",
      "Accès rapide au volume et micro Discord",
      "Trackers de compétition au premier plan",
    ],
    permissions: [
      { id: "layout.write", name: "Modification du Layout", description: "Applique un nouvel agencement de widgets", level: "write" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["gaming", "all"],
      performanceImpact: "low",
    },
    tags: ["layout", "gaming", "discord", "spotify", "valorant"],
    baseMatchScore: 94,
  },

  // ─── AUTOMATIONS ─────────────────────────────────────────────────────────
  {
    id: "auto-morning-routine",
    name: "Pack Routine Matinale",
    type: "automation",
    category: "productivity",
    version: "2.1.0",
    author: "ETHONE Automations",
    authorVerified: true,
    description: "Lance votre playlist du matin, affiche votre planning du jour et ouvre vos 3 premières priorités.",
    longDescription: "Une routine automatisée prête à l'emploi qui prépare votre environnement dès votre première connexion matinale : météo, calendrier, musique douce et briefing Brain.",
    icon: "sunrise",
    iconBg: "bg-amber-500/15 text-amber-400",
    verification: "verified",
    rating: 4.9,
    reviewCount: 420,
    installCount: 15300,
    lastUpdated: "2026-08-27",
    features: [
      "Déclenchement automatique entre 06:00 et 10:00",
      "Affichage du briefing Brain synthétique",
      "Lancement automatique de votre playlist matinale Spotify",
      "Création de la checklist du jour",
    ],
    permissions: [
      { id: "automation.run", name: "Exécution des Flux", description: "Exécute des actions contextuelles au démarrage", level: "write" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["personal", "all"],
      performanceImpact: "low",
    },
    tags: ["automation", "routine", "matin", "morning", "flow"],
    baseMatchScore: 93,
  },
  {
    id: "auto-deep-work-focus",
    name: "Pack Deep Work & Concentration",
    type: "automation",
    category: "productivity",
    version: "2.0.0",
    author: "ETHONE Brain",
    authorVerified: true,
    description: "Active le mode Zen, coupe les notifications sociales et lance un timer Pomodoro de 50 minutes.",
    longDescription: "Fermez la porte aux distractions. Ce pack configure automatiquement le système en mode haute concentration dès que vous démarrez une session de travail.",
    icon: "timer",
    iconBg: "bg-sky-500/15 text-sky-400",
    verification: "verified",
    rating: 4.9,
    reviewCount: 680,
    installCount: 21400,
    lastUpdated: "2026-08-31",
    features: [
      "Activation du mode Zen (masquage des panneaux secondaires)",
      "Mise en sourdine des notifications Discord et emails",
      "Lancement de l'ambiance sonore 'Pluie & Orage'",
      "Démarrage du minuteur Focus 50m / 10m",
    ],
    permissions: [
      { id: "focus.control", name: "Contrôle Focus OS", description: "Démarre des sessions de concentration et ajuste les réglages", level: "write" },
      { id: "notifications.mute", name: "Gestion des Notifications", description: "Passe en mode silencieux durant le travail", level: "write" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["focus", "studio", "all"],
      performanceImpact: "low",
    },
    tags: ["focus", "pomodoro", "zen", "concentration", "deepwork"],
    baseMatchScore: 98,
  },

  // ─── BRAIN PLUGINS ───────────────────────────────────────────────────────
  {
    id: "brain-code-copilot",
    name: "Brain Code & Architecture Copilot",
    type: "brain",
    category: "ai",
    version: "1.4.0",
    author: "ETHONE Brain Labs",
    authorVerified: true,
    description: "Agent IA spécialisé dans l'analyse de code, la revue d'architecture et la génération de tests.",
    longDescription: "Connecté à vos dépôts et notes techniques, ce plugin Brain analyse vos choix d'architecture et répond précisément à vos questions de développement.",
    icon: "brain",
    iconBg: "bg-purple-500/15 text-purple-400",
    verification: "audited",
    rating: 4.9,
    reviewCount: 512,
    installCount: 17800,
    lastUpdated: "2026-09-01",
    features: [
      "Revue de code contextuelle instantanée",
      "Explication pas-à-pas d'algorithmes et de structures",
      "Génération de schémas et de diagrammes d'architecture",
      "Mémoire technique persistante par projet",
    ],
    permissions: [
      { id: "brain.context", name: "Contexte Brain", description: "Accès au contexte d'analyse technique", level: "read" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["studio", "personal", "all"],
      performanceImpact: "low",
    },
    tags: ["brain", "ai", "copilot", "code", "architecture"],
    baseMatchScore: 97,
  },
  {
    id: "brain-smart-summaries",
    name: "Brain Synthèse Quotidienne",
    type: "brain",
    category: "ai",
    version: "1.2.0",
    author: "ETHONE Brain Labs",
    authorVerified: true,
    description: "Résumé automatique de vos rendez-vous, emails reçus et notes récentes sous forme de briefing audio.",
    longDescription: "Chaque jour à l'heure de votre choix, Brain génère un résumé concis de 3 minutes pour vous mettre à jour sur les priorités du jour.",
    icon: "sparkles",
    iconBg: "bg-amber-500/15 text-amber-400",
    verification: "verified",
    rating: 4.8,
    reviewCount: 390,
    installCount: 13900,
    lastUpdated: "2026-08-26",
    features: [
      "Synthèse intelligente de vos tâches en retard",
      "Détection des conflits de calendrier",
      "Points d'attention prioritaires du jour",
    ],
    permissions: [
      { id: "brain.summary", name: "Synthèse Brain", description: "Analyse des événements et tâches du jour", level: "read" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["all"],
      performanceImpact: "low",
    },
    tags: ["brain", "ai", "synthese", "briefing", "summary"],
    baseMatchScore: 94,
  },

  // ─── EXTENSIONS ──────────────────────────────────────────────────────────
  {
    id: "ext-vscode-bridge",
    name: "VS Code Realtime Bridge",
    type: "extension",
    category: "development",
    version: "1.1.2",
    author: "ETHONE Community",
    authorVerified: true,
    description: "Synchronise vos fichiers en cours d'édition dans VS Code avec votre journal d'activité ETHONE.",
    longDescription: "Affichez votre projet actif, la branche git courante et votre temps de code du jour sans ouvrir de fenêtre supplémentaire.",
    icon: "file-code",
    iconBg: "bg-blue-500/15 text-blue-400",
    verification: "community",
    rating: 4.7,
    reviewCount: 180,
    installCount: 6500,
    lastUpdated: "2026-08-14",
    features: [
      "Détection automatique du projet actif",
      "Comptage des minutes de programmation quotidiennes",
      "Intégration directe dans l'Activity Hub",
    ],
    permissions: [
      { id: "vscode.socket", name: "Bridge Local Socket", description: "Communication avec l'extension VS Code locale", level: "read" },
    ],
    dependencies: [],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["studio", "all"],
      performanceImpact: "low",
    },
    tags: ["vscode", "ide", "code", "dev", "editor"],
    baseMatchScore: 88,
  },
  {
    id: "ext-notion-sync",
    name: "Notion Two-Way Sync",
    type: "extension",
    category: "productivity",
    version: "2.0.1",
    author: "ETHONE Integrations",
    authorVerified: true,
    description: "Synchronisez vos bases de données Notion avec les tâches et notes ETHONE en temps réel.",
    longDescription: "Ne dupliquez plus votre travail : vos pages Notion sélectionnées deviennent instantanément consultables et éditables depuis l'application Notes d'ETHONE.",
    icon: "book-marked",
    iconBg: "bg-stone-500/15 text-stone-300",
    verification: "verified",
    rating: 4.8,
    reviewCount: 440,
    installCount: 16100,
    lastUpdated: "2026-08-23",
    features: [
      "Synchronisation bidirectionnelle instantanée",
      "Support des blocs Markdown et listes de tâches",
      "Cache hors ligne transparent",
    ],
    permissions: [
      { id: "notion.database", name: "Notion Databases", description: "Accès en lecture et écriture aux bases Notion autorisées", level: "write" },
    ],
    dependencies: [
      { id: "notion", name: "Connexion Notion", type: "connection", required: true, connectRoute: "/connections/", description: "Liaison de votre espace Notion." },
    ],
    compatibility: {
      minEthoneVersion: "1.20.0",
      workspaces: ["personal", "focus", "all"],
      performanceImpact: "low",
    },
    tags: ["notion", "notes", "sync", "database", "docs"],
    baseMatchScore: 91,
  },
];

export function getMarketplaceItem(id: string): MarketplaceItem | undefined {
  return MARKETPLACE_ITEMS.find((item) => item.id === id);
}

export function getItemsByType(type: MarketplaceItemType): MarketplaceItem[] {
  return MARKETPLACE_ITEMS.filter((item) => item.type === type);
}

export function getItemsByCategory(category: MarketplaceCategory): MarketplaceItem[] {
  return MARKETPLACE_ITEMS.filter((item) => item.category === category);
}
