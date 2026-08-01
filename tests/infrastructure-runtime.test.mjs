import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createAuthAdapter } from "../v8/services/auth-adapter.mjs";
import { createNetworkClient } from "../v8/services/network-client.mjs";
import { PROFILE_STORAGE_KEY, PROFILE_OWNER_KEY, SCOPED_PROFILE_PREFIX, createProfileRepository } from "../v8/data/profile-repository.mjs";
import { V8_ROUTES, createRouter, normalizeRoute } from "../v8/core/router.mjs";
import { createActionFacade } from "../v8/core/actions.mjs";
import { createPresentationStore, LIVE_CARD_IDS, sanitizeActivityLiveLayout } from "../v8/core/store.mjs";
import { COMMANDS } from "../v8/command/catalog.mjs";
import { searchCommands } from "../v8/command/search.mjs";
import { INTEGRATIONS } from "../v8/data/integrations.mjs";
import { createActivityJournal } from "../v8/data/activity-journal.mjs";
import { DOCUMENT_CONTEXT_LABELS, formatDocumentTitle, themeColorForState, titleForContext } from "../v8/core/document-metadata.mjs";
import { createBreadcrumbModel, createStatusModel } from "../v8/ui/shell.mjs";
import { createWindowController } from "../v8/ui/window-system.mjs";
import { createStyleLoader } from "../v8/core/style-loader.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null
  };
}

test("network client deduplicates GET requests and redacts diagnostics", async () => {
  let calls = 0;
  const runtime = {
    location: { href: "https://ethone.dev/", origin: "https://ethone.dev" },
    navigator: { onLine: true },
    setTimeout,
    clearTimeout,
    fetch: async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return new Response("{}", { status: 200 });
    }
  };
  const network = createNetworkClient({ runtime });
  await Promise.all([
    network.request("https://api.example.test/data?token=private"),
    network.request("https://api.example.test/data?token=private")
  ]);
  assert.equal(calls, 1);
  assert.equal(network.diagnostics().recent.length, 1);
  assert.match(network.diagnostics().recent[0].url, /%5Bredacted%5D/);
  assert.doesNotMatch(JSON.stringify(network.diagnostics()), /private/);
});

test("auth adapter owns one client and validates restored sessions", async () => {
  const user = { id: "user-a", email: "user@example.test" };
  const session = { user, access_token: "must-not-leak" };
  let factoryCalls = 0;
  let authListener = null;
  let unsubscribeCalls = 0;
  let channelCleanup = 0;
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (listener) => {
        authListener = listener;
        return { data: { subscription: { unsubscribe: () => { unsubscribeCalls += 1; } } } };
      }
    },
    removeAllChannels: () => { channelCleanup += 1; }
  };
  const adapter = createAuthAdapter({ clientFactory: async () => { factoryCalls += 1; return client; } });
  const states = [];
  const release = adapter.subscribeState((state) => states.push(state.status));
  await Promise.all([adapter.initialize(), adapter.initialize()]);
  const restored = await adapter.getSession();
  assert.equal(factoryCalls, 1);
  assert.equal(restored.ok, true);
  assert.equal(restored.data.session.user.id, "user-a");
  assert.doesNotMatch(JSON.stringify(restored), /access_token|must-not-leak/);
  authListener("TOKEN_REFRESHED", session);
  assert.equal(adapter.status().status, "authenticated");
  await adapter.signOut();
  assert.equal(channelCleanup, 1);
  assert.equal(adapter.status().status, "unauthenticated");
  release();
  adapter.destroy();
  assert.equal(unsubscribeCalls, 1);
  assert.ok(states.includes("refreshing"));
});

