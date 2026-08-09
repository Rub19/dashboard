# Agent Notes — ETHONE Dashboard

## Verification

- Syntax (client) : `node --check` on every `.mjs` under `v8/`.
- Syntax (worker) : `node --check` on every `.mjs`/`.js` under `worker/src/` and `worker/test/`.
- Tests Worker    : `cd worker && npm test`.
- Pre-commit      : `node ./scripts/precommit-upload-check.mjs` puis `node ./scripts/audit-security.mjs`.

## Conventions

- Cache-busting PWA : version globale `experience-vXXX` utilisée dans `index.html`, `404.html`, `sw.js`, `v8/core/style-loader.mjs`, `CHANGELOG.md`, `v8/data/changelog.mjs` et `DEPLOY_CHECKLIST.md`.
- `innerHTML` n'est autorise que dans les fichiers listes dans `APPROVED_INNER_HTML` de `scripts/audit-security.mjs`.
- Les changelogs doivent etre ajoutes en haut de `CHANGELOG.md` et `v8/data/changelog.mjs`.
- Le style de commit precedent est : `Phase X : description (vXXX).`
