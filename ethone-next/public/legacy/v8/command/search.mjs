import { COMMANDS } from "./catalog.mjs";
import { SUPPORTED_LOCALES, translateSource } from "../i18n/catalog.mjs";

export function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function subsequenceScore(query, candidate) {
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

  return queryIndex === query.length ? score - Math.max(0, candidate.length - query.length) * 0.08 : -1;
}

function commandScore(command, normalizedQuery, context) {
  const route = String(context.route || "home");
  const contextTags = new Set([route, `space-${String(context.space || "personal")}`]);
  const recent = new Set(context.recent || []);
  const pinned = new Set(context.pinned || []);
  const frequency = context.frequency || {};
  const localizedAliases = SUPPORTED_LOCALES.flatMap((locale) => [
    translateSource(command.label, locale),
    translateSource(command.subtitle, locale),
    translateSource(command.category, locale),
    ...(command.aliases || []).map((alias) => translateSource(alias, locale))
  ]);
  const haystack = normalizeSearch([command.label, command.subtitle, command.category, ...localizedAliases, ...command.keywords, ...(command.aliases || [])].join(" "));
  let score = 0;

  if (context.categoryFilter && normalizeSearch(command.category) !== context.categoryFilter) {
    return -1;
  }

  if (!normalizedQuery) {
    score = command.contexts.some((entry) => contextTags.has(entry)) ? command.contextPriority || 80 : 10;
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
  if (command.contexts.some((entry) => contextTags.has(entry))) {
    score += normalizedQuery ? Math.min(18, (command.contextPriority || 40) * 0.15) : (command.contextPriority || 40);
  }
  if (pinned.has(command.id)) score += 24;
  if (recent.has(command.id)) score += 12;
  const freq = Number.isFinite(frequency[command.id]) ? frequency[command.id] : 0;
  if (freq > 0) score += Math.min(30, Math.log2(freq + 1) * 6);
  return score;
}

function parseCategoryFilter(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return { filter: "", remainder: "" };
  const match = trimmed.match(/^\/(\S*)\s*(.*)$/);
  if (match) {
    return { filter: normalizeSearch(match[1]), remainder: normalizeSearch(match[2]) };
  }
  return { filter: "", remainder: normalizeSearch(trimmed) };
}

export function searchCommands(query, context = {}, limit = 9) {
  const { filter: categoryFilter, remainder: normalizedQuery } = parseCategoryFilter(query);
  const additionalCommands = Array.isArray(context.additionalCommands) ? context.additionalCommands : [];
  const searchContext = { ...context, categoryFilter, normalizedQuery: undefined };
  const uniqueCommands = [...COMMANDS, ...additionalCommands].filter((command, index, entries) => (
    command?.id && entries.findIndex((entry) => entry?.id === command.id) === index
  ));
  return uniqueCommands
    .map((command, index) => ({ command, index, score: commandScore(command, normalizedQuery, searchContext) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, Math.max(1, Math.min(20, limit)))
    .map((entry) => entry.command);
}
