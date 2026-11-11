# Parité Ethone Desktop : Tauri vers Rust natif

Interface Slint 1.18, logique Rust, sans WebView dans le processus principal. L'app Tauri reste en place tant que tout n'est pas coché.

## Organisation

| Dossier | Rôle |
|---|---|
| `native/engine` | Moteur sans Tauri : connexion, session, Riot, Discord, catalogue, installation, journal |
| `native/app` | Interface Slint, logique portée depuis `src/*.ts`, fenêtre web annexe |
| `src-tauri` | App Tauri actuelle, qui lit le moteur dans `native/engine` |

## Sauvegarde des identités

Au premier lancement, `safety::backup_identities` copie `session`, `riot-identity` et `discord-bot` vers des entrées `*-avant-natif` du Gestionnaire d'identifiants. Une sauvegarde existante n'est jamais écrasée.

Le jeton de rafraîchissement change à chaque usage : si l'app Tauri tourne en même temps avec l'ancien jeton, sa prochaine connexion échoue et efface la session. L'app native refuse donc de démarrer tant qu'`ethone.exe` (Tauri) est ouvert.

## Ce qui demande vraiment une page web

| Besoin | Décision | Pourquoi |
|---|---|---|
| Connexion Riot RSO | Petite fenêtre `wry`, processus séparé | Riot n'accepte que sa page officielle et le retour vers playvalorant.com. Les cookies servent à la reconnexion silencieuse. |
| Vidéos des skins VALORANT | Petite fenêtre `wry`, processus séparé | Slint ne lit pas la vidéo. Seuls les hôtes de la CSP actuelle sont autorisés. |
| `EmbeddedApp` | Pas de web | C'est `SetParent` sur la fenêtre Windows de l'autre application. Il suffit du HWND. |
| Spotify | Pas de web | Le lecteur lit `api/spotify/now-playing`. La liaison du compte s'ouvre déjà dans le navigateur. |
| Connexion Google, GitHub, Discord | Pas de web | Navigateur par défaut et retour `ethone://`. |

Le processus principal ne charge jamais WebView2 : la fenêtre web est un second lancement de l'exe, fermé dès qu'il a fini.

## Comment c'est vérifié

`[x]` veut dire vu dans le vrai exe, connecté au compte de Rub19, par une capture de la fenêtre de l'app seule (`window.take_snapshot()`, harnais `--features drive`). Les captures ont été prises hors écran (`ETHONE_DRIVE_OFFSCREEN=1`), sans clic sur un envoi, une suppression ou une installation. Les interactions ont été jouées avec de vrais événements Slint envoyés à la fenêtre (`dispatch_event` : clics, molette, survol, clic droit, clavier), et chaque section a été ouverte puis vérifiée par son contenu. `[~]` veut dire écrit, compilé et couvert par les tests automatiques, mais pas vu en réel. `[ ]` veut dire pas encore porté.

Tests : 85 pour le moteur, 125 pour l'app, 1 pour l'installeur.

## Socle

- [x] Moteur séparé de Tauri, session partagée avec l'app Tauri (même coffre en build release)
- [x] Sauvegarde des identités avant le premier lancement natif
- [~] Fenêtre sans cadre, déplacement, agrandissement, redimensionnement, position mémorisée sur plusieurs écrans
- [x] Instance unique : un second lancement transmet son lien `ethone://` à la fenêtre ouverte et se ferme en 0,1 s
- [~] Traitement des liens `ethone://` reçus (connexion Google, GitHub, Discord)
- [x] Logo Ethone sur l'exe (ressource Windows, avec nom, éditeur et version), la fenêtre, la barre des tâches et les fenêtres web
- [~] Logo de la zone de notification (même image que Tauri, pas vue)
- [~] Raccourci global Ctrl+Alt+E : ouvre Ethone et la recherche depuis n'importe où (nouveau)
- [~] Zone de notification, réduction à la fermeture, lancement avec Windows en réduit
- [~] Notifications Windows
- [~] Mise à jour d'Ethone (flux signé)
- [x] Attribution Slint dans À propos

