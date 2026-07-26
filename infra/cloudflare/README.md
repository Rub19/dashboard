# ETHONE production edge configuration

GitHub Pages does not apply the repository `_headers` file. `ethone.dev` must therefore be **Proxied** through Cloudflare and the rules below must be active before a public release.

## DNS and TLS

1. Keep the four GitHub Pages apex records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) but set Proxy status to **Proxied**.
2. Set SSL/TLS mode to **Full (strict)** after GitHub Pages has issued a valid certificate for `ethone.dev`.
3. Enable **Always Use HTTPS**, minimum TLS 1.2 and automatic HTTPS rewrites.
4. Enable HSTS only after HTTPS and OAuth callbacks have been verified without a redirect loop: `max-age=31536000; includeSubDomains`.

## Response Header Transform Rule

Create one rule with expression:

```text
http.host eq "ethone.dev"
```

Set these static response headers, replacing any origin value:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin-allow-popups
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com; script-src-attr 'none'; style-src 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://i.scdn.co https://bvgifyzhpzkbrwdjrqsg.supabase.co; connect-src 'self' https://bvgifyzhpzkbrwdjrqsg.supabase.co wss://bvgifyzhpzkbrwdjrqsg.supabase.co https://raspy-fog-bf5b.rub19-mailpro.workers.dev; media-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; upgrade-insecure-requests; frame-ancestors 'none'
```

`frame-ancestors 'none'` must be an HTTP response header; a CSP meta tag cannot provide frame protection.

## Cache Rules

Apply rules in this order:

1. **Bypass cache** for `/`, `/index.html`, `/404.html`, `/sw.js`, `/manifest.webmanifest`, `/auth/*`, `/api/*`, and any request containing `code`, `token`, `access_token`, `refresh_token`, `error` or `error_description` query keys.
2. For the bypassed shell resources, set browser and edge TTL to zero and respect `Cache-Control: no-cache, no-store, must-revalidate`.
3. Cache `/icons/*` for one year only because icon filenames are release controlled.
4. Cache `/v8/*.mjs` and `/v8/styles/*` for no more than five minutes with revalidation.
5. Never create a zone-wide **Cache Everything** rule and never cache a response carrying `Authorization` or `Set-Cookie`.
6. Add `Service-Worker-Allowed: /` to `/sw.js`.

## External services Worker

The current `workers.dev` deployment is the temporary official gateway for secret-backed integrations. Its source lives in `worker/` and must be deployed only after local tests, secret rotation, and the Supabase public-profile migration have passed.

- Production CORS allows exact ETHONE origins only.
- `/health` is public and does not probe providers.
- Every `/api/*` route verifies a Supabase JWT and applies edge plus user rate limits.
- Provider bindings are Cloudflare secrets and never frontend variables.
- The browser can call only the fixed routes exposed by `ExternalServicesClient`.
- A future `api.ethone.dev` migration requires coordinated DNS, TLS, CSP, CORS, and rollback verification before the current URL is removed.

Follow `WORKER_SECRETS_SETUP.md` and `worker/README.md`. Never restore the retired open username lookup or wildcard CORS behavior.

## Release verification

Run both commands after every edge or deployment change:

```powershell
node ./scripts/verify-security-headers.mjs https://ethone.dev/
node ./scripts/verify-supabase-security.mjs
```

The GitHub Actions deployment is intentionally blocked while either command fails.

## deploy.ethone.dev

Protect every path with Cloudflare Access, a short session and a deny fallback. Keep GitHub credentials in encrypted Worker secrets, use a fine-grained token limited to the target repository, and never expose it to browser JavaScript, logs, URLs or local storage. Its source is not in this workspace and requires a separate audit.
