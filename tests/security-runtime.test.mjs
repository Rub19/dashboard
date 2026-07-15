import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("DOM construction exposes no generic raw HTML sink", () => {
  const dom = read("v8/ui/dom.mjs");
  assert.doesNotMatch(dom, /options\.html|innerHTML\s*=\s*String/);
  assert.doesNotMatch(dom, /\beval\s*\(|new\s+Function\s*\(|document\.write\s*\(/);
});

test("external browser dependencies are pinned with SHA-384 integrity", () => {
  const html = read("index.html");
  const scripts = [...html.matchAll(/<script\b([^>]*\bsrc="https:[^"]+"[^>]*)><\/script>/g)].map((match) => match[1]);
  assert.equal(scripts.length, 2);
  scripts.forEach((attributes) => {
    assert.match(attributes, /\bintegrity="sha384-[A-Za-z0-9+/=]+"/);
    assert.match(attributes, /\bcrossorigin="anonymous"/);
  });
});

test("browser CSP is exact-origin and blocks script attributes", () => {
  const html = read("index.html");
  const policy = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] || "";
  const connectSources = policy.match(/(?:^|;\s*)connect-src\s+([^;]+)/)?.[1].trim().split(/\s+/) || [];
  assert.match(policy, /script-src-attr 'none'/);
  assert.deepEqual(connectSources, [
    "'self'",
    "https://bvgifyzhpzkbrwdjrqsg.supabase.co",
    "wss://bvgifyzhpzkbrwdjrqsg.supabase.co",
    "https://raspy-fog-bf5b.rub19-mailpro.workers.dev",
    "http://127.0.0.1:8787",
    "http://localhost:8787"
  ]);
  assert.equal(policy.match(/img-src\s+([^;]+)/)?.[1], "'self' data: blob: https://i.scdn.co");
  assert.doesNotMatch(policy, /https:\/\/\*\.(?:supabase\.co|workers\.dev)|media-src[^;]*https:/);
});

test("GitHub Actions use immutable SHAs and job-scoped permissions", () => {
  const workflow = read(".github/workflows/deploy-pages.yml");
  const actionRefs = [...workflow.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)].map((match) => match[1]);
  assert.ok(actionRefs.length >= 5);
  actionRefs.forEach((reference) => assert.match(reference, /^[a-f0-9]{40}$/));
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /jobs:\s*[\s\S]*validate:[\s\S]*permissions:\s*\n\s+contents:\s*read/);
  assert.match(workflow, /deploy:[\s\S]*permissions:\s*\n\s+contents:\s*read\s*\n\s+pages:\s*write\s*\n\s+id-token:\s*write/);
});

test("Supabase public schema has a fail-closed RLS migration", () => {
  const relative = "supabase/migrations/202607130002_fail_closed_public_schema.sql";
  assert.equal(fs.existsSync(path.join(root, relative)), true);
  const migration = read(relative);
  assert.match(migration, /relrowsecurity/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /force row level security/i);
  assert.match(migration, /revoke all[^;]+from anon/i);
  assert.match(migration, /security_invoker|revoke all[^;]+view/i);
});

test("Supabase authentication uses PKCE and a dedicated storage adapter", () => {
  const main = read("v8/main.mjs");
  assert.match(main, /createAuthStorage/);
  assert.match(main, /flowType:\s*"pkce"/);
  assert.match(main, /storage:\s*authStorage/);
  assert.equal(fs.existsSync(path.join(root, "v8/services/auth-storage.mjs")), true);
});

test("auth storage routes sessions by remember preference and removes stale copies", async () => {
  const modulePath = path.join(root, "v8/services/auth-storage.mjs");
  assert.equal(fs.existsSync(modulePath), true);
  const { createAuthStorage, AUTH_REMEMBER_KEY } = await import("../v8/services/auth-storage.mjs");
  const makeStorage = () => {
    const values = new Map();
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      read: (key) => values.get(key) ?? null
    };
  };
  const localStorage = makeStorage();
  const sessionStorage = makeStorage();
  const storage = createAuthStorage({ localStorage, sessionStorage });

  localStorage.setItem(AUTH_REMEMBER_KEY, "0");
  storage.setItem("sb-project-auth-token", "session-only");
  assert.equal(sessionStorage.read("sb-project-auth-token"), "session-only");
  assert.equal(localStorage.read("sb-project-auth-token"), null);

  localStorage.setItem(AUTH_REMEMBER_KEY, "1");
  storage.setItem("sb-project-auth-token", "remembered");
  assert.equal(localStorage.read("sb-project-auth-token"), "remembered");
  assert.equal(sessionStorage.read("sb-project-auth-token"), null);

  storage.removeItem("sb-project-auth-token");
  assert.equal(localStorage.read("sb-project-auth-token"), null);
  assert.equal(sessionStorage.read("sb-project-auth-token"), null);
});

test("repository security scanner finds no deployable secret or unapproved sink", async () => {
  const modulePath = path.join(root, "scripts/audit-security.mjs");
  assert.equal(fs.existsSync(modulePath), true);
  const { auditRepository } = await import("../scripts/audit-security.mjs");
  const report = auditRepository(root);
  assert.deepEqual(report.failures, []);
  assert.ok(report.scannedFiles >= 50);
});

test("client attempt limiter blocks rapid replay for a bounded period", async () => {
  const modulePath = path.join(root, "v8/services/rate-limiter.mjs");
  assert.equal(fs.existsSync(modulePath), true);
  const { createRateLimiter } = await import("../v8/services/rate-limiter.mjs");
  let now = 1000;
  const limiter = createRateLimiter({ now: () => now });
  const policy = { limit: 2, windowMs: 1000, blockMs: 2000 };

  assert.equal(limiter.consume("login:user", policy).allowed, true);
  assert.equal(limiter.consume("login:user", policy).allowed, true);
  const blocked = limiter.consume("login:user", policy);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 2000);

  now += 2001;
  assert.equal(limiter.consume("login:user", policy).allowed, true);
  limiter.destroy();
  assert.equal(limiter.size(), 0);
});