## Connexion

- [x] Écran de connexion : mot de passe, code par e-mail, Google, GitHub, Discord, liens
- [x] Session restaurée au lancement
- [~] Connexion par mot de passe, code par e-mail, navigateur, double authentification, code de secours
- [~] Mode hors ligne, déconnexion

## Interface commune

- [x] Barre latérale : groupes, page active, profil, bouton de réduction
- [x] Barre de titre : précédent, suivant, recherche, cloche, boutons de fenêtre
- [x] Menus de section des pages, lecteur Spotify flottant
- [x] Molette dans les pages et les menus de section, le menu suit la section active, barre réduite automatiquement en petite fenêtre
- [~] Transitions de page, retour de la position de défilement
- [x] Palette Ctrl+K : ouverture au clavier, recherche, résultats, au-dessus de tout
- [x] Cloche, panneau latéral, listes déroulantes, menu du compte
- [x] Menu du clic droit, infobulles au survol, surbrillance qui suit la souris
- [~] Toasts, annulation
- [x] Raccourcis dans l'app : Ctrl+1 à 9, Ctrl+virgule, Ctrl+B, Ctrl+K, F5, Alt+flèches, Échap
- [~] Boutons précédent et suivant de la souris
- [x] Réglages d'apparence : 9 thèmes, 8 accents, langue, densité
- [x] Changement de thème en direct, y compris le thème clair
- [~] Mica de Windows, réduction du mouvement, sons d'interface
- [ ] Émojis en couleur : le moteur de texte n'affiche pas les polices couleur, un carré ou un point apparaît à la place

## Pages

- [x] Accueil : salutation, Spotify, mails non lus, rangs VALORANT et League, météo, concentration, tâches, derniers mails, applications
- [x] Applications : versions installées, mises à jour disponibles, boutons
- [x] HDV Tracker renommé Argus, nouveaux logos d'Argus et de Kairo. Argus est cherché dans `%LOCALAPPDATA%\\Argus\\argus.exe` (clé `Argus`), avec repli sur l'ancien `hdv-tracker.exe` tant qu'Argus n'est pas publié : repli vu sur la vraie installation 1.5.0
- [~] Installer, mettre à jour, ouvrir dans Ethone, Argus en arrière-plan (`--background`, `--stop-background`)
- [x] Productivité : tâches, calendrier, notes, mémo, capture rapide, habitudes, concentration, factures (affichage)
- [~] Productivité : création, modification, suppression, sons d'ambiance
- [x] Fichiers : liste, recherche, état vide
- [x] Mail : boîte de réception, dossiers, menu de gestion
- [x] Mail : dossiers, contacts, adresses, étiquettes, règles, modèles, signatures (affichage)
- [~] Lecture d'un mail (fenêtre web séparée), envoi, report
- [x] Équipe : membres, invitation, espaces
- [x] E:VAL : profil, rang actuel et meilleur rang, résumé, dernière session, filtres, matchs
- [x] E:VAL : Jeu (portefeuille, packs, boutique du jour, accessoires, passe, missions, équipement) et Hub (amis, groupe), avec les jetons Riot obtenus par la fenêtre web cachée
- [x] E:VAL : En direct (sans partie en cours)
- [~] E:VAL : En direct pendant une partie, aperçu des skins et vidéos, connexion Riot visible
- [x] E:LOL : profil, rangs Solo et Flex, résumé, historique des LP, champions, matchs
- [x] E:LOL : panneau d'un match (tableau des deux équipes)
- [x] E:LOL : En direct (sans partie en cours), TFT (sans partie), Rotation, Amis
- [~] E:LOL : En direct pendant une partie, TFT avec des parties
- [x] Discord : serveurs, vue d'ensemble, modules du serveur
- [x] Discord : les 46 modules ouverts sans erreur, modération, membres, tickets, concours, suggestions, journal, musique, réglages
- [~] Discord : enregistrement des réglages, actions, formulaires de création
- [x] Brain : discussion (état vide), menu Flows, Macros, Règles, Interactions, Personas
- [x] Brain : résumé du jour, Flows, Macros, Règles, Interactions, Personas (affichage)
- [~] Brain : réponses, exécution des automatisations
- [x] Analyses : activité
- [x] Analyses : statistiques mail, météo, RSS, diagnostic
- [x] Réglages : menu complet, Apparence
- [x] Réglages : toutes les sections (affichage)
- [~] Administration (réservée aux comptes administrateurs), actions qui modifient le compte

