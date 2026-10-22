export const HIDDEN_COMMANDS = new Set(['godmode', 'rescue']);

const CATEGORY_MAP: Record<string, string> = {
  musique: 'Musique',
  music: 'Musique',
  spotify: 'Spotify',
  lastfm: 'Last.fm',
  fun: 'Fun',
  modération: 'Modération',
  moderation: 'Modération',
  sécurité: 'Sécurité',
  security: 'Sécurité',
  économie: 'Économie',
  economy: 'Économie',
  leveling: 'Communauté',
  communauté: 'Communauté',
  community: 'Communauté',
  administration: 'Administration',
  serveur: 'Administration',
  server: 'Administration',
  management: 'Administration',
  général: 'Général',
  general: 'Général',
  core: 'Général',
  utilitaires: 'Utilitaires',
  utility: 'Utilitaires',
  support: 'Utilitaires',
  voice: 'Vocal',
  vocal: 'Vocal',
  configuration: 'Administration',
  'jeux & casino': 'Jeux',
  jeux: 'Jeux',
  games: 'Jeux',
  events: 'Communauté',
  événements: 'Communauté',
};

export function familyOf(category: string | undefined): string {
  return CATEGORY_MAP[String(category ?? '').trim().toLowerCase()] ?? 'Autres';
}
