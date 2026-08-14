# ETHONE — AI Multi-Provider Architecture Report

## Summary

ETHONE now has a central **AI Router** that routes every AI request through **Cloudflare Workers AI first**, then transparently falls back to the user's configured provider. The system protects against quota overruns with an internal daily budget, tracks usage in Supabase, encrypts user API keys, and limits request sizes and per-user rates.

---

## 1. AI Providers

### Primary
- **Cloudflare Workers AI** (`cloudflare`)
- Default model: `@cf/meta/llama-3.3-70b-instruct-v1`
- Called through the `AI` binding when available, otherwise through the Cloudflare REST API.

### User fallback providers
- OpenAI
- Anthropic
- Google Gemini
- Groq
- DeepSeek
- OpenRouter
- Ollama (local)
- LM Studio (local)

User credentials are encrypted with AES-256-GCM before being stored in Supabase.

---

## 2. Cloudflare Quota Protection

### Configuration (via `wrangler.jsonc` vars or secrets)
- `AI_CLOUDFLARE_DAILY_ALLOCATION` = 10,000 (Cloudflare real quota)
- `AI_CLOUDFLARE_DAILY_BUDGET` = 8,000 (internal hard limit)
- `AI_CLOUDFLARE_EMERGENCY_BUFFER` = 2,000
- `AI_CLOUDFLARE_WARNING_PCT` = 0.8
- `AI_CLOUDFLARE_PREPARE_PCT` = 0.9
- `AI_CLOUDFLARE_HARDSTOP_PCT` = 1.0
- `AI_NEURONS_PER_TOKEN` = 0.1

### Quota manager
- Implemented as a **Durable Object** (`AiQuotaManager`) for atomic reservation and concurrency safety.
- Resets daily based on UTC midnight.
- Exposes `/api/ai/quota` for real-time usage.

---

## 3. Fallback Behavior

When Cloudflare fails with any of these conditions, the router tries the user's fallback provider once:
- Quota exhausted / internal budget reached
- Rate limit from Cloudflare
- Timeout
- Upstream unavailable
- Service not configured

It does **not** fall back on:
- Bad user input (4xx)
- Invalid messages
- Prompt too large

Only **0 retries** are attempted on the primary before fallback, preserving quota.

---

## 4. Security

- User API keys are encrypted with `AI_CREDENTIAL_MASTER_KEY` using PBKDF2 + AES-256-GCM.
- Keys are never returned to the frontend, logged, or stored in plain text.
- `provider-credentials` route now encrypts AI provider credentials before writing them.
- Existing plain credentials are still decrypted for backward compatibility, then re-encrypted on next save.

---

## 5. Rate & Cost Protection

Per-user limits (configurable):
- `AI_USER_REQUESTS_PER_HOUR` = 60
- `AI_USER_REQUESTS_PER_DAY` = 500
- `AI_USER_MAX_PROMPT_CHARS` = 12,000
- `AI_USER_MAX_OUTPUT_TOKENS` = 1,024
- `AI_USER_MAX_CONTEXT_CHARS` = 12,000

No unlimited usage is possible through the primary or fallback path.

---

## 6. Usage Logging

Every AI call is written to the `public.ai_usage_logs` table:
- `request_id`
- `user_id`
- `provider`, `model`
- `feature`, `priority`
- `estimated_neurons`, `actual_neurons`
- `success`, `fallback_used`, `fallback_reason`
- `error_code`, `latency_ms`
- `quota_used`, `quota_budget`
- `metadata`

---

## 7. Routes Migrated

- `/api/brain/complete` — Brain chat (now Cloudflare-first with fallback)
- `/api/mail/analyze` — Mail analysis
- `/api/mail/suggest` — Mail reply suggestions
- `/api/mail/extract` — Entity extraction from mail
- `/api/cloud/file/brain` — Cloud file analysis

### New routes
- `/api/ai/status` — Provider health & primary/fallback config
- `/api/ai/quota` — Daily quota usage
- `/api/ai/preferences` — Read/placeholder write preferences

