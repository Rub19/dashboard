"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWorkerCached } from "@/lib/hooks/useCachedFetch";
import { fetchWeatherSafe } from "@/lib/weather-service";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useConnections } from "./useConnections";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { listBills, getNextDueDate } from "@/lib/bills-manager";

export type NowPlaying = {
  id?: string;
  source?: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
  artworkUrl?: string;
  covers?: string[];
  progressMs?: number;
  durationMs?: number;
  volumePercent?: number;
  deviceId?: string;
  isPlaying?: boolean;
  isSaved?: boolean;
};

export type LanyardPresence = {
  userId?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  avatarHash?: string;
  discriminator?: string;
  discord_status?: "online" | "idle" | "dnd" | "offline";
  spotify?: {
    playing?: boolean;
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
    artworkUrl?: string;
  };
  activities?: Array<{
    name: string;
    state?: string;
    details?: string;
  }>;
};

export type LiveRecord = {
  id: string;
  source: string;
  label: string;
  title: string;
  subtitle?: string;
  meta?: string;
  image?: string;
  status: "connected" | "loading" | "empty" | "error";
};

export type LastfmPeriod = "7day" | "1month" | "3month" | "6month" | "12month" | "overall";
export const LASTFM_PERIODS: LastfmPeriod[] = ["7day", "1month", "3month", "6month", "12month", "overall"];

type ApiData = Record<string, unknown>;

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asStr).filter((item): item is string => Boolean(item));
}

async function fetchOptional(path: string): Promise<ApiData | null> {
  const res = (await fetchWorkerCached(path)) as { data?: ApiData } | null;
  return res?.data ?? null;
}

function getArtworkUrl(np: ApiData | null): string | undefined {
  return asStr(np?.artworkUrl || np?.cover || np?.artwork);
}

function mapLocalBills(): ApiData[] {
  return listBills().map((b) => {
    const nextDue = getNextDueDate(b);
    return {
      id: b.id,
      label: b.label,
      title: b.label,
      amount: b.amount,
      currency: b.currency,
      dueAt: nextDue ?? b.dueDate,
      date: nextDue ?? b.dueDate,
      due: nextDue ?? b.dueDate,
      paid: b.paid,
      category: b.category,
      recurrence: b.recurrence,
    };
  });
}

