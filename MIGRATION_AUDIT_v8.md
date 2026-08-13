# Inventaire complet du codebase ETHONE v8

## Catégorie : app

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `app/app-runtime.mjs` | Point d'entrée principal de l'application qui compose tous les sous-systèmes (lifecycle, store, i18n, router, actions, Brain, commandes, services, UI) et gère le montage des pages. | `core/lifecycle.mjs`, `core/store.mjs`, `core/router.mjs`, `core/actions.mjs`, `core/density-engine.mjs`, `core/navigation-session.mjs`, `i18n/runtime.mjs`, `brain/runtime.mjs`, `command/command-center.mjs`, `command/history.mjs`, `data/home-model.mjs`, `data/activity-journal.mjs`, `services/*-live.mjs`, `services/oauth-callback.mjs`, `ui/shell.mjs`, `ui/panel.mjs`, `ui/notification-center.mjs`, `pages/*.mjs` |

## Catégorie : brain

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `brain/preferences.mjs` | Définit les préférences par défaut, les valeurs supportées, les permissions, les catégories de mémoire et les fonctions de sanitization pour Brain. | Aucune (module de données statiques) |
| `brain/context-engine.mjs` | Construit le contexte routier avec filtrage des permissions et rédaction des secrets pour les requêtes Brain. | `brain/preferences.mjs` (sanitizeBrainPreferences) |
| `brain/action-registry.mjs` | Expose des actions structurées pour l'assistant avec validation, permissions et exigences de confirmation. | `data/home-model.mjs` (createHomeModel) |
| `brain/memory-repository.mjs` | Persiste les mémoires non sensibles de Brain vers Supabase avec expiration et contrôles de catégorie. | `data/activity-journal.mjs` (BRAIN_MEMORY_CATEGORIES) |
| `brain/provider-manager.mjs` | Gère les appels providers locaux/contexte et backend avec annulation et gestion des timeouts. | Aucune (factory avec injection) |
| `brain/controller.mjs` | Orchestre l'historique conversationnel, les réponses contextuelles, le fallback provider, les suggestions et l'exécution d'actions. | `brain/context-engine.mjs`, `brain/action-registry.mjs`, `brain/memory-repository.mjs`, `brain/provider-manager.mjs` |
| `brain/runtime.mjs` | Compose tous les composants Brain en un runtime unique prêt à être injecté dans l'application. | `brain/preferences.mjs`, `brain/context-engine.mjs`, `brain/action-registry.mjs`, `brain/memory-repository.mjs`, `brain/provider-manager.mjs`, `brain/controller.mjs` |

## Catégorie : command

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `command/catalog.mjs` | Définit statiquement les commandes disponibles et leurs alias. | Aucune (module de données statiques) |
| `command/search.mjs` | Recherche floue normalisée et localisée avec scoring par contexte, épinglés, récents et fréquence. | `command/catalog.mjs` (COMMANDS), `i18n/catalog.mjs` (helpers de traduction) |
| `command/history.mjs` | Persistence localStorage des commandes récentes/épinglées et fréquence d'utilisation. | Aucune (localStorage) |
| `command/command-center.mjs` | HUD de commandes interactif rendu avec les helpers UI réutilisables. | `command/search.mjs`, `command/history.mjs`, `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/icons.mjs`, `ui/window-system.mjs`, `data/workspaces.mjs` |

