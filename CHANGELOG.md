# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [Unreleased] - 2026-08-05

### Ajouté
- **UI / Accueil** : Les widgets de l'Accueil (Spotify, Discord, Last.fm) ont désormais des hauteurs d'affichage uniformes avec un étirement pour mieux s'intégrer à la grille (\8/styles/shell.css\).
- **UI / Activity** : Le \Live Now\ a été segmenté en catégories distinctes (Gaming & Stats, Médias & Social, Productivité & Quotidien) s'alignant sur l'organisation de la page d'Accueil (\8/pages/activity.mjs\).
- **Activity Hub** : Les catégories de widget vides sont automatiquement masquées dynamiquement.
- **Matchs** : Nouveau composant d'erreur d'interface élégant pour notifier un échec de l'API de statistiques (absence de fausses données / \mockData\).

### Modifié
- **Backend / Cloudflare Worker** : Migration complète et retour à la centralisation sur l'API de **Tracker.gg** pour **Valorant** et **League of Legends** via \getTrackerMatches\.
- **Matchs (Frontend)** : Suppression intégrale de la boucle de génération de fausses statistiques qui s'affichait lorsque le backend tracker était indisponible.

### Supprimé
- **Backend** : Révocation du support de l'API d'HenrikDev, suppression des blocs de configuration spécifiques associés.

