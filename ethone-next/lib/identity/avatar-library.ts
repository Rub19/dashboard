import library from "./avatar-library.json";

/** Bibliothèque d'avatars hébergée sur le site (générée par scripts/build-avatar-library.mjs depuis C:\ETHONE-Avatars). */
/** `origin` : chemin de l'image dans le dossier source (plateforme/série/fichier). */
export type LibraryAvatar = { id: string; name: string; series: string; url: string; origin?: string };
export type AvatarCollection = { id: string; label: string; source: string; items: LibraryAvatar[] };

export const AVATAR_COLLECTIONS = library.collections as AvatarCollection[];
export const ALL_AVATARS: LibraryAvatar[] = AVATAR_COLLECTIONS.flatMap((c) => c.items);
export const AVATAR_COUNT = ALL_AVATARS.length;

const BY_ID = new Map(ALL_AVATARS.map((a) => [a.id, a]));
const BY_URL = new Map(ALL_AVATARS.map((a) => [a.url, a]));

export const avatarById = (id: string) => BY_ID.get(id);
export const avatarByUrl = (url: string) => BY_URL.get(url);

/** Séries d'une collection, dans l'ordre d'apparition (pour les filtres secondaires). */
export function seriesOf(collection: AvatarCollection): string[] {
  return [...new Set(collection.items.map((a) => a.series))];
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vrai si tous les mots de la recherche apparaissent dans le texte (sans accents ni majuscules). */
export function matchesQuery(text: string, query: string): boolean {
  const hay = fold(text);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export function searchAvatars(query: string, pool: LibraryAvatar[] = ALL_AVATARS): LibraryAvatar[] {
  if (!query.trim()) return pool;
  return pool.filter((a) => matchesQuery(`${a.name} ${a.series}`, query));
}
