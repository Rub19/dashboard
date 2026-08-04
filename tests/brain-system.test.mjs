import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createBrainActionRegistry } from "../v8/brain/action-registry.mjs";
import { createBrainContextEngine } from "../v8/brain/context-engine.mjs";
import { createBrainController } from "../v8/brain/controller.mjs";
import { createBrainMemoryRepository } from "../v8/brain/memory-repository.mjs";
import { sanitizeBrainPreferences } from "../v8/brain/preferences.mjs";
import { createBrainProviderManager } from "../v8/brain/provider-manager.mjs";

function brainSnapshot() {
  return {
    profile: { id: "profile-a", name: "Personnel", accessToken: "must-not-leak" },
    tasks: [{ id: "task-a", title: "Finaliser ETHONE", priority: "high", due: "2026-07-15", done: false, secret: "hidden" }],
    notes: [{ id: "note-a", title: "Architecture", content: "Private full note", updatedAt: "2026-07-14", pinned: true }],
    events: [{ id: "event-a", title: "Release review", date: "2026-07-15" }],
    files: [{ id: "file-a", name: "roadmap.pdf", type: "pdf", favorite: true, content: "not exposed" }],
    activities: [{ source: "github", category: "development", title: "Push", timestamp: "2026-07-14T08:00:00Z" }, { source: "discord", category: "gaming", title: "Party", timestamp: "2026-07-14T09:00:00Z" }],
    connections: [{ id: "github", status: "connected", lastSyncAt: "2026-07-14", responseMs: 42, token: "must-not-leak" }]
  };
}

function brainState(overrides = {}) {
  return {
    route: "notes",
    space: "focus",
    flow: "Deep Work",
    theme: "night",
    accent: "violet",
    density: "comfortable",
    brainPreferences: sanitizeBrainPreferences(),
    ...overrides
  };
}

function fakeBrainSupabase() {
  const state = { rows: [], calls: [], sequence: 0 };
  return {
    state,
    from(table) {
      let operation = "select";
      let payload = null;
      let filters = [];
      let single = false;
      const execute = async () => {
        state.calls.push({ table, operation, filters: structuredClone(filters) });
        const matches = (row) => filters.every(({ type, key, value }) => type === "eq" ? row[key] === value : type === "lte" ? String(row[key]) <= String(value) : true);
        if (operation === "delete") {
          state.rows = state.rows.filter((row) => !matches(row));
          return { data: null, error: null };
        }
        if (operation === "update") {
          const index = state.rows.findIndex(matches);
          if (index < 0) return { data: single ? null : [], error: null };
          state.rows[index] = { ...state.rows[index], ...structuredClone(payload) };
          return { data: structuredClone(single ? state.rows[index] : [state.rows[index]]), error: null };
        }
        if (operation === "upsert") {
          const index = state.rows.findIndex((row) => row.user_id === payload.user_id && row.category === payload.category && row.memory_key === payload.memory_key);
          const row = { id: index >= 0 ? state.rows[index].id : `memory-${++state.sequence}`, created_at: index >= 0 ? state.rows[index].created_at : new Date().toISOString(), ...structuredClone(payload) };
          if (index >= 0) state.rows[index] = row;
          else state.rows.push(row);
          return { data: structuredClone(single ? row : [row]), error: null };
        }
        const rows = state.rows.filter(matches).sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)));
        return { data: structuredClone(single ? rows[0] || null : rows), error: null };
      };
      const builder = {
        select() { return builder; },
        delete() { operation = "delete"; return builder; },
        update(value) { operation = "update"; payload = value; return builder; },
        upsert(value) { operation = "upsert"; payload = value; return builder; },
        eq(key, value) { filters.push({ type: "eq", key, value }); return builder; },
        lte(key, value) { filters.push({ type: "lte", key, value }); return builder; },
        order() { return builder; },
        limit() { return builder; },
        abortSignal() { return builder; },
        single() { single = true; return execute(); },
        then(resolve, reject) { return execute().then(resolve, reject); }
      };
      return builder;
    }
  };
}

test("Context Engine is demand-driven, route-scoped and redacts sensitive data", () => {
  let state = brainState();
  const engine = createBrainContextEngine({ repository: { snapshot: brainSnapshot }, getState: () => state });
  assert.equal(engine.diagnostics().builds, 0);
  const notes = engine.build({ intent: "resume" });
  assert.equal(notes.route, "notes");
  assert.equal(notes.context.notes[0].title, "Architecture");
  assert.equal(Object.hasOwn(notes.context.notes[0], "content"), false);
  assert.equal(Object.hasOwn(notes.profile, "accessToken"), false);
  assert.deepEqual(Object.keys(notes.profile).sort(), ["id", "name"]);
  assert.equal(Object.hasOwn(notes.context, "connections"), false);
  assert.equal(notes.sources.find((source) => source.id === "tasks").active, false);
  assert.deepEqual(engine.diagnostics(), { builds: 1, listeners: 0, observers: 0, timers: 0 });

  state = brainState({ route: "brain", brainPreferences: sanitizeBrainPreferences({ permissions: { connections: true, gaming: true } }) });
  const all = engine.build({ intent: "status" });
  assert.equal(all.context.connections[0].status, "connected");
  assert.equal(Object.hasOwn(all.context.connections[0], "token"), false);
  assert.equal(all.context.gaming.length, 1);
  assert.doesNotMatch(JSON.stringify(all), /must-not-leak|Private full note/);
});

