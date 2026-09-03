/**
 * ETHONE OS — PROFILE COSMETICS ECOSYSTEM
 *
 * Independent avatar frames, profile backgrounds, and profile badges.
 */

export type AvatarFrame = {
  id: string;
  name: string;
  description: string;
  cssClass: string;
  glowColor: string;
  accent: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export type ProfileBackground = {
  id: string;
  name: string;
  description: string;
  cssGradient: string;
  theme: "dark" | "aurora" | "cyber" | "space" | "minimal" | "ocean" | "forest" | "sunset" | "matrix";
};

export type ProfileBadge = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
};

export const PROFILE_FRAMES: AvatarFrame[] = [
  {
    id: "none",
    name: "Sans Cadre",
    description: "Affichage minimaliste sans bordure additionnelle",
    cssClass: "border-transparent",
    glowColor: "transparent",
    accent: "zinc",
    rarity: "common",
  },
  {
    id: "ethone-glow",
    name: "ETHONE Pulse",
    description: "Halo émeraude signature ETHONE OS",
    cssClass: "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black shadow-[0_0_20px_rgba(16,185,129,0.5)]",
    glowColor: "rgba(16,185,129,0.5)",
    accent: "emerald",
    rarity: "rare",
  },
  {
    id: "neon-cyan",
    name: "Cyber Neon",
    description: "Énergie électrique cyan intense",
    cssClass: "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black shadow-[0_0_22px_rgba(6,182,212,0.6)]",
    glowColor: "rgba(6,182,212,0.6)",
    accent: "cyan",
    rarity: "rare",
  },
  {
    id: "gold-vip",
    name: "Or Impérial VIP",
    description: "Finition or impérial avec reflets métalliques",
    cssClass: "ring-2 ring-amber-400 ring-offset-2 ring-offset-black shadow-[0_0_24px_rgba(251,191,36,0.55)]",
    glowColor: "rgba(251,191,36,0.55)",
    accent: "amber",
    rarity: "legendary",
  },
  {
    id: "aurora-borealis",
    name: "Aurore Boréale",
    description: "Dégradé violet-indigo boréal chatoyant",
    cssClass: "ring-2 ring-purple-500 ring-offset-2 ring-offset-black shadow-[0_0_22px_rgba(168,85,247,0.5)]",
    glowColor: "rgba(168,85,247,0.5)",
    accent: "purple",
    rarity: "epic",
  },
  {
    id: "glass-frost",
    name: "Verre Dépoli",
    description: "Contour givré avec translucidité douce",
    cssClass: "ring-2 ring-white/40 ring-offset-2 ring-offset-black shadow-[0_0_15px_rgba(255,255,255,0.2)]",
    glowColor: "rgba(255,255,255,0.2)",
    accent: "slate",
    rarity: "common",
  },
  {
    id: "flame-ember",
    name: "Braises Solaires",
    description: "Halo ardent orange-rougeoyant",
    cssClass: "ring-2 ring-orange-500 ring-offset-2 ring-offset-black shadow-[0_0_24px_rgba(249,115,22,0.6)]",
    glowColor: "rgba(249,115,22,0.6)",
    accent: "orange",
    rarity: "epic",
  },
];

export const PROFILE_BACKGROUNDS: ProfileBackground[] = [
  {
    id: "dark-solid",
    name: "Onyx Deep Dark",
    description: "Noir pur et sobre pour un contraste maximal",
    cssGradient: "from-zinc-950 via-zinc-900 to-black",
    theme: "dark",
  },
  {
    id: "aurora-waves",
    name: "Aurore Boréale Flow",
    description: "Ondes mystiques cyan, émeraude et violet",
    cssGradient: "from-emerald-950/60 via-purple-950/40 to-zinc-950",
    theme: "aurora",
  },
  {
    id: "cyber-grid",
    name: "Synthwave Matrix",
    description: "Ambiance futuriste néon et grille cyber",
    cssGradient: "from-cyan-950/70 via-blue-950/50 to-zinc-950",
    theme: "cyber",
  },
  {
    id: "space-nebula",
    name: "Nébuleuse Cosmique",
    description: "Profondeur stellaire et poussières d'étoiles",
    cssGradient: "from-indigo-950/80 via-purple-950/60 to-black",
    theme: "space",
  },
  {
    id: "ocean-deep",
    name: "Abysses Océaniques",
    description: "Bleu lagon sombre et reflets marins",
    cssGradient: "from-sky-950/70 via-teal-950/50 to-zinc-950",
    theme: "ocean",
  },
  {
    id: "sunset-horizon",
    name: "Crépuscule Doré",
    description: "Coucher de soleil ambré et chaleureux",
    cssGradient: "from-amber-950/60 via-rose-950/40 to-zinc-950",
    theme: "sunset",
  },
];

export const PROFILE_BADGES: ProfileBadge[] = [
  {
    id: "verified",
    label: "Vérifié",
    icon: "check-circle",
    color: "#10b981",
    bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    description: "Identité vérifiée sur ETHONE OS",
  },
  {
    id: "early-user",
    label: "Early User",
    icon: "zap",
    color: "#f59e0b",
    bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    description: "Pionnier des premières versions d'ETHONE",
  },
  {
    id: "founder",
    label: "Founder",
    icon: "crown",
    color: "#eab308",
    bg: "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
    description: "Propriétaire et fondateur",
  },
  {
    id: "developer",
    label: "Developer",
    icon: "code",
    color: "#06b6d4",
    bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
    description: "Développeur et créateur de scripts",
  },
  {
    id: "brain-master",
    label: "Brain AI Master",
    icon: "sparkles",
    color: "#a855f7",
    bg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    description: "Utilisateur avancé de Brain IA",
  },
  {
    id: "power-user",
    label: "Power User",
    icon: "flame",
    color: "#f43f5e",
    bg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    description: "Utilisation intensive des workflows",
  },
];
