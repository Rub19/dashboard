# ETHONE — Gros tutoriel de passation (pour l'IA qui reprend)

> À lire **après** `HANDOFF.md` (état, reste à faire). Ce fichier explique **comment** travailler : les commandes, les scripts, les pièges, les méthodes de vérification, et comment refaire les outils qui étaient « locaux » chez la session précédente. Tout est écrit pour que tu puisses agir sans redemander.

---

## 0. L'état d'esprit demandé par l'utilisateur (à respecter partout)

1. **Aucune fausse donnée.** Pas de graine de démonstration, pas de succès simulé, pas de chiffre inventé, pas de « valeur plausible par défaut ». Sans donnée : `0`, `—` ou un état vide/erreur clair (« Bot injoignable »). C'est la règle n°1 ; la session précédente a passé l'essentiel de son temps à la faire respecter.
2. **Autonomie + honnêteté.** Tu agis, tu vérifies, tu rapportes exactement ce qui est fait et ce qui ne l'est pas. Si un test échoue, tu le dis avec la sortie. Tu ne dis « fait » que quand c'est vérifié.
3. **Français.** L'utilisateur écrit en français (souvent avec des fautes de frappe : comprends l'intention). Réponds en français, clairement, sans jargon inutile.
4. **Chaque lot = nouvelle version + deux changelogs**, puis **push direct sur `main`**.
5. **Secrets : jamais.** Si l'utilisateur colle un token, mot de passe, cookie ou clé : tu **refuses de l'utiliser**, tu lui dis de le **faire tourner (rotation) immédiatement**, et tu lui donnes une commande qui manipule le secret **sans l'afficher** (voir §9).

---

## 1. Carte du projet

```
C:\Claude\dashboard
├─ ethone-next/     Site (Next.js, export statique, hébergé sur Cloudflare Pages)
│   ├─ app/discord/**        une page par module Discord (…CenterClient.tsx = la vraie page)
│   ├─ components/           composants partagés (GuildSelector.tsx, ToastProvider…)
│   ├─ lib/hooks/            useBotGuildIds.ts (présence du bot, serveur résolu)
│   ├─ data/changelog.ts     changelog affiché dans le site (4 langues)
│   └─ scripts/release.js    ← script de release (voir §3)
├─ discord-bot/     Bot discord.js + API Express (https://bot.ethone.dev)
│   ├─ src/modules/<module>/ services, storage (JSON dans data/), types
│   ├─ src/server/routes/    routes HTTP consommées par le site
│   ├─ src/handlers/         commandHandler, eventHandler (branche les événements)
│   └─ test_*.ts             tests maison (voir §4)
├─ worker/          Cloudflare Worker (voir worker/ et WORKER_SECRETS_SETUP.md)
├─ CHANGELOG.md     changelog en français (racine)
├─ HANDOFF.md       état + reste à faire
├─ PLAN-NEXT-FEATURES.md   plan de fonctionnalités futures (copié depuis un dossier hors dépôt)
└─ AGENTS.md        notes de vérification d'origine du dépôt
```

- **Site ↔ bot** : le bot a son **propre cookie JWT**, cross-origin. Toute requête du site vers le bot doit avoir `credentials: "include"` ; un `EventSource` doit avoir `withCredentials: true`. Sans ça : 401.
- **Le bot stocke tout en fichiers JSON** dans `discord-bot/data/` (pas de base SQL). Beaucoup de « repository » sont donc des classes qui lisent/écrivent un JSON.
- **Déploiement** :
  - **Site** : automatique. Un `git push origin main` déclenche le build Cloudflare Pages. Compter 1–3 min, puis l'utilisateur voit le bandeau « Nouvelle mise à jour » (rafraîchissement forcé `Ctrl+Shift+R` sinon).
  - **Bot** : **manuel**. Rien côté bot n'agit tant qu'on n'a pas redéployé (§2).

---

## 2. Les commandes à connaître (à donner à l'utilisateur ou à lancer)

### Accès serveur
```bash
ssh vps        # VPS du bot : 141.94.237.150, utilisateur ubuntu (alias déjà configuré)
ssh nas        # NAS (Lavalink) : 192.168.1.60, port 46, utilisateur liphil
```

