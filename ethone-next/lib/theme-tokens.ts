/**
 * ETHONE Theme Engine 3.0 — Centralized Design Tokens & Preset Themes
 *
 * Defines the complete Design Token architecture for ETHONE OS Web,
 * covering 9 curated premium themes, universal accent colors,
 * glass levels, performance tiers, and secure JSON theme import/export validation.
 */

export type ThemeCategory = "dark" | "light" | "oled" | "vibrant" | "glass";

export type PremiumThemeId =
  | "obsidian"        // ETHONE Dark (Default)
  | "midnight"        // Pure OLED Black
  | "aurora"          // Polar Teal & Sky
  | "purple-space"    // Cosmic Indigo Nebula
  | "arctic"          // Frost Icy Light
  | "carbon"          // Stealth Industrial Titanium
  | "cyber-neon"      // Synthwave High Energy
  | "minimal"         // Monochrome Minimal
  | "glass";          // Liquid Translucent Glass

export const PRESET_THEME_IDS: PremiumThemeId[] = [
  "obsidian",
  "midnight",
  "aurora",
  "purple-space",
  "arctic",
  "carbon",
  "cyber-neon",
  "minimal",
  "glass",
];

export interface ThemeDefinition {
  id: string;
  label: string;
  description: string;
  category: ThemeCategory;
  colorScheme: "dark" | "light";
  bgMain: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgSurfaceHover: string;
  bgSidebar: string;
  bgCard: string;
  bgInput: string;
  borderSubtle: string;
  borderActive: string;
  borderFocus: string;
  accentPrimary: string;
  accentSecondary: string;
  accentContrast: string;
  glowColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  textInverse: string;
  glassDefault: "off" | "low" | "medium" | "high";
  panelBlur?: string;
  isCustom?: boolean;
}

