# Parité Ethone Desktop : Tauri vers Rust natif

Interface Slint 1.18, logique Rust, sans WebView dans le processus principal. L'app Tauri reste en place tant que tout n'est pas coché.

Légende : `[x]` porté et vu dans le vrai exe, `[~]` porté, compilé et testé par les tests automatiques mais pas vu en réel, `[ ]` pas encore porté.

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

## Socle

- [~] Moteur séparé de Tauri, 85 tests
- [ ] Fenêtre sans cadre, déplacement, agrandissement, redimensionnement, position mémorisée sur plusieurs écrans
- [ ] Instance unique, liens `ethone://`
- [ ] Zone de notification, réduction à la fermeture, lancement avec Windows en réduit
- [ ] Notifications Windows
- [ ] Mise à jour d'Ethone (flux signé)
- [ ] Attribution Slint dans À propos

## Connexion

- [ ] Mot de passe, se souvenir de moi
- [ ] Code par e-mail
- [ ] Google, GitHub, Discord par le navigateur
- [ ] Double authentification, code de secours
- [ ] Liens inscription, récupération, mentions légales
- [ ] Session restaurée, mode hors ligne, déconnexion

## Interface commune

- [ ] Barre latérale : groupes, épingles, badges, réduction Ctrl+B, pastille active animée
- [ ] Barre de titre : précédent, suivant, recherche, cloche, boutons de fenêtre
- [ ] Transitions de page, retour de la position de défilement, pages gardées en mémoire
- [ ] Palette Ctrl+K : pages, sections, applications, récents, surlignage
- [ ] Cloche : journal des notifications
- [ ] Toasts, annulation, menu contextuel, infobulles
- [ ] Listes déroulantes, onglets, navigation de section, panneau latéral
- [ ] Raccourcis : Ctrl+1 à 9, Ctrl+virgule, Ctrl+B, Ctrl+F, F5, Alt+flèches, boutons de souris, Échap
- [ ] 9 thèmes, 8 accents, clair et sombre, Windows
- [ ] Densité, taille du texte, réduction du mouvement, transparence, contraste
- [ ] Français et anglais
- [ ] Sons d'interface

## Accueil

- [ ] Salutation, date, état de connexion, choix des blocs
- [ ] Musique, mails non lus, VALORANT, League, météo, concentration
- [ ] Agenda et tâches du jour, habitudes cochables, derniers mails, applications

## Applications et installation

- [ ] Détection, version, flux, politique de mise à jour
- [ ] Installer, mettre à jour, ouvrir, page des versions, progression, erreurs
- [ ] Épingler, ouvrir dans Ethone, retour, ouvrir à part
- [ ] HDV Tracker en arrière-plan

## Productivité

- [ ] Tâches, calendrier, notes, mémo, capture rapide, habitudes, concentration et ambiance, factures

## Fichiers, Mail, Équipe

- [ ] Fichiers : Drive, envoi par morceaux, partage
- [ ] Mail : liste, lecture, envoi programmé, report, étiquettes, modèles, signatures
- [ ] Équipe

## E:VAL

- [ ] Connexion Riot, plusieurs comptes
- [ ] Profil, rang, résumé, session, matchs, tableau, manches, éliminations, filtres
- [ ] En direct
- [ ] Jeu : portefeuille, boutique, packs, accessoires, passe, récompense, missions, équipement, aperçu des skins
- [ ] Hub : classement, amis, recherche, cartes, agents, armes, collection, groupe

## E:LOL

- [ ] Profil, En direct, TFT, Rotation, Amis, historique des LP

## Discord

- [ ] Connexion, serveurs, vue d'ensemble, moteur de modules, pages sur mesure, formulaires de création

## Brain

- [ ] Discussion, résumé du jour, Flows, Macros, Personas, Interactions, Règles

## Analyses

- [ ] Activité, statistiques mail, météo, RSS, diagnostic

## Réglages

- [ ] Apparence, Windows et notifications, raccourcis, confidentialité, synchronisation, stockage, performance, accessibilité, espace de travail, avancé
- [ ] Profil, connexions, appareils, double authentification, clés d'accès, journal de sécurité, IA, À propos, Administration

## Logique portée avec ses tests

| Fichier TS | Module Rust | État |
|---|---|---|
| Tous les `src/*.ts` et `*.test.mjs` | `native/app/src/logic` | [ ] |

## Mesures

À remplir sur le build release : taille de l'exe et mémoire au repos, Tauri contre natif.