test("authentication normalizes provider errors and enforces strong new passwords", async () => {
  const { createAuthAdapter, validateNewPassword } = await import("../v8/services/auth-adapter.mjs");
  let signUpCalls = 0;
  let updateCalls = 0;
  const client = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: new Error("User victim@example.test does not exist") }),
      signUp: async () => { signUpCalls += 1; return { data: {}, error: null }; },
      updateUser: async ({ password }) => { updateCalls += 1; return { data: { user: { id: "user-a" }, password }, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };
  const limiter = { consume: () => ({ allowed: true, retryAfterMs: 0 }), reset() {}, destroy() {} };
  const auth = createAuthAdapter({ client, rateLimiter: limiter });

  const signIn = await auth.signIn({ identifier: "victim@example.test", password: "incorrect" });
  assert.equal(signIn.ok, false);
  assert.equal(signIn.message, "Connexion impossible. Vérifiez vos identifiants.");
  assert.doesNotMatch(signIn.message, /victim|does not exist/i);

  assert.equal(validateNewPassword("Short1!").valid, false);
  assert.equal(validateNewPassword("longbutnosymbolA1").valid, false);
  assert.equal(validateNewPassword("Strong account 42!").valid, true);
  const weakSignup = await auth.signUp({ username: "Rub", email: "rub@example.test", password: "Short1!" });
  assert.equal(weakSignup.ok, false);
  assert.equal(signUpCalls, 0);

  const weakUpdate = await auth.updatePassword("Short1!");
  assert.equal(weakUpdate.ok, false);
  assert.equal(updateCalls, 0);
  const strongUpdate = await auth.updatePassword("Strong account 42!");
  assert.equal(strongUpdate.ok, true);
  assert.equal(updateCalls, 1);
  auth.destroy();
});

