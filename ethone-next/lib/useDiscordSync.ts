"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SyncConnectionState = "connected" | "connecting" | "disconnected" | "syncing";

export interface SyncEventData {
  id: string;
  type: string;
  guildId?: string;
  source: string;
  actorId?: string;
  originId?: string;
  version: number;
  timestamp: number;
  payload: any;
}

interface UseDiscordSyncOptions {
  guildId?: string;
  enabled?: boolean;
  onEvent?: (event: SyncEventData) => void;
  onPresenceChanged?: (presence: any) => void;
  onConfigUpdated?: (module: string, config: any) => void;
}

export function useDiscordSync({
  guildId,
  enabled = true,
  onEvent,
  onPresenceChanged,
  onConfigUpdated,
}: UseDiscordSyncOptions = {}) {
  const [connectionState, setConnectionState] = useState<SyncConnectionState>("connecting");
  const [lastEvent, setLastEvent] = useState<SyncEventData | null>(null);
  const [eventsCount, setEventsCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const activeMutationIds = useRef<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Émission d'une mutation avec tag de traçabilité anti-boucle
  const mutate = useCallback(
    async (module: string, path: string, value: any, previousValue?: any) => {
      const mutationId = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeMutationIds.current.add(mutationId);
      setIsSyncing(true);

      try {
        const endpoint = guildId ? `/api/sync/mutate` : `/api/sync/mutate`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mutationId,
            guildId,
            module,
            path,
            value,
            previousValue,
          }),
        });

        const data = await res.json().catch(() => null);
        return { success: res.ok && data?.success, data, mutationId };
      } catch (err: any) {
        return { success: false, error: err.message, mutationId };
      } finally {
        // Délais de grâce avant de retirer l'id pour laisser passer l'écho SSE
        setTimeout(() => {
          activeMutationIds.current.delete(mutationId);
          if (activeMutationIds.current.size === 0) {
            setIsSyncing(false);
          }
        }, 300);
      }
    },
    [guildId]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setConnectionState("connecting");

      const sseUrl = guildId
        ? `/api/guilds/${guildId}/sync/stream`
        : `/api/sync/stream`;

      try {
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isMounted) return;
          setConnectionState("connected");
          retryCountRef.current = 0;
        };

        const handleIncoming = (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const parsed: SyncEventData = JSON.parse(e.data);

            // Protection anti-boucle : si l'événement provient de notre propre mutation active
            if (parsed.originId && activeMutationIds.current.has(parsed.originId)) {
              // Echo local reconnu, ne pas redéclencher d'effet en cascade
              return;
            }

            setLastEvent(parsed);
            setEventsCount((c) => c + 1);

            onEvent?.(parsed);

            if (parsed.type === "PRESENCE_CHANGED") {
              onPresenceChanged?.(parsed.payload);
            } else if (parsed.type === "CONFIG_UPDATED") {
              onConfigUpdated?.(parsed.payload?.module, parsed.payload?.config);
            }
          } catch {
            // Ignorer JSON invalide ou heartbeat brut
          }
        };

        es.addEventListener("CONFIG_UPDATED", handleIncoming);
        es.addEventListener("PRESENCE_CHANGED", handleIncoming);
        es.addEventListener("DISCORD_EVENT", handleIncoming);
        es.addEventListener("MUTATION_CONFIRMED", handleIncoming);
        es.addEventListener("HEARTBEAT", (e: MessageEvent) => {
          if (!isMounted) return;
          setConnectionState("connected");
        });

        es.onerror = () => {
          if (!isMounted) return;
          setConnectionState("disconnected");
          es.close();

          // Reconnexion avec backoff exponentiel (max 10s)
          const backoff = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
          retryCountRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) connect();
          }, backoff);
        };
      } catch {
        setConnectionState("disconnected");
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [guildId, enabled, onEvent, onPresenceChanged, onConfigUpdated]);

  return {
    connectionState,
    isSyncing,
    lastEvent,
    eventsCount,
    mutate,
  };
}
