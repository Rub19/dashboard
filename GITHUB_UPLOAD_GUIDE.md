# ETHONE - Guide de securite pour les uploads GitHub

Dernier audit local : **14 juillet 2026**

Ce document est la reference unique avant tout commit, push, import GitHub ou
creation d'archive du projet ETHONE.

## Regle absolue

1. Un secret ne va jamais dans le depot, meme dans un commit temporaire.
2. Un fichier genere ou local ne va jamais dans le depot source.
3. En cas de doute, ne pas ajouter le fichier et executer le controle de securite.

Le scanner n'affiche jamais la valeur d'un secret. Il affiche uniquement le
fichier et la categorie du probleme.

## Workflow recommande avant chaque commit

```powershell
git rev-parse --is-inside-work-tree
powershell -ExecutionPolicy Bypass -File .\scripts\install-git-hooks.ps1
node .\scripts\precommit-upload-check.mjs --all
git status --short
git diff --cached --name-only
git commit -m "Description claire"
```

Le hook `.githooks/pre-commit` relance automatiquement :

- le controle des fichiers locaux et des secrets ;
- l'audit de securite du runtime ETHONE.

Ne pas utiliser `git commit --no-verify` pour contourner ce controle. GitHub
Actions execute aussi le scanner et bloque le deploiement si un probleme entre
malgre tout dans le depot.

## Alerte sur l'etat Git actuel