test("auth adapter rate guard rejects replay before calling the provider", async () => {
  const { createAuthAdapter } = await import("../v8/services/auth-adapter.mjs");
  let providerCalls = 0;
  const client = {
    auth: {
      signInWithPassword: async () => { providerCalls += 1; return { data: null, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    }
  };
  const auth = createAuthAdapter({
    client,
    rateLimiter: { consume: () => ({ allowed: false, retryAfterMs: 3200 }), reset() {}, destroy() {} }
  });
  const response = await auth.signIn({ identifier: "user@example.test", password: "Password 42!" });
  assert.equal(response.ok, false);
  assert.equal(response.status, "rate-limited");
  assert.match(response.message, /quelques instants/i);
  assert.equal(providerCalls, 0);
  auth.destroy();
});

test("password recovery mounts only for the verified Supabase recovery event", async () => {
  const { createEntryCoordinator } = await import("../v8/entry/entry-coordinator.mjs");
  let authListener = null;
  const mounted = [];
  const auth = {
    subscribe(listener) { authListener = listener; return () => {}; },
    initialize: async () => ({ ok: true }),
    getSession: async () => ({ ok: true, data: { session: null } }),
    signOut: async () => ({ ok: true }),
    destroy() {}
  };
  const profiles = { listProfiles: () => [] };
  const mount = (name) => (context) => { mounted.push({ name, context }); return () => {}; };
  const coordinator = createEntryCoordinator({
    auth,
    profiles,
    mountBoot: mount("booting"),
    mountLogin: mount("login"),
    mountRecovery: mount("recovery"),
    mountProfiles: mount("profiles"),
    mountHome: mount("home")
  });

  await coordinator.start();
  assert.equal(coordinator.state(), "login");
  authListener({ type: "SIGNED_IN", session: null });
  assert.equal(coordinator.state(), "login");
  authListener({ type: "PASSWORD_RECOVERY", session: { user: { id: "user-a" } } });
  assert.equal(coordinator.state(), "recovery");
  assert.equal(mounted.at(-1).context.session.user.id, "user-a");
  authListener({ type: "SIGNED_IN", session: { user: { id: "user-a" } } });
  assert.equal(coordinator.state(), "recovery");
  coordinator.destroy();
});

test("verified recovery has a dedicated surface wired to password update", () => {
  const relative = "v8/entry/password-recovery.mjs";
  assert.equal(fs.existsSync(path.join(root, relative)), true);
  const recovery = read(relative);
  const main = read("v8/main.mjs");
  assert.match(recovery, /auth\.updatePassword/);
  assert.match(recovery, /autocomplete:\s*"new-password"/);
  assert.doesNotMatch(recovery, /location\.(?:search|hash)|URLSearchParams/);
  assert.match(main, /mountPasswordRecovery/);
  assert.match(main, /mountRecovery:/);
});

test("registration requires a valid e-mail and communicates the strong password policy", () => {
  const login = read("v8/entry/login.mjs");
  assert.doesNotMatch(login, /emailOptional|E-mail \(optionnel\)|Email \(optional\)|Email \(opcional\)|E-Mail \(optional\)/);
  assert.match(login, /registerEmail\s*=\s*field\(\{[^}]*required:\s*true/);
  assert.match(login, /password\.length\s*>=\s*12/);
});

test("authenticated profiles migrate once and never persist an unscoped duplicate", async () => {
  const { ACTIVE_PROFILE_KEY, PROFILE_STORAGE_KEY, PROFILE_OWNER_KEY, SCOPED_PROFILE_PREFIX, createProfileRepository } = await import("../v8/data/profile-repository.mjs");
  const makeStorage = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      read: (key) => values.get(key) ?? null
    };
  };
  const legacy = JSON.stringify([{ id: "profile-a", name: "Personnel", state: { notes: [], todos: [], events: [], items: [] } }]);
  const storage = makeStorage({ [PROFILE_STORAGE_KEY]: legacy, [PROFILE_OWNER_KEY]: "user-a" });
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "user-a" });
  assert.equal(repository.listProfiles().length, 1);
  assert.match(storage.read(`${SCOPED_PROFILE_PREFIX}user-a`) || "", /Personnel/);
  assert.equal(storage.read(PROFILE_STORAGE_KEY), null);
  assert.equal(storage.read(PROFILE_OWNER_KEY), null);
  repository.selectProfile("profile-a");
  assert.equal(storage.read(ACTIVE_PROFILE_KEY), null);
  assert.equal(storage.read(`${ACTIVE_PROFILE_KEY}:user-a`), "profile-a");
  repository.notes.create({ title: "<img src=x onerror=alert(1)>", content: "<script>alert(1)</script>" });
  assert.equal(storage.read(PROFILE_STORAGE_KEY), null);
  assert.match(storage.read(`${SCOPED_PROFILE_PREFIX}user-a`) || "", /<script>alert\(1\)<\/script>/);

  const orphanStorage = makeStorage({ [PROFILE_STORAGE_KEY]: legacy });
  const otherUser = createProfileRepository({ storage: orphanStorage, requireOwner: true, ownerId: "user-b" });
  assert.equal(otherUser.listProfiles().length, 0);
  assert.equal(orphanStorage.read(PROFILE_STORAGE_KEY), legacy);
});