## Logique portée avec ses tests

| Fichier TS | Module Rust |
|---|---|
| `navigation.ts`, `pinned.ts` | `logic/navigation.rs`, `logic/mod.rs` |
| `palette-search.ts` | `logic/palette.rs` |
| `settings.ts` | `logic/settings.rs` |
| `spotify.ts` | `logic/spotify.rs` |
| `home.ts` | `logic/home.rs` |
| `productivity.ts`, `tasks.ts` | `logic/productivity.rs` |
| `eval.ts`, `match-filter.ts` | `logic/eval.rs`, `logic/mod.rs` |
| `lol.ts` | `logic/lol.rs` |
| `tft.ts` | `logic/tft.rs` |
| `mail.ts` | `logic/mail.rs` |
| `weather.ts` | `logic/weather.rs` |
| `friends.ts`, `friend-portraits.ts` | `logic/friends.rs` |
| `sounds.ts`, `ui-sound.ts` | `sounds.rs` |
| `riot-session.ts` | `logic/mod.rs` |
| `automations.ts` | `pages/brain_extras.rs` |

## Installeur et passage depuis Tauri

L'installeur est écrit en Rust et Slint, sans NSIS : `native/setup`. Il porte l'app compressée à la fin de son fichier, porte le logo Ethone, suit le style de l'app (fond sombre, halos, bordure animée, transitions courtes, réduction du mouvement respectée) et s'installe par utilisateur, sans droits administrateur. Écrans : accueil (ou mise à jour, avec la version installée), progression, terminé, erreur avec « Réessayer », et désinstallation. Options : raccourci sur le bureau, lancement avec Windows. Il prend la place de l'app Tauri au même endroit : `%LOCALAPPDATA%\Ethone\ethone.exe`, mêmes clés `Software\Rub19\Ethone` et `Uninstall\Ethone`, même raccourci du menu Démarrer, même lancement avec Windows (`Ethone`, `--minimized`).

Il accepte les arguments du programme de mise à jour Tauri : `/P` et `/UPDATE` (progression seule, fermeture automatique), `/S` (sans fenêtre), `/R` (relance). Il dépose en `uninstall.exe` une copie de lui-même sans l'app : la désinstallation retire l'app, les raccourcis et les clés, puis se supprime elle-même. Une app Tauri installée peut donc recevoir la version native par sa mise à jour automatique, à condition de publier ce fichier dans `latest.json` avec la signature de la clé de mise à jour Tauri (étape de publication de Rub19).

Ce qui est gardé :

- la session Ethone, l'identité Riot et le bot Discord : même Gestionnaire d'identifiants (`dev.ethone.desktop`), l'installeur n'y touche pas ;
- les réglages : au premier lancement, l'app native lit une copie du stockage local de l'app Tauri (WebView2) et reprend toutes les clés `ethone-*`, une seule fois ;
- les données : `%LOCALAPPDATA%\dev.ethone.desktop` reste en place, la désinstallation ne le supprime pas.

Testé : sur une copie des vraies données Tauri, 38 réglages relus. Passage complet dans un dossier et des clés de test (`ETHONE_SETUP_TEST=1`), à partir d'une copie de l'app Tauri installée : par l'interface, en silencieux (`/S`) et comme mise à jour automatique (`/P /UPDATE`), `ethone.exe` 0.1.0 Tauri devient 0.1.1 natif, clés et raccourci mis à jour, réglages natifs intacts ; la désinstallation retire l'exe, le raccourci, les clés, `uninstall.exe` et le dossier, et garde les données. Les écrans ont été capturés hors écran (`ETHONE_SETUP_SNAP`). Ces essais tournent dans le conteneur MSIX de Claude, dont le registre et `%LOCALAPPDATA%` sont redirigés : l'installation réelle sur Windows reste à faire par Rub19.

