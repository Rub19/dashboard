# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [v247] - 2026-08-07

### Ajouté
- **Pagination du flux d'activité** : bouton `Charger plus` par lots de 15 signaux.
- **Actions contextuelles** sur chaque entrée du journal : copier le titre, filtrer par catégorie, ouvrir la source.

### Amélioré
- Compteur d'activité affichant le nombre de signaux visibles sur le total filtré.
- Bordereau PWA mis à jour vers `experience-v247`.

## [v246] - 2026-08-07

### Ajouté
- **Scoreboard LoL type tracker.gg** : objectifs d'équipe (Barons, Dragons, Tours), dégâts subis, dégâts aux objectifs, score de vision, CS/min, GPM et DPM.
- **Richesse des stats Riot** : kill participation, KDA, dégâts aux champions, tourres et objectifs, vision et wards.
- **Fallback d'icônes LoL** : DDragon en premier, puis CommunityDragon si l'image est manquante.

### Corrigé
- Résolution dynamique de la dernière version DDragon et mapping correct des clés de champions pour afficher les icônes.
- Les icônes de champions, sorts, runes et objets utilisent désormais la bonne version DDragon et le bon nom de fichier.

### Changé
- Budget JavaScript total ajusté pour la refonte du scoreboard LoL.
- Bordereau PWA mis à jour vers `experience-v246`.

## [v245] - 2026-08-07

### Corrigé
- Le statut **Session chiffrée** (et Session vérifiée / expirée) est désormais traduit dans toutes les langues.
- Les libellés de synchronisation et de sauvegarde de la barre d'état sont localisés.

### Amélioré
- Orthographe et accents corrigés dans les statuts du shell.
- Bordereau PWA mis à jour vers `experience-v245`.

## [v244] - 2026-08-07

### Changé
- **Topbar unifiée** : tous les boutons de la barre d'outils supérieure partagent le même style visuel (bordure, fond, survol, focus).
- Focus, Brain et Sync conservent leur indicateur coloré dans une silhouette identique aux autres contrôles.
- Meilleure adaptation tactile des boutons topbar sur mobile.
- Bordereau PWA mis à jour vers `experience-v244`.

## [v243] - 2026-08-07

### Ajouté
- **Presets d'interface** : 6 ambiances prêtes à l'emploi (Productivité, Focus, Gaming, Créatif, Minimal, Développement) activables depuis les réglages ou le Command Center.
- **Sauvegarde de configuration** : enregistrer la configuration actuelle comme preset personnalisé et l'exporter en JSON.

### Changé
- Bordereau PWA mis à jour vers `experience-v243`.

## [v242] - 2026-08-07

### Ajouté
- **Quick Actions** : barre d'actions rapides sur l'accueil pour créer une note, une tâche, un événement, ouvrir Brain et lancer un Pomodoro.

### Amélioré
- **Command Center intelligent** : les commandes les plus utilisées remontent plus haut grâce au scoring par fréquence.
- **Alias de commandes** : `todo`, `note`, `ia`, `rdv`, `cmd` et autres raccourcis naturels supportés.
- **Filtre par catégorie** : `/reglages`, `/nav`, `/actions` filtrent les commandes par catégorie dans le Command Center.

### Changé
- Bordereau PWA mis à jour vers `experience-v242`.

## [v241] - 2026-08-07

### Changé
- **Command Center** : bouton d'effacement de la recherche (44 px) et touche Échap masquée sur mobile.
- **Cibles tactiles** : 44 px minimum pour les favoris du Command Center et les contrôles de densité sur pointeur grossier.
- **Dock / topbar / breadcrumb** : cibles tactiles à 44 px sur écrans ≤ 360 px.

### Nettoyage
- Suppression des scripts `one-shot` obsolètes et du fichier temporaire `scripts/temp-derive-test.mjs`.
- Bordereau PWA mis à jour vers `experience-v241`.

## [v240] - 2026-08-07

### Corrigé
- **LoL** : `deriveLolDdragonVersion` extrait correctement la version de patch depuis le `gameVersion` Riot et retombe sur `16.15.1`.
- **LoL Live Now** : la photo de profil tente DDragon, CommunityDragon puis l'icône `swords` sans boucle infinie en cas d'échec.
- **LoL availability** : le widget ne s'affiche plus si le Worker n'a pas trouvé de profil.

### Changé
- **Responsive mobile** : nouveau breakpoint `max-width: 360px` pour topbar, dock, scoreboard et rangées de matchs LoL.
- **Command Center** : accessible sous 820 px sous forme d'icône.
- Budget CSS relevé à 600 000 octets source pour la refonte responsive.
- Bordereau PWA mis à jour vers `experience-v240`.

