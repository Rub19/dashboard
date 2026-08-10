# Checklist de déploiement — ETHONE Cloud (Phases 2-8 + Mail Phase B)

> Dernière mise à jour : 2026-08-13

## 1. Migrations Supabase à exécuter

Exécuter dans l'ordre via le SQL Editor de Supabase ou `psql` :

```sql
-- 001 : tables core (files, shares, drops, activity, favorites)
\i supabase/migrations/202608080001_ethone_cloud_files.sql

-- 002 : tags, brain summary/suggestion, brain_analyzed_at
\i supabase/migrations/202608080002_ethone_cloud_file_tags.sql

-- 003 : drive_client_id pour files et shares
\i supabase/migrations/202608080003_ethone_cloud_share_client.sql

-- 004 : drive_client_id manquant sur ethone_file_drops
\i supabase/migrations/202608080004_ethone_cloud_drop_client.sql

-- 005 : event_type drop_revoked dans ethone_file_activity
\i supabase/migrations/202608080005_ethone_cloud_activity_events.sql

-- 006 : ETHONE Mail Phase A (folders, labels, signatures, contacts, search_vector, attachments)
\i supabase/migrations/202608130001_ethone_mail_phase_a.sql

-- 007 : ETHONE Mail Phase B (Brain, rules, notifications, colonnes analyse)
\i supabase/migrations/202608140001_ethone_mail_phase_b.sql

-- 008 : ETHONE Mail Phase C.1 (templates, recherche avancée, snooze/scheduled)
\i supabase/migrations/202608150001_ethone_mail_phase_c1.sql

-- 009 : ETHONE Mail Phase C.2/C.3 (outbox, auto-reply, scheduled, bulk)
\i supabase/migrations/202608150002_ethone_mail_phase_c23.sql
```

### Configuration Cloudflare Email Routing

- Domaine `ethone.dev` actif sur Cloudflare.
- Route de reception personnalisee : `*@ethone.dev` -> Worker `email()`.
- **Important** : ne pas activer la reception Resend (Enable Receiving). Cloudflare Email Routing et l'entree MX de Resend sont incompatibles sur la meme zone. Resend est utilise uniquement pour l'envoi.
- Verification de l'adresse d'envoi dans Resend (send email from `ETHONE <no-reply@ethone.dev>`).
- Si Resend demande un MX `inbound-smtp.*.amazonaws.com`, il faut ignorer cette etape ou desactiver "Enable Receiving" dans Resend.

### Pourquoi 004 et 005 sont nécessaires

- `ethone_file_drops` a besoin de `drive_client_id` pour que l'upload public d'un drop s'écrive dans le bon compte Drive (le Worker l'insère via `cloud-shares-client.js`).
- `ethone_file_activity.event_type` n'autorisait pas `drop_revoked` ; le nettoyage admin lève une erreur sans la migration 005.

## 2. Secrets / variables d'environnement (Worker)

### Wrangler vars déjà dans `wrangler.jsonc`

- `ENVIRONMENT` = `production`
- `WORKER_VERSION` = `1.0.0`
- `ALLOWED_ORIGINS` = `https://ethone.dev`
- `SUPABASE_AUDIENCE` = `authenticated`
- `OUTBOUND_TIMEOUT_MS` = `6500`

### Wrangler secrets à pousser

```bash
cd worker
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SECRET_KEY
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put SUPABASE_ISSUER          # ex: https://<project>.supabase.co
wrangler secret put GROQ_API_KEY             # requis pour Brain
wrangler secret put GOOGLE_CLIENT_SECRET     # requis pour Google Drive / Calendar / YouTube

# Optionnels
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM              # ex: ETHONE <no-reply@ethone.dev>
wrangler secret put ETHONE_DEBUG_OTP         # true en dev uniquement
```

### Rate limits

Vérifier que les bindings `RATE_LIMIT_EDGE`, `RATE_LIMIT_STANDARD`, `RATE_LIMIT_STRICT` existent dans le dash Cloudflare et correspondent aux `namespace_id` du `wrangler.jsonc`.

## 3. Configuration Google Cloud (Console Google)

1. **OAuth 2.0 Client** :
   - Type : Web application
   - Authorized redirect URIs :
     - `https://ethone.dev`
     - `https://ethone.dev/?source=google-drive`
     - `https://ethone.dev/?source=google-calendar`
