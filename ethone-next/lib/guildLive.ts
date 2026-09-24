"use client";

/**
 * Flux temps réel PARTAGÉ d'un serveur Discord (SSE du bot) : une seule connexion par serveur, quel que soit le nombre
 * de composants qui l'écoutent (sélecteurs de rôles et de salons, tuiles…). Ouvert au premier abonné, fermé quelques
 * secondes après le dernier ; reconnexion automatique avec attente croissante.
 */
export interface GuildLiveEvent {
  type: string;
  payload: { kind?: string; module?: string; [key: string]: unknown } | undefined;
}

type Handler = (event: GuildLiveEvent) => void;

interface Stream {
  source: EventSource | null;
  handlers: Set<Handler>;
  retry: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  closeTimer: ReturnType<typeof setTimeout> | null;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const EVENT_TYPES = ["DISCORD_EVENT", "CONFIG_UPDATED"];
const streams = new Map<string, Stream>();

function open(guildId: string, stream: Stream) {
  if (stream.source || typeof window === "undefined" || !BOT_API_URL) return;
  const source = new EventSource(`${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/sync/stream`, { withCredentials: true });
  stream.source = source;
  source.onopen = () => {
    stream.retry = 0;
  };
  const dispatch = (e: MessageEvent) => {
    let parsed: { type?: string; payload?: GuildLiveEvent["payload"] };
    try {
      parsed = JSON.parse(e.data);
    } catch {
      return;
    }
    const event: GuildLiveEvent = { type: String(parsed.type || e.type), payload: parsed.payload };
    for (const handler of stream.handlers) {
      try {
        handler(event);
      } catch {
        // un abonné défaillant ne doit pas priver les autres des événements
      }
    }
  };
  for (const type of EVENT_TYPES) source.addEventListener(type, dispatch as EventListener);
  source.onerror = () => {
    source.close();
    stream.source = null;
    if (stream.handlers.size === 0) return;
    const wait = Math.min(1000 * Math.pow(1.6, stream.retry), 30000);
    stream.retry += 1;
    stream.retryTimer = setTimeout(() => {
      stream.retryTimer = null;
      if (stream.handlers.size > 0) open(guildId, stream);
    }, wait);
  };
}

/** S'abonne aux événements d'un serveur. Renvoie la fonction de désabonnement (à retourner depuis un useEffect). */
export function subscribeGuildLive(guildId: string, handler: Handler): () => void {
  let stream = streams.get(guildId);
  if (!stream) {
    stream = { source: null, handlers: new Set(), retry: 0, retryTimer: null, closeTimer: null };
    streams.set(guildId, stream);
  }
  if (stream.closeTimer) {
    clearTimeout(stream.closeTimer);
    stream.closeTimer = null;
  }
  stream.handlers.add(handler);
  open(guildId, stream);

  const current = stream;
  return () => {
    current.handlers.delete(handler);
    if (current.handlers.size === 0 && !current.closeTimer) {
      // Petit délai : un changement de page réabonne aussitôt, inutile de couper puis rouvrir la connexion.
      current.closeTimer = setTimeout(() => {
        if (current.handlers.size === 0) {
          current.source?.close();
          current.source = null;
          if (current.retryTimer) clearTimeout(current.retryTimer);
          streams.delete(guildId);
        }
      }, 5000);
    }
  };
}