### Redéployer le bot (à faire faire à l'utilisateur après chaque lot qui touche `discord-bot/`)
```bash
ssh vps "cd ~/dashboard && git pull && cd discord-bot && pm2 restart ethone-bot --update-env"
```
Explication : `git pull` récupère le code, `pm2 restart` relance le process du bot, `--update-env` recharge les variables d'environnement. Si `package.json` du bot a changé, ajouter `npm install` avant le restart.

### Lire les logs du bot (pour diagnostiquer)
```bash
ssh vps "pm2 logs ethone-bot --lines 200 --nostream"
ssh vps "pm2 logs ethone-bot --lines 300 --nostream | grep Lavalink"     # musique : chronométrage par étape
ssh vps "pm2 status"                                                       # le process est-il vivant ?
```

### Vérifier le site (dans `ethone-next/`)
```bash
cd ethone-next
npx tsc --noEmit         # types (OBLIGATOIRE avant chaque commit)
npx jest                 # tests unitaires (152 au moment de la passation)
npm run build            # build complet (vérifie aussi les pages statiques / Suspense)
npm run lint
```

### Vérifier le bot (dans `discord-bot/`)
```bash
cd discord-bot
npx tsc --noEmit
```

### Lancer un test du bot (`test_*.ts`)
Ces tests écrivent dans `<cwd>/data`. **Il faut les lancer depuis un dossier temporaire** pour ne pas polluer `discord-bot/data` :
```bash
T=$(mktemp -d)
cd $T
DISCORD_TOKEN=dummy CLIENT_ID=1 npx --prefix /c/Claude/dashboard/discord-bot tsx /c/Claude/dashboard/discord-bot/test_onboarding_v1.ts
```
Suites de référence et scores à la passation : `test_onboarding_v1` 19, `test_welcome_analytics_v1` 14, `test_voice_stay_v1` 29, `test_log_webhooks_v1` 21, `test_music_v1` 31, `test_events_v2` 10/10, `test_forms_v2` 32, `test_polls_v2` 28, `test_ai_v2` 24. Il y a ~20 fichiers `test_*.ts` : lance ceux du module que tu touches.

