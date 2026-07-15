# ETHONE Production Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden ETHONE's browser runtime, authentication, Supabase boundary, PWA cache and deployment pipeline, while making external security prerequisites fail closed before release.

**Architecture:** Keep ETHONE as a static V8 SPA, but reduce browser attack surface, isolate Supabase credentials through a dynamic storage adapter, and make every public database table deny by default through RLS. Add deterministic local security tests plus live preflight checks for Supabase and the canonical Cloudflare edge; the repository must never claim production readiness when those external controls are missing.

**Tech Stack:** Native ES modules, Node.js test runner, Supabase Auth/Postgres migrations, GitHub Actions, Cloudflare response-header rules, Service Worker/PWA.

## Global Constraints

- Preserve existing authentication and the V8-only runtime.
- Never persist provider secrets, service-role keys, passwords or raw sessions in ETHONE-owned storage.
- Use text nodes for user content; allow no generic HTML injection helper.
- Keep network retries bounded and all requests time-limited and abortable where the provider supports cancellation.
- Do not deploy or execute destructive account deletion during this audit.
- Any unverifiable external prerequisite must block the production gate rather than be reported as secure.

---

### Task 1: Security Regression Harness

**Files:**
- Create: `tests/security-runtime.test.mjs`
- Create: `scripts/audit-security.mjs`
- Modify: `scripts/run-production-gate.ps1`
- Modify: `scripts/validate-production.mjs`

**Interfaces:**
- Produces: a deterministic local audit covering dangerous DOM sinks, secret patterns, CSP/SRI, workflow pinning, storage redaction and fail-closed SQL.

- [ ] **Step 1: Write failing security tests**

Add assertions that `element()` has no `html` option, external scripts have SHA-384 integrity, GitHub Actions use 40-character SHAs, the auth client uses PKCE and guarded storage, and every public table is covered by the fail-closed RLS migration.

- [ ] **Step 2: Run the tests and confirm the expected failures**

Run: `node --test tests/security-runtime.test.mjs`

Expected: failures for the current HTML sink, missing SRI, movable action tags, missing PKCE storage and missing global RLS migration.

- [ ] **Step 3: Add the repository security scanner**

The scanner must reject private-key blocks, service-role keys, GitHub/OpenAI/provider token formats, source maps, `eval`, `new Function`, inline event handlers, unapproved `innerHTML`, `_blank` links without `noopener noreferrer`, and `TODO/FIXME` markers.

- [ ] **Step 4: Wire the scanner into the production gate**

Run `scripts/audit-security.mjs` before artifact generation so a failed audit prevents deployment.

### Task 2: Authentication and Session Boundary

**Files:**
- Create: `v8/services/auth-storage.mjs`
- Create: `v8/services/rate-limiter.mjs`
- Create: `v8/entry/password-recovery.mjs`
- Modify: `v8/services/auth-adapter.mjs`
- Modify: `v8/entry/entry-coordinator.mjs`
- Modify: `v8/main.mjs`
- Modify: `v8/styles/entry.css`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Produces: `createAuthStorage(runtime)`, `createRateLimiter(options)`, `mountPasswordRecovery(root, options)`, and `auth.updatePassword(password)`.

- [ ] **Step 1: Test session storage routing and token redaction**

Verify remembered sessions use local storage, non-remembered sessions use session storage, writes remove stale copies from the other store, and diagnostic/auth results never expose access or refresh tokens.

- [ ] **Step 2: Implement dynamic Supabase auth storage and PKCE**

Configure Supabase with `flowType: "pkce"`, `autoRefreshToken: true`, `detectSessionInUrl: true`, and the dynamic storage adapter.

- [ ] **Step 3: Test and implement bounded client attempt guards**

Guard sign-in, registration, password-reset and OAuth starts against accidental rapid replay. Return a stable retry-after result without exposing provider errors. Keep the report explicit that server-side Supabase limits remain mandatory.

- [ ] **Step 4: Test and implement the recovery event path**

`PASSWORD_RECOVERY` with a verified Supabase session must mount the recovery surface, require a strong replacement password, call `auth.updatePassword`, then continue to profiles. A URL parameter alone must never activate recovery.

- [ ] **Step 5: Normalize authentication errors and validation**

Use generic sign-in failures to prevent account enumeration, validate e-mail/username bounds, and require a strong password for new accounts and password updates without invalidating existing sign-ins.

### Task 3: DOM XSS, URLs and Local Persistence

**Files:**
- Modify: `v8/ui/dom.mjs`
- Modify: `v8/data/profile-repository.mjs`
- Modify: `v8/pages/files.mjs`
- Modify: `v8/core/store.mjs`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Consumes: existing text-node `element()` API.
- Produces: no generic raw-HTML sink, strict HTTP(S) links, prototype-safe identifiers and owner-scoped persistence without an ongoing unscoped duplicate.

- [ ] **Step 1: Write injection and persistence regression tests**

Cover `<img onerror>`, `javascript:` URLs, `data:` URLs, `__proto__` identifiers, secret-shaped keys and cross-owner profile reads.

- [ ] **Step 2: Remove the generic `options.html` sink**

All user content must continue through `textContent`; retain only audited static shell templates whose interpolated values are escaped.

- [ ] **Step 3: Stop duplicating authenticated profile data into the legacy unscoped key**

Allow one-time owner-matched migration, persist only to `ethone:v8:profiles:<owner>`, and remove the migrated unscoped copy without deleting scoped user data.

- [ ] **Step 4: Harden outbound links and state normalization**

Require `noopener noreferrer`, reject non-HTTP(S) user URLs, include the offline sync state, and bound all persisted strings and numeric indices.

### Task 4: Network and External API Guardrails