Au moment de cet audit, `C:\Chatgot\.git\` existe mais ne contient pas de depot
Git valide. La commande `git rev-parse` echoue donc actuellement.

- `.git/` est une donnee locale : elle ne doit jamais etre uploadee manuellement.
- Ne pas supprimer ce dossier sans avoir verifie s'il doit etre restaure depuis
  un clone ou une sauvegarde.
- Si ETHONE doit devenir volontairement un nouveau depot, sauvegarder le projet,
  puis executer `git init`, configurer le remote et installer le hook.
- Tant que Git n'est pas valide, ne pas preparer un upload manuel de tout le
  dossier : utiliser strictement la liste autorisee ci-dessous.

## Fichiers a ne jamais uploader

### Environnements et variables locales

```text
.env
.env.local
.env.production
.env.development
.env.test
.env.*
.dev.vars
.dev.vars.*
```

Exception : `.env.example` peut etre versionne uniquement avec des placeholders
vides ou clairement fictifs. Il ne doit jamais contenir une vraie valeur.

### Secrets et identifiants

Ne jamais uploader :

- Supabase `service_role` ou tout JWT portant le role `service_role` ;
- secrets OAuth Google, GitHub, Discord ou Spotify ;
- GitHub Personal Access Tokens ou fine-grained tokens ;
- Cloudflare API Tokens, secrets Workers et Account IDs prives ;
- cles privees OpenAI, Anthropic, Groq, Gemini ou autre fournisseur IA ;
- secrets Stripe, Slack, AWS ou Google Cloud ;
- mots de passe, access tokens et refresh tokens ;
- cles SSH, cles privees PEM, certificats et profils de signature ;
- fichiers JSON de credentials, service accounts ou exports OAuth ;
- URLs contenant directement un identifiant et un mot de passe.

Les secrets CI doivent etre places dans **GitHub > Settings > Secrets and
variables > Actions**. Le depot ne doit contenir que des references comme :

```text
${{ secrets.NOM_DU_SECRET }}
```

Note Supabase : une cle `anon` ou `publishable` est concue pour le frontend si
et seulement si le Row Level Security est actif et fail-closed. La cle
`service_role` reste toujours privee.

### Dossiers reserves a la machine locale

```text
local-only/
private/
secrets/
development-only/
credentials/
.agents/
.wrangler/
.supabase/
supabase/.temp/
.vercel/
.netlify/
.vscode/
.idea/
```

### Donnees utilisateur et sessions

Ne jamais uploader :

- bases locales `*.db`, `*.sqlite`, `*.sqlite3` et journaux associes ;
- cookies, sessions et profils navigateur ;
- `auth-state/`, `storage-state/` et `playwright/.auth/` ;
- access tokens, refresh tokens ou captures de stockage local ;
- exports de notes, fichiers, profils ou activites d'utilisateurs ;
- sauvegardes contenant des donnees personnelles.

### Dependances, builds et rapports generes

```text
node_modules/
dist/
build/
out/
coverage/
security-reports/
playwright-report/
test-results/
artifacts/
screenshots/
captures/
```

Le dossier `dist/` est reconstruit automatiquement par
`scripts/prepare-pages-artifact.mjs`. Il ne doit pas etre versionne.

### Logs, caches, traces et fichiers temporaires

Ne jamais uploader :

- `*.log`, logs npm/yarn/pnpm et dossier `logs/` ;
- crash dumps `*.dmp`, `*.dump` et fichiers `core` ;
- `.cache/`, `.tmp/`, `.temp/`, `tmp/`, `temp/` ;
- `.parcel-cache/`, `.turbo/`, `.vite/`, `.eslintcache` ;
- traces navigateur `*.har` et `trace.zip` ;
- source maps `*.map` ;
- sauvegardes `*.bak`, `*.backup`, `*.old`, `*.orig` ;
- archives locales `*.zip`, `*.7z`, `*.rar`, `*.tar`, `*.tgz` ;
- `.DS_Store`, `Thumbs.db`, `Desktop.ini` et metadonnees OS.

## Fichiers a uploader dans le depot source

Les chemins suivants appartiennent actuellement au projet ETHONE et doivent
etre presents sur GitHub :

### Racine

```text
.gitignore
.gitattributes
.nojekyll
404.html
CNAME
GITHUB_UPLOAD_GUIDE.md
index.html
manifest.webmanifest
SECURITY.md
sw.js
_headers
```

### Code et assets produit

```text
v8/
icons/
```

Ces dossiers contiennent le runtime V8, les styles, les composants, les pages,
les traductions, les icones et les assets PWA utilises en production.

### Infrastructure, securite et automatisation

```text
.github/workflows/
.githooks/
infra/cloudflare/
scripts/
supabase/migrations/
tests/
```

Les migrations Supabase doivent rester versionnees. Elles decrivent le schema
et les politiques RLS ; elles ne doivent contenir aucune donnee utilisateur ni
aucun secret.

### Fichiers standards futurs a versionner

S'ils sont ajoutes plus tard et ne contiennent aucun secret :

```text
README.md
LICENSE
package.json
package-lock.json
wrangler.toml
tsconfig.json
eslint.config.js
```

`wrangler.toml` peut etre versionne pour la configuration publique. Les valeurs
privees Cloudflare doivent rester dans `.dev.vars` ou dans les secrets GitHub.

## Depot source et artifact de deploiement

Le depot GitHub contient le code source, les tests et l'infrastructure.

L'artifact GitHub Pages est plus petit. Le script de build publie uniquement :

```text
.nojekyll
404.html
CNAME
index.html
manifest.webmanifest
sw.js
icons/
v8/
```

Il est normal que `tests/`, `scripts/`, `supabase/`, `infra/` et `.github/`
soient dans le depot source mais absents du site deploye.

## Dossier local-only

Le dossier `local-only/` a ete cree a la racine et est ignore dans son
integralite.

Il peut recevoir :

- captures temporaires ;
- exports de diagnostic ;
- donnees de test locales ;
- fichiers de configuration personnels ;
- brouillons et fichiers de comparaison ;
- sauvegardes locales provisoires.

Ne jamais conserver l'unique copie d'un fichier important dans `local-only/`.
Pour une vraie sauvegarde, utiliser un stockage chiffre hors du depot.

## Decision pour artifacts

Etat au 14 juillet 2026 : **aucun dossier `artifacts/` n'est present**.

Decision :

- `artifacts/` reste ignore par Git ;
- toute capture de QA ou sortie automatisee future peut y rester localement ;
- son contenu peut etre supprime apres validation s'il n'a plus d'utilite ;
- une image necessaire au produit doit etre deplacee vers `icons/` ou un dossier
  d'assets produit sous `v8/`, puis referencee explicitement par le code ;
- ne jamais deplacer automatiquement une capture de QA dans les assets produit.

## Rapport d'audit du projet actuel

| Statut | Chemin ou groupe | Decision |
|---|---|---|
| ✅ A envoyer | `index.html`, `404.html`, `manifest.webmanifest`, `sw.js` | Entrees et runtime PWA |
| ✅ A envoyer | `_headers`, `CNAME`, `.nojekyll` | Configuration de publication |
| ✅ A envoyer | `v8/` | Code produit V8 actif |
| ✅ A envoyer | `icons/` | Identite, favicon et icones PWA |
| ✅ A envoyer | `.github/workflows/` | CI et deploiement GitHub Pages |
| ✅ A envoyer | `.githooks/`, `scripts/` | Controles locaux et production gate |
| ✅ A envoyer | `tests/` | Tests de non-regression et de securite |
| ✅ A envoyer | `supabase/migrations/` | Schema et politiques RLS |
| ✅ A envoyer | `infra/cloudflare/` | Documentation d'infrastructure publique |
| ✅ A envoyer | `SECURITY.md`, ce guide | Politique et procedure de securite |
| ⚠ A verifier | `docs/superpowers/plans/2026-07-13-production-security-hardening.md` | Plan interne utile mais non requis au runtime ; conserver ou archiver selon la politique documentaire |
| ⚠ A verifier | `.git/` | Dossier vide/non valide au moment de l'audit ; metadata locale, jamais a uploader |
| ❌ Ne pas envoyer | `local-only/` | Zone privee locale explicitement ignoree |
| ❌ Ne pas envoyer | `.agents/` | Etat local d'outillage ; dossier actuellement vide |
| ❌ Ne pas envoyer | `dist/` | Build genere par la CI ; actuellement absent |
| ❌ Ne pas envoyer | `artifacts/`, captures et rapports | Actuellement absents ; toujours ignores |
| ❌ Ne pas envoyer | environnements, credentials, sessions, bases et logs | Aucun fichier de ce type detecte pendant l'audit |
| 🗑️ Peut etre supprime | builds, rapports, caches et captures generes | Suppression locale possible apres verification |
| 🗑️ Peut etre supprime | `.agents/` s'il reste vide | Ne contient actuellement aucun fichier projet |
| 📦 A archiver | plans internes devenus historiques | Archiver hors depot si leur historique n'est plus utile au projet |
| 📦 A archiver | sauvegardes contenant des donnees | Stockage chiffre hors GitHub uniquement |

Resultat final de cet audit : **PASS**. Le garde-fou d'upload a controle `114`
fichiers candidats et l'audit de securite existant a controle `93` fichiers
texte, sans secret prive detecte. Le nouveau scanner ajoute la verification des
chemins interdits, tokens connus, valeurs sensibles hardcodees, JWT
`service_role`, fichiers volumineux et donnees d'authentification.

## Que faire si le scanner bloque un commit

1. Ne pas contourner le hook.
2. Lire le chemin et la categorie affiches.
3. Retirer le fichier de l'index avec `git restore --staged <chemin>`.
4. Deplacer le fichier local dans `local-only/` si necessaire.
5. Remplacer toute valeur privee par une variable d'environnement ou un secret
   GitHub.
6. Relancer `node scripts/precommit-upload-check.mjs --all`.

Si un vrai secret a deja ete pousse, le supprimer dans un nouveau commit ne
suffit pas. Il faut immediatement le revoquer ou le faire tourner, verifier les
logs d'acces, puis nettoyer l'historique Git avec une sauvegarde et une procedure
revue par une seconde personne.

## Checklist finale avant upload

- [ ] `git rev-parse --is-inside-work-tree` repond `true`.
- [ ] Le hook ETHONE est installe.
- [ ] Le scanner `--all` affiche `PASS`.
- [ ] `git status --short` ne contient aucun fichier inattendu.
- [ ] La liste staged ne contient ni `.env`, ni secret, ni artifact.
- [ ] Les migrations ne contiennent aucune donnee utilisateur.
- [ ] Les nouvelles images sont reellement necessaires au produit.
- [ ] Les GitHub Actions referencent des Secrets, jamais leurs valeurs.
- [ ] Aucun fichier n'a ete ajoute avec `git add -f` pour contourner le guide.
- [ ] La production gate ETHONE passe avant le push.
