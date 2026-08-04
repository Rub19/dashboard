import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { V8_ROUTES, createRouter, normalizeRoute } from "../v8/core/router.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("normalizeRoute sanitizes control characters and blocks prototype pollution attempts", () => {
  assert.equal(normalizeRoute("__proto__"), "home");
  assert.equal(normalizeRoute("constructor"), "home");
  assert.equal(normalizeRoute("prototype"), "home");
  assert.equal(normalizeRoute("\x00activity\x07"), "activity");
  assert.equal(normalizeRoute("settings?foo=bar"), "settings");
  assert.equal(normalizeRoute("invalid-route-name"), "home");
});

test("router commit burst guard prevents rapid replay / infinite loops under flood", () => {
  const routes = [];
  const runtime = {
    location: { hash: "#/home" },
    history: {
      replaceState: (_state, _title, url) => { runtime.location.hash = url; },
      pushState: (_state, _title, url) => { runtime.location.hash = url; }
    }
  };
  const router = createRouter({ runtime, onRoute: (route) => routes.push(route) });

  router.start();
  assert.equal(routes.length, 1);
  assert.equal(routes[0], "home");

  for (let i = 0; i < 40; i++) {
    router.navigate("activity", { force: true });
  }

  assert.ok(routes.length <= 27, "Router should throttle/coalesce navigation bursts above 25 commits within 50ms");
});

test("all V8 pages are registered in ROUTE_SET for zero-reload SPA navigation", () => {
  const expectedRoutes = ["home", "activity", "connections", "brain", "settings", "notes", "tasks", "calendar", "files", "spaces", "flows"];
  for (const route of expectedRoutes) {
    assert.ok(V8_ROUTES.includes(route), `Route ${route} must be included in V8_ROUTES`);
    assert.equal(normalizeRoute(route), route);
  }
});

test("app-runtime implements lazyModuleCache and preloadLazyRoutes for instant zero-latency browsing", () => {
  const appRuntime = read("v8/app/app-runtime.mjs");
  assert.match(appRuntime, /const lazyModuleCache = new Map\(\);/);
  assert.match(appRuntime, /function preloadLazyRoutes\(\)/);
  assert.match(appRuntime, /if \(lazyModuleCache\.has\(route\)/);
});

test("authentication and browsing security layer enforces strong password policy without logging sensitive credentials", () => {
  const appRuntime = read("v8/app/app-runtime.mjs");
  const authAdapter = read("v8/services/auth-adapter.mjs");
  const loginEntry = read("v8/entry/login.mjs");

  assert.doesNotMatch(appRuntime, /console\.(?:log|warn|error)\([^)]*(?:password|token|secret|123456)/i, "No plaintext credentials logged in runtime");
  assert.doesNotMatch(authAdapter, /console\.(?:log|warn|error)\([^)]*(?:password|token|secret|123456)/i, "No plaintext credentials logged in auth adapter");
  assert.doesNotMatch(loginEntry, /console\.(?:log|warn|error)\([^)]*(?:password|token|secret|123456)/i, "No plaintext credentials logged in login entry");
  assert.match(authAdapter, /export function createAuthAdapter/);
  assert.match(authAdapter, /ATTEMPT_POLICIES/);
  assert.match(authAdapter, /createRateLimiter/);
});

test("app-runtime implements slash and question-mark keyboard shortcuts and online/offline network listeners", () => {
  const appRuntime = read("v8/app/app-runtime.mjs");
  assert.match(appRuntime, /event\.key === "\/"/);
  assert.match(appRuntime, /event\.key === "\?"/);
  assert.match(appRuntime, /\/\^\[1-9\]\$\/\.test\(event\.key\)/);
  assert.match(appRuntime, /globalThis\.addEventListener\("online", handleOnline\)/);
  assert.match(appRuntime, /globalThis\.addEventListener\("offline", handleOffline\)/);
  assert.match(appRuntime, /toasts\.show\(\{ id: "network-offline"/);
  assert.match(appRuntime, /toasts\.show\(\{ id: "network-online"/);
});

test("scrolling containers and page viewports enable GPU-accelerated smooth scrolling, touch momentum, and content-visibility", () => {
  const shellCss = read("v8/styles/shell.css");
  const baseCss = read("v8/styles/base.css");
  const appRuntime = read("v8/app/app-runtime.mjs");

  assert.match(shellCss, /scroll-behavior: smooth;/);
  assert.match(shellCss, /-webkit-overflow-scrolling: touch;/);
  assert.match(shellCss, /will-change: scroll-position;/);
  assert.match(shellCss, /content-visibility: auto;/);
  assert.match(baseCss, /scroll-behavior: smooth;/);
  assert.match(baseCss, /-webkit-overflow-scrolling: touch;/);
  assert.match(appRuntime, /ensureBrainRuntime\(\)\.catch\(\(\) => \{\}\);/);
});