export const PRESET_THEMES: Record<PremiumThemeId, ThemeDefinition> = {
  obsidian: {
    id: "obsidian",
    label: "ETHONE Dark",
    description: "Le thème de référence : noir profond, contrastes ciselés et accents émeraude/violet.",
    category: "dark",
    colorScheme: "dark",
    bgMain: "#08080a",
    bgSurface: "#0f0f13",
    bgSurfaceElevated: "#18181e",
    bgSurfaceHover: "#22222a",
    bgSidebar: "#0c0c10",
    bgCard: "#121217",
    bgInput: "rgba(255, 255, 255, 0.04)",
    borderSubtle: "rgba(255, 255, 255, 0.07)",
    borderActive: "rgba(139, 92, 246, 0.4)",
    borderFocus: "#8b5cf6",
    accentPrimary: "#8b5cf6",
    accentSecondary: "#a78bfa",
    accentContrast: "#ffffff",
    glowColor: "rgba(139, 92, 246, 0.25)",
    textPrimary: "#ededed",
    textSecondary: "#c4c4cc",
    textMuted: "#9ca3af",
    textDisabled: "#52525b",
    textInverse: "#08080a",
    glassDefault: "medium",
    panelBlur: "20px",
  },
  midnight: {
    id: "midnight",
    label: "Midnight OLED",
    description: "Noir absolu optimisé pour écrans OLED, ultra sobre et économe en énergie.",
    category: "oled",
    colorScheme: "dark",
    bgMain: "#000000",
    bgSurface: "#09090b",
    bgSurfaceElevated: "#121216",
    bgSurfaceHover: "#1c1c22",
    bgSidebar: "#040405",
    bgCard: "#0d0d10",
    bgInput: "rgba(255, 255, 255, 0.03)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    borderActive: "rgba(255, 255, 255, 0.25)",
    borderFocus: "#ffffff",
    accentPrimary: "#ffffff",
    accentSecondary: "#a1a1aa",
    accentContrast: "#000000",
    glowColor: "rgba(255, 255, 255, 0.15)",
    textPrimary: "#ffffff",
    textSecondary: "#d4d4d8",
    textMuted: "#71717a",
    textDisabled: "#3f3f46",
    textInverse: "#000000",
    glassDefault: "low",
    panelBlur: "12px",
  },
  aurora: {
    id: "aurora",
    label: "Aurora Boreal",
    description: "Ambiance polaire apaisante avec teintes sarcelle boréale et ciel arctique.",
    category: "vibrant",
    colorScheme: "dark",
    bgMain: "#050c12",
    bgSurface: "#0a1620",
    bgSurfaceElevated: "#112230",
    bgSurfaceHover: "#1a3042",
    bgSidebar: "#071018",
    bgCard: "#0d1b26",
    bgInput: "rgba(45, 212, 191, 0.05)",
    borderSubtle: "rgba(45, 212, 191, 0.12)",
    borderActive: "rgba(45, 212, 191, 0.45)",
    borderFocus: "#2dd4bf",
    accentPrimary: "#2dd4bf",
    accentSecondary: "#38bdf8",
    accentContrast: "#050c12",
    glowColor: "rgba(45, 212, 191, 0.28)",
    textPrimary: "#e0f2fe",
    textSecondary: "#bae6fd",
    textMuted: "#7dd3fc",
    textDisabled: "#0c4a6e",
    textInverse: "#050c12",
    glassDefault: "high",
    panelBlur: "24px",
  },
  "purple-space": {
    id: "purple-space",
    label: "Purple Space",
    description: "Nébuleuse cosmique futuriste : indigo stellaire et violet profond.",
    category: "vibrant",
    colorScheme: "dark",
    bgMain: "#080612",
    bgSurface: "#100d24",
    bgSurfaceElevated: "#1a1638",
    bgSurfaceHover: "#262050",
    bgSidebar: "#0b091a",
    bgCard: "#14112e",
    bgInput: "rgba(168, 85, 247, 0.06)",
    borderSubtle: "rgba(168, 85, 247, 0.14)",
    borderActive: "rgba(168, 85, 247, 0.45)",
    borderFocus: "#a855f7",
    accentPrimary: "#c084fc",
    accentSecondary: "#e879f9",
    accentContrast: "#080612",
    glowColor: "rgba(192, 132, 252, 0.3)",
    textPrimary: "#f5f3ff",
    textSecondary: "#ddd6fe",
    textMuted: "#a78bfa",
    textDisabled: "#4c1d95",
    textInverse: "#080612",
    glassDefault: "medium",
    panelBlur: "20px",
  },
  arctic: {
    id: "arctic",
    label: "Arctic Light",
    description: "Thème clair d'une clarté cristalline : fond givré et typographie ultra-lisible.",
    category: "light",
    colorScheme: "light",
    bgMain: "#f8fafc",
    bgSurface: "#ffffff",
    bgSurfaceElevated: "#f1f5f9",
    bgSurfaceHover: "#e2e8f0",
    bgSidebar: "#f1f5f9",
    bgCard: "#ffffff",
    bgInput: "rgba(0, 0, 0, 0.04)",
    borderSubtle: "rgba(0, 0, 0, 0.08)",
    borderActive: "rgba(14, 165, 233, 0.5)",
    borderFocus: "#0284c7",
    accentPrimary: "#0284c7",
    accentSecondary: "#38bdf8",
    accentContrast: "#ffffff",
    glowColor: "rgba(2, 132, 199, 0.2)",
    textPrimary: "#0f172a",
    textSecondary: "#334155",
    textMuted: "#64748b",
    textDisabled: "#cbd5e1",
    textInverse: "#ffffff",
    glassDefault: "low",
    panelBlur: "16px",
  },
  carbon: {
    id: "carbon",
    label: "Carbon Graphite",
    description: "Esthétique industrielle furtive : gris titane, graphite mat et finitions carbone.",
    category: "dark",
    colorScheme: "dark",
    bgMain: "#0c0d10",
    bgSurface: "#14161b",
    bgSurfaceElevated: "#1e2129",
    bgSurfaceHover: "#282c37",
    bgSidebar: "#101115",
    bgCard: "#181a21",
    bgInput: "rgba(255, 255, 255, 0.035)",
    borderSubtle: "rgba(255, 255, 255, 0.06)",
    borderActive: "rgba(148, 163, 184, 0.35)",
    borderFocus: "#94a3b8",
    accentPrimary: "#94a3b8",
    accentSecondary: "#cbd5e1",
    accentContrast: "#0c0d10",
    glowColor: "rgba(148, 163, 184, 0.2)",
    textPrimary: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textMuted: "#64748b",
    textDisabled: "#334155",
    textInverse: "#0c0d10",
    glassDefault: "low",
    panelBlur: "14px",
  },
  "cyber-neon": {
    id: "cyber-neon",
    label: "Cyber Neon",
    description: "Énergie synthwave et cyberpunk : néon fuchsia vibrant et cyan électrique.",
    category: "vibrant",
    colorScheme: "dark",
    bgMain: "#090611",
    bgSurface: "#130d24",
    bgSurfaceElevated: "#1e1438",
    bgSurfaceHover: "#2d1c52",
    bgSidebar: "#0d0919",
    bgCard: "#17102b",
    bgInput: "rgba(244, 63, 94, 0.08)",
    borderSubtle: "rgba(244, 63, 94, 0.16)",
    borderActive: "rgba(0, 240, 255, 0.5)",
    borderFocus: "#f43f5e",
    accentPrimary: "#f43f5e",
    accentSecondary: "#00f0ff",
    accentContrast: "#ffffff",
    glowColor: "rgba(244, 63, 94, 0.35)",
    textPrimary: "#fdf2f8",
    textSecondary: "#fbcfe8",
    textMuted: "#f472b6",
    textDisabled: "#831843",
    textInverse: "#090611",
    glassDefault: "high",
    panelBlur: "24px",
  },
  minimal: {
    id: "minimal",
    label: "Minimal Studio",
    description: "Zéro distraction : monochrome rigoureux, typographie forte et pure clarté.",
    category: "dark",
    colorScheme: "dark",
    bgMain: "#09090b",
    bgSurface: "#121215",
    bgSurfaceElevated: "#1a1a1f",
    bgSurfaceHover: "#26262d",
    bgSidebar: "#0d0d0f",
    bgCard: "#151519",
    bgInput: "rgba(255, 255, 255, 0.04)",
    borderSubtle: "rgba(255, 255, 255, 0.07)",
    borderActive: "rgba(255, 255, 255, 0.3)",
    borderFocus: "#ffffff",
    accentPrimary: "#e4e4e7",
    accentSecondary: "#a1a1aa",
    accentContrast: "#09090b",
    glowColor: "rgba(228, 228, 231, 0.15)",
    textPrimary: "#fafafa",
    textSecondary: "#d4d4d8",
    textMuted: "#a1a1aa",
    textDisabled: "#52525b",
    textInverse: "#09090b",
    glassDefault: "off",
    panelBlur: "0px",
  },
  glass: {
    id: "glass",
    label: "Liquid Glass",
    description: "Translucidité maximale, refractions lumineuses et verre dépoli multi-couches.",
    category: "glass",
    colorScheme: "dark",
    bgMain: "#06070a",
    bgSurface: "rgba(255, 255, 255, 0.05)",
    bgSurfaceElevated: "rgba(255, 255, 255, 0.09)",
    bgSurfaceHover: "rgba(255, 255, 255, 0.14)",
    bgSidebar: "rgba(10, 12, 16, 0.75)",
    bgCard: "rgba(255, 255, 255, 0.06)",
    bgInput: "rgba(255, 255, 255, 0.07)",
    borderSubtle: "rgba(255, 255, 255, 0.12)",
    borderActive: "rgba(255, 255, 255, 0.35)",
    borderFocus: "#38bdf8",
    accentPrimary: "#38bdf8",
    accentSecondary: "#818cf8",
    accentContrast: "#06070a",
    glowColor: "rgba(56, 189, 248, 0.3)",
    textPrimary: "#ffffff",
    textSecondary: "#e2e8f0",
    textMuted: "#94a3b8",
    textDisabled: "#475569",
    textInverse: "#06070a",
    glassDefault: "high",
    panelBlur: "28px",
  },
};

