const ETHONE_VERSION = "2026-07-08-production-v56-coming-soon-cleanup";
const ETHONE_CACHE = `ethone-${ETHONE_VERSION}`;
const ETHONE_OFFLINE_URL = "./index.html";
const ETHONE_CORE_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./ui/tokens.css",
  "./ui/components.css",
  "./ui/app.css",
  "./ui/motion-system.css",
  "./ui/micro-interactions.css",
  "./ui/theme-engine.css",
  "./ui/component-library.css",
  "./ui/background-engine.css",
  "./ui/brain-os-global.css",
  "./ui/side-panels.css",
  "./ui/smart-layouts.css",
  "./ui/widget-marketplace.css",
  "./ui/native-shell.css",
  "./ui/status-bar.css",
  "./ui/app-library.css",
  "./ui/morning-briefing.css",
  "./ui/achievements.css",
  "./ui/universe.css",
  "./pages/studio/style.css",
  "./pages/import-assistant/style.css",
  "./pages/gaming/hub.css",
  "./ui/os-sidebar.css",
  "./ui/auth.css",
  "./ui/motion-system.js",
  "./ui/micro-interactions.js",
  "./ui/coming-soon.js",
  "./services/theme/engine.js",
  "./services/theme/legacy.js",
  "./services/theme/backgrounds.js",
  "./ui/animations.js",
  "./ui/sound.js",
  "./ui/accessibility.js",
  "./core/runtime.js",
  "./components/command-palette.js",
  "./services/keyboard-shortcuts.js",
  "./services/language/auth-dictionary.js",
  "./services/auth/interactivity.js",
  "./services/auth/premium-experience.js",
  "./services/timeline.js",
  "./services/usage-learning.js",
  "./services/ai/brain-os-global.js",
  "./services/ui/side-panels.js",
  "./services/ui/smart-layouts.js",
  "./services/ui/widget-marketplace.js",
  "./ui/native-shell.js",
  "./ui/status-bar.js",
  "./ui/app-library.js",
  "./ui/morning-briefing.js",
  "./services/achievements.js",
  "./services/ui/universe.js",
  "./pages/studio/index.js",
  "./pages/import-assistant/index.js",
  "./pages/gaming/hub.js",
  "./services/activity.js",
  "./pages/timeline/index.js",
  "./pages/timeline/style.css",
  "./pages/health/index.js",
  "./pages/health/style.css",
  "./pages/version-history/index.js",
  "./pages/version-history/style.css",
  "./pages/dashboard-v4.js",
  "./services/plugins/plugin-hub.js",
  "./ui/plugin-hub.css",
  "./icons/ethone-icon.svg",
  "./icons/ethone-icon-192.png",
  "./icons/ethone-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(ETHONE_CACHE)
      .then(cache => cache.addAll(ETHONE_CORE_ASSETS.map(url => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== ETHONE_CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "ETHONE_SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, ETHONE_OFFLINE_URL));
    return;
  }

  event.respondWith(networkFirst(request));
});

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
