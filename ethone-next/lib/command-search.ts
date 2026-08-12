import type { CommandItem } from "./commands";

export type SearchableCommandItem = CommandItem & {
  subtitle?: string;
  keywords?: string[];
  aliases?: string[];
  contexts?: string[];
  contextPriority?: number;
};

export type CommandSearchContext = {
  routeCategory?: string | null;
  pinned?: Set<string>;
  recent?: Set<string>;
  frequency?: Record<string, number>;
  categoryFilter?: string;
};

const MAX_FREQUENCY_BONUS = 30;
const CONTEXT_BONUS_QUERY = 18;
const CONTEXT_BONUS_EMPTY = 80;

export function normalizeSearch(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function subsequenceScore(query: string, candidate: string): number {
  if (!query) return 0;
  let queryIndex = 0;
  let score = 0;
  let streak = 0;

  for (let index = 0; index < candidate.length && queryIndex < query.length; index += 1) {
    if (candidate[index] !== query[queryIndex]) {
      streak = 0;
      continue;
    }
    streak += 1;
    score += 3 + streak * 2;
    if (index === 0 || candidate[index - 1] === " ") score += 8;
    queryIndex += 1;
  }

  return queryIndex === query.length
    ? score - Math.max(0, candidate.length - query.length) * 0.08
    : -1;
}

export function commandScore(
  command: SearchableCommandItem,
  normalizedQuery: string,
  context: CommandSearchContext = {}
): number {
  const categoryFilter = context.categoryFilter;
  const commandCategory = normalizeSearch(command.category);

  if (categoryFilter && !commandCategory.includes(categoryFilter)) {
    return -1;
  }

  const haystack = normalizeSearch(
    [
      command.id,
      command.label,
      command.subtitle,
      command.category,
      ...(command.aliases || []),
      ...(command.keywords || []),
    ].join(" ")
  );

  let score = 0;

  if (!normalizedQuery) {
    if (context.routeCategory && commandCategory === context.routeCategory) {
      score = CONTEXT_BONUS_EMPTY;
    } else if (command.contexts?.some((ctx) => ctx === context.routeCategory)) {
      score = command.contextPriority ?? CONTEXT_BONUS_EMPTY;
    } else {
      score = 10;
    }
  } else if (haystack === normalizedQuery) {
    score = 240;
  } else if (haystack.startsWith(normalizedQuery)) {
    score = 210 - (haystack.length - normalizedQuery.length) * 0.1;
  } else if (haystack.includes(normalizedQuery)) {
    score = 170 - haystack.indexOf(normalizedQuery) * 0.2;
  } else {
    score = subsequenceScore(normalizedQuery, haystack);
  }

  if (score < 0) return score;

  if (context.routeCategory && commandCategory === context.routeCategory) {
    score += CONTEXT_BONUS_QUERY;
  }
  if (command.contexts?.some((ctx) => ctx === context.routeCategory)) {
    score += normalizedQuery
      ? Math.min(CONTEXT_BONUS_QUERY, (command.contextPriority ?? 40) * 0.15)
      : (command.contextPriority ?? 40);
  }

  if (context.pinned?.has(command.id)) score += 24;
  if (context.recent?.has(command.id)) score += 12;

  const freq = Number.isFinite(context.frequency?.[command.id])
    ? (context.frequency![command.id] as number)
    : 0;
  if (freq > 0) {
    score += Math.min(MAX_FREQUENCY_BONUS, Math.log2(freq + 1) * 6);
  }

  return score;
}

export function parseCategoryFilter(query: string): { filter: string; remainder: string } {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return { filter: "", remainder: "" };
  const match = trimmed.match(/^([>\/])(\S*)\s*(.*)$/);
  if (match) {
    return { filter: normalizeSearch(match[2]), remainder: normalizeSearch(match[3]) };
  }
  return { filter: "", remainder: normalizeSearch(trimmed) };
}

export function searchCommands(
  commands: SearchableCommandItem[],
  query: string,
  context: CommandSearchContext = {},
  limit = 500
): SearchableCommandItem[] {
  const { filter, remainder } = parseCategoryFilter(query);
  const searchContext = { ...context, categoryFilter: filter };
  const scored = commands
    .map((command, index) => ({
      command,
      index,
      score: commandScore(command, remainder, searchContext),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, Math.max(1, Math.min(commands.length, limit))).map((entry) => entry.command);
}