## Catégorie : core

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `core/actions.mjs` | Enregistrement centralisé et dispatch des actions avec sanitization des préférences Brain et des règles d'automatisation. | `data/workspaces.mjs`, `core/density-engine.mjs`, `brain/preferences.mjs`, `core/automation-engine.mjs`, `core/preset-engine.mjs`, `core/preferences.mjs` |
| `core/automation-engine.mjs` | Sanitization et matching des triggers/actions d'automatisation. | `data/workspaces.mjs`, `data/navigation.mjs`, `core/theme-engine.mjs` |
| `core/density-engine.mjs` | Modes de densité, presets, résolution responsive, variables CSS et gestion du cycle de vie. | Aucune (module de configuration) |
| `core/document-metadata.mjs` | Gère les métadonnées du document (titre, locale, entry). | `core/theme-engine.mjs` (resolveTheme) |
| `core/experience.mjs` | Moteur d'ambiance visuelle et sonore avec animation Spotlight au démarrage. | `ui/navigation.mjs` (BRAND_MARK_SVG), `core/theme-engine.mjs` |
| `core/lifecycle.mjs` | Gestionnaire de cycle de vie pour les montages/démontages de routes avec nettoyage. | Aucune |
| `core/navigation-session.mjs` | Gère l'état de navigation et les sessions de travail. | `data/navigation.mjs` |
| `core/preferences.mjs` | Persistence des préférences globales de l'application. | Aucune (localStorage) |
| `core/presence-engine.mjs` | Moteur de présence pour indiquer l'état de l'application (route, brain, sync, notifications). | Aucune |
| `core/preset-engine.mjs` | Application et extraction de presets d'interface. | `data/presets.mjs` |
| `core/router.mjs` | Routeur hash-based avec normalisation et historique. | Aucune |
| `core/store.mjs` | Store de présentation centralisé avec sanitization des préférences. | `core/density-engine.mjs`, `brain/preferences.mjs` |
| `core/style-loader.mjs` | Chargeur dynamique de feuilles de style CSS. | Aucune |
| `core/theme-engine.mjs` | Résolution des thèmes clair/sombre avec préférences système. | Aucune |

## Catégorie : data

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `data/activity-journal.mjs` | Combine les événements d'activité persistés avec des entrées dérivées (notes, tâches, événements, fichiers). | Aucune (repository injecté) |
| `data/brand-icons.mjs` | Grande carte gelée de noms de marques vers chaînes SVG inline. | Aucune |
| `data/changelog.mjs` | Expose les entrées de changelog versionnées et métadonnées d'affichage. | Aucune |
| `data/daily-briefing.mjs` | Construit les signaux de briefing quotidien à partir des données de snapshot. | Aucune (snapshot injecté) |
| `data/home-model.mjs` | Construit le modèle de vue de la page Home à partir du profil, notes, tâches, événements et connexions. | `data/daily-briefing.mjs` (createDailyBriefing) |
| `data/integrations.mjs` | Catalogue d'intégrations avec catégories, méthodes de connexion, capacités et métadonnées d'identifiants. | Aucune |
| `data/navigation.mjs` | Définit les entrées de navigation pour toutes les routes de l'application. | Aucune |
| `data/oauth-app-config.mjs` | Stocke les identifiants clients OAuth publics (les secrets restent dans le Worker). | Aucune |
| `data/presets.mjs` | Définit les presets intégrés et champs de presets. | Aucune |
| `data/profile-repository.mjs` | Gère la persistence, sanitization, sélection et projections de snapshot des profils. | `i18n/catalog.mjs` (localeTag) |
| `data/workspaces.mjs` | Définit les espaces de travail avec widgets et métadonnées. | Aucune |

## Catégorie : entry

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `entry/entry-coordinator.mjs` | Orchestrateur du flux d'entrée (boot, login, recovery, profiles, home) avec transitions d'état. | `core/lifecycle.mjs` (createLifecycle) |
| `entry/login.mjs` | Interface de connexion/inscription avec formulaires, OAuth, passkey et OTP. | `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/form-system.mjs`, `ui/icons.mjs`, `ui/select.mjs`, `ui/navigation.mjs` |
| `entry/password-recovery.mjs` | Interface de récupération de mot de passe après lien de réinitialisation. | `ui/dom.mjs`, `ui/form-system.mjs`, `ui/icons.mjs` |
| `entry/profile-selection.mjs` | Interface de sélection de profil avec aperçu vivant et gestion des environnements. | `data/daily-briefing.mjs`, `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/form-system.mjs`, `ui/icons.mjs`, `ui/layer-manager.mjs`, `ui/window-system.mjs`, `ui/select.mjs` |