### Git
```bash
git add -A
git commit -m "vX.Y.Z: résumé" -m "Co-Authored-By: <ton attribution>"
git push origin HEAD:main
```
On pousse **directement sur `main`** (voulu par l'utilisateur). Les avertissements « CRLF will be replaced by LF » sont normaux (Windows) ; ils sont bénins.

---

## 3. Le script de release (`ethone-next/scripts/release.js`) — à utiliser à CHAQUE lot

**Ce qu'il fait** : (1) met à jour `version` dans `ethone-next/package.json`, (2) ajoute une entrée dans les **4 langues** (fr/en/es/de) de `ethone-next/data/changelog.ts`, (3) ajoute une section en haut de `CHANGELOG.md` (racine, en français).

**Usage** (toujours depuis `ethone-next/`, car les chemins sont relatifs) :
```bash
cd ethone-next
node scripts/release.js 1.27.11 2026-09-22 /chemin/vers/rel.json
```
Le fichier JSON contient une entrée par langue :
```json
{
  "fr": { "title": "Titre court", "items": ["Ce qui a changé (phrase complète, avec le pourquoi).", "Autre point."] },
  "en": { "title": "Short title", "items": ["What changed.", "Other point."] },
  "es": { "title": "Título corto", "items": ["Qué cambió.", "Otro punto."] },
  "de": { "title": "Kurzer Titel", "items": ["Was sich geändert hat.", "Weiterer Punkt."] }
}
```
Règles : les **4 langues sont obligatoires**, mêmes nombre d'éléments, mêmes sujets. Décris le **problème vu par l'utilisateur** puis la correction (pas de jargon de code). Le script refuse une version déjà présente. Si tu dois le recréer : la logique est exactement celle-ci (regex sur `"version": "…"`, insertion avant `export const CHANGELOG = CHANGELOG_BY_LANG.fr;`, et insertion avant la première section `## v` de `CHANGELOG.md`).

> Remarque : le dépôt contient aussi `scripts/bump-release.mjs` (ancien outil, fonctionne avec un `release-notes.json`). Le workflow de la session précédente utilisait `release.js` ; garde-le, il est simple et sûr.

**Recette d'un lot complet** (à recopier) :
1. Modifier le code.
2. `npx tsc --noEmit` (site et/ou bot) + tests du module + `npx jest` + `npm run build` si le site a changé.
3. Écrire `rel.json` (4 langues) puis `node scripts/release.js <version> <date> rel.json`.
4. `git add -A && git commit … && git push origin HEAD:main`.
5. Dire à l'utilisateur **quoi redéployer** (bot = commande du §2 ; site = automatique) et **quoi vérifier**.

---

## 4. Comment modifier plusieurs fichiers sans casser (méthode « script de patch »)

La session précédente a modifié des dizaines de pages en série. Les pièges vécus, et la méthode qui marche :

**Pièges** :
- **Les heredocs perdent les échappements** (`\x1b`, `\n`, `\\`) : un patch Python passé en heredoc `python - <<'EOF'` a plusieurs fois échoué silencieusement. → **Écris le script dans un fichier avec l'outil d'écriture, puis lance-le.**
- **CRLF vs LF** : beaucoup de fichiers sont en CRLF (Windows). Un script qui réécrit un fichier doit **détecter et préserver** le style.
- **Ancres fragiles** : si l'ancre du motif change d'une page à l'autre (variable `m` vs `match`), le remplacement rate.

**Gabarit sûr (Python)** :
```python
import re

def load(path):
    raw = open(path, encoding="utf-8", newline="").read()
    return raw, raw.replace("\r\n", "\n")        # on travaille en LF

def save(path, raw, t):
    open(path, "w", encoding="utf-8", newline="").write(t.replace("\n", "\r\n") if "\r\n" in raw else t)

def match_end(s, start, open_ch, close_ch):
    """Index juste après la parenthèse/accolade/crochet fermant, en ignorant ceux dans les chaînes."""
    depth, i, in_str = 0, start, None
    while i < len(s):
        c = s[i]
        if in_str:
            if c == "\\": i += 2; continue
            if c == in_str: in_str = None
        else:
            if c in "\"'`": in_str = c
            elif c == open_ch: depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0: return i + 1
        i += 1
    raise AssertionError("bracket")

raw, t = load(p)
assert "ancre attendue" in t, "ancre introuvable"      # ← TOUJOURS asserter AVANT d'écrire
t = t.replace("ancre attendue", "remplacement", 1)
save(p, raw, t)                                          # ← on n'écrit qu'après tous les asserts
```
Règles : asserter **avant** d'écrire (aucune écriture partielle) ; rendre le script **idempotent** (« déjà fait » → passer) ; après chaque script, `npx tsc --noEmit`.

Pour supprimer une méthode entière (ex. une fonction de « seed ») : trouver l'en-tête, prendre la première `{` après, appeler `match_end(t, i, "{", "}")`, couper.

---

## 5. Vérifier « en vrai » avec Chrome (méthode de la session précédente)

L'utilisateur est **déjà connecté** sur `https://ethone.dev` (Chrome piloté par l'extension). Serveur de test : `1128633164290596884` (« On Joue à quoi ? (feur) ze »). Le bot est présent sur 3 serveurs.

**a) Appeler l'API du bot depuis la page** (le cookie est envoyé tout seul) :
```js
const B='https://bot.ethone.dev/api/guilds/1128633164290596884/';
const r = await fetch(B+'voice/overview',{credentials:'include'});
JSON.stringify(await r.json()).slice(0,900)
```
Routes globales : `https://bot.ethone.dev/api/bot/{overview,telemetry,jobs,integrations,errors,events,security,ai,performance?window=5m}`. Routes par module : `/api/guilds/:guildId/<module>/…` (liste dans `discord-bot/src/server/index.ts`).

**b) Voir quels appels une page fait et lesquels échouent** (après navigation + attente) :
```js
performance.getEntriesByType('resource')
  .filter(e=>e.name.includes('bot.ethone.dev'))
  .map(e=>e.name.replace('https://bot.ethone.dev','').slice(0,80)+' '+e.responseStatus)
```

**c) Mesurer si le texte « colle » au bord** (écart entre le bord de `<main>` et le texte le plus à gauche ; 0 = collé) :
```js
const main=document.querySelector('main'); const edge=main.getBoundingClientRect().left; let min=1e9;
const wk=document.createTreeWalker(main,NodeFilter.SHOW_TEXT); let n;
while(n=wk.nextNode()){ if(!n.textContent.trim()) continue;
  const r=document.createRange(); r.selectNodeContents(n); const b=r.getBoundingClientRect();
  if(b.width<2||b.top<0) continue; if(b.left<min) min=b.left; }
Math.round(min-edge)
```
(Sur écran très large, un grand écart est normal : conteneur centré.)