## [v239] - 2026-08-07

### Changé
- **Responsive mobile** : amélioration du mode tactile (iPad/tablettes), meilleure prise en charge des petits écrans.
- **Topbar, Dock** : ajustements des colonnes et tailles pour mobile.
- **Activity / Connections** : grilles et cartes mieux adaptées aux petits écrans.
- Bordereau PWA mis à jour vers `experience-v239`.

## [v238] - 2026-08-07

### Changé
- **Valorant scoreboard** : la barre colorée de gauche est maintenant plus visible (5px pleine hauteur) et correspond à la couleur du groupe/party, comme sur tracker.gg.
- Le joueur et ses coéquipiers du même groupe partagent la même couleur.
- Bordereau PWA mis à jour vers `experience-v238`.

## [v237] - 2026-08-07

### Corrigé
- **LoL widget** : la photo de profil essaie DDragon, puis CommunityDragon, puis l'icône `swords` si tout échoue.
- **LoL widget** : suppression du `referrerpolicy="no-referrer"` qui pouvait bloquer le chargement.
- **CSP & headers** : `raw.communitydragon.org` est maintenant autorisé pour les images.

### Changé
- Le **Worker** renvoie `profileIconId` pour reconstruire les URLs de secours.
- Bordereau PWA mis à jour vers `experience-v237`.

## [v236] - 2026-08-07

### Ajouté
- **Valorant** : barres colorées à gauche de chaque groupe/duo, avec des couleurs distinctes par `party_id`.

### Changé
- Le groupe du joueur reste bleu, les autres groupes prennent des couleurs différentes (orange, vert, rouge).
- Bordereau PWA mis à jour vers `experience-v236`.

## [v235] - 2026-08-07

### Ajouté
- **Valorant** : le scoreboard affiche maintenant les duos/groupes des autres joueurs (badge `DUO`/`TEAM`) grâce au `party_id` renvoyé par l'API Henrik.

### Changé
- Badge de votre propre groupe : affiche `PARTY` si vous êtes plus de 2.
- Bordereau PWA mis à jour vers `experience-v235`.

## [v234] - 2026-08-07

### Corrigé
- **LoL** : les images de champions, items et profil utilisent maintenant la version DDragon de secours (`16.15.1`) si la version exacte de la partie n'existe pas chez DDragon.
- **LoL** : l'avatar de profil affiche l'icône par défaut si l'icône du joueur manque.
- **Cache** : le cache `sessionStorage` est invalidé pour forcer le rechargement avec les images corrigées.
- **Service Worker** : version incrémentée à `experience-v234` pour forcer le rafraîchissement du cache PWA et appliquer les corrections côté client.

### Déploié
- Worker Cloudflare redéployé avec les corrections d'images.

## [v233] - 2026-08-07

### Corrigé
- **LoL** : l'historique des matchs remarche. Si la version DDragon d'une partie n'existe pas, on bascule sur la version de référence ; si le détail d'un match est invalide, il est ignoré.
- **LoL** : le widget affiche la photo de profil avec une icône par défaut si l'image manque ou échoue.

### Déploié
- Mise à jour du **Worker Cloudflare** (`raspy-fog-bf5b`) avec les corrections API (LoL, cache, Valorant size).

## [v232] - 2026-08-07

### Ajouté
- **Historique** : jusqu'à 25 matches récupérés pour Valorant (`size=25`) et LoL (`count=25`).
- **Cache** : l'historique est mis en cache côté navigateur (`sessionStorage`, 10 min) et côté worker (10 min) pour éviter d'appeler l'API à chaque ouverture.

### Corrigé
- **Scoreboard** : seuls les vrais membres du groupe sont marqués `DUO` ; le trait/pastille bleu n'apparaît plus sur tous les joueurs.

## [v231] - 2026-08-07

### Ajouté
- **Accueil** : un clic sur les widgets gaming (LoL, Valorant, Apex) ouvre la page d'historique des matches.

### Corrigé
- **Widget Apex Legends** : affiche le pseudo du joueur au lieu de `undefined - undefined`.
- **Widget LoL / Valorant** : la navigation vers l'historique des matches fonctionne depuis l'accueil.

## [v230] - 2026-08-07

### Ajouté
- **Tracker LoL** : affichage de la rune clé (keystone) du joueur dans la ligne de match et le scoreboard détaillé.
- **Backend / Tracker LoL** : chargement de `runesReforged.json` depuis Data Dragon pour mapper les runes à la version de patch.

