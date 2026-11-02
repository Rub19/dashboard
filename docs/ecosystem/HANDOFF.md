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
- Ethone Setup reconstruit le 2 novembre 2026 à 18 h 29 avec le code `b2e0a6b2` (Accueil, Productivité, Calendrier inclus). Le scénario silencieux complet réussit dans Windows Sandbox. Depuis environ 17 h 30, les fenêtres ne s'ouvrent plus dans la Sandbox (« Could not find the WebView2 Runtime ») : le Setup de 16 h 43, qui marchait, échoue pareil, donc la cause est l'environnement et non le code. Réaligner la version WebView2 du registre de la Sandbox ne corrige pas. Cause exacte inconnue. Sur le vrai PC, les fenêtres du nouveau Setup et d'Ethone s'ouvrent sans erreur, aucune installation n'y a été faite. Le parcours avec l'interface (clics dans Setup) n'a pas été testé sur ce build.
- Connexion réelle confirmée par Rub19.
- Interface Windows : Mica, navigation, lignes dépliables.
- Refonte visuelle Desktop : vrai logo Ethone, nouvelle direction sombre verre/teal, nouvelles icônes Kairo et HDV Tracker. Le build release a été ouvert et l'Accueil ainsi que la page Applications ont été contrôlés visuellement le 2 novembre 2026.

**Écrit mais pas vérifié en réel**

- Mise à jour d'Ethone : impossible à tester sans une première release.
- Agrandissement de la fenêtre, interface sombre avec Mica : à confirmer par Rub19.
- Refonte du dashboard : carte des capacités, plan, navigation Accueil/Applications/Productivité et synthèse réelle écrits. Notes, Tâches et Calendrier passent par la session Rust et le Worker, avec lecture et mutations reliées. Le 2 novembre 2026, l'exécutable release a restauré la vraie session, affiché l'Accueil, les cinq applications, une vraie tâche Worker et l'état réel vide du Calendrier. Les formulaires de tâche et d'événement ont été ouverts puis annulés sans modifier les données. Onze tests frontend, contrôle TypeScript, build Vite, 50 tests Rust Desktop et 36 tests Rust Setup réussis. Les mutations réelles restent à vérifier sans sacrifier une donnée de Rub19.
- Lancement `tauri dev` : Vite ignore désormais `src-tauri/target` et `setup/target`, car Windows verrouille les exécutables Rust et provoquait `EBUSY`. Test de régression ajouté.
- Photo de profil Desktop : la source Discord est rejetée, le profil Ethone est relu par `/api/profile`, et Rust charge uniquement les médias Ethone autorisés pour contourner la protection `same-origin` des avatars. Les tests de priorité, d'enveloppe Worker et de liste blanche passent. Le build Tauri release `--no-bundle` réussit, mais l'affichage final de la photo Bocchi/Kita reste à confirmer manuellement sans contrôle d'écran.
- Nouvelle direction visuelle (2 novembre 2026, non committée au moment de l'écriture) : barre verticale à icônes, trace de lumière animée reprise du logo, Accueil « Aujourd'hui » avec vraies tâches et vrais événements, et E:VAL repris de l'interface iOS (profil, rangs, résumé, session, matchs, tableau de match). E:VAL passe par `tracker_identity`, `tracker_sync` et `tracker_matches` côté Rust. L'interface a été contrôlée uniquement dans `desktop/preview.html`, avec des données d'exemple signalées à l'écran. Les vraies données du compte n'ont pas encore été vues dans l'application.
- Vérifications du lot identité du 2 novembre 2026 : 54 tests Rust Desktop, 11 tests frontend, contrôle TypeScript, build Vite et build Tauri release `--no-bundle` réussis.

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