**d) Chercher des traces de données factices dans une réponse** : regex `usr_(alex|lucas|sarah)|unsplash|Alex|Lucas|Sarah|demo|exemple|mock`.

**Limites de l'outil Chrome** : il **bloque** l'affichage de tout ce qui ressemble à un cookie/JWT/query string dans les sorties JS (texte `[BLOCKED: …]`) → renvoie des **nombres/booléens/clés**, pas les URLs brutes. Les **iframes** de pages ethone.dev sont bloquées (cross-origin) et `window.open` est bloqué : **navigue page par page** (`navigate` puis `javascript_tool`). Les JS de navigation détruisent le contexte : ré-injecte tes fonctions après chaque navigation. Utilise `browser_batch` pour enchaîner navigate + JS sur plusieurs pages en un seul appel.

**Ne fais pas d'actions qui écrivent** sur le vrai serveur pendant un test sans le dire (un test a déjà envoyé un aperçu d'onboarding en DM à l'utilisateur, et un autre a écrit une valeur invalide qu'il a fallu restaurer). Si tu dois écrire, note la valeur d'origine et restaure-la.

---

## 6. La méthode « chasse aux fausses données » (à répéter sur les modules restants)

1. **Côté bot** (le plus grave : il écrit dans les vrais serveurs) :
   `grep -rniE "seed|demo|mock|fake|Math\.random|usr_alex|unsplash" discord-bot/src --include=*.ts`
   Repère : fonctions `seedDemoData…`, valeurs par défaut « plausibles » (`|| 24`, `Math.max(x, 14)`), listes codées en dur renvoyées par une route, `res.json({success:true})` qui ne fait rien.
2. **Côté site** : `grep -rniE "unsplash|// Seed|INITIAL_|MOCK|Démo|mode démo|fallback demo" ethone-next/app/discord`.
   Repère : un `catch` qui remplit l'écran avec des données d'exemple, un `useState(SEED)`, un « (mode démo) » sur un toast de succès.
3. **En vrai** : ouvre la page dans Chrome (§5) et compare avec la réponse de l'API. Si l'API est vide et la page affiche des chiffres → faux côté site. Si l'API elle-même renvoie des données inventées → faux côté bot.
4. **Corriger** : supprimer la donnée inventée ; remplacer par vide / `—` / erreur claire. **Si le faux est déjà enregistré sur disque côté bot**, ajouter une **purge** au démarrage qui retire *uniquement* les entrées factices repérées par leurs identifiants précis (modèle : `voiceRepository.purgeDemoData`, `inviteRepository.purgeDemoData`).
5. Vérifier tests + `tsc`, release, push, dire à l'utilisateur de redéployer le bot.

