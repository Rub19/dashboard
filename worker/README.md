# Worker Cloudflare `raspy-fog-bf5b`

API du site ethone.dev et de l'app iOS : statistiques et tracker (HenrikDev, Riot), E:VAL, IA, mail, intégrations.

## Structure

- `src/index.js` : point d'entrée.
- `src/router.js` : table des routes, authentification et limites de débit.
- `src/routes/` : une route par fichier.
- `src/services/` : logique métier (dont `valorant-eval.js`, qui limite et met en cache les appels HenrikDev).
- `src/middleware/`, `src/utils/` : outils communs.
- `test/*.test.mjs` : tests (`node --test`).

## Commandes

```bash
npm test              # tests
npm run check         # vérifie la syntaxe
npm run dev           # serveur local (wrangler dev)
npm run deploy        # déploiement (wrangler deploy)
```

## Secrets

Ils ne sont jamais dans le dépôt. Pour en ajouter ou en changer un (wrangler demande la valeur, rien n'est affiché) :

```bash
npx wrangler secret put NOM_DU_SECRET
npx wrangler secret list
```
