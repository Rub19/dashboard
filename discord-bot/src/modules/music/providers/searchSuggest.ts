import { logger } from '../../../utils/logger.js';

/**
 * Suggestions de recherche pour l'autocomplétion de `/play`.
 *
 * Utilise l'endpoint public de suggestions YouTube (le même que la barre de
 * recherche du site) : pas de clé API, réponse en ~150-300 ms, ce qui tient
 * largement dans la fenêtre de 3 s imposée à une réponse d'autocomplétion.
 * Résultat mis en cache brièvement par requête pour absorber les frappes
 * rapides.
 */

const CACHE = new Map<string, { at: number; items: string[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE = 200;

const FALLBACK: string[] = [
  'lofi hip hop radio',
  'synthwave mix',
  'phonk 2026',
  'chillhop lounge',
  'deep house set',
  'piano relaxing',
];

export async function youtubeSuggestions(rawQuery: string): Promise<string[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return FALLBACK;

  const key = query.toLowerCase();
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;

  try {
    const url =
      'https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&hl=en&q=' +
      encodeURIComponent(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    if (!res.ok) return cached?.items ?? FALLBACK;

    // Réponse JSONP : `window.google.ac.h([ "q", [ ["suggestion", 0, [...]], ... ] ])`
    const text = await res.text();
    const jsonStart = text.indexOf('(');
    const jsonEnd = text.lastIndexOf(')');
    if (jsonStart === -1 || jsonEnd === -1) return cached?.items ?? FALLBACK;

    const parsed = JSON.parse(text.slice(jsonStart + 1, jsonEnd));
    const rows: unknown[] = Array.isArray(parsed?.[1]) ? parsed[1] : [];
    const items = rows
      .map((row) => (Array.isArray(row) ? String(row[0] ?? '') : ''))
      .filter((s) => s.length > 0)
      .slice(0, 24);

    const result = items.length > 0 ? items : cached?.items ?? FALLBACK;

    if (CACHE.size >= MAX_CACHE) CACHE.clear();
    CACHE.set(key, { at: Date.now(), items: result });
    return result;
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      logger.warn('[Music] Échec des suggestions YouTube :', (err as Error)?.message ?? err);
    }
    return cached?.items ?? FALLBACK;
  }
}
