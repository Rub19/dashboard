export type IconSource = "none" | "server" | "member" | "custom";
export type Format = "embed" | "container" | "text";

export type Field = { id: string; name: string; value: string; inline: boolean };
export type Button = { id: string; label: string; emoji: string | null; style: string; action: string; target: string };

export type Embed = {
  enabled: boolean;
  title: string;
  url?: string;
  description: string;
  color: string;
  authorName: string;
  authorIconUrl: string | null;
  footer: string;
  footerIconUrl: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  showTimestamp: boolean;
  showThumbnail: boolean;
  fields: Field[];
  authorIcon?: IconSource;
  thumbnail?: IconSource;
  imageSource?: IconSource;
  footerIcon?: IconSource;
};

export type CardFont = "poppins" | "bebas" | "serif" | "mono";
export type Layer =
  | { id: string; type: "text"; visible: boolean; x: number; y: number; text: string; size: number; color: string; font: CardFont; weight: "400" | "600" | "700" | "800"; align: "left" | "center" | "right"; maxWidth: number; uppercase: boolean; opacity: number }
  | { id: string; type: "avatar"; visible: boolean; x: number; y: number; size: number; shape: "circle" | "rounded" | "square"; borderWidth: number; borderColor: string }
  | { id: string; type: "image"; visible: boolean; x: number; y: number; url: string; w: number; h: number; radius: number; opacity: number }
  | { id: string; type: "shape"; visible: boolean; x: number; y: number; shape: "rect" | "circle"; w: number; h: number; radius: number; color: string; opacity: number };

export type CardSize = "large" | "medium" | "banner" | "square";
export type Background = { type: "color" | "gradient" | "image"; color: string; color2: string; angle: number; url: string; overlay: number };

export type CardImage = {
  enabled: boolean;
  titleText: string;
  subtitleText: string;
  tagText: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  animated?: boolean;
  size?: CardSize;
  background?: Background;
  layers?: Layer[];
  [k: string]: unknown;
};

export type MessageCommon = {
  enabled: boolean;
  format?: Format;
  contentAbove: string;
  messageContent: string;
  embed: Embed;
  buttons: Button[];
};

export type ChannelMessage = MessageCommon & {
  channelId: string | null;
  mentionUser: boolean;
  notifyRoles: boolean;
  deleteAfterSeconds: number;
  asServer: boolean;
  image: CardImage;
};

export type Welcome = ChannelMessage & {
  dm: MessageCommon & { attachCard: boolean };
  conditions: { enabled: boolean; minAccountAgeDays: number; [k: string]: unknown };
  autoRoleIds: string[];
};

export type Config = {
  welcome: Welcome;
  goodbye: ChannelMessage;
  ghostPing: { enabled: boolean; channelIds: string[]; text: string; deleteAfterSeconds: number };
  options: { waitVerification: boolean; ignoreBots: boolean; quickLeave: "keep" | "delete" | "deleteSilent" };
};

export type Meta = { botName: string; botAvatar: string | null; guildName: string; guildIcon: string | null; memberCount: number; canWebhook: boolean };

export const SIZE_PX: Record<CardSize, [number, number]> = { large: [1024, 450], medium: [800, 350], banner: [1200, 400], square: [600, 600] };
export const SIZE_OPTIONS: ReadonlyArray<readonly [CardSize, string]> = [
  ["large", "Large · 1024 × 450"],
  ["medium", "Moyenne · 800 × 350"],
  ["banner", "Bannière · 1200 × 400"],
  ["square", "Carrée · 600 × 600"],
];

export const VARIABLES: ReadonlyArray<readonly [string, string]> = [
  ["{user}", "Mention du membre"],
  ["{displayname}", "Pseudo affiché"],
  ["{username}", "Nom d'utilisateur"],
  ["{userid}", "Identifiant du membre"],
  ["{server}", "Nom du serveur"],
  ["{membercount}", "Nombre de membres"],
  ["{membercount.ordinal}", "Rang du membre (20e)"],
  ["{accountage}", "Âge du compte"],
  ["{createdat}", "Date de création du compte"],
  ["{serverowner}", "Propriétaire du serveur"],
  ["{channel}", "Salon du message"],
];

export const formatOf = (m: { format?: Format; embed: { enabled: boolean } }): Format => m.format ?? (m.embed.enabled ? "embed" : "text");

