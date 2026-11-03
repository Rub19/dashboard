export type Page = "home" | "modules" | "productivity" | "files" | "mail" | "tracker" | "games" | "discord" | "brain" | "team" | "insights" | "settings";

export const MAIN_PAGES = [
  { id: "home" },
  { id: "modules" },
  { id: "productivity" },
  { id: "files" },
  { id: "mail" },
  { id: "tracker" },
  { id: "games" },
  { id: "discord" },
  { id: "brain" },
  { id: "team" },
  { id: "insights" },
] as const satisfies readonly { id: Page }[];

export const FOOT_PAGES = [
  { id: "settings" },
] as const satisfies readonly { id: Page }[];

const PAGES = new Set<Page>([...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => id));

export function pageExists(value: string): value is Page {
  return PAGES.has(value as Page);
}

export const GO_EVENT = "ethone-go";

const LABELS: Record<string, () => string> = {
  "/": () => "Accueil", "/tasks": () => "Tâches", "/calendar": () => "Calendrier", "/notes": () => "Notes", "/files": () => "Fichiers", "/mail": () => "Mail", "/team": () => "Équipe", "/tracker": () => "E:VAL", "/games": () => "E:LOL", "/discord": () => "Discord", "/brain": () => "Brain", "/activity": () => "Analyses", "/settings": () => "Réglages",
};
const MACRO_PAGES: Record<string, Page> = {
  "/": "home", "/tasks": "productivity", "/calendar": "productivity", "/notes": "productivity", "/files": "files", "/mail": "mail", "/team": "team", "/tracker": "tracker", "/games": "games", "/discord": "discord", "/brain": "brain", "/activity": "insights", "/settings": "settings",
};

export const MACRO_TARGETS = Object.entries(LABELS);
export const pageForHref = (href: string): Page | null => MACRO_PAGES[href] ?? null;
