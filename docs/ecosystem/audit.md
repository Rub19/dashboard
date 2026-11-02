# Audit des dépôts, 2 novembre 2026

## État

| Dépôt | Visibilité | Licence | Nature réelle | Version publiée |
|---|---|---|---|---|
| dashboard | public | aucune | Site Next.js, bot Etho, Worker, iOS, Android, extension | site 1.92.0 |
| ethra | public | aucune | Kairo : tracker LoL, VALORANT, TFT | 0.3.3 |
| hdv-tracker | privé | aucune | Carnet de prix Rinaorc, Worker + D1, fenêtre Tauri | 1.5.0 |
| nova-pc-suite | public | MIT | Diagnostic et maintenance Windows | 0.2.14 preview |
| Interior-OS | privé | aucune | Scanner iPhone et Studio 3D | 0.2.2 |
| ethone-breach | public | aucune | Jeu web sans dépendance | pas de release |

Aucune branche `main` n'est protégée. Les hooks `.githooks` de `dashboard` ne sont pas activés (`core.hooksPath` vide) : lancer les deux contrôles à la main avant de committer.

## Tests de référence

| Cible | Résultat du 2 novembre |
|---|---|
| Site, `npm run test:unit` | 387/387 |
| Worker, `npm test` | 317/317 |
| Interior OS, `npm test` | 137/137 |
| Nova, `npm test` | 53/53 |
| HDV Tracker, `node --test` | 18/18 |
| Breach, deux suites | 59/59 et 24/24 |
| Kairo | `tsc` sans erreur, aucun test automatisé |

Non exécutés : builds, Playwright, bot, tests PowerShell et Rust de Nova, Rust d'Interior, iOS, Android.

## Mécanismes de mise à jour

| Module | Flux | Signature | Comportement | Clé de registre |
|---|---|---|---|---|
| Kairo | `github.com/Rub19/ethra/releases/latest/download/latest.json` | minisign | Toutes les 30 min, installeur maison, `taskkill /F` | `Kairo` |
| HDV Tracker | `hdv.ethone.dev/updates/latest.json` | minisign | Toutes les 30 min, NSIS | `HDV Tracker` |
| Interior Studio | `interior.ethone.dev/updates/latest.json` | minisign | 4 s puis toutes les 6 h, sauvegarde dans l'application avant installation | `Interior Studio` |
| Nova PC Suite | Liste des releases GitHub (`releases/latest` répond 404, tout est en preview) | SHA-256 seul | Ouvre la page GitHub | `Nova PC Suite` |
| Ethone Breach | Aucun : le Worker lit `main` | aucune | Un push sur `main` arrive en production au prochain cache expiré | aucune |

## Risques relevés

- `dashboard` : 24 alertes Dependabot ouvertes le 2 novembre (2 critiques, 16 élevées, 5 moyennes, 1 faible). Les critiques portent sur `next`.
- `dashboard` : `.mcp.json` n'est pas ignoré. Ne jamais utiliser `git add -A`.
- Kairo, HDV et Interior : CSP désactivée. Nova a une CSP stricte, à prendre comme modèle.
- Kairo : le README dit « open source », mais il n'y a pas de fichier de licence.
- Clés de signature locales dans `~/.tauri/`. Les perdre met fin aux mises à jour des installations existantes.
- Aucune application n'a de signature Authenticode.
- Android ne produit qu'un build debug, iOS une IPA non signée.
- Breach : le Worker liste ses fichiers en dur. Ajouter un fichier JS demande de modifier le Worker.
- Non vérifié : conformité aux règles de Riot et de Rinaorc pour une distribution plus large, audit détaillé de l'élévation de Nova et du serveur Wi-Fi d'Interior.

Le rapport complet, avec les fiches par dépôt et la matrice des fonctionnalités, a été remis à Rub19 le 2 novembre 2026.