export function iconSources(e: Embed, dm = false): Record<"author" | "thumbnail" | "image" | "footer", IconSource> {
  return {
    author: e.authorIcon ?? (e.authorIconUrl ? "custom" : dm ? "server" : "member"),
    thumbnail: e.thumbnail ?? (!e.showThumbnail ? "none" : e.thumbnailUrl ? "custom" : dm ? "server" : "member"),
    image: e.imageSource ?? (e.imageUrl ? "custom" : "none"),
    footer: e.footerIcon ?? (e.footerIconUrl ? "custom" : dm ? "none" : "server"),
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export type Template = { id: string; label: string; build: (size: CardSize, img: CardImage) => { background: Background; layers: Layer[] } };

const text = (p: Partial<Extract<Layer, { type: "text" }>> & { text: string; x: number; y: number }): Layer => ({
  id: uid(),
  type: "text",
  visible: true,
  size: 40,
  color: "#FFFFFF",
  font: "poppins",
  weight: "700",
  align: "center",
  maxWidth: 900,
  uppercase: false,
  opacity: 1,
  ...p,
});

export const TEMPLATES: Template[] = [
  {
    id: "center",
    label: "Centré",
    build: (size, img) => {
      const [w, h] = SIZE_PX[size];
      const av = Math.round(Math.min(w, h) * 0.3);
      const top = Math.round(h * 0.08);
      return {
        background: { type: "gradient", color: "#1E1F22", color2: "#5865F2", angle: 135, url: "", overlay: 0 },
        layers: [
          { id: uid(), type: "avatar", visible: true, x: Math.round(w / 2 - av / 2), y: top, size: av, shape: "circle", borderWidth: 6, borderColor: "#FFFFFF" },
          text({ text: img.titleText || "BIENVENUE", x: w / 2, y: Math.round(top + av + h * 0.13), size: Math.round(h * 0.15), font: "bebas", weight: "400", maxWidth: w - 80 }),
          text({ text: img.subtitleText || "{displayname}", x: w / 2, y: Math.round(top + av + h * 0.27), size: Math.round(h * 0.09), weight: "700", maxWidth: w - 80 }),
          text({ text: img.tagText || "Tu es notre {membercount.ordinal} membre", x: w / 2, y: Math.round(top + av + h * 0.37), size: Math.round(h * 0.05), weight: "400", color: "#E4E6EB", maxWidth: w - 80 }),
        ],
      };
    },
  },
  {
    id: "left",
    label: "Classique",
    build: (size, img) => {
      const [w, h] = SIZE_PX[size];
      const av = Math.round(h * 0.5);
      return {
        background: { type: "color", color: img.backgroundColor || "#0B0C10", color2: img.accentColor || "#10B981", angle: 135, url: "", overlay: 0 },
        layers: [
          { id: uid(), type: "shape", visible: true, x: 0, y: h - 10, shape: "rect", w, h: 10, radius: 0, color: img.accentColor || "#10B981", opacity: 1 },
          { id: uid(), type: "avatar", visible: true, x: Math.round(h * 0.18), y: Math.round(h / 2 - av / 2), size: av, shape: "circle", borderWidth: 6, borderColor: img.accentColor || "#10B981" },
          text({ text: img.titleText || "BIENVENUE", x: Math.round(h * 0.3 + av), y: Math.round(h * 0.36), size: Math.round(h * 0.09), weight: "600", align: "left", color: img.accentColor || "#10B981", maxWidth: w - av - h * 0.5 }),
          text({ text: img.subtitleText || "{displayname}", x: Math.round(h * 0.3 + av), y: Math.round(h * 0.52), size: Math.round(h * 0.14), align: "left", maxWidth: w - av - h * 0.5 }),
          text({ text: img.tagText || "Membre #{membercount}", x: Math.round(h * 0.3 + av), y: Math.round(h * 0.68), size: Math.round(h * 0.06), weight: "400", align: "left", color: "#C9CDD4", maxWidth: w - av - h * 0.5 }),
        ],
      };
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    build: (size, img) => {
      const [w, h] = SIZE_PX[size];
      const av = Math.round(h * 0.26);
      return {
        background: { type: "color", color: "#111214", color2: "#5865F2", angle: 135, url: "", overlay: 0 },
        layers: [
          { id: uid(), type: "avatar", visible: true, x: 48, y: 48, size: av, shape: "rounded", borderWidth: 0, borderColor: "#FFFFFF" },
          text({ text: img.titleText || "Bienvenue", x: 48 + av + 24, y: 48 + av / 2, size: Math.round(h * 0.06), weight: "600", align: "left", color: "#A1A1AA", maxWidth: w - av - 140 }),
          text({ text: img.subtitleText || "{displayname}", x: 48, y: Math.round(h * 0.7), size: Math.round(h * 0.16), align: "left", maxWidth: w - 96 }),
          text({ text: img.tagText || "{server} · {membercount} membres", x: 48, y: Math.round(h * 0.86), size: Math.round(h * 0.05), weight: "400", align: "left", color: "#A1A1AA", maxWidth: w - 96 }),
        ],
      };
    },
  },
  {
    id: "goodbye",
    label: "Au revoir",
    build: (size, img) => {
      const [w, h] = SIZE_PX[size];
      const av = Math.round(Math.min(w, h) * 0.3);
      const top = Math.round(h * 0.08);
      return {
        background: { type: "gradient", color: "#1E1F22", color2: "#ED4245", angle: 135, url: "", overlay: 0 },
        layers: [
          { id: uid(), type: "avatar", visible: true, x: Math.round(w / 2 - av / 2), y: top, size: av, shape: "circle", borderWidth: 6, borderColor: "#FFFFFF" },
          text({ text: img.titleText || "À BIENTÔT", x: w / 2, y: Math.round(top + av + h * 0.13), size: Math.round(h * 0.15), font: "bebas", weight: "400", maxWidth: w - 80 }),
          text({ text: img.subtitleText || "{displayname}", x: w / 2, y: Math.round(top + av + h * 0.27), size: Math.round(h * 0.09), maxWidth: w - 80 }),
          text({ text: img.tagText || "Nous sommes maintenant {membercount}", x: w / 2, y: Math.round(top + av + h * 0.37), size: Math.round(h * 0.05), weight: "400", color: "#E4E6EB", maxWidth: w - 80 }),
        ],
      };
    },
  },
];

export const DELETE_AFTER: ReadonlyArray<readonly [number, string]> = [
  [0, "Jamais"],
  [10, "Après 10 secondes"],
  [30, "Après 30 secondes"],
  [60, "Après 1 minute"],
  [300, "Après 5 minutes"],
  [600, "Après 10 minutes"],
  [3600, "Après 1 heure"],
  [86400, "Après 1 jour"],
];
