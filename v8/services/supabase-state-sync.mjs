export const CLOUD_STATE_TABLE = "ethone_user_state";
export const CLOUD_CACHE_PREFIX = "ethone:v8:cloud-cache:";
export const CLOUD_QUEUE_PREFIX = "ethone:v8:cloud-queue:";

const PREFERENCE_KEYS = Object.freeze(["route", "theme", "density", "densitySettings", "brainPreferences", "accent", "space", "flow", "spotlightEnabled", "railExpanded", "locale", "sound", "dock"]);
const MAX_PAYLOAD_BYTES = 4_500_000;

function result(ok, status, message, data = null) {
  return Object.freeze({ ok, status, message, data });
}

function safeText(value, limit = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
}

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

function preferencesOf(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.freeze(Object.fromEntries(PREFERENCE_KEYS
    .filter((key) => Object.hasOwn(source, key))
    .map((key) => [key, clone(source[key])] )));
}

export function normalizeCloudPayload(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const repository = source.repository && typeof source.repository === "object" ? source.repository : {};
  const profiles = Array.isArray(repository.profiles) ? clone(repository.profiles) : [];
  const payload = {
    schema: "ethone-user-state",
    version: 1,
    repository: {
      version: 1,
      profiles: Array.isArray(profiles) ? profiles : [],
      activeProfileId: safeText(repository.activeProfileId, 80)
    },
    preferences: preferencesOf(source.preferences)
  };
  const serialized = JSON.stringify(payload);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) throw new Error("Les donnees depassent la taille de synchronisation autorisee.");
  return Object.freeze(payload);
}

