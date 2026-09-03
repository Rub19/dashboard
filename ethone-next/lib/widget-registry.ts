/**
 * ETHONE Widget System 2.0 — Central Widget Registry
 *
 * Provides standardized manifest declarations, capabilities, sizes, permissions,
 * categories, and registry lookup for all first-party and marketplace widgets.
 */

export type WidgetCategory =
  | "information"
  | "communication"
  | "productivity"
  | "gaming"
  | "media"
  | "development"
  | "ethone";

export type WidgetSize = "small" | "medium" | "large" | "full";

export interface WidgetManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  author: string;
  source: "core" | "marketplace" | "community";
  defaultSize: WidgetSize;
  supportedSizes: WidgetSize[];
  permissions: string[];
  dataSources: string[];
  configurable: boolean;
  defaultConfig?: Record<string, unknown>;
  realtime: boolean;
  brainCompatible: boolean;
  marketplaceCompatible: boolean;
  brainMatchScore?: number;
}

export const WIDGET_REGISTRY: Record<string, WidgetManifest> = {
  hero: {
    id: "hero",
    version: "2.0.0",
    name: "Aperçu & Briefing",
    description: "Briefing contextuel intelligent avec horloge live, espace de stockage et synthèse de journée.",
    category: "ethone",
    icon: "sun",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "large",
    supportedSizes: ["medium", "large", "full"],
    permissions: ["profile", "storage"],
    dataSources: ["profile", "storage", "brain"],
    configurable: false,
    realtime: false,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 98,
  },
  system: {
    id: "system",
    version: "2.0.0",
    name: "Contrôle Système",
    description: "Moniteur système : latence, audio, statut du réseau et diagnostics de l'OS.",
    category: "ethone",
    icon: "sliders-horizontal",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["small", "medium", "large"],
    permissions: ["system"],
    dataSources: ["system-metrics"],
    configurable: true,
    defaultConfig: { showLatency: true, showAudio: true },
    realtime: true,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 85,
  },
  daystream: {
    id: "daystream",
    version: "2.0.0",
    name: "Fil du Jour",
    description: "Chronologie intelligente combinant les rendez-vous du calendrier et les prochaines tâches.",
    category: "productivity",
    icon: "calendar",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["small", "medium", "large"],
    permissions: ["calendar", "tasks"],
    dataSources: ["events", "tasks"],
    configurable: true,
    defaultConfig: { maxItems: 4, showCompleted: false },
    realtime: false,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 95,
  },
  productivity: {
    id: "productivity",
    version: "2.0.0",
    name: "Tâches & Rhythm",
    description: "Gestionnaire de tâches avec priorisation, statut et synchronisation cloud instantanée.",
    category: "productivity",
    icon: "check-circle",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["small", "medium", "large"],
    permissions: ["tasks"],
    dataSources: ["cloud-tasks"],
    configurable: true,
    defaultConfig: { filter: "all", limit: 5 },
    realtime: false,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 92,
  },
  recent: {
    id: "recent",
    version: "2.0.0",
    name: "Notes Récentes",
    description: "Accès immédiat à vos dernières prises de notes et carnets de recherche.",
    category: "productivity",
    icon: "book-open",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["small", "medium", "large"],
    permissions: ["notes"],
    dataSources: ["notes"],
    configurable: false,
    realtime: false,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 80,
  },
  brain: {
    id: "brain",
    version: "2.0.0",
    name: "ETHONE Brain Intelligence",
    description: "Centre d'analyse cognitive avec suggestions proactives et résumé des priorités.",
    category: "ethone",
    icon: "brain",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["medium", "large", "full"],
    permissions: ["brain", "activity"],
    dataSources: ["brain-memory", "activity-feed"],
    configurable: true,
    defaultConfig: { mode: "proactive", depth: "normal" },
    realtime: true,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 99,
  },
  bills: {
    id: "bills",
    version: "2.0.0",
    name: "Factures & Dépenses",
    description: "Suivi des échéances financières, abonnements récurrents et factures mensuelles.",
    category: "productivity",
    icon: "receipt",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "medium",
    supportedSizes: ["small", "medium", "large"],
    permissions: ["bills"],
    dataSources: ["bills"],
    configurable: false,
    realtime: false,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 78,
  },
  connections: {
    id: "connections",
    version: "2.0.0",
    name: "Services & Intégrations",
    description: "Statut en temps réel de vos services connectés : Notion, Reddit, Steam, Todoist.",
    category: "communication",
    icon: "plug",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "full",
    supportedSizes: ["medium", "large", "full"],
    permissions: ["integrations"],
    dataSources: ["worker-connections"],
    configurable: false,
    realtime: true,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 88,
  },
  live: {
    id: "live",
    version: "2.0.0",
    name: "Hub Live 3D & Gaming",
    description: "Cartes 3D interactives Discord, Spotify Now Playing, Trackers Valorant / LoL, Minecraft et Météo.",
    category: "gaming",
    icon: "gamepad-2",
    author: "ETHONE Core",
    source: "core",
    defaultSize: "full",
    supportedSizes: ["large", "full"],
    permissions: ["discord", "spotify", "riot", "weather"],
    dataSources: ["lanyard", "spotify-worker", "henrik-valorant", "weather-api"],
    configurable: true,
    defaultConfig: { show3DTilt: true, refreshSeconds: 30 },
    realtime: true,
    brainCompatible: true,
    marketplaceCompatible: false,
    brainMatchScore: 94,
  },
};

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; icon: string }[] = [
  { id: "ethone", label: "ETHONE OS", icon: "sparkles" },
  { id: "productivity", label: "Productivité", icon: "check-circle" },
  { id: "gaming", label: "Gaming & Loisir", icon: "gamepad-2" },
  { id: "communication", label: "Communication", icon: "message-square" },
  { id: "media", label: "Médias & Streaming", icon: "music" },
  { id: "information", label: "Informations", icon: "info" },
  { id: "development", label: "Développement", icon: "code" },
];

export function getWidgetManifest(id: string): WidgetManifest | undefined {
  return WIDGET_REGISTRY[id];
}

export function getAllWidgets(): WidgetManifest[] {
  return Object.values(WIDGET_REGISTRY);
}

export function getWidgetsByCategory(cat: WidgetCategory): WidgetManifest[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.category === cat);
}
