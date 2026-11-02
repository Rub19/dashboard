# Passation Ethone Ecosystem

État au 2 novembre 2026. À lire en premier par toute nouvelle IA ou tout nouveau développeur.

## Où est le code

| Quoi | Dépôt | Branche ou dossier |
|---|---|---|
| Ethone Desktop, Ethone Setup, catalogue, documentation | `Rub19/dashboard` | `feature/ethone-ecosystem`, dossiers `desktop/` et `docs/ecosystem/` |
| Site ethone.dev, bot, Worker, apps iOS et Android | `Rub19/dashboard` | `main` |
| Kairo | `Rub19/ethra` | `main` |
| HDV Tracker | `Rub19/hdv-tracker` (privé) | `main` |
| Nova PC Suite | `Rub19/nova-pc-suite` | `main` |
| Interior OS | `Rub19/Interior-OS` (privé) | `main` |
| Ethone Breach | `Rub19/ethone-breach` | `main` |

Sur le PC de Rub19, le worktree de la branche est `C:\Claude\ethone-ecosystem`. Le checkout `C:\Claude\dashboard` reste sur `main`.

## Règles à respecter

- Parler en français, simplement, sans jargon. Rub19 n'est pas forcément développeur.
- Ne dire « fait » que ce qui a été vérifié. Dire clairement ce qui n'a pas été testé.
- Aucune fausse donnée, aucun faux bouton.
- Tout push sur `main` de `dashboard` déploie ethone.dev. Ne jamais intégrer la branche à `main` sans accord explicite.
- Tout push sur `main` de `ethone-breach` arrive en production par le Worker.
- Commits : auteur `Rub19 <rub19.mailpro@gmail.com>`, aucune ligne de co-auteur IA, zéro commentaire dans le code.
- Ajouter les fichiers un par un : `.mcp.json` n'est pas ignoré. Jamais `git add -A` dans `dashboard`.
- Les hooks ne sont pas activés : lancer `node ./scripts/precommit-upload-check.mjs` avant de committer.
- Ne jamais demander, afficher ni utiliser un secret collé dans le chat.
- Ne jamais saisir le mot de passe réel de Rub19. Tester la connexion sur un serveur local (`ETHONE_AUTH_BASE`, en build debug seulement).
- Ne pas contrôler le PC ni capturer l'écran sans demander. Pas de fenêtre de test ni de gros build sans accord : Rub19 peut être en jeu.
- Aucune publication de release sans le mot explicite de Rub19.
- Pour toute interface : soigner comme une vraie application Windows, pas comme un site dans une fenêtre. Reprendre le motion d'ethone.dev (`desktop/src/motion.ts`).

## Décisions

Voir `decisions.md`. L'essentiel : chaque application garde son dépôt et son auto-update. Ethone Desktop les détecte par le registre Windows, lit leur flux signé et lance leur installeur signé. Il n'en copie pas le code. Connexion obligatoire avec le compte Ethone. Le jeton est en Rust, dans le Gestionnaire d'identifiants Windows.

## État réel

**Fait et vérifié**

- Audit des six dépôts : `audit.md`.
- Ethone Desktop : détection, vrais flux, signatures, installation de Kairo et HDV testée dans Windows Sandbox avant la refonte.
- Ethone Setup 0.1.0 : build complet et scénario réel réussi dans Windows Sandbox le 2 novembre 2026. Installation personnalisée d'Ethone, Kairo 0.3.3 et HDV Tracker 1.5.0, réparation, refus d'un module inconnu, protection pendant l'exécution et désinstallation sélective vérifiés.
- Connexion réelle confirmée par Rub19.
- Interface Windows : Mica, navigation, lignes dépliables.

**Écrit mais pas vérifié en réel**

- Mise à jour d'Ethone : impossible à tester sans une première release.
- Agrandissement de la fenêtre, interface sombre avec Mica : à confirmer par Rub19.
- Refonte du dashboard : carte des capacités, plan, navigation Accueil/Applications/Productivité et synthèse réelle écrits. Notes et Tâches passent par la session Rust et le Worker, avec lecture, création, modification, complétion et suppression reliées. Le 2 novembre 2026, l'exécutable release a restauré la vraie session, affiché l'Accueil, les cinq applications et une vraie tâche Worker. Le formulaire de tâche a été ouvert puis annulé sans modifier les données. Neuf tests frontend, contrôle TypeScript, build Vite, 49 tests Rust Desktop et 36 tests Rust Setup réussis. Les mutations réelles Notes/Tâches restent à vérifier sans sacrifier une donnée de Rub19.
- Lancement `tauri dev` : Vite ignore désormais `src-tauri/target` et `setup/target`, car Windows verrouille les exécutables Rust et provoquait `EBUSY`. Test de régression ajouté.

## Reste à faire, dans l'ordre

1. **Continuer la refonte du dashboard d'Ethone en vraie version Windows, tout-en-un avec les applications.** L'inventaire des 170 pages et l'ordre sont validés. Suivre `dashboard-capabilities.md`, `SPEC-desktop-foundation.md` et `tasks/todo.md`, avec de vraies données Supabase et Worker en passant par la session Rust.
2. Flux signé pour Nova (`Rub19/nova-pc-suite`).
3. Breach : releases signées, fenêtre dédiée, hors ligne.
4. Mobile, puis services. Voir `roadmap.md`.

## Ce que l'IA ne reçoit pas par GitHub

Ces éléments restent sur le PC et ne doivent jamais être committés ni collés dans un chat :

- `~/.tauri/ethone-updater.key`, `kairo-updater.key`, `hdv-updater.key`, `interior-studio.key` : à sauvegarder. Les perdre met fin aux mises à jour automatiques.
- `.dev.vars`, `.env`, les connexions `ssh vps`, `wrangler` et Supabase.

## Commandes utiles

Depuis `desktop/` :

```bash
npm install
npm run tauri dev
npx tsc --noEmit
node tools/build-setup.mjs "Notes de version"
```

Depuis `desktop/src-tauri/` puis `desktop/setup/` :

```bash
cargo test
```

Autres documents : `decisions.md`, `roadmap.md`, `audit.md`, `desktop/README.md`, ainsi que `HANDOFF.md` et `AGENTS.md` à la racine pour le site.