export const UNIVERSAL_ACCENTS = [
  { id: "violet", label: "Violet ETHONE", hex: "#8b5cf6" },
  { id: "blue", label: "Bleu Royal", hex: "#3b82f6" },
  { id: "cyan", label: "Cyan Électrique", hex: "#06b6d4" },
  { id: "pink", label: "Rose Magenta", hex: "#ec4899" },
  { id: "red", label: "Rouge Crimson", hex: "#ef4444" },
  { id: "orange", label: "Orange Solaire", hex: "#f97316" },
  { id: "green", label: "Vert Émeraude", hex: "#10b981" },
  { id: "mint", label: "Menthe Fraîche", hex: "#34d399" },
  { id: "amber", label: "Ambre Chaud", hex: "#f59e0b" },
  { id: "sky", label: "Ciel Arctique", hex: "#38bdf8" },
  { id: "teal", label: "Turquoise", hex: "#14b8a6" },
  { id: "rose", label: "Rose Corail", hex: "#f43f5e" },
] as const;

export type AccentId = (typeof UNIVERSAL_ACCENTS)[number]["id"] | "custom";

export function getContrastColor(hex: string): "#000000" | "#ffffff" {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16) || 0;
    const g = parseInt(normalized[1] + normalized[1], 16) || 0;
    const b = parseInt(normalized[2] + normalized[2], 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 140 ? "#000000" : "#ffffff";
  }
  const r = parseInt(normalized.substring(0, 2), 16) || 0;
  const g = parseInt(normalized.substring(2, 4), 16) || 0;
  const b = parseInt(normalized.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#000000" : "#ffffff";
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(color.trim());
}