## Catégorie : i18n

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `i18n/catalog.mjs` | Catalogue source localisé avec entrées de traduction et helpers de normalisation. | Aucune |
| `i18n/runtime.mjs` | Moteur d'exécution i18n avec MutationObserver pour traduction automatique du DOM. | `i18n/catalog.mjs` (currentLocale, normalizeLocale, sourceEntry, translateSource) |

## Catégorie : pages

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `pages/home.mjs` | Page d'accueil avec sections de continuité, productivité, signaux et widgets en direct. | `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/icons.mjs`, `ui/*-live.mjs` (spotify, discord, weather, etc.), `services/bills-manager.mjs`, `i18n/catalog.mjs`, `core/store.mjs` |
| `pages/brain.mjs` | page Brain avec onglets chat, contexte, mémoire, actions, automations, providers, confidentialité, historique, diagnostics. | `ui/dom.mjs`, `i18n/catalog.mjs`, `ui/bottom-sheet.mjs`, `ui/empty-state.mjs`, `ui/error-state.mjs`, `ui/skeleton.mjs`, `data/home-model.mjs`, `ui/form-system.mjs`, `ui/icons.mjs`, `data/workspaces.mjs`, `data/navigation.mjs`, `brain/preferences.mjs`, `core/automation-engine.mjs`, `ui/select.mjs`, `utils/download.mjs` |
| `pages/settings.mjs` | Page de paramètres avec thèmes, densité, sons, préférences Brain, automatisations, synchronisation. | `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/form-system.mjs`, `ui/icons.mjs`, `services/sound-manager.mjs`, `services/media-upload.mjs`, `ui/select.mjs`, `core/density-engine.mjs`, `core/theme-engine.mjs`, `brain/preferences.mjs`, `data/presets.mjs`, `utils/download.mjs` |
| `pages/activity.mjs` | Page d'activité avec journal des événements. | `ui/dom.mjs`, `data/activity-journal.mjs` |
| `pages/activity-style.mjs` | Styles spécifiques pour la page d'activité. | Aucune |
| `pages/calendar.mjs` | Page calendrier avec affichage des événements. | `ui/dom.mjs`, `pages/calendar-model.mjs` |
| `pages/calendar-model.mjs` | Modèle de données pour le calendrier. | Aucune |
| `pages/connections.mjs` | Page de gestion des connexions/intégrations. | `ui/dom.mjs`, `pages/connections-model.mjs` |
| `pages/connections-model.mjs` | Modèle de données pour les connexions. | Aucune |
| `pages/drop.mjs` | Page de dépôt de fichiers. | `ui/dom.mjs` |
| `pages/feature-fallback.mjs` | Page de fallback pour fonctionnalités non disponibles. | `ui/dom.mjs`, `ui/empty-state.mjs` |
| `pages/files.mjs` | Page de gestion des fichiers. | `ui/dom.mjs`, `pages/files-model.mjs` |
| `pages/files-model.mjs` | Modèle de données pour les fichiers. | Aucune |
| `pages/interactions.mjs` | Page des interactions sociales. | `ui/dom.mjs` |
| `pages/mail.mjs` | Page de messagerie. | `ui/dom.mjs` |
| `pages/matches.mjs` | Page des correspondances. | `ui/dom.mjs` |
| `pages/notes.mjs` | Page de gestion des notes. | `ui/dom.mjs`, `pages/notes-model.mjs` |
| `pages/notes-model.mjs` | Modèle de données pour les notes. | Aucune |
| `pages/security.mjs` | Page de sécurité. | `ui/dom.mjs` |
| `pages/share.mjs` | Page de partage. | `ui/dom.mjs` |
| `pages/system.mjs` | Page système. | `ui/dom.mjs` |
| `pages/tasks.mjs` | Page de gestion des tâches. | `ui/dom.mjs`, `pages/tasks-model.mjs` |
| `pages/tasks-model.mjs` | Modèle de données pour les tâches. | Aucune |
| `pages/team.mjs` | Page équipe. | `ui/dom.mjs` |