test("Supabase bootstrap closes the deferred-script race and stays time bounded", () => {
  const source = fs.readFileSync(new URL("../v8/main.mjs", import.meta.url), "utf8");
  assert.match(source, /script\.addEventListener\("load",\s*handleLoad/);
  assert.match(source, /if \(globalThis\.supabase\?\.createClient\) finish\(\)/);
  assert.match(source, /Le chargement du client Supabase a expir/);
  assert.match(source, /script\.removeEventListener\("load",\s*handleLoad\)/);
});

test("profile repository isolates owners and strips persisted secrets", () => {
  const legacyProfiles = [{
    id: "profile-a",
    name: "Personnel",
    apiKey: "secret-api-key",
    state: { notes: [], todos: [], events: [], items: [], connections: { github: { token: "secret-token" } } }
  }];
  const storage = memoryStorage({
    [PROFILE_STORAGE_KEY]: JSON.stringify(legacyProfiles),
    [PROFILE_OWNER_KEY]: "user-a"
  });
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "user-a" });
  assert.equal(repository.listProfiles().length, 1);
  repository.notes.create({ title: "Audit", content: "Preserved" });
  const userAData = storage.read(`${SCOPED_PROFILE_PREFIX}user-a`);
  assert.match(userAData, /Audit|Preserved/);
  assert.doesNotMatch(userAData, /secret-api-key|secret-token|apiKey|token/);

  repository.setOwner("user-b");
  assert.equal(repository.listProfiles().length, 0);
  repository.createProfile({ name: "Travail", type: "work" });
  assert.equal(repository.listProfiles().length, 1);
  assert.equal(repository.listProfiles()[0].name, "Travail");

  repository.setOwner("user-a");
  assert.equal(repository.listProfiles()[0].name, "Personnel");
  assert.equal(repository.snapshot().notes[0].title, "Audit");
});

test("profile environments persist allowlisted modules and expose isolated snapshots", () => {
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "environment-user", idFactory: (() => { let id = 0; return () => `environment-${++id}`; })() });
  const first = repository.createProfile({
    name: "Focus",
    type: "development",
    widgets: ["brain", "github", "invalid-widget"],
    integrations: ["spotify", "invalid-service"],
    ambience: "focus",
    background: "horizon"
  });
  repository.notes.create({ title: "Private focus note" });
  const second = repository.createProfile({ name: "Gaming", type: "gaming", widgets: ["discord"] });
  repository.selectProfile(second.data.id);

  const firstView = repository.listProfiles().find((profile) => profile.id === first.data.id);
  assert.deepEqual(firstView.environment.widgets, ["brain", "github"]);
  assert.deepEqual(firstView.environment.integrations, ["spotify"]);
  assert.equal(firstView.environment.ambience, "focus");
  assert.equal(firstView.environment.background, "horizon");
  assert.equal(repository.snapshot(first.data.id).notes[0].title, "Private focus note");
  assert.equal(repository.snapshot(second.data.id).notes.length, 0);
  assert.doesNotMatch(storage.read(`${SCOPED_PROFILE_PREFIX}environment-user`), /invalid-widget|invalid-service/);
});

test("V8-only routes keep Activity, Spaces and Flows inside the current runtime", () => {
  assert.ok(V8_ROUTES.includes("activity"));
  assert.ok(V8_ROUTES.includes("connections"));
  assert.ok(V8_ROUTES.includes("spaces"));
  assert.ok(V8_ROUTES.includes("flows"));
  assert.equal(normalizeRoute("dashboard"), "home");

  const visited = [];
  const actions = createActionFacade({ navigate: (route) => visited.push(route) });
  assert.equal(actions.dispatch("v8.activity.open").ok, true);
  assert.equal(actions.dispatch("v8.connections.open").ok, true);
  assert.equal(actions.dispatch("v8.spaces.open").ok, true);
  assert.equal(actions.dispatch("v8.flows.open").ok, true);
  assert.deepEqual(visited, ["activity", "connections", "spaces", "flows"]);
});

