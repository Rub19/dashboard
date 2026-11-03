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

export function options(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}