test("repository rejects executable URLs and prototype-polluting connection ids", async () => {
  const { createProfileRepository } = await import("../v8/data/profile-repository.mjs");
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  const repository = createProfileRepository({ storage, requireOwner: true, ownerId: "user-a", idFactory: () => "safe-id" });
  repository.createProfile({ name: "Security" });
  assert.equal(repository.files.create({ type: "link", name: "XSS", url: "javascript:alert(1)" }).ok, false);
  assert.equal(repository.files.create({ type: "link", name: "Data", url: "data:text/html,<script>alert(1)</script>" }).ok, false);
  assert.equal(repository.connections.configure("__proto__").ok, false);
  assert.equal(repository.connections.configure("constructor").ok, false);
  assert.equal(Object.prototype.setupComplete, undefined);
});

test("home model consumes the authenticated snapshot instead of global profile storage", async () => {
  const { createHomeModel } = await import("../v8/data/home-model.mjs");
  const snapshot = {
    profile: { id: "profile-a", name: "Alice" },
    notes: [{ id: "n1", title: "Private note", updatedAt: "2026-07-13T10:00:00Z" }],
    tasks: [{ id: "t1", title: "Ship", done: false }],
    events: []
  };
  const model = createHomeModel({ snapshot, date: new Date("2026-07-13T10:00:00Z") });
  assert.equal(model.user.name, "Alice");
  assert.equal(model.summary.notes, 1);
  const runtime = read("v8/app/app-runtime.mjs");
  assert.match(runtime, /createHomeModel\(\{\s*snapshot:\s*repository\.snapshot\(\)/);
  assert.doesNotMatch(read("v8/data/home-model.mjs"), /myspace_profiles_backup|PROFILE_STORAGE_KEY/);
});

test("presentation state preserves the offline error state and bounds indices", async () => {
  const { createPresentationStore } = await import("../v8/core/store.mjs");
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
  const store = createPresentationStore({ syncStatus: "error", commandIndex: 999999 }, { storage });
  assert.equal(store.getState().syncStatus, "error");
  assert.ok(store.getState().commandIndex <= 1000);
});

test("network cancellation interrupts retry backoff immediately", async () => {
  const { createNetworkClient } = await import("../v8/services/network-client.mjs");
  const runtime = {
    location: { href: "https://ethone.dev/", origin: "https://ethone.dev" },
    navigator: { onLine: true },
    setTimeout,
    clearTimeout,
    fetch: async () => new Response("unavailable", { status: 503 })
  };
  const network = createNetworkClient({ runtime });
  const controller = new AbortController();
  const started = performance.now();
  const pending = network.request("https://api.example.test/data", { retries: 1, backoffMs: 300, signal: controller.signal });
  setTimeout(() => controller.abort(new DOMException("Cancelled", "AbortError")), 10);
  await assert.rejects(pending, /cancel|abort/i);
  assert.ok(performance.now() - started < 180);
});

test("JSON responses require a JSON content type and stay within the byte limit", async () => {
  const { createNetworkClient } = await import("../v8/services/network-client.mjs");
  const runtimeFor = (responseFactory) => ({
    location: { href: "https://ethone.dev/", origin: "https://ethone.dev" },
    navigator: { onLine: true },
    setTimeout,
    clearTimeout,
    fetch: async () => responseFactory()
  });
  const invalidType = createNetworkClient({ runtime: runtimeFor(() => new Response("{}", { headers: { "content-type": "text/html" } })) });
  await assert.rejects(invalidType.requestJSON("https://api.example.test/data"), /content type/i);

  const oversized = createNetworkClient({ runtime: runtimeFor(() => new Response(JSON.stringify({ data: "x".repeat(256) }), { headers: { "content-type": "application/json" } })) });
  await assert.rejects(oversized.requestJSON("https://api.example.test/data", { maxResponseBytes: 64 }), /too large/i);
});

test("network client never retries non-idempotent methods and redacts all query values", async () => {
  const { createNetworkClient } = await import("../v8/services/network-client.mjs");
  let calls = 0;
  const runtime = {
    location: { href: "https://ethone.dev/", origin: "https://ethone.dev" },
    navigator: { onLine: true },
    setTimeout,
    clearTimeout,
    fetch: async () => { calls += 1; return new Response("failed", { status: 503 }); }
  };
  const network = createNetworkClient({ runtime });
  await assert.rejects(network.request("https://api.example.test/data?email=alice@example.test&token=private", { method: "POST", retries: 3, throwHttp: true }));
  assert.equal(calls, 1);
  const diagnostics = JSON.stringify(network.diagnostics());
  assert.doesNotMatch(diagnostics, /alice@example|private/);
  assert.match(diagnostics, /redacted/);
});

test("Supabase preflight accepts immediate signup and fails closed on unsafe auth settings", async () => {
  const relative = "scripts/verify-supabase-security.mjs";
  assert.equal(fs.existsSync(path.join(root, relative)), true);
  const { evaluateAuthSettings } = await import("../scripts/verify-supabase-security.mjs");
  const immediateSignup = evaluateAuthSettings({
    disable_signup: false,
    mailer_autoconfirm: true,
    external: { email: true, google: true, github: true, anonymous_users: false }
  });
  assert.deepEqual(immediateSignup, []);
  const confirmationEnabled = evaluateAuthSettings({
    disable_signup: false,
    mailer_autoconfirm: false,
    external: { email: true, google: true, github: true, anonymous_users: false }
  });
  assert.deepEqual(confirmationEnabled, []);
  const unsafe = evaluateAuthSettings({
    disable_signup: false,
    mailer_autoconfirm: true,
    external: { email: true, google: true, github: true, anonymous_users: true }
  });
  assert.ok(unsafe.some((failure) => /anonymous users/i.test(failure)));
  const source = read(relative);
  assert.match(source, /dashboard_data/);
  assert.match(source, /profiles/);
  assert.match(source, /ETHONE_ENFORCE_RLS_QA/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:access_token|refresh_token|password)/i);
  assert.match(read(".github/workflows/deploy-pages.yml"), /verify-supabase-security\.mjs/);
});

test("404 fallback is CSP-compatible and redirects without inline script or style", () => {
  const notFound = read("404.html");
  assert.match(notFound, /http-equiv="Content-Security-Policy"/);
  assert.match(notFound, /http-equiv="refresh"\s+content="0;\s*url=\/index\.html"/i);
  assert.doesNotMatch(notFound, /<script\b|\sstyle=/i);
  assert.doesNotMatch(notFound, /\son(?:click|load|error|submit)=/i);
});

test("service worker waits for explicit activation and only removes ETHONE caches", () => {
  const worker = read("sw.js");
  assert.doesNotMatch(worker, /precache\(\)\.then\(\(\)\s*=>\s*self\.skipWaiting\(\)\)/);
  assert.match(worker, /event\.data[^\n]+ETHONE_SKIP_WAITING[^\n]+self\.skipWaiting/);
  assert.match(worker, /key\.startsWith\("ethone-"\)/);
  assert.match(worker, /v8\/services\/auth-storage\.mjs/);
  assert.match(worker, /v8\/services\/rate-limiter\.mjs/);
  assert.match(worker, /v8\/entry\/password-recovery\.mjs/);
  assert.match(worker, /2026-07-15-experience-v110/);
});

test("canonical edge verifier enforces headers, anti-framing and no-store caching", async () => {
  const relative = "scripts/verify-security-headers.mjs";
  assert.equal(fs.existsSync(path.join(root, relative)), true);
  const { evaluateSecurityHeaders } = await import("../scripts/verify-security-headers.mjs");
  const secure = new Headers({
    "content-security-policy": "default-src 'self'; script-src 'self'; script-src-attr 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-opener-policy": "same-origin-allow-popups",
    "cache-control": "no-cache, no-store, must-revalidate",
    "cf-ray": "test-CDG"
  });
  assert.deepEqual(evaluateSecurityHeaders(secure, { requireNoStore: true, requireCloudflare: true }), []);
  const unsafe = new Headers({ "cache-control": "public, max-age=600" });
  assert.ok(evaluateSecurityHeaders(unsafe, { requireNoStore: true, requireCloudflare: true }).length >= 8);
  const source = read(relative);
  assert.match(source, /sw\.js/);
  assert.match(source, /redirect:\s*"manual"/);
  assert.match(read(".github/workflows/deploy-pages.yml"), /verify-security-headers\.mjs/);
});

test("repository documents disclosure and excludes local credentials", () => {
  assert.equal(fs.existsSync(path.join(root, "SECURITY.md")), true);
  assert.equal(fs.existsSync(path.join(root, ".gitignore")), true);
  const ignore = read(".gitignore");
  assert.match(ignore, /^\.env$/m);
  assert.match(ignore, /\*\.pem|\*\.key/);
  assert.match(read("SECURITY.md"), /private security advisory/i);
  const cloudflare = read("infra/cloudflare/README.md");
  assert.match(cloudflare, /Proxied/i);
  assert.match(cloudflare, /frame-ancestors 'none'/);
  assert.match(cloudflare, /verify-security-headers\.mjs/);
});
