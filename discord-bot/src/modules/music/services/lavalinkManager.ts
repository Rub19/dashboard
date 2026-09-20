import { Client } from 'discord.js';
import { Connectors, Constants, LoadType, Node, NodeOption, Player, Shoukaku, Track as LLTrack } from 'shoukaku';
import { config } from '../../../config.js';
import { logger } from '../../../utils/logger.js';
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
  }

  /** Resolves once a node is CONNECTED (or after `timeoutMs`, with false). */
  public async waitForNode(timeoutMs = 10_000): Promise<boolean> {
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
      if (conn && conn.channelId !== channelId) {
        await this.shoukaku.leaveVoiceChannel(guildId);
      } else {
        return existing;
      }
    }
    const guild = this.client.guilds.cache.get(guildId);
    return this.shoukaku.joinVoiceChannel({ guildId, channelId, shardId: guild?.shardId ?? 0, deaf: true });
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
  public async resolve(query: string, requestedBy: TrackRequester, opts?: { limit?: number; maxPlaylist?: number }): Promise<Track[]> {
    await this.waitForNode(5_000);
    const node = this.getNode();
    if (!node) {
      logger.error('[Lavalink] Aucun nœud disponible — le serveur Lavalink est-il démarré ? (pm2 logs lavalink)');
      return [];
    }
    const q = query.trim();
    const isUrl = /^https?:\/\//i.test(q);
    const identifiers = isUrl ? [q] : [`ytmsearch:${q}`, `ytsearch:${q}`];
    const limit = opts?.limit ?? 1;

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
    const node = this.getNode();
    if (!node) return null;
    const q = `${track.artist} ${track.title}`.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      const res = await node.rest.resolve(`scsearch:${q}`);
      if (res?.loadType === LoadType.SEARCH && res.data.length > 0) {
        // SoundCloud often returns 30 s previews (Go+ tracks) or remixes first:
        // prefer the result whose length is closest to the original and drop previews.
        const candidates = res.data.map((d) => this.toTrack(d, requestedBy));
        const target = track.duration || 0;
        const ranked = candidates
          .filter((c) => !target || c.duration === 0 || c.duration >= target * 0.7)
          .sort((a, b) => (target ? Math.abs(a.duration - target) - Math.abs(b.duration - target) : 0));
        const found = ranked[0];
        if (!found) return null;
        return { ...found, thumbnail: track.thumbnail || found.thumbnail, title: track.title, artist: track.artist };
      }
    } catch (err) {
      logger.warn(`[Lavalink] scsearch:${q} :`, err);
    }
    return null;
  }

  /** Re-encode a track that came from persistence/playlists without `encoded`. */
  public async ensureEncoded(track: Track, requestedBy: TrackRequester): Promise<Track | null> {
    if (track.encoded) return track;
    // Persisted/imported tracks may carry a yt-dlp search pseudo-URL
    // (ytsearch1:…) or a Spotify page URL — neither is playable by Lavalink,
    // so fall back to a text search on title + artist.
    const usable = track.url && /^https?:\/\//i.test(track.url) && !/spotify\.com/i.test(track.url) ? track.url : `${track.title} ${track.artist}`.trim();
    const [resolved] = await this.resolve(usable, requestedBy, { limit: 1 });
    return resolved ? { ...track, encoded: resolved.encoded, url: track.url || resolved.url, duration: track.duration || resolved.duration } : null;
  }
}

export const lavalinkManager = new LavalinkManager();
