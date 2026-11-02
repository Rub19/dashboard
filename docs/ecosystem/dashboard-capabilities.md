# Carte des capacités du dashboard Windows

Ordre validé par Rub19 le 2 novembre 2026. Les identifiants restent stables pendant la refonte.

| Module | Responsabilité | Dépend de |
|---|---|---|
| `desktop-foundation` | Navigation Windows, session Rust, appels authentifiés, états chargement/vide/erreur | — |
| `home-apps` | Accueil réel, détection, installation et lancement des applications | `desktop-foundation` |
| `productivity` | Notes, tâches, calendrier, habitudes et concentration | `desktop-foundation` |
| `cloud-files` | Fichiers, dépôts et partages | `desktop-foundation` |
| `identity-connections` | Profil, connexions, sécurité et réglages | `desktop-foundation` |
| `gaming` | Jeux, matchs et suivis Riot | `desktop-foundation` |
| `discord` | Vue générale et fonctions Discord regroupées par domaine | `desktop-foundation` |
| `collaboration` | Espaces, équipe et messagerie | `desktop-foundation` |
| `brain-automation` | Brain, automatisations, flows et plugins | `desktop-foundation` |
| `insights` | Activité, analyses et interactions | `desktop-foundation` |
| `admin-support` | Administration, documentation, journal et informations | `desktop-foundation` |

Ordre de construction : `desktop-foundation` → `home-apps` → `productivity` → `cloud-files` → `identity-connections` → `gaming` → `discord` → `collaboration` → `brain-automation` → `insights` → `admin-support`.

Les 170 routes web servent d'inventaire fonctionnel, pas de structure de navigation. Les 103 routes Discord seront regroupées dans une seule section avec une navigation interne.