test("desktop navigation keeps the active route inside its dedicated scroll viewport", () => {
  const shell = fs.readFileSync(new URL("../v8/ui/shell.mjs", import.meta.url), "utf8");
  assert.match(shell, /querySelector\("\.v8-rail__apps"\)/);
  assert.match(shell, /querySelector\('\[aria-current="page"\]'\)/);
  assert.match(shell, /viewport\.scrollTop \+= activeBounds\.(?:top|bottom) - bounds\.(?:top|bottom)/);
  assert.doesNotMatch(shell, /scrollIntoView/);
});

test("router canonicalizes hostile hashes and handles direct fragment changes", () => {
  const listeners = new Map();
  const routes = [];
  const runtime = {
    location: { hash: "#/../../evil?token=%3Cscript%3E" },
    history: {
      replaceState: (_state, _title, url) => { runtime.location.hash = url; },
      pushState: (_state, _title, url) => { runtime.location.hash = url; }
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    }
  };
  const router = createRouter({ runtime, onRoute: (route) => routes.push(route) });

  router.start();
  assert.equal(runtime.location.hash, "#/home");
  assert.equal(listeners.has("hashchange"), true);

  runtime.location.hash = "#/notes?redirect=javascript:alert(1)";
  listeners.get("hashchange")();
  assert.equal(runtime.location.hash, "#/notes");
  assert.deepEqual(routes, ["home", "notes"]);

  router.stop();
  assert.equal(listeners.has("hashchange"), false);
  assert.equal(listeners.has("popstate"), false);
});

test("global command entries resolve through the central action registry", () => {
  const actions = createActionFacade();
  const missing = COMMANDS.filter((command) => !actions.has(command.actionId));
  assert.deepEqual(missing, []);
});

test("presentation state suppresses no-op renders and keeps one system surface active", () => {
  const storage = memoryStorage();
  const store = createPresentationStore({}, { storage });
  let notifications = 0;
  store.subscribe(() => { notifications += 1; });
  store.setState({ theme: "night" });
  assert.equal(notifications, 0);
  store.setState({ panel: "widgets" });
  store.setState({ missionOpen: true });
  assert.equal(store.getState().panel, null);
  assert.equal(store.getState().missionOpen, true);
  store.setState({ commandOpen: true, panel: "profile", missionOpen: true });
  assert.equal(store.getState().commandOpen, true);
  assert.equal(store.getState().missionOpen, false);
  assert.equal(store.getState().panel, null);
});

test("a legacy persisted Live Now layout is backfilled with newly added live cards", () => {
  const legacy = Object.freeze({ order: Object.freeze(["system", "spotify", "discord", "weather", "minecraft", "steam"]), hidden: Object.freeze([]) });
  const sanitized = sanitizeActivityLiveLayout(legacy);
  assert.deepEqual([...sanitized.order].sort(), [...LIVE_CARD_IDS].sort());
  assert.ok(sanitized.order.includes("github"));

  const storage = memoryStorage();
  const store = createPresentationStore({ activityLiveLayout: legacy }, { storage });
  assert.ok(store.getState().activityLiveLayout.order.includes("github"));
});

test("command search includes contextual user content without replacing system commands", () => {
  const note = Object.freeze({
    id: "content.note.1",
    actionId: "v8.notes.open",
    label: "Plan Product Hunt",
    subtitle: "Checklist de lancement",
    category: "Note",
    icon: "notebook-pen",
    keywords: Object.freeze(["product hunt", "lancement"]),
    contexts: Object.freeze(["notes"]),
    contextPriority: 88
  });
  const results = searchCommands("product hunt", { route: "home", additionalCommands: [note] }, 10);
  assert.equal(results[0]?.id, note.id);
  assert.ok(searchCommands("settings", {}, 10).some((command) => command.actionId === "v8.settings.open"));
});