export function useLiveData(pollMs = 60000) {
  const { settings } = useSettings();
  const { performanceMode = "normal" } = settings;
  const effectivePollMs = performanceMode === "low" ? 300000 : pollMs;
  const { connected } = useConnections();
  const {
    liveNowPlayingSource,
    liveNowPlayingIdentity,
    liveLanyardUserId,
    liveYoutubeClientId,
    liveRedditClientId,
    liveWeatherCity,
    liveLastfmUsername,
    liveTwitchLogin,
    liveMinecraftUsername,
    liveSteamId,
    liveSteamAppId,
    liveRssUrl,
    liveBlueskyHandle,
    liveTrackerRiotName,
    liveTrackerRiotTag,
    liveTrackerApexPlatform,
    liveTrackerApexIdentifier,
    calendarClientId,
    driveClientId,
  } = settings;

  const i18n = useI18n();

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [lanyard, setLanyard] = useState<LanyardPresence | null>(null);
  const [weather, setWeather] = useState<ApiData | null>(null);
  const [github, setGitHub] = useState<ApiData | null>(null);
  const [todoist, setTodoist] = useState<ApiData | null>(null);
  const [youtube, setYouTube] = useState<ApiData | null>(null);
  const [reddit, setReddit] = useState<ApiData | null>(null);
  const [lastfm, setLastfm] = useState<ApiData | null>(null);
  const [twitch, setTwitch] = useState<ApiData | null>(null);
  const [minecraft, setMinecraft] = useState<ApiData | null>(null);
  const [steam, setSteam] = useState<ApiData | null>(null);
  const [rss, setRss] = useState<ApiData | null>(null);
  const [bluesky, setBluesky] = useState<ApiData | null>(null);
  const [bills, setBills] = useState<ApiData[] | null>(null);
  const [valorant, setValorant] = useState<ApiData[] | null>(null);
  const [lol, setLol] = useState<ApiData[] | null>(null);
  const [calendar, setCalendar] = useState<ApiData | null>(null);
  const [drive, setDrive] = useState<ApiData | null>(null);
  const [notion, setNotion] = useState<ApiData | null>(null);
  const [apexProfile, setApexProfile] = useState<ApiData | null>(null);
  const [apexMatches, setApexMatches] = useState<ApiData[] | null>(null);

  const [lastfmPeriod, setLastfmPeriod] = useState<LastfmPeriod>("7day");
  const [lastfmTopArtists, setLastfmTopArtists] = useState<ApiData[] | null>(null);
  const [lastfmTopTracks, setLastfmTopTracks] = useState<ApiData[] | null>(null);
  const [steamRecentGames, setSteamRecentGames] = useState<ApiData[] | null>(null);
  const [steamOwnedGames, setSteamOwnedGames] = useState<ApiData[] | null>(null);
  const [steamAchievements, setSteamAchievements] = useState<ApiData[] | null>(null);
  const [minecraftNameHistory, setMinecraftNameHistory] = useState<ApiData[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const lastRefreshRef = useRef<number>(0);

  const isSpotifyConnected =
    typeof window !== "undefined" &&
    (localStorage.getItem("ethone:connected:spotify") === "true" ||
      Boolean(localStorage.getItem("ethone:token:spotify")) ||
      connected.has("spotify"));

  const spotifyClientId =
    settings.liveSpotifyClientId ||
    (typeof window !== "undefined" ? localStorage.getItem("ethone:cred:spotify:clientId") : null) ||
    OAUTH_APP_CLIENT_IDS.spotify;

  const nowPlayingPath =
    liveNowPlayingSource === "lanyard" && liveNowPlayingIdentity
      ? `/api/now-playing?source=lanyard&userId=${encodeURIComponent(liveNowPlayingIdentity)}`
      : liveNowPlayingSource === "lastfm" && liveNowPlayingIdentity
      ? `/api/now-playing?source=lastfm&username=${encodeURIComponent(liveNowPlayingIdentity)}`
      : (liveNowPlayingSource === "spotify" || isSpotifyConnected) && spotifyClientId
      ? `/api/spotify/now-playing?clientId=${encodeURIComponent(spotifyClientId)}`
      : null;

  const lanyardUserId =
    liveLanyardUserId ||
    (typeof window !== "undefined"
      ? localStorage.getItem("ethone:pub:discord:liveLanyardUserId") ||
        localStorage.getItem("ethone:discord:userId")
      : null);

  const lanyardPath = lanyardUserId
    ? `/api/lanyard/presence?userId=${encodeURIComponent(lanyardUserId)}`
    : null;

  const weatherPath = liveWeatherCity
    ? `/api/weather?city=${encodeURIComponent(liveWeatherCity)}`
    : null;

  const youtubePath = liveYoutubeClientId && connected.has("youtube")
    ? `/api/youtube/activity?clientId=${encodeURIComponent(liveYoutubeClientId)}`
    : null;

  const redditPath = liveRedditClientId && connected.has("reddit")
    ? `/api/reddit/activity?clientId=${encodeURIComponent(liveRedditClientId)}`
    : null;

  const githubPath = connected.has("github") ? "/api/github/profile" : null;
  const todoistPath = connected.has("todoist") ? "/api/todoist/tasks" : null;

  const lastfmPath = liveLastfmUsername
    ? `/api/lastfm/recent-tracks?username=${encodeURIComponent(liveLastfmUsername)}&limit=1`
    : null;

  const lastfmTopArtistsPath = liveLastfmUsername
    ? `/api/lastfm/top-artists?username=${encodeURIComponent(liveLastfmUsername)}&period=${encodeURIComponent(
        lastfmPeriod
      )}&limit=10`
    : null;

  const lastfmTopTracksPath = liveLastfmUsername
    ? `/api/lastfm/top-tracks?username=${encodeURIComponent(liveLastfmUsername)}&period=${encodeURIComponent(
        lastfmPeriod
      )}&limit=10`
    : null;

  const twitchPath = liveTwitchLogin
    ? `/api/twitch/channel?login=${encodeURIComponent(liveTwitchLogin)}`
    : null;

  const minecraftPath = liveMinecraftUsername
    ? `/api/minecraft/profile?username=${encodeURIComponent(liveMinecraftUsername)}`
    : null;

  const steamPath = liveSteamId ? `/api/steam/player?steamId=${encodeURIComponent(liveSteamId)}` : null;
  const steamRecentGamesPath = liveSteamId
    ? `/api/steam/recent-games?steamId=${encodeURIComponent(liveSteamId)}&count=5`
    : null;
  const steamOwnedGamesPath = liveSteamId
    ? `/api/steam/owned-games?steamId=${encodeURIComponent(liveSteamId)}&limit=20`
    : null;

  const steamAchievementsPath = liveSteamId && liveSteamAppId
    ? `/api/steam/achievements?steamId=${encodeURIComponent(liveSteamId)}&appId=${encodeURIComponent(liveSteamAppId)}`
    : null;

  const rssPath = liveRssUrl ? `/api/rss?url=${encodeURIComponent(liveRssUrl)}` : null;

  const blueskyPath = liveBlueskyHandle
    ? `/api/bluesky/profile?handle=${encodeURIComponent(liveBlueskyHandle)}`
    : null;

  const cleanRiotName = (liveTrackerRiotName || "").trim();
  const cleanRiotTag = (liveTrackerRiotTag || "").trim().replace(/^#/, "");
  const hasRiotId = Boolean(cleanRiotName && cleanRiotTag);
  const valorantPath = hasRiotId
    ? `/api/stats/valorant-matches?name=${encodeURIComponent(cleanRiotName)}&tag=${encodeURIComponent(cleanRiotTag)}`
    : null;
  const lolPath = hasRiotId
    ? `/api/stats/lol-matches?name=${encodeURIComponent(cleanRiotName)}&tag=${encodeURIComponent(cleanRiotTag)}`
    : null;

  const calendarPath =
    calendarClientId && connected.has("google-calendar")
      ? `/api/google-calendar/events?clientId=${encodeURIComponent(calendarClientId)}`
      : null;

  const drivePath =
    driveClientId && connected.has("google-drive")
      ? `/api/google-drive/files?clientId=${encodeURIComponent(driveClientId)}`
      : null;

  const notionPath = connected.has("notion") ? "/api/notion/pages" : null;

  const hasApexId = liveTrackerApexPlatform && liveTrackerApexIdentifier;
  const apexProfilePath = hasApexId
    ? `/api/stats/apex-profile?platform=${encodeURIComponent(liveTrackerApexPlatform)}&identifier=${encodeURIComponent(
        liveTrackerApexIdentifier
      )}`
    : null;
  const apexMatchesPath = hasApexId
    ? `/api/stats/apex-matches?platform=${encodeURIComponent(liveTrackerApexPlatform)}&identifier=${encodeURIComponent(
        liveTrackerApexIdentifier
      )}&mode=all`
    : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      if (!cancelled) setError(null);
      try {
        const [
          np,
          la,
          we,
          gh,
          td,
          yt,
          rd,
          lf,
          lfArt,
          lfTrk,
          tw,
          mc,
          st,
          stRecent,
          stOwned,
          stAchievements,
          rs,
          bs,
          bl,
          va,
          lo,
          ca,
          dr,
          no,
          ap,
          am,
        ] = await Promise.allSettled([
          nowPlayingPath ? fetchOptional(nowPlayingPath) : Promise.resolve(null),
          lanyardPath ? fetchOptional(lanyardPath) : Promise.resolve(null),
          weatherPath ? fetchWeatherSafe(liveWeatherCity || "Paris") : fetchWeatherSafe("Paris"),
          githubPath ? fetchOptional(githubPath) : Promise.resolve(null),
          todoistPath ? fetchOptional(todoistPath) : Promise.resolve(null),
          youtubePath ? fetchOptional(youtubePath) : Promise.resolve(null),
          redditPath ? fetchOptional(redditPath) : Promise.resolve(null),
          lastfmPath ? fetchOptional(lastfmPath) : Promise.resolve(null),
          lastfmTopArtistsPath ? fetchOptional(lastfmTopArtistsPath) : Promise.resolve(null),
          lastfmTopTracksPath ? fetchOptional(lastfmTopTracksPath) : Promise.resolve(null),
          twitchPath ? fetchOptional(twitchPath) : Promise.resolve(null),
          minecraftPath ? fetchOptional(minecraftPath) : Promise.resolve(null),
          steamPath ? fetchOptional(steamPath) : Promise.resolve(null),
          steamRecentGamesPath ? fetchOptional(steamRecentGamesPath) : Promise.resolve(null),
          steamOwnedGamesPath ? fetchOptional(steamOwnedGamesPath) : Promise.resolve(null),
          steamAchievementsPath ? fetchOptional(steamAchievementsPath) : Promise.resolve(null),
          rssPath ? fetchOptional(rssPath) : Promise.resolve(null),
          blueskyPath ? fetchOptional(blueskyPath) : Promise.resolve(null),
          Promise.resolve(mapLocalBills()),
          valorantPath ? fetchOptional(valorantPath) : Promise.resolve(null),
          lolPath ? fetchOptional(lolPath) : Promise.resolve(null),
          calendarPath ? fetchOptional(calendarPath) : Promise.resolve(null),
          drivePath ? fetchOptional(drivePath) : Promise.resolve(null),
          notionPath ? fetchOptional(notionPath) : Promise.resolve(null),
          apexProfilePath ? fetchOptional(apexProfilePath) : Promise.resolve(null),
          apexMatchesPath ? fetchOptional(apexMatchesPath) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        // Don't flag global error on optional third-party integrations being idle
        if (!cancelled) setError(null);
        if (np.status === "fulfilled") {
          const d = np.value || {};
          const track = (d.track as ApiData) || d;
          setNowPlaying({
            id: asStr(track.id ?? d.id),
            source: asStr(d.source) || "Spotify",
            title: asStr(track.title ?? d.title),
            artist: asStr(track.artist ?? d.artist),
            album: asStr(track.album ?? d.album),
            cover: asStr(track.cover ?? track.artworkUrl ?? track.artwork ?? d.cover ?? d.artworkUrl ?? d.artwork),
            artworkUrl: asStr(track.artworkUrl ?? track.artwork ?? track.cover ?? d.artworkUrl ?? d.artwork ?? d.cover),
            covers: [...new Set([...asStringList(track.covers), ...asStringList(d.covers)])],
            progressMs: asNum(track.progressMs ?? d.progressMs),
            durationMs: asNum(track.durationMs ?? d.durationMs),
            isPlaying: Boolean(d.isPlaying ?? d.playing ?? track.isPlaying ?? track.playing),
            isSaved: track.isSaved === true,
          });
        }
        if (la.status === "fulfilled") {
          const d = (la.value || {}) as ApiData;
          const discordUser = (d.discord_user as ApiData) || {};
          const lanyardUserId = asStr(discordUser.id) || asStr(d.userId);
          const lanyardAvatarHash = asStr(discordUser.avatar) || asStr(d.avatarHash);
          const lanyardDiscriminator = asStr(discordUser.discriminator) || asStr(d.discriminator);
          const lanyardAvatarUrl =
            asStr(d.avatarUrl) ||
            (lanyardUserId && lanyardAvatarHash
              ? `https://cdn.discordapp.com/avatars/${lanyardUserId}/${lanyardAvatarHash}.${String(lanyardAvatarHash).startsWith("a_") ? "gif" : "png"}?size=256`
              : "");
          setLanyard({
            userId: lanyardUserId,
            displayName:
              asStr(discordUser.global_name) || asStr(discordUser.display_name) || asStr(d.displayName),
            username: asStr(discordUser.username) || asStr(d.username),
            avatarUrl: lanyardAvatarUrl,
            avatarHash: lanyardAvatarHash,
            discriminator: lanyardDiscriminator,
            discord_status:
              (d.discord_status as LanyardPresence["discord_status"]) ||
              (d.status as LanyardPresence["discord_status"]) ||
              "offline",
            spotify: d.spotify
              ? {
                  playing: Boolean((d.spotify as ApiData).playing),
                  title: asStr((d.spotify as ApiData).title),
                  artist: asStr((d.spotify as ApiData).artist),
                  album: asStr((d.spotify as ApiData).album),
                  artwork: asStr((d.spotify as ApiData).artworkUrl ?? (d.spotify as ApiData).artwork),
                  artworkUrl: asStr((d.spotify as ApiData).artworkUrl ?? (d.spotify as ApiData).artwork),
                }
              : undefined,
            activities: Array.isArray(d.activities)
              ? d.activities.map((a: unknown) => ({
                  name: asStr((a as ApiData).name) || "",
                  state: asStr((a as ApiData).state),
                  details: asStr((a as ApiData).details),
                }))
              : [],
          });
        }
        if (we.status === "fulfilled") setWeather(we.value);
        if (gh.status === "fulfilled") setGitHub(gh.value);
        if (td.status === "fulfilled") setTodoist(td.value);
        if (yt.status === "fulfilled") setYouTube(yt.value);
        if (rd.status === "fulfilled") setReddit(rd.value);
        if (lf.status === "fulfilled") setLastfm(lf.value);
        if (lfArt.status === "fulfilled") {
          const d = lfArt.value;
          setLastfmTopArtists(Array.isArray(d) ? (d as ApiData[]) : null);
        }
        if (lfTrk.status === "fulfilled") {
          const d = lfTrk.value;
          setLastfmTopTracks(Array.isArray(d) ? (d as ApiData[]) : null);
        }
        if (tw.status === "fulfilled") setTwitch(tw.value);
        if (mc.status === "fulfilled") {
          const d = mc.value;
          setMinecraft(d);
          setMinecraftNameHistory(Array.isArray(d?.nameHistory) ? (d.nameHistory as ApiData[]) : null);
        }
        if (st.status === "fulfilled") setSteam(st.value);
        if (stRecent.status === "fulfilled") {
          const d = stRecent.value;
          setSteamRecentGames(Array.isArray(d) ? (d as ApiData[]) : null);
        }
        if (stOwned.status === "fulfilled") {
          const d = stOwned.value;
          setSteamOwnedGames(Array.isArray(d) ? (d as ApiData[]) : null);
        }
        if (stAchievements.status === "fulfilled") {
          const d = stAchievements.value;
          setSteamAchievements(Array.isArray(d) ? (d as ApiData[]) : null);
        }
        if (rs.status === "fulfilled") setRss(rs.value);
        if (bs.status === "fulfilled") setBluesky(bs.value);
        if (bl.status === "fulfilled") setBills((bl.value as ApiData[] | null) ?? null);
        if (va.status === "fulfilled") setValorant((va.value as ApiData[] | null) ?? null);
        if (lo.status === "fulfilled") setLol((lo.value as ApiData[] | null) ?? null);
        if (ca.status === "fulfilled") setCalendar(ca.value);
        if (dr.status === "fulfilled") setDrive(dr.value);
        if (no.status === "fulfilled") setNotion(no.value);
        if (ap.status === "fulfilled") setApexProfile(ap.value);
        if (am.status === "fulfilled") setApexMatches((am.value as ApiData[] | null) ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setUpdatedAt(new Date());
        }
      }
    }

    function start() {
      return setInterval(load, effectivePollMs);
    }

    let interval = document.hidden ? undefined : start();

    function maybeRefresh() {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastRefreshRef.current < effectivePollMs) return;
      lastRefreshRef.current = now;
      load();
    }

    function handleVisibility() {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = undefined;
      } else {
        if (!interval) interval = start();
        maybeRefresh();
      }
    }

    load();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", maybeRefresh);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", maybeRefresh);
    };
  }, [
    effectivePollMs,
    nowPlayingPath,
    lanyardPath,
    minecraftPath,
    lolPath,
    weatherPath,
    youtubePath,
    redditPath,
    lastfmPath,
    lastfmTopArtistsPath,
    lastfmTopTracksPath,
    twitchPath,
    steamPath,
    steamRecentGamesPath,
    steamOwnedGamesPath,
    steamAchievementsPath,
    rssPath,
    blueskyPath,
    valorantPath,
    calendarPath,
    drivePath,
    notionPath,
    apexProfilePath,
    apexMatchesPath,
    githubPath,
    todoistPath,
    connected,
  ]);

  const records: LiveRecord[] = [];

  if (nowPlaying?.isPlaying || isSpotifyConnected || nowPlaying?.title) {
    records.push({
      id: "nowplaying",
      source: "nowplaying",
      label: nowPlaying?.source || "Spotify",
      title: nowPlaying?.title || "Connecté",
      subtitle: nowPlaying?.artist || "Prêt pour la lecture",
      meta: nowPlaying?.album,
      image: getArtworkUrl(nowPlaying as unknown as ApiData),
      status: "connected",
    });
  } else {
    records.push({
      id: "nowplaying",
      source: "nowplaying",
      label: "Spotify",
      title: loading ? i18n("loading") : i18n("noLive"),
      status: loading ? "loading" : error ? "error" : "empty",
    });
  }

  const isDiscordConnected =
    connected.has("discord") ||
    Boolean(lanyardUserId) ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("ethone:connected:discord") === "true" ||
        Boolean(localStorage.getItem("ethone:token:discord")) ||
        Boolean(localStorage.getItem("ethone:pub:discord:liveLanyardUserId"))));

  if (lanyard?.discord_status || isDiscordConnected) {
    const activity = lanyard?.activities?.[0];
    records.push({
      id: "lanyard",
      source: "lanyard",
      label: "Discord",
      title: lanyard?.displayName || (lanyard?.discord_status ? lanyard.discord_status : "Connecté"),
      subtitle: activity?.name || (lanyard?.discord_status ? undefined : "En ligne"),
      meta: activity?.details,
      image: lanyard?.avatarUrl,
      status: error ? "error" : "connected",
    });
  } else {
    records.push({
      id: "lanyard",
      source: "lanyard",
      label: "Discord",
      title: loading ? i18n("loading") : i18n("notConnected"),
      status: loading ? "loading" : error ? "error" : "empty",
    });
  }

  const wCondition = asStr(weather?.description) || asStr(weather?.condition);
  const wTemp = asNum(weather?.temperature) ?? asNum(weather?.temperatureC);
  const wHum = asNum(weather?.humidityPercent);
  const wWind = asNum(weather?.windSpeedKmh);
  const details: string[] = [];
  if (wCondition) details.push(wCondition);
  if (wHum !== undefined) details.push(`${wHum}% humidité`);
  if (wWind !== undefined) details.push(`${wWind} km/h vent`);
  const forecast = (weather?.forecast as ApiData[] | undefined) ?? [];
  const forecastText = forecast
    .map((d) => {
      const date = asStr(d?.date);
      const min = asNum(d?.min);
      const max = asNum(d?.max);
      if (!date || min === undefined || max === undefined) return "";
      return `${date}: ${min}° / ${max}°`;
    })
    .filter(Boolean)
    .join(" · ");
  records.push({
    id: "weather",
    source: "weather",
    label: "Météo",
    title: wTemp !== undefined ? `${wTemp}°C` : "—",
    subtitle: details.join(" · ") || undefined,
    meta: forecastText || asStr(weather?.location) || asStr(weather?.city),
    image: asStr(weather?.iconUrl),
    status: weather ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const githubLogin = asStr(github?.login);
  records.push({
    id: "github",
    source: "github",
    label: "GitHub",
    title: githubLogin || "GitHub",
    subtitle: githubLogin ? `${asNum(github?.publicRepos) ?? 0} repos · ${asNum(github?.followers) ?? 0} followers` : undefined,
    meta: asStr((github?.recentEvent as ApiData)?.type),
    image: asStr(github?.avatarUrl),
    status: githubLogin ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const todoistTask = asStr(todoist?.task);
  records.push({
    id: "todoist",
    source: "todoist",
    label: "Todoist",
    title: todoistTask || i18n("noTasks"),
    subtitle: asStr(todoist?.project),
    status: todoistTask ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const youtubeChannel = asStr((youtube?.channel as ApiData)?.title) || asStr(youtube?.channelTitle);
  const youtubeVideo = youtube?.latestVideo as ApiData;
  const youtubeVideoTitle = asStr(youtubeVideo?.title) || asStr(youtube?.latestVideoTitle);
  records.push({
    id: "youtube",
    source: "youtube",
    label: "YouTube",
    title: youtubeChannel || "YouTube",
    subtitle: youtubeVideoTitle,
    image: asStr(youtubeVideo?.thumbnailUrl) || asStr(youtube?.latestVideoThumbnailUrl),
    status: youtubeChannel ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const redditProfile = reddit?.profile as ApiData;
  const redditName = asStr(redditProfile?.username) || asStr(reddit?.name);
  const redditKarma = asNum(redditProfile?.karma);
  const redditPost = reddit?.latestPost as ApiData;
  const redditPostTitle = asStr(redditPost?.title) || asStr(reddit?.latestPostTitle);
  records.push({
    id: "reddit",
    source: "reddit",
    label: "Reddit",
    title: redditName || "Reddit",
    subtitle: redditKarma !== undefined ? `${redditKarma} karma` : undefined,
    meta: redditPostTitle,
    image: asStr(redditProfile?.avatarUrl) || asStr(reddit?.avatarUrl),
    status: redditName ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const lastfmData = lastfm as ApiData | null;
  const lastfmList: ApiData[] = Array.isArray(lastfmData)
    ? lastfmData
    : Array.isArray(lastfmData?.track)
    ? (lastfmData.track as ApiData[])
    : [];
  const lastfmTrack = lastfmList[0];
  records.push({
    id: "lastfm",
    source: "lastfm",
    label: "Last.fm",
    title: asStr(lastfmTrack?.name) || (liveLastfmUsername ? i18n("noLive") : "—"),
    subtitle: asStr(lastfmTrack?.artist) || asStr(lastfmTrack?.title),
    image: getArtworkUrl(lastfmTrack),
    status: lastfmTrack?.name ? "connected" : loading ? "loading" : liveLastfmUsername ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const twitchChannel = twitch?.channel as ApiData | undefined;
  records.push({
    id: "twitch",
    source: "twitch",
    label: "Twitch",
    title: asStr(twitchChannel?.displayName) || asStr(twitchChannel?.login) || (liveTwitchLogin ? i18n("notConnected") : "—"),
    subtitle: twitchChannel?.isLive ? i18n("live") : i18n("notConnected"),
    meta: asStr(twitchChannel?.gameName),
    image: asStr(twitchChannel?.profileImageUrl) || asStr(twitch?.profileImageUrl),
    status: twitchChannel?.isLive ? "connected" : loading ? "loading" : liveTwitchLogin ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const mc = (minecraft as ApiData) || {};
  const mcName = asStr(mc?.username) || asStr(mc?.name);
  records.push({
    id: "minecraft",
    source: "minecraft",
    label: "Minecraft",
    title: mcName || (liveMinecraftUsername ? i18n("notFound") : "—"),
    subtitle: asStr(mc?.uuid) ? `ID: ${asStr(mc?.uuid)?.slice(0, 8)}…` : undefined,
    image: asStr(mc?.skinUrl),
    status: mcName ? "connected" : loading ? "loading" : liveMinecraftUsername ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const st = (steam as ApiData) || {};
  const steamName = asStr(st?.personaName) || asStr(st?.name);
  records.push({
    id: "steam",
    source: "steam",
    label: "Steam",
    title: steamName || (liveSteamId ? i18n("notFound") : "—"),
    subtitle: asStr(st?.gameName),
    meta: asStr(st?.status),
    image: asStr(st?.avatarUrl),
    status: steamName ? "connected" : loading ? "loading" : liveSteamId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const firstAchievement = (steamAchievements?.[0] as ApiData) || {};
  records.push({
    id: "steam-achievements",
    source: "steam-achievements",
    label: "Steam",
    title: asStr(firstAchievement?.name) || (liveSteamAppId ? i18n("noResults") : "—"),
    subtitle: asStr(firstAchievement?.gameName) || asStr(firstAchievement?.description),
    meta: `${steamAchievements?.length ?? 0} succès`,
    image: asStr(firstAchievement?.iconUrl),
    status: firstAchievement?.name ? "connected" : loading ? "loading" : liveSteamAppId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const rssFeed = rss?.feed as ApiData | undefined;
  const rssItem = (rssFeed?.items as ApiData[] | undefined)?.[0];
  records.push({
    id: "rss",
    source: "rss",
    label: "RSS",
    title: asStr(rssFeed?.title) || asStr(rss?.title) || (liveRssUrl ? i18n("noResults") : "—"),
    subtitle: asStr(rssItem?.title),
    meta: asStr(rssFeed?.link),
    status: rssItem?.title ? "connected" : loading ? "loading" : liveRssUrl ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const billItems = Array.isArray(bills) ? (bills as ApiData[]) : [];
  const upcomingBill = billItems.find((b) => {
    const data = (b.data || b) as ApiData;
    const due = new Date(asStr(data.dueAt) || asStr(data.date) || asStr(data.due) || "");
    return !isNaN(due.getTime()) && due >= new Date() && !data.paid;
  });
  const upcomingData = (upcomingBill?.data || upcomingBill) as ApiData;
  records.push({
    id: "bills",
    source: "bills",
    label: i18n("bills") || "Bills",
    title: upcomingData ? `${asStr(upcomingData.amount)} ${asStr(upcomingData.currency) || ""}`.trim() : i18n("noBills"),
    subtitle: asStr(upcomingBill?.label) || asStr(upcomingData?.title),
    meta: asStr(upcomingData?.dueAt) || asStr(upcomingData?.date) || asStr(upcomingData?.due),
    status: upcomingData ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  const valorantMatch = (valorant || [])[0];
  records.push({
    id: "valorant",
    source: "valorant",
    label: "Valorant",
    title: asStr(valorantMatch?.map) || asStr(valorantMatch?.mode) || (hasRiotId ? i18n("noMatches") : "—"),
    subtitle: `${asStr(valorantMatch?.result)} — ${asNum(valorantMatch?.kills) ?? 0} / ${asNum(valorantMatch?.deaths) ?? 0} / ${asNum(
      valorantMatch?.assists
    ) ?? 0}`,
    meta: asStr(valorantMatch?.agent),
    image: asStr(valorantMatch?.agentImageUrl),
    status: valorantMatch ? "connected" : loading ? "loading" : hasRiotId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const lolMatch = (lol || [])[0];
  records.push({
    id: "lol",
    source: "lol",
    label: "League",
    title: asStr(lolMatch?.champion) || (hasRiotId ? i18n("noMatches") : "—"),
    subtitle: asStr(lolMatch?.result),
    meta: asStr(lolMatch?.mode),
    status: lolMatch ? "connected" : loading ? "loading" : hasRiotId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const calendarEvents = (calendar?.events as ApiData[] | undefined) ?? [];
  const nextCalendarEvent = calendarEvents[0];
  records.push({
    id: "google-calendar",
    source: "google-calendar",
    label: i18n("googleCalendar"),
    title: asStr(nextCalendarEvent?.title) || (calendarClientId ? i18n("noEvents") : "—"),
    subtitle: asStr(nextCalendarEvent?.start),
    meta: asStr(nextCalendarEvent?.location),
    status: nextCalendarEvent ? "connected" : loading ? "loading" : calendarClientId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const driveFiles = (drive?.files as ApiData[] | undefined) ?? [];
  const latestDriveFile = driveFiles[0];
  records.push({
    id: "google-drive",
    source: "google-drive",
    label: i18n("googleDrive"),
    title: asStr(latestDriveFile?.name) || (driveClientId ? i18n("noFiles") : "—"),
    subtitle: `${driveFiles.length} ${i18n("items")}`,
    meta: asStr(latestDriveFile?.modifiedTime) || asStr(latestDriveFile?.createdTime),
    image: asStr(latestDriveFile?.thumbnailLink) || asStr(latestDriveFile?.iconUrl),
    status: latestDriveFile ? "connected" : loading ? "loading" : driveClientId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const notionPages = (notion?.pages as ApiData[] | undefined) ?? [];
  const latestNotionPage = notionPages[0];
  records.push({
    id: "notion",
    source: "notion",
    label: i18n("notion"),
    title: asStr(latestNotionPage?.title) || (connected.has("notion") ? i18n("noResults") : "—"),
    subtitle: asStr(latestNotionPage?.kind),
    meta: asStr(latestNotionPage?.lastEditedTime),
    status: latestNotionPage ? "connected" : loading ? "loading" : error ? "error" : "empty",
  });

  records.push({
    id: "bluesky",
    source: "bluesky",
    label: "Bluesky",
    title: asStr((bluesky as ApiData)?.displayName) || asStr((bluesky as ApiData)?.handle) || (liveBlueskyHandle ? i18n("notFound") : "—"),
    subtitle: `@${asStr((bluesky as ApiData)?.handle)}`,
    meta: `${asNum((bluesky as ApiData)?.followers)} followers · ${asNum((bluesky as ApiData)?.posts)} posts`,
    image: asStr((bluesky as ApiData)?.avatarUrl),
    status: (bluesky as ApiData)?.handle ? "connected" : loading ? "loading" : liveBlueskyHandle ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const apexSegments = (apexProfile?.segments as ApiData[] | undefined) ?? [];
  const topApexSegment = apexSegments[0];
  records.push({
    id: "tracker",
    source: "tracker",
    label: i18n("trackerApex"),
    title: asStr(apexProfile?.handle) || asStr(apexProfile?.identifier) || (hasApexId ? "Apex" : "—"),
    subtitle: asStr(apexProfile?.platform),
    meta: asStr(topApexSegment?.name),
    image: asStr(apexProfile?.avatarUrl),
    status: apexProfile?.handle ? "connected" : loading ? "loading" : hasApexId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  const apexMatch = (apexMatches || [])[0];
  const matchMetadata = (apexMatch?.metadata as ApiData) ?? {};
  records.push({
    id: "apex",
    source: "apex",
    label: i18n("trackerApex"),
    title: asStr(matchMetadata?.mapName) || asStr(matchMetadata?.modeName) || (hasApexId ? i18n("noMatches") : "—"),
    subtitle: asStr(matchMetadata?.result),
    meta: asStr(matchMetadata?.agentName),
    image: asStr(matchMetadata?.agentImageUrl),
    status: apexMatch ? "connected" : loading ? "loading" : hasApexId ? (error ? "error" : "empty") : (error ? "error" : "empty"),
  });

  return {
    nowPlaying,
    lanyard,
    weather,
    bills,
    records,
    loading,
    error,
    updatedAt,
    lastUpdated: updatedAt,
    lastfmPeriod,
    setLastfmPeriod,
    lastfmTopArtists,
    lastfmTopTracks,
    steam,
    steamRecentGames,
    steamOwnedGames,
    steamAchievements,
    minecraft,
    minecraftNameHistory,
    bluesky,
    valorant,
    lol,
    liveTrackerRiotName,
    liveTrackerRiotTag,
  };
}
