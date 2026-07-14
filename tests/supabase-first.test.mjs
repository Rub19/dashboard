import test from "node:test";
import assert from "node:assert/strict";
import { createClockManager, createClockSnapshot } from "../v8/services/clock-manager.mjs";
import { CLOUD_CACHE_PREFIX, CLOUD_QUEUE_PREFIX, createSupabaseStateSync, normalizeCloudPayload } from "../v8/services/supabase-state-sync.mjs";
import { createProfileRepository } from "../v8/data/profile-repository.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null
  };
}

function fakeRuntime() {
  const listeners = new Map();
  const timers = new Map();
  let sequence = 0;
  return {
    navigator: { onLine: true },
    crypto: { randomUUID: () => `mutation-${++sequence}` },
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    listeners,
    timers
  };
}

function fakeDocument() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    listeners
  };
}

function fakeSupabase(initialRow = null) {
  const state = { row: initialRow ? structuredClone(initialRow) : null, calls: [] };
  return {
    state,
    from(table) {
      let operation = "select";
      let values = null;
      const filters = {};
      const execute = async () => {
        await state.beforeExecute?.({ table, operation, filters: { ...filters } });
        state.calls.push({ table, operation, filters: { ...filters } });
        if (operation === "select") return { data: state.row && (!filters.user_id || state.row.user_id === filters.user_id) ? structuredClone(state.row) : null, error: null };
        if (operation === "insert") {
          if (state.row) return { data: null, error: { code: "23505", message: "duplicate" } };
          state.row = structuredClone(values);
          return { data: structuredClone(state.row), error: null };
        }
        if (!state.row || state.row.user_id !== filters.user_id || state.row.revision !== filters.revision) return { data: null, error: null };
        state.row = { ...state.row, ...structuredClone(values) };
        return { data: structuredClone(state.row), error: null };
      };
      const builder = {
        select() { return builder; },
        insert(next) { operation = "insert"; values = next; return builder; },
        update(next) { operation = "update"; values = next; return builder; },
        eq(key, value) { filters[key] = value; return builder; },
        maybeSingle: execute,
        single: execute
      };
      return builder;
    }
  };
}

function cloudPayload(name, preferences = {}) {
  return normalizeCloudPayload({
    repository: { version: 1, activeProfileId: "profile-cloud", profiles: [{ id: "profile-cloud", name, state: { notes: [], todos: [], events: [], items: [] } }] },
    preferences
  });
}

test("global clock aligns to the minute, refreshes on visibility and owns one timer", () => {
  let current = new Date("2026-07-14T10:04:42.500Z");
  const runtime = fakeRuntime();
  const document = fakeDocument();
  const clock = createClockManager({ runtime, document, now: () => current, locale: "fr-FR" });
  const updates = [];
  clock.subscribe((snapshot) => updates.push(snapshot.time));
  assert.equal(clock.start(), true);
  assert.equal(clock.start(), false);
  assert.equal(runtime.timers.size, 1);
  assert.match(clock.snapshot().time, /^\d{2}:\d{2}$/);

  current = new Date("2026-07-14T10:05:00.050Z");
  const [timerId, scheduled] = [...runtime.timers.entries()][0];
  runtime.timers.delete(timerId);
  scheduled.callback();
  assert.equal(runtime.timers.size, 1);
  assert.equal(updates.at(-1), createClockSnapshot(current, "fr-FR").time);

  current = new Date("2026-07-15T08:15:00.000Z");
  document.listeners.get("visibilitychange")();
  assert.equal(clock.snapshot().date, "2026-07-15");
  assert.equal(runtime.timers.size, 1);
  assert.equal(clock.destroy(), true);
  assert.equal(runtime.timers.size, 0);
  assert.equal(document.listeners.size, 0);
});