---

## 8. UI

- Added `AiProviderPanel` component in settings.
- Shows Primary AI, Fallback AI, and Cloudflare quota bar.
- Added `useAiStatus` hook for real-time quota/provider status.
- Updated `BRAIN_PROVIDERS` to include `cloudflare`, `deepseek`, and `openrouter`.
- Default Brain provider is now `cloudflare` (fallback `groq`).

---

## 9. Tests

- 143 worker tests pass, including 5 new AI Router tests:
  - Cloudflare success with quota metadata
  - Fallback on quota error
  - 501 when fallback is not configured
  - Reject oversized prompts
  - Diagnostic reports Cloudflare status
- Next.js build and TypeScript checks pass.

---

## 10. TODO — Manual Steps Required

1. **Wrangler secrets** (run in `worker/`):
   ```bash
   npx wrangler secret put AI_CREDENTIAL_MASTER_KEY
   npx wrangler secret put CLOUDFLARE_API_TOKEN
   npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
   ```

2. **Cloudflare Workers AI binding**: ensure `wrangler.jsonc` `ai.binding = "AI"` is enabled in the Cloudflare dashboard or via `wrangler deploy`.

3. **Durable Object migration**: run `npx wrangler deploy` to create the `AiQuotaManager` Durable Object class.

4. **Supabase migration**: apply `supabase/migrations/202608150003_ai_usage_logs.sql` to create `ai_usage_logs` and extend `user_provider_credentials` providers.

5. **Environment variables**: set `AI_PRIMARY_PROVIDER`, `AI_CLOUDFLARE_DAILY_BUDGET`, etc. in wrangler/Cloudflare dashboard if you want to override defaults.

6. **Production Cloudflare AI test**:
   - Send a Brain message.
   - Verify `/api/ai/quota` shows usage.
   - Simulate quota by lowering `AI_CLOUDFLARE_DAILY_BUDGET` to 1 and retry.
   - Verify fallback is used.

7. **Migrate remaining features** when they are added:
   - Marketplace recommendations
   - Planner
   - Insights/summaries
   These should call `aiComplete(env, { feature: "marketplace" | "planner" | "insights", messages, context })`.

8. **Admin monitoring view**: build a dedicated admin page using `/api/ai/quota` and `ai_usage_logs` data.

9. **AI Gateway evaluation**: consider Cloudflare AI Gateway for centralized observability, caching, and rate limiting.

---

## 11. Files Changed

### Worker
- `worker/wrangler.jsonc`
- `worker/src/router.js`
- `worker/src/routes/brain.js`
- `worker/src/routes/ai.js` (new)
- `worker/src/routes/provider-credentials.js`
- `worker/src/services/ai-config.js` (new)
- `worker/src/services/ai-router.js` (new)
- `worker/src/services/ai-quota-durable-object.js` (new)
- `worker/src/services/ai-provider-clients.js` (new)
- `worker/src/services/ai-credential-vault.js` (new)
- `worker/src/services/ai-usage-logger.js` (new)
- `worker/src/services/cloudflare-ai-client.js` (new)
- `worker/src/services/mail-brain.js`
- `worker/src/services/cloud-brain-client.js`
- `worker/test/ai-router.test.mjs` (new)

### Frontend
- `ethone-next/app/settings/page.tsx`
- `ethone-next/components/AiProviderPanel.tsx` (new)
- `ethone-next/lib/hooks/useAiStatus.ts` (new)
- `ethone-next/lib/brain/providers.ts`
- `ethone-next/lib/brain/preferences.ts`

### Supabase
- `supabase/migrations/202608150003_ai_usage_logs.sql` (new)

---

## 12. Notes

- The architecture is designed to add OpenAI, Anthropic, Gemini, DeepSeek, Mistral, OpenRouter, and other providers without changing `aiComplete` consumers.
- No existing feature was broken; all 143 worker tests and the Next.js build pass.