Construire (depuis `desktop/native`) :

```
cargo build -p ethone-native -p ethone-setup --release
target/release/ethone-setup.exe --pack target/release/ethone-native.exe target/release/Ethone_0.1.1_x64-setup.exe
```

## Préparer une version

`node desktop/native/tools/release.mjs` construit l'app et l'installeur, signe avec la clé Tauri (`TAURI_SIGNING_PRIVATE_KEY`) et écrit `latest.json` dans `target/publish`. Rien n'est publié. Essayé avec une clé jetable : signature acceptée par le moteur, fichier modifié refusé. L'app native est en 0.2.0, au-dessus de la dernière version Tauri publiée (0.1.1).

## Mesures

| | Tauri | Natif |
|---|---|---|
| Exe | 12,9 Mo, plus le runtime WebView2 de Windows | 24,3 Mo, tout compris (Slint, rendu, images, sons, fenêtre web annexe) |
| Installeur | 8,4 Mo (NSIS) | 19,9 Mo (Rust et Slint, app compressée incluse) |
| Désinstalleur installé | 0,08 Mo | 9,2 Mo |
| Mémoire sur l'Accueil | pas mesurée | 196 Mo de mémoire de travail, 166 Mo privés (build `fast`, fenêtre 1770×1140) |

La mémoire Tauri n'a pas été mesurée : lancer les deux apps à la suite aurait fait tourner le jeton de session deux fois pour rien.

## Pas encore vérifié

- Toutes les actions qui écrivent : envoi de mail, création, suppression, installation, mise à jour, réglages Discord.
- Les fenêtres web annexes : connexion Riot, vidéos des skins, lecture des mails.
- Connexion par navigateur et liens `ethone://`, zone de notification, notifications Windows.
- Les animations vues en mouvement et la réduction du mouvement, le thème Windows (Mica), les sons.
- Les raccourcis globaux, le glisser et le redimensionnement de la fenêtre, plusieurs écrans.
- L'installation réelle sur Windows, hors du conteneur de Claude, et la mise à jour automatique depuis l'app Tauri (latest.json signé).
- Le clavier et la souris physiques dans la vraie fenêtre affichée : tout a été joué par événements Slint, hors écran. Les boutons latéraux de la souris passent par winit et n'ont pas pu être joués ainsi.

## 20 fonctionnalités en plus (demandées le 10 novembre 2026)

`[ ]` à faire, `[x]` fait et vérifié (tests ou parcours e2e), avec la preuve dans « Fait ensuite » ou ici.