test("Supabase wins over stale local cache and hydrates the repository", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000001";
  const stale = cloudPayload("Cache obsolete", { theme: "graphite" });
  const cloud = cloudPayload("Source Supabase", { theme: "night", locale: "fr" });
  const storage = memoryStorage({
    [`${CLOUD_CACHE_PREFIX}${ownerId}`]: JSON.stringify({ ownerId, revision: 1, remoteKnown: true, payload: stale }),
    [`${CLOUD_QUEUE_PREFIX}${ownerId}`]: JSON.stringify({ id: "unknown-base", ownerId, baseRevision: 0, baseKnown: false, payload: cloudPayload("File locale inconnue") })
  });
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId });
  const client = fakeSupabase({ user_id: ownerId, payload: cloud, revision: 5, mutation_id: "server-5", updated_at: new Date().toISOString() });
  const sync = createSupabaseStateSync({ runtime: fakeRuntime(), storage, timeoutMs: 1000 });
  const loaded = await sync.start({ client, ownerId, repository });
  assert.equal(loaded.ok, true);
  assert.equal(repository.activeProfile().name, "Source Supabase");
  assert.equal(sync.preferences().theme, "night");
  assert.equal(sync.status().source, "supabase");
  assert.equal(sync.status().revision, 5);
  assert.equal(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`), null);
  assert.equal(client.state.calls.filter((call) => call.operation !== "select").length, 0);
  sync.destroy();
});

test("offline changes stay queued and sync once the known revision is available", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000002";
  const runtime = fakeRuntime();
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId });
  const client = fakeSupabase({ user_id: ownerId, payload: cloudPayload("Personnel"), revision: 2, mutation_id: "server-2", updated_at: new Date().toISOString() });
  const sync = createSupabaseStateSync({ runtime, storage, timeoutMs: 1000, debounceMs: 50 });
  await sync.start({ client, ownerId, repository });
  runtime.navigator.onLine = false;
  repository.notes.create({ title: "Brouillon hors ligne" });
  assert.equal(sync.status().syncStatus, "offline");
  assert.equal(sync.status().saveStatus, "pending");
  assert.ok(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`));

  runtime.navigator.onLine = true;
  const saved = await sync.flush();
  assert.equal(saved.ok, true);
  assert.equal(client.state.row.revision, 3);
  assert.equal(client.state.row.payload.repository.profiles[0].state.notes[0].title, "Brouillon hors ligne");
  assert.equal(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`), null);
  assert.equal(sync.status().syncStatus, "saved");
  sync.destroy();
});

test("a revision conflict never lets stale local state overwrite Supabase", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000003";
  const runtime = fakeRuntime();
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId });
  const client = fakeSupabase({ user_id: ownerId, payload: cloudPayload("Cloud v1"), revision: 1, mutation_id: "server-1", updated_at: new Date().toISOString() });
  const sync = createSupabaseStateSync({ runtime, storage, timeoutMs: 1000 });
  await sync.start({ client, ownerId, repository });
  repository.updateProfile("profile-cloud", { name: "Modification locale" });
  client.state.row = { ...client.state.row, payload: cloudPayload("Cloud v2"), revision: 2, mutation_id: "server-2" };

  const saved = await sync.flush();
  assert.equal(saved.ok, false);
  assert.equal(saved.status, "conflict");
  assert.equal(client.state.row.payload.repository.profiles[0].name, "Cloud v2");
  assert.equal(sync.status().saveStatus, "pending");
  assert.ok(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`));
  sync.destroy();
});

