# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [Unreleased] - 2026-08-06

### Ajout�
- **Backend / Cloudflare Worker** : Nouveaux clients API (henrik-client.js et iot-client.js) pour isoler l'acquisition de donn�es Valorant et League of Legends.

### Modifi�
- **Backend / Cloudflare Worker** : Migration de Tracker.gg vers **HenrikDev API** (Valorant) et **Riot Games API officielle** (League of Legends) suite aux probl�mes d'erreurs 403.
- **Backend / Matchs** : Historique restreint � 10 parties r�centes pour respecter les limites strictes de requ�tes du Worker Cloudflare.
- **Frontend / Connexions** : Refonte de l'onglet de gestion des int�grations Riot Games pour retirer Tracker.gg, pointer vers HenrikDev/Riot, et permettre de configurer ses propres cl�s API ind�pendantes (henrikApiKey, iotApiKey).
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

