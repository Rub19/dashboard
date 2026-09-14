"use client";

// Discord Lanyard presence (discord_status, activities, live Spotify) is
// fetched directly from api.lanyard.rest — a third-party API, not proxied
// through the Worker — from multiple independent, uncoordinated call sites
// (lib/hooks/useLiveData.ts and lib/hooks/useNowPlaying.ts, each mounted by
// several always-on components: PresenceProvider, DynamicIslandContainer,
// Dock, ...). None of those calls went through fetchWorkerCached (which only
// covers Worker-routed requests), so every consumer's own poll timer fired
// its own uncached request against the same URL — confirmed live via a
// console capture showing dozens of near-simultaneous identical
// api.lanyard.rest calls. This module gives every caller one shared,
// short-TTL cache + in-flight dedup, mirroring the pattern already used for
// Worker requests in lib/hooks/useCachedFetch.ts.

type LanyardData = Record<string, unknown>;

const TTL_MS = 10_000;
const cache = new Map<string, { data: LanyardData | null; ts: number }>();
const pending = new Map<string, Promise<LanyardData | null>>();

export async function fetchLanyardCached(userId?: string | null): Promise<LanyardData | null> {
  if (!userId) return null;

  const cached = cache.get(userId);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

  const inFlight = pending.get(userId);
  if (inFlight) return inFlight;

  const request = (async () => {
    let data: LanyardData | null = null;
    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = (await res.json()) as { success?: boolean; data?: LanyardData };
        if (json.success && json.data) data = json.data;
      }
    } catch {}
    cache.set(userId, { data, ts: Date.now() });
    pending.delete(userId);
    return data;
  })();

  pending.set(userId, request);
  return request;
}