## Catégorie : services

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `services/auth-adapter.mjs` | Adaptateur d'authentification Supabase avec rate limiting et gestion des états. | `services/external-services-config.mjs`, `services/rate-limiter.mjs` |
| `services/auth-storage.mjs` | Stockage personnalisé pour les sessions Supabase. | Aucune |
| `services/bills-manager.mjs` | Gestionnaire de factures. | Aucune |
| `services/clock-manager.mjs` | Gestionnaire d'horloge avec mise à jour périodique. | Aucune |
| `services/cloud-cache.mjs` | Cache cloud pour les données. | Aucune |
| `services/discord-live.mjs` | Client live pour Discord avec polling. | `services/live-poll.mjs` |
| `services/drive-client.mjs` | Client pour Google Drive. | `utils/format.mjs` |
| `services/external-diagnostics.mjs` | Diagnostics externes pour les services. | `services/network-client.mjs`, `services/auth-adapter.mjs`, `services/service-worker.mjs`, `services/external-services-client.mjs`, `services/public-auth-config.mjs` |
| `services/external-services-client.mjs` | Client pour les services externes (Worker API). | `services/external-services-config.mjs` |
| `services/external-services-config.mjs` | Configuration des services externes. | Aucune |
| `services/focus-timer.mjs` | Timer de focus/productivité. | Aucune |
| `services/github-live.mjs` | Client live pour GitHub avec polling. | `services/live-poll.mjs` |
| `services/github-oauth.mjs` | OAuth pour GitHub. | `services/oauth-callback.mjs` |
| `services/google-calendar-live.mjs` | Client live pour Google Calendar avec polling. | `services/live-poll.mjs` |
| `services/google-calendar-oauth.mjs` | OAuth pour Google Calendar. | `services/oauth-callback.mjs` |
| `services/google-drive-live.mjs` | Client live pour Google Drive avec polling. | `services/live-poll.mjs` |
| `services/google-drive-oauth.mjs` | OAuth pour Google Drive. | `services/oauth-callback.mjs` |
| `services/interactions-heatmap.mjs` | Heatmap des interactions. | Aucune |
| `services/lastfm-live.mjs` | Client live pour Last.fm avec polling. | `services/live-poll.mjs` |
| `services/live-poll.mjs` | Utilitaire de polling avec rafraîchissement à la visibilité. | Aucune |
| `services/lol-live.mjs` | Client live pour League of Legends avec polling. | `services/live-poll.mjs`, `services/valorant-live.mjs` |
| `services/mail-cache.mjs` | Cache pour les mails. | Aucune |
| `services/media-upload.mjs` | Upload de fichiers média. | Aucune |
| `services/minecraft-live.mjs` | Client live pour Minecraft avec polling. | `services/live-poll.mjs` |
| `services/network-client.mjs` | Client HTTP réseau avec retry et sanitization des logs. | Aucune |
| `services/notion-live.mjs` | Client live pour Notion avec polling. | `services/live-poll.mjs` |
| `services/notion-oauth.mjs` | OAuth pour Notion. | `services/oauth-callback.mjs` |
| `services/oauth-callback.mjs` | Utilitaires OAuth avec PKCE et gestion des callbacks. | Aucune |
| `services/provider-credentials.mjs` | Gestion des identifiants de providers. | Aucune |
| `services/public-auth-config.mjs` | Configuration publique d'authentification (URLs Supabase). | Aucune |
| `services/rate-limiter.mjs` | Limiteur de taux par clé avec fenêtre glissante. | Aucune |
| `services/reddit-live.mjs` | Client live pour Reddit avec polling. | `services/live-poll.mjs` |
| `services/reddit-oauth.mjs` | OAuth pour Reddit. | `services/oauth-callback.mjs` |
| `services/security-identity.mjs` | Service d'identité de sécurité avec WebAuthn. | `vendor/simplewebauthn-browser.bundle.mjs` |
| `services/service-worker.mjs` | Gestionnaire de Service Worker pour PWA. | Aucune |
| `services/sound-manager.mjs` | Gestionnaire de sons avec packs et volumes. | Aucune |
| `services/spotify-oauth.mjs` | OAuth pour Spotify. | `services/oauth-callback.mjs` |
| `services/spotify-oauth-live.mjs` | Client live pour Spotify OAuth avec polling. | `services/live-poll.mjs` |
| `services/steam-live.mjs` | Client live pour Steam avec polling. | `services/live-poll.mjs` |
| `services/supabase-state-sync.mjs` | Synchronisation d'état avec Supabase. | Aucune |
| `services/timer.mjs` | Timer générique. | Aucune |
| `services/todoist-live.mjs` | Client live pour Todoist avec polling. | `services/live-poll.mjs` |
| `services/todoist-oauth.mjs` | OAuth pour Todoist. | `services/oauth-callback.mjs` |
| `services/tracker-live.mjs` | Client live pour Tracker.gg avec polling. | `services/live-poll.mjs` |
| `services/twitch-live.mjs` | Client live pour Twitch avec polling. | `services/live-poll.mjs` |
| `services/valorant-live.mjs` | Client live pour Valorant avec polling. | `services/live-poll.mjs` |
| `services/youtube-oauth.mjs` | OAuth pour YouTube. | `services/oauth-callback.mjs` |
| `services/youtube-live.mjs` | Client live pour YouTube avec polling. | `services/live-poll.mjs` |

