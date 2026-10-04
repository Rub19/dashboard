import type { CSSProperties } from "react";
import type { PresenceStatus } from "./account-profile";

/** Cadres d'avatar : un anneau dessiné par un fond dégradé autour de l'image. Les teintes suivent le thème quand c'est possible. */
export type AvatarFrame = { id: string; name: string; ring: string; glow?: string };

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: "none", name: "Aucun", ring: "transparent" },
  { id: "accent", name: "Accent", ring: "var(--accent-primary)" },
  { id: "halo", name: "Halo", ring: "var(--accent-primary)", glow: "0 0 22px color-mix(in srgb, var(--accent-primary) 55%, transparent)" },
  { id: "aurora", name: "Aurore", ring: "conic-gradient(from 200deg, #2dd4bf, #6366f1, #a855f7, #2dd4bf)" },
  { id: "neon", name: "Néon", ring: "conic-gradient(from 90deg, #22d3ee, #e879f9, #22d3ee)", glow: "0 0 18px rgba(34,211,238,.45)" },
  { id: "gold", name: "Or", ring: "conic-gradient(from 120deg, #fde68a, #b45309, #fcd34d, #92400e, #fde68a)" },
  { id: "ember", name: "Braise", ring: "conic-gradient(from 160deg, #fb923c, #dc2626, #facc15, #fb923c)" },
  { id: "glass", name: "Verre", ring: "linear-gradient(135deg, rgba(255,255,255,.7), rgba(255,255,255,.15))" },
];

const LEGACY_FRAMES: Record<string, string> = {
  "ethone-glow": "halo",
  "neon-cyan": "neon",
  "gold-vip": "gold",
  "aurora-borealis": "aurora",
  "glass-frost": "glass",
  "flame-ember": "ember",
};

export function frameById(id: string | undefined): AvatarFrame {
  const key = LEGACY_FRAMES[id ?? ""] ?? id;
  return AVATAR_FRAMES.find((f) => f.id === key) ?? AVATAR_FRAMES[0];
}

/** Fonds de la carte de profil : dégradés doux mélangés à l'accent du thème, lisibles en clair comme en sombre. */
export type ProfileBackground = { id: string; name: string; style: CSSProperties };

const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

export const PROFILE_BACKGROUNDS: ProfileBackground[] = [
  { id: "", name: "Thème", style: { backgroundImage: `radial-gradient(120% 140% at 0% 0%, ${mix("var(--accent-primary)", 22)}, transparent 60%)` } },
  { id: "aurora", name: "Aurore", style: { backgroundImage: `radial-gradient(90% 120% at 10% 0%, ${mix("#2dd4bf", 30)}, transparent 60%), radial-gradient(80% 120% at 90% 10%, ${mix("#8b5cf6", 30)}, transparent 60%)` } },
  { id: "nebula", name: "Nébuleuse", style: { backgroundImage: `radial-gradient(80% 120% at 20% 10%, ${mix("#ec4899", 28)}, transparent 60%), radial-gradient(90% 120% at 85% 90%, ${mix("#6366f1", 30)}, transparent 60%)` } },
  { id: "sunset", name: "Couchant", style: { backgroundImage: `linear-gradient(120deg, ${mix("#f97316", 28)}, ${mix("#e11d48", 18)} 45%, transparent 80%)` } },
  { id: "ocean", name: "Océan", style: { backgroundImage: `linear-gradient(160deg, ${mix("#0ea5e9", 30)}, ${mix("#1e3a8a", 20)} 55%, transparent 90%)` } },
  { id: "forest", name: "Forêt", style: { backgroundImage: `linear-gradient(150deg, ${mix("#10b981", 26)}, ${mix("#365314", 18)} 55%, transparent 90%)` } },
  {
    id: "grid",
    name: "Grille",
    style: {
      backgroundImage: `linear-gradient(${mix("var(--text-primary)", 7)} 1px, transparent 1px), linear-gradient(90deg, ${mix("var(--text-primary)", 7)} 1px, transparent 1px), radial-gradient(100% 140% at 0% 0%, ${mix("var(--accent-primary)", 18)}, transparent 60%)`,
      backgroundSize: "22px 22px, 22px 22px, auto",
    },
  },
];

const LEGACY_BACKGROUNDS: Record<string, string> = { "dark-solid": "", "aurora-waves": "aurora", "cyber-grid": "grid", "space-nebula": "nebula", "ocean-deep": "ocean", "sunset-horizon": "sunset" };

export function backgroundById(id: string | undefined): ProfileBackground {
  const key = LEGACY_BACKGROUNDS[id ?? ""] ?? id ?? "";
  return PROFILE_BACKGROUNDS.find((b) => b.id === key) ?? PROFILE_BACKGROUNDS[0];
}

export const PRESENCE: Record<PresenceStatus, { label: string; hint: string; color: string }> = {
  online: { label: "En ligne", hint: "Disponible", color: "var(--success)" },
  busy: { label: "Occupé", hint: "Concentré, répond plus tard", color: "var(--warning)" },
  dnd: { label: "Ne pas déranger", hint: "Notifications coupées", color: "var(--danger)" },
  away: { label: "Absent", hint: "Pas devant l'écran", color: "#eab308" },
  invisible: { label: "Invisible", hint: "Apparaît hors ligne", color: "var(--text-muted)" },
};

export const STATUS_EMOJIS = ["💻", "🎮", "🎧", "📚", "☕", "🚀", "🎨", "🏋️", "✈️", "🌙", "🔥", "🤒"];

export const STATUS_SUGGESTIONS: Array<{ emoji: string; text: string }> = [
  { emoji: "💻", text: "En train de coder" },
  { emoji: "🎮", text: "En partie" },
  { emoji: "🎧", text: "Musique à fond" },
  { emoji: "📚", text: "En révision" },
  { emoji: "☕", text: "Pause café" },
  { emoji: "🌙", text: "Bientôt au lit" },
];