**Files:**
- Modify: `v8/services/network-client.mjs`
- Modify: `v8/services/external-diagnostics.mjs`
- Modify: `v8/services/public-auth-config.mjs`
- Modify: `index.html`
- Modify: `_headers`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Produces: bounded retries, abortable retry waits, response content-type/size validation, redacted diagnostics and no production dependency on the unauthenticated username Worker.

- [ ] **Step 1: Reproduce abort/backoff and oversized JSON weaknesses**

Tests must show cancellation currently waits through backoff and JSON accepts an invalid content type or oversized body.

- [ ] **Step 2: Implement abort-aware delays and guarded JSON parsing**

Reject non-JSON responses, enforce a default maximum response size, cap retries at three, and never retry non-idempotent methods by default.

- [ ] **Step 3: Remove the unused Cloudflare username lookup trust path**

Remove its URL from the public runtime and CSP. Keep the external Worker finding in the deployment report until that Worker is separately replaced or disabled.

### Task 5: Supabase Fail-Closed Database Policy

**Files:**
- Create: `supabase/migrations/202607130002_fail_closed_public_schema.sql`
- Create: `scripts/verify-supabase-security.mjs`
- Modify: `scripts/validate-production.mjs`
- Modify: `.github/workflows/deploy-pages.yml`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Produces: RLS enabled and forced on every public base/partitioned table, anonymous privileges revoked, public views revoked unless explicitly reviewed, and a live auth-configuration gate.

- [ ] **Step 1: Test the migration text for complete fail-closed coverage**

Require iteration over all `public` tables, `ENABLE/FORCE ROW LEVEL SECURITY`, `REVOKE ALL ... FROM anon`, view revocation and no exposed security-definer helper.

- [ ] **Step 2: Implement the SQL migration**

Preserve the explicit owner policies from migration `0001`; all unknown public tables become inaccessible until an explicit policy is added.

- [ ] **Step 3: Add the live Supabase preflight**

Verify auth health, Google/GitHub provider availability and anonymous-user disablement. E-mail confirmation is an explicit product choice and is not a deployment gate; ETHONE supports immediate signup when `mailer_autoconfirm` is enabled.

- [ ] **Step 4: Define optional two-user RLS verification**

When dedicated CI secrets for users A and B exist, verify that each authenticated token can only read its own rows. Never print credentials or tokens; fail closed when production RLS verification is explicitly enabled but credentials are incomplete.

### Task 6: CSP, Dependencies, PWA and Browser Chrome

**Files:**
- Modify: `index.html`
- Modify: `404.html`
- Modify: `_headers`
- Modify: `sw.js`
- Modify: `scripts/validate-production.mjs`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Produces: SHA-384 SRI for pinned CDN scripts, an exact-origin CSP, no `unsafe-eval`, no broad HTTPS image/media sources, anti-framing at the edge, and sensitive navigation bypass in the service worker.

- [ ] **Step 1: Add failing CSP/SRI/PWA tests**

Assert both external scripts have `integrity` and `crossorigin`, `connect-src` contains only the project Supabase origin, and the SW never caches auth/OAuth responses.

- [ ] **Step 2: Harden CSP and 404 handling**

Separate `style-src` from `style-src-attr`, remove broad connect/image/media hosts, add `script-src-attr 'none'`, and replace the inline 404 redirect script with a CSP-compatible redirect.

- [ ] **Step 3: Align service-worker update behavior**

Do not automatically activate an update before the application can announce it; continue removing every old ETHONE cache on activation.

### Task 7: GitHub and Cloudflare Release Gates

**Files:**
- Create: `scripts/verify-security-headers.mjs`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `infra/cloudflare/README.md`
- Create: `SECURITY.md`
- Test: `tests/security-runtime.test.mjs`

**Interfaces:**
- Produces: immutable action SHAs, job-scoped permissions, non-persistent checkout credentials, timeouts, canonical edge-header checks and exact Cloudflare rule values.

- [ ] **Step 1: Pin every GitHub Action to an observed 40-character commit SHA**

Keep the major version in a comment for Dependabot maintenance and set `persist-credentials: false` for checkout.

- [ ] **Step 2: Split workflow permissions by job and add timeouts**

Validation receives only `contents: read`; deployment receives only `contents: read`, `pages: write` and `id-token: write`.

- [ ] **Step 3: Add the canonical security-header verifier**

Fail unless production sends CSP, HSTS, `nosniff`, referrer, permissions and anti-framing headers, redirects HTTP to HTTPS, and prevents caching of HTML and `sw.js`.

- [ ] **Step 4: Document exact Cloudflare prerequisites and incident response**

Document DNS proxying, response-header and cache rules, Worker CORS lockdown, secret rotation and the responsible disclosure path.

### Task 8: Offensive QA and Final Report

**Files:**
- Modify as needed only after a failing regression test.
- Regenerate: `dist/`

**Interfaces:**
- Produces: reproducible evidence for invalid routes, injection payloads, rapid login actions, offline/refresh behavior, logout, session removal, command spam and browser-console cleanliness.

- [ ] **Step 1: Run syntax, unit, security and production gates**

Run: `scripts/run-production-gate.ps1` with the bundled Node runtime.

- [ ] **Step 2: Run live external probes**

Run the Supabase and canonical edge verifiers separately and retain failures as release blockers rather than suppressing them.

- [ ] **Step 3: Exercise the application in a clean browser session**

Test login failure/success, invalid hash normalization, refresh, logout, offline transition, rapid Ctrl+K, injected note/profile/search strings, CSP violations and console errors at desktop and mobile widths.

- [ ] **Step 4: Produce the risk report**

List critical, medium and low findings; separate corrected code risks from external configuration blockers; include every modified file and only evidence-backed recommendations.