function mutationId(runtime) {
  return runtime.crypto?.randomUUID?.() || `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSupabaseStateSync(options = {}) {
  const runtime = options.runtime || globalThis;
  const storage = options.storage || runtime.localStorage || null;
  const table = safeText(options.table || CLOUD_STATE_TABLE, 80) || CLOUD_STATE_TABLE;
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 2_500);
  const debounceMs = Math.max(50, Number(options.debounceMs) || 350);
  const listeners = new Set();
  const activeControllers = new Set();
  let client = null;
  let repository = null;
  let ownerId = "";
  let repositoryRelease = null;
  let payloadReader = null;
  let preferencesApplier = null;
  let currentPayload = null;
  let revision = 0;
  let remoteKnown = false;
  let remoteExists = false;
  let pending = null;
  let saveTimer = 0;
  let pullPromise = null;
  let flushPromise = null;
  let generation = 0;
  let started = false;
  let destroyed = false;
  let applyingRemote = false;
  let status = Object.freeze({
    syncStatus: "loading",
    networkStatus: runtime.navigator?.onLine === false ? "offline" : "online",
    saveStatus: "idle",
    sessionStatus: "checking",
    source: "none",
    revision: 0,
    pending: false,
    error: "",
    updatedAt: Date.now()
  });

  function cacheKey() { return `${CLOUD_CACHE_PREFIX}${ownerId}`; }
  function queueKey() { return `${CLOUD_QUEUE_PREFIX}${ownerId}`; }

  function publish(patch = {}) {
    status = Object.freeze({ ...status, ...patch, revision, pending: Boolean(pending), updatedAt: Date.now() });
    listeners.forEach((listener) => { try { listener(status); } catch {} });
    return status;
  }

  function readStored(key) {
    try { return safeParse(storage?.getItem?.(key)); } catch { return null; }
  }

  function writeStored(key, value) {
    try { storage?.setItem?.(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  function removeStored(key) {
    try { storage?.removeItem?.(key); } catch {}
  }

  function loadCache() {
    const cache = readStored(cacheKey());
    if (!cache || cache.ownerId !== ownerId || !cache.payload) return false;
    try {
      currentPayload = normalizeCloudPayload(cache.payload);
      revision = Math.max(0, Number.parseInt(cache.revision, 10) || 0);
      remoteKnown = cache.remoteKnown === true;
      remoteExists = revision > 0;
      applyPayload(currentPayload);
      return true;
    } catch {
      removeStored(cacheKey());
      return false;
    }
  }

  function loadQueue() {
    const queued = readStored(queueKey());
    if (!queued || queued.ownerId !== ownerId || !queued.payload) return false;
    try {
      pending = { ...queued, payload: normalizeCloudPayload(queued.payload) };
      if (pending.baseKnown === true) applyPayload(pending.payload);
      return true;
    } catch {
      removeStored(queueKey());
      pending = null;
      return false;
    }
  }

  function persistCache(payload) {
    writeStored(cacheKey(), { ownerId, revision, remoteKnown, cachedAt: new Date().toISOString(), payload });
  }

  function buildPayload() {
    return normalizeCloudPayload({
      repository: repository?.exportCloudState?.() || currentPayload?.repository || {},
      preferences: payloadReader?.() || currentPayload?.preferences || {}
    });
  }

  function applyPayload(payload) {
    applyingRemote = true;
    try {
      repository?.hydrateCloudState?.(payload.repository);
      preferencesApplier?.(payload.preferences);
      currentPayload = payload;
    } finally {
      applyingRemote = false;
    }
  }

  async function runQuery(builder) {
    const controller = new AbortController();
    activeControllers.add(controller);
    const query = typeof builder?.abortSignal === "function" ? builder.abortSignal(controller.signal) : builder;
    let timer = 0;
    try {
      return await Promise.race([
        Promise.resolve(query),
        new Promise((_, reject) => {
          timer = runtime.setTimeout?.(() => {
            controller.abort();
            reject(new Error("La requete Supabase a expire."));
          }, timeoutMs) || 0;
        })
      ]);
    } finally {
      if (timer) runtime.clearTimeout?.(timer);
      activeControllers.delete(controller);
    }
  }

  function operationIsCurrent(expectedGeneration, expectedOwner, expectedClient) {
    return started && generation === expectedGeneration && ownerId === expectedOwner && client === expectedClient;
  }

  async function readRemote(expectedClient = client, expectedOwner = ownerId) {
    const query = expectedClient.from(table).select("payload,revision,mutation_id,updated_at").eq("user_id", expectedOwner).maybeSingle();
    return runQuery(query);
  }

  function acceptRemote(row) {
    const payload = normalizeCloudPayload(row.payload);
    revision = Math.max(0, Number.parseInt(row.revision, 10) || 0);
    remoteKnown = true;
    remoteExists = true;
    if (pending && pending.baseKnown !== true) {
      pending = null;
      removeStored(queueKey());
    }
    applyPayload(payload);
    persistCache(payload);
    publish({ syncStatus: "saved", saveStatus: "saved", sessionStatus: "valid", source: "supabase", error: "" });
    return payload;
  }

  async function performPull() {
    const expectedGeneration = generation;
    const expectedClient = client;
    const expectedOwner = ownerId;
    if (!expectedClient || !expectedOwner) return result(false, "unavailable", "La session Supabase n'est pas disponible.");
    if (runtime.navigator?.onLine === false) {
      publish({ syncStatus: "offline", networkStatus: "offline", saveStatus: pending ? "pending" : "idle", source: currentPayload ? "cache" : "none" });
      return result(false, "offline", "Hors ligne - le cache est utilise.");
    }
    publish({ syncStatus: "loading", networkStatus: "online", sessionStatus: "valid", error: "" });
    try {
      const response = await readRemote(expectedClient, expectedOwner);
      if (!operationIsCurrent(expectedGeneration, expectedOwner, expectedClient)) return result(false, "stale", "Operation Supabase remplacee.");
      if (response?.error) throw response.error;
      if (response?.data) {
        const queued = pending;
        acceptRemote(response.data);
        if (queued?.baseKnown === true) {
          pending = queued;
          writeStored(queueKey(), pending);
          if (queued.baseRevision !== revision) {
            publish({ syncStatus: "error", saveStatus: "pending", source: "supabase", error: "Conflit de revision Supabase." });
            return result(false, "conflict", "Une version Supabase plus recente existe. Le changement local reste en attente.");
          }
          applyPayload(queued.payload);
          publish({ syncStatus: "saving", saveStatus: "pending", source: "local-cache", error: "" });
          return result(true, "pending", "Les changements hors ligne sont prets a etre synchronises.", { revision });
        }
        return result(true, "completed", "Donnees chargees depuis Supabase.", { revision, source: "supabase" });
      }
      const cachedWasRemote = remoteKnown && revision > 0;
      const queued = pending;
      remoteKnown = true;
      remoteExists = false;
      revision = 0;
      if (queued) {
        pending = queued;
        if (queued.baseKnown === true && queued.baseRevision !== 0) {
          publish({ syncStatus: "error", saveStatus: "pending", source: "supabase", error: "La version Supabase de reference n'existe plus." });
          return result(false, "conflict", "La version Supabase de reference n'existe plus. Le changement local reste en attente.");
        }
        pending = { ...queued, baseRevision: 0, baseKnown: true };
        writeStored(queueKey(), pending);
        applyPayload(pending.payload);
        publish({ syncStatus: "saving", saveStatus: "pending", source: "local-cache", error: "" });
        return result(true, "pending", "Les changements locaux sont prets a creer l'etat Supabase.", { revision: 0 });
      }
      if (cachedWasRemote) {
        const emptyPayload = normalizeCloudPayload();
        applyPayload(emptyPayload);
        persistCache(emptyPayload);
      }
      publish({ syncStatus: "saved", saveStatus: pending ? "pending" : "idle", source: "supabase", error: "" });
      return result(true, "empty", "Supabase est connecte. Aucune donnee distante n'existe encore.", { revision: 0, source: "supabase" });
    } catch (error) {
      if (!operationIsCurrent(expectedGeneration, expectedOwner, expectedClient)) return result(false, "stale", "Operation Supabase remplacee.");
      const cached = Boolean(currentPayload) || loadCache();
      publish({ syncStatus: "error", saveStatus: pending ? "pending" : "error", source: cached ? "cache" : "none", error: safeText(error?.message || "Synchronisation indisponible.") });
      return result(false, "failed", "Supabase est temporairement indisponible. Le cache reste actif.", error);
    }
  }

  function pull() {
    if (pullPromise) return pullPromise;
    const operation = performPull();
    pullPromise = operation;
    operation.then(
      () => { if (pullPromise === operation) pullPromise = null; },
      () => { if (pullPromise === operation) pullPromise = null; }
    );
    return operation;
  }

  function queue(reason = "change") {
    if (!ownerId || !repository || applyingRemote) return result(false, "unavailable", "La synchronisation n'est pas initialisee.");
    try {
      const payload = buildPayload();
      if (!pending && currentPayload && JSON.stringify(payload) === JSON.stringify(currentPayload)) {
        return result(true, "unchanged", "Les donnees Supabase sont deja a jour.", { revision });
      }
      pending = {
        id: mutationId(runtime),
        ownerId,
        reason: safeText(reason, 80),
        baseRevision: revision,
        baseKnown: remoteKnown,
        queuedAt: new Date().toISOString(),
        payload
      };
      writeStored(queueKey(), pending);
      if (runtime.navigator?.onLine === false) {
        publish({ syncStatus: "offline", networkStatus: "offline", saveStatus: "pending", source: currentPayload ? "cache" : "local-cache" });
      } else {
        publish({ syncStatus: "saving", networkStatus: "online", saveStatus: "saving", error: "" });
        if (saveTimer) runtime.clearTimeout?.(saveTimer);
        saveTimer = runtime.setTimeout?.(() => { saveTimer = 0; void flush(); }, debounceMs) || 0;
      }
      return result(true, "queued", "Modification mise en file de synchronisation.", { id: pending.id });
    } catch (error) {
      publish({ syncStatus: "error", saveStatus: "error", error: safeText(error?.message) });
      return result(false, "failed", "La modification n'a pas pu etre preparee.", error);
    }
  }

  async function savePending(change, expectedClient = client, expectedOwner = ownerId) {
    const nextRevision = change.baseRevision + 1;
    const values = { payload: change.payload, revision: nextRevision, mutation_id: change.id, updated_at: new Date().toISOString() };
    if (!remoteExists && change.baseRevision === 0) {
      return runQuery(expectedClient.from(table).insert({ user_id: expectedOwner, ...values }).select("payload,revision,mutation_id,updated_at").single());
    }
    return runQuery(expectedClient.from(table).update(values).eq("user_id", expectedOwner).eq("revision", change.baseRevision).select("payload,revision,mutation_id,updated_at").maybeSingle());
  }

  async function performFlush() {
    if (saveTimer) runtime.clearTimeout?.(saveTimer);
    saveTimer = 0;
    if (!pending) return result(true, "completed", "Aucun changement en attente.", { revision });
    if (runtime.navigator?.onLine === false) {
      publish({ syncStatus: "offline", networkStatus: "offline", saveStatus: "pending" });
      return result(false, "offline", "Hors ligne - changements en attente.");
    }
    if (!remoteKnown || pending.baseKnown !== true) {
      const loaded = await pull();
      if (!loaded.ok) return loaded;
      if (!pending) return result(true, "completed", "La version Supabase a ete restauree.", { revision });
      pending = { ...pending, baseRevision: revision, baseKnown: true, payload: buildPayload() };
      writeStored(queueKey(), pending);
    }
    const change = pending;
    const expectedGeneration = generation;
    const expectedClient = client;
    const expectedOwner = ownerId;
    publish({ syncStatus: "saving", networkStatus: "online", saveStatus: "saving", error: "" });
    try {
      const response = await savePending(change, expectedClient, expectedOwner);
      if (!operationIsCurrent(expectedGeneration, expectedOwner, expectedClient)) return result(false, "stale", "Operation Supabase remplacee.");
      if (response?.error) throw response.error;
      if (!response?.data) {
        await pull();
        if (!operationIsCurrent(expectedGeneration, expectedOwner, expectedClient)) return result(false, "stale", "Operation Supabase remplacee.");
        publish({ syncStatus: "error", saveStatus: "pending", source: "supabase", error: "Conflit de revision Supabase." });
        return result(false, "conflict", "Une version Supabase plus recente existe. Aucune donnee cloud n'a ete ecrasee.");
      }
      const nextPending = pending?.id !== change.id ? pending : null;
      pending = null;
      acceptRemote(response.data);
      if (nextPending) {
        pending = { ...nextPending, baseRevision: revision, baseKnown: true };
        writeStored(queueKey(), pending);
        applyPayload(pending.payload);
        publish({ syncStatus: "saving", saveStatus: "pending", source: "local-cache", error: "" });
        if (saveTimer) runtime.clearTimeout?.(saveTimer);
        saveTimer = runtime.setTimeout?.(() => { saveTimer = 0; void flush(); }, debounceMs) || 0;
      } else {
        removeStored(queueKey());
      }
      return result(true, "completed", "Synchronise avec Supabase.", { revision });
    } catch (error) {
      if (!operationIsCurrent(expectedGeneration, expectedOwner, expectedClient)) return result(false, "stale", "Operation Supabase remplacee.");
      if (String(error?.code || "") === "23505") await pull();
      publish({ syncStatus: runtime.navigator?.onLine === false ? "offline" : "error", saveStatus: "pending", error: safeText(error?.message || "Echec de synchronisation.") });
      return result(false, "failed", "La sauvegarde Supabase sera reessayee.", error);
    }
  }

  function flush() {
    if (flushPromise) return flushPromise;
    const operation = performFlush();
    flushPromise = operation;
    operation.then(
      () => { if (flushPromise === operation) flushPromise = null; },
      () => { if (flushPromise === operation) flushPromise = null; }
    );
    return operation;
  }

  async function refresh() {
    publish({ syncStatus: "retrying", saveStatus: pending ? "saving" : status.saveStatus, error: "" });
    return pending ? flush() : pull();
  }

  function handleOffline() {
    if (saveTimer) runtime.clearTimeout?.(saveTimer);
    saveTimer = 0;
    publish({ syncStatus: "offline", networkStatus: "offline", saveStatus: pending ? "pending" : "idle" });
  }

  function handleOnline() {
    publish({ syncStatus: "retrying", networkStatus: "online", saveStatus: pending ? "saving" : "idle", error: "" });
    void (pending ? flush() : pull());
  }

  async function start(context = {}) {
    if (destroyed) return result(false, "unavailable", "Le service de synchronisation est arrete.");
    stop();
    client = context.client || null;
    repository = context.repository || null;
    ownerId = safeText(context.ownerId, 120);
    if (!client?.from || !repository || !ownerId) {
      publish({ syncStatus: "error", saveStatus: "error", sessionStatus: "expired", error: "Session Supabase invalide." });
      return result(false, "unavailable", "Une session Supabase valide est requise.");
    }
    started = true;
    loadCache();
    loadQueue();
    repositoryRelease = repository.subscribePersistence?.(() => { if (!applyingRemote) queue("repository"); }) || null;
    runtime.addEventListener?.("online", handleOnline);
    runtime.addEventListener?.("offline", handleOffline);
    publish({ syncStatus: runtime.navigator?.onLine === false ? "offline" : "loading", networkStatus: runtime.navigator?.onLine === false ? "offline" : "online", sessionStatus: "valid", saveStatus: pending ? "pending" : "idle", source: currentPayload ? "cache" : "none", error: "" });
    const loaded = await pull();
    return loaded.ok && loaded.status === "pending" ? flush() : loaded;
  }

  function bindRuntime(binding = {}) {
    payloadReader = typeof binding.readPreferences === "function" ? binding.readPreferences : null;
    preferencesApplier = typeof binding.applyPreferences === "function" ? binding.applyPreferences : null;
    if (currentPayload && preferencesApplier) preferencesApplier(currentPayload.preferences);
    return () => {
      if (payloadReader === binding.readPreferences) payloadReader = null;
      if (preferencesApplier === binding.applyPreferences) preferencesApplier = null;
    };
  }

  function subscribe(listener, settings = {}) {
    if (typeof listener !== "function" || destroyed) return () => false;
    listeners.add(listener);
    if (settings.immediate !== false) {
      try { listener(status); } catch {}
    }
    return () => listeners.delete(listener);
  }

  function stop() {
    generation += 1;
    if (saveTimer) runtime.clearTimeout?.(saveTimer);
    saveTimer = 0;
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
    pullPromise = null;
    flushPromise = null;
    repositoryRelease?.();
    repositoryRelease = null;
    runtime.removeEventListener?.("online", handleOnline);
    runtime.removeEventListener?.("offline", handleOffline);
    started = false;
    client = null;
    repository = null;
    ownerId = "";
    payloadReader = null;
    preferencesApplier = null;
    currentPayload = null;
    pending = null;
    revision = 0;
    remoteKnown = false;
    remoteExists = false;
    return true;
  }

  function destroy() {
    if (destroyed) return false;
    stop();
    destroyed = true;
    listeners.clear();
    return true;
  }

  return Object.freeze({
    start,
    stop,
    bindRuntime,
    queue,
    flush,
    refresh,
    subscribe,
    preferences: () => currentPayload?.preferences || Object.freeze({}),
    status: () => status,
    diagnostics: () => Object.freeze({ ...status, started, owner: ownerId ? "authenticated" : "none", remoteKnown, remoteExists, timerActive: Boolean(saveTimer), activeRequests: activeControllers.size, pullActive: Boolean(pullPromise), flushActive: Boolean(flushPromise) }),
    destroy
  });
}
