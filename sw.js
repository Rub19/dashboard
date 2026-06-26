const ETHONE_VERSION = "2026-06-26-production-v3";
const ETHONE_CACHE = `ethone-${ETHONE_VERSION}`;
const ETHONE_OFFLINE_URL = "./index.html";
const ETHONE_CORE_ASSETS = [
  "./index.html",
  "./manifest.webmanifest",
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
