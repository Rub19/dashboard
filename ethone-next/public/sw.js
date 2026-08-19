const CACHE_NAME = "ethone-next-v364";
const PRECACHE = ["/", "/login/", "/offline.html"];
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

async function offlineFallback() {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match("/offline.html")) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
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
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || offlineFallback()))
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
