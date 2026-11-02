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