test("integration registry is unique and exposes no credential fields", () => {
  assert.ok(INTEGRATIONS.length >= 30);
  assert.equal(new Set(INTEGRATIONS.map((integration) => integration.id)).size, INTEGRATIONS.length);
  assert.ok(INTEGRATIONS.some((integration) => integration.id === "spotify"));
  assert.ok(INTEGRATIONS.some((integration) => integration.id === "github"));
  assert.doesNotMatch(JSON.stringify(INTEGRATIONS), /messages-circle|badge-e/);
  assert.doesNotMatch(JSON.stringify(INTEGRATIONS), /token|secret|password|apiKey/i);
});

test("activity journal and connection metadata remain profile-scoped and secret-free", () => {
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "activity-user" });
  repository.createProfile({ name: "Activity QA", type: "development" });
  const configured = repository.connections.configure("spotify", { token: "must-not-persist", apiVersion: "OAuth 2.0" });
  assert.equal(configured.ok, true);
  repository.activities.record({ source: "ethone", category: "system", title: "Boot", description: "Ready" });
  const journal = createActivityJournal(repository, { now: () => new Date("2026-07-13T08:00:00.000Z") });
  const captured = journal.capture("v8.space.focus", { ok: true });
  assert.equal(captured.ok, true);
  const snapshot = repository.snapshot();
  assert.equal(snapshot.connections[0].id, "spotify");
  assert.equal(snapshot.connections[0].setupComplete, true);
  assert.ok(snapshot.activities.length >= 2);
  assert.ok(journal.entries().length >= snapshot.activities.length);
  assert.doesNotMatch(storage.read(`${SCOPED_PROFILE_PREFIX}activity-user`), /must-not-persist|token/i);
  journal.destroy();
});

test("document metadata uses one version-free ETHONE title system", () => {
  assert.equal(formatDocumentTitle(), "ETHONE");
  assert.equal(titleForContext("home"), "ETHONE \u2014 Dashboard");
  assert.equal(titleForContext("brain"), "ETHONE \u2014 Brain");
  assert.equal(titleForContext("settings"), "ETHONE \u2014 Settings");
  assert.equal(titleForContext("profiles"), "ETHONE \u2014 Profile Selection");
  assert.ok(["login", "profiles", "onboarding", "home", "brain", "marketplace", "activity", "settings"].every((key) => Boolean(DOCUMENT_CONTEXT_LABELS[key])));
  assert.doesNotMatch(Object.values(DOCUMENT_CONTEXT_LABELS).join(" "), /V\d|Dashboard V8/);
  assert.equal(themeColorForState({ theme: "graphite", space: "personal" }), "#111317");
  assert.equal(themeColorForState({ theme: "night", space: "personal" }), "#080a0d");
  assert.equal(themeColorForState({ theme: "night", space: "focus" }), "#070b10");
  assert.equal(themeColorForState({ theme: "graphite", space: "studio" }), "#0d090d");
  assert.equal(themeColorForState({ theme: "day", space: "personal" }), "#f4f5f7");
  assert.equal(themeColorForState({ theme: "day", space: "focus" }), "#f4f5f7");
  assert.equal(themeColorForState({ theme: "auto", space: "personal" }, { systemPrefersLight: true }), "#f4f5f7");
  assert.equal(themeColorForState({ theme: "auto", space: "personal" }, { systemPrefersLight: false }), "#080a0d");
});

test("premium breadcrumbs expose actionable route and context levels", () => {
  const model = createBreadcrumbModel({ route: "brain", space: "focus", flow: "Deep Work", panel: "notifications", syncStatus: "online", workspace: "Rub" });
  assert.deepEqual(model.crumbs.map((crumb) => crumb.id), ["root", "workspace", "space", "route", "panel"]);
  assert.equal(model.crumbs.at(-1).current, true);
  assert.equal(model.crumbs.find((crumb) => crumb.id === "root").actionId, "v8.home.open");
  assert.equal(model.crumbs.find((crumb) => crumb.id === "workspace").actionId, "v8.spaces.open");
  assert.equal(model.crumbs.find((crumb) => crumb.id === "route").actionId, "v8.brain.open");
  assert.deepEqual(model.context, { workspace: "Rub", space: "Focus", flow: "Deep Work", sync: "Synchronise avec Supabase", syncTone: "online" });
});

