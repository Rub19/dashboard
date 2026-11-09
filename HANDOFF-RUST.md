# Handoff : Ethone Desktop en Rust natif

Branche `claude/ethone-rust-natif-dba200`, worktree `C:\Claude\dashboard\.claude\worktrees\ethone-rust-natif-dba200`. Rien n'est publié, rien n'est fusionné dans `main`, le code Tauri est toujours là. Détail page par page : `desktop/docs/RUST_PARITY.md`.

## Règles à garder

- Pas de suppression de Tauri avant l'OK de Rub19 sur la liste d'essais ci-dessous. Pas de fusion dans `main`, pas de publication sans son accord.
- Ne jamais commiter `desktop/src-tauri/src/habits.rs`. `git add` avec des chemins précis, puis `node ./scripts/precommit-upload-check.mjs`.
- Commits : `git -c user.name=Rub19 -c user.email=rub19.mailpro@gmail.com commit`, sans ligne de co-auteur IA.
- Zéro commentaire dans le code, pas de fausses données ni de faux boutons, ne pas dire « fait » sans vérifier.
- Compiler en priorité basse avec `-j 4`, même si un jeu tourne. Aucune fenêtre visible pendant un jeu (`javaw`, League of Legends, VALORANT).
- Pas de capture du bureau ni de contrôle de la souris. Ne jamais toucher à Defender : signaler s'il bloque un fichier.
- Le mot de passe de Rub19 est tapé par lui seul. Aucun essai qui envoie, supprime ou installe sur ses vraies données.

## Organisation (`desktop/native`)

| Dossier | Rôle |
|---|---|
| `engine` | Moteur sans Tauri : session, Riot, Discord, catalogue, installation, journal |
| `app` | Interface Slint 1.18 et logique. Exe `ethone-native`, installé sous le nom `ethone.exe` |
| `setup` | Installeur Rust et Slint, sans NSIS |
| `tools/release.mjs` | Construit, empaquette, signe et écrit `latest.json` dans `target/publish`, sans publier |

## Fait et vérifié

Vérifié dans le vrai exe, hors écran, connecté au compte de Rub19 :

- 112 sections et onglets ouverts sans erreur, dont les 46 modules Discord.
- 29 étapes d'interaction par événements Slint : clics, retour et suivant, Ctrl+1 à 9, Ctrl+virgule, Ctrl+B, Ctrl+K, Alt+flèches, F5, Échap, molette, listes, panneaux, clic droit, petite fenêtre.
- Saisie lettre par lettre, Ctrl+F, focus clavier rendu après navigation.
- Thèmes en direct, dont le thème clair. E:VAL Jeu et Hub avec les jetons Riot obtenus par la fenêtre web cachée.
- Reprise des réglages Tauri, lue sur une copie des vraies données (38 clés).
- Installeur dans un dossier et des clés de test : interface, `/S`, `/P /UPDATE`, `/R` (relance déjà connecté), désinstallation qui garde les données. Tout cela dans le conteneur MSIX de Claude, où le registre et `%LOCALAPPDATA%` sont redirigés.
- Logo Ethone sur l'exe, la fenêtre, la barre des tâches, les fenêtres web et l'installeur.
- `release.mjs` avec une clé jetable : signature acceptée par le moteur, fichier modifié refusé.
- HDV Tracker renommé Argus, avec repli sur l'ancien `hdv-tracker.exe` vu sur la vraie installation 1.5.0. Nouveaux logos d'Argus et de Kairo.
- Tests au dernier passage complet : 85 + 1 moteur, 128 app, 1 installeur.

## Reste à faire

### Essais de Rub19 (bloquent la suppression de Tauri)

1. Installation réelle, hors du conteneur : générer l'installeur avec `node desktop/native/tools/release.mjs`, lancer `desktop\native\target\publish\Ethone_0.2.0_x64-setup.exe`. Vérifier qu'Ethone s'ouvre connecté, avec son thème, son accent et ses épingles, et le logo dans le menu Démarrer, la barre des tâches et la zone de notification.
2. Fenêtre : déplacer, redimensionner, agrandir, réduire, fermer vers la zone de notification et rouvrir, lancement avec Windows, plusieurs écrans.
3. Clavier et souris physiques : Ctrl+K, Ctrl+Alt+E depuis une autre app, Alt+flèches, boutons latéraux de la souris.
4. Connexion : déconnexion, mot de passe, code e-mail, Google, GitHub, Discord par le navigateur, liens `ethone://`.
5. E:VAL : fenêtre de connexion Riot, vidéo d'un skin, onglet En direct pendant une partie. E:LOL : En direct pendant une partie, TFT avec des parties.
6. Mail : lecture d'un mail, envoi d'un mail de test, envoi programmé, étiquette.
7. Fichiers : ajout, lien de partage.
8. Productivité : créer, terminer, supprimer une tâche de test, minuteur avec son d'ambiance.
9. Applications : mettre à jour Kairo ou Argus, ouvrir une app dans Ethone, Argus en arrière-plan.
10. Discord : activer et couper un module sur un serveur de test, créer un rappel.
11. Notification Windows à l'arrivée d'un mail, thème Windows (Mica), réduction du mouvement, sons, animations vues en mouvement.
12. Brain : envoyer un message, Entrée et Maj+Entrée. Spotify : clic sur la barre de lecture, clic sur la capsule.

