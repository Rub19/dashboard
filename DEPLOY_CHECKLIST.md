# Checklist de déploiement — ETHONE Cloud (Phases 2-8)

> Dernière mise à jour : 2026-08-08

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
```

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
3. Vider le cache navigateur / unregister le SW pour forcer `experience-v279`.

## 6. Vérifications post-déploiement

- [ ] Connexion Google Drive depuis `#/connections`.
- [ ] Ouvrir `#/files` : sync automatique, quota, favoris.
- [ ] Créer un partage depuis l'aperçu d'un fichier → ouvrir le lien en navigation privée → télécharger.
- [ ] Créer un drop depuis l'admin → déposer un fichier en navigation privée.
- [ ] Ouvrir `#/files` → Admin → Dashboard, liste, nettoyage des expirés.
- [ ] Page Activity affiche les événements cloud.

## 7. Fichiers créés / modifiés récemment

### Nouveaux

- `v8/services/cloud-cache.mjs`
- `v8/services/drive-client.mjs`
- `v8/pages/share.mjs`
- `v8/pages/drop.mjs`
- `v8/styles/share-drop.css`
- `worker/src/routes/cloud-*.js`
- `worker/src/services/cloud-*.js`
- `worker/test/cloud-files.test.mjs`
- `supabase/migrations/202608080004_ethone_cloud_drop_client.sql`
- `supabase/migrations/202608080005_ethone_cloud_activity_events.sql`

### Modifiés

- `index.html` (share-drop.css)
- `sw.js` (v258 precache)
- `v8/core/router.mjs`
- `v8/app/app-runtime.mjs`
- `v8/pages/files.mjs`
- `v8/pages/activity.mjs`
- `v8/services/external-services-client.mjs`
- `v8/styles/workspaces.css`
- `v8/data/changelog.mjs`
- `worker/src/index.js`, `worker/src/router.js`

## 8. Changelog

Entrée `v258` ajoutée dans `v8/data/changelog.mjs`.
