import { diagnosticRoute } from "./routes/diagnostic.js";
import { githubOAuthDisconnectRoute, githubOAuthExchangeRoute, githubProfileRoute } from "./routes/github-oauth.js";
import { googleCalendarEventsRoute, googleCalendarOAuthDisconnectRoute, googleCalendarOAuthExchangeRoute } from "./routes/google-calendar-oauth.js";
import { googleDriveFilesRoute, googleDriveOAuthDisconnectRoute, googleDriveOAuthExchangeRoute } from "./routes/google-drive-oauth.js";
import { healthRoute } from "./routes/health.js";
import { henrikRoute } from "./routes/henrik.js";
import { lanyardRoute } from "./routes/lanyard.js";
import { lastFmRoute } from "./routes/lastfm.js";
import { minecraftRoute } from "./routes/minecraft.js";
import { notionOAuthDisconnectRoute, notionOAuthExchangeRoute, notionPagesRoute } from "./routes/notion-oauth.js";
import { spotifyControlRoute, spotifyNowPlayingRoute, spotifyOAuthDisconnectRoute, spotifyOAuthExchangeRoute } from "./routes/spotify-oauth.js";
import { nowPlayingRoute } from "./routes/nowplaying.js";
import { redditActivityRoute, redditOAuthDisconnectRoute, redditOAuthExchangeRoute } from "./routes/reddit-oauth.js";
import { riotLolRoute } from "./routes/riot-lol.js";
import { steamRoute } from "./routes/steam.js";
import { supabaseRoute } from "./routes/supabase.js";
import { todoistOAuthDisconnectRoute, todoistOAuthExchangeRoute, todoistTasksRoute } from "./routes/todoist-oauth.js";
import { trackerRoute } from "./routes/tracker.js";
import { twitchRoute } from "./routes/twitch.js";
import { weatherRoute } from "./routes/weather.js";
import { youtubeActivityRoute, youtubeOAuthDisconnectRoute, youtubeOAuthExchangeRoute } from "./routes/youtube-oauth.js";

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
  route("henrik.rank", "/api/henrik/rank", henrikRoute, { service: "henrik", action: "rank" }),
  route("henrik.matches", "/api/henrik/matches", henrikRoute, { service: "henrik", action: "matches" }),
  route("riot-lol.account", "/api/riot-lol/account", riotLolRoute, { service: "riot-lol", action: "account" }),
  route("riot-lol.rank", "/api/riot-lol/rank", riotLolRoute, { service: "riot-lol", action: "rank" }),
  route("riot-lol.matches", "/api/riot-lol/matches", riotLolRoute, { service: "riot-lol", action: "matches" }),
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
  route("spotify.control", "/api/spotify/control", spotifyControlRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("spotify.oauth.disconnect", "/api/spotify/oauth/disconnect", spotifyOAuthDisconnectRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("github.oauth.exchange", "/api/github/oauth/exchange", githubOAuthExchangeRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("github.profile", "/api/github/profile", githubProfileRoute, { service: "github" }),
  route("github.oauth.disconnect", "/api/github/oauth/disconnect", githubOAuthDisconnectRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("google-calendar.oauth.exchange", "/api/google-calendar/oauth/exchange", googleCalendarOAuthExchangeRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("google-calendar.events", "/api/google-calendar/events", googleCalendarEventsRoute, { service: "google-calendar" }),
  route("google-calendar.oauth.disconnect", "/api/google-calendar/oauth/disconnect", googleCalendarOAuthDisconnectRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("notion.oauth.exchange", "/api/notion/oauth/exchange", notionOAuthExchangeRoute, { method: "POST", service: "notion", rateLimit: "strict" }),
  route("notion.pages", "/api/notion/pages", notionPagesRoute, { service: "notion" }),
  route("notion.oauth.disconnect", "/api/notion/oauth/disconnect", notionOAuthDisconnectRoute, { method: "POST", service: "notion", rateLimit: "strict" }),
  route("todoist.oauth.exchange", "/api/todoist/oauth/exchange", todoistOAuthExchangeRoute, { method: "POST", service: "todoist", rateLimit: "strict" }),
  route("todoist.tasks", "/api/todoist/tasks", todoistTasksRoute, { service: "todoist" }),
  route("todoist.oauth.disconnect", "/api/todoist/oauth/disconnect", todoistOAuthDisconnectRoute, { method: "POST", service: "todoist", rateLimit: "strict" }),
  route("google-drive.oauth.exchange", "/api/google-drive/oauth/exchange", googleDriveOAuthExchangeRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.files", "/api/google-drive/files", googleDriveFilesRoute, { service: "google-drive" }),
  route("google-drive.oauth.disconnect", "/api/google-drive/oauth/disconnect", googleDriveOAuthDisconnectRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("youtube.oauth.exchange", "/api/youtube/oauth/exchange", youtubeOAuthExchangeRoute, { method: "POST", service: "youtube", rateLimit: "strict" }),
  route("youtube.activity", "/api/youtube/activity", youtubeActivityRoute, { service: "youtube" }),
  route("youtube.oauth.disconnect", "/api/youtube/oauth/disconnect", youtubeOAuthDisconnectRoute, { method: "POST", service: "youtube", rateLimit: "strict" }),
  route("reddit.oauth.exchange", "/api/reddit/oauth/exchange", redditOAuthExchangeRoute, { method: "POST", service: "reddit", rateLimit: "strict" }),
  route("reddit.activity", "/api/reddit/activity", redditActivityRoute, { service: "reddit" }),
  route("reddit.oauth.disconnect", "/api/reddit/oauth/disconnect", redditOAuthDisconnectRoute, { method: "POST", service: "reddit", rateLimit: "strict" })
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
