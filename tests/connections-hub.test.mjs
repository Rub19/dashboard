import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  INTEGRATIONS,
  connectionMethod,
  connectionMethods,
  officialResources,
  setupGuide
} from "../v8/data/integrations.mjs";
import { SCOPED_PROFILE_PREFIX, createProfileRepository } from "../v8/data/profile-repository.mjs";
import {
  connectionMetrics,
  detectConnectionOpportunities,
  filterConnectionCatalog,
  methodAvailability,
  runConnectionDiagnostics
} from "../v8/pages/connections-model.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null
  };
}

test("Connections Hub exposes guided methods and official resources for every integration", () => {
  assert.ok(INTEGRATIONS.length >= 30);
  INTEGRATIONS.forEach((integration) => {
    const methods = connectionMethods(integration);
    assert.ok(methods.length >= 1, `${integration.id} must expose a method`);
    assert.equal(methods[0].recommended, true, `${integration.id} must lead with a recommendation`);
    assert.ok(setupGuide(integration, methods[0].id).every((step) => step.id && step.title && step.description));
    assert.ok(officialResources(integration).every((resource) => resource.url.startsWith("https://")));
  });
  assert.equal(connectionMethods("spotify").length, 4);
  assert.ok(connectionMethods("github").some((method) => method.id === "github-app"));
  assert.ok(connectionMethods("discord").some((method) => method.id === "lanyard-presence"));
});

test("Connections catalog searches method capabilities and filters truthful states", () => {
  const presence = filterConnectionCatalog(INTEGRATIONS, { query: "presence", connections: [] });
  assert.ok(presence.some((integration) => integration.id === "discord"));
  const connections = [
    { id: "github", status: "connected", setupComplete: true, methodId: "github-app" },
    { id: "spotify", status: "disconnected", setupComplete: true, methodId: "oauth-pkce" }
  ];
  assert.deepEqual(filterConnectionCatalog(INTEGRATIONS, { status: "connected", connections }).map((entry) => entry.id), ["github"]);
  assert.deepEqual(filterConnectionCatalog(INTEGRATIONS, { status: "prepared", connections }).map((entry) => entry.id), ["spotify"]);
  const metrics = connectionMetrics(INTEGRATIONS, connections);
  assert.equal(metrics.connected, 1);
  assert.equal(metrics.prepared, 1);
});

test("automatic opportunities require a real connected source", () => {
  assert.equal(detectConnectionOpportunities([{ id: "discord", status: "disconnected" }]).length, 0);
  const opportunities = detectConnectionOpportunities([{ id: "discord", status: "connected" }]);
  assert.ok(opportunities.some((entry) => entry.targetId === "spotify" && entry.methodId === "discord-lanyard"));
  assert.equal(methodAvailability(connectionMethod("spotify", "discord-lanyard"), []).usable, false);
  assert.equal(methodAvailability(connectionMethod("spotify", "discord-lanyard"), [{ id: "discord", status: "connected" }]).usable, true);
});

test("local diagnostics never report an unconfigured remote session as connected", () => {
  const spotify = INTEGRATIONS.find((integration) => integration.id === "spotify");
  const method = connectionMethod(spotify, "oauth-pkce");
  const unconfigured = runConnectionDiagnostics(spotify, null, method, { online: true, now: Date.parse("2026-07-14T10:00:00Z") });
  assert.equal(unconfigured.checks.find((check) => check.id === "session").status, "idle");
  assert.equal(unconfigured.checks.find((check) => check.id === "setup").status, "warn");
  const connected = runConnectionDiagnostics(spotify, { status: "connected", setupComplete: true, lastSyncAt: "2026-07-14T09:59:00Z" }, method, { online: true, now: Date.parse("2026-07-14T10:00:00Z") });
  assert.equal(connected.status, "healthy");
  assert.equal(connected.checks.find((check) => check.id === "session").status, "pass");
});

