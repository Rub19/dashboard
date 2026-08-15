export type BrandMeta = {
  icon: string;
  color: string;
  logo?: string;
};

export const BILL_BRANDS: Record<string, BrandMeta> = {
  spotify: { icon: "music", color: "#1DB954", logo: "https://cdn.simpleicons.org/spotify/1DB954" },
  netflix: { icon: "film", color: "#E50914", logo: "https://cdn.simpleicons.org/netflix/E50914" },
  youtube: { icon: "youtube", color: "#FF0000", logo: "https://cdn.simpleicons.org/youtube/FF0000" },
  prime: { icon: "package", color: "#00A8E1", logo: "https://cdn.simpleicons.org/amazonprime/00A8E1" },
  amazon: { icon: "package", color: "#FF9900", logo: "https://cdn.simpleicons.org/amazon/FF9900" },
  disney: { icon: "clapperboard", color: "#113CCF", logo: "https://cdn.simpleicons.org/disney/113CCF" },
  github: { icon: "github", color: "#181717", logo: "https://cdn.simpleicons.org/github/ffffff" },
  notion: { icon: "file-text", color: "#000000", logo: "https://cdn.simpleicons.org/notion/000000" },
  figma: { icon: "pen-tool", color: "#F24E1E", logo: "https://cdn.simpleicons.org/figma/F24E1E" },
  apple: { icon: "smartphone", color: "#555555", logo: "https://cdn.simpleicons.org/apple/555555" },
  google: { icon: "chrome", color: "#4285F4", logo: "https://cdn.simpleicons.org/google/4285F4" },
  microsoft: { icon: "monitor", color: "#5E5E5E", logo: "https://cdn.simpleicons.org/microsoft/5E5E5E" },
  orange: { icon: "wifi", color: "#FF7900", logo: "https://cdn.simpleicons.org/orange/FF7900" },
  sfr: { icon: "wifi", color: "#E30613", logo: "https://cdn.simpleicons.org/sfr/E30613" },
  bouygues: { icon: "wifi", color: "#003399", logo: "https://cdn.simpleicons.org/bouyguestelecom/003399" },
  free: { icon: "wifi", color: "#E30613", logo: "https://cdn.simpleicons.org/free/E30613" },
  edf: { icon: "zap", color: "#0055A4", logo: "https://cdn.simpleicons.org/edf/0055A4" },
  engie: { icon: "flame", color: "#E96F26", logo: "https://cdn.simpleicons.org/engie/E96F26" },
  total: { icon: "fuel", color: "#DA291C", logo: "https://cdn.simpleicons.org/totalenergies/DA291C" },
  uber: { icon: "car", color: "#000000", logo: "https://cdn.simpleicons.org/uber/000000" },
};

function normalizeBrand(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function detectBrandMeta(label: string, fallback?: { icon: string; color: string }): BrandMeta {
  const normalized = normalizeBrand(label);
  for (const [key, meta] of Object.entries(BILL_BRANDS)) {
    if (normalized.includes(key)) return meta;
  }
  for (const [key, meta] of Object.entries(BILL_BRANDS)) {
    if (label.toLowerCase().includes(key)) return meta;
  }
  return fallback || { icon: "receipt", color: "var(--muted)" };
}
