const ETHONE_VERSION = "2026-07-09-production-v106-sidebar-root-fix";
const ETHONE_CACHE = `ethone-${ETHONE_VERSION}`;
const ETHONE_OFFLINE_URL = "./index.html";
const ETHONE_CORE_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./data/version-center.json",
  "./data/flows.json",
  "./data/brain-os.json",
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
  "./ui/desktop-environment.css",
  "./ui/status-bar.css",
  "./ui/mission-control.css",
  "./ui/profile-switcher.css",
  "./ui/time-machine.css",
  "./ui/cloud.css",
  "./ui/widget-builder.css",
  "./ui/notes-v2.css",
  "./ui/app-library.css",
  "./ui/morning-briefing.css",
  "./ui/achievements.css",
  "./ui/universe.css",
  "./ui/layout-integrity.css",
  "./ui/clarity-polish.css",
  "./ui/mobile.css",
  "./ui/flow.css",
  "./ui/brain-os-v5.css",
  "./ui/os-experience-polish.css",
  "./ui/release-polish.css",
  "./ui/first-run.css",
  "./pages/studio/style.css",
  "./pages/import-assistant/style.css",
  "./pages/gaming/hub.css",
  "./ui/os-sidebar.css",
  "./ui/auth.css",
  "./core/safe-mode.js",
  "./core/emergency-performance-guard.js",
  "./core/boot.js",
  "./core/boot-sequence.js",
  "./core/lazy-modules.js",
  "./core/ui-isolation.js",
  "./core/enterprise-runtime.js",
  "./core/qa-repair.js",
  "./pages/dashboard/init.js",
  "./pages/dashboard/shell.js",
  "./pages/dashboard/resizable-sidebar.js",
  "./pages/dashboard/nav-active-pill.js",
  "./pages/dashboard/mobile-sidebar.js",
  "./pages/dashboard/sidebar-widgets-init.js",
  "./pages/dashboard/widget-catalog.js",
  "./pages/dashboard-v4.css",
  "./pages/dashboard/live-panel-resize.js",
  "./ui/motion-system.js",
  "./ui/micro-interactions.js",
  "./ui/coming-soon.js",
  "./ui/release-polish.js",
  "./ui/clarity-polish.js",
  "./ui/mobile.js",
  "./ui/finish-pass.js",
  "./services/theme/engine.js",
  "./services/theme/legacy.js",
  "./services/theme/backgrounds.js",
  "./ui/animations.js",
  "./ui/sound.js",
  "./ui/accessibility.js",
  "./core/runtime.js",
  "./components/command-palette.js",
  "./components/toast.js",
  "./actions/action-registry.js",
  "./actions/legacy-navigation.js",
  "./widgets/registry.js",
  "./widgets/github.js",
  "./services/keyboard-shortcuts.js",
  "./services/ai/legacy/actions.js",
  "./services/ai/core.js",
  "./services/ai/everywhere.js",
  "./services/ai/agent.js",
  "./services/language/auth-dictionary.js",
  "./services/language/runtime.js",
  "./services/auth/interactivity.js",
  "./services/auth/premium-experience.js",
  "./services/timeline.js",
  "./services/usage-learning.js",
  "./services/ai/brain-intelligence.js",
  "./services/ai/brain-os-global.js",
  "./services/ui/side-panels.js",
  "./services/ui/smart-layouts.js",
  "./services/ui/flow.js",
  "./services/brain-os/context-engine.js",
  "./ui/os-experience-polish.js",
  "./services/ui/widget-marketplace.js",
  "./services/ui/widget-builder.js",
  "./services/connections/integration-hub.js",
  "./services/connections/discord.js",
  "./services/connections/lanyard.js",
  "./services/connections/spotify.js",
  "./services/connections/lastfm.js",
  "./services/connections/steam.js",
  "./pages/notes/index.js",
  "./pages/items/index.js",
  "./pages/items/explorer.css",
  "./pages/settings/settings-premium.js",
  "./widgets/pomodoro.js",
  "./widgets/daily-focus.js",
  "./ui/native-shell.js",
  "./ui/desktop-environment.js",
  "./ui/status-bar.js",
  "./ui/mission-control.js",
  "./ui/profile-switcher.js",
  "./ui/app-library.js",
  "./ui/morning-briefing.js",
  "./services/achievements.js",
  "./services/ui/universe.js",
  "./services/plugins/plugin-sdk.js",
  "./services/onboarding/first-run.js",
  "./pages/studio/index.js",
  "./pages/import-assistant/index.js",
  "./pages/gaming/hub.js",
  "./services/activity.js",
  "./services/memory/central-memory.js",
  "./services/time-machine.js",
  "./services/cloud.js",
  "./services/profiles/profile-manager.js",
  "./services/backup-manager.js",
  "./state/profile.js",
  "./pages/timeline/index.js",
  "./pages/timeline/style.css",
  "./pages/health/index.js",
  "./pages/health/style.css",
  "./pages/version-history/index.js",
  "./pages/version-history/style.css",
  "./pages/dashboard-v4.js",
  "./pages/dashboard-os2.js",
  "./services/plugins/plugin-hub.js",
  "./ui/permanent-dock.js",
  "./ui/plugin-hub.css",
  "./icons/ethone-icon.svg",
  "./icons/ethone-icon-192.png",
  "./icons/ethone-icon-512.png"
];

const ETHONE_BOOT_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./ui/auth.css",
  "./ui/tokens.css",
  "./ui/components.css",
  "./ui/app.css",
  "./ui/layout-integrity.css",
  "./ui/clarity-polish.css",
  "./ui/release-polish.css",
  "./ui/os-sidebar.css",
  "./ui/mobile.css",
  "./ui/first-run.css",
  "./pages/dashboard-v4.css",
  "./core/safe-mode.js",
  "./core/emergency-performance-guard.js",
  "./core/boot-sequence.js",
  "./core/lazy-modules.js",
  "./core/runtime.js",
  "./core/boot.js",
  "./ui/release-polish.js",
  "./actions/action-registry.js",
  "./actions/legacy-navigation.js",
  "./services/auth/interactivity.js",
  "./services/auth/premium-experience.js",
  "./services/onboarding/first-run.js",
  "./services/language/auth-dictionary.js",
  "./services/language/runtime.js",
  "./services/settings.js",
  "./services/theme.js",
  "./pages/dashboard/init.js",
  "./pages/dashboard/shell.js",
  "./pages/dashboard/resizable-sidebar.js",
  "./pages/dashboard/nav-active-pill.js",
  "./pages/dashboard/mobile-sidebar.js",
  "./pages/dashboard-v4.js",
  "./icons/ethone-icon.svg",
  "./icons/ethone-icon-192.png",
  "./icons/ethone-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(ETHONE_CACHE)
      .then(cache => cache.addAll(ETHONE_BOOT_ASSETS.map(url => new Request(url, { cache: "reload" }))))
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
