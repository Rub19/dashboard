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
- Refonte du dashboard : carte des capacités, plan, navigation Accueil/Applications/Productivité et synthèse réelle écrits. Notes, Tâches et Calendrier passent par la session Rust et le Worker, avec lecture et mutations reliées. Le 2 novembre 2026, l'exécutable release a restauré la vraie session, affiché l'Accueil, les cinq applications, une vraie tâche Worker et l'état réel vide du Calendrier. Les formulaires de tâche et d'événement ont été ouverts puis annulés sans modifier les données. Onze tests frontend, contrôle TypeScript, build Vite, 50 tests Rust Desktop et 36 tests Rust Setup réussis. Les mutations de tâches sont vérifiées en réel, voir plus bas.
- Lancement `tauri dev` : Vite ignore désormais `src-tauri/target` et `setup/target`, car Windows verrouille les exécutables Rust et provoquait `EBUSY`. Test de régression ajouté.
- Photo de profil Desktop : la source Discord est rejetée, le profil Ethone est relu par `/api/profile`, et Rust charge uniquement les médias Ethone autorisés pour contourner la protection `same-origin` des avatars. Les tests de priorité, d'enveloppe Worker et de liste blanche passent. Le build Tauri release `--no-bundle` réussit, mais l'affichage final de la photo Bocchi/Kita reste à confirmer manuellement sans contrôle d'écran.
- Nouvelle direction visuelle (2 novembre 2026, non committée au moment de l'écriture) : barre verticale à icônes, trace de lumière animée reprise du logo, Accueil « Aujourd'hui » avec vraies tâches et vrais événements, et E:VAL repris de l'interface iOS (profil, rangs, résumé, session, matchs, tableau de match). E:VAL passe par `tracker_identity`, `tracker_sync` et `tracker_matches` côté Rust. L'interface a été contrôlée uniquement dans `desktop/preview.html`, avec des données d'exemple signalées à l'écran. Le build release du 2 novembre 2026 (19 h 21) a affiché le vrai Accueil, les vraies applications et les vraies tâches. Une tâche « TEST Ethone Desktop » a été créée, terminée, modifiée puis supprimée sur le vrai compte, et la liste relue ensuite ne contient plus que la tâche existante, intacte. La connexion Riot par fenêtre Ethone a été faite par Rub19 : profil, rang, résumé et matchs réels affichés dans E:VAL. Le premier chargement est lent, car le Worker synchronise les matchs. Connexion par navigateur par défaut : Riot n'accepte que sa redirection vers playvalorant.com, Ethone ne peut donc pas récupérer la session seul ; l'utilisateur colle l'adresse de la page, et la session dure environ une heure sans renouvellement. Ce parcours est écrit mais pas testé en réel. Notes et Calendrier utilisent les mêmes commandes mais n'ont pas été testés en écriture.
- Vérifications du lot identité du 2 novembre 2026 : 54 tests Rust Desktop, 11 tests frontend, contrôle TypeScript, build Vite et build Tauri release `--no-bundle` réussis.

**Portage du 2 novembre 2026 (soir), vérifié dans le build release avec le vrai compte**

- E:VAL Profil, tableau, manches, éliminations ; Jeu (portefeuille, boutique, packs, accessoires, passe, récompense quotidienne, missions, équipement) ; Hub (classement). League of Legends ; Quotidien (lecture des habitudes) ; Mail (liste réception) ; Compte (profil) ; Analyses (activité).

**Écrit, testé seulement par les contrôles automatiques, pas en réel**

- Discord : la connexion réelle est confirmée par Rub19 et la première vue affichait de vraies données. La refonte de la vue d'ensemble, les choix de salons et de rôles et les modules n'ont pas été vus depuis. Moteur commun, pas de page sur mesure par module.
- Boutons de fenêtre sur mesure, tuiles de l'Accueil, page TFT, signets, contrats d'agents et changement de carte ou de titre : écrits pendant que Rub19 jouait, sans build ni fenêtre. Seuls TypeScript et les tests frontend sont passés.
- Connexion Riot par navigateur, écritures Mail et Habitudes, Factures, Fichiers (aucun fichier sur le compte), partage, Équipe, Brain (aucun message envoyé), Météo, RSS, TFT, Steam, Minecraft, appareils, clés d'accès, déconnexion de services, recherche de joueur, cartes, agents, armes, collection, groupe et partie en direct.

**Non porté**

- E:VAL : messages et invitations aux amis, gestion du groupe, groupes détectés et score en direct, carte des kills et économie, favoris, porte-bonheur, variantes et graffitis, historique d'achats (session web Riot), récap automatique.
- Discord : une trentaine de modules gardent le moteur commun, sans page sur mesure.
- Fichiers : envoi et création de dossiers (identifiant client Google requis), création de dépôts publics.
- Mail : édition des règles et des modèles existants, PGP.
- Compte : changement d'avatar, création de clés d'accès (liée au domaine), connexion de nouveaux services (renvoie vers ethone.dev).
- Autres : contrôle Spotify, pages des plugins, marketplace (ses extensions n'agissent que sur les widgets du site), éditeurs détaillés de flows et d'interactions, préréglages de l'ambiance. Le navigateur intégré est écarté volontairement.

**Écrit en dernier, sans passage réel**

- Barre latérale à lignes, pages Discord sur mesure, formulaires de création Discord, envoi programmé et report de mail, gestion des étiquettes, modèles et signatures, double authentification, analyse de match. Contrôle dans `preview.html` pour une partie seulement.
- Tester du moins risqué au plus sensible : lecture, puis actions sans conséquence, puis équipement Riot, réglages de jeu, sanctions Discord et double authentification. Rub19 décide du moment : pas de build pendant qu'il joue.

## Reste à faire, dans l'ordre

1. **Tester avec Rub19 ce qui est écrit mais pas vérifié, puis porter ce qui manque** (liste ci-dessus).
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

## Test réel du 2 novembre 2026

Fait sur la vraie app et le vrai compte, en pilotant la WebView par un port de débogage local temporaire (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`), sans souris ni capture de l'écran.

- Vérifié : toutes les pages s'ouvrent, tâche TEST créée, terminée puis supprimée, épingle, barre réduite, recherche Ctrl+K, agrandir et restaurer, détail d'un match, sélecteurs de couleur.
- Non vérifié : envoi d'un mail, actions Discord qui écrivent, vue en direct pendant une vraie partie, connexions Riot et Discord depuis zéro, envoi d'un fichier.
- E:VAL : `cache.ts` garde le catalogue 24 h, les réponses Riot `pd` 5 min et le profil 5 min dans IndexedDB. Mesure : 0 appel au 2e passage sur Jeu ; le Hub reste chargé entre deux onglets. Le bouton Actualiser vide le cache Riot.
- Discord : navigation par catégories puis modules, sections en onglets, options avancées repliées, barre d'enregistrement flottante, sélecteurs de couleur.
- Retiré : page Plugins (la route `api/user-data/plugins` n'existe pas), liste Quêtes du module Mini-Jeux (route absente côté bot).
- Journal de sécurité : limité à 20 lignes, car `api/auth/security-events` renvoie une erreur serveur à partir de 30. Cause non trouvée.

**Reste à faire** : `api/ai/quota` renvoyait à tout compte connecté le jeton Cloudflare du worker et l'identifiant de compte. Corrigé et déployé le 2 novembre 2026 (version `ccffb732`, vérifié sur la réponse réelle). Le correctif est sur la branche, pas encore sur `main` : un déploiement fait depuis `main` remettrait la fuite. Le jeton doit encore être remplacé, car il a été exposé.

Suite du test : le rang affiché suit `CompetitiveTier` de la saison et non le dernier match classé (un Radiant perdu sans jouer restait affiché). Correctif du jeton présent sur `main` (v1.92.2). Reste à faire : remplacer le jeton Cloudflare, vue mois du calendrier, mail côte à côte, Concentration et Ambiance réunies, historique de Brain, alerte de `scripts/audit-security.mjs` sur `discord-bot/src/modules/riot/riotService.ts` (motif `service-role-reference`, à vérifier).

## Refonte de l'interface (3 novembre 2026)

Interface refaite façon Apple sur Windows, voir `desktop/DESIGN.md`. Toutes les pages passent par les mêmes jetons et composants. Vérifié par captures sur le vrai compte : accueil, applications, tâches, calendrier, mail, E:VAL, Discord, réglages, en sombre, et quatre pages en clair ; connexion et installateur sur l'aperçu. Vérifié en vrai : raccourcis, suppression avec annulation, menu contextuel, mémoire de la dernière page. Vérifié ensuite : vrai thème clair ; deux écrans réels (100 % et 150 %) avec retour de la position, fenêtre agrandie et écran disparu ; tailles de 900x600 à 3440x1440 et échelles 100 à 200 % en émulation ; navigation au clavier (Tab, flèches, Entrée, Échap, touche Menu, panneau qui garde le focus). La mémoire de position n'utilise plus le plugin window-state : la position est gardée dans `ethone-window` et vérifiée par `screen_at` dans `windowing.rs`. Non vérifié : changer l'échelle Windows réglée pendant que l'app tourne, lecteur d'écran.

Ultimate Edition : audit et contrat de qualité dans `docs/ecosystem/ULTIMATE-AUDIT.md` et `CONSTRAINTS.md`. Les réglages de densité, taille du texte, réduction du mouvement et transparence sont validés, persistants, appliqués immédiatement et réinitialisables. Les 36 tests frontend et TypeScript passent ; cette tranche n'a pas été ouverte dans l'app.

Menu du profil : déplacé dans un portail hors de la sidebar pour éviter l'étirement et le découpage. Vérifié le 3 novembre 2026 dans la vraie WebView par le port DevTools local : dimensions normales, entièrement visible en sidebar normale et compacte, deux actions visibles, fermeture avec Échap et retour du focus sur l'avatar. Le port `9333` a ensuite été fermé et l'app relancée normalement.

## E:VAL : matchs, amis et aperçu des skins (3 novembre 2026)

- Matchs : une ligne par match, colonnes alignées, regroupés par jour (`TrackerPage.tsx`).
- Amis : en ligne à gauche, hors ligne à droite dans une liste qui défile seule (`EvalHub.tsx`).
- Portraits des amis : la vraie carte VALORANT est maintenant lue directement dans l'équipement du joueur, avec l'historique en secours. La dernière vraie icône Riot/League connue est conservée pour les amis hors ligne. Les tests frontend et TypeScript passent ; l'affichage n'a pas été ouvert ni capturé sur le PC.
- Skins : `EvalSkins.tsx` regroupe l'aperçu d'une arme (vidéo, améliorations, variantes) et le détail d'un bundle (armes, prix, remise). Ouvert depuis la boutique, la collection, les armes et le choix de skin. Les vidéos sont sur `valorant.dyn.riotcdn.net`, autorisé dans `media-src` de la CSP. Vérifié : lecture réelle au niveau 1, au niveau 3 et sur une variante. Les skins Select n'ont pas de vidéo : image affichée.
- Session Riot : le silent login passe un seul à la fois (`refreshing` dans `riot.rs`), et un 403 n'efface plus la session, seul un 401 le fait. Un 403 arrive par exemple sur l'historique d'un ami.
- Bouton Équiper du choix de skin : affiché, jamais cliqué pendant les tests.

## E:LOL, Mail et cartes E:VAL (3 novembre 2026)

- E:LOL remplace la page Jeux : seules les sections League, TFT et Rotation LoL restent. Steam et Minecraft ont été retirés de ce domaine. Une icône E:LOL dédiée est utilisée dans la barre latérale.
- TFT réutilise automatiquement l'identité Riot reliée quand elle existe. La page affiche uniquement les vraies données Riot : résumé, placements, compositions, traits, unités, objets et classement du lobby. Sur le vrai compte contrôlé, l'API renvoie actuellement un historique vide ; l'état vide a été vérifié dans la WebView.
- E:VAL affiche maintenant les matchs sous forme de grandes cartes inspirées de l'app iOS : mode et heure, décor de carte, agent, résultat, MVP, K/D/A, ACS et score. Les 25 cartes réelles et leurs regroupements par jour ont été vérifiés. Le portrait, le texte et le badge résultat ne se chevauchent plus.
- Mail utilise une liste visuelle avec avatars calculés localement, état non lu, étoile et pièces jointes, puis un panneau de lecture détaillé. Vérifié dans la vraie WebView avec 27 messages réels, ouverture d'un message, corps et six actions disponibles, sans mutation.
- La connexion Riot ouvre désormais uniquement le navigateur par défaut. L'utilisateur colle ensuite l'adresse finale de playvalorant.com dans le panneau sécurisé d'Ethone. Aucun navigateur intégré n'est proposé.
- Vérifications : 49 tests frontend, TypeScript, build Vite et build Tauri release `--no-bundle` réussis. Le build release a été contrôlé par le port DevTools local, sans contrôle du bureau ni capture de l'écran.

## Reprise d'E:VAL et E:LOL (3 novembre 2026)

Cette section remplace ce qui est écrit plus haut sur la connexion Riot par navigateur, les cartes de match et la page E:LOL.

- Connexion Riot : retour à la fenêtre intégrée `riotLogin`, sans URL à coller. Le lien par navigateur reste une option secondaire. Vérifié : `riot_login` renvoie `linked` sur le vrai compte, sans action manuelle.
- Matchs E:VAL : retour à une ligne par match avec colonnes alignées. Les grandes cartes sont retirées.
- E:LOL : `LolPage.tsx` et `lol.ts` reprennent l'interface d'E:VAL (onglets Profil, TFT, Rotation, Amis ; carte de profil, résumé, session, lignes de match par jour, panneau de détail). Vérifié avec 36 parties réelles, le tableau des 10 joueurs et l'analyse. L'état vide de TFT a été vu car le compte n'a aucune partie TFT : les cartes TFT n'ont pas été vues avec de vraies données.
- Pas d'onglet En direct dans E:LOL : le worker n'a pas de route pour les parties en cours.
- Steam et Minecraft restent absents de cette page depuis le passage à E:LOL. Le code est dans l'historique git (`203c2f6f`, `desktop/src/MorePages.tsx`).
- La release `desktop-v0.1.0` ne contient pas ces changements.
- Photos des amis : E:VAL préfère la carte VALORANT, E:LOL l'icône League. Sans carte, l'icône vient de `api/stats/lol-profile`, une requête toutes les 1,2 s. Mesuré : 130 amis sur 131 ont une image. `Kyor#열여덟` reste sans image, car la route renvoie une erreur serveur.
- E:LOL n'a que du LoL et du TFT, à la demande de Rub19 : ne pas remettre Steam ni Minecraft. L'audit des pages et la comparaison avec ethone.dev ne sont pas écrits ici.
- Largeur : `.page` n'a plus de limite, seuls les champs d'ajout et la recherche Discord restent à 560 px. Accueil : tuile League, habitudes du jour cochables, mails identiques regroupés (date de fin du sujet ignorée), blocs à masquer stockés dans `ethone-home-hidden`. Vérifié dans la vraie app de 1280 à 3440 px, sans débordement horizontal.
- Lot Windows et fichiers : envoi vers Drive par morceaux de 8 Mo (`drive_upload_chunk`), lancement avec Windows en réduit (`--minimized`, clé Run de l'utilisateur), zone de notification, réduction à la fermeture, notifications de mails et d'événements (toutes les 2 min), export et import des préférences. Drive n'est pas relié sur ce compte : l'envoi réel vers Drive et le clic sur l'icône de la zone de notification ne sont pas testés.
- Thèmes : `data-look` sur la racine, 7 choix dans `LOOKS` (`settings.ts`), Ethone par défaut. Brain refait dans `BrainChat.tsx` : l'orbe a trois états (repos, réflexion, réponse), et la réponse s'affiche mot à mot côté interface car le serveur n'envoie pas de flux. Filtres de parties dans `match-filter.ts` et `MatchFilters` (`kit.tsx`).
