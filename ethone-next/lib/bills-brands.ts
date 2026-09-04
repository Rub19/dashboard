import { icons as simpleIcons } from "@iconify-json/simple-icons";

export type BrandMeta = {
  name: string;
  icon: string;
  color: string;
  logo: string;
  bgColor?: string;
  defaultAmount?: number;
  currency?: string;
  category?: "subscriptions" | "housing" | "utilities" | "leisure" | "other";
};

export function getLocalBrandLogo(iconName: string, color: string = "#ffffff"): string {
  try {
    const iconData = (simpleIcons.icons as Record<string, { body?: string }>)?.[iconName];
    if (!iconData?.body) return "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${iconData.body.replace(/currentColor/g, color)}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return "";
  }
}

export const BILL_BRANDS: Record<string, BrandMeta> = {
  // --- IA & Outils Pro ---
  chatgpt: {
    name: "ChatGPT Plus",
    icon: "bot",
    color: "#10a37f",
    logo: getLocalBrandLogo("openai", "#ffffff"),
    bgColor: "#10a37f",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  perplexity: {
    name: "Perplexity Pro",
    icon: "bot",
    color: "#22B8CD",
    logo: getLocalBrandLogo("perplexity", "#22B8CD"),
    bgColor: "#083344",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  canal: {
    name: "Canal+",
    icon: "tv",
    color: "#000000",
    logo: "",
    bgColor: "#18181b",
    defaultAmount: 22.99,
    currency: "€",
    category: "subscriptions",
  },
  max: {
    name: "Max HBO",
    icon: "film",
    color: "#002BE7",
    logo: "",
    bgColor: "#172554",
    defaultAmount: 9.99,
    currency: "€",
    category: "subscriptions",
  },
  openai: {
    name: "OpenAI API",
    icon: "bot",
    color: "#10a37f",
    logo: getLocalBrandLogo("openai", "#ffffff"),
    bgColor: "#10a37f",
    defaultAmount: 15,
    currency: "$",
    category: "subscriptions",
  },
  claude: {
    name: "Claude Pro",
    icon: "bot",
    color: "#d97706",
    logo: getLocalBrandLogo("anthropic", "#ffffff"),
    bgColor: "#d97706",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  anthropic: {
    name: "Anthropic Claude",
    icon: "bot",
    color: "#d97706",
    logo: getLocalBrandLogo("anthropic", "#ffffff"),
    bgColor: "#d97706",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  cursor: {
    name: "Cursor Pro",
    icon: "code",
    color: "#000000",
    logo: getLocalBrandLogo("cursor", "#ffffff"),
    bgColor: "#18181b",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  midjourney: {
    name: "Midjourney",
    icon: "image",
    color: "#1e1b4b",
    logo: "",
    bgColor: "#312e81",
    defaultAmount: 10,
    currency: "$",
    category: "subscriptions",
  },
  github: {
    name: "GitHub Copilot",
    icon: "github",
    color: "#181717",
    logo: getLocalBrandLogo("github", "#ffffff"),
    bgColor: "#27272a",
    defaultAmount: 10,
    currency: "$",
    category: "subscriptions",
  },
  notion: {
    name: "Notion Plus",
    icon: "file-text",
    color: "#000000",
    logo: getLocalBrandLogo("notion", "#ffffff"),
    bgColor: "#18181b",
    defaultAmount: 10,
    currency: "€",
    category: "subscriptions",
  },
  figma: {
    name: "Figma Professional",
    icon: "pen-tool",
    color: "#F24E1E",
    logo: getLocalBrandLogo("figma", "#F24E1E"),
    bgColor: "#450a0a",
    defaultAmount: 14,
    currency: "€",
    category: "subscriptions",
  },
  canva: {
    name: "Canva Pro",
    icon: "image",
    color: "#00C4CC",
    logo: getLocalBrandLogo("canva", "#00C4CC"),
    bgColor: "#083344",
    defaultAmount: 11.99,
    currency: "€",
    category: "subscriptions",
  },
  adobe: {
    name: "Adobe Creative Cloud",
    icon: "pen-tool",
    color: "#FF0000",
    logo: getLocalBrandLogo("adobe", "#FF0000"),
    bgColor: "#450a0a",
    defaultAmount: 35.99,
    currency: "€",
    category: "subscriptions",
  },
  vercel: {
    name: "Vercel Pro",
    icon: "zap",
    color: "#000000",
    logo: getLocalBrandLogo("vercel", "#ffffff"),
    bgColor: "#18181b",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  cloudflare: {
    name: "Cloudflare Pro",
    icon: "cloud",
    color: "#F38020",
    logo: getLocalBrandLogo("cloudflare", "#F38020"),
    bgColor: "#431407",
    defaultAmount: 20,
    currency: "$",
    category: "subscriptions",
  },
  discord: {
    name: "Discord Nitro",
    icon: "message-square",
    color: "#5865F2",
    logo: getLocalBrandLogo("discord", "#ffffff"),
    bgColor: "#5865F2",
    defaultAmount: 9.99,
    currency: "€",
    category: "subscriptions",
  },

  // --- Musique & Streaming ---
  spotify: {
    name: "Spotify Premium",
    icon: "music",
    color: "#1DB954",
    logo: getLocalBrandLogo("spotify", "#1DB954"),
    bgColor: "#052e16",
    defaultAmount: 10.99,
    currency: "€",
    category: "subscriptions",
  },
  netflix: {
    name: "Netflix Standard",
    icon: "film",
    color: "#E50914",
    logo: getLocalBrandLogo("netflix", "#E50914"),
    bgColor: "#450a0a",
    defaultAmount: 13.49,
    currency: "€",
    category: "subscriptions",
  },
  youtube: {
    name: "YouTube Premium",
    icon: "youtube",
    color: "#FF0000",
    logo: getLocalBrandLogo("youtube", "#FF0000"),
    bgColor: "#450a0a",
    defaultAmount: 12.99,
    currency: "€",
    category: "subscriptions",
  },
  prime: {
    name: "Amazon Prime",
    icon: "package",
    color: "#00A8E1",
    logo: getLocalBrandLogo("amazonprime", "#00A8E1"),
    bgColor: "#083344",
    defaultAmount: 6.99,
    currency: "€",
    category: "subscriptions",
  },
  amazon: {
    name: "Amazon Prime Video",
    icon: "package",
    color: "#FF9900",
    logo: getLocalBrandLogo("amazon", "#FF9900"),
    bgColor: "#451a03",
    defaultAmount: 6.99,
    currency: "€",
    category: "subscriptions",
  },
  disney: {
    name: "Disney+",
    icon: "clapperboard",
    color: "#113CCF",
    logo: "",
    bgColor: "#172554",
    defaultAmount: 8.99,
    currency: "€",
    category: "subscriptions",
  },
  apple: {
    name: "Apple One / iCloud",
    icon: "smartphone",
    color: "#A2AAAD",
    logo: getLocalBrandLogo("apple", "#ffffff"),
    bgColor: "#27272a",
    defaultAmount: 2.99,
    currency: "€",
    category: "subscriptions",
  },
  applemusic: {
    name: "Apple Music",
    icon: "music",
    color: "#FC3C44",
    logo: getLocalBrandLogo("applemusic", "#FC3C44"),
    bgColor: "#4c0519",
    defaultAmount: 10.99,
    currency: "€",
    category: "subscriptions",
  },
  deezer: {
    name: "Deezer Premium",
    icon: "music",
    color: "#A238FF",
    logo: getLocalBrandLogo("deezer", "#A238FF"),
    bgColor: "#3b0764",
    defaultAmount: 11.99,
    currency: "€",
    category: "subscriptions",
  },
  crunchyroll: {
    name: "Crunchyroll Mega Fan",
    icon: "tv",
    color: "#F47521",
    logo: getLocalBrandLogo("crunchyroll", "#F47521"),
    bgColor: "#431407",
    defaultAmount: 6.49,
    currency: "€",
    category: "subscriptions",
  },

  // --- Jeux Vidéo ---
  playstation: {
    name: "PlayStation Plus",
    icon: "gamepad-2",
    color: "#003791",
    logo: getLocalBrandLogo("playstation", "#003791"),
    bgColor: "#172554",
    defaultAmount: 8.99,
    currency: "€",
    category: "leisure",
  },
  xbox: {
    name: "Xbox Game Pass",
    icon: "gamepad-2",
    color: "#107C10",
    logo: getLocalBrandLogo("xbox", "#107C10"),
    bgColor: "#052e16",
    defaultAmount: 14.99,
    currency: "€",
    category: "leisure",
  },
  steam: {
    name: "Steam",
    icon: "gamepad-2",
    color: "#171a21",
    logo: getLocalBrandLogo("steam", "#ffffff"),
    bgColor: "#1e293b",
    defaultAmount: 20,
    currency: "€",
    category: "leisure",
  },
  nintendo: {
    name: "Nintendo Switch Online",
    icon: "gamepad-2",
    color: "#E60012",
    logo: getLocalBrandLogo("nintendoswitch", "#E60012"),
    bgColor: "#450a0a",
    defaultAmount: 3.99,
    currency: "€",
    category: "leisure",
  },

  // --- Télécoms & Énergie ---
  free: {
    name: "Freebox & Forfait Free",
    icon: "wifi",
    color: "#CC0000",
    logo: "",
    bgColor: "#450a0a",
    defaultAmount: 39.99,
    currency: "€",
    category: "utilities",
  },
  orange: {
    name: "Orange Livebox & Forfait",
    icon: "wifi",
    color: "#FF7900",
    logo: getLocalBrandLogo("orange", "#FF7900"),
    bgColor: "#431407",
    defaultAmount: 42.99,
    currency: "€",
    category: "utilities",
  },
  sfr: {
    name: "SFR Box & Mobile",
    icon: "wifi",
    color: "#E30613",
    logo: "",
    bgColor: "#450a0a",
    defaultAmount: 34.99,
    currency: "€",
    category: "utilities",
  },
  bouygues: {
    name: "Bouygues Bbox & B&You",
    icon: "wifi",
    color: "#003399",
    logo: "",
    bgColor: "#172554",
    defaultAmount: 32.99,
    currency: "€",
    category: "utilities",
  },
  edf: {
    name: "EDF Électricité",
    icon: "zap",
    color: "#0055A4",
    logo: "",
    bgColor: "#172554",
    defaultAmount: 75,
    currency: "€",
    category: "utilities",
  },
  engie: {
    name: "ENGIE Gaz & Énergie",
    icon: "flame",
    color: "#00AAFF",
    logo: "",
    bgColor: "#082f49",
    defaultAmount: 65,
    currency: "€",
    category: "utilities",
  },
  total: {
    name: "TotalEnergies",
    icon: "fuel",
    color: "#DA291C",
    logo: "",
    bgColor: "#450a0a",
    defaultAmount: 70,
    currency: "€",
    category: "utilities",
  },

  // --- Transport & Quotidien ---
  navigo: {
    name: "Passe Navigo Mensuel",
    icon: "train",
    color: "#0099FF",
    logo: "",
    bgColor: "#0c4a6e",
    defaultAmount: 86.4,
    currency: "€",
    category: "utilities",
  },
  uber: {
    name: "Uber One",
    icon: "car",
    color: "#000000",
    logo: getLocalBrandLogo("uber", "#ffffff"),
    bgColor: "#18181b",
    defaultAmount: 5.99,
    currency: "€",
    category: "subscriptions",
  },
  deliveroo: {
    name: "Deliveroo Plus",
    icon: "bike",
    color: "#00CDBC",
    logo: getLocalBrandLogo("deliveroo", "#00CDBC"),
    bgColor: "#042f2e",
    defaultAmount: 5.99,
    currency: "€",
    category: "subscriptions",
  },
  basicfit: {
    name: "Basic-Fit Abonnement",
    icon: "dumbbell",
    color: "#FF6600",
    logo: "",
    bgColor: "#431407",
    defaultAmount: 29.99,
    currency: "€",
    category: "leisure",
  },
};

const BRAND_ALIASES: Record<string, string> = {
  gpt: "chatgpt",
  "chat-gpt": "chatgpt",
  openai: "chatgpt",
  anthropic: "claude",
  "claude-ai": "claude",
  "cursor-ai": "cursor",
  "github-copilot": "github",
  copilot: "github",
  icloud: "apple",
  "apple-one": "apple",
  "apple-music": "applemusic",
  "apple-tv": "apple",
  "google-one": "google",
  "google-drive": "google",
  drive: "google",
  prime: "prime",
  "amazon-prime": "prime",
  disneyplus: "disney",
  "disney-plus": "disney",
  nitro: "discord",
  freebox: "free",
  livebox: "orange",
  bbox: "bouygues",
  sosh: "orange",
  red: "sfr",
  psn: "playstation",
  "ps-plus": "playstation",
  gamepass: "xbox",
  "game-pass": "xbox",
  ratp: "navigo",
  sncf: "navigo",
};

function normalizeBrand(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function detectBrandMeta(label: string, fallback?: { icon: string; color: string }): BrandMeta {
  const clean = normalizeBrand(label);

  // 1. Direct Alias Check
  for (const [alias, brandKey] of Object.entries(BRAND_ALIASES)) {
    if (clean.includes(alias.replace(/[^a-z0-9]/g, ""))) {
      const match = BILL_BRANDS[brandKey];
      if (match) return match;
    }
  }

  // 2. Exact or substring match in BILL_BRANDS
  for (const [key, meta] of Object.entries(BILL_BRANDS)) {
    if (clean.includes(key)) return meta;
  }

  // 3. Fallback generic
  return {
    name: label || "Facture",
    icon: fallback?.icon || "receipt",
    color: fallback?.color || "#8b5cf6",
    logo: "",
    bgColor: "#18181b",
    category: "subscriptions",
  };
}
