const ETHONE_VERSION = "2026-07-28-experience-v141";
const ETHONE_CACHE = `ethone-${ETHONE_VERSION}`;
const ETHONE_OFFLINE_URL = "./index.html";

const ETHONE_V8_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/ethone-mask-icon.svg",
  "./icons/ethone-icon.svg",
  "./icons/favicon.ico",
  "./icons/ethone-favicon-16.png",
  "./icons/ethone-favicon-32.png",
  "./icons/ethone-favicon-48.png",
  "./icons/ethone-favicon-64.png",
  "./icons/ethone-apple-touch-180.png",
  "./icons/ethone-icon-192.png",
  "./icons/ethone-icon-512.png",
  "./icons/ethone-icon-maskable-512.png",
  "./v8/main.mjs",
  "./v8/app/app-runtime.mjs",
  "./v8/command/catalog.mjs",
  "./v8/command/command-center.mjs",
  "./v8/command/history.mjs",
  "./v8/command/search.mjs",
  "./v8/core/actions.mjs",
  "./v8/core/density-boot.js",
  "./v8/core/density-engine.mjs",
  "./v8/core/experience.mjs",
  "./v8/brain/action-registry.mjs",
  "./v8/brain/context-engine.mjs",
  "./v8/brain/controller.mjs",
  "./v8/brain/memory-repository.mjs",
  "./v8/brain/preferences.mjs",
  "./v8/brain/provider-manager.mjs",
  "./v8/brain/runtime.mjs",
  "./v8/core/document-metadata.mjs",
  "./v8/core/lifecycle.mjs",
  "./v8/core/navigation-session.mjs",
  "./v8/core/presence-engine.mjs",
  "./v8/core/router.mjs",
  "./v8/core/store.mjs",
  "./v8/core/style-loader.mjs",
  "./v8/data/home-model.mjs",
  "./v8/data/daily-briefing.mjs",
  "./v8/data/activity-journal.mjs",
  "./v8/data/brand-icons.mjs",
  "./v8/data/integrations.mjs",
  "./v8/data/oauth-app-config.mjs",
  "./v8/data/navigation.mjs",
  "./v8/data/workspaces.mjs",
  "./v8/data/profile-repository.mjs",
  "./v8/entry/entry-coordinator.mjs",
  "./v8/entry/login.mjs",
  "./v8/entry/password-recovery.mjs",
  "./v8/entry/profile-selection.mjs",
  "./v8/i18n/catalog.mjs",
  "./v8/i18n/runtime.mjs",
  "./v8/pages/brain.mjs",
  "./v8/pages/calendar.mjs",
  "./v8/pages/calendar-model.mjs",
  "./v8/pages/activity.mjs",
  "./v8/pages/activity-style.mjs",
  "./v8/pages/connections.mjs",
  "./v8/pages/connections-model.mjs",
  "./v8/pages/feature-fallback.mjs",
  "./v8/pages/files.mjs",
  "./v8/pages/files-model.mjs",
  "./v8/pages/home.mjs",
  "./v8/pages/notes.mjs",
  "./v8/pages/notes-model.mjs",
  "./v8/pages/settings.mjs",
  "./v8/pages/system.mjs",
  "./v8/pages/tasks.mjs",
  "./v8/pages/tasks-model.mjs",
  "./v8/services/auth-adapter.mjs",
  "./v8/services/auth-storage.mjs",
  "./v8/services/clock-manager.mjs",
  "./v8/services/external-diagnostics.mjs",
  "./v8/services/external-services-client.mjs",
  "./v8/services/external-services-config.mjs",
  "./v8/services/media-upload.mjs",
  "./v8/services/network-client.mjs",
  "./v8/services/provider-credentials.mjs",
  "./v8/services/public-auth-config.mjs",
  "./v8/services/discord-live.mjs",
  "./v8/services/rate-limiter.mjs",
  "./v8/services/service-worker.mjs",
  "./v8/services/sound-manager.mjs",
  "./v8/services/spotify-live.mjs",
  "./v8/services/spotify-oauth.mjs",
  "./v8/services/spotify-oauth-live.mjs",
  "./v8/services/oauth-callback.mjs",
  "./v8/services/live-poll.mjs",
  "./v8/services/github-oauth.mjs",
  "./v8/services/github-live.mjs",
  "./v8/services/google-calendar-oauth.mjs",
  "./v8/services/google-calendar-live.mjs",
  "./v8/services/notion-oauth.mjs",
  "./v8/services/notion-live.mjs",
  "./v8/services/todoist-oauth.mjs",
  "./v8/services/todoist-live.mjs",
  "./v8/services/valorant-live.mjs",
  "./v8/services/lol-live.mjs",
  "./v8/services/twitch-live.mjs",
  "./v8/services/lastfm-live.mjs",
  "./v8/services/tracker-live.mjs",
  "./v8/services/google-drive-oauth.mjs",
  "./v8/services/google-drive-live.mjs",
  "./v8/services/youtube-oauth.mjs",
  "./v8/services/youtube-live.mjs",
  "./v8/services/reddit-oauth.mjs",
  "./v8/services/reddit-live.mjs",
  "./v8/services/supabase-state-sync.mjs",
  "./v8/services/weather-live.mjs",
  "./v8/services/steam-live.mjs",
  "./v8/services/minecraft-live.mjs",
  "./v8/styles/base.css?v=experience-v141",
  "./v8/styles/activity.css?v=experience-v141",
  "./v8/styles/components.css?v=experience-v141",
  "./v8/styles/entry.css?v=experience-v141",
  "./v8/styles/presence.css?v=experience-v141",
  "./v8/styles/shell.css?v=experience-v141",
  "./v8/styles/tokens.css?v=experience-v141",
  "./v8/styles/workspaces.css?v=experience-v141",
  "./v8/ui/discord-live.mjs",
  "./v8/ui/weather-live.mjs",
  "./v8/ui/steam-live.mjs",
  "./v8/ui/minecraft-live.mjs",
  "./v8/ui/github-live.mjs",
  "./v8/ui/google-calendar-live.mjs",
  "./v8/ui/notion-live.mjs",
  "./v8/ui/todoist-live.mjs",
  "./v8/ui/valorant-live.mjs",
  "./v8/ui/lol-live.mjs",
  "./v8/ui/twitch-live.mjs",
  "./v8/ui/lastfm-live.mjs",
  "./v8/ui/tracker-live.mjs",
  "./v8/ui/google-drive-live.mjs",
  "./v8/ui/youtube-live.mjs",
  "./v8/ui/reddit-live.mjs",
  "./v8/ui/live-freshness.mjs",
  "./v8/ui/dom.mjs",
  "./v8/ui/empty-state.mjs",
  "./v8/ui/form-system.mjs",
  "./v8/ui/icons.mjs",
  "./v8/ui/context-menu.mjs",
  "./v8/ui/dense-content.mjs",
  "./v8/ui/dock.mjs",
  "./v8/ui/layer-manager.mjs",
  "./v8/ui/mission-control.mjs",
  "./v8/ui/native-behavior.mjs",
  "./v8/ui/navigation.mjs",
  "./v8/ui/panel.mjs",
  "./v8/ui/select.mjs",
  "./v8/ui/shell.mjs",
  "./v8/ui/spotify-live.mjs",
  "./v8/ui/toast.mjs",
  "./v8/ui/tooltip.mjs",
  "./v8/ui/touch-interactions.mjs",
  "./v8/ui/visual-haptics.mjs",
  "./v8/ui/window-system.mjs"
];

