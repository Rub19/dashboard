# ETHONE Worker secrets setup

This document lists variable names only. Never paste a secret value into this file, source code, issue trackers, screenshots, terminal transcripts, or frontend storage.

## Before configuration

Treat every credential used by the previous Worker as compromised. Revoke it at the provider, create a replacement with the smallest useful scope, and configure only the replacement in Cloudflare.

Do not reuse an old value for any of these bindings.

## Required authentication bindings

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (prefer a current `sb_secret` server key; a legacy `service_role` JWT remains supported during rotation)
- `SUPABASE_JWT_SECRET` when the Supabase project still signs access tokens with `HS256`

The Worker can verify `RS256` and `ES256` tokens from the project's JWKS endpoint. Keep `SUPABASE_JWT_SECRET` only while valid `HS256` sessions must be supported.

For PostgREST calls, a current `sb_secret` key is sent only through the `apikey` header. The Worker adds `Authorization: Bearer` only when the configured server key is a legacy three-part `service_role` JWT.

## Provider bindings

- `STEAM_API_KEY`
- `TRACKER_API_KEY`
- `HENRIK_API_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `LASTFM_API_KEY`

Routes whose provider binding is absent remain isolated and report `available: false` through the authenticated diagnostic endpoint. They do not prevent the Worker or ETHONE from starting.

## Non-secret Worker variables

- `ENVIRONMENT`
- `WORKER_VERSION`
- `ALLOWED_ORIGINS`
- `SUPABASE_AUDIENCE`
- `SUPABASE_ISSUER` when a non-default issuer is required
- `OUTBOUND_TIMEOUT_MS`

`ALLOWED_ORIGINS` must contain exact origins, separated by commas. Production defaults to `https://ethone.dev`; add `https://www.ethone.dev` only if that host serves ETHONE without redirecting to the canonical origin.

## Cloudflare setup

Run each command from `worker/` and enter the regenerated value only in Wrangler's hidden prompt:

```powershell
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_SECRET_KEY
pnpm exec wrangler secret put SUPABASE_JWT_SECRET
pnpm exec wrangler secret put STEAM_API_KEY
pnpm exec wrangler secret put TRACKER_API_KEY
pnpm exec wrangler secret put HENRIK_API_KEY
pnpm exec wrangler secret put TWITCH_CLIENT_ID
pnpm exec wrangler secret put TWITCH_CLIENT_SECRET
pnpm exec wrangler secret put LASTFM_API_KEY
```

Configure only bindings required by enabled routes. Verify that the three rate-limit namespace IDs in `worker/wrangler.jsonc` are unique in the target Cloudflare account before deployment.

## Local development

Wrangler may read local values from `worker/.dev.vars`. That file and every variant of it are ignored by Git. Never create a committed example containing realistic values.

After local testing, run the repository upload check before any commit:

```powershell
node ./scripts/precommit-upload-check.mjs --all
```

## Rotation checklist

1. Revoke every old provider credential.
2. Rotate the Supabase server key if it was present in the previous Worker source.
3. Rotate the legacy JWT secret only through the supported Supabase migration process; do not invalidate active users without a session plan.
4. Add replacements with `wrangler secret put`.
5. Apply the public-profile migration.
6. Run Worker tests and the ETHONE production gate.
7. Deploy manually, then verify `/health` and the authenticated `/api/diagnostic` route.
