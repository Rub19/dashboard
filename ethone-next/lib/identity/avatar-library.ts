import library from "./avatar-library.json";

/** Bibliothèque d'avatars hébergée sur le site (générée par scripts/build-avatar-library.mjs). */
export type LibraryAvatar = { id: string; name: string; series: string; url: string };
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

export function searchAvatars(query: string, pool: LibraryAvatar[] = ALL_AVATARS): LibraryAvatar[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return pool;
  return pool.filter((a) => {
    const hay = fold(`${a.name} ${a.series}`);
    return words.every((w) => hay.includes(w));
  });
}

/** Anciens chemins (bibliothèque précédente) → nouvel avatar équivalent, pour les profils qui les utilisent encore. */
export function migrateLegacyAvatarUrl(url: string): string {
  const riot = url.match(/^\/avatars\/riot-(lol|val)-([a-z]+)\.png$/);
  if (riot) {
    const found = avatarById(`${riot[1] === "val" ? "valorant" : "lol"}-${riot[2]}`);
    if (found) return found.url;
  }
  const drive = url.match(/^\/avatars\/drive\/([a-z0-9-]+)\.png$/);
  if (drive) {
    const found = avatarById(`netflix-${drive[1]}`);
    if (found) return found.url;
  }
  return url;
}