## Catégorie : ui

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `ui/bills-widget.mjs` | Widget de factures. | `ui/dom.mjs` |
| `ui/bottom-sheet.mjs` | Composant bottom-sheet (feuille de bas de page). | `ui/dom.mjs`, `ui/layer-manager.mjs` |
| `ui/context-menu.mjs` | Menu contextuel. | `ui/dom.mjs`, `ui/layer-manager.mjs` |
| `ui/dense-content.mjs` | Contenu dense avec sélection et menus de lignes. | `ui/dom.mjs` |
| `ui/depth-effect.mjs` | Effet de profondeur visuelle. | Aucune |
| `ui/discord-live.mjs` | Carte live Discord. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/dock.mjs` | Dock ETHONE avec navigation. | `ui/dom.mjs`, `ui/icons.mjs`, `data/navigation.mjs`, `data/workspaces.mjs` |
| `ui/dom.mjs` | Helpers DOM élémentaires (element, icon, actionButton, debounce, throttleFrame). | Aucune |
| `ui/empty-state.mjs` | États vides (emptyState, statusState, buildEmptyState). | `ui/dom.mjs` |
| `ui/error-state.mjs` | États d'erreur. | `ui/dom.mjs`, `ui/empty-state.mjs` |
| `ui/focus-island.mjs` | Îlot de focus. | `ui/dom.mjs` |
| `ui/focus-popover.mjs` | Popover de focus. | `ui/dom.mjs`, `ui/icons.mjs`, `i18n/catalog.mjs` |
| `ui/form-system.mjs` | Système de formulaires avec validation et contrôles. | `ui/dom.mjs`, `ui/icons.mjs` |
| `ui/github-live.mjs` | Carte live GitHub. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/google-calendar-live.mjs` | Carte live Google Calendar. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/google-drive-live.mjs` | Carte live Google Drive. | `ui/dom.mjs`, `ui/live-freshness.mjs`, `i18n/catalog.mjs` |
| `ui/icons.mjs` | Système d'icônes avec rafraîchissement. | Aucune |
| `ui/lastfm-live.mjs` | Carte live Last.fm. | `ui/dom.mjs`, `ui/live-freshness.mjs`, `ui/live-overlay.mjs` |
| `ui/layer-manager.mjs` | Gestionnaire de calques pour overlays et popovers. | Aucune |
| `ui/live-freshness.mjs` | Indicateur de fraîcheur pour widgets live. | `ui/dom.mjs` |
| `ui/live-overlay.mjs` | Overlay pour widgets live. | `ui/dom.mjs` |
| `ui/lol-live.mjs` | Carte live League of Legends. | `ui/dom.mjs`, `ui/live-freshness.mjs`, `i18n/catalog.mjs` |
| `ui/minecraft-live.mjs` | Carte live Minecraft. | `ui/dom.mjs`, `ui/live-freshness.mjs`, `ui/live-overlay.mjs`, `i18n/catalog.mjs` |
| `ui/mission-control.mjs` | Mission Control (vue d'ensemble des apps et widgets). | `data/navigation.mjs`, `data/workspaces.mjs`, `ui/dom.mjs`, `ui/empty-state.mjs`, `ui/icons.mjs`, `ui/window-system.mjs` |
| `ui/native-behavior.mjs` | Comportements natifs (scroll, zoom). | Aucune |
| `ui/navigation.mjs` | Navigation et markup de navigation. | `data/navigation.mjs`, `data/workspaces.mjs` |
| `ui/notification-center.mjs` | Centre de notifications. | `ui/dom.mjs`, `ui/toast.mjs`, `ui/bottom-sheet.mjs`, `ui/icons.mjs`, `i18n/catalog.mjs` |
| `ui/notion-live.mjs` | Carte live Notion. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/panel.mjs` | Panneau réutilisable avec sélection et actions. | `ui/dom.mjs`, `ui/dense-content.mjs`, `ui/empty-state.mjs`, `ui/icons.mjs`, `ui/window-system.mjs`, `ui/select.mjs`, `data/workspaces.mjs`, `data/changelog.mjs`, `ui/notification-center.mjs`, `i18n/catalog.mjs` |
| `ui/reddit-live.mjs` | Carte live Reddit. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/rich-text.mjs` | Éditeur de texte riche. | `ui/dom.mjs`, `ui/icons.mjs` |
| `ui/scratchpad.mjs` | Scratchpad (bloc-notes rapide). | `ui/dom.mjs`, `ui/window-system.mjs`, `ui/icons.mjs` |
| `ui/select.mjs` | Composant select déroulant. | `ui/dom.mjs`, `ui/icons.mjs`, `ui/layer-manager.mjs` |
| `ui/shell.mjs` | Shell principal de l'application (dock, navigation). | `data/navigation.mjs`, `data/workspaces.mjs`, `ui/icons.mjs`, `ui/navigation.mjs`, `ui/focus-popover.mjs`, `ui/dock.mjs` |
| `ui/shortcuts-overlay.mjs` | Overlay des raccourcis clavier. | `ui/dom.mjs`, `ui/window-system.mjs`, `ui/icons.mjs` |
| `ui/skeleton.mjs` | Skeletons de chargement. | `ui/dom.mjs` |
| `ui/spotify-live.mjs` | Carte live Spotify. | `ui/dom.mjs`, `ui/live-overlay.mjs`, `ui/icons.mjs` |
| `ui/steam-live.mjs` | Carte live Steam. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/timer.mjs` | Composant timer. | `ui/dom.mjs` |
| `ui/timer-display.mjs` | Affichage de timer. | `ui/dom.mjs` |
| `ui/timer-input.mjs` | Input de timer. | `ui/dom.mjs` |
| `ui/timer-status.mjs` | Statut de timer. | `ui/dom.mjs` |
| `ui/timer-tracker.mjs` | Suivi de timer. | `ui/dom.mjs` |
| `ui/timer-value.mjs` | Valeur de timer. | `ui/dom.mjs` |
| `ui/timer-zone.mjs` | Zone de timer. | `ui/dom.mjs` |
| `ui/toast.mjs` | Système de toasts (notifications). | `ui/dom.mjs`, `ui/icons.mjs`, `ui/layer-manager.mjs` |
| `ui/todoist-live.mjs` | Carte live Todoist. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/tooltip.mjs` | Système de tooltips. | `ui/layer-manager.mjs` |
| `ui/touch-interactions.mjs` | Gestionnaire d'interactions tactiles. | Aucune |
| `ui/tracker-live.mjs` | Carte live Tracker.gg. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/twitch-live.mjs` | Carte live Twitch. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/valorant-live.mjs` | Carte live Valorant. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/visual-haptics.mjs` | Haptiques visuels (feedback tactile visuel). | Aucune |
| `ui/weather-detail.mjs` | Détails météo. | `ui/dom.mjs`, `ui/icons.mjs`, `ui/weather-live.mjs`, `ui/layer-manager.mjs` |
| `ui/weather-live.mjs` | Carte live météo. | `ui/dom.mjs`, `ui/live-freshness.mjs` |
| `ui/window-system.mjs` | Système de fenêtres modales. | `ui/layer-manager.mjs` |
| `ui/youtube-live.mjs` | Carte live YouTube. | `ui/dom.mjs`, `ui/live-freshness.mjs` |