const RETIRED_ROOTS = new Set(["actions", "components", "core", "pages", "services", "state", "ui", "utils", "widgets"]);
const RETIRED_FILE_RE = /(?:dashboard-v4|dashboard-os2|dashboard-living|v7-os-shell|legacy-navigation)\.(?:js|css)$|\/(?:dashboard|classic|legacy|v[1-7])\.html$/;

function isRetiredDashboardRequest(pathname) {
  const clean = pathname.replace(/^\/+/, "");
  const parts = clean.split("/");
  if (parts[0] === "v8") return false;
  if (RETIRED_ROOTS.has(parts[0])) return true;
  return RETIRED_FILE_RE.test(clean);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("ethone-") && key !== ETHONE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ETHONE_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isSensitiveRequest(url)) {
    event.respondWith(fetch(new Request(request, { cache: "no-store" })));
    return;
  }

  if (isRetiredDashboardRequest(url.pathname)) {
    event.respondWith(new Response("Cette ancienne interface ETHONE a été retirée. Ouvrez l'application actuelle.", {
      status: 410,
      statusText: "Gone",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  if (["script", "style", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function precache() {
  const cache = await caches.open(ETHONE_CACHE);
  const results = await Promise.allSettled(ETHONE_V8_ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" }))));
  const critical = ["./index.html", "./v8/main.mjs"];
  for (const url of critical) {
    const index = ETHONE_V8_ASSETS.indexOf(url);
    if (index >= 0 && results[index].status === "rejected") throw results[index].reason;
  }
}

function isSensitiveRequest(url) {
  if (/\/(?:auth|api)\//i.test(url.pathname)) return true;
  return [...url.searchParams.keys()].some((key) => /^(?:code|token|access_token|refresh_token|api[_-]?key|secret|password|error|error_description)$/i.test(key));
}

async function navigationNetworkFirst(request) {
  const cache = await caches.open(ETHONE_CACHE);
  try {
    const fresh = await fetch(new Request(request, { cache: "no-store" }));
    if (fresh?.ok) await cache.put(ETHONE_OFFLINE_URL, fresh.clone());
    return fresh;
  } catch (error) {
    const fallback = await cache.match(ETHONE_OFFLINE_URL);
    if (fallback) return fallback;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ETHONE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(new Request(request, { cache: "no-store" }));
  if (fresh?.ok) await cache.put(request, fresh.clone());
  return fresh;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(ETHONE_CACHE);
  try {
    const fresh = await fetch(new Request(request, { cache: "no-store" }));
    if (fresh && fresh.ok) await cache.put(request, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) return cache.match(fallbackUrl);
    throw error;
  }
}
