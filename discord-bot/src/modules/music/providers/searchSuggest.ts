import { logger } from '../../../utils/logger.js';
import { getSpotifyToken } from './playlistResolver.js';

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

/**
 * Titres réels via la recherche Spotify (« Titre — Artiste ») : tolère les fautes de frappe
 * (« antoehr love » → Another Love) et ne dépend pas de l'IP du serveur, contrairement à
 * l'endpoint de suggestions YouTube. Renvoie [] sans identifiants Spotify ou en cas d'échec.
 */
async function spotifyTitleSuggestions(query: string): Promise<string[]> {
  const token = await getSpotifyToken();
  if (!token) return [];
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2200),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { tracks?: { items?: Array<{ name?: string; artists?: Array<{ name?: string }> }> } };
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of json.tracks?.items || []) {
      if (!t.name) continue;
      const artist = (t.artists || []).map((a) => a.name).filter(Boolean).slice(0, 2).join(', ');
      const label = (artist ? `${t.name} — ${artist}` : t.name).slice(0, 100);
      const k = label.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(label);
    }
    return out;
  } catch {
    return [];
  }
}

export async function youtubeSuggestions(rawQuery: string): Promise<string[]> {
  const query = rawQuery.trim();
  if (query.length < 2) return FALLBACK;

  const key = query.toLowerCase();
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;

  // 1) Spotify : de vrais morceaux. 2) suggestions YouTube. 3) la saisie elle-même — jamais la
  // liste générique quand l'utilisateur a tapé quelque chose (elle n'avait aucun rapport).
  const spotify = await spotifyTitleSuggestions(query);
  if (spotify.length > 0) {
    if (CACHE.size >= MAX_CACHE) CACHE.clear();
    CACHE.set(key, { at: Date.now(), items: spotify });
    return spotify;
  }

  try {
    const url =
      'https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&hl=en&q=' +
      encodeURIComponent(query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    if (!res.ok) return cached?.items ?? [query];

    // Réponse JSONP : `window.google.ac.h([ "q", [ ["suggestion", 0, [...]], ... ] ])`
    const text = await res.text();
    const jsonStart = text.indexOf('(');
    const jsonEnd = text.lastIndexOf(')');
    if (jsonStart === -1 || jsonEnd === -1) return cached?.items ?? [query];

    const parsed = JSON.parse(text.slice(jsonStart + 1, jsonEnd));
    const rows: unknown[] = Array.isArray(parsed?.[1]) ? parsed[1] : [];
    const items = rows
      .map((row) => (Array.isArray(row) ? String(row[0] ?? '') : ''))
      .filter((s) => s.length > 0)
      .slice(0, 24);

    const result = items.length > 0 ? items : cached?.items ?? [query];

    if (CACHE.size >= MAX_CACHE) CACHE.clear();
    CACHE.set(key, { at: Date.now(), items: result });
    return result;
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      logger.warn('[Music] Échec des suggestions YouTube :', (err as Error)?.message ?? err);
    }
    return cached?.items ?? [query];
  }
}