Cas **déjà traités** : vocal, événements, invitations, gestion du serveur, profils, centre de contrôle (diagnostics/intégrations/tâches/incidents/événements/télémétrie), onboarding, accueil, logs, musique, niveaux. Cas **laissés volontairement** : formulaires/sondages/IA injectent des exemples uniquement dans un faux serveur `123456789012345678` (jamais visible d'un vrai serveur ; leurs tests en dépendent). À nettoyer proprement en réécrivant les tests.

---

## 7. Pièges techniques rencontrés (ne les refais pas)

- **`res.json(promise)`** : si tu rends une fonction du bot asynchrone, `tsc` ne signale **pas** que la route sérialise une promesse (`{}`). Relis les appelants et mets `await`.
- **Paramètre d'URL `?guildId=` vs sélecteur** : l'effet qui applique le paramètre d'URL ne doit s'exécuter **qu'une fois par valeur** (ref `appliedQueryGuild`), sinon il annule le choix fait dans `GuildSelector`. Ne remets pas `selectedGuild` en dépendance qui réapplique l'URL.
- **`useSearchParams` sans `Suspense`** fait échouer le build statique. Les pages `page.tsx` enveloppent déjà le client dans `Suspense`.
- **Le tas mémoire** : compare `heapUsed` à `v8.getHeapStatistics().heap_size_limit`, jamais à `heapTotal` (qui grandit à la demande → 94 % faux).
- **Ne jamais donner un fond noir en dur** (`bg-black`) : utilise `bg-[var(--bg-main)]` (le thème choisi par l'utilisateur doit s'appliquer). Corrigé sur 42 fichiers en 1.27.10.
- **Les pages doivent avoir une marge horizontale** (`px-4 sm:px-6 lg:px-10`) ou un conteneur `max-w-* mx-auto`. Sans ça le texte colle à la barre latérale (les 3 pages vocales l'avaient).
- **Barres de progression** : pas de largeur minimale forcée (`Math.max(5, pct)`) : à 0 % la barre doit être vide.
- **Noms de webhooks Discord** : ne peuvent pas contenir « clyde » ni « discord », ≤ 80 caractères. **`customId` ≤ 100 caractères**. Boutons d'onboarding **sans état** : `onb:<action>:<guildId>:<userId>:<stepId>`.
- **Validation Zod obligatoire** sur tout `PUT`/`PATCH` du bot (un corps invalide est sinon stocké tel quel).
- **Événements du bot en mémoire seulement** : `discord-bot/src/modules/events/eventsRepository.ts` n'écrit rien sur disque → les événements créés disparaissent au redémarrage. À persister (JSON dans `data/`).
- **`logger.error` alimente le centre d'incidents** : ne journalise pas en boucle des erreurs « attendues ».
- **Ne pas contourner la détection anti-bot de YouTube (poToken)** sans demande explicite et éclairée de l'utilisateur.

---

## 8. Le reste à faire, avec la marche à suivre pas à pas

### 8.1 Latence au lancement d'une musique (demande de l'utilisateur, NON résolue)
*Contexte* : le bot « réfléchit » longtemps entre `/play` et le début du son. Chemin : recherche Spotify (métadonnées) → recherche Lavalink (`ytmsearch` puis `ytsearch`, séquentielles) → service **yt-dlp** (`directYoutube`, jusqu'à 25 s) → chargement du flux dans Lavalink.
1. L'utilisateur redéploie le bot (§2), lance un `/play`.
2. Lis `ssh vps "pm2 logs ethone-bot --lines 300 --nostream | grep Lavalink"` : deux lignes chronométrées existent déjà — `Recherche Spotify « … » : N ms` et `Préparation « … » : recherche N ms, flux yt-dlp/chargement N ms`.
3. Selon l'étape lente :
   - **Spotify lent** → mettre en cache les recherches récentes, ou lancer Spotify et la recherche YouTube **en parallèle**.
   - **Recherche Lavalink** → lancer `ytmsearch` et `ytsearch` **en parallèle** (`Promise.any` avec ordre de préférence) plutôt qu'en séquence.
   - **yt-dlp lent** (le cas probable) → dans `discord-bot/lavalink/yt-resolver/resolver.py`, réduire le travail de yt-dlp (options `player_client`, pas de sélection de format lourde, `--no-playlist`), garder un cache d'URL par ID (déjà 10 min côté bot) et **pré-résoudre** le titre suivant de la file.
   - **Ressenti** → répondre tout de suite (`deferReply` puis « ajouté à la file ») sans attendre le flux, et démarrer la lecture dès que le flux est prêt.
4. Refaire la mesure, comparer, release.
Fichiers : `discord-bot/src/modules/music/services/lavalinkManager.ts` (`resolve`, `directYoutube`, `ensureEncoded`), `lavalinkMusicPlayer.ts`, `commands/music/`.

### 8.2 Paramètres du bot (`botConfigService.ts`, `PUT /api/bot/settings`)
Aujourd'hui : valeurs en mémoire, jamais persistées ni appliquées ; le PUT répond « succès ». À faire : persister dans `data/bot_settings.json` (validation Zod), **appliquer réellement** au minimum `maintenanceMode` (refuser les commandes hors propriétaire avec `maintenanceReason`) et `logLevel` (filtrer `logger`), ou **retirer l'écran** côté site (`BotControlClient.tsx`, onglet Configuration). Retirer les libellés inventés (`alertWebhookUrlMasked` codé en dur).

### 8.3 Statistiques IA (`botAiMonitorService.ts`)
Fournisseur/modèle affichés = libellés fixes ; coût = estimation (50/50 prompt/completion, tarifs supposés) ; `successRate` = 100 % sans requête ; compteurs « 24 h » jamais remis à zéro. À faire : enregistrer le **vrai** fournisseur/modèle utilisé à chaque appel, une fenêtre glissante 24 h, `—` sans requête, et l'étiquette « estimation » sur le coût.

### 8.4 Centre de contrôle côté site (`ethone-next/app/discord/bot/BotControlClient.tsx`, ~3000 lignes)
Vérifier chaque onglet avec les nouvelles réponses réelles : liste d'intégrations **variable** (3 aujourd'hui, type `lavalink` ajouté), tâches à 0 exécution, `latency` à 0 → afficher `—`, `version` lue du bot (`package.json` du bot = `1.0.0`, à faire correspondre à la version du site si souhaité), état « dégradé » sans raison.

### 8.5 Passe Chrome sur les modules restants
Déjà passés : niveaux, vocal, événements, invitations, sauvegardes, gestion du serveur (code), accueil, logs, musique. **À parcourir** : tickets, modération (+ automod, rapports, cas), sécurité (anti-raid, anti-nuke), IA, économie, rôles, commandes, suggestions, stats serveur, calendrier, giveaways, starboard, sticky, rappels, AFK, anniversaires, tags, highlights. Pour chacun : §5 (API vs page) + §6 (fausses données) + clic sur chaque bouton.

### 8.6 Nettoyage restant
- Formulaires/sondages/IA : retirer les seeds (faux serveur) en réécrivant `test_forms_v2`, `test_polls_v2`, `test_ai_v2` pour qu'ils créent leurs données.
- Persister les événements (§7).
- Normaliser CRLF/LF avec un `.gitattributes` (`* text=auto`).

### 8.7 Fonctionnalités prévues (`PLAN-NEXT-FEATURES.md`)
Porte de vérification anti-bot à l'arrivée d'un membre, module économie « Crédits ETHONE », suivi d'habitudes (Supabase), refonte du centre de contrôle en 5 groupes. **Vérifie dans le code ce qui existe déjà** (le module économie a déjà routes/commandes/page ; le plan date d'avant plusieurs lots) avant de coder, et **valide avec l'utilisateur** avant un gros chantier.

---

## 9. Secrets : comment donner des commandes qui ne montrent jamais la valeur

Principe : **l'utilisateur tape le secret dans son propre terminal**, il ne passe jamais par le chat.

Ajouter/changer une variable du bot sur le VPS (saisie masquée, jamais affichée ni écrite dans l'historique) :
```bash
ssh -t vps 'read -rsp "Valeur de OPENROUTER_API_KEY : " v; echo; grep -v "^OPENROUTER_API_KEY=" ~/dashboard/discord-bot/.env > ~/.env.tmp; printf "OPENROUTER_API_KEY=%s\n" "$v" >> ~/.env.tmp; mv ~/.env.tmp ~/dashboard/discord-bot/.env; chmod 600 ~/dashboard/discord-bot/.env; unset v; pm2 restart ethone-bot --update-env'
```
Explication : `read -rs` lit sans écho ; on retire l'ancienne ligne, on ajoute la nouvelle, on protège le fichier (`chmod 600`), on vide la variable et on redémarre le bot.

Secret d'un Worker Cloudflare (la valeur est demandée par wrangler, pas passée en argument) :
```bash
cd worker && npx wrangler secret put NOM_DU_SECRET
```
Voir `WORKER_SECRETS_SETUP.md`.

Si un secret a été collé dans le chat : **le considérer comme compromis**, dire de le **régénérer** (portail Discord/OpenRouter/etc.), puis donner la commande ci-dessus pour la nouvelle valeur.

---

## 10. Petit lexique et repères utiles

- **Guilde** = serveur Discord. **Hub** (vocal) = salon « Créer mon salon ». **Onboarding** = parcours d'accueil (DM avec boutons). **Lavalink** = serveur audio Java ; **yt-dlp resolver** = petit service Python qui donne l'URL directe d'un flux YouTube. **pm2** = gestionnaire de process Node sur le VPS.
- **Version actuelle à la passation** : v1.27.10 (site). Historique dans `CHANGELOG.md`.
- **Dernier état vérifié en direct** : intégrations Discord/Lavalink/yt-dlp saines ; 14 tâches planifiées mesurées ; incidents vides ; événements/calendrier vides ; sauvegardes réelles (7).
- **Quand tu es bloqué sur une décision qui est vraiment celle de l'utilisateur** (ex. supprimer un écran plutôt que le corriger), pose **une** question claire ; sinon choisis le défaut raisonnable, dis-le, et avance.

Bon courage — et surtout : **pas de chiffres inventés**.
