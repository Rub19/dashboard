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

`[x]` veut dire vu dans le vrai exe, connecté au compte de Rub19, par une capture de la fenêtre de l'app seule (`window.take_snapshot()`, harnais `--features drive`). Les captures du 6 novembre 2026 ont été prises hors écran (`ETHONE_DRIVE_OFFSCREEN=1`), sans clic sur un envoi, une suppression ou une installation. `[~]` veut dire écrit, compilé et couvert par les tests automatiques, mais pas vu en réel. `[ ]` veut dire pas encore porté.

Tests : 85 pour le moteur, 123 pour l'app.

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
- [~] Attribution Slint dans À propos

## Connexion

- [x] Écran de connexion : mot de passe, code par e-mail, Google, GitHub, Discord, liens
- [x] Session restaurée au lancement
- [~] Connexion par mot de passe, code par e-mail, navigateur, double authentification, code de secours
- [~] Mode hors ligne, déconnexion

## Interface commune

- [x] Barre latérale : groupes, page active, profil, bouton de réduction
- [x] Barre de titre : précédent, suivant, recherche, cloche, boutons de fenêtre
- [x] Menus de section des pages, lecteur Spotify flottant
- [~] Transitions de page, retour de la position de défilement
- [x] Palette Ctrl+K : ouverture au clavier, recherche, résultats, au-dessus de tout
- [x] Cloche, panneau latéral, listes déroulantes, menu du compte
- [~] Toasts, annulation, menu contextuel, infobulles
- [~] Raccourcis clavier et boutons de souris
- [x] Réglages d'apparence : 9 thèmes, 8 accents, langue, densité
- [~] Changement de thème en direct, Mica de Windows, réduction du mouvement, sons d'interface

## Pages

- [x] Accueil : salutation, Spotify, mails non lus, rangs VALORANT et League, météo, concentration, tâches, derniers mails, applications
- [x] Applications : versions installées, mises à jour disponibles, boutons
- [~] Installer, mettre à jour, ouvrir dans Ethone, HDV Tracker en arrière-plan
- [x] Productivité : tâches
- [~] Calendrier, notes, mémo, capture rapide, habitudes, concentration et ambiance, factures
- [x] Fichiers : liste, recherche, état vide
- [x] Mail : boîte de réception, dossiers, menu de gestion
- [~] Lecture d'un mail (fenêtre web séparée), envoi, report, étiquettes, modèles, signatures
- [x] Équipe : membres, invitation, espaces
- [x] E:VAL : profil, rang actuel et meilleur rang, résumé, dernière session, filtres, matchs
- [x] E:VAL : Jeu (portefeuille, packs, boutique du jour, accessoires, passe, missions, équipement) et Hub (amis, groupe), avec les jetons Riot obtenus par la fenêtre web cachée
- [~] E:VAL : En direct, aperçu des skins et vidéos, connexion Riot visible
- [x] E:LOL : profil, rangs Solo et Flex, résumé, historique des LP, champions, matchs
- [x] E:LOL : panneau d'un match (tableau des deux équipes)
- [~] E:LOL : En direct, TFT, Rotation, Amis
- [x] Discord : serveurs, vue d'ensemble, modules du serveur
- [~] Discord : pages de modules, modération, membres, tickets, concours, suggestions, journal, musique, formulaires de création
- [x] Brain : discussion (état vide), menu Flows, Macros, Règles, Interactions, Personas
- [~] Brain : réponses, résumé du jour, automatisations
- [x] Analyses : activité
- [~] Analyses : statistiques mail, météo, RSS, diagnostic
- [x] Réglages : menu complet, Apparence
- [~] Autres sections des Réglages, Administration

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
| `tft.ts` | dans `pages/lol.rs`, sans test séparé |
| `mail.ts` | `logic/mail.rs` |
| `weather.ts` | `logic/weather.rs` |
| `friends.ts`, `friend-portraits.ts` | `logic/friends.rs` |
| `sounds.ts`, `ui-sound.ts` | `sounds.rs` |
| `riot-session.ts` | `logic/mod.rs` |
| `automations.ts` | `pages/brain_extras.rs` |

## Installeur

`native/installer/ethone-native.nsi` construit un installeur par utilisateur, sans droits administrateur. Il installe dans `%LOCALAPPDATA%\Programs\Ethone Native`, à côté de l'app Tauri sans la toucher, ajoute un raccourci au menu Démarrer et une entrée de désinstallation. La désinstallation garde la session et les données.

Construire (depuis `desktop/native`) :

```
cargo build -p ethone-native --release
cd installer
makensis -DVERSION=0.1.1 ethone-native.nsi
```

## Mesures

| | Tauri | Natif |
|---|---|---|
| Exe | 12,9 Mo, plus le runtime WebView2 de Windows | 23,9 Mo, tout compris (Slint, rendu, images, sons, fenêtre web annexe) |
| Mémoire sur l'Accueil | pas mesurée | 196 Mo de mémoire de travail, 166 Mo privés (build `fast`, fenêtre 1770×1140) |

La mémoire Tauri n'a pas été mesurée : lancer les deux apps à la suite aurait fait tourner le jeton de session deux fois pour rien.

## Pas encore vérifié

- Toutes les actions qui écrivent : envoi de mail, création, suppression, installation, mise à jour, réglages Discord.
- Les fenêtres web annexes : connexion Riot, vidéos des skins, lecture des mails.
- Connexion par navigateur et liens `ethone://`, zone de notification, notifications Windows, instance unique.
- Les animations et la réduction du mouvement, le changement de thème en direct, le thème Windows (Mica), les sons.
- Les raccourcis globaux, le glisser et le redimensionnement de la fenêtre, plusieurs écrans.
- L'installeur natif est construit mais jamais lancé (installer modifie le PC).
- La palette et les menus ouverts au clavier dans la vraie fenêtre affichée, hors harnais.