## Catégorie : utils

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `utils/date.mjs` | Utilitaires de date (vérification d'expiration). | Aucune |
| `utils/download.mjs` | Téléchargement de JSON. | Aucune |
| `utils/format.mjs` | Formatage d'octets. | Aucune |

## Catégorie : styles

**Note :** Le dossier `styles/` existe mais ne contient aucun fichier `.mjs` (il contient probablement des fichiers CSS).

## Fichier racine

| Fichier | Fonction | Dépendances clés |
|---------|----------|------------------|
| `main.mjs` | Point d'entrée bootstrap qui initialise les services d'entrée, charge dynamiquement app-runtime, et orchestre le démarrage complet. | `core/style-loader.mjs`, `entry/entry-coordinator.mjs`, `entry/login.mjs`, `entry/password-recovery.mjs`, `entry/profile-selection.mjs`, `data/profile-repository.mjs`, `services/auth-adapter.mjs`, `services/auth-storage.mjs`, `services/public-auth-config.mjs`, `services/network-client.mjs`, `services/service-worker.mjs`, `services/external-diagnostics.mjs`, `services/external-services-client.mjs`, `services/sound-manager.mjs`, `services/clock-manager.mjs`, `services/supabase-state-sync.mjs`, `services/security-identity.mjs`, `core/document-metadata.mjs`, `core/experience.mjs`, `core/presence-engine.mjs`, `ui/dom.mjs`, `ui/navigation.mjs`, `ui/empty-state.mjs`, `ui/visual-haptics.mjs`, `ui/native-behavior.mjs`, `ui/touch-interactions.mjs`, `ui/tooltip.mjs`, `i18n/runtime.mjs`, `i18n/catalog.mjs` |

---

**Résumé statistique :**
- **Total de fichiers .mjs inventoriés :** 105
- **app :** 1 fichier
- **brain :** 7 fichiers
- **command :** 4 fichiers
- **core :** 13 fichiers
- **data :** 10 fichiers
- **entry :** 4 fichiers
- **i18n :** 2 fichiers
- **pages :** 24 fichiers
- **services :** 45 fichiers
- **ui :** 47 fichiers
- **utils :** 3 fichiers
- **styles :** 0 fichier .mjs (dossier CSS uniquement)
- **racine :** 1 fichier (main.mjs)