export interface CustomThemePayload {
  id: string;
  label: string;
  description?: string;
  category?: ThemeCategory;
  colorScheme?: "dark" | "light";
  bgMain: string;
  bgSurface: string;
  bgSidebar: string;
  accentPrimary: string;
  textPrimary?: string;
  textMuted?: string;
  glassDefault?: "off" | "low" | "medium" | "high";
  panelBlur?: string;
}

export function validateThemePayload(data: unknown): { ok: true; theme: ThemeDefinition } | { ok: false; error: string } {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Le fichier de thème doit être un objet JSON valide." };
  }

  const raw = data as Record<string, unknown>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "") : "custom-" + Date.now();
  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, 40) : "Thème Personnalisé";
  const description = typeof raw.description === "string" ? raw.description.slice(0, 150) : "Thème personnalisé créé par l'utilisateur.";

  const bgMain = typeof raw.bgMain === "string" && isValidHexColor(raw.bgMain) ? raw.bgMain : "#08080a";
  const bgSurface = typeof raw.bgSurface === "string" && (isValidHexColor(raw.bgSurface) || raw.bgSurface.startsWith("rgba")) ? raw.bgSurface : "#0f0f13";
  const bgSidebar = typeof raw.bgSidebar === "string" && (isValidHexColor(raw.bgSidebar) || raw.bgSidebar.startsWith("rgba")) ? raw.bgSidebar : "#0c0c10";
  const accentPrimary = typeof raw.accentPrimary === "string" && isValidHexColor(raw.accentPrimary) ? raw.accentPrimary : "#8b5cf6";

  const colorScheme = raw.colorScheme === "light" ? "light" : "dark";
  const textPrimary = typeof raw.textPrimary === "string" && isValidHexColor(raw.textPrimary) ? raw.textPrimary : (colorScheme === "light" ? "#0f172a" : "#ededed");
  const textMuted = typeof raw.textMuted === "string" && isValidHexColor(raw.textMuted) ? raw.textMuted : (colorScheme === "light" ? "#64748b" : "#9ca3af");

  const theme: ThemeDefinition = {
    id,
    label,
    description,
    category: "dark",
    colorScheme,
    bgMain,
    bgSurface,
    bgSurfaceElevated: "color-mix(in srgb, " + bgSurface + " 80%, white)",
    bgSurfaceHover: "color-mix(in srgb, " + bgSurface + " 70%, white)",
    bgSidebar,
    bgCard: "color-mix(in srgb, " + bgSurface + " 85%, black)",
    bgInput: colorScheme === "light" ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.04)",
    borderSubtle: colorScheme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.07)",
    borderActive: "color-mix(in srgb, " + accentPrimary + " 40%, transparent)",
    borderFocus: accentPrimary,
    accentPrimary,
    accentSecondary: "color-mix(in srgb, " + accentPrimary + " 70%, white)",
    accentContrast: getContrastColor(accentPrimary),
    glowColor: "color-mix(in srgb, " + accentPrimary + " 25%, transparent)",
    textPrimary,
    textSecondary: "color-mix(in srgb, " + textPrimary + " 70%, " + textMuted + ")",
    textMuted,
    textDisabled: colorScheme === "light" ? "#cbd5e1" : "#52525b",
    textInverse: bgMain,
    glassDefault: raw.glassDefault === "off" || raw.glassDefault === "low" || raw.glassDefault === "high" ? raw.glassDefault : "medium",
    panelBlur: typeof raw.panelBlur === "string" ? raw.panelBlur : "20px",
    isCustom: true,
  };

  return { ok: true, theme };
}