test("global status model reports only factual network, cloud, save, session and clock state", () => {
  const online = createStatusModel({
    networkStatus: "online",
    syncStatus: "saved",
    saveStatus: "saved",
    sessionStatus: "authenticated",
    localTime: "14:37",
    timeZone: "Europe/Paris",
    version: "8.0"
  });
  assert.equal(online.network.label, "En ligne");
  assert.equal(online.network.icon, "wifi");
  assert.equal(online.sync.icon, "cloud");
  assert.equal(online.sync.label, "Synchronise avec Supabase");
  assert.equal(online.save.label, "Enregistre");
  assert.equal(online.session.label, "Session chiffree");
  assert.equal(online.clock.label, "14:37");
  assert.equal(online.clock.timeZone, "Europe/Paris");
  assert.equal(online.version.label, "ETHONE 8.0");

  const offline = createStatusModel({ networkStatus: "offline", syncStatus: "offline", saveStatus: "pending", sessionStatus: "expired" });
  assert.equal(offline.network.label, "Hors ligne");
  assert.equal(offline.network.icon, "wifi-off");
  assert.equal(offline.sync.label, "Hors ligne - changements en attente");
  assert.equal(offline.sync.tone, "warning");
  assert.equal(offline.save.label, "Changements en attente");
  assert.equal(offline.session.label, "Session expiree");
});

