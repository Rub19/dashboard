const CACHE_NAME = "ethone-next-v418";
const PRECACHE = ["/", "/login/", "/dashboard/", "/offline.html"];
const STATIC_EXTENSIONS = [".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".woff", ".woff2", ".ico"];

const DB_NAME = "ethone-notifications";
const DB_STORE = "inbox";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putNotification(record) {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("[SW] IDB put failed", e);
  }
}

async function getAllNotifications() {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("[SW] IDB getAll failed", e);
    return [];
  }
}

async function deleteNotifications(ids) {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    ids.forEach((id) => store.delete(id));
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("[SW] IDB delete failed", e);
  }
}

async function clearNotifications() {
  try {
    const db = await openDb();
    const tx = db.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    store.clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("[SW] IDB clear failed", e);
  }
}

async function syncToClient(client) {
  const items = await getAllNotifications();
  client.postMessage({ type: "SYNC_NOTIFICATIONS", items });
}

async function normalizeRecord(data) {
  const now = Date.now();
  let priority = data.priority || "normal";
  if (priority === "high") priority = "critical";
  if (priority === "medium") priority = "important";
  if (priority === "low") priority = "silent";
  if (!["critical", "important", "normal", "silent"].includes(priority)) {
    priority = "normal";
  }
  return {
    id: data.id || `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: data.title || data.notification?.title || "ETHONE",
    message: data.body || data.message || data.notification?.body || "Nouvelle notification",
    body: data.body || data.message || "Nouvelle notification",
    category: data.category || data.tag || "system",
    priority,
    type: data.type || "info",
    source: data.source || data.origin || "ETHONE",
    icon: data.icon || null,
    data: data.data || { url: data.url || "/" },
    read: false,
    archived: false,
    timestamp: data.timestamp || now,
    createdAt: data.createdAt || new Date(now).toISOString(),
  };
}

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext)) || pathname.startsWith("/_next/");
}

const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ETHONE · Offline</title>
  <style>
    :root { color-scheme: dark; --bg: #0b0c0f; --fg: #e2e4e8; --muted: #6d7482; --accent: #7c3aed; }
    body { margin: 0; display: grid; place-items: center; min-height: 100vh; background: var(--bg); color: var(--fg); font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .card { text-align: center; padding: 2rem; border: 1px solid #222; border-radius: 1.5rem; background: #15171c; max-width: 24rem; }
    h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    p { margin: 0 0 1.5rem; color: var(--muted); }
    button { border: none; border-radius: 1rem; padding: 0.75rem 1.25rem; font-size: 0.875rem; font-weight: 600; color: white; background: var(--accent); cursor: pointer; }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connectivité perdue</h1>
    <p>ETHONE n'est pas accessible sans connexion. Cette page est en cache.</p>
    <button onclick="location.reload()">Réessayer</button>
  </div>
</body>
</html>`;

async function offlineFallback() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match("/offline.html");
  if (cached) return cached;
  try {
    const network = await fetch("/offline.html", { cache: "no-store" });
    if (network && network.status === 200 && network.type === "basic") {
      const clone = network.clone();
      cache.put("/offline.html", clone);
      return network;
    }
  } catch {}
  return new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html" } });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { title: "ETHONE", body: "Nouvelle notification" };
  }

  const record = {
    id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: data.title || data.notification?.title || "ETHONE",
    body: data.body || data.message || data.notification?.body || "Nouvelle notification",
    category: data.category || data.tag || "ethone",
    priority: data.priority || "normal",
    type: data.type || "info",
    source: data.source || data.origin || "ETHONE",
    icon: data.icon || null,
    data: data.data || { url: data.url || "/" },
    url: data.url || "/",
  };

  const title = record.title;
  const options = {
    body: record.body,
    tag: record.category,
    icon: record.icon ? `/icons/${record.icon}.png` : "/icons/ethone-icon-192.png",
    badge: "/icons/ethone-icon-192.png",
    data: record,
    requireInteraction: record.priority === "critical" || record.priority === "important",
  };

  const notificationPromise = self.registration.showNotification(title, options);
  const recordPromise = (async () => {
    const normalized = await normalizeRecord(data);
    await putNotification(normalized);
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "PUSH_NOTIFICATION", item: normalized }));
  })();

  event.waitUntil(Promise.all([notificationPromise, recordPromise]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const record = event.notification.data || {};
  const url = record?.data?.url || record?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients.length) {
          clients[0].focus();
          clients[0].postMessage({ type: "NOTIFICATION_CLICK", id: record.id, url });
          return;
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "REQUEST_SYNC") {
    event.waitUntil(syncToClient(event.source));
    return;
  }

  if (data.type === "SYNC_NOTIFICATIONS" && Array.isArray(data.items)) {
    event.waitUntil(
      clearNotifications().then(() => Promise.all(data.items.map((item) => putNotification(item))))
    );
    return;
  }

  if (data.type === "PUSH_NOTIFICATION" && data.item) {
    event.waitUntil(putNotification(data.item));
    return;
  }

  if (data.type === "ARCHIVE_NOTIFICATIONS" && Array.isArray(data.ids)) {
    event.waitUntil(deleteNotifications(data.ids));
    return;
  }

  if (data.type === "CLEAR_NOTIFICATIONS") {
    event.waitUntil(clearNotifications());
    return;
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return;
  if (event.request.url.includes("/version.json")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") return;

  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== "basic") return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => cached || offlineFallback());
      })
    );
    return;
  }

  if (event.request.mode === "navigate") {
    const requestUrl = new URL(event.request.url);
    if (!requestUrl.pathname.includes(".") && !requestUrl.pathname.endsWith("/")) {
      requestUrl.pathname += "/";
    }
    requestUrl.search = "";
    const normalizedRequest = new Request(requestUrl.toString());

    event.respondWith(
      fetch(normalizedRequest)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(normalizedRequest, clone));
          return response;
        })
        .catch(() => caches.match(normalizedRequest).then((cached) => cached || offlineFallback()))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request).then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
        });
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => offlineFallback());
    })
  );
});
