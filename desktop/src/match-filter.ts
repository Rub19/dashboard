export type ResultFilter = "all" | "win" | "loss";
export interface MatchFilter { result: ResultFilter; mode: string; pick: string }
export const NO_FILTER: MatchFilter = { result: "all", mode: "", pick: "" };

export const filterActive = (filter: MatchFilter) => filter.result !== "all" || Boolean(filter.mode) || Boolean(filter.pick);

export function keepMatch(filter: MatchFilter, line: { won: boolean; draw?: boolean; mode: string; pick: string }): boolean {
  if (filter.result === "win" && !line.won) return false;
  if (filter.result === "loss" && (line.won || line.draw)) return false;
  if (filter.mode && line.mode !== filter.mode) return false;
  return !filter.pick || line.pick === filter.pick;
}

export function timeAgo(iso: string | null | undefined, now: number, language: "fr" | "en"): string {
  const at = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(at)) return "";
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const span = days > 0 ? (language === "fr" ? `${days} j` : `${days}d`) : hours > 0 ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
  return language === "fr" ? `il y a ${span}` : `${span} ago`;
}

export function options(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