### Après son OK

- Supprimer le code Tauri sur la branche (`desktop/src-tauri`, `desktop/setup`, `desktop/src`, dépendances npm) et adapter `scripts` et `.github/workflows/desktop.yml`. `native/engine` ne dépend plus de Tauri, mais `gen-data.mjs` lit `desktop/src` : le retirer ou l'adapter.
- Signaler que la branche est prête. La fusion et la publication restent décidées par Rub19.

### Publication (étape de Rub19)

`TAURI_SIGNING_PRIVATE_KEY` et son mot de passe, puis `release.mjs` : publier sous le tag `desktop-v0.2.0` l'installeur, `.sig`, `latest.json` et `Ethone-Setup-0.2.0.exe`. Sans cette signature, les apps Tauri installées ne reçoivent pas la version native.

### Encore possible

- Passe sur les animations et nouvelles fonctions utiles : à peine commencée (menus animés, Ctrl+Alt+E).
- L'installeur pèse 19,9 Mo contre 8,4 Mo avec NSIS, et le désinstalleur 9,2 Mo.
- Mémoire Tauri non mesurée. Natif sur l'Accueil : 196 Mo de mémoire de travail.
- Le journal montre des lancements de HDV Tracker bloqués le 3 novembre 2026 par Windows (virus ou logiciel indésirable signalé) : à regarder par Rub19, sans toucher à Defender.
- Le code Rust de Tauri n'a pas été recompilé depuis l'ajout de `Detect.legacy` et `Installed.exe`.

## Pièges

- Slint : un composant ou un `FocusScope` sans taille, placé hors d'un layout, peut valoir 0×0. Donner `width: 100%; height: 100%`.
- Slint : un nouveau `ModelRc` recrée les éléments, ce qui perd le focus et le survol. Utiliser `keep_rows` et le `Sync::apply` de `vm.rs`, qui mettent à jour sur place.
- Une somme de `f64` sur une liste vide donne `-0` : partir de `fold(0.0, ...)`.
- Fenêtre hors écran : -32000 est la coordonnée « réduite » de Windows, garder -10000. Windows la considère parfois réduite quand même : relancer un test qui échoue au hasard. Les tests de saisie doivent envoyer une lettre par `type`, avec une attente entre chaque.
- Les tournées hors écran changent les sections mémorisées dans `native-prefs.json`. Retirer la clé `ethone-migrated-from-tauri` pour réimporter les réglages Tauri au lancement suivant.
- Git Bash abîme les backslashes et les options `/X` dans les heredocs, `printf`, `reg` et `makensis` : écrire scripts et patchs dans des fichiers.
- Le `release` ne contient pas le harnais : les essais hors écran passent par le profil `fast` avec `--features drive`.
- Le build `fast` et le `release` partagent la vraie session (coffre `dev.ethone.desktop`). Le build debug utilise un coffre séparé. L'app native refuse de démarrer si le `ethone.exe` Tauri tourne.
- `ethone-setup.exe` seul ne contient pas l'app : il faut passer par `--pack` ou `release.mjs`.

## Commandes (depuis `desktop/native`)

```bash
cargo test --workspace -j 4
```

```bash
cargo build -p ethone-native --profile fast --features drive -j 4
```

```bash
ETHONE_DRIVE_OFFSCREEN=1 ETHONE_DRIVE=<script.txt> ./target/fast/ethone-native.exe
```

Commandes du script de test : `wait`, `go`, `act`, `snap`, `dump`, `state` (avec `ETHONE_DRIVE_LOG`), `click`, `rclick`, `move`, `wheel`, `type`, `key`, `ctrl`, `alt`, `size`, `quit`.

```bash
cargo build -p ethone-native -p ethone-setup --release -j 4
```

```bash
target/release/ethone-setup.exe --pack target/release/ethone-native.exe target/release/Ethone_0.2.0_x64-setup.exe
```

Test de l'installeur sans toucher à l'Ethone installé : `ETHONE_SETUP_TEST=1`, plus `ETHONE_SETUP_OFFSCREEN=1` ou `ETHONE_SETUP_SNAP=<dossier>`.