test("a persisted offline queue resumes automatically after a new launch", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000004";
  const cloud = cloudPayload("Cloud avant fermeture", { theme: "graphite" });
  const offline = cloudPayload("Travail hors ligne restaure", { theme: "night" });
  const storage = memoryStorage({
    [`${CLOUD_CACHE_PREFIX}${ownerId}`]: JSON.stringify({ ownerId, revision: 4, remoteKnown: true, payload: cloud }),
    [`${CLOUD_QUEUE_PREFIX}${ownerId}`]: JSON.stringify({ id: "offline-restart", ownerId, baseRevision: 4, baseKnown: true, payload: offline })
  });
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId });
  const client = fakeSupabase({ user_id: ownerId, payload: cloud, revision: 4, mutation_id: "server-4", updated_at: new Date().toISOString() });
  const sync = createSupabaseStateSync({ runtime: fakeRuntime(), storage, timeoutMs: 1000 });

  const resumed = await sync.start({ client, ownerId, repository });
  assert.equal(resumed.ok, true);
  assert.equal(client.state.row.revision, 5);
  assert.equal(client.state.row.payload.repository.profiles[0].name, "Travail hors ligne restaure");
  assert.equal(repository.activeProfile().name, "Travail hors ligne restaure");
  assert.equal(sync.preferences().theme, "night");
  assert.equal(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`), null);
  sync.destroy();
});

test("a newer mutation queued during a save is rebased and never dropped", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000005";
  const runtime = fakeRuntime();
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId });
  const client = fakeSupabase({ user_id: ownerId, payload: cloudPayload("Cloud"), revision: 1, mutation_id: "server-1", updated_at: new Date().toISOString() });
  const sync = createSupabaseStateSync({ runtime, storage, timeoutMs: 1000 });
  await sync.start({ client, ownerId, repository });

  repository.updateProfile("profile-cloud", { name: "Premiere mutation" });
  let releaseUpdate = null;
  client.state.beforeExecute = ({ operation }) => operation === "update" ? new Promise((resolve) => { releaseUpdate = resolve; }) : null;
  const firstSave = sync.flush();
  assert.equal(typeof releaseUpdate, "function");
  repository.updateProfile("profile-cloud", { name: "Mutation la plus recente" });
  client.state.beforeExecute = null;
  releaseUpdate();
  assert.equal((await firstSave).ok, true);
  assert.ok(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`));

  assert.equal((await sync.flush()).ok, true);
  assert.equal(client.state.row.revision, 3);
  assert.equal(client.state.row.payload.repository.profiles[0].name, "Mutation la plus recente");
  assert.equal(storage.read(`${CLOUD_QUEUE_PREFIX}${ownerId}`), null);
  sync.destroy();
});

test("a late response from another account cannot hydrate the active owner", async () => {
  const runtime = fakeRuntime();
  const storage = memoryStorage();
  const ownerA = "00000000-0000-4000-8000-000000000006";
  const ownerB = "00000000-0000-4000-8000-000000000007";
  const repositoryA = createProfileRepository({ storage, requireOwner: true, ownerId: ownerA });
  const repositoryB = createProfileRepository({ storage, requireOwner: true, ownerId: ownerB });
  const clientA = fakeSupabase({ user_id: ownerA, payload: cloudPayload("Compte A"), revision: 1, mutation_id: "a-1", updated_at: new Date().toISOString() });
  const clientB = fakeSupabase({ user_id: ownerB, payload: cloudPayload("Compte B"), revision: 2, mutation_id: "b-2", updated_at: new Date().toISOString() });
  let releaseA = null;
  clientA.state.beforeExecute = ({ operation }) => operation === "select" ? new Promise((resolve) => { releaseA = resolve; }) : null;
  const sync = createSupabaseStateSync({ runtime, storage, timeoutMs: 1000 });

  const firstStart = sync.start({ client: clientA, ownerId: ownerA, repository: repositoryA });
  assert.equal(typeof releaseA, "function");
  const secondStart = await sync.start({ client: clientB, ownerId: ownerB, repository: repositoryB });
  assert.equal(secondStart.ok, true);
  assert.equal(repositoryB.activeProfile().name, "Compte B");

  releaseA();
  assert.equal((await firstStart).status, "stale");
  assert.equal(repositoryB.activeProfile().name, "Compte B");
  assert.equal(sync.status().revision, 2);
  sync.destroy();
});
