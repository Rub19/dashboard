# Agent Notes — ETHONE Dashboard

## Vérification

- Client Next.js : `cd ethone-next && npm run build`.
- Client lint    : `cd ethone-next && npm run lint`.
- Client unit    : `cd ethone-next && npm run test:unit`.
- E2E            : `cd ethone-next && npx playwright test`. Nécessite `TEST_EMAIL` et `TEST_PASSWORD` (chargeable depuis `ethone-next/.env.local`).
- Worker         : `cd worker && npm run deploy` (ou `npx wrangler deploy`).
- Tests worker   : `cd worker && npm test`.
- Pré-commit     : `node ./scripts/precommit-upload-check.mjs` puis `node ./scripts/audit-security.mjs`.
- Déploiement    : un push sur `main` est automatiquement build et déployé sur Cloudflare Pages via l'intégration Git. Déploiement manuel possible avec `npx wrangler pages deploy ethone-next/dist --project-name=<nom>`.
- Headers Pages  : `ethone-next/public/_headers` est copié dans l'artifact statique.

## Conventions

- PWA : gérée par `ethone-next/public/manifest.json`, `ethone-next/public/sw.js` et `ethone-next/public/.nojekyll`.
- `innerHTML` n'est autorisé que dans les fichiers listés dans `APPROVED_INNER_HTML` de `scripts/audit-security.mjs`.
- Les changelogs sont ajoutés en haut de `CHANGELOG.md`.
- Style de commit : `Migration Next.js : description`.
- Attribution : ne pas ajouter `Generated with [Devin]` ni `Co-Authored-By: Devin`. Utiliser le pseudo `Rub19` et l'email `rub19.mailpro@gmail.com` pour toute mention de co-auteur.
- Auteur des commits : `git config user.name "Rub19"` et `git config user.email "rub19.mailpro@gmail.com"`.

## Versions

- La pastille de version en bas à droite (`VersionPill`) lit `/api/version` en dev et `/version.json` en production statique.
- `package.json` est la source de vérité ; `public/version.json` doit être synchronisé.
- Lors d'une session de modifications notables, monter la version dans `package.json` et `public/version.json` (ou laisser le build régénérer `version.json`).
- Aligner aussi `package-lock.json` (via `npm install --package-lock-only`) et le label `VERSION_LABEL` dans `components/UserProfileDropdown.tsx`.
