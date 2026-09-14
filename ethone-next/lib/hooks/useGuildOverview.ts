"use client";

import { useCallback, useEffect, useState } from "react";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export interface OverviewActivity {
  id: string;
  guildId: string;
  guildName: string;
  userTag: string;
  commandName: string;
  type: "slash" | "prefix";
  timestamp: string;
}

export interface GuildOverviewData {
  guild: { memberCount: number; channelsCount: number; rolesCount: number; botPresent: boolean } | null;
  botStatus: { online: boolean; uptimeMs: number; pingMs: number } | null;
  stats: { totalCommands: number; commandsToday: number; recentActivities: OverviewActivity[] } | null;
}

export interface BotWideOverview {
  guildsCount: number;
  cachedUsersCount: number;
}

export interface ModerationCase {
  id: string;
  type: string;
  targetTag?: string;
  reason?: string;
  createdAt: string;
}

export interface ModerationOverview {
  stats: { totalCases: number; casesToday: number; activeSanctionsCount: number; counts: Record<string, number> };
  recentCases: ModerationCase[];
}

export interface MusicTrack {
  title: string;
  artist?: string;
}

export interface MusicOverview {
  status: "PLAYING" | "PAUSED" | "IDLE" | "BUFFERING";
  currentTrack: MusicTrack | null;
}

export interface TicketsOverview {
  openCount: number;
  pendingCount: number;
  closedToday: number;
}

export interface GiveawaysOverview {
  activeCount: number;
  endedCount: number;
}

export interface SecurityIncident {
  id: string;
  type: string;
  createdAt: string;
}

export interface SecurityOverview {
  status: "protected" | "warning" | "attack";
  score: number;
  recentIncidents: SecurityIncident[];
}

export interface BackupsOverview {
  kpis: { totalBackups: number; lastBackupAt: string | null; healthStatus: "HEALTHY" | "WARNING" | "CRITICAL" };
}

interface Slice<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

function idleSlice<T>(): Slice<T> {
  return { data: null, loading: true, error: false };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// Fires every guild-scoped overview endpoint in parallel via allSettled so a
// single slow/failing module (e.g. backups misconfigured) never blanks the
// whole page — each card owns its own loading/error state. Every endpoint
// here is a real, already-shipped route (see the plan this hook came from
// for exactly which ones were excluded for returning fabricated data).
export function useGuildOverview(guildId: string | null) {
  const [guild, setGuild] = useState<Slice<GuildOverviewData>>(idleSlice);
  const [botWide, setBotWide] = useState<Slice<BotWideOverview>>(idleSlice);
  const [moderation, setModeration] = useState<Slice<ModerationOverview>>(idleSlice);
  const [music, setMusic] = useState<Slice<MusicOverview>>(idleSlice);
  const [tickets, setTickets] = useState<Slice<TicketsOverview>>(idleSlice);
  const [giveaways, setGiveaways] = useState<Slice<GiveawaysOverview>>(idleSlice);
  const [security, setSecurity] = useState<Slice<SecurityOverview>>(idleSlice);
  const [backups, setBackups] = useState<Slice<BackupsOverview>>(idleSlice);

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) {
      const empty = { data: null, loading: false, error: !guildId ? false : true };
      setGuild(empty);
      setBotWide(empty);
      setModeration(empty);
      setMusic(empty);
      setTickets(empty);
      setGiveaways(empty);
      setSecurity(empty);
      setBackups(empty);
      return;
    }

    const base = `${BOT_API_URL}/api/guilds/${guildId}`;
    setGuild((s) => ({ ...s, loading: true }));
    setBotWide((s) => ({ ...s, loading: true }));
    setModeration((s) => ({ ...s, loading: true }));
    setMusic((s) => ({ ...s, loading: true }));
    setTickets((s) => ({ ...s, loading: true }));
    setGiveaways((s) => ({ ...s, loading: true }));
    setSecurity((s) => ({ ...s, loading: true }));
    setBackups((s) => ({ ...s, loading: true }));

    const [
      guildRes,
      botWideRes,
      moderationRes,
      musicRes,
      ticketsRes,
      giveawaysRes,
      securityRes,
      backupsRes,
    ] = await Promise.allSettled([
      fetchJson<GuildOverviewData>(`${base}/overview`),
      fetchJson<{ snapshot: BotWideOverview }>(`${base}/bot/overview`),
      fetchJson<ModerationOverview>(`${base}/moderation/overview`),
      fetchJson<{ state: MusicOverview }>(`${base}/music/state`),
      fetchJson<TicketsOverview>(`${base}/tickets/overview`),
      fetchJson<GiveawaysOverview>(`${base}/giveaways/overview`),
      fetchJson<SecurityOverview>(`${base}/security/overview`),
      fetchJson<BackupsOverview>(`${base}/backups/overview`),
    ]);

    setGuild(
      guildRes.status === "fulfilled"
        ? { data: guildRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setBotWide(
      botWideRes.status === "fulfilled"
        ? { data: botWideRes.value.snapshot, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setModeration(
      moderationRes.status === "fulfilled"
        ? { data: moderationRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setMusic(
      musicRes.status === "fulfilled"
        ? { data: musicRes.value.state, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setTickets(
      ticketsRes.status === "fulfilled"
        ? { data: ticketsRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setGiveaways(
      giveawaysRes.status === "fulfilled"
        ? { data: giveawaysRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setSecurity(
      securityRes.status === "fulfilled"
        ? { data: securityRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
    setBackups(
      backupsRes.status === "fulfilled"
        ? { data: backupsRes.value, loading: false, error: false }
        : { data: null, loading: false, error: true }
    );
  }, [guildId]);

  useEffect(() => {
    load();
  }, [load]);

  return { guild, botWide, moderation, music, tickets, giveaways, security, backups, refresh: load };
}