### Modifié
- **Backend / Tracker LoL** : les assets de runes sont normalisés avec image + nom, comme les sorts et les items.

## [v229] - 2026-08-06

### Ajouté
- **Tracker LoL** : icônes de sorts d'invocateur dans la ligne de match et le scoreboard détaillé.
- **Tracker LoL** : tooltips avec le nom de l'item au survol, alimentés par Data Dragon (`summoner.json` et `item.json`).

### Modifié
- **UI / Scoreboard LoL** : affichage du niveau du champion, de l'or total, et renommage de la colonne Score en Dégâts.
- **UI / Ligne de match LoL** : icônes de sorts d'invocateur et tooltips sur les items.
- **Backend / Tracker LoL** : chargement des données Data Dragon par version de patch pour enrichir les assets LoL.

## [v228] - 2026-08-06

### Ajouté
- **Tracker LoL** : filtre par mode (ranked, normal, aram) dans l'historique LoL.
- **Tracker LoL** : images de champions et items versionnées selon le patch de la partie (DDragon).

### Modifié
- **UI / Matches LoL** : responsive UI des matchs (avatar champion, badge niveau, grille adaptative et breakpoints).
- **UI / Matches LoL** : les 7 emplacements d'items s'affichent toujours avec des placeholders.
- **UI / Matches LoL** : chargement eager des images pour les 3 premières lignes de matchs.
- **UI / Matches LoL** : badge de niveau du champion plus lisible (z-index et halo visuel).

### Corrigé
- **CI/CD** : correction du SHA de `actions/checkout` dans le workflow de déploiement GitHub Pages.

## [Unreleased] - 2026-08-06

### Ajout�
- **Backend / Cloudflare Worker** : Nouveaux clients API (henrik-client.js et 
iot-client.js) pour isoler l'acquisition de donn�es Valorant et League of Legends.

### Modifi�
- **Backend / Cloudflare Worker** : Migration de Tracker.gg vers **HenrikDev API** (Valorant) et **Riot Games API officielle** (League of Legends) suite aux probl�mes d'erreurs 403.
- **Backend / Matchs** : Historique restreint � 10 parties r�centes pour respecter les limites strictes de requ�tes du Worker Cloudflare.
- **Frontend / Connexions** : Refonte de l'onglet de gestion des int�grations Riot Games pour retirer Tracker.gg, pointer vers HenrikDev/Riot, et permettre de configurer ses propres cl�s API ind�pendantes (henrikApiKey, 
iotApiKey).
- **Frontend / Menu Contextuel** : Correction de la propagation des �v�nements dans context-menu.mjs qui bloquait les actions en dehors du menu.

### Supprim�
- **Backend** : Retrait du parsing et requ�tage Tracker.gg pour Valorant et LoL (toujours actif pour Apex).


## [Unreleased] - 2026-08-05

### Ajouté
- **UI / Accueil** : Les widgets de l'Accueil (Spotify, Discord, Last.fm) ont désormais des hauteurs d'affichage uniformes avec un étirement pour mieux s'intégrer à la grille (\`v8/styles/shell.css\`).
- **UI / Activity** : Le \`Live Now\` a été segmenté en catégories distinctes (Gaming & Stats, Médias & Social, Productivité & Quotidien) s'alignant sur l'organisation de la page d'Accueil (\`v8/pages/activity.mjs\`).
- **Activity Hub** : Les catégories de widget vides sont automatiquement masquées dynamiquement.
- **Matchs** : Nouveau composant d'erreur d'interface élégant pour notifier un échec de l'API de statistiques (absence de fausses données / \`mockData\`).
- **Widgets Live** : Refonte visuelle de l'indicateur d'actualisation ("Actualisé à HH:MM"). L'indicateur est désormais purement temporel ("HH:MM"), sans fond, et très discret pour un rendu plus propre et moins distrayant.

### Modifié
- **Backend / Cloudflare Worker** : Migration complète et retour à la centralisation sur l'API de **Tracker.gg** pour **Valorant**, **League of Legends** et ajout du support **Apex Legends** via `getTrackerMatches`.
- **Matchs (Frontend)** : Suppression intégrale de la boucle de génération de fausses statistiques qui s'affichait lorsque le backend tracker était indisponible. Ajout de la compatibilité du panel pour afficher l'historique de matchs Apex Legends.

### Supprimé
- **Backend** : Révocation du support de l'API d'HenrikDev, suppression des blocs de configuration spécifiques associés.

