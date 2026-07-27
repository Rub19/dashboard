import { diagnosticRoute } from "./routes/diagnostic.js";
import { githubOAuthDisconnectRoute, githubOAuthExchangeRoute, githubProfileRoute } from "./routes/github-oauth.js";
import { googleCalendarEventsRoute, googleCalendarOAuthDisconnectRoute, googleCalendarOAuthExchangeRoute } from "./routes/google-calendar-oauth.js";
import { healthRoute } from "./routes/health.js";
import { henrikRoute } from "./routes/henrik.js";
import { lanyardRoute } from "./routes/lanyard.js";
import { lastFmRoute } from "./routes/lastfm.js";
import { minecraftRoute } from "./routes/minecraft.js";
import { notionOAuthDisconnectRoute, notionOAuthExchangeRoute, notionPagesRoute } from "./routes/notion-oauth.js";
import { spotifyNowPlayingRoute, spotifyOAuthDisconnectRoute, spotifyOAuthExchangeRoute } from "./routes/spotify-oauth.js";
import { nowPlayingRoute } from "./routes/nowplaying.js";
import { steamRoute } from "./routes/steam.js";
import { supabaseRoute } from "./routes/supabase.js";
import { trackerRoute } from "./routes/tracker.js";
import { twitchRoute } from "./routes/twitch.js";
import { weatherRoute } from "./routes/weather.js";

function route(id, path, handler, options = {}) {
  return Object.freeze({
    id,
    method: options.method || "GET",
    path,
    handler,
    public: options.public === true,
    rateLimit: options.rateLimit || "standard",
    service: options.service || "core",
    action: options.action || ""
  });
}

export const ROUTES = Object.freeze([
  route("health", "/health", healthRoute, { public: true, rateLimit: "edge" }),
  route("diagnostic", "/api/diagnostic", diagnosticRoute, { rateLimit: "strict" }),
  route("steam.player", "/api/steam/player", steamRoute, { service: "steam", action: "player" }),
  route("steam.recent-games", "/api/steam/recent-games", steamRoute, { service: "steam", action: "recent-games" }),
  route("steam.owned-games", "/api/steam/owned-games", steamRoute, { service: "steam", action: "owned-games" }),
  route("steam.achievements", "/api/steam/achievements", steamRoute, { service: "steam", action: "achievements" }),
  route("tracker.apex-profile", "/api/tracker/apex-profile", trackerRoute, { service: "tracker" }),
  route("henrik.account", "/api/henrik/account", henrikRoute, { service: "henrik", action: "account" }),
  route("henrik.status", "/api/henrik/status", henrikRoute, { service: "henrik", action: "status" }),
  route("twitch.channel", "/api/twitch/channel", twitchRoute, { service: "twitch" }),
  route("lastfm.recent-tracks", "/api/lastfm/recent-tracks", lastFmRoute, { service: "lastfm", action: "recent-tracks" }),
  route("lastfm.top-artists", "/api/lastfm/top-artists", lastFmRoute, { service: "lastfm", action: "top-artists" }),
  route("lastfm.top-tracks", "/api/lastfm/top-tracks", lastFmRoute, { service: "lastfm", action: "top-tracks" }),
  route("lanyard.presence", "/api/lanyard/presence", lanyardRoute, { service: "lanyard" }),
  route("now-playing", "/api/now-playing", nowPlayingRoute, { service: "nowplaying" }),
  route("supabase.public-profile", "/api/supabase/public-profile", supabaseRoute, { service: "supabase", rateLimit: "strict" }),
  route("weather.forecast", "/api/weather", weatherRoute, { service: "weather" }),
  route("minecraft.profile", "/api/minecraft/profile", minecraftRoute, { service: "minecraft" }),
  route("spotify.oauth.exchange", "/api/spotify/oauth/exchange", spotifyOAuthExchangeRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("spotify.now-playing", "/api/spotify/now-playing", spotifyNowPlayingRoute, { service: "spotify" }),
  route("spotify.oauth.disconnect", "/api/spotify/oauth/disconnect", spotifyOAuthDisconnectRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("github.oauth.exchange", "/api/github/oauth/exchange", githubOAuthExchangeRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("github.profile", "/api/github/profile", githubProfileRoute, { service: "github" }),
  route("github.oauth.disconnect", "/api/github/oauth/disconnect", githubOAuthDisconnectRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("google-calendar.oauth.exchange", "/api/google-calendar/oauth/exchange", googleCalendarOAuthExchangeRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("google-calendar.events", "/api/google-calendar/events", googleCalendarEventsRoute, { service: "google-calendar" }),
  route("google-calendar.oauth.disconnect", "/api/google-calendar/oauth/disconnect", googleCalendarOAuthDisconnectRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("notion.oauth.exchange", "/api/notion/oauth/exchange", notionOAuthExchangeRoute, { method: "POST", service: "notion", rateLimit: "strict" }),
  route("notion.pages", "/api/notion/pages", notionPagesRoute, { service: "notion" }),
  route("notion.oauth.disconnect", "/api/notion/oauth/disconnect", notionOAuthDisconnectRoute, { method: "POST", service: "notion", rateLimit: "strict" })
]);

function normalizedPath(pathname) {
  const path = String(pathname || "/").replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

export function findRoute(method, pathname) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const path = normalizedPath(pathname);
  return ROUTES.find((candidate) => candidate.method === normalizedMethod && candidate.path === path) || null;
}

export function routesForPath(pathname) {
  const path = normalizedPath(pathname);
  return ROUTES.filter((candidate) => candidate.path === path);
}
