# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

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

