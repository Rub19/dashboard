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
- Ajouter une entrée dans `ethone-next/data/changelog.ts` (in-app changelog, pour toutes les langues fr/en/es/de) et dans `CHANGELOG.md` à la racine.

## Prochaines étapes — État au 2026-08-23

**Commit de référence :** `3009e7c0` (`main`, version `v1.8.12`)  
**Statut CI/CD :** tout vert sur `main` (Cloudflare Pages, Workers, build web, iOS, Android).

### Ce qui est en place
- Fusion des branches `claude/discord-bot-features-hrkaZ`, `rub19-symmetrical-giggle` (sécurisée) et `devin/recovered-stash-2026-08-14` dans `main`.
- Nettoyage des branches obsolètes locales et distantes.
- Tests Web (`tsc`, `lint`, `build`, `test:unit`, `precommit-upload-check`, `audit-security`) passent.
- Tests Worker (`npm test`) passent (156/156).
- Compilation iOS et Android validées par CI ; structures natives vérifiées.

### Ce qu’il reste à traiter
1. **Lint warnings** : 39 avertissements TypeScript dans `ethone-next` (`lib/native.ts`, `lib/notifications.ts`, etc. et `NativeIntegration.tsx`). Non bloquants mais à nettoyer quand on refactorera ces modules.
2. **E2E Playwright** : non lancés car nécessitent `TEST_EMAIL` et `TEST_PASSWORD` dans `ethone-next/.env.local`.
3. **Branches restantes** : seule `feat/button-theme-dynamic-audit` existe encore sur le remote. Elle n’est pas fusionnable telle quelle (conflits avec `main`) ; extraire une feature précise si demandé.
4. **Déploiement Worker** : `cd worker && npm run deploy` n’a pas été exécuté ; vérifier manuellement si besoin.
5. **Tests locaux iOS/Android** : impossibles depuis Windows (`xcodebuild` / Gradle non présents) ; seuls les CI `build-ios.yml` et `build-android.yml` ont validé les builds.
