const ETHONE_VERSION = "2026-07-10-production-v338-readiness";
const ETHONE_CACHE = `ethone-${ETHONE_VERSION}`;
const ETHONE_OFFLINE_URL = "./index.html";
const ETHONE_BOOT_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
  "./ui/auth.css",
  "./ui/tokens.css",
  "./ui/components.css",
  "./ui/app.css",
  "./ui/app-foundation.css",
  "./ui/dynamic-background.css",
  "./ui/spaces.css",
  "./ui/layout-integrity.css",
  "./ui/animation-optimizer.css",
  "./ui/clarity-polish.css",
  "./ui/release-polish.css",
  "./ui/ux-polish.css",
  "./ui/consistency-audit.css",
  "./ui/ui-performance.css",
  "./ui/micro-feedback.css",
  "./ui/keyboard-first.css",
  "./ui/responsive-audit.css",
  "./ui/apple-polish.css",
  "./ui/design-system-audit.css",
  "./ui/dashboard-premium.css",
  "./ui/final-product-polish.css",
  "./ui/design-system-6.css",
  "./ui/notification-center.css",
  "./ui/notification-center-v2.css",
  "./ui/os-sidebar.css",
  "./ui/sidebar-final.css",
  "./ui/blur-consistency.css",
  "./ui/motion-engine.css",
  "./ui/typography-engine.css",
  "./ui/icon-system.css",
  "./ui/ux-final-polish.css",
  "./ui/ultimate-visual-polish.css",
  "./ui/mobile.css",
  "./core/safe-mode.js",
  "./core/console-hygiene.js",
  "./core/emergency-performance-guard.js",
  "./core/boot-sequence.js",
  "./core/boot-manager.js",
  "./core/lazy-modules.js",
  "./core/runtime-compat.js",
  "./core/runtime.js",
  "./core/dom-runtime.js",
  "./state/store.js",
  "./utils/color-contrast.js",
  "./core/boot.js",
  "./ui/release-polish.js",
  "./ui/icon-system.js",
  "./ui/keyboard-first.js",
  "./ui/final-product-polish.js",
  "./ui/design-system-6.js",
  "./ui/ux-final-polish.js",
  "./ui/motion-system.js",
  "./actions/navigation.js",
  "./actions/notification-center.js",
  "./actions/action-registry.js",
  "./actions/legacy-navigation.js",
  "./services/auth/interactivity.js",
  "./services/auth/premium-experience.js",
  "./services/language/auth-dictionary.js",
  "./services/language/index.js",
  "./services/language/runtime.js",
  "./services/settings.js",
  "./services/theme.js",
  "./services/theme/engine.js",
  "./services/theme/dynamic-background.js",
  "./services/workspaces.js",
  "./services/onboarding/gate.js",
  "./services/os/mission-control-model.js",
  "./ui/mission-control.js",
  "./ui/mission-control.css",
  "./pages/dashboard/init.js",
  "./pages/dashboard/shell.js",
  "./pages/dashboard/resizable-sidebar.js",
  "./pages/dashboard/nav-active-pill.js",
  "./pages/dashboard/mobile-sidebar.js",
  "./pages/dashboard/sidebar-final.js",
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
