export function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function score(label: string, query: string): number | null {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const hay = normalize(label);
  if (!words.every((word) => hay.includes(word))) return null;
  if (hay.startsWith(words[0])) return 0;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${words[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u").test(hay) ? 1 : 2;
}

export function rank<T extends { id: string; label: string }>(items: T[], query: string, recent: string[]): { list: T[]; recentCount: number } {
  if (!query.trim()) {
    const first = recent.map((id) => items.find((item) => item.id === id)).filter((item): item is T => Boolean(item));
    return { list: [...first, ...items.filter((item) => !first.includes(item))], recentCount: first.length };
  }
  const scored = items.map((item) => ({ item, value: score(item.label, query) })).filter((row): row is { item: T; value: number } => row.value !== null);
  return { list: scored.sort((a, b) => a.value - b.value).map((row) => row.item), recentCount: 0 };
}

export function matchRange(label: string, query: string): [number, number] | null {
  const word = normalize(query).split(/\s+/).filter(Boolean)[0];
  const hay = normalize(label);
  if (!word || hay.length !== label.length) return null;
  const at = hay.indexOf(word);
  return at < 0 ? null : [at, at + word.length];
}

export function remember(recent: string[], id: string, limit = 5) {
  return [id, ...recent.filter((other) => other !== id)].slice(0, limit);
}
