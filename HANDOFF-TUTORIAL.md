# ETHONE — tutoriel de travail (pour l'IA qui reprend)

À lire après `HANDOFF.md`. Ici : comment travailler, les commandes, les vérifications et les pièges déjà rencontrés.

---

## 1. Accès

```bash
ssh vps    # VPS du bot : 141.94.237.150, utilisateur ubuntu
ssh nas    # NAS (Lavalink) : port 46, clé SSH, pas de SFTP (copier avec : cat f | ssh nas "cat > …")
```

- **Cloudflare** : `npx wrangler …` depuis `worker/` (déjà authentifié sur le PC).
- **Supabase** : projet `bvgifyzhpzkbrwdjrqsg` (outils MCP Supabase si disponibles).
- **GitHub** : `gh` (CI, logs : `gh run view <id> --log-failed`).
- Le VPS n'ouvre que 22, 80 et 443. Pour Cockpit ou le bureau à distance : `ssh -L 9090:localhost:9090 vps` (puis http://localhost:9090), même chose avec 3389.

## 2. Vérifier avant chaque commit

Site (`ethone-next/`) :
```bash
npx tsc --noEmit -p .
npm run lint            # doit rester à 0 avertissement
npm run test:unit
npm run build
```

Depuis la racine :
```bash
node ./scripts/precommit-upload-check.mjs
node ./scripts/audit-security.mjs
```

Worker (`worker/`) : `npm test`. Bot (`discord-bot/`) : `npx tsc --noEmit -p .` et les tests du module touché (`DISCORD_TOKEN=ci-placeholder-token CLIENT_ID=000000000000000000 npx tsx tests/<fichier>.ts`).

iOS : impossible à compiler sous Windows. Pousser, puis surveiller la CI :
```bash
gh run list --workflow build-ios.yml -L 1
gh run watch <id> --exit-status
gh run view <id> --log-failed | grep "error:"
```

## 3. Sortir une version (à chaque lot)

```bash
cd ethone-next
node scripts/release.js 1.78.4 2026-10-21 rel.json
```
`release.js` met à jour `ethone-next/package.json`, `discord-bot/package.json`, les 4 langues de `data/changelog.ts` et le haut de `CHANGELOG.md`. Le fichier `rel.json` :
```json
{
  "fr": { "title": "Titre court", "items": ["Ce que l'utilisateur voit changer, et pourquoi."] },
  "en": { "title": "Short title", "items": ["…"] },
  "es": { "title": "Título corto", "items": ["…"] },
  "de": { "title": "Kurzer Titel", "items": ["…"] }
}
```
Les 4 langues sont obligatoires, avec les mêmes points. Si l'app iOS change, monter aussi `MARKETING_VERSION` dans `ios/project.yml`.

Commit et push :
```bash
git add -A
git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit -m "Migration Next.js : v1.78.4 - description"
git push origin HEAD:main
```
Pas de ligne de co-auteur IA. Le site se déploie seul (1 à 3 min) ; attendre la version en ligne :
```bash
until curl -s https://ethone.dev/version.json | grep -qF 1.78.4; do sleep 10; done
```

## 4. Déployer le bot (après un changement dans `discord-bot/`)

```bash
ssh vps 'cp -r ~/dashboard/discord-bot/data ~/backups/data-$(date +%Y%m%d-%H%M) && cd ~/dashboard && git checkout -- discord-bot/package-lock.json; git pull -q origin main && pm2 restart ethone-bot --update-env >/dev/null && sleep 25 && pm2 logs ethone-bot --lines 60 --nostream | grep -iE "Connecté avec succès" | tail -1'
```
Si `discord-bot/package.json` a changé : `npm install` avant le restart. Logs : `ssh vps "pm2 logs ethone-bot --lines 200 --nostream"`.

## 5. Modifier des fichiers sans casser

- Beaucoup de fichiers sont en **CRLF** : un script qui réécrit un fichier doit détecter et garder le style de fin de ligne.
- **Pas de heredoc** pour les patchs Python sous Windows/Git Bash (échappements perdus, apostrophes françaises) : écrire le script dans un fichier, puis le lancer.
- Toujours vérifier que l'ancre existe exactement une fois **avant** d'écrire, pour éviter les écritures partielles.