test("Action Registry rejects arbitrary calls, validates input and confirms sensitive changes", async () => {
  const calls = [];
  const repository = {
    activeProfile: () => ({ id: "profile-a", environment: { widgets: ["today"] } }),
    updateProfile: async (id, value) => { calls.push(["profile", { id, ...value }]); return { ok: true, status: "completed", message: "updated" }; },
    snapshot: () => ({ tasks: [{ id: "task-a", title: "Ship", done: false }], activities: [{ title: "Push", source: "github", timestamp: "2026-07-14" }] }),
    notes: { create: async (value) => { calls.push(["note", value]); return { ok: true, status: "completed", message: "created" }; }, update: async (id, value) => { calls.push(["note-update", { id, ...value }]); return { ok: true, status: "completed", message: "updated" }; } },
    tasks: { create: async (value) => { calls.push(["task", value]); return { ok: true, data: value }; }, toggle: async (id) => { calls.push(["task-toggle", id]); return { ok: true, status: "completed" }; } },
    events: { create: async (value) => { calls.push(["event", value]); return { ok: true, data: value }; } }
  };
  const actions = { dispatch: (id, context) => { calls.push([id, context]); return { ok: true, status: "completed", message: id }; } };
  const preferences = sanitizeBrainPreferences({ permissions: { connections: false } });
  const registry = createBrainActionRegistry({ repository, actions, getPreferences: () => preferences });
  assert.equal(registry.review("window.eval", {}).status, "unavailable");
  assert.equal(registry.review("page.open", { route: "javascript:alert(1)" }).status, "invalid");
  assert.equal(registry.review("diagnostic.run", {}).status, "permission-denied");
  assert.equal(registry.review("space.change", { space: "focus" }).status, "confirmation-required");
  assert.equal((await registry.execute("space.change", { space: "focus" })).status, "confirmation-required");
  assert.equal((await registry.execute("space.change", { space: "focus" }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("flow.change", { flow: "Deep Work" }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("density.change", { density: "compact" })).status, "confirmation-required");
  assert.equal((await registry.execute("setting.change", { setting: "language", value: "en" }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("note.create", { title: "  Plan  ", content: "Next" })).ok, true);
  assert.equal((await registry.execute("note.update", { id: "note-a", title: "Plan final" }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("task.complete", { id: "task-a" }, { confirmed: true })).ok, true);
  assert.equal(registry.review("widget.add", { widget: "unknown" }).status, "invalid");
  assert.equal((await registry.execute("widget.add", { widget: "brain" }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("dashboard.organize", { widgets: ["notes", "tasks", "notes", "invalid"] }, { confirmed: true })).ok, true);
  assert.equal((await registry.execute("planning.prepare", { tasks: [{ title: "Ship", priority: "high" }], events: [{ title: "Review", date: "2026-07-15" }] }, { confirmed: true })).ok, true);
  assert.equal(calls.some(([id]) => id === "v8.space.focus"), true);
  assert.deepEqual(calls.find(([id]) => id === "profile" && id)?.[1]?.widgets || [], ["today", "brain"]);
  assert.equal(calls.some(([id]) => id === "task"), true);
  assert.equal(calls.some(([id]) => id === "task-toggle"), true);
  assert.equal(calls.some(([id]) => id === "event"), true);
  assert.equal(registry.diagnostics().arbitraryExecution, false);
});

test("Brain memory is Supabase-only, category-controlled, deduplicated and removable", async () => {
  const ownerId = "00000000-0000-4000-8000-000000000111";
  const client = fakeBrainSupabase();
  let preferences = sanitizeBrainPreferences({ memory: { enabled: true, categories: { goals: false } } });
  const memory = createBrainMemoryRepository({ client, ownerId, timeoutMs: 1000, getPreferences: () => preferences });
  assert.equal((await memory.create({ category: "goals", key: "target", value: "Launch" })).status, "permission-denied");
  assert.equal((await memory.create({ category: "interface", key: "api key", value: "hidden" })).status, "sensitive");
  const first = await memory.create({ category: "interface", key: "density", value: "compact", retentionDays: 30 });
  assert.equal(first.ok, true);
  const second = await memory.create({ category: "interface", key: "density", value: "comfortable", retentionDays: 90 });
  assert.equal(second.ok, true);
  assert.equal(client.state.rows.length, 1);
  assert.equal((await memory.list()).data[0].value, "comfortable");
  assert.equal((await memory.update(first.data.id, { value: "spacious" })).data.value, "spacious");
  assert.equal((await memory.clear()).status, "confirmation-required");
  assert.equal((await memory.exportAll()).data.memories.length, 1);
  assert.equal((await memory.remove(first.data.id)).ok, true);
  assert.equal((await memory.list()).data.length, 0);
  preferences = sanitizeBrainPreferences({ memory: { enabled: false } });
  assert.equal((await memory.create({ category: "interface", key: "density", value: "compact" })).status, "disabled");
  assert.equal(memory.diagnostics().localPersistence, false);
  memory.destroy();
});

test("Brain memory converts client initialization failures into a controlled result", async () => {
  const memory = createBrainMemoryRepository({ ownerId: "owner-a", clientProvider: async () => { throw new Error("network down"); }, timeoutMs: 1000 });
  const response = await memory.list();
  assert.equal(response.ok, false);
  assert.equal(response.status, "failed");
  assert.match(response.message, /network down/);
  assert.equal(memory.diagnostics().activeRequests, 0);
});

test("Provider Manager never accepts frontend secrets and aborts replaced requests", async () => {
  const offline = createBrainProviderManager({ getPreferences: () => ({ provider: { active: "openai", model: "server-model" } }) });
  assert.equal((await offline.complete({ messages: [] })).status, "unavailable");
  assert.equal((await offline.testConnection("context")).status, "ready");
  assert.equal((await offline.testConnection("openai")).status, "unavailable");
  assert.equal(offline.providers().find((provider) => provider.id === "openai").status, "backend-required");
  assert.equal(offline.diagnostics().frontendSecretsAccepted, false);

  const manager = createBrainProviderManager({
    getPreferences: () => ({ provider: { active: "anthropic", model: "server-model" } }),
    transport: ({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason || new Error("aborted")), { once: true });
    })
  });
  const pending = manager.complete({ messages: [], timeoutMs: 5000 });
  manager.cancelActive();
  const aborted = await pending;
  assert.equal(aborted.status, "aborted");
  assert.equal(manager.diagnostics().activeRequests, 0);
  assert.equal(manager.diagnostics().retries, 0);
});

test("Brain Controller uses contextual local answers and bounds session history", async () => {
  const state = brainState({ route: "brain" });
  const contextEngine = createBrainContextEngine({ repository: { snapshot: brainSnapshot }, getState: () => state });
  const providerManager = createBrainProviderManager({ getPreferences: () => state.brainPreferences });
  const actionRegistry = { execute: async () => ({ ok: true }), review: () => ({ ok: true }) };
  const controller = createBrainController({ contextEngine, providerManager, actionRegistry, getPreferences: () => state.brainPreferences });
  const answer = await controller.ask("Quelle est ma priorite ?");
  assert.equal(answer.ok, true);
  assert.match(answer.data.entry.content, /Finaliser ETHONE/);
  for (let index = 0; index < 35; index += 1) await controller.ask(`Question ${index}`);
  assert.equal(controller.history().length, 60);
  assert.equal(controller.diagnostics().pendingRequests, 0);
  controller.destroy();
  assert.equal(controller.diagnostics().listeners, 0);
});

test("Brain remains lazy, exposes all control surfaces and has fail-closed RLS", () => {
  const app = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("../v8/pages/brain.mjs", import.meta.url), "utf8");
  const settings = fs.readFileSync(new URL("../v8/pages/settings.mjs", import.meta.url), "utf8");
  const migration = fs.readFileSync(new URL("../supabase/migrations/202607140003_brain_memory_rls.sql", import.meta.url), "utf8");
  assert.doesNotMatch(app, /^import .*pages\/brain\.mjs/m);
  assert.doesNotMatch(app, /^import .*brain\/runtime\.mjs/m);
  assert.match(app, /import\("\.\.\/brain\/runtime\.mjs"\)/);
  assert.match(app, /import\("\.\.\/pages\/brain\.mjs"\)/);
  for (const tab of ["Chat", "Contexte", "Memoire", "Actions", "Automations", "Providers", "Confidentialité", "Historique", "Diagnostics"]) assert.match(page, new RegExp(`label: "${tab}"`));
  for (const preference of ["suggestionFrequency", "automationLevel", "language", "provider.fallback", "provider.privacy", "memory.categories"]) assert.match(settings, new RegExp(preference.replace(".", "\\.")));
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /auth\.uid\(\).*user_id/i);
  assert.match(migration, /revoke all[^;]+from anon/i);
  assert.match(migration, /no_secret_values/i);
  assert.match(migration, /unique index[^;]+user_id, category, memory_key/is);
});

test("Brain chat submission supports Enter, OK, Go and Done keys and focuses input after success", () => {
  const page = fs.readFileSync(new URL("../v8/pages/brain.mjs", import.meta.url), "utf8");
  assert.match(page, /async function submitBrainQuery\(event\)/);
  assert.match(page, /let submitting = false;/);
  assert.match(page, /if \(!query \|\| submitting\) return;/);
  assert.match(page, /event\.key === "Enter" \|\| event\.key === "OK" \|\| event\.key === "Go" \|\| event\.key === "Done" \|\| event\.keyCode === 13/);
  assert.match(page, /chatInput\.focus\(\)/);
  assert.match(page, /chatForm\.addEventListener\("submit", submitBrainQuery/);
  assert.match(page, /sendButton\.addEventListener\("click", submitBrainQuery/);
});


