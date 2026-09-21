import { Client } from 'discord.js';
import { Connectors, Constants, LoadType, Node, NodeOption, Player, Shoukaku, Track as LLTrack } from 'shoukaku';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
import { searchSpotifyTracks } from '../providers/playlistResolver.js';
import type { Track, TrackRequester } from '../types/music.js';

/**
 * Lavalink backend — the architecture used by the large public music bots
 * (Lavalink server in Java, youtube-source plugin with OAuth, the bot only
 * sends "play this encoded track" over a websocket). Nothing audio-related
 * runs inside Node any more: no ffmpeg, no Opus encoder, no yt-dlp.
 *
 * Enabled with MUSIC_BACKEND=lavalink (+ LAVALINK_HOST/PORT/PASSWORD).
 * Server install: scripts/lavalink-setup.sh.
 */
class LavalinkManager {
  private shoukaku: Shoukaku | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private client: Client | null = null;

  public get enabled(): boolean {
    return config.musicBackend === 'lavalink';
  }

  public get ready(): boolean {
    return this.getNode()?.state === Constants.State.CONNECTED;
  }

  public initialize(client: Client): void {
    if (!this.enabled || this.shoukaku) return;
    this.client = client;
    const { host, port, password, secure } = config.lavalink;
    const nodes: NodeOption[] = [{ name: 'ethone', url: `${host}:${port}`, auth: password, secure }];
    const connector = new Connectors.DiscordJS(client);
    this.shoukaku = new Shoukaku(
      connector,
      nodes,
      {
        resume: true,
        resumeTimeout: 30,
        reconnectTries: Infinity,
        reconnectInterval: 5,
        restTimeout: 15,
        moveOnDisconnect: false,
        userAgent: 'ETHONE-Bot',
      },
    );
    this.shoukaku.on('ready', (name, resumed) => logger.success(`[Lavalink] Nœud "${name}" connecté${resumed ? ' (session reprise)' : ''} — ${host}:${port}`));
    this.shoukaku.on('error', (name, err) => logger.error(`[Lavalink] Erreur nœud "${name}" :`, err));
    this.shoukaku.on('close', (name, code, reason) => logger.warn(`[Lavalink] Nœud "${name}" fermé (${code}) ${reason || ''}`));
    this.shoukaku.on('disconnect', (name, count) => logger.warn(`[Lavalink] Nœud "${name}" déconnecté (${count} lecteur(s) affecté(s)) — reconnexion…`));
    this.shoukaku.on('reconnecting', (name, left, interval) => logger.info(`[Lavalink] Reconnexion à "${name}" dans ${interval}s (${left === Infinity ? '∞' : left} essais restants)`));
    logger.info(`[Lavalink] Backend actif → ${secure ? 'wss' : 'ws'}://${host}:${port}`);

    // Shoukaku's discord.js connector only opens the node websocket on
    // `client.once('clientReady')`. We are initialised FROM the ready handler,
    // so that event has already fired and the node would never connect
    // ("Impossible de se connecter au salon vocal" on every /play). Kick the
    // connector's ready path ourselves when the client is already logged in.
    if (client.isReady()) {
      (connector as unknown as { ready(n: NodeOption[]): void }).ready(nodes);
    }

    // Garde-fou : quand Lavalink redémarre pendant que le bot tente de se reconnecter
    // (« Websocket closed before a connection was established »), Shoukaku peut ABANDONNER
    // le nœud — le bot répondait ensuite « Impossible de se connecter au salon vocal »
    // jusqu'à son propre redémarrage. Toutes les 10 s on vérifie que le nœud existe et on le
    // recrée sinon.
    this.watchdog = setInterval(() => {
      const sk = this.shoukaku;
      if (!sk || sk.nodes.has(nodes[0].name)) return;
      logger.warn('[Lavalink] Nœud absent — recréation automatique.');
      try {
        sk.addNode(nodes[0]);
      } catch (err) {
        logger.warn('[Lavalink] Recréation du nœud impossible :', err);
      }
    }, 10_000);
    this.watchdog.unref?.();
  }