```python
def patch(path, pairs):
    raw = open(path, encoding="utf-8", newline="").read()
    crlf = "\r\n" in raw
    t = raw.replace("\r\n", "\n")
    for old, new in pairs:
        assert t.count(old) == 1, (path, old[:80])
        t = t.replace(old, new, 1)
    open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", "\r\n") if crlf else t)
```

## 6. Vérifier « en vrai »

- **Site** : l'utilisateur est connecté sur ethone.dev dans son Chrome. On peut appeler l'API du bot depuis la page (`fetch('https://bot.ethone.dev/api/…', {credentials:'include'})`) et comparer avec ce que la page affiche. 401 partout = session bot expirée.
- **Ne rien écrire sur un vrai serveur Discord pendant un test** sans le dire ; noter la valeur d'origine et la restaurer.
- **Fausses données** : chercher `seed|demo|mock|fake|Math.random` côté bot et site ; comparer page et API. Corriger par vide, `—` ou une erreur claire.

## 7. E:VAL (iOS) : où sont les choses

- Vues : `ios/Ethone/Features/Valorant/Eval*.swift` (une app à part ouverte en plein écran depuis Ethone : `EvalAppView`, `EvalLauncherView`).
- Données : `ios/Ethone/Stores/ValorantStore.swift` ; compte Riot : `ios/Ethone/Services/RiotSession.swift` (page de connexion officielle, jetons dans le Keychain, appels `pd`/`glz` faits par le téléphone).
- HenrikDev passe **uniquement** par le Worker (`worker/src/services/valorant-eval.js`, routes `/api/valorant/eval/*`) : une synchro au plus toutes les 10 min par compte, matchs gardés une seule fois dans Supabase.
- Catalogues publics (agents, cartes, armes, skins, contrats, missions) : valorant-api.com, mis en cache sur le téléphone.
- Couleurs : toujours `EvalColors` (suivent le thème choisi) et `EvalAccent.color` (couleur d'accentuation), jamais une couleur sombre en dur.
- Images en mode « remplir » : les poser en `overlay` d'un cadre fixe puis `clipped()`, sinon elles élargissent la page.

## 8. Pièges déjà rencontrés

- Une route du bot qui fait `res.json(promesse)` renvoie `{}` : penser à `await`.
- `useSearchParams` sans `Suspense` casse le build statique.
- Pas de fond noir en dur sur le site : utiliser les variables de thème (`bg-[var(--bg-main)]`).
- Discord : noms de webhooks sans « clyde » ni « discord », `customId` ≤ 100 caractères, 100 commandes slash maximum (les raccourcis en trop restent en préfixe via `PREFIX_ONLY_SHORTCUTS`).
- Validation Zod obligatoire sur tout `PUT`/`PATCH` du bot.
- Tas mémoire : comparer `heapUsed` à `v8.getHeapStatistics().heap_size_limit`, pas à `heapTotal`.
- Ne pas contourner la détection anti-bot de YouTube sans demande explicite.

## 9. Secrets : commandes qui ne montrent jamais la valeur

L'utilisateur tape le secret dans son propre terminal, il ne passe jamais par le chat.

Variable du bot sur le VPS :
```bash
ssh -t vps 'read -rsp "Valeur de NOM : " v; echo; grep -v "^NOM=" ~/dashboard/discord-bot/.env > ~/.env.tmp; printf "NOM=%s\n" "$v" >> ~/.env.tmp; mv ~/.env.tmp ~/dashboard/discord-bot/.env; chmod 600 ~/dashboard/discord-bot/.env; unset v; pm2 restart ethone-bot --update-env'
```

Secret du Worker (wrangler demande la valeur) :
```bash
cd worker && npx wrangler secret put NOM_DU_SECRET
```

Un secret collé dans le chat est compromis : le faire régénérer, puis donner la commande ci-dessus.
