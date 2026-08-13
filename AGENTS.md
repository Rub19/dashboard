# Agent Notes — ETHONE Dashboard

## Vérification

- Client Next.js : `cd ethone-next && npm run build`.
- Client lint    : `cd ethone-next && npm run lint`.
- Client unit    : `cd ethone-next && npm run test:unit`.
- E2E            : `cd ethone-next && npx playwright test`.
- Worker         : `cd worker && npm run deploy` (ou `npx wrangler deploy`).
- Tests worker   : `cd worker && npm test`.
- Pré-commit     : `node ./scripts/precommit-upload-check.mjs` puis `node ./scripts/audit-security.mjs`.

## Conventions

- PWA : gérée par `ethone-next/public/manifest.json`, `ethone-next/public/sw.js` et `ethone-next/public/.nojekyll`.
- `innerHTML` n'est autorisé que dans les fichiers listés dans `APPROVED_INNER_HTML` de `scripts/audit-security.mjs`.
- Les changelogs sont ajoutés en haut de `CHANGELOG.md`.
- Style de commit : `Migration Next.js : description`.
- Attribution : ne pas ajouter `Generated with [Devin]` ni `Co-Authored-By: Devin`. Utiliser l'identité de l'utilisateur (git `user.name` / `user.email`) ou le pseudo demandé.