2. **Scopes Drive** ajoutés (déjà dans `v8/services/google-drive-oauth.mjs`):
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
3. **Pub/Sub ou polling** : aucun, le sync est déclenché manuellement / à l'ouverture de la page Fichiers.

## 4. Déploiement Worker

```bash
cd worker
npm ci
npm test                 # 120/120
npm run dry-run          # ok
wrangler deploy
```

> ✅ Déployé le 2026-08-08 — Version ID : `19610a75-54f4-4895-b7eb-978f2d79e415`

## 5. Déploiement frontend / PWA

1. Publier les fichiers statiques (racine `index.html`, `sw.js`, `v8/`, `worker/` non inclus) sur le domaine final.
2. S'assurer que `sw.js` est servi avec `Content-Type: application/javascript` et `Cache-Control: no-cache`.
3. Vider le cache navigateur / unregister le SW pour forcer `experience-v319`.

## 6. Vérifications post-déploiement

- [ ] Connexion Google Drive depuis `#/connections`.
- [ ] Ouvrir `#/files` : sync automatique, quota, favoris.
- [ ] Créer un partage depuis l'aperçu d'un fichier → ouvrir le lien en navigation privée → télécharger.
- [ ] Créer un drop depuis l'admin → déposer un fichier en navigation privée.
- [ ] Ouvrir `#/files` → Admin → Dashboard, liste, nettoyage des expirés.
- [ ] Page Activity affiche les événements cloud.
- [ ] Ouvrir `#/mail` : dossiers, liste, composition, envoi d'un email, brouillon auto-sauvegarde.
- [ ] Tester la réception sur un alias `@ethone.dev` dans Cloudflare Email Routing.
- [ ] Vérifier les threads, la recherche full-text, les étiquettes et les contacts.

## 7. Fichiers créés / modifiés récemment

### Nouveaux

- `supabase/migrations/202608130001_ethone_mail_phase_a.sql`
- `supabase/migrations/202608140001_ethone_mail_phase_b.sql`
- `supabase/migrations/202608150001_ethone_mail_phase_c1.sql`
- `supabase/migrations/202608150002_ethone_mail_phase_c23.sql`
- `supabase/migrations/202608160001_ethone_mail_phase_d.sql`
- `supabase/migrations/202608170001_ethone_mail_phase_e.sql`
- `worker/src/services/mail-brain.js`
- `worker/src/routes/mail-brain.js`
- `worker/src/services/mail-templates.js`
- `worker/src/routes/mail-templates.js`
- `worker/src/services/mail-outbox.js`
- `worker/src/services/mail-analytics.js`
- `worker/src/routes/mail-analytics.js`
- `worker/src/services/mail-security.js`
- `worker/src/routes/mail-security.js`
- `worker/src/services/mail-accounts.js`
- `worker/src/routes/mail-accounts.js`
- `worker/src/services/mail-pgp.js`
- `worker/src/routes/mail-pgp.js`
- `worker/src/services/mail-push.js`
- `worker/src/routes/mail-push.js`
- `worker/src/services/mail-lists.js`
- `worker/src/routes/mail-lists.js`
- `v8/services/mail-cache.mjs`
- `worker/test/mail.test.mjs`

### Modifiés

- `index.html`, `404.html`, `sw.js` (experience-v319)
- `v8/core/style-loader.mjs`
- `v8/data/changelog.mjs`
- `CHANGELOG.md`
- `v8/pages/mail.mjs`
- `v8/styles/mail.css`
- `v8/services/external-services-client.mjs`
- `v8/brain/action-registry.mjs`
- `worker/src/index.js`
- `worker/src/routes/mail.js`
- `worker/src/services/mail-client.js`
- `worker/src/router.js`
- `worker/test/helpers.mjs`
- `worker/src/services/mail-analytics.js`
- `worker/src/routes/mail-analytics.js`
- `worker/src/services/mail-security.js`
- `worker/src/routes/mail-security.js`
- `worker/src/services/mail-accounts.js`
- `worker/src/routes/mail-accounts.js`
- `worker/src/services/mail-pgp.js`
- `worker/src/routes/mail-pgp.js`
- `worker/src/services/mail-push.js`
- `worker/src/routes/mail-push.js`
- `worker/src/services/mail-lists.js`
- `worker/src/routes/mail-lists.js`

## 8. Changelog

Entrées `v290`, `v291`, `v292`, `v293`, `v294` et `v295` ajoutées dans `v8/data/changelog.mjs` et `CHANGELOG.md`.