test("premium detail primitives expose coherent micro states", () => {
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const toast = fs.readFileSync(new URL("../v8/ui/toast.mjs", import.meta.url), "utf8");
  assert.match(components, /\.v8-icon-button\s*\{[\s\S]*?border-color:\s*var\(--v8-border\)/);
  assert.match(components, /\.v8-toast\.is-timed::after/);
  assert.match(components, /\.v8-button--primary\.is-loading::after/);
  assert.match(shell, /\.v8-context-menu__divider\s*\{[\s\S]*?linear-gradient/);
  assert.match(shell, /\.v8-mission-body\s*\{[\s\S]*?background:\s*var\(--v8-canvas-raised\)/);
  assert.match(toast, /--v8-toast-duration/);
});

test("window controller coordinates focus, modal keyboard flow and animated teardown", () => {
  const timers = [];
  const classes = () => {
    const values = new Set();
    return {
      add: (...names) => names.forEach((name) => values.add(name)),
      remove: (...names) => names.forEach((name) => values.delete(name)),
      contains: (name) => values.has(name)
    };
  };
  const documentRef = { activeElement: null, documentElement: { dataset: {} } };
  const focusable = (name) => {
    const node = {
      name,
      hidden: false,
      disabled: false,
      inert: false,
      isConnected: true,
      getAttribute: () => null,
      focus: () => { documentRef.activeElement = node; }
    };
    return node;
  };
  const focusableNodes = { first: null, last: null };
  focusableNodes.first = focusable("first");
  focusableNodes.last = focusable("last");
  const origin = focusable("origin");
  documentRef.activeElement = origin;
  const surface = { classList: classes() };
  const attributes = new Map();
  const layer = {
    classList: classes(),
    dataset: {},
    inert: false,
    isConnected: true,
    removed: false,
    querySelector: () => surface,
    querySelectorAll: () => [focusableNodes.first, focusableNodes.last],
    getBoundingClientRect: () => ({ width: 640 }),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    remove: () => { layer.removed = true; layer.isConnected = false; }
  };
  let escapeCalls = 0;
  let registered = null;
  const layerManager = {
    register(config) {
      registered = config;
      const returnFocus = documentRef.activeElement;
      return {
        release(releaseConfig = {}) {
          if (releaseConfig.restoreFocus !== false) returnFocus?.focus?.();
        }
      };
    }
  };
  const controller = createWindowController({
    document: documentRef,
    layerManager,
    runtime: {
      queueMicrotask: (callback) => callback(),
      setTimeout: (callback) => { timers.push(callback); return timers.length; },
      clearTimeout: () => {}
    },
    onEscape: () => { escapeCalls += 1; }
  });

  assert.equal(controller.open(layer, { initialFocus: focusableNodes.first, modal: true }), true);
  assert.equal(layer.classList.contains("v8-window-layer"), true);
  assert.equal(surface.classList.contains("v8-window-surface"), true);
  assert.equal(layer.classList.contains("is-open"), true);
  assert.equal(documentRef.activeElement, focusableNodes.first);
  assert.equal(registered.modal, true);
  assert.equal(registered.trapFocus, true);
  assert.equal(registered.closeOnOutside, true);
  registered.onDismiss("escape");
  assert.equal(escapeCalls, 1);

  assert.equal(controller.close(), true);
  assert.equal(layer.inert, true);
  assert.equal(attributes.get("aria-hidden"), "true");
  assert.equal(layer.classList.contains("is-open"), false);
  assert.equal(layer.dataset.windowState, "closing");
  assert.equal(documentRef.activeElement, origin);
  timers.at(-1)();
  assert.equal(layer.removed, true);
});

test("window controller can retain a reusable dialog layer after its exit transition", () => {
  const timers = [];
  const values = new Set();
  const layer = {
    classList: { add: (...names) => names.forEach((name) => values.add(name)), remove: (...names) => names.forEach((name) => values.delete(name)) },
    dataset: {},
    hidden: false,
    removed: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => ({ classList: { add: () => {} } }),
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ width: 480 }),
    setAttribute: () => {},
    removeAttribute: () => {},
    remove: () => { layer.removed = true; }
  };
  const controller = createWindowController({
    document: { activeElement: null, documentElement: { dataset: {} } },
    runtime: { queueMicrotask: (callback) => callback(), setTimeout: (callback) => { timers.push(callback); return timers.length; }, clearTimeout: () => {} }
  });
  controller.open(layer, { retain: true });
  controller.close({ restoreFocus: false });
  timers.at(-1)();
  assert.equal(layer.removed, false);
  assert.equal(layer.hidden, true);
});

test("lazy application styles carry the release cache key", async () => {
  const links = [];
  const documentRef = {
    querySelector: (selector) => links.find((link) => selector.includes(`\"${link.dataset.v8Style}\"`)) || null,
    createElement: () => {
      const listeners = new Map();
      return {
        dataset: {},
        addEventListener: (type, listener) => listeners.set(type, listener),
        dispatch: (type) => listeners.get(type)?.()
      };
    },
    head: { append: (link) => { links.push(link); link.dispatch("load"); } }
  };
  const loader = createStyleLoader({ document: documentRef, baseUrl: "/v8/styles", release: "window-system-v8" });
  const loaded = await loader.loadApplication();
  assert.equal(loaded.ok, true);
  assert.deepEqual(links.map((link) => link.href), [
    "/v8/styles/shell.css?v=window-system-v8",
    "/v8/styles/workspaces.css?v=window-system-v8"
  ]);
});

test("surface replacement never restores focus behind the next window", () => {
  const runtime = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  assert.match(runtime, /missionControl\.close\(\{\s*restoreFocus:\s*!next\.commandOpen\s*&&\s*!next\.panel\s*\}\)/);
});

test("global interaction system owns hover, press and reduced motion feedback", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");

  assert.match(html, /<html[^>]+data-v8-interactions/);
  assert.match(tokens, /--v8-interaction-hover-transform:\s*translate3d\(0,\s*-1px,\s*0\)\s*scale\(1\.006\)/);
  assert.match(tokens, /--v8-haptic-press-transform:\s*translate3d\(0,\s*1px,\s*0\)\s*scale\(\.976\)/);
  assert.match(tokens, /--v8-interaction-press-transform:\s*var\(--v8-haptic-press-transform\)/);
  assert.match(tokens, /--v8-interaction-shadow:/);
  assert.match(tokens, /--v8-interaction-filter:/);
  assert.match(components, /@media \(hover:\s*hover\) and \(pointer:\s*fine\)/);
  assert.match(components, /html\[data-v8-interactions\][\s\S]*:hover[\s\S]*transform:\s*var\(--v8-interaction-hover-transform\)/);
  assert.match(components, /html\[data-v8-interactions\][\s\S]*:hover[\s\S]*filter:\s*var\(--v8-interaction-filter\)/);
  assert.match(components, /html\[data-v8-interactions\][\s\S]*:active[\s\S]*transform:\s*var\(--v8-interaction-press-transform\)/);
  assert.match(tokens, /prefers-reduced-motion:\s*reduce[\s\S]*--v8-interaction-hover-transform:\s*none/);
});