test("connection persistence stores safe metadata and disconnect removes the association", () => {
  const storage = memoryStorage();
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "connections-user" });
  repository.createProfile({ name: "Connections QA", type: "development" });
  const configured = repository.connections.configure("rss", {
    methodId: "public-feed",
    reference: "https://example.test/feed.xml",
    apiVersion: "RSS / Atom",
    token: "must-not-persist"
  });
  assert.equal(configured.ok, true);
  assert.equal(configured.data.methodId, "public-feed");
  assert.equal(configured.data.reference, "https://example.test/feed.xml");
  assert.doesNotMatch(storage.read(`${SCOPED_PROFILE_PREFIX}connections-user`), /must-not-persist|"token"/i);
  const disconnected = repository.connections.disconnect("rss");
  assert.equal(disconnected.ok, true);
  assert.equal(repository.snapshot().connections.some((connection) => connection.id === "rss"), false);
});

test("Connections Hub remains lazy and does not add background loops", () => {
  const source = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setInterval|MutationObserver|ResizeObserver/);
  assert.match(source, /v8\.connections\.diagnose-all/);
  assert.match(source, /v8\.connections\.method\.select/);
  assert.match(source, /Frontend sans donnée sensible/);
});

test("public-availability connections (Weather, Minecraft, ...) and simple field-driven backend connections (Riot Games via Tracker.gg, ...) auto-verify and connect on save instead of requiring a separate manual diagnostic", () => {
  const source = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const setupComplete = source.slice(source.indexOf('actions.scope("v8.connections.setup.complete"'), source.indexOf('actions.scope("v8.connections.spotify.connect"'));
  assert.match(setupComplete, /const autoVerify = method\?\.availability === "public" \|\| \(backendRequired && Boolean\(method\?\.field\)\);/);
  assert.match(setupComplete, /if \(autoVerify\) \{/);
  assert.match(setupComplete, /const report = await runDiagnostic\(id\);/);
  assert.match(setupComplete, /if \(report\?\.workerAvailable\) \{/);
  assert.match(setupComplete, /repository\.connections\.updateStatus\(id, "connected"/);
  // A backend method reached only via a dedicated OAuth redirect action (no `field`) must never auto-verify here.
  assert.doesNotMatch(setupComplete, /const autoVerify = method\?\.availability === "backend";/);
});

test("a failed auto-verify surfaces a clear 'verification failed' message instead of the generic 'backend required' copy, for both the toast and the journal entry", () => {
  const source = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const setupComplete = source.slice(source.indexOf('actions.scope("v8.connections.setup.complete"'), source.indexOf('actions.scope("v8.connections.spotify.connect"'));
  assert.match(setupComplete, /description: connected \? "Connexion vérifiée et activée automatiquement\." : needsCredential \? `Ajoutez votre/);
  assert.match(setupComplete, /message: connected \? "Connexion vérifiée et activée\." : needsCredential \? `Préparation enregistrée\./);
});

test("a failed auto-verify overwrites the stale pre-verification 'backend required' detail instead of leaving it stuck on the connection forever (Riot Games / Tracker.gg regression)", () => {
  const source = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const setupComplete = source.slice(source.indexOf('actions.scope("v8.connections.setup.complete"'), source.indexOf('actions.scope("v8.connections.spotify.connect"'));
  assert.match(setupComplete, /\} else \{\s*needsCredential = Boolean\(method\?\.credential\) && !credentialStatus\.has\(method\.credential\.provider\);\s*repository\.connections\.updateStatus\(id, "disconnected", \{/);
});

test("when a backend method needs a personal API key (Riot Games, Tracker.gg), the failure message names the missing credential instead of the vague 'secure backend required' copy", () => {
  const source = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const setupComplete = source.slice(source.indexOf('actions.scope("v8.connections.setup.complete"'), source.indexOf('actions.scope("v8.connections.spotify.connect"'));
  assert.match(setupComplete, /`Ajoutez votre \$\{method\.credential\.fields\?\.\[0\]\?\.label \|\| "clé API personnelle"\} ci-dessous pour activer la connexion\.`/);
});

test("Riot Games is excluded from the Activity page's generic connected-but-unknown fallback tile, since Valorant and League of Legends already render their own dedicated Live Now cards", () => {
  const source = fs.readFileSync(new URL("../v8/pages/activity.mjs", import.meta.url), "utf8");
  assert.match(source, /const representedByOtherCards = new Set\(\["riot"\]\);/);
  assert.match(source, /connected\.filter\(\(connection\) => !Object\.hasOwn\(knownCards, connection\.id\) && !representedByOtherCards\.has\(connection\.id\)\)/);
});
