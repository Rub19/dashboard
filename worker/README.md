# ETHONE External Services Worker

This Worker is the only browser-facing gateway for integrations that require private provider credentials. The frontend exposes a fixed operation registry and never accepts an arbitrary upstream URL.

## Security model

- `/health` is public, IP-rate-limited, and performs no provider probe.
- Every `/api/*` route requires a Supabase access token with a valid signature, issuer, audience, expiry, authenticated role, and UUID subject.
- User identity is derived exclusively from the verified token.
- CORS returns an exact allowlisted origin and rejects unknown origins, methods, and headers.
- Edge and user rate limits are applied per route and integration.
- Provider URLs are constructed by the Worker from validated parameters.
- Redirects, oversized payloads, unexpected content types, and unbounded retries are rejected.
- Public provider data may use a short in-memory cache. Supabase lookups and tokens are never put in a public cache.
- Supabase `sb_secret` server keys use the `apikey` header only; the legacy Bearer form is retained solely for three-part `service_role` JWTs during migration.
- Structured logs contain route, status, duration, cache state, and request ID only.

## Routes

| Route | Visibility | Purpose |
| --- | --- | --- |
| `GET /health` | Public | Worker version and general readiness, without external calls |
| `GET /api/diagnostic` | Authenticated | Binding, cache, rate-limit, and outbound diagnostics |
| `GET /api/steam/player` | Authenticated | Public Steam player summary |
| `GET /api/steam/recent-games` | Authenticated | Recently played Steam games |
| `GET /api/steam/owned-games` | Authenticated | Public Steam library subset |
| `GET /api/steam/achievements` | Authenticated | Public achievements for one application |
| `GET /api/tracker/apex-profile` | Authenticated | Allowlisted Apex profile lookup |
| `GET /api/henrik/account` | Authenticated | Valorant account lookup |
| `GET /api/henrik/status` | Authenticated | Valorant service status |
| `GET /api/twitch/channel` | Authenticated | Public Twitch channel state |
| `GET /api/lastfm/recent-tracks` | Authenticated | Recent Last.fm tracks |
| `GET /api/lastfm/top-artists` | Authenticated | Last.fm top artists |
| `GET /api/lastfm/top-tracks` | Authenticated | Last.fm top tracks |
| `GET /api/lanyard/presence` | Authenticated | Normalized public Discord presence |
| `GET /api/now-playing` | Authenticated | Explicit Last.fm or Lanyard now-playing source |
| `GET /api/supabase/public-profile` | Authenticated | Minimal discoverable ETHONE profile via a restricted RPC |

There is no generic proxy route and no route that returns a private e-mail address.

## Local verification

Use Node 22 or newer with the locked pnpm toolchain:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm dry-run
pnpm exec wrangler dev
```

The local Worker listens on `http://127.0.0.1:8787` by default. Local secrets belong in `.dev.vars`, which is ignored by Git.

## Progressive rollout

1. Apply `supabase/migrations/202607140002_public_profile_directory.sql`.
2. Configure regenerated Cloudflare secrets using `WORKER_SECRETS_SETUP.md`.
3. Confirm rate-limit namespace IDs in the target Cloudflare account.
4. Run all local tests and the production gate.
5. Deploy manually to the current `workers.dev` target.
6. Verify public health, authenticated diagnostics, CORS denial, 401 handling, and 429 handling.
7. Enable one frontend integration at a time and monitor sanitized Worker logs.
8. Move to `api.ethone.dev` only after DNS, TLS, CORS, CSP, and rollback have been tested.

No deployment is performed by the repository scripts.

## Rollback

Cloudflare keeps deployment versions. If production verification fails, roll back to the last known secure Worker version, disable affected provider routes by removing their secret binding, and keep ETHONE's local preparation UI available. Never restore the retired Worker source or a compromised credential.
