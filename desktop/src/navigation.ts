export type Page = "home" | "modules" | "productivity" | "journal" | "settings" | "about";

export const MAIN_PAGES = [
  { id: "home" },
  { id: "modules" },
  { id: "productivity" },
] as const satisfies readonly { id: Page }[];

export const FOOT_PAGES = [
  { id: "journal" },
  { id: "settings" },
  { id: "about" },
] as const satisfies readonly { id: Page }[];

const PAGES = new Set<Page>([...MAIN_PAGES, ...FOOT_PAGES].map(({ id }) => id));

export function pageExists(value: string): value is Page {
  return PAGES.has(value as Page);
}