- [~] 1. Minuteur Pomodoro dans la barre de titre : le minuteur de concentration existant (15/25/45/60 min) s'affiche dans la barre de titre quand il tourne ou est en pause, un clic ouvre le minuteur ; il avance désormais sur toutes les pages (avant, une séance finie ailleurs n'était enregistrée qu'au retour sur Productivité) ; e2e écrit (démarrer, voir, recommencer), à lancer après la partie
- [x] 2. « Ne pas déranger pendant 1 h » d'un clic depuis la cloche (la plage horaire des réglages existe déjà) : bouton dans le panneau de la cloche : silence 1 h (quiet_until dans les préférences, respecté par toutes les notifications Windows), « Silence jusqu'à HH:MM » + Réactiver ; e2e 94 étapes
- [~] 3. Historique du presse-papiers (texte, local, effaçable) : réglage « Historique du presse-papiers » (désactivé par défaut, le couper efface tout), 25 derniers textes, formats privés des gestionnaires de mots de passe ignorés, tiroir depuis Ctrl+K avec Copier et Tout effacer ; test clips, e2e 104 étapes (tiroir désactivé) ; la capture active n'a pas été essayée pour ne pas toucher à ton presse-papiers
- [x] 4. Calculatrice et conversions dans Ctrl+K : logic/calc.rs : + − × ÷ %, parenthèses, virgule, km/mi kg/lb cm/in m/ft l/gal °C/°F ; Entrée copie le résultat ; tests et e2e (12 * 3,5 = 42)
- [x] 5. Pages favorites épinglées en haut de la barre latérale : Ctrl+K « Ajouter cette page aux favoris » (page + onglet ouvert), groupe « Favoris » en haut de la barre latérale, clic droit « Retirer des favoris », inclus dans l'export des réglages ; e2e 137 étapes (ajout, affichage, retrait)
- [ ] 6. Raccourcis clavier personnalisables
- [~] 7. Rappels de tâches en notification Windows : réglage « Rappeler les tâches du jour » (actif par défaut) : une notification Windows par jour à partir de 9 h avec les tâches du jour et celles en retard, respecte Ne pas déranger ; test morning_task_reminder_counts_today_and_late ; notification réelle pas vue, e2e (réglage présent) à lancer après la partie
- [~] 8. Tâches récurrentes (chaque jour, chaque semaine) : choix « Une seule fois / Chaque jour / Chaque semaine » dans l'éditeur de tâche (data.repeat, synchronisé) ; cocher une tâche récurrente crée la suivante à la prochaine date libre et l'annonce ; libellé dans la liste ; test repeating_tasks_land_on_the_next_free_day ; e2e écrit (éditeur sans rien créer), à lancer après la partie
- [ ] 9. Calendrier : vue semaine
- [ ] 10. Glisser-déposer pour réordonner les tâches
- [~] 11. Export des notes en Markdown : bouton « Exporter en Markdown » sur Notes : un fichier ethone-notes-AAAA-MM-JJ.md dans Téléchargements (titre, date, texte, plus récentes d'abord) ; test notes_markdown, e2e 157 étapes (bouton présent) ; pas cliqué pour ne rien écrire dans tes Téléchargements
- [x] 12. Recherche plein texte dans les notes et les tâches depuis Ctrl+K : Ctrl+K cherche aussi dans le titre et le texte des notes et des tâches (chargées à l'ouverture de la palette), Entrée ouvre l'élément dans Productivité ; e2e 169 étapes (« plombier » trouve ta vraie tâche)
- [ ] 13. Résumé du matin à la première ouverture du jour
- [~] 14. Thème clair ou sombre selon l'heure : réglage « Thème selon l'heure » dans Apparence : look « Jour » de 7 h à 19 h, ton look le soir, revérifié chaque minute ; test scheduled_look, e2e 147 étapes (réglage présent) ; bascule réelle pas vue (testé de nuit, réglage non touché)
- [ ] 15. Temps passé dans chaque jeu (VALORANT, League, Minecraft) par semaine
- [~] 16. Lancer une app du hub au démarrage d'Ethone : « Lancer avec Ethone : <app> » dans Ctrl+K et au clic droit d'une app épinglée ; au démarrage, Ethone lance les apps choisies installées et pas déjà ouvertes, sans les passer devant (jamais pendant les tests) ; test startup_targets, e2e 184 étapes (activé puis désactivé) ; lancement réel au démarrage pas essayé
- [ ] 17. Mini lecteur Spotify toujours devant
- [ ] 18. Journal des actions faites dans Ethone, avec annulation quand c'est possible
- [~] 19. Liste de lecture de liens à lire plus tard, gardée sur le PC (la concentration et les sons d'ambiance existent déjà) : coller un lien http(s) dans Ctrl+K propose « Garder pour plus tard », tiroir « À lire plus tard » (Ouvrir, Retirer), 200 liens max sur ce PC, inclus dans l'export des réglages ; test only_real_links_are_kept_for_later ; étapes e2e écrites, à lancer après la partie VALORANT
- [~] 20. Statistiques de concentration de la semaine : Concentration : barres des 7 derniers jours (minutes par jour au survol), total de la semaine, jours actifs, meilleur jour, depuis l'historique local des séances ; test focus_minutes_add_up_per_day ; e2e écrit, à lancer après la partie