  /** Resolves once a node is CONNECTED (or after `timeoutMs`, with false). */
  public async waitForNode(timeoutMs = 25_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.ready) return true;
      await new Promise((r) => setTimeout(r, 250));
    }
    return this.ready;
  }

  public getNode(): Node | undefined {
    return this.shoukaku?.getIdealNode() ?? this.shoukaku?.nodes.values().next().value;
  }

  public async join(guildId: string, channelId: string): Promise<Player | null> {
    if (!this.shoukaku || !this.client) return null;
    if (!(await this.waitForNode())) {
      logger.error(`[Lavalink] Nœud non connecté (état ${this.getNode()?.state ?? 'absent'}) — impossible de rejoindre le vocal. Lavalink tourne-t-il ? (pm2 logs lavalink)`);
      return null;
    }
    const existing = this.shoukaku.players.get(guildId);
    if (existing) {
      const conn = this.shoukaku.connections.get(guildId);
      // Déjà connecté dans le bon salon (ou état de connexion absent) : on réutilise.
      if (!conn || conn.channelId === channelId) return existing;
      await this.shoukaku.leaveVoiceChannel(guildId).catch(() => {});
    }
    const guild = this.client.guilds.cache.get(guildId);
    const options = { guildId, channelId, shardId: guild?.shardId ?? 0, deaf: true };
    try {
      return await this.shoukaku.joinVoiceChannel(options);
    } catch (err) {
      // Connexion fantôme (le bot apparaît déjà dans le vocal après un redémarrage,
      // ou Shoukaku garde une session orpheline) : on nettoie puis on réessaie une fois.
      logger.warn(`[Lavalink] joinVoiceChannel a échoué (guild ${guildId}) — nettoyage et nouvel essai :`, err);
      const stale = this.shoukaku.players.get(guildId);
      if (stale && this.shoukaku.connections.get(guildId)?.channelId === channelId) return stale;
      await this.shoukaku.leaveVoiceChannel(guildId).catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
      return this.shoukaku.joinVoiceChannel(options);
    }
  }

  public async leave(guildId: string): Promise<void> {
    if (!this.shoukaku) return;
    try {
      await this.shoukaku.leaveVoiceChannel(guildId);
    } catch (err) {
      logger.warn(`[Lavalink] leaveVoiceChannel(${guildId}) :`, err);
    }
  }

  public getPlayer(guildId: string): Player | undefined {
    return this.shoukaku?.players.get(guildId);
  }

  /**
   * Resolve a URL or free-text query into ETHONE tracks (with `encoded`).
   * Free text → YouTube Music search first (cleanest "song" results), then
   * plain YouTube. Playlists expand up to `maxPlaylist` entries.
   */
  public async resolve(
    query: string,
    requestedBy: TrackRequester,
    opts?: { limit?: number; maxPlaylist?: number; spotify?: boolean }
  ): Promise<Track[]> {
    const q = query.trim();
    const isUrl = /^https?:\/\//i.test(q);
    const limit = opts?.limit ?? 1;

    // Recherche texte : d'abord les métadonnées Spotify (titre / artiste / durée officiels, sans
    // audio — `encoded` est calculé à la lecture par ensureEncoded, qui passe `spotify: false`
    // pour ne pas relancer cette recherche). Aucun résultat proche → recherche YouTube ci-dessous.
    if (!isUrl && q && opts?.spotify !== false) {
      const sp = await searchSpotifyTracks(q, requestedBy, limit);
      if (sp.length > 0) return sp.slice(0, limit);
    }

    await this.waitForNode(5_000);
    const node = this.getNode();
    if (!node) {
      logger.error('[Lavalink] Aucun nœud disponible — le serveur Lavalink est-il démarré ? (pm2 logs lavalink)');
      return [];
    }
    const identifiers = isUrl ? [q] : [`ytmsearch:${q}`, `ytsearch:${q}`];

    for (const identifier of identifiers) {
      let res;
      try {
        res = await node.rest.resolve(identifier);
      } catch (err) {
        logger.warn(`[Lavalink] resolve(${identifier}) :`, err);
        continue;
      }
      if (!res) continue;
      switch (res.loadType) {
        case LoadType.TRACK:
          return [this.toTrack(res.data, requestedBy)];
        case LoadType.SEARCH:
          if (res.data.length > 0) return res.data.slice(0, limit).map((t) => this.toTrack(t, requestedBy));
          break;
        case LoadType.PLAYLIST: {
          const max = opts?.maxPlaylist ?? 100;
          const start = Math.max(0, res.data.info.selectedTrack);
          return res.data.tracks.slice(start, start + max).map((t) => this.toTrack(t, requestedBy, res.data.info.name));
        }
        case LoadType.ERROR:
          logger.warn(`[Lavalink] ${identifier} → ${res.data.severity}: ${res.data.message} (${res.data.cause})`);
          break;
        case LoadType.EMPTY:
        default:
          break;
      }
    }
    return [];
  }

  public toTrack(t: LLTrack, requestedBy: TrackRequester, album?: string): Track {
    const src = (t.info.sourceName || '').toLowerCase();
    const source: Track['source'] = src.includes('youtube') ? 'YOUTUBE' : src.includes('soundcloud') ? 'SOUNDCLOUD' : src.includes('spotify') ? 'SPOTIFY' : 'DIRECT';
    return {
      id: `ll-${t.info.identifier || t.encoded.slice(0, 12)}`,
      title: t.info.title,
      artist: t.info.author || 'Inconnu',
      album: album || t.info.sourceName || null,
      duration: t.info.isStream ? 0 : Math.round(t.info.length / 1000),
      thumbnail: t.info.artworkUrl || (src.includes('youtube') && t.info.identifier ? `https://i.ytimg.com/vi/${t.info.identifier}/mqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'),
      url: t.info.uri || '',
      source,
      encoded: t.encoded,
      requestedBy,
      addedAt: new Date().toISOString(),
    };
  }

  /**
   * Repli quand YouTube refuse de streamer (IP de datacenter bloquée, login
   * exigé…) : la recherche a réussi (métadonnées OK) mais la lecture échoue.
   * SoundCloud ne demande aucune connexion, on cherche donc "artiste titre" là-bas.
   */
  public async resolveSoundCloudFallback(track: Track, requestedBy: TrackRequester): Promise<Track | null> {
    return (await this.resolveSoundCloudCandidates(track, requestedBy, new Set(), 1))[0] ?? null;
  }

  /**
   * Résultats SoundCloud classés par proximité de durée (les extraits de 30 s et
   * les URLs déjà essayées sont écartés). Les candidats gardent l'id du titre
   * d'origine : si l'un d'eux est mort (404), on passe au suivant.
   */
  public async resolveSoundCloudCandidates(
    track: Track,
    requestedBy: TrackRequester,
    exclude: Set<string> = new Set(),
    max = 3
  ): Promise<Track[]> {
    const node = this.getNode();
    if (!node) return [];
    const q = `${track.artist} ${track.title}`.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const res = await node.rest.resolve(`scsearch:${q}`);
      if (res?.loadType !== LoadType.SEARCH || res.data.length === 0) return [];
      const target = track.duration || 0;
      const norm = (v: string): string =>
        v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
      const titleTokens = norm(track.title).split(' ').filter((w) => w.length >= 2);
      const artistTokens = norm(track.artist).split(' ').filter((w) => w.length >= 3);
      // Variantes qu'on ne veut pas si elles ne sont pas dans le titre demandé.
      const variants = /\b(slowed|reverb|sped up|speed up|nightcore|remix|cover|karaoke|instrumental|8d|bass boosted|mashup|acoustic|live|edit)\b/;
      const wantedVariants = norm(`${track.title}`) + ' ' + track.title.toLowerCase();

      const scored = res.data
        .map((d) => this.toTrack(d, requestedBy))
        .filter((c) => !exclude.has(c.url) && !this.previewUrls.has(c.url) && (!target || c.duration === 0 || c.duration >= target * 0.7))
        .map((c) => {
          const text = norm(`${c.title} ${c.artist}`);
          const titleOk = titleTokens.length === 0 || titleTokens.every((w) => text.includes(w));
          const artistOk = artistTokens.length === 0 || artistTokens.some((w) => text.includes(w));
          // Test sur le titre brut (les parenthèses « (Slowed + Reverb) » sont retirées par norm()).
          const rawText = `${c.title} ${c.artist}`.toLowerCase();
          const badVariant = variants.test(rawText) && !variants.test(wantedVariants);
          const diff = target && c.duration ? Math.abs(c.duration - target) : 0;
          const durOk = !target || !c.duration || diff <= Math.max(15, target * 0.12);
          return { c, titleOk, artistOk, badVariant, diff, durOk };
        });

      // 1) titre + artiste + durée cohérents, sans variante ; 2) idem sans exiger l'artiste.
      // Aucun candidat correct → on préfère échouer que jouer un autre morceau.
      const pick = (pred: (x: (typeof scored)[number]) => boolean) => scored.filter(pred).sort((x, y) => x.diff - y.diff);
      const best = pick((x) => x.titleOk && x.artistOk && !x.badVariant && x.durOk);
      // Paliers de plus en plus tolérants : mieux vaut une autre version du BON titre que le silence.
      const relaxed = best.length
        ? best
        : pick((x) => x.titleOk && !x.badVariant && x.durOk).length
          ? pick((x) => x.titleOk && !x.badVariant && x.durOk)
          : pick((x) => x.titleOk && !x.badVariant).length
            ? pick((x) => x.titleOk && !x.badVariant)
            : pick((x) => x.titleOk);
      if (relaxed.length === 0) {
        logger.warn(
          `[Lavalink] SoundCloud : aucun résultat exploitable pour "${q}" — reçus : ${scored
            .slice(0, 5)
            .map((x) => `"${x.c.title}" (${x.c.artist}, ${x.c.duration}s)`)
            .join(' | ')}`
        );
      }
      // Écarte AVANT lecture les extraits (« SNIP », ~30 s) : la page publique de la piste indique
      // sa politique. Sans ça, le morceau démarrait puis coupait au bout de quelques secondes.
      const shortlist = relaxed.slice(0, Math.max(max, 4));
      const verdicts = await Promise.all(shortlist.map((x) => this.isSoundCloudSnip(x.c.url)));
      const playable = shortlist.filter((_, i) => !verdicts[i]);
      // Si TOUT est un extrait, mieux vaut un extrait que le silence : on garde la liste d'origine.
      const finalList = playable.length > 0 ? playable : shortlist;
      return finalList
        .slice(0, max)
        // Titre/artiste RÉELS du résultat (pas ceux demandés) : le panneau ne ment plus.
        .map((x) => ({ ...x.c, id: track.id, thumbnail: track.thumbnail || x.c.thumbnail }));
    } catch (err) {
      logger.warn(`[Lavalink] scsearch:${q} :`, err);
      return [];
    }
  }

  private youtubeBlockedUntil = 0;

  /** URLs SoundCloud qui se sont arrêtées trop tôt (extraits ~30 s) : plus jamais proposées. */
  private previewUrls = new Set<string>();

  private snipCache = new Map<string, boolean>();

  /**
   * SoundCloud marque les titres « Go+ » avec `"policy":"SNIP"` dans le JSON de leur page
   * publique : le flux n'est alors qu'un extrait de ~30 s alors que la durée annoncée est
   * complète. Résultat mis en cache ; en cas d'échec réseau on suppose « lisible ».
   */
  private async isSoundCloudSnip(url: string): Promise<boolean> {
    if (!url || !/^https?:\/\/(www\.)?soundcloud\.com\//i.test(url)) return false;
    if (this.previewUrls.has(url)) return true;
    const cached = this.snipCache.get(url);
    if (cached !== undefined) return cached;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return false;
      const html = await res.text();
      const snip = /"policy":"SNIP"/.test(html);
      if (this.snipCache.size > 500) this.snipCache.clear();
      this.snipCache.set(url, snip);
      if (snip) {
        this.markPreviewUrl(url);
        logger.info(`[Lavalink] SoundCloud : "${url}" est un extrait (SNIP) — écarté.`);
      }
      return snip;
    } catch {
      return false;
    }
  }

  public markPreviewUrl(url: string): void {
    if (!url) return;
    if (this.previewUrls.size > 500) this.previewUrls.clear();
    this.previewUrls.add(url);
  }

  private get youtubeBlocked(): boolean {
    return Date.now() < this.youtubeBlockedUntil;
  }

  /** Appelé quand un flux YouTube a échoué puis été remplacé par SoundCloud (30 min). */
  public markYoutubeBlocked(): void {
    this.youtubeBlockedUntil = Date.now() + 30 * 60_000;
  }

  /** Re-encode a track that came from persistence/playlists without `encoded`. */
  public async ensureEncoded(track: Track, requestedBy: TrackRequester): Promise<Track | null> {
    if (track.encoded) return track;
    // YouTube refuse déjà de streamer depuis ce serveur : inutile d'encoder un
    // titre YouTube pour l'échec garanti, on va directement chez SoundCloud
    // (choisi par durée) pour les titres issus de recherches / playlists Spotify.
    if (this.youtubeBlocked && !/^https?:\/\/(?!open\.spotify)/i.test(track.url || '')) {
      const sc = await this.resolveSoundCloudFallback(track, requestedBy);
      if (sc?.encoded) return sc;
    }
    // Persisted/imported tracks may carry a yt-dlp search pseudo-URL
    // (ytsearch1:…) or a Spotify page URL — neither is playable by Lavalink,
    // so fall back to a text search on title + artist.
    const usable = track.url && /^https?:\/\//i.test(track.url) && !/spotify\.com/i.test(track.url) ? track.url : `${track.title} ${track.artist}`.trim();
    const [resolved] = await this.resolve(usable, requestedBy, { limit: 1, spotify: false });
    return resolved ? { ...track, encoded: resolved.encoded, url: track.url || resolved.url, duration: track.duration || resolved.duration } : null;
  }
}

export const lavalinkManager = new LavalinkManager();
