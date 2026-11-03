export type RuleTrigger = { type: "time"; value: string } | { type: "page"; value: string };
export type RuleAction = { type: "look"; value: string } | { type: "density"; value: "comfortable" | "compact" };
export interface Rule { id: string; enabled: boolean; trigger: RuleTrigger; action: RuleAction }

const pad = (value: number) => String(value).padStart(2, "0");
export const clockKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const rulesForTime = (rules: Rule[], date: Date) => rules.filter((rule) => rule.enabled && rule.trigger.type === "time" && rule.trigger.value === clockKey(date));
export const rulesForPage = (rules: Rule[], page: string) => rules.filter((rule) => rule.enabled && rule.trigger.type === "page" && rule.trigger.value === page);

export function inQuietHours(date: Date, on: boolean, from: string, to: string): boolean {
  if (!on || from === to) return false;
  const now = clockKey(date);
  return from < to ? now >= from && now < to : now >= from || now < to;
}

export function interactionStats(events: { eventType?: string; createdAt?: string }[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const kind = event.eventType || "other";
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts].sort((left, right) => right[1] - left[1]);
}
