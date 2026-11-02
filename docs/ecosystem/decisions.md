# Décisions techniques

Validées par Rub19 le 2 novembre 2026, sauf mention contraire.

## 1. Chaque application garde son dépôt

Le code de Kairo, HDV Tracker, Nova PC Suite, Interior OS et Ethone Breach reste dans son dépôt. `dashboard` contient Ethone Desktop, le catalogue et l'intégration. Une amélioration de Kairo se fait dans `Rub19/ethra`, sans toucher `dashboard`.

## 2. Ethone Desktop en Tauri 2

Les quatre applications Windows sont déjà en Tauri 2. Leurs flux utilisent minisign, que Rust vérifie directement. Electron n'apporterait qu'un rendu identique partout, au prix d'un Chromium embarqué.

## 3. Ethone orchestre, il ne remplace pas

Un module est un programme Windows séparé. Ethone lit le registre pour connaître l'état réel, lit le flux du module pour connaître la version, puis lance l'installeur signé du module. Une application installée sans Ethone est donc détectée.

## 4. Pas de conflit entre updaters

- Une seule source par module : son flux.
- Même paquet signé, donc même résultat, quel que soit celui qui installe.
- Ethone n'installe rien si le module tourne. Il revérifie juste avant de lancer l'installeur, car l'installeur de Kairo utilise `taskkill /F`.
- Interior Studio se met à jour lui-même, car sa sauvegarde des données a lieu dans l'application avant l'installation.
- Nova PC Suite n'est pas installé directement tant qu'il n'a pas de flux signé.

## 5. Le catalogue est embarqué pour l'instant

Limite connue : ajouter un module ou changer une compatibilité demande une nouvelle version d'Ethone. Une nouvelle version d'un module, elle, n'en demande pas. Un catalogue distant signé viendra avec les releases d'Ethone.

## 6. Le web n'est pas déplacé

`ethone-next/` reste à sa place, car tout push sur `main` déploie le site par Cloudflare Pages. Le travail se fait sur `feature/ethone-ecosystem`, dans un worktree séparé, et n'ajoute que `desktop/`, `docs/ecosystem/` et `.github/workflows/desktop.yml`.

## 7. Le mobile existant est conservé

`ios/` et `android/` restent natifs. Un module ne s'installe pas sur mobile : les règles d'Apple l'excluent et Kairo a besoin du client Riot local.

## 8. Pas de compte à la première version

Trois systèmes existent : Supabase pour ethone.dev, un autre projet Supabase pour Interior, Discord + D1 pour HDV. Aucune fusion n'est prévue. Une connexion optionnelle pourra reprendre le flux navigateur + code de HDV.

## 9. Isolation réaliste

Des processus séparés sous le même compte Windows peuvent lire les fichiers les uns des autres. Seuls des modules officiels signés sont acceptés, chaque clé ne vaut que pour son module, Ethone ne tourne jamais en administrateur. Les modules tiers restent fermés.

## 10. Direction visuelle

Console : barre latérale, tableau dense, palette `Ctrl+K`.

## 11. Pas de SDK pour l'instant

Le contrat est le format du catalogue, versionné par `schemaVersion`. Une bibliothèque partagée attendra un premier consommateur réel.