test("interaction feedback preserves semantic states and versions every stylesheet", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const activityLoader = fs.readFileSync(new URL("../v8/pages/activity-style.mjs", import.meta.url), "utf8");
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const localStyles = ["activity.css", "entry.css", "shell.css", "workspaces.css"].map((name) => fs.readFileSync(new URL(`../v8/styles/${name}`, import.meta.url), "utf8"));

  for (const name of ["tokens", "base", "components", "entry", "presence"]) {
    assert.match(html, new RegExp(`v8/styles/${name}\\.css\\?v=experience-v185`));
    assert.match(worker, new RegExp(`v8/styles/${name}\\.css\\?v=experience-v185`));
  }
  assert.match(worker, /v8\/styles\/activity\.css\?v=experience-v185/);
  for (const module of ["layer-manager", "dense-content", "dock"]) {
    assert.match(worker, new RegExp(`v8/ui/${module}\\.mjs`));
  }
  assert.match(worker, /v8\/core\/presence-engine\.mjs/);
  assert.match(activityLoader, /STYLE_RELEASE/);
  assert.match(activityLoader, /activity\.css\?v=\$\{encodeURIComponent\(STYLE_RELEASE\)\}/);
  assert.match(tokens, /--v8-interaction-shadow:\s*var\(--v8-shadow-hover-filter\)/);
  assert.match(tokens, /--v8-interaction-filter:[^;]*var\(--v8-interaction-shadow\)/);
  assert.doesNotMatch(components, /:hover[^\{]*\{[^\}]*box-shadow:/);
  assert.match(components, /html\[data-v8-interactions\][\s\S]*:focus-visible[\s\S]*box-shadow:\s*var\(--v8-shadow-focus\)/);

  const allowedHover = /html\[data-v8-interactions\]|scrollbar-thumb|v8-input:hover|v8-entry__locale:hover|autofill:hover|data-tooltip|v8-profile-card:hover \.v8-profile-card__menu|v8-command-row:hover \.v8-command-pin|v8-task-row:hover \.v8-task-delete|v8-dock/;
  for (const source of [components, ...localStyles]) {
    const selectors = [...source.matchAll(/(?:^|\})\s*([^\{]*:hover[^\{]*)\{/gm)]
      .map((match) => match[1].trim())
      .filter((selector) => !selector.startsWith("@"));
    assert.deepEqual(selectors.filter((selector) => !allowedHover.test(selector)), []);
  }
});

test("production validation follows the active release without a stale hardcoded version", () => {
  const validator = fs.readFileSync(new URL("../scripts/validate-production.mjs", import.meta.url), "utf8");
  const deploymentVerifier = fs.readFileSync(new URL("../scripts/verify-deployment.mjs", import.meta.url), "utf8");
  const worker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const release = worker.match(/const ETHONE_VERSION = "([^"]+)"/)?.[1] || "";
  const releaseToken = release.match(/experience-v\d+$/)?.[0] || "";

  assert.match(release, /^\d{4}-\d{2}-\d{2}-experience-v\d+$/);
  assert.ok(releaseToken);
  assert.match(validator, /serviceWorkerReleaseToken/);
  assert.match(validator, /index\.includes\(serviceWorkerReleaseToken\)/);
  assert.match(validator, /notFound\.includes\(serviceWorkerReleaseToken\)/);
  assert.doesNotMatch(validator, /assert\(\/experience-v\d+\//);
  assert.match(deploymentVerifier, /readFileSync\(new URL\("\.\.\/sw\.js", import\.meta\.url\)/);
  assert.match(deploymentVerifier, /expectedWorkerVersion/);
  assert.doesNotMatch(deploymentVerifier, /worker\.includes\("\d{4}-\d{2}-\d{2}-experience-v\d+"\)/);
});

test("empty states share one accessible and responsive product primitive", () => {
  const component = fs.readFileSync(new URL("../v8/ui/empty-state.mjs", import.meta.url), "utf8");
  const styles = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");

  assert.match(component, /export function emptyState/);
  assert.match(component, /export function statusState/);
  assert.match(component, /export function skeletonState/);
  for (const kind of ["loading", "error", "offline", "denied", "expired", "integration", "coming-soon", "syncing", "no-results"]) assert.match(component, new RegExp(`(?:"${kind}"|${kind}):`));
  assert.match(component, /v8-empty-state__visual/);
  assert.match(component, /v8-empty-state__actions/);
  assert.match(component, /v8-empty-state__brain/);
  assert.match(component, /"aria-live":\s*"polite"/);
  assert.match(component, /role:\s*"status"/);
  assert.match(styles, /\.v8-empty-state--compact/);
  assert.match(styles, /\.v8-empty-state--inline/);
  assert.match(styles, /\.v8-empty-state__brain/);
  assert.match(styles, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*v8-empty-state/);
});

test("all product empty views use the shared primitive with a useful action", () => {
  const files = [
    "command/command-center.mjs",
    "entry/profile-selection.mjs",
    "pages/activity.mjs",
    "pages/calendar.mjs",
    "pages/connections.mjs",
    "pages/files.mjs",
    "pages/home.mjs",
    "pages/notes.mjs",
    "pages/tasks.mjs"
  ];
  const sources = files.map((name) => fs.readFileSync(new URL(`../v8/${name}`, import.meta.url), "utf8"));
  const legacyEmptyHooks = /v8-command-empty|v8-live-empty|v8-connections-empty|v8-daystream__empty|v8-inline-empty|v8-list-empty|v8-editor-empty|v8-task-empty|v8-files-empty|v8-files-preview__empty|v8-calendar-agenda__empty/;

  for (const source of sources) {
    assert.match(source, /import \{[^}]*emptyState[^}]*\} from "\.\.\/ui\/empty-state\.mjs";/);
    assert.match(source, /emptyState\(\{/);
    assert.doesNotMatch(source, legacyEmptyHooks);
  }
  assert.match(sources.join("\n"), /brain:\s*\{/);
  assert.match(sources.join("\n"), /actions:\s*\[/);
});

test("service worker precaches every V8 runtime module and bypasses stale HTTP cache on misses", () => {
  const worker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const modules = [];
  const walk = (directory, prefix) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(new URL(`${entry.name}/`, directory), relative);
      else if (/\.(?:mjs|js)$/u.test(entry.name)) modules.push(relative);
    }
  };
  walk(new URL("../v8/", import.meta.url), "v8");

  for (const module of modules) {
    assert.ok(worker.includes(`"./${module}"`), `${module} is missing from the offline release`);
  }
  assert.match(worker, /async function cacheFirst[\s\S]*fetch\(new Request\(request,\s*\{\s*cache:\s*"no-store"\s*\}\)\)/);
});
