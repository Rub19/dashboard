# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [Unreleased]

**Migration Next.js : branchement Cloud Sync sur les tâches**

### Corrige
- `ethone-next/lib/hooks/useCloudTasks.ts` : adaptateur autour de `useTasks` exposant le même contrat `Item` que `useItems` pour la compatibilité `TasksWidget`.
- `ethone-next/components/TasksWidget.tsx`, `DashboardOverview.tsx` : remplacement de `useItems("tasks")` par `useCloudTasks`. Les tâches sont désormais lues/écrites dans la table Supabase `tasks` avec synchronisation Realtime.

**Migration Next.js : ajustements UI et version check avant branchement Cloud Sync**

### Corrige
- `ethone-next/components/Shell.tsx`, `TopBar.tsx`, `Dock.tsx`, `animated-sidebar.tsx` : réintégration et amélioration de la barre latérale animée, du trigger et du bouton workspace.
- `ethone-next/components/TopBar.tsx` : remplacement du lien "E" par `AnimatedSidebarTrigger`, styles des icônes top-bar raffinis (`pointer-events-none`, tailles `h-9 w-9`).
- `ethone-next/components/BrainChat.tsx`, `UserProfileDropdown.tsx` : utilisation du `publicProfile.display_name` pour personnaliser le nom d'utilisateur.
- `ethone-next/lib/hooks/useVersionChecker.ts`, `components/layout/VersionPill.tsx` : comparaison de versions par `version`, `commit` et `buildAt` ; gestion du `dismiss` sur 1 h ; transmission des données de version à `forceAppReload`.
- Suppression des `max-w-7xl mx-auto` sur les pages principales (`calendar`, `feature-fallback`, `interactions`, `plugins/[id]`, `profile`, `scratchpad`, `tasks`) pour un rendu pleine largeur.
- `ethone-next/tsconfig.json` : inclusion de `dist2/types` pour la compatibilité build alternatif.

**Migration Next.js : fondation Cloud Sync — settings, tâches, layout et pomodoro dans Supabase**

### Corrige
- `supabase/migrations/202608290001_cloud_sync_foundation.sql` : nouvelles tables `user_settings`, `desktop_layout`, `tasks` et `pomodoro_sessions`, index et politiques RLS fortes (`auth.uid() = user_id`).
- `ethone-next/lib/supabase-server.ts` : client Supabase SSR pour Server Actions / Route Handlers.
- `ethone-next/lib/hooks/useUserSettings.ts` : chargement/écriture depuis `user_settings` avec mises à jour optimistes et canal Realtime.
- `ethone-next/lib/hooks/useTasks.ts` : CRUD tâches synchronisé via Supabase avec Realtime.
- `ethone-next/lib/hooks/useDesktopLayout.ts` : chargement/sauvegarde de la disposition Bento depuis `desktop_layout`.
- `ethone-next/lib/hooks/usePomodoroSession.ts` : session Pomodoro synchronisée depuis `pomodoro_sessions`.
- `ethone-next/lib/stores/sync.ts` : store global d'état de synchronisation par source.
- `ethone-next/components/layout/StatusBar.tsx` : badge de sync branché sur le store (`idle / syncing / offline / error`).

**Migration Next.js : sélecteur d'espace de travail Bento et ajustements SidePanel**

### Corrige
- `ethone-next/components/DashboardOverview.tsx` : remplace le `<select>` natif du header par le composant `Select` Bento glassmorphism ; ajout d'un état `workspace` contrôlé et conservation du style sans `max-w-7xl`.
- `ethone-next/components/SidePanel.tsx` : import du type `Notification` manquant et nettoyage des destructures inutilisées pour corriger le build TypeScript ; refactor visuel du centre de notifications avec `NotificationItem`.

**Migration Next.js : alias mail privés par utilisateur**

### Corrige
- `worker/src/middleware/auth.js` : expose `email` et `displayName` (depuis les claims JWT) pour personnaliser l'alias par défaut.
- `worker/src/services/mail-client.js` : `getOrCreatePrimaryAlias` génère désormais un alias unique par utilisateur avec suffixe aléatoire en cas de collision ; `createRandomAlias` permet de créer une adresse aléatoire `u-XXXXXXXX@ethone.dev`.
- `worker/src/routes/mail.js` : `mailSendRoute`, `mailDraftsRoute` et `mailScheduleRoute` acceptent un `alias_id` (ou `from_alias`) pour choisir l'adresse d'envoi ; `mailAliasRoute` accepte une adresse personnalisée, un format local sans domaine ou l'option `random: true`.
- `ethone-next/lib/hooks/useMail.ts` : `createAlias` accepte un objet `{ random: true }` ou un alias texte, `sendMail` et `saveDraft` acceptent `alias_id`.
- `ethone-next/components/mail/ComposeMailModal.tsx` : ajout du champ "De" avec sélecteur d'alias, création d'une adresse personnalisée et génération d'une adresse aléatoire avant l'envoi.
- `ethone-next/components/mail/MailAliasSetup.tsx` : nouvel écran de configuration sur la page Mail lorsqu'aucun alias n'existe, avec saisie personnalisée, bouton aléatoire et création rapide.
- `ethone-next/components/mail/MailSidebar.tsx` : le bouton "Nouveau message" est désactivé tant qu'aucun alias n'est configuré.
- `ethone-next/app/mail/page.tsx` : affiche `MailAliasSetup` si l'utilisateur n'a pas d'alias, transmet les alias au modal de composition et envoie l'`alias_id` au Worker.
- `ethone-next/components/MailAdvancedPanel.tsx` : nouvel onglet "Aliases" pour lister les alias existants, créer un alias personnalisé, générer un alias aléatoire et identifier l'alias principal.
- `ethone-next/lib/i18n-extras.ts` : clés i18n pour la gestion des alias (`aliases`, `createAlias`, `createRandomAlias`, `primary`, etc.).
- `worker/test/mail.test.mjs` : tests d'unicité, d'appartenance, d'alias aléatoire et de routage réception uniquement vers le propriétaire de l'alias.

**Migration Next.js : 404 glitch et menu contextuel générique**

### Corrige
- `ethone-next/app/not-found.tsx` : nouvelle 404 avec gros code `404` qui se “scramble” au chargement, effet de chromatic aberration au survol, et style ETHONE (verre, bordures, boutons).
- `ethone-next/components/ContextMenu.tsx` : support de deux modes : menu popup global via `ContextMenuProvider` (flèche, actions rapides) et wrapper `<ContextMenu items={...}>{children}</ContextMenu>` pour afficher un menu contextuel sur n'importe quel élément (Fichiers, LiveWidgets, Notes).
- `ethone-next/components/ContextMenu.tsx` : les items peuvent utiliser des noms d'icônes (`string`) via `Icon`, accepter `separator: true` et `danger: true`.

**Migration Next.js : effet 3D tilt sur les cartes**

### Corrige
- `ethone-next/components/ui/TiltCard.tsx` : nouveau composant `TiltCard` (tilt 3D au survol, glare, `useHoverCapable`, `useReducedMotion`, spring `SPRING_MOUSE`).
- `ethone-next/lib/hooks/use-hover-capable.ts` : détecte les appareils avec support du hover souris.
- `ethone-next/lib/ease.ts` : ajout de `SPRING_MOUSE` et des constantes d'easing.
- `ethone-next/components/BentoCard.tsx` : le BentoCard est maintenant un TiltCard (tous les widgets qui l'utilisent ont le tilt).
- `ethone-next/components/ConnectionCard.tsx`, `GamingCard.tsx`, `WeatherWidget.tsx`, `SocialDiscordCard.tsx`, `MinecraftWidget.tsx` : enveloppés dans `TiltCard` pour obtenir le tilt 3D au survol.

**Migration Next.js : ajout de l'icône Mail dans le Dock**

### Corrige
- `ethone-next/components/Dock.tsx` : ajout d'un bouton `Mail` (enveloppe) dans le Dock, à côté des notifications, qui ouvre `/mail/` en un clic.

**Migration Next.js : correction du bouton Remonter en haut du Dock**

### Corrige
- `ethone-next/components/Dock.tsx` : le bouton `ChevronUp` du Dock scroll maintenant vers le haut en détectant le bon élément scrollable (`document.documentElement` ou `body`) ; l'`aria-label` a été corrigé (`scrollToTop`, "Remonter en haut").

**Migration Next.js : amélioration de la GamingCard Minecraft**

### Corrige
- `ethone-next/components/GamingCard.tsx` : utilise l'`avatarUrl` du profil Minecraft renvoyé par l'API (`crafatar.com`) en priorité, avec un fallback `mc-heads.net` ; remplacement de l'image `<img>` par `next/image` ; masque le bloc Serveur quand aucune donnée serveur n'est disponible ; affiche un état vide avec bouton "Configurer Minecraft" quand aucun pseudo n'est lié.

**Migration Next.js : avertissement de perturbation GitHub dans la carte d'intégration**

### Corrige
- `ethone-next/lib/hooks/useGitHubStatus.ts` : nouveau hook qui interroge le statut public de GitHub (`www.githubstatus.com/api/v2/status.json`) toutes les minutes.
- `ethone-next/components/ConnectionCard.tsx` : pour l'intégration `github`, affiche un bandeau ambre "GitHub rencontre actuellement des perturbations" avec la description officielle dès que l'indicateur n'est pas `none`.

**Migration Next.js : pastille de version dans la barre de statut**

### Corrige
- `ethone-next/components/layout/VersionPill.tsx` : nouvelle pastille fixe dans la barre de statut affichant la version courante (`v1a2b3c4`) ; devient ambre avec une flèche quand une nouvelle version est disponible et force un rechargement propre au clic.
- `ethone-next/components/layout/StatusBar.tsx` : intégration de `VersionPill` à droite, juste avant l'indicateur `Opérationnel`.
- `ethone-next/lib/hooks/useVersionChecker.ts` : expose désormais `currentVersion` pour permettre l'affichage de la version en cours.
- `ethone-next/lib/version.ts` : utilitaire `formatVersion()` partagé entre `VersionPill` et `VersionUpdateToast`.

**Migration Next.js : bouton "Tout rafraîchir" dans les réglages**

### Corrige
- `ethone-next/lib/force-reload.ts` : nouvel utilitaire `forceAppReload()` qui désenregistre les Service Workers, vide tous les caches, supprime `ethone:update-dismissed` et recharge avec `?__reload=<timestamp>`.
- `ethone-next/components/VersionUpdateToast.tsx` : utilisation de `forceAppReload()` pour le bouton "Mettre à jour".
- `ethone-next/components/settings/SettingsLayout.tsx` : nouvelle carte `Application` dans la vue d'ensemble avec un bouton "Tout rafraîchir" pour forcer un rechargement frais à la demande.

**Migration Next.js : ajustement gauge Productivité et Rythme**

### Corrige
- `ethone-next/components/ProductivityCards.tsx` : agrandissement du conteneur du `CircularGauge` (`h-20 w-20`, SVG `size={72}`, stroke `5`) et réduction du texte de pourcentage (`text-xs`) pour éviter que "100%" ne chevauche le cercle.

**Migration Next.js : toast de mise à jour fiable et forçage de reload**

### Corrige
- `ethone-next/lib/hooks/useVersionChecker.ts` : détection plus fréquente (focus, visibility, pageshow, online), gestion du `dismiss` avec délai de réapparition, fonction `check()` exposée, vérification via `/api/version` puis `/version.json`.
- `ethone-next/components/VersionUpdateToast.tsx` : nouvelle notification flottante en bas de l'écran avec badge de version, bouton vert "Mettre à jour" qui désenregistre les Service Workers, vide tous les caches et recharge avec un paramètre `__reload` anti-cache.
- `ethone-next/public/sw.js` : le service worker ne met plus en cache `/version.json` pour garantir une détection fiable des nouvelles versions.

**Migration Next.js : correction navigation Réglages et états des intégrations**

### Corrige
- `ethone-next/components/settings/SettingsLayout.tsx` : navigation par onglets pilotée par l'URL (`?tab=...`) avec `useRouter`, ajout des onglets `Général` et `Sécurité`, suppression du `useEffect` qui écrasait l'onglet actif, synchronisation robuste via `queryString` pour éviter les retours en arrière.
- `ethone-next/components/ConnectionCard.tsx` : bascule correcte entre "Connecter" (vert émeraude) quand le service n'est pas connecté et "Déconnecter" (rose discret) quand il l'est ; badge de statut "Non connecté" / "Connecté" ; masquage du bouton Déconnecter pour les services non configurés.
- `ethone-next/components/SpotifyConfig.tsx` : vérification de l'état OAuth via `/api/connections`, affichage conditionnel de Connecter/Déconnecter selon l'état réel, déconnexion via l'API worker.
- `ethone-next/components/DiscordConfig.tsx` : bouton "Connecter" émeraude à la sauvegarde initiale, affichage du bouton "Déconnecter" uniquement après connexion, badge de statut harmonisé.

**Migration Next.js : refonte UI du widget Tâches (TasksWidget, TodoList, TasksCard)**

### Corrige
- `ethone-next/components/TasksWidget.tsx` : nouveau widget Bento glassmorphic sombre avec en-tête icône badge, compteur `done / total`, barre de progression, input d'ajout rapide et intégration de `TodoList`.
- `ethone-next/components/TodoList.tsx` : filtres pills "Toutes / En cours / Terminées / Prioritaires", liste animée et état vide avec `CheckCircle2`.
- `ethone-next/components/TasksCard.tsx` : carte de tâche avec tickbox carré arrondi animé, titre barré si terminé, date d'échéance, badge de priorité (rose/ambre/bleu) et action Supprimer au survol.
- `ethone-next/app/tasks/page.tsx` : page simplifiée utilisant `TasksWidget`.
- `ethone-next/components/DashboardOverview.tsx` : section productivité remplacée par `TasksWidget` (données partagées via `useItems("tasks")`).

**Migration Next.js : version checker et notification de mise à jour**

### Corrige
- `ethone-next/lib/hooks/useVersionChecker.ts` : hook client qui interroge `/api/version` puis `/version.json` pour détecter un nouveau build, avec cooldown, intervalle 5 minutes et re-vérification au focus/visibilité.
- `ethone-next/components/VersionUpdateToast.tsx` : toast fixe en haut à droite affichant la version détectée, avec actions "Mettre à jour" (purge Service Worker / caches + reload) ou "Plus tard".
- `ethone-next/app/api/version/route.ts` : route API statique retournant `version` et `buildAt` avec `Cache-Control: no-store`.
- `ethone-next/next.config.ts` : génération de `public/version.json` au build à partir des variables d’environnement `CF_PAGES_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA` ou `NEXT_PUBLIC_APP_VERSION`.
- `ethone-next/app/layout.tsx` : intégration de `<VersionUpdateToast />` dans l’arbre de providers.
- `ethone-next/.gitignore` : ignore `public/version.json` auto-généré.

**Migration Next.js : restauration i18n et contrôles des réglages**

### Corrige
- `ethone-next/lib/i18n.ts` : `t()` accepte un argument `fallback` pour éviter l'affichage des clés brutes en JSX.
- `ethone-next/lib/hooks/useI18n.ts` : le hook accepte `...args: unknown[]` et extrait le premier `string` comme fallback.
- `ethone-next/lib/i18n-extras.ts` : ajout des clés de paramètres manquantes en français, anglais, espagnol et allemand (`settingsGeneral`, `settingsTheme`, `settingsLanguage`, couleurs d'accent, modes d'affichage, options du dock, langues, sons ambiant, etc.).
- `ethone-next/components/settings/SettingsLayout.tsx` : titre et sous-titre utilisent `settingsGeneral` / `settingsGeneralDesc` avec fallback français.
- `ethone-next/components/settings/SettingsContent.tsx` : libellés des champs thème, langue, couleur d'accent et effets sonores utilisent `settingsTheme`, `settingsLanguage`, `settingsAccentColor` et `settingsSounds` avec fallback français.

**Migration Next.js : standardisation des arrondis et refonte cartes Calendrier/Factures**

### Corrige
- Normalisation globale des rayons Tailwind sur `ethone-next/components/`, `app/` et `lib/hooks/` :
  - `rounded-3xl` → `rounded-2xl` pour les grandes cartes et modales.
  - `rounded-[2rem]` / grandes valeurs dynamiques → `rounded-2xl`.
  - `rounded-full` sur boutons, inputs, badges, pillules et barres remplacé par `rounded-lg` / `rounded-xl`.
  - Conservation de `rounded-full` pour les vrais cercles : avatars, pastilles d'état, interrupteurs, anneaux et éléments `h-2 w-2`.
- `ethone-next/components/SettingsProvider.tsx` : encadrement des variables CSS `--card-radius` (max 16px), `--dock-radius` (max 16px), `--panel-radius` et `--control-radius` (max 12px) pour éviter les rayons gonflés quel que soit le curseur de réglage.
- `ethone-next/lib/settings.ts` : valeurs par défaut `radius` et `dockRadius` ramenées à 16.
- `ethone-next/components/EventsAndBillsCards.tsx` : composant regroupant `EventsCard` (sélecteur de source, liste d'événements, CTA `Ajouter`) et `InvoicesCard` (total du mois, échéances 30 jours, sélecteur de semaine 7 jours en grille, actions `Ajouter` / `Scanner`).
- `ethone-next/components/CalendarInvoicesPage.tsx` : intégration de `EventsCard` et `InvoicesCard` dans la colonne latérale.

**Migration Next.js : correction des widgets Gaming, Social & Météo**

### Corrige
- `ethone-next/components/GamingCard.tsx` : nouveau widget gaming compact avec avatar Minecraft résilient (`mc-heads.net` avec fallback `minotar.net` via `onError`) et badges `Slim` / `Cape`.
- `ethone-next/components/SocialDiscordCard.tsx` : nouveau widget social Discord avec construction du CDN Discord, fallback d'avatar par défaut, pastille de statut sur l'avatar et détails d'activité sur plusieurs lignes sans tronquage.
- `ethone-next/components/WeatherWidget.tsx` : suppression des hauteurs fixes bloquantes (`h-full`), padding augmenté à `p-5`, prévisions en pillules `min-h-[64px]`, grille de 4 indicateurs et correction du libellé UV (`UV 0` au lieu de `UV UV 0`).
- `ethone-next/components/LiveTopBento.tsx` : intégration de `GamingCard`, `SocialDiscordCard` et suppression des `min-h-[170px]` sur le conteneur météo.
- `ethone-next/components/DashboardOverview.tsx` : utilisation de `GamingCard` et `SocialDiscordCard` dans la rangée inférieure.
- `ethone-next/lib/hooks/useLiveData.ts` : ajout de `username`, `avatarHash` et `discriminator` à `LanyardPresence`.

**Migration Next.js : refonte du tableau de bord en Bento 12 colonnes dense**

### Corrige
- `ethone-next/components/DashboardOverview.tsx` : grille 12 colonnes (`grid-cols-12 gap-4 max-w-7xl`) avec sections `homeHiddenSections` préservées, mode de personnalisation, et nouvelle disposition Bento.
- `ethone-next/components/HeroBriefingCard.tsx` : carte principale regroupant le salut dynamique, la date, le prompt rapide Brain, la réponse assistante et des compteurs compact (tâches, événements, notes, stockage).
- `ethone-next/components/SystemControlCard.tsx` : centre de contrôle unifié pour la présence (4 statuts), les auras thématiques et le mode de session.
- `ethone-next/components/ProductivityCards.tsx` : triptyque `DayTimelineCard`, `ProjectsTasksCard`, `RecentNotesCard` — agendas du jour, indicateurs circulaires de tâches, focus et courriel non lu, et deux dernières notes avec création rapide.
- `ethone-next/app/page.tsx` : point d'entrée vers `DashboardOverview`.
- `ethone-next/components/IntegrationCard.tsx` : re-export temporaire de `ConnectionCard` pour résoudre l'import manquant dans `IntegrationsSettings`.

**Migration Next.js : refactorisation du Dock flottant**

### Corrige
- `ethone-next/components/Dock.tsx` : position remontée à `bottom-14` pour laisser un espace de 24 px au-dessus de la `StatusBar`, conteneur agrandi (`px-3 py-2 gap-2`), bordure et ombre renforcées, effet de survol `hover:border-white/15`.
- `ethone-next/components/DockItem.tsx` : cibles cliquables agrandies à `44×44 px` (`h-11 w-11`), icônes à `20×20 px` (`h-5 w-5`), pastille active repositionnée.
- `ethone-next/components/MediaDockItem.tsx` : agrandissement à `44×44 px` et icônes à `20×20 px` pour cohérence.

**Migration Next.js : refonte du Live / Home avec Bento Grid supérieur**

### Corrige
- `ethone-next/components/LiveTopBento.tsx` : rangée Bento 12 colonnes en haut de page regroupant Gaming (`LiveGamingCard`), Social & Spotify (`LiveSocialCard`) et Météo (`LiveWeatherCard` via `WeatherWidget` compact).
- `ethone-next/components/LiveOverview.tsx` : page d'accueil Live épurée avec titre, point néon pulsant et sous-titre.
- `ethone-next/app/page.tsx` : simplifié pour utiliser `LiveOverview`.

**Migration Next.js : refonte du Calendrier & Factures**

### Corrige
- `ethone-next/components/CalendarGrid.tsx` : grille mensuelle générée sans `0`, jours hors mois affichés avec de vraies dates estompées (`text-zinc-600 opacity-40`), en-tête des jours `Lun–Dim`, cellules `rounded-2xl` avec bordure d'accent thématique, pastille d'aujourd'hui et micro-puces (bleu = réunion, violet = facture, vert = flow).
- `ethone-next/components/CalendarInvoicesPage.tsx` : layout Bento 2 colonnes (`grid-cols-12 gap-5`) avec calendrier principal à gauche et volet latéral à droite (`DayEventsCard` + `InvoicesSummaryCard`), header épuré avec mois/année, flèches et bouton "Aujourd'hui".
- `ethone-next/components/DayEventsCard.tsx` : carte d'agenda du jour sélectionné, liste des échéances/factures, état vide avec icône `Calendar`, bouton d'ajout rapide.
- `ethone-next/components/InvoicesSummaryCard.tsx` : carte financière avec total mensuel, échéances à 30 jours, actions "Nouvelle facture" et "Scanner reçu".
- `ethone-next/app/calendar-bills/page.tsx` : simplifié pour utiliser `CalendarInvoicesPage`.

**Migration Next.js : refonte du module Focus / Pomodoro**

### Corrige
- `ethone-next/components/FocusTimerRing.tsx` : anneau SVG de progression circulaire avec double cercle, `stroke-linecap-round`, style dynamique `var(--accent-color)` + `var(--accent-glow)`, affichage central du temps restant et du cycle.
- `ethone-next/components/FocusPage.tsx` : interface de concentration complète avec :
  - Sélecteur de préréglages animé par `layoutId="activeFocusPreset"` (Pomodoro, Deep Work, Sprint, Personnalisé).
  - Contrôles Play/Pause/Reset/Skip stylisés avec le thème actif.
  - Mode Zen intégré avec plein écran, fond subtil et sortie discrète.
  - Grille Bento des statistiques (Pomodoros, Temps Focus, Pauses) avec `rounded-2xl`.
- `ethone-next/app/focus/page.tsx` : simplifié pour utiliser `FocusPage`.

**Migration Next.js : Bento Grid et refonte de la Vue d'ensemble**

### Corrige
- `ethone-next/components/ui/BentoCard.tsx` : nouvelle carte générique Bento avec arrondis `rounded-2xl` maîtrisés, glassmorphism précis (`bg-zinc-950/70`, `backdrop-blur-2xl`, bordure `white/[0.08]`), lueur interne au survol, en-tête uniformisé (icône carrée arrondie + titre uppercase + action).
- `ethone-next/components/DashboardOverview.tsx` : refonte complète de la page d'accueil en grille Bento 12 colonnes, répartition responsive des modules (Minecraft/Compte, Météo, Media, Stats), header moderne avec titre, sous-titre, sélecteur de workspace et bouton "Personnaliser la grille".
- `ethone-next/app/page.tsx` : simplifié pour utiliser `DashboardOverview`.
- Remplacement des `Card3D` et `SectionWrap` par `BentoCard` dans le dashboard : sections Continuité, Daystream, Récent, Productivité, Signaux, Recommandation, Brain, Live.
- Suppression des arrondis "bulle de savon" au profit de `rounded-2xl` cohérent.

**Migration Next.js : refonte des paramètres avec thème dynamique et sidebar coulissante**

### Corrige
- `ethone-next/components/settings/ThemePicker.tsx` : nouveau composant de sélection de thème avec cartes interactives, mini-palette (fond, texte, accent), bordure active `var(--accent-color)`, badge `CheckCircle2` et transitions.
- `ethone-next/components/settings/SettingsSidebar.tsx` : barre de navigation latérale avec indicateur coulissant `layoutId`, style glassmorphism, synchronisation au défilement via `IntersectionObserver`.
- `ethone-next/components/settings/Settings.tsx` : nouveau layout principal de la page Réglages avec header épuré, recherche, sidebar sticky et contenu.
- `ethone-next/app/settings/page.tsx` : simplifié pour utiliser `Settings`.
- `ethone-next/components/settings/SettingsBottomBar.tsx` : boutons `Enregistrer` et `Annuler` stylisés avec `var(--accent-color)` et `var(--accent-glow)`.
- `ethone-next/components/settings/DangerZone.tsx` : boutons secondaires et danger modernisés.
- `ethone-next/components/settings/AppearanceSettings.tsx` : utilise `ThemePicker`, suppression du picker inline.

**Migration Next.js : refonte du Activity Hub / Journal d'activité**

### Corrige
- `ethone-next/components/ActivityHub.tsx` : nouveau composant complet avec :
  - Matrice de contribution (heatmap) à 4 niveaux d'intensité emerald, infobulle `x actions le {date}`, légende "Moins / Plus".
  - 4 cartes de statistiques modernes (Aujourd'hui, Série active, Semaine, Cohérence) avec icônes thématiques, typographie contrastée et fond glassmorphism.
  - Barre d'outils avec recherche, filtres catégorie/type, pilule unifiée de synchronisation (erreur + Réessayer, état + bouton Synchroniser).
  - Liste des entrées groupées par date avec séparateurs clairs, icônes de catégorie, badges et horodatages monospace.
- `ethone-next/app/activity/page.tsx` : simplifié pour utiliser `ActivityHub` tout en conservant `LiveWidgets`.

**Migration Next.js : indicateur de filtre glissant avec AnimatedFilterTabs**

### Corrige
- `ethone-next/components/ui/AnimatedFilterTabs.tsx` : nouveau composant de filtre d'onglets avec pilule active coulissante via Framer Motion `layoutId`, transition spring (`stiffness: 450, damping: 35`), style glassmorphism avec fond teinté discret et compteurs optionnels.
- `ethone-next/components/NotificationCenter.tsx` : remplacement de la barre de filtres bruts par `AnimatedFilterTabs`, avec calcul du nombre d'éléments par filtre.

**Migration Next.js : remplacement des modales brutes par le composant Modal générique**

### Corrige
- `ethone-next/components/ui/Modal.tsx` : ajout des props `position` (center/bottom/top), `fullScreen`, `hideCloseButton` et `contentClassName` pour couvrir les tiroirs, panneaux plein écran et palette de commandes.
- Remplacement complémentaires : `components/MissionControl.tsx`, `components/CommandPalette.tsx` et `components/ShortcutsOverlay.tsx`.
- Remplacement des modales brutes et `BottomSheet` par `Modal` dans :
  - `components/ConnectionInspector.tsx`
  - `components/CalendarBills.tsx`
  - `components/tabs/TabList.tsx`
  - `components/BillsWidget.tsx`
  - `components/NotificationCenter.tsx` (mode mobile)
  - `app/mail/page.tsx` (composer, panneau et tiroirs d'action)
  - `app/files/page.tsx` (création/renommage/déplacement/partage/drop et admin)
  - `app/brain/page.tsx` (préparer demain)
  - `app/scratchpad/page.tsx`
- Suppression des imports `BottomSheet` là où il n'est plus utilisé.

**Migration Next.js : arrière-plan cosmique performant avec fallback statique**

### Corrige
- `ethone-next/lib/hooks/useCosmicPerformance.ts` : détection mobile/tablette (pixel ratio limité), surveillance FPS, Page Visibility API.
- `ethone-next/components/CosmicBackground.tsx` : rendu Canvas optimisé avec modes `high` / `balanced` / `low` / `static`. Pause immédiate sur onglet inactif, réduction automatique si FPS < 40 pendant plus de 3 secondes, nettoyage des listeners et `cancelAnimationFrame`. Fallback statique CSS pur en mode `static`.
- `ethone-next/lib/settings.ts`, `components/SettingsProvider.tsx`, `components/settings/SettingsContent.tsx` : ajout du réglage `backgroundQuality` avec les options Élevé / Équilibré / Économique / Statique.
- `ethone-next/components/Shell.tsx` : remplacement de `<AmbientParticles />` par `<CosmicBackground />`.

**Migration Next.js : composant Modal générique accessible**

### Corrige
- `ethone-next/components/ui/Modal.tsx` : ajout d'une modale en verre dépoli avec backdrop, focus trap, fermeture `Échap` et clic extérieur, verrouillage du scroll, animation Framer Motion. Support des variants `danger`/`primary`, des tailles `sm`/`md`/`lg`, de `confirmDisabled`, et des pieds d'actions Annuler/Confirmer.
- `ethone-next/components/settings/DangerZone.tsx` : remplacement de la modale brute par le nouveau composant `Modal`.

**Migration Next.js : stabilisation UI/UX ETHONE — dock macOS, tokens globaux et animations**

### Corrige
- `ethone-next/app/globals.css` : ajout des design tokens `--panel-radius`, `--panel-border`, `--panel-bg`, `--panel-blur`, `--panel-padding`, `--item-gap` et des utilitaires `.v8-panel`, `.v8-card`, `.v8-dock`. Désactivation du dock magnify/pulse et des animations ambient/presence lourdes. Fallbacks de transition raccourcis à 150 ms.
- `ethone-next/components/SettingsProvider.tsx` : synchronisation dynamique des tokens de panneau selon `radius`, `radiusStyle`, `glassEnabled`, `interfaceBlurEnabled`, `densityMode` et `uiAnimations`. Durée de transition ambiante réduite à 150 ms.
- `ethone-next/components/Dock.tsx` : conteneur externe transparent et `pointer-events-none`, dock interne isolé en pill arrondi avec `pointer-events-auto` et `overflow-hidden`. Contrôles en `transition-colors duration-150` et `active:scale-[0.98]`.
- `ethone-next/components/Card3D.tsx` : suppression de la 3D, des spotlights et des ressorts Framer Motion. Passage à une `div` simple utilisant `.v8-card` et `var(--panel-radius)`.
- Synchronisation de 108 fichiers `.tsx` : `rounded-xl/2xl/lg` → `rounded-[var(--panel-radius)]`, `transition-all` → `transition-colors duration-150`, ressorts `type: "spring"` → `duration: 0.15 ease: "easeOut"`. Nettoyage des `hover:scale` superflus.
- Finalisation de la tokenisation : remplacement des arrière-plans (`bg-[var(--surface)]`, `bg-surface/60`, `bg-white/[...]`, `bg-zinc-900/...`) par `bg-[var(--panel-bg)]` et des bordures `border-[var(--border)]` par `border-[var(--panel-border)]`. Ajout de `backdrop-blur-[var(--panel-blur)]` sur les conteneurs concernés.
- `ethone-next/lib/icons.tsx` : le composant `Icon` accepte maintenant une prop `pack` optionnelle.

**Migration Next.js : réduire espaces vides Settings**

### Corrige
- `app/settings/page.tsx` : padding et espacement réduits.
- `components/settings/SettingsContent.tsx` : passage en une seule colonne centrée `max-w-3xl`, plus de grille 2 colonnes qui laissait des trous.
- `components/settings/SettingsSection.tsx` : padding réduit.
- `components/settings/SettingField.tsx` : padding vertical réduit.
- `components/settings/SettingControls.tsx` : boutons plus compacts.
- `components/settings/AppearanceSettings.tsx` : espacement réduit, section effets plus compacte.
- `components/LiveSettings.tsx` : espacement et gap réduits.
- `components/Shell.tsx` : suppression du `pt-safe` doublon sur `main`.
- `components/BottomSheet.tsx` : suppression du `pb-safe` doublon sur le contenu.

**Migration Next.js : refonte mobile navigation et notifications**

### Corrige
- `ethone-next/app/globals.css` : `html/body` passent en `min-height: 100dvh`, `overflow-x: hidden`, `touch-action: manipulation`. Ajout des helpers `.pt-safe`, `.px-safe` et forçage de `16px` sur les inputs tactiles.
- `ethone-next/app/layout.tsx` : `body` en `min-h-dvh overflow-x-hidden`.
- `ethone-next/components/Shell.tsx` : coque en `min-h-dvh`, `overflow-x-hidden`, padding bas mobile avec `env(safe-area-inset-bottom)`, header avec `pt-safe`.
- `ethone-next/components/Sidebar.tsx` : `h-screen` → `h-dvh`.
- `ethone-next/components/MobileNav.tsx` : drawer `h-dvh` scrollable/swipeable, targets tactiles `44px`, effet `active:scale`.
- `ethone-next/components/BottomSheet.tsx` : hauteur en `dvh`, poignée drag agrandie, `pb-safe`, contenu en `max-h-[calc(85dvh-4rem)]`.
- `ethone-next/components/NotificationCenter.tsx` : Bottom Sheet notifications en `dvh`, filtres tactiles `snap-x`, input en `text-base md:text-sm`.
- `ethone-next/components/NotificationItem.tsx` : menu d'actions mobile `more-vertical`, targets `44px`, couleurs tokenisées.
- `ethone-next/components/ui/Select.tsx` : trigger `text-base md:text-sm`, hauteur `44px` mobile.
- `ethone-next/components/SidePanel.tsx`, `SearchBar.tsx`, `LanguageSwitcher.tsx` : boutons topbar agrandis pour respecter `44×44px`.

**Migration Next.js : compacter Settings**

### Corrige
- `components/settings/SettingsSection.tsx` : padding et icône réduits, radius plus discret.
- `components/settings/SettingField.tsx` : padding réduit de `px-5 py-4` à `px-4 py-2.5`, espaces internes resserrés.
- `components/settings/SettingsContent.tsx` : `space-y-6` → `space-y-4`, `gap-4` → `gap-3`.
- `components/settings/SettingControls.tsx` : `ButtonGridControl` plus compact.

**Migration Next.js : i18n météo**

### Corrige
- `ethone-next/lib/i18n.ts` : ajout des clés `weatherDescription`, `dayNight`, `day`, `night`, `temperature` pour les langues fr, en, es, de.

**Migration Next.js : composant Slider moderne**

### Corrige
- `ethone-next/components/ui/Slider.tsx` : refonte avec piste fine, active en `var(--accent)` avec glow, poignée blanche bordée d'accent, effet scale au hover/drag, badge de valeur stylisé.
- Remplacement des `<input type="range">` natifs par `Slider` dans :
  - `components/settings/AppearanceSettings.tsx`
  - `components/LiveWidgets.tsx` (2 lecteurs Spotify)
  - `components/settings/SettingControls.tsx` utilisait déjà `Slider` (amélioré par le composant).

**Migration Next.js : adoucir animation sidebar**

### Corrige
- `ethone-next/components/SidebarItem.tsx` : remplacement des sauts de classes `w-0` / `w-full` par des transitions CSS sur `width`, `maxWidth`, `opacity` et `marginLeft`. L'ouverture/fermeture est maintenant fluide.
- `ethone-next/components/Sidebar.tsx` : le titre `ETHONE` utilise aussi `maxWidth` au lieu de `w-0`, sans délai saccadé.

**Migration Next.js : refaire design Météo**

### Corrige
- `ethone-next/app/weather/page.tsx` : refonte complète avec un hero, icône dynamique selon le code WMO, grille de détails (humidité, vent, jour/nuit, température), prévisions en cards modernes.
- `ethone-next/lib/icons.tsx` : ajout des icônes météo (cloud, cloudRain, cloudSnow, cloudLightning, cloudFog, cloudMoon, wind, droplets, thermometer, umbrella, sunrise).
- Les fonds gris transparents ont été remplacés par `bg-[var(--surface-raised)]` opaque, plus lisible.

**Migration Next.js : corriger UI Focus**

### Corrige
- `ethone-next/app/focus/page.tsx` : timer légèrement réduit, cercle plus petit, padding des cartes réduit, radius forcé à `1.5rem` pour éviter l'effet "pill" qui sort du cadre.
- `ethone-next/components/Card3D.tsx` : ajout des props `className`, `style` et `radius` pour contrôler le rayon et le style sans casser les autres usages.

**Migration Next.js : simplifier Mail sidebar et panels**

### Corrige
- `ethone-next/components/LiquidSidebar.tsx` : sidebar refaite sans Framer Motion, sans animation "liquid" qui provoquait des surlignages bizarres. Fond d'accent sur l'item actif, simple et fiable.
- `ethone-next/app/mail/page.tsx` : suppression du `draggable` sur tous les `BottomSheet` de tri, déplacement, labels et actions.

**Migration Next.js : ajouter provider Brain context local**

### Corrige
- `worker/src/services/ai-config.js` : ajout du provider `context` (local).
- `worker/src/services/ai-provider-clients.js` : ajout d'un moteur `context` qui répond localement avec des règles simples, sans clé API.
- `ethone-next/lib/brain/providers.ts` : ne remplace plus `context` par `groq` ; le provider est envoyé au worker tel quel.

Le Brain fonctionne maintenant avec le provider `context` (mode local) si aucune clé cloud n'est configurée. Pour obtenir des réponses plus riches, configure un provider cloud dans les préférences Brain.

**Migration Next.js : panneau Santé réduit par défaut**

### Corrige
- `ethone-next/components/DiagnosticPanel.tsx` : `expanded` passe à `false` par défaut.

**Migration Next.js : refaire page Interactions et heatmap GitHub**

### Corrige
- `ethone-next/app/interactions/page.tsx` : heatmap recodée avec des colonnes de semaines et des lignes de jours, style GitHub. Scroll horizontal, labels de mois, légende "less / more".
- `ethone-next/lib/interactions-heatmap.ts` : génération `weeks` avec 7 jours par colonne, plus de structure `matrix`.
- Ajout des filtres et formulaire plus clair.

**Migration Next.js : corriger synchronisation Google Drive**

### Corrige
- `ethone-next/lib/hooks/useCloudFiles.ts` : `syncWithDrive` liste maintenant les fichiers Google Drive côté worker, les convertit au format attendu et les envoie à `/api/cloud/files/sync`.
- `worker/src/services/cloud-files-client.js` : `buildFileRecord` appelait `safeText` avec les mauvais arguments, ce qui vidait tous les IDs et parents (`drive_file_id`, `drive_parent_id`, etc.). Corrigé avec les bons appels `safeText(value, max)` et gestion des tableaux `parents`.

**Migration Next.js : améliorer widget Minecraft avec Crafatar**

### Corrige
- `worker/src/services/minecraft-client.js` : ajout de `avatarUrl`, `bodyUrl` et `skinUrl` fallback via Crafatar. NameMC n'a pas d'API publique accessible, donc on utilise Crafatar qui est fiable et gratuit.
- `ethone-next/lib/hooks/useMinecraftLive.ts` : expose les nouvelles URLs.
- `ethone-next/components/LiveWidgets.tsx` : face avec l'avatar Crafatar, verso avec le rendu 3D du body, les tags Cape/Model, et l'historique des pseudos stylisé.

**Migration Next.js : moderniser panneaux Settings**

### Corrige
- `ethone-next/components/Switch.tsx` : switch plus épuré, sans labels ON/OFF, sans glow agressif, transition CSS simple.
- `ethone-next/components/settings/SettingControls.tsx` : ButtonGrid avec `check` actif, CheckboxList sans icône option invalide.
- `ethone-next/components/settings/SettingsSection.tsx` : sections arrondies avec ombre et padding plus aéré.
- `ethone-next/components/settings/SettingField.tsx` : padding uniforme, lignes plus subtiles.

**Migration Next.js : refondre le panel admin Fichiers**

### Corrige
- `ethone-next/components/FilesAdminPanel.tsx` : refonte complète avec gestion d'erreurs par requête, meilleur état de chargement, icônes sur les stats, recherche plus robuste, onglets plus clairs.
- `ethone-next/app/files/page.tsx` : le BottomSheet admin s'ouvre maintenant au centre et non plus en bas.
- `ethone-next/components/tabs/TabList.tsx` / `Tabs.tsx` / `types.ts` : suppression de l'ancienne prop `layoutId` devenue inutile.

**Migration Next.js : retirer animation moche dans les onglets Fichiers**

### Corrige
- `ethone-next/components/tabs/TabList.tsx` : remplacement du fond d'onglet animé Framer Motion par un fond statique.
- `ethone-next/app/files/page.tsx` : suppression de la prop `layoutId` inutile et amélioration du skeleton de chargement.

**Migration Next.js : moderniser widget Factures avec scan IA et logos**

### Corrige
- `ethone-next/components/BillsCalendarWidget.tsx` : redesign moderne, boutons "Ajouter" et "Scanner", formulaire d'ajout, suppression, affichage du logo fournisseur sur les jours et dans la liste.
- `ethone-next/lib/bills-brands.ts` : détection automatique des fournisseurs (Spotify, Netflix, YouTube, EDF, Orange, etc.) avec logo SimpleIcons et couleur.
- `worker/src/routes/bills-scan.js` : route `/api/bills/scan` pour OCR d'image via OpenAI (désactivée si `OPENAI_API_KEY` manquante).
- `ethone-next/lib/i18n.ts` : ajout des clés `billLabel`, `billAmount`, `scan`, `once`, `weekly`, `monthly`, `yearly`.

**Migration Next.js : améliorer messages d'erreur Google Calendar**

### Corrige
- `ethone-next/lib/hooks/useCalendarEvents.ts` : traduction et remplacement du message technique "Failed to fetch" par `calendarConnectionError`.
- `ethone-next/app/calendar/page.tsx` : affichage d'une icône et d'un hint explicite quand Google Agenda n'est pas accessible.
- `ethone-next/lib/i18n.ts` : ajout des clés `calendarConnectionError` et `calendarConnectionHint` (FR/EN/ES/DE).

**Migration Next.js : corriger surbrillance active Accueil dans la navigation**

### Corrige
- `ethone-next/lib/navigation.ts` : ajout de `isActiveRoute` pour traiter `/` (Accueil) comme une route exacte.
- `ethone-next/components/Sidebar.tsx`, `Dock.tsx`, `MobileNav.tsx` : utilisation de `isActiveRoute` pour éviter que l'accueil soit surligné sur toutes les pages.

**Migration Next.js : forcer coins arrondis sur le Dock**

### Corrige
- `ethone-next/app/globals.css` : `border-radius: 9999px !important` sur `[data-dock]` et `[data-dock-item]` pour éviter les coins carrés malgré `data-icon-radius="square"` ou `--icon-radius` petit.

**Migration Next.js : corriger animation et positionnement des tooltips**

### Corrige
- `ethone-next/components/UIProvider.tsx` : le tooltip démarre invisible (`hidden: true`) tant que sa position n'est pas calculée, évitant l'apparition à l'autre bout de l'écran.
- `ethone-next/app/globals.css` : animation fade-in/translate douce dès que le tooltip est positionné, au lieu d'un keyframe joué depuis une position hors écran.

**Migration Next.js : nettoyer et moderniser l'UI des settings**

### Corrige
- `ethone-next/components/settings/SettingControls.tsx` : `ButtonGridControl` et `CheckboxListControl` modernisés avec bordures accent, indicateurs visuels, icônes et états plus lisibles.
- `ethone-next/components/settings/SettingField.tsx` : alignement centré, meilleur espacement, suppression du badge "Saved" parasite.
- `ethone-next/components/settings/SettingsSection.tsx` : en-tête de section avec fond d'icône et espacement amélioré.

**Migration Next.js : retirer cloche quick action en double**

### Corrige
- `ethone-next/components/V8Breadcrumbs.tsx` : suppression de l’icône cloche quick action dans le header (doublon avec `NotificationCenter` dans `Shell`).

**Migration Next.js : corriger notifications et retirer les placeholders**

### Corrige
- `ethone-next/lib/hooks/useNotifications.ts` : suppression des notifications `SEED_DEMOS` et de la logique d’insertion automatique.
- `ethone-next/components/NotificationCenter.tsx` : boutons "Tout marquer comme lu" et "Tout effacer" toujours visibles, avec icônes, fonds et états `disabled`. Plus de disparition du bouton.

**Migration Next.js : debounce et validation de la recherche météo**

### Corrige
- `ethone-next/app/weather/page.tsx` : ajout d’un debounce de 600 ms et d’un état `searchTerm` distinct de l’input. Le bouton "Rechercher" valide et déclenche explicitement l’appel, évitant les requêtes à chaque caractère.

**Migration Next.js : ajouter traductions des thèmes manquants**

### Corrige
- `ethone-next/lib/i18n.ts` : ajout des clés `theme*` pour les thèmes non traduits (Obsidian, Minimal, Aurora, Night, etc.) dans `fr`, `en`, `es` et `de`.

**Migration Next.js : retirer layout animation du panel settings avancé**

### Corrige
- `ethone-next/components/settings/SettingsContent.tsx` : suppression du `layout` Framer Motion sur le conteneur des sections avancées pour éviter le recul/rebond du panel au clic.

**Migration Next.js : empêcher étirement vertical des cartes settings**

### Corrige
- `ethone-next/components/settings/SettingsContent.tsx` : ajout de `items-start` sur les grilles de sections pour que les petites cartes (Langue, etc.) ne s’étirent pas à la hauteur des voisines.

**Migration Next.js : décaler la barre de sauvegarde au-dessus du Dock**

### Corrige
- `ethone-next/components/settings/SettingsBottomBar.tsx` : position `bottom-20` au lieu de `bottom-6` pour éviter le chevauchement avec le Dock.

**Migration Next.js : fallback localStorage pour les Client IDs OAuth**

### Corrige
- `ethone-next/app/connections/page.tsx` : initialisation des champs Client ID avec un fallback `localStorage` (`ethone:clientId:<provider>`) en plus des settings.
- `ethone-next/components/ConnectionCard.tsx` : sauvegarde du Client ID dans `localStorage` avant la redirection OAuth.

**Migration Next.js : corriger persistance des credentials live au refresh**

### Corrige
- `ethone-next/lib/settings.ts` : `migrateSettings` ignore les champs `undefined` du remote et `loadSettingsAsync` retourne un `Partial<Settings>` sans écraser les defaults.
- `ethone-next/components/SettingsProvider.tsx` : merge `DEFAULTS → local → remote` pour ne pas écraser les credentials et IDs live saisis localement.

**Migration Next.js : carte Minecraft moderne + emojis + données**

### Corrige
- `ethone-next/components/LiveWidgets.tsx` : rendu front dédié pour Minecraft (skin, modèle, cape, historique de pseudos, emoji ⛏️).
- `lib/i18n.ts` : ajout de `nameHistory` (FR/EN/ES/DE).

**Migration Next.js : enrichir les cartes Live Discord et Météo**

### Corrige
- `ethone-next/components/LiveWidgets.tsx` : rendus front dédiés pour Discord (statut, activité, Spotify) et Météo (condition, humidité/vent, prévisions sur 3 jours) avec `ImageFallback`, icônes météo et design plus compact.

**Migration Next.js : refactor NotificationCenter et NotificationItem**

### Corrige
- Création de `ethone-next/components/NotificationItem.tsx` : actions rapides au survol (check, archive, menu), design épuré avec états lu/non lu/critique, point d'état et sortie animée.
- Refonte de `ethone-next/components/NotificationCenter.tsx` : filtres en rangée scrollable, header avec actions discrètes, barre de recherche focus subtil, liste avec `AnimatePresence` et scrollbar fine.
- Ajout de `moreActions` dans `lib/i18n.ts` (FR/EN/ES/DE) et utilitaire `.no-scrollbar` dans `globals.css`.

**Migration Next.js : retirer animations bump sur la page Activité**

### Corrige
- `ethone-next/app/activity/page.tsx` : retire `bump` des cartes (statistiques, heatmap, journal) pour éviter les animations/effets indésirables sur la Carte d'activité.

**Migration Next.js : fallback avatar Discord et URL avatar corrigée**

### Corrige
- `worker/src/services/lanyard-client.js` : utilise le `userId` fourni en fallback pour l’URL avatar et gère les avatars animés (`a_` → `.gif`).
- `ethone-next/components/LiveWidgets.tsx` : ajoute `ImageFallback` avec placeholder si l’image Discord (ou autre) ne charge pas.

**Migration Next.js : correction crash LayerProvider notify**

### Corrige
- `ethone-next/components/LayerProvider.tsx` : retire l’appel récursif infini dans `notify()` qui provoquait un stack overflow au clic sur la météo (et tout autre popover/layer).

**Migration Next.js : arrondir le Dock et ses icônes**

### Corrige
- `ethone-next/components/Dock.tsx` : conteneur `!rounded-full overflow-hidden` et items du dock `!rounded-full` pour forcer les formes arrondies partout.

**Migration Next.js : correction point parasite sur le cercle Pomodoro**

### Corrige
- `ethone-next/app/focus/page.tsx` : masque le cercle de progression quand `progress <= 0`, ce qui supprime le point coloré résiduel dû à `strokeLinecap="round"`.

**Migration Next.js : Expanding Sidebar**

### Corrige
- `ethone-next/components/Sidebar.tsx` :
  - largeur animée par Framer Motion (64px → 256px) avec ressort doux;
  - ouverture au survol et au `:focus-within`, fermeture au `mouseleave` / `blur`;
  - overlay verre flouté, `overflow-hidden` et `will-change-[width]`;
- `ethone-next/components/SidebarItem.tsx` :
  - items `w-full` ou `w-10` selon l’état;
  - labels `whitespace-nowrap` avec fade-in / slide subordonné à l’ouverture;
  - anneau de focus visible `focus-visible:ring-[var(--accent)]/50`.

**Migration Next.js : extraction SidebarItem et correction artefact actif**

### Corrige
- `ethone-next/components/SidebarItem.tsx` : nouveau composant isolé avec une seule convention d’état actif (fond accent arrondi + indicateur latéral séparé).
- `ethone-next/components/Sidebar.tsx` : utilise `SidebarItem`, taille fixe `w-10 h-10`, `!rounded-xl` pour outrepasser les radius globaux, et scroll silencieux.

**Migration Next.js : refactor Sidebar**

### Corrige
- `ethone-next/components/Sidebar.tsx` :
  - largeur fixe stable (72px / 240px), items carrés `w-10 h-10 shrink-0` centrés;
  - indicateur actif remplacé par un fond d’accent arrondi sur le bouton, plus de pilule blanche coupée;
  - découpage en header / nav scrollable avec scrollbar cachée / footer settings;
  - tooltips positionnés à droite quand la sidebar est repliée.

**Migration Next.js : refactor visuel des Paramètres d'Apparence**

### Corrige
- `ethone-next/components/settings/AppearanceSettings.tsx` : nouveau composant dédié avec des cartes de prévisualisation de thèmes, des pastilles chromatiques pour l’accent, un segmented control animé pour le pack d’icônes, un switch mode sombre et une section effets rééquilibrée.
- `ethone-next/components/settings/SettingsContent.tsx` : section Apparence remplacée par le nouveau composant visuel.
- `ethone-next/lib/i18n.ts` : ajout des traductions liées à l’apparence.
- `ethone-next/components/SettingsProvider.tsx` : export de `THEMES` et `ACCENTS` pour les aperçus.

**Migration Next.js : boutons, avatars et badges ronds**

### Corrige
- `ethone-next/components/NotificationCenter.tsx`, `ProfileDropdown.tsx`, `LanguageSwitcher.tsx`, `CommandPalette.tsx`, `SidePanel.tsx`, `V8Breadcrumbs.tsx`, `V8WindowControls.tsx` : `rounded-none` remplacé par `rounded-full` partout dans le header/sidebar.
- `ethone-next/app/globals.css` : suppression des overrides `img`/`[role="img"]` liés à `data-icon-radius` pour ne plus forcer les avatars/profils en carré.

**Migration Next.js : icônes des boutons rondes par défaut**

### Corrige
- `ethone-next/app/globals.css` : les boutons/liens contenant directement un SVG (`button:has(> svg)`, `a:has(> svg)`) sont maintenant ronds par défaut. Seuls les conteneurs dock/rail/`v8-icon-radius` et les images suivent encore le réglage utilisateur `iconRadius`.

**Migration Next.js : arrondi des bords (dock, mobile nav, sidebar, header)**

### Corrige
- `ethone-next/components/Dock.tsx` : fallback `border-radius: var(--dock-radius, 50px)` et retrait du `overflow-hidden` qui pouvait couper/cacher les bords.
- `ethone-next/components/MobileNav.tsx` : `rounded-t-2xl` pour éviter les coins carrés en haut de la barre mobile.
- `ethone-next/components/Sidebar.tsx` : `rounded-r-2xl` pour adoucir le bord droit du rail.
- `ethone-next/components/Shell.tsx` : `rounded-b-2xl` sur le header pour un rendu plus doux.

**Migration Next.js : forme des icônes du header**

### Corrige
- `ethone-next/components/Shell.tsx` : retrait de `data-icon-radius="square"` sur le header pour que les icônes reprennent la forme définie par le paramètre utilisateur (`circle` par défaut).

**Migration Next.js : taille des toggles Switch**

### Corrige
- `ethone-next/components/Switch.tsx` : dimensions réduites pour les trois tailles (sm, md, lg), ronds proportionnels au rail, travel recalculé pour éviter les débordements.

**Migration Next.js : aération du logo BrandMark**

### Corrige
- `ethone-next/components/BrandMark.tsx` : marges internes augmentées et E réduit pour éviter tout effet de "crop" / bords coupés.
- `ethone-next/app/login/page.tsx` : conteneur du logo en `h-14 w-14` avec `BrandMark size={40}`.

**Migration Next.js : correction des icônes / BrandMark**

### Corrige
- `ethone-next/components/BrandMark.tsx` : coins plus arrondis, `shape-rendering="geometricPrecision"`, ajustement du trait et des arrondis pour éviter les artefacts.
- `ethone-next/lib/icons.tsx` : fallback `help-circle` affiché si l’icône demandée n’existe pas dans le pack actif, afin d’éviter les cases vides/icônes cassées.

**Migration Next.js : logo et page login sans scroll**

### Corrige
- `ethone-next/components/BrandMark.tsx` : coins arrondis, trait du E affiné et récentré.
- `ethone-next/app/login/page.tsx` : suppression du `min-h` fixe, hauteur limitée à `100vh - 2rem`, espacements et champs réduits pour éviter tout scroll.
- `ethone-next/components/PasswordField.tsx` : hauteur de l’input et espacement des règles réduits.

**Migration Next.js : audit performance et optimisations dashboard**

### Corrige
- `ethone-next/components/Shell.tsx` : lazy-load des couches visuelles/effets (`LiveOverlay`, `AmbientParticles`, `Spotlight`, `VisualHaptics`, `DepthEffect`, `FocusIsland`, `ShortcutsOverlay`, `KeyboardShortcuts`) pour réduire le JS initial.
- `ethone-next/app/page.tsx` : lazy-load des gros widgets (`LiveWidgets`, `LiveStats`, `BillsWidget`, `DailyBriefing`, `BrainBriefingPanel`) en chunks séparés.
- `ethone-next/components/AmbientParticles.tsx` : pause `requestAnimationFrame` quand l’onglet est masqué, réduction du nombre de particules, suppression de `getComputedStyle` dans la boucle de rendu.
- `ethone-next/lib/icons.tsx` : `Icon` mémoisé.
- `ethone-next/lib/hooks/useI18n.ts` : fonction `i18n` mémoisée (évite de recréer des closures à chaque render).
- `ethone-next/lib/hooks/useItems.ts` : `create`/`update`/`remove` mémoisés, retour d’objet stable.
- `ethone-next/components/Sidebar.tsx` : `navItems` mémoisé, ressort plus réactif.
- `ethone-next/components/SearchBar.tsx` : animation de la barre via `clipPath` au lieu de `width`.
- `ethone-next/components/ConnectionCard.tsx`, `PasswordField.tsx`, `SettingsContent.tsx`, `DiagnosticPanel.tsx` : remplacement des animations `height: auto` par `layout` + `opacity`.
- `ethone-next/components/SidePanel.tsx` : `<a>` remplacés par `<Link>` pour le prefetch.
- `ethone-next/app/globals.css` : feedback tactile global `:active { transform: scale(0.98) }`.

**Migration Next.js : meilleures barres de réglage (Slider)**

### Corrige
- `ethone-next/components/ui/Slider.tsx` : nouveau slider custom avec rail, fill coloré, curseur blanc, drag au clic / glisser, support clavier (flèches, Home/End, PageUp/PageDown) et affichage de la valeur.
- `ethone-next/components/settings/SettingControls.tsx` : `RangeControl` utilise `Slider`.
- `ethone-next/components/DockControlCenter.tsx` : le curseur du dock utilise `Slider`.

**Migration Next.js : correction des toggles Switch**

### Corrige
- `ethone-next/components/Switch.tsx` : ajustement des dimensions du rail et du curseur (`travel` et hauteurs) pour éviter les débordements, centrage vertical du curseur, et suppression du `preventDefault` sur la touche Espace qui bloquait l’interaction clavier.

**Migration Next.js : correction des dropdowns Select**

### Corrige
- `ethone-next/components/ui/Select.tsx` : le listbox est maintenant rendu dans un `portal` (`document.body`) en `position: fixed`, avec recalcul de position au scroll/resize. Cela évite que les listes soient coupées ou mal positionnées à l’intérieur de parents `overflow: hidden` (cards, modales, etc.).

**Migration Next.js : refactor des cartes de connexion**

### Corrige
- `ethone-next/components/ConnectionCard.tsx` : remplacement de `CircleQuestionMark as HelpCircle` par `HelpCircle` et de `LogOut` par `Unlink` pour corriger l’icône corrompue du bouton Déconnecter.
- `ethone-next/config/connectionsGuide.ts` : fichier de guides existant consolidé pour Jellyfin, Spotify, GitHub, Google, TMDB (URL, étapes, champs).

**Migration Next.js : icônes rondes dans la sidebar/dock et header carré**

### Corrige
- `ethone-next/lib/settings.ts` : `iconRadius` par défaut passe à `circle` pour un rendu rond style macOS.
- `ethone-next/components/Shell.tsx` : le header garde `data-icon-radius="square"` pour rester carré.

**Migration Next.js : icône distincte pour les plugins**

### Corrige
- `ethone-next/lib/icons.tsx` : l’icône `plugins` est maintenant un bloc/cube (`blocks` / `package` / `cube`) au lieu de `plug`/`puzzle`, pour ne plus être confondue avec `connections`.

**Migration Next.js : correction du Worker 401 sur les pages protégées**

### Corrige
- `ethone-next/lib/supabase.ts` : désactive `autoRefreshToken` pour empêcher Supabase de supprimer la session quand le refresh token n’est pas valide (OTP).
- `ethone-next/lib/auth.ts` : stocke le `refresh_token` et `auth-type` pour les connexions par mot de passe / OTP.
- `ethone-next/components/AuthProvider.tsx` : restaure ou rafraîchit manuellement la session au montage depuis `localStorage` selon le type d’authentification.
- `ethone-next/app/login/page.tsx` : transmet `rememberMe` à `signInWithPassword`.

**Migration Next.js : textes complets et icônes carrées dans le header**

### Corrige
- `V8Breadcrumbs`, `V8StatusBar` : suppression des `truncate` et `max-w` pour afficher les intitulés complets (session, synchronisation, heure, profil…).
- `V8Breadcrumbs`, `NotificationCenter`, `SidePanel`, `CommandPalette`, `LanguageSwitcher`, `ProfileDropdown`, `BrandMark` : passage des conteneurs d’icônes en `rounded-none` pour un rendu carré.
- `Shell.tsx` : retrait des trois points de contrôle fenêtre (`V8WindowControls`) du header.

**Migration Next.js : correction de la session qui disparaît au refresh (mot de passe et OTP)**

### Corrige
- `ethone-next/lib/supabase.ts` : les cookies de session côté client ne sont plus marqués `httpOnly`, ce qui empêchait `getSession()` de relire la session après un refresh.

**Migration Next.js : rendre le "rester connecté" persistant au refresh**

### Corrige
- `worker/src/routes/security-identity.js` : l'endpoint `/api/auth/otp/verify` accepte `rememberMe` et signe un token valable 30 jours quand la case est cochée, 8 h sinon.
- `ethone-next/lib/auth.ts` : `verifyOtp` transmet `rememberMe` au Worker, stocke le token et son expiration dans `localStorage`.
- `ethone-next/app/login/page.tsx` : transmet l'état `rememberMe` à `verifyOtp`.
- `ethone-next/components/AuthProvider.tsx` : restaure la session depuis le token stocké au montage si `getSession()` retourne `null` et que le token n'est pas expiré.
- `ethone-next/lib/auth.test.ts` : ajuste l'appel attendu avec `rememberMe: false`.

**Migration Next.js : système d'onglets moderne avec indicateur animé, accessibilité et adaptatif mobile/desktop**

### Ajoute
- `components/tabs/` : `Tabs.tsx`, `TabList.tsx`, `TabContent.tsx` et `types.ts`.
- Indicateur actif fluide avec `layoutId` et ressort physique (damping 22, stiffness 200).
- Transitions de contenu `AnimatePresence mode="wait"` avec fade out / fade in et hauteur animée.
- Navigation clavier : flèches gauche/droite, Home, End, séparation focus visible et état actif.
- Overflow desktop : défilement horizontal avec gradients de fondu et chevrons de navigation.
- Mobile : segmented control compact (< 5 onglets) ou tiroir bas animé (≥ 5 onglets) sans dépendance externe.
- `app/tabs-demo/page.tsx` : page de démonstration avec deux exemples (5 et 7 onglets).
- `components/MobileNav.tsx` : barre de navigation mobile modernisée avec 4 raccourcis visibles + bouton Menu ouvrant un drawer latéral gauche listant toutes les applications. La barre se cache quand le drawer est ouvert et un bouton Fermer est ajouté dans le drawer.
- `components/Dock.tsx` : masqué sur mobile pour éviter le double emplacement avec `MobileNav`.
- `components/Shell.tsx` : padding bottom réduit (`pb-28`) sur mobile pour s'adapter à la nouvelle barre.
- `components/SearchBar.tsx` : mode plein écran mobile avec overlay, input grande taille et fermeture rapide.
- `lib/i18n.ts` : clés `menu` ajoutées dans les langues fr/en/es/de.

### Corrige
- `app/brain/page.tsx` : intégration de `TabList` pour les 12 sections Brain.
- `app/files/page.tsx` : intégration de `TabList` pour les filtres All / Favorites / Trash.
- `components/tabs/TabList.tsx` : couleurs du tiroir mobile (fond accent actif, blanc) et légende optionnelle.
- `components/tabs/TabList.tsx` : fond `surface-raised` et indicateur accent pour le segmented control mobile (< 5 onglets).
- Fichiers tiers du working tree : correction ESLint/TS (`UploadItem.tsx`, `SettingField.tsx`).

**Migration Next.js : logos SVG des fournisseurs dans le calendrier de bills (Netflix, Adobe, Apple, Figma, Spotify, Notion)**

### Ajoute
- `components/logos/` : composants SVG pour Netflix, Adobe, Apple, Figma, Spotify, Notion et dispatcher `VendorLogo`.
- `components/CalendarBills.tsx` : intégration des vrais logos SVG dans les cellules du calendrier.
- `app/calendar-bills/page.tsx` : page de prévisualisation du composant fusionné calendrier + bills.

**Migration Next.js : parité legacy v8 complète (rate-limiter, OTP Worker, profil public, Steam, Spotify, mail, marketplace, dense-content, depth-effect, form validation, command history/search, navigation, espaces, intégrations, home/daily briefing, lifecycle, document metadata)**

### Corrige
- Accessibilité : `aria-prohibited-attr` sur `PresenceIndicator` via `role="status"`.
- Accessibilité : hiérarchie de titres sur `app/not-found.tsx` et `components/LiveWidgets.tsx`.
- Accessibilité : `aria-label` sur les inputs non labellisés de `activity`, `notes`, `settings`, `tasks`, `team`, `share`, `drop`.
- Hydratation : `lib/hooks/useActivityJournal.ts` initialisé avec `[]` et chargé dans `useEffect` pour éviter l'erreur React #418 sur `/activity/` (différence localStorage SSR vs client).

### Audit
- Mise à jour des inventaires exhaustifs : `MIGRATION_AUDIT_v8.md` (105 fichiers .mjs) et `MIGRATION_AUDIT.md` (validation Playwright, a11y 0 issue).
- Lancement et succès de la suite Worker complète : 136/136 tests passent.

### Ajoute
- `lib/profile-repository.ts` : portage de `v8/data/profile-repository.mjs` (modèle de profil, accents/types par défaut, snapshot, preview) branché dans `app/profile-selection/page.tsx`.
- `components/LiveWidgets.tsx` : dos générique enrichi pour tous les providers live sans dos spécifique (icône, image, titre, sous-titre, méta, statut).
- Spotify seek : endpoint Worker `/api/spotify/control` accepte `action: "seek"` + `positionMs`, et `components/LiveWidgets.tsx` expose un `<input type="range">` pour scrubber la lecture.
- `app/files/page.tsx` : correction du débordement horizontal sur mobile 320px (ligne de fichier en colonne, actions flex-wrap).
- `ethone-next/public/_headers` : headers de sécurité (CSP, HSTS, X-Frame-Options, COOP, CORP, Referrer-Policy, Permissions-Policy) pour le déploiement statique.
- `main` : fast-forward vers `migration-react-tailwind`, suppression du worktree `.worktree/main`, ajout d'un `CNAME` racine pour réactiver `ethone.dev`.
- `scripts/verify-security-headers.mjs` : adaptation aux headers effectivement servis par GitHub Pages + Cloudflare.
- Migration vers Cloudflare Pages : `ethone.dev` hébergé via `ethone-next/dist`, custom domain actif, suppression du workflow GitHub Pages et du `CNAME` racine.
- Push de la branche `migration-react-tailwind` sur `origin`.
- `scripts/verify-deployment.mjs` et `scripts/verify-security-headers.mjs` : scripts de vérification post-déploiement du build Next.js.
- `scripts/precommit-upload-check.mjs` : évite les faux positifs sur les valeurs mock/test et les catalogues i18n/tests.
- `playwright.config.ts` : chargement automatique de `.env.local` pour les credentials E2E.
- `.env.example` : commentaires pour `TEST_EMAIL` / `TEST_PASSWORD`.
- `MIGRATION_AUDIT.md` : mise à jour des résultats finaux (Worker 138/138, Playwright 843/843) et du nettoyage legacy v8.
- `lib/rate-limiter.ts` : portage du rate-limiter v8 avec `createRateLimiter`, politiques d'authentification, fenêtres temporelles, blocage temporaire, `reset`, `destroy` et `size`.
- `lib/auth.ts` : OTP via Worker (`sendOtp`/`verifyOtp` sur `/api/auth/otp/send` et `/api/auth/otp/verify`), rate-limiting sur `sign-in`, `sign-up`, `password-reset`, `password-update` et `oauth`, et notification Worker `/api/signout` avant déconnexion Supabase.
- `lib/hooks/usePublicProfile.ts` + `app/profile/page.tsx` : appel à `/api/supabase/public-profile`, champ public identifier, aperçu du profil public et copie du lien.
- `lib/hooks/useLiveData.ts` + `components/LiveWidgets.tsx` : appel à `/api/steam/achievements` et affichage des succès Steam (recent/owned games, achievements, pourcentage de déblocage, icônes).
- `components/LiveWidgets.tsx` : synchronisation de l'état "like" Spotify via `/api/spotify/track-saved` pour refléter l'état réel de la bibliothèque.
- `lib/hooks/useMail.ts` : endpoints mail Worker `/api/mail/contacts`, `/api/mail/extract`, `/api/mail/notifications` (GET/PATCH) ; la recherche continue d'utiliser `/api/mail/search?q=...` tandis que l'affichage d'un dossier conserve `/api/mail/inbox`.
- `lib/plugins.ts` + `app/plugins/[id]/page.tsx` : marketplace complet couvrant les 35 intégrations du catalogue v8 (40 routes statiques générées, dont `bills` et `steam-achievements`).
- `public/legacy/` : retrait du fallback legacy et du runtime v8 copié dans `public/` (l'application Next gère désormais les 404 via `app/not-found.tsx`).
- `components/DenseContent.tsx` : composant React équivalent à `v8/ui/dense-content.mjs` (sélection stateful, contrôle de densité, bulk action bar, row menu) avec classes v8 mappées sur Tailwind.
- `components/DepthEffect.tsx` + `app/layout.tsx` : effet de profondeur v8 par survol, respect de `cardTilt`, `reducedMotion`, `performanceMode`, et désactivé sur tactile.
- `lib/form-validation.ts` : validateurs v8 (`required`, `email`, `minLength`, `maxLength`, `pattern`, `match`, `passwordStrength`, `oneOf`) et hook `useForm`.
- `lib/command-search.ts` : `createCommandHistory` (persistance localStorage `ethone:v8-command-history` avec recent/pinned/frequency), contexte `route`/`space` et scoring amélioré (context tags, category scoring, fallback ranking).
- `lib/i18n-extras.ts` : clés `fieldRequired` et `emailInvalid` pour les 4 langues.
- `app/page.tsx` : ajout du `BrandMark` et du nom `ETHONE` en haut du dashboard home.
- `components/LanguageSwitcher.tsx` + `app/layout.tsx` : bouton de changement de langue dans la topbar (icône globe + code langue), qui fait défiler `fr/en/es/de` comme en v8.
- `lib/navigation.ts` + `components/Sidebar.tsx` + `components/MobileNav.tsx` : catalogue de navigation v8 partagé pour le rail et la barre mobile.
- `lib/workspaces.ts` : portage du modèle d'espaces v8 (Personal, Focus, Studio) avec widgets, étapes et acccents.
- `lib/integrations.ts` + `app/connections/page.tsx` : catalogue enrichi des intégrations v8 (catégories, statut, icône, signal live, URL officielle) remplaçant la liste localisée en dur de la page Connections.
- `lib/home-model.ts` + `lib/daily-briefing.ts` + `lib/hooks/useDashboard.ts` : modèle home v8 (salutation périodique, recommandation contextuelle, tâches, événements, notes récentes) et briefing quotidien (signaux météo/musique/GitHub, suggestion d'action, `claimDailyBriefing`).
- `lib/document-metadata.ts` + `components/DocumentMetadata.tsx` + `app/layout.tsx` : gestionnaire de métadonnées document v8 (titre/description/OG/Twitter par contexte de route).
- `lib/lifecycle.ts` : portage du gestionnaire de cycle de vie v8 (`mount`/`unmount`/stats).
- `lib/oauth.ts` : portage de `data/oauth-app-config.mjs` (Client IDs publics par défaut + `oauthClientId`).
- `lib/navigation-session.ts` : portage de `core/navigation-session.mjs` (capture/restauration de la position de scroll par route).
- `lib/brand-icons.ts` : portage de `data/brand-icons.mjs` (catalogue SVG de marques, données sans innerHTML).
- `lib/date.ts` : portage de `utils/date.mjs` (`isExpired`, `isExpiringSoon`).
- `lib/format.ts` : portage de `utils/format.mjs` (`formatBytes`).
- `lib/download.ts` : portage de `utils/download.mjs` (`downloadJson`).
- `lib/actions.ts` : portage léger de `core/actions.mjs` (registre d'actions v8 avec `register`, `scope`, `dispatch`, `useActionFacade`).
- `lib/command-catalog.ts` : portage de `command/catalog.mjs` (catalogue de commandes v8 avec alias et contextes).

### Corrige
- Worker OTP (`worker/src/services/otp-service.js`, `worker/src/services/security-identity-client.js`, `worker/src/routes/security-identity.js`) : envoi et vérification fonctionnels, `insertSecurityEvent` et `consumeOtpCode` corrigés, retour du `token` de session, session valide 8h.
- Template d'email OTP : i18n automatique (fr/en/es/de), logo ETHONE hébergé et centré en haut, titre `ETHONE` centré, aperçu personnel (`Bonjour`, accroche, signature), mise en avant des phrases « ETHONE — votre dashboard personnel » et « Ne partagez ce code », format de date court sans secondes.
- `ethone-next/app/login/page.tsx` et `ethone-next/lib/auth.ts` : la connexion par code OTP utilise désormais `sendOtp`/`verifyOtp` du Worker et établit une vraie session Supabase via `supabase.auth.setSession`.
- `lib/hooks/useLiveData.ts` : `fetchOptional` propage désormais les erreurs ; `Promise.allSettled` collecte les échecs par source et expose `error` au lieu de masquer les problèmes derrière des états vides.
- `app/login/page.tsx` et `app/reset-password/page.tsx` : validation avancée par `lib/form-validation.ts` sans casser le comportement existant.
- `components/CommandPalette.tsx` : utilisation de `createCommandHistory` pour la persistance fréquence et intégration du contexte `space` dans le scoring.
- `components/AuthProvider.tsx` + `lib/auth.ts` : `signOut` appelle `/api/signout` sur le Worker avant de supprimer la session Supabase côté client.
- `components/LiveWidgets.tsx` : synchronisation de l'état "like" Spotify via l'endpoint `/api/spotify/track-saved` pour refléter l'état réel de la bibliothèque.
- `lib/hooks/useMail.ts` : la recherche mail utilise `/api/mail/search?q=...` quand un terme est saisi, tandis que l'affichage d'un dossier conserve `/api/mail/inbox`.
- `components/RichTextEditor.tsx` : parité améliorée avec v8 (`toEditableHtml`, `plainTextToHtml`, `stripHtml`, `safeHref`, suppression des balises interdites et des commentaires, conservation de la classe `code`).
- `components/Loading.tsx` : retrait du badge "OS" sur l'écran de chargement pour correspondre au boot v8.

### Validation
- `auth-audit.spec.ts` : test E2E authentifié (desktop / mobile / tablet) passé avec `TEST_EMAIL/TEST_PASSWORD` fournis, sans persistance des credentials.
- `e2e/live-cards.spec.ts` : dashboard authentifié, section Live chargée sans erreurs (3 viewports).
- `lib/auth.test.ts` : tests unitaires OTP (`/api/auth/otp/send`, `/api/auth/otp/verify`) et passkey (`/api/auth/passkey/*`).
- `lib/oauth.test.ts` : tests unitaires `buildAuthUrl`, `exchangeCode` et `parseOAuthState` pour tous les providers configurés.

## [Unreleased]

**Migration React + Tailwind : parité v8 (Register, Share QR, Brain summary, Spotlight, ProfileDropdown, Live cards, a11y, responsive, hydration)**

### Ajoute
- `app/login/page.tsx` + `lib/auth.ts` : onglet d'inscription sign-up avec username, email, mot de passe, confirmation, validation et gestion de la confirmation email.
- `app/share/page.tsx` : QR code de partage généré via `api.qrserver.com` et affichage du `brainSummary` du fichier partagé.
- `components/CommandPalette.tsx` + `lib/command-search.ts` : recherche floue avec scoring, fréquence persistée, filtres `>category` et `/category`, contexte de route, navigation clavier étendue et footer de raccourcis.
- `components/ProfileDropdown.tsx` : sélection/switch de profils multiples, switch Workspace/Space, actions profil (rename, avatar, export, duplicate, delete), accès équipe, focus, Brain, langue, visibilité dock/FAB.
- `components/LiveWidgets.tsx` + `lib/hooks/useLiveData.ts` : dos personnalisés pour Spotify/nowplaying, Discord/lanyard, Météo, Minecraft et Bills.
- `lib/i18n.ts` + `lib/i18n-extras.ts` : clés i18n pour l'enregistrement, la recherche Spotlight, le ProfileDropdown et les Live cards (fr/en/es/de).

### Corrige
- Accessibilité : ajout d'`aria-label` sur les `<select>` et contrôles interactifs des pages auditées.
- Responsive : classes Tailwind responsives ajoutées aux 14 pages identifiées par `responsive-audit.mjs`.
- Hydratation : correction de l'erreur React #418 sur `/activity/` liée aux dates locales dans `LiveWidgets`.
- Mise à jour de `MIGRATION_AUDIT.md` avec le statut des points corrigés.

## [Unreleased]

**Migration React + Tailwind : parité v8 (Bills, Ambient, Mail analytics, Automations, Live cards, Assets legacy)**

### Ajoute
- `components/BillsCalendarWidget.tsx` + `app/calendar/page.tsx` : widget Bills intégré au calendrier avec mini-vue 7 jours, total 30 jours, catégories colorées et i18n.
- `lib/ambient-engine.ts` + `lib/hooks/useAmbientEngine.ts` + `components/HtmlLang.tsx` : moteur Ambient Engine (profils jour/nuit, contexte visuel gaming/dev/study/focus, focus actif, Space, réglage des variables CSS périodique).
- `components/MailAnalyticsPanel.tsx` + `app/mail/page.tsx` : analytics Mail avancé (périodes 7/30/90j, graphiques barres, top expéditeurs avec barres, top étiquettes).
- `lib/brain/automation.ts` + `components/FlowAutomations.tsx` : automation triggers `route`/`space`/`time` avec actions étendues (Space, density, thème).
- `components/LiveWidgets.tsx` : filtres par catégorie (`gaming`/`social`/`productivity`) pour les Live cards multi-services.
- `app/matches/page.tsx` + `lib/hooks/useTracker.ts` : scoreboard détaillé (KDA, HS%, CS, or, vision, dégâts, soins, placement).
- `lib/settings.ts` + `lib/hooks/useLiveData.ts` + `components/LiveWidgets.tsx` : source Now Playing `spotify` native, contrôle like/unlike via Worker.
- `lib/brain/action-registry.ts` + `lib/brain/preferences.ts` + `app/brain/page.tsx` : actions Brain Mail avancées (summarize, suggestReply, draft, search, move, analytics, block, trust).
- `lib/auth.ts` + `app/login/page.tsx` : onglet d'inscription/sign-up (username, email, mot de passe, confirmation).
- `app/share/page.tsx` : QR code de partage + affichage du `brainSummary` du fichier.
- `public/icons/` + `public/legacy/` : copie de tous les assets visuels legacy (favicons, PWA icons, 404, manifest, SW, index, headers) et mise à jour du manifest PWA.

### Ajoute
- `app/page.tsx` + `lib/settings.ts` : sections Home personnalisables (`homeHiddenSections`), mode personnalisation avec toggles et sélecteur d'Aura intégré.
- `components/FocusProvider.tsx` + `components/FocusPopover.tsx` + `app/focus/page.tsx` + `lib/hooks/useZenMode.ts` : preset `sprint`, sélecteur de session, Zen mode et persistance `data-zen-mode`.
- `components/Dock.tsx` + `lib/settings.ts` + `app/globals.css` : sélecteur de verre `vitrified/ultra-blur/sober`, échelles compact/normal/large, lanceur d'applications intégré dans le Dock.
- `lib/sound.tsx` + `lib/settings.ts` + `app/settings/page.tsx` : packs v8 (`ethone`, `minimal`, `classic`, `apple-inspired`, `cyber-pulse`, `silent`), audio spatial pan (max 0.07) et volumes par catégorie (`interface`, `notifications`, `brain`, `system`).
- `components/V8Breadcrumbs.tsx` + `components/V8StatusBar.tsx` + `components/NotificationCenter.tsx` : fil d'Ariane contextuel (workspace, data-space, profil, météo, connexion, quick actions) et barre d'état avancée (session, sync, réseau, notifications, version).

- `components/MissionControl.tsx` : Mission Control complet avec sections Spaces, Flows, Fenêtres, Dashboards, Widgets live et Activité Brain, navigation clavier (flèches, Home/End, Escape, F2).
- `lib/activity-journal.ts` + `lib/hooks/useActivityJournal.ts` + `components/ActivityJournalProvider.tsx` : journal d'activité client avec `capture`/`captureRoute`, stockage local, synchronisation batch périodique vers `POST /api/cloud/activity`.
- `app/activity/page.tsx` : section journal avec recherche, filtres, statistiques et périodes 7/30/90/365j en complément de la heatmap.
- `components/WeatherDetailPopover.tsx` + `components/V8Breadcrumbs.tsx` : popover météo 5 jours (température, humidité, vent, prévisions) via `useLiveData` et `@floating-ui/react`.
- `app/page.tsx` + `lib/settings.ts` + `components/V8StatusBar.tsx` : sélecteur v8 de mode de session (`default/focus/intense/zen/night`) distinct du statut de présence, persistance et thématisation via `data-session-mode`.
- `worker/src/routes/cloud-activity.js` + `worker/src/services/cloud-activity-client.js` + `worker/src/router.js` : endpoint Worker pour l'insertion batch d'activités.
- `lib/preset-engine.ts` + `app/settings/page.tsx` : moteur de presets v8 (`sanitizePreset`, `applyPreset`, `extractPresetFromState`), presets intégrés, presets personnalisés, import/export JSON.
- `components/LayerProvider.tsx` : gestion avancée de couches (focus trap, roving tabindex, Escape/clic extérieur/scroll/resize, z-index auto, subscribe).
- `app/globals.css` + `app/legacy-v8-tokens.css` + `components/HtmlLang.tsx` : tokens CSS Houdini `@property`, `color-mix`, animations `breathe`, thématisation par aura/session/densité.
- `components/Dock.tsx` + `components/DockControlCenter.tsx` : Control Center dans le Dock (animations UI, toggles visuels/sonores, pack sonore, volume, ambiance, actions rapides).
- `lib/sound.tsx` + `lib/settings.ts` + `app/settings/page.tsx` : sonorités ambiantes (`pink/brown/white/rain/drone`), media ducking, throttling par type de son, mapping `v8.*` -> `SoundType`, export WAV.
- `components/Dock.tsx` : indicateur Spotify live, contrôles Spotlight/Command, Pomodoro/Focus (avec `FocusPopover`), Mission Control, Notifications.
- `components/V8StatusBar.tsx` + `components/V8Breadcrumbs.tsx` + `lib/activity-journal.ts` : états sync/save/session, quick action sync.
- `app/legacy-v8-tokens.css` + `components/HtmlLang.tsx` : variantes de thème `obsidian`, `aurora`, `minimal`, `focus`, `glass`, `oled`.
- `lib/presence-engine.ts` + `components/PresenceProvider.tsx` + `components/PresenceIndicator.tsx` : moteur de présence v8 avec signaux `brain/sync/media/calendar/mail/notification/activity`, signal dominant, indicateur animé dans la barre d'état et le SidePanel.
- `lib/brain-context.ts` + `lib/brain-memory.ts` + `lib/hooks/useBrainContext.ts` : moteur de contexte Brain (filtrage par route, anonymisation des données sensibles) et repository de mémoire local avec TTL, purge et scan de données sensibles.
- `lib/focus-timer.ts` + `app/focus/page.tsx` + `components/FocusIsland.tsx` : cycles Pomodoro/Deep Work/Sprint avec pauses courtes/longues, compteur de cycles, persistance du timer.
- `lib/bills-manager.ts` + `app/bills/page.tsx` + `components/BillsWidget.tsx` : gestion de factures avec récurrence, catégories, échéance, total à venir et scan Brain pour catégorisation.
- `lib/hooks/useDiscordLive.ts` + `lib/hooks/useMinecraftLive.ts` + `lib/hooks/useLolLive.ts` + `lib/hooks/useLiveFetch.ts` : hooks live indépendants pour Discord (Lanyard), Minecraft et League of Legends.
- `lib/density-engine.ts` + `components/HtmlLang.tsx` : moteur de densité v8 avec presets `spacious/comfortable/compact/dense/ultra-compact/ultra/normal/airy`, détection viewport/zoom et mode `automatic`.
- `lib/interactions-heatmap.ts` + `app/interactions/page.tsx` : moteur de heatmap d'interactions (séries, consistance, intensité relative) et intégration dans la page Interactions.
- `lib/commands.tsx` + `components/CommandPalette.tsx` : extension du catalogue de commandes avec plus de 60 entrées, historique, favoris, recherche contextuelle.
- `components/BrandMark.tsx` + `app/loading.tsx` + `components/Loading.tsx` : logo ETHONE v8 (SVG mark + gradients) et écran de chargement avec barre de progression et badge OS.
- `components/Sidebar.tsx` + `components/V8Breadcrumbs.tsx` + `app/login/page.tsx` : intégration du BrandMark ETHONE dans le rail, les breadcrumbs et la page de connexion.
- `public/icons/` + `public/legacy/` : copie de tous les assets visuels legacy (favicons, PWA icons, mask-icon, apple-touch, 404, `sw.js`, `manifest.webmanifest`, `index.html`, `_headers`).
- `public/manifest.json` + `app/layout.tsx` : mise à jour du manifest PWA avec les icons ETHONE legacy et metadata `theme-color`, `apple-mobile-web-app`.

### Corrige
- Migration des packs audio legacy `mechanical`/`liquid`/`none` vers les équivalents v8 pour compatibilité ascendante.
- Test worker `worker/test/worker-security.test.mjs` : tampered JWT plus robuste (remplacement du premier caractère de la signature).
- Réduction des appels Worker via caches existants et réutilisation des hooks Worker.

**Modernisation UI Next.js : notifications, haptics, tooltips, context-menus et bottom-sheets**

### Ajoute
- `lib/hooks/useNotifications.ts` : état des notifications enrichi (priorités `critical/important/normal/silent`, snooze 10m/1h/ce soir/demain, archive, recherche, mute par catégorie, compteur important, déduplication, données de démo).
- `components/NotificationCenter.tsx` : centre de notifications mobile en bottom-sheet avec filtre, recherche, snooze, archive et marquage important.
- `public/sw.js` : persistance des push notifications dans IndexedDB et synchronisation bidirectionnelle avec le client.
- `lib/hooks/useHaptics.ts` + `components/UIProvider.tsx` : retour haptique global et états visuels `data-haptic-state`, respect du réduit-mouvement.
- `components/Tooltip.tsx` + `components/UIProvider.tsx` : infobulles globales `data-tooltip` avec positionnement viewport-safe et support focus/clavier.
- `components/BottomSheet.tsx` : retrait de `md:hidden`, support `position` (bottom/center), drag, swipe et en-tête draggable.
- `components/ContextMenu.tsx` : menus contextuels robustes (clavier, Escape, clic extérieur, positionnement écran).
- `app/mail/page.tsx` : bottom-sheets trier/déplacer/étiquetter, menu contextuel par message.
- `app/brain/page.tsx` : bottom-sheet wrap-up "Préparer demain" avec tâches et événements du lendemain.
- `app/notes/page.tsx`, `app/tasks/page.tsx`, `app/files/page.tsx`, `components/LiveWidgets.tsx` : menus contextuels par carte/ligne.
- `components/Dock.tsx`, `components/MobileNav.tsx` : tooltips et retours haptiques sur les contrôles iconiques.
- `app/system/page.tsx` : Mission Control consolidant Spaces, Flows et workspaces actifs.
- `app/spaces/page.tsx` + `app/flows/page.tsx` : création, persistance et activation de workspaces/flows côté Worker, templates prédéfinis.
- `lib/hooks/useLiveData.ts` + `components/LiveWidgets.tsx` + `components/LiveStats.tsx` : historiques Last.fm (top artistes/titres par période), jeux Steam récents/possédés, historique de noms Minecraft, paramètre météo `city`.
- `app/interactions/page.tsx` : heatmap 30 jours, bouton Live, polling 5 s, statistiques et filtres par type.
- `lib/hooks/useUserData.ts` + `worker/src/routes/user-data.js` + `supabase/migrations/202608280001_profile_workspace_parity.sql` : scoping strict par `profile_id`/`workspace_id` et propriété utilisateur.
- `lib/hooks/useProfiles.ts` + `components/SettingsProvider.tsx` + `components/ProfileSync.tsx` : profils actifs, workspace/accent, paramètres par profil.
- `lib/i18n-extras.ts` : catalogues fr/en/es/de pour les nouvelles clés UI.

### Version PWA
- `ethone-next-v339` (cache et service worker mis à jour).

## [v349] - 2026-08-11

**Catalogue v8 complet dans Connections, credentials étendues et ajustements finaux**

### Corrige
- `app/connections/page.tsx` : catalogue v8 complet (35 providers) avec les statuts `auth` d’origine, champs publics/credentials par intégration, et badges `oauth` / `api` / `local` / `feed` / `restricted` / `limited`.
- `lib/hooks/useProviderCredentials.ts` + `worker/src/routes/provider-credentials.js` : extension de l’allowlist à `openai`, `anthropic`, `gemini`, `groq`, `plex`.
- `worker/src/services/connections-client.js` : `listConnections` retourne désormais l’union des connexions OAuth et des providers avec credentials sécurisés.
- `lib/settings.ts` + `lib/i18n.ts` : nouvelles clés `liveBlueskyHandle`, `liveJellyfinUrl`, `liveEmbyUrl`, `liveLmStudioUrl`, `liveOllamaUrl`, `liveObsidianUrl`, `liveVscodeUrl` et labels de statut `local`, `feed`, `restricted`, `limited` en fr/en/es/de.
- `supabase/migrations/202608070001_provider_credentials_extended.sql` (nouveau) : étend la contrainte `user_provider_credentials` aux providers `openai`, `anthropic`, `gemini`, `groq`, `plex`.
- `lib/hooks/useLiveData.ts` : météo enrichie avec prévisions journalières dans les métadonnées des cartes live.
- `app/brain/page.tsx` : affichage correct de la latence diagnostics selon le provider retourné.
- Vérification complète : build Next.js 43 routes, lint, 27 tests unitaires, 136 tests Worker, 528 tests Playwright, `precommit-upload-check` et `audit-security` passent.

### Version PWA
- `experience-v323` (aucun changement d'asset PWA).

## [v348] - 2026-08-11

**Home live cards v8 : Google Calendar, Google Drive, Notion, Apex Tracker**

### Corrige
- `lib/hooks/useLiveData.ts` : ajout des sources live `google-calendar` (`/api/google-calendar/events`), `google-drive` (`/api/google-drive/files`), `notion` (`/api/notion/pages`), `tracker` et `apex` (`/api/tracker/apex-profile` + `/api/tracker/apex-matches`). Chaque appel est conditionné par `connected.has(...)` ou la présence des identifiants.
- `lib/settings.ts` : nouveaux champs `calendarClientId`, `driveClientId` et `homeHiddenLiveCards`.
- `components/LiveWidgets.tsx` : dégradés et rendu pour les nouvelles sources, affichage du `subtitle` généralisé, mode "Personnaliser" pour masquer/afficher les cartes via `settings.homeHiddenLiveCards`.
- `app/page.tsx` : section `Live` avec titre et bouton "Personnaliser" qui pilote le mode de personnalisation des cartes.
- `lib/i18n.ts` : nouvelles clés `googleCalendar`, `notion`, `trackerApex`, `customize`, `done` en fr/en/es/de.
- `components/OAuthHandler.tsx` + `app/connections/page.tsx` : persistance des `clientId` Google Calendar / Google Drive dans les settings lors de la connexion OAuth.

### Version PWA
- `experience-v323` (aucun changement d'asset PWA).

## [v347] - 2026-08-11

**Interactions 30 jours, Team/MobileNav, Worker credentials, météo détaillée**

### Corrige
- `app/interactions/page.tsx` : heatmap 30 jours au lieu de 7, bouton Live active un polling toutes les 5 secondes.
- `worker/src/routes/provider-credentials.js` (nouveau) + `worker/src/routes/team.js` : endpoints pour sauvegarder les credentials API (`/api/provider-credentials`) et mettre à jour un rôle d’équipe (PATCH `/api/team/members`).
- `lib/hooks/useProviderCredentials.ts` et `lib/hooks/useTeam.ts` : exposent `save/remove` pour credentials et `update` pour les rôles.
- `components/MobileNav.tsx` : navigation mobile scrollable avec Brain, Files, Connections, Team.
- `app/team/page.tsx` : sélecteur de rôle par membre, badges de statut (active/pending/declined/revoked), affichage du nom d’affichage.
- `lib/hooks/useLiveData.ts` : météo enrichie avec humidité, vent et condition.
- `lib/i18n.ts` : nouvelles clés `pending`, `declined`, `revoked`.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v346] - 2026-08-11

**Connections : credentials sécurisées et catalogue v8**

### Corrige
- `app/connections/page.tsx` : les secrets API des providers supportés (Steam, Last.fm, Twitch, Riot, Tracker) sont stockés dans la table sécurisée `public.user_provider_credentials` via `/api/provider-credentials` ; les identifiants publics restent dans les live settings.
- `app/connections/page.tsx` : ajout des cartes Tracker (Apex) et Weather, et du catalogue v8 (Plex, Jellyfin, Emby, Bluesky, Linear, ClickUp, Jira, Email, GitLab, Obsidian, VS Code, Fitbit, LM Studio, Ollama, Anthropic, Gemini, Groq).
- `lib/i18n.ts` : nouvelles clés `apiKey`, `clientSecret`, `henrikApiKey`, `riotApiKey` et descriptions des nouvelles intégrations (en/fr/es/de).

### Version PWA
- `experience-v323` (aucun changement d'asset PWA).

## [v345] - 2026-08-11

**Vérification des pages /macros, /personas, /bills et tests d’intégration user-data**

### Corrige
- `app/macros/page.tsx`, `app/personas/page.tsx`, `app/bills/page.tsx` : utilisent déjà `useUserData("macro" | "persona" | "bill")` qui consomme les endpoints `/api/user-data/{kind}s` du Worker.
- `lib/hooks/useUserData.test.ts` (nouveau) : tests couvrant le chargement, la création et la suppression pour `macros`, `personas` et `bills`.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v344] - 2026-08-11

**Risques de déploiement, persistance, rôles et tests d'intégration**

### Corrige
- `lib/hooks/useConnections.ts` (nouveau) + `lib/hooks/useLiveData.ts` : le hook live charge d’abord `/api/connections` et n’appelle un provider OAuth (GitHub, Todoist, YouTube, Reddit) que s’il est connecté. Météo sans ville, now-playing sans identité, et tracker sans Riot ID ne génèrent plus d’appels 400/401.
- `lib/hooks/useCalendarEvents.ts` : normalisation défensive des champs `start`/`end` (objets `dateTime`/`date` ou strings) en `startAt`/`endAt`.
- `.gitignore` : ajout de `.worktree/` pour empêcher tout déploiement du worktree legacy et du `audit-security.mjs` copié.
- `app/team/page.tsx` + `lib/i18n.ts` : les rôles d’équipe étendus à `owner`, `admin`, `member`, `viewer`, `editor`, `billing`.
- `lib/hooks/useLiveData.test.ts` et `lib/hooks/useTracker.test.ts` (nouveaux) : tests d’intégration React ↔ Worker pour les appels live et les routes de tracker tronçonnées.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v343] - 2026-08-11

**Connections, live cards étendues et session modes**

### Corrige
- `lib/settings.ts` : nouveaux champs `liveSteamId`, `liveRssUrl`, `liveLastfmUsername`, `liveTwitchLogin`, `liveMinecraftUsername`.
- `app/connections/page.tsx` : saisie des clés API / identifiants pour Discord (Lanyard ID), Steam, Riot, OpenAI, RSS, Last.fm, Twitch, Minecraft. Mapping direct sur les live settings.
- `lib/hooks/useLiveData.ts` : nouvelles sources live — Last.fm, Twitch, Minecraft, Steam, RSS, bills, Valorant, LoL. Appels conditionnés par la présence des identifiants.
- `worker/src/router.js` : enregistrement de la route `/api/rss` (existante mais non branchée).
- `components/LiveWidgets.tsx` : dégradés et styles pour les nouvelles sources.
- `app/page.tsx` : sélecteur de **mode de session** (online / busy / focus / away / invisible) lié à `settings.status`.
- `lib/i18n.ts` : nouvelles clés pour les champs API et le mode de session.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v342] - 2026-08-11

**Correction des incompatibilités et synchronisation cloud**

### Corrige
- Vérification : plugins, tracker, live data, dashboard, macros/personas/bills et récupération de mot de passe étaient déjà corrigés dans les passes précédentes.
- `lib/user-state.ts` + `lib/hooks/useUserState.ts` : nouvelle couche générique de persistance synchronisée dans `ethone_user_state` (Supabase).
- `lib/settings.ts` + `components/SettingsProvider.tsx` : charge et sauvegarde les paramètres en Supabase, conserve localStorage comme cache offline.
- `lib/brain/preferences.ts` + `lib/hooks/useBrain.ts` : synchronisation des préférences Brain avec Supabase.
- `lib/hooks/useNotifications.ts` : historique de notifications synchronisé avec Supabase.
- `app/scratchpad/page.tsx` : note du scratchpad synchronisée avec Supabase.
- `app/calendar/page.tsx` : `clientId` Google Calendar synchronisé via `user-state`.
- `app/files/page.tsx` : `clientId` Google Drive migré vers `useUserState`.
- `components/OAuthHandler.tsx` : les `clientId` OAuth sont persistés dans `user-state` et dans les live settings.
- `v8_bills_manager.mjs` et `v8_bills_widget.mjs` : conversion UTF-16 → UTF-8 (fichiers conservés sans suppression).

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v341] - 2026-08-11

**Migration des fonctionnalités manquantes — passe 1**

### Corrige
- `components/FloatingWindow.tsx` + `WindowManagerProvider.tsx` : maximize restaurable, plein écran et réduction drag/redimensionnement quand maximisé.
- `app/password-recovery/page.tsx` : redirige vers `/reset-password/`.
- `app/reset-password/page.tsx` : nouvelle page pour saisir et mettre à jour le mot de passe avec validation (12 caractères, majuscule, minuscule, chiffre, symbole).
- `lib/i18n.ts` : clés pour la récupération de mot de passe, le plein écran et les nouveaux onglets Brain.
- `app/brain/page.tsx` : ajout des onglets manquants `context`, `privacy`, `history`, `diagnostics`, `wrapup`.
- `lib/icons.tsx` : nouvelles icônes `expand`, `shrink`, `scan-search`, `history`, `sunset`, `shield-check`.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v340] - 2026-08-11

**Paramètres obligatoires des intégrations live + routes Worker user-data**

### Corrige
- `lib/hooks/useLiveData.ts` : construit les URLs avec les paramètres requis (`source`/`userId`/`username` pour now-playing, `userId` pour Lanyard, `clientId` pour YouTube/Reddit, ville pour la météo) et saute les appels si la configuration est manquante.
- `lib/hooks/useDashboard.ts` : idem pour now-playing, Lanyard, et les routes tracker Valorant/LoL avec `name`/`tag`.
- `app/matches/page.tsx` : corrige les chemins tracker (`/api/tracker/valorant-matches` et `/api/tracker/lol-matches`) et ajoute les champs `name`/`tag` Riot.
- `lib/hooks/useTracker.ts` : ne tente pas de charger si le chemin est vide.
- `app/settings/page.tsx` + `components/LiveSettings.tsx` : nouveau panneau "Intégrations live" pour renseigner source, identités, client IDs, Riot ID et ville météo.
- `components/LiveWidgets.tsx` et `components/LiveOverlay.tsx` : incluent `clientId` dans les requêtes de contrôle Spotify et affichent un message si manquant.
- `worker/src/router.js` : ajoute les routes `/api/user-data/{macros,personas,bills}` (GET/POST/PATCH/DELETE).
- `app/connections/page.tsx` : persiste les `clientId` Spotify/YouTube/Reddit dans les settings lors de la connexion OAuth.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v339] - 2026-08-11

**Correction des routes plugins**

### Corrige
- `app/plugins/page.tsx` : les 7 plugins (Spotify, Discord, GitHub, Todoist, YouTube, Reddit, Weather) pointaient tous sur `/notes/`. Chacun ouvre maintenant une page dédiée `/plugins/{id}/` avec son statut live.
- Création de `app/plugins/[id]/page.tsx` et `app/plugins/[id]/PluginClient.tsx` : page de plugin dynamique qui affiche l’état live et un lien vers `/connections/`.
- Création de `lib/plugins.ts` : configuration et helpers partagés pour les plugins.
- Mise à jour des E2E (`routes.spec.ts`, `a11y.spec.ts`, `responsive.spec.ts`) pour couvrir les nouvelles routes `/plugins/{id}/`.

### Version PWA
- `experience-v323` (aucun changement d’asset PWA).

## [v338] - 2026-08-20

**Profils liés au compte utilisateur + migration des profils v8**

### Ajoute
- Migration Supabase `ethone_profiles` avec `user_id`, RLS, index unique sur le profil actif par utilisateur.
- Routes Worker `/api/profiles` (CRUD + activation) avec scoping par `auth.userId`.
- Hook `useProfiles` migré de `localStorage` vers l’API Worker : les profils sont maintenant synchronisés par compte et isolés entre utilisateurs.
- `ProfileSync` dans `app/layout.tsx` applique automatiquement le profil actif (`dockItems`, `accentColor`) au chargement.
- Fix : activation d'un profil faite par requêtes PATCH directes côté Worker, sans dépendre d'une RPC Supabase.
- Migration `202608270001_migrate_v8_profiles.sql` qui lit les profils stockés dans `ethone_user_state.payload.repository.profiles` et les insère dans `ethone_profiles` (type, accent, widgets, intégrations, profil actif). Ne touche que les utilisateurs sans profils dans la nouvelle table.

### Ajoute
- Migration Supabase `ethone_profiles` avec `user_id`, RLS, index unique sur le profil actif par utilisateur, et fonction `ethone_set_active_profile` pour garantir un seul profil actif à la fois.
- Routes Worker `/api/profiles` (CRUD + activation) avec scoping par `auth.userId`.
- Hook `useProfiles` migré de `localStorage` vers l’API Worker : les profils sont maintenant synchronisés par compte et isolés entre utilisateurs.
- `ProfileSync` dans `app/layout.tsx` applique automatiquement le profil actif (`dockItems`, `accentColor`) au chargement.
- Fix : activation d'un profil faite par requêtes PATCH directes côté Worker, sans dépendre d'une RPC Supabase (plus compatible avec la clé service du Worker).

### Version PWA
- `experience-v338`.

## [v337] - 2026-08-20

**Passkey : renouvellement de session via Supabase**

### Corrige
- La connexion par passkey ne signe plus un JWT côté Worker avec `refresh_token: ""`.
- Le Worker récupère l’email de l’utilisateur et appelle `auth/v1/admin/generate_link` pour obtenir un `hashed_token`.
- Le front utilise `supabase.auth.verifyOtp({ token_hash, type: "magiclink" })` pour obtenir une vraie session Supabase avec `access_token` et `refresh_token`.
- Le cycle de renouvellement natif de Supabase est ainsi pleinement fonctionnel après une connexion passkey.

### Version PWA
- `experience-v337`.

## [v336] - 2026-08-20

**Mail avancé : comptes externes, PGP, push, listes de diffusion**

### Ajoute
- `lib/hooks/useMail.ts` : méthodes pour comptes IMAP/OAuth, PGP, abonnements push, listes de diffusion.
- `components/MailAdvancedPanel.tsx` : onglets Comptes/PGP/Push/Listes dans l'interface Mail.
- Page `/mail` : bouton d'accès aux fonctionnalités avancées (icône cog).
- Génération, import et suppression de clés PGP.
- Abonnement/désabonnement Web Push avec `PushManager` et envoi de test.
- Création/synchronisation/suppression de comptes IMAP, Gmail et Outlook.
- Création et gestion de listes de diffusion avec membres et envoi de messages.
- Clés i18n associées pour FR/EN/ES/DE.

### Version PWA
- `experience-v336`.

## [v335] - 2026-08-20

**Phase 15 : Calendrier avancé + UI système (tooltip, bottom sheet, context menu, scratchpad, haptics)**

### Ajoute
- `components/Tooltip.tsx` : info-bulle accessible au survol/focus.
- `components/BottomSheet.tsx` : panneau inférieur avec animation.
- `components/ContextMenu.tsx` : menu contextuel positionné.
- `app/scratchpad/page.tsx` : bloc-notes éphémère avec persistance locale.
- `lib/hooks/useHaptics.ts` : déclenchement des vibrations tactiles via `navigator.vibrate`.
- Calendrier avancé : sélection d'un jour, saisie d'heure, affichage des événements du jour sélectionné.
- Clés i18n pour le scratchpad et le calendrier.

### Version PWA
- `experience-v335`.

## [v334] - 2026-08-20

**UI système : tooltip, bottom sheet, context menu, scratchpad, haptics**

### Ajoute
- `components/Tooltip.tsx` : info-bulle accessible au survol/focus.
- `components/BottomSheet.tsx` : panneau inférieur avec animation.
- `components/ContextMenu.tsx` : menu contextuel positionné.
- `app/scratchpad/page.tsx` : bloc-notes éphémère avec persistance locale.
- `lib/hooks/useHaptics.ts` : déclenchement des vibrations tactiles via `navigator.vibrate`.
- Clés i18n pour le scratchpad.

### Version PWA
- `experience-v335`.

## [v334] - 2026-08-20

**Intégrations manquantes (RSS, Bluesky, Linear, Plex, Steam)**

### Ajoute
- `worker/src/routes/rss.js` et route `/api/rss` : lecteur de flux RSS/Atom avec validation d'URL, timeout et parsing défensif.
- `app/rss/page.tsx` : interface de lecture de flux RSS.
- `app/connections/page.tsx` : cartes pour RSS, Bluesky, Linear et Plex en plus des intégrations existantes.
- Clés i18n pour les intégrations et le lecteur RSS.

### Version PWA
- `experience-v334`.

## [v333] - 2026-08-20

**Profils, récupération de mot de passe et feature-fallback**

### Ajoute
- `app/profile-selection/page.tsx` : page de sélection et création d'environnements de profil.
- `lib/hooks/useProfiles.ts` : gestion locale multi-profil avec création, duplication, suppression, sélection.
- `app/password-recovery/page.tsx` : formulaire de récupération via `supabase.auth.resetPasswordForEmail`.
- `app/feature-fallback/page.tsx` : page de repli expliquant une fonctionnalité indisponible.
- Clés i18n pour profils, récupération et fallback.

### Version PWA
- `experience-v333`.

## [v332] - 2026-08-20

**Brain avancé (mémoire, providers, préférences, actions, automatisation, planning)**

### Ajoute
- `lib/brain/preferences.ts`, `lib/brain/memory.ts`, `lib/brain/providers.ts`, `lib/brain/action-registry.ts`, `lib/brain/automation.ts` : gestion des préférences Brain, mémoire Supabase, providers, actions et règles d'automatisation.
- `lib/hooks/useBrain.ts` : hook unifiant chat, mémoire, providers, actions, automations et planning.
- Refonte complète de `app/brain/page.tsx` avec onglets Chat, Mémoire, Actions, Automations, Providers, Préférences.
- Intégration des actions Brain avec les endpoints `/api/notes`, `/api/tasks`, `/api/events`.
- Clés i18n pour le module Brain.

### Version PWA
- `experience-v332`.

## [v331] - 2026-08-20

**Sécurité, authentification OAuth/passkey et tests runtime**

### Ajoute
- `lib/hooks/useSecurity.ts` : devices, passkeys, événements de sécurité, enregistrement/authentification WebAuthn.
- Refonte de `app/security/page.tsx` : appareils, passkeys, historique, actions de confiance/révocation/signature.
- Route Worker `/api/auth/passkeys` pour lister les passkeys (`passkeyListRoute`).
- `lib/auth.ts` : `signInWithOAuth`, `signInWithPasskey` avec WebAuthn.
- Refonte de `app/login/page.tsx` : boutons Google/GitHub, connexion par passkey, reste du formulaire OTP.
- `lib/hooks/useMail.test.ts` : tests runtime fonctionnels pour `useMail`.
- Clés i18n pour passkey, OAuth et actions de sécurité.

### Version PWA
- `experience-v331`.

## [v330] - 2026-08-20

**Mail complet**

### Ajoute
- `lib/hooks/useMail.ts` : inbox, recherche, fils, envoi, réponse, transfert, brouillons, pièces jointes, labels, signatures, modèles, règles, snooze, analytics, expéditeurs bloqués/de confiance, alias, analyse Brain.
- Refonte complète de `app/mail/page.tsx` : navigation dossiers, liste par fils, barre de recherche, composition avec pièces jointes, panneaux labels/signatures/modèles/règles/bloqués/confiance/alias/analytics, actions en masse et analyse Brain.
- Clés i18n pour compose, reply, forward, subject, body, to, cc, bcc, attachments, labels, signatures, templates, rules, blocked, trusted, aliases, analytics, snooze, schedule, etc.

### Corrige
- Tous les tests Worker passent (136/136), y compris le test JWT tampered.

### Version PWA
- `experience-v330`.

## [v329] - 2026-08-20

**Fichiers avancés, partage public et drop**

### Ajoute
- `lib/hooks/useCloudFiles.ts` : recherche, navigation dossier, favoris, corbeille, renommage, déplacement, suppression, restauration, quota et upload Google Drive.
- `lib/hooks/useShares.ts` et `lib/hooks/useDrops.ts` pour créer, lister et révoquer partages/drops.
- Refonte complète de `app/files/page.tsx` avec upload, nouveaux dossiers, actions contextuelles (renommer, déplacer, partager, supprimer/corbeille/restaurer), barre de recherche, filtre favoris/corbeille et quota.
- Page publique `app/share/page.tsx` : résolution par slug, mot de passe et téléchargement.
- Page publique `app/drop/page.tsx` : dépôt de fichiers public par slug, avec limite de taille/nombre.
- `lib/api.ts` : `uploadWorker` et `uploadPublic` pour l'envoi de fichiers binaires.
- Clés i18n pour upload, partage, drop, quota, actions fichiers et états publics.
- Routes `/share/` et `/drop/` dans les tests E2E, a11y et responsive.

### Corrige
- Suppression du point-virgule résiduel dans `app/files/page.tsx`.

### Version PWA
- `experience-v329`.

## [v328] - 2026-08-20

**Tests E2E, audit responsive/accessibilité**

### Ajoute
- Playwright + `@axe-core/playwright` pour tests E2E visuels et a11y.
- `e2e/routes.spec.ts` : 24 routes × 3 viewports, vérification chargement + titre + exceptions.
- `e2e/responsive.spec.ts` : 5 routes × 4 viewports, détection du débordement horizontal.
- `e2e/a11y.spec.ts` : audit axe-core WCAG 2A/2AA par route et viewport.
- `scripts/a11y-audit.mjs` : audit statique HTML post-build avec axe-core + rapport `audit/a11y-report.json`.
- `scripts/responsive-audit.mjs` : audit statique responsive + rapport `audit/responsive-report.json`.
- Commandes npm : `test:e2e`, `test:all`, `audit:a11y`, `audit:responsive`.

### Corrige
- `aria-label` sur les icônes boutons de la sidebar, du dock, du live overlay et des toggles settings.
- `aria-label` sur les boutons, sélecteurs, inputs et textareas des pages restantes.
- `aria-hidden="true" focusable="false"` sur le composant `Icon`.
- Hierarchie de titres sur la page mail.
- `npm run test:all` passe (tsc, lint, build, tests unitaires, E2E, audits).

### Version PWA
- `experience-v328`.

## [v327] - 2026-08-20

**Settings avancés + Notification Center**

### Ajoute
- Paramètres avancés : accent, fond d’écran, police, reduced motion, haptics, low data, performance, statut, permissions/mémoire Brain.
- Notification Center avec catégories, priorités, lu/reporter/effacer.
- Application dynamique des accents, polices et fonds via data-attributes CSS.

### Version PWA
- `experience-v327`.

## [v326] - 2026-08-20

**Toasts sur toutes les actions et pages**

### Ajoute
- Toast de notification sur toutes les pages et actions (ajout, suppression, sauvegarde, connexion, déconnexion, synchronisation, invitation, etc.).
- Messages de toast traduits en français, anglais, espagnol et allemand.

### Version PWA
- `experience-v326`.

## [v325] - 2026-08-20

**Polish : timbres, icons cross-pack, changelog i18n**

### Ajoute / Poli
- Timbres des sound packs affinés (mechanical, liquid, minimal) avec volumes par type.
- Mapping cross-pack des icônes étendu + fallback par collection iconify.
- Changelog du site disponible en français, anglais, espagnol, allemand.

### Version PWA
- `experience-v325`.

## [v324] - 2026-08-10

**Plan B + Command Center + Live Overlay**

### Ajoute
- Backend `team` (invitation, liste, suppression) connecté à Supabase.
- Backend `spaces`, `flows`, `interactions` via `ethone_user_data`.
- `Command Center v1` : palette enrichie avec navigation, actions (theme/Brain/focus), création rapide, déconnexion.
- `Live Overlay v3` : multi-sources (Spotify, Discord, Météo, GitHub, Todoist, YouTube, Reddit), vue étendue, contrôles Spotify.
- `Plugins tiers v1` : page `/plugins`, statut live, ouverture fenêtre.
- `Personnalisation v2` : Dock personnalisable + Live cards flip + glass/tilt.
- `ProfileDropdown` : avatar/icone `User` pour remplacer la lettre initiale.
- `Icon packs` : Lucide, Phosphor, Tabler, Heroicons, Radix avec selecteur dans Settings + mode densité.
- `Uniformisation pack d'icônes` sur les composants principaux + réglages visuels (ombre, fond, radius dock).
- Toutes les pages migrées au pack d'icônes, density engine, aurora, presets de mise en page, equalizer live.
- Sound packs v1 : Web Audio API, 4 packs, click/hover/success/error/toggle/notification.
- Toast notifications avec animations + i18n complet (fr, en, es, de).
- `Macros persistantes` : page `/macros`, stockage dans `ethone_user_data`, exécution depuis Command Center.
- `Personas` : page `/personas`, création/application de thèmes perso.
- `Profil avancé` : page `/profile`, route worker `/api/profile` connectée à `ethone_public_profiles`.
- `Bills v1` : page `/bills`, échéances et total dû.
- `Mission Control v1` : fenêtres flottantes multi-instances, aperçu, drag/resize.

### Version PWA
- `experience-v324`.

## [v323] - 2026-08-18

**Fix UI : bouton collapse, profil/help Mail, bills i18n, PWA v323**

### Corrige
- Bouton de collapse Mail : icône seule, plus de texte tronqué.
- Bouton Profil dans Mail ouvre le panneau profil.
- Bouton Aide dans Mail ouvre la fenêtre de raccourcis clavier.
- Bills : date et montant localisés avec `Intl`, correction overflow montant.

### Version PWA
- `experience-v323`.

## [v322] - 2026-08-18

**Audit i18n : batch settings, Brain, home, PWA v322**

### Corrige
- Ajout de 30+ entrées i18n pour settings, Brain et home.
- Suppression des variables locales `worker/.dev.vars`.

### Version PWA
- `experience-v322`.

## [v321] - 2026-08-18

**Audit i18n : focus popover, panel, home et PWA v321**

### Corrige
- Internationalisation du popover Focus Timer et du panel.
- Temps relatif localisé avec `Intl.RelativeTimeFormat`.
- Horloges mondiales, Focus Express et notifications traduits.
- Labels des sections du dashboard traduits.

### Version PWA
- `experience-v321`.

## [v320] - 2026-08-18

**QA : internationalisation, erreurs console worker et PWA v320**

### Corrige
- Gestion des erreurs console `502` (Tracker) et `401` (Google Drive) : le worker retourne maintenant `ok: true` avec des données vides au lieu de provoquer un rejet HTTP.
- Internationalisation des empty-states, shell, statuts et widgets.
- Format de date localisé dans le widget Google Drive.

### Améliore
- `translateSource` fallback vers `en` lorsqu'une langue cible est absente du catalogue.

### Version PWA
- `experience-v320`.

## [v319] - 2026-08-18

**QA : i18n Settings, breadcrumb et bouton Nouveau**

### Corrige
- Traductions manquantes de `Settings` ajoutees au catalogue i18n.
- Comportement du breadcrumb contextuel et troncature sur les petits viewports.
- Declaration manquante de `newBtn` dans `v8/pages/mail.mjs`.

### Version PWA
- `experience-v319`.

## [v318] - 2026-08-18

**Mail : refonte premium Phase 4 — fils groupés dans la liste, recherche enrichie, glisser-déposer**

### Ajoute
- Regroupement visuel des fils de conversation dans la liste des messages : une seule ligne par fil avec un badge indiquant le nombre de messages associés.
- Mise en avant des résultats de recherche : surlignage des termes recherchés (expéditeur, sujet, aperçu) et badge de dossier d'origine, la recherche full-text côté serveur (Postgres `tsvector`) portant déjà sur tous les dossiers.
- Glisser-déposer de fichiers dans la fenêtre de composition pour joindre des pièces jointes, en plus du sélecteur de fichiers existant.

### Version PWA
- `experience-v318`.

## [v317] - 2026-08-18

**Mail : refonte premium Phase 3 — raccourcis clavier, palette de commandes, fils, pièces jointes et compose mobile**

### Ajoute
- Raccourcis clavier globaux dans Mail (C, R, A/E, Del/Backspace, /, ?, Esc, Ctrl/Cmd+K) avec une palette de commandes et une aide.
- Affichage des fils de conversation (`thread_id`) et des pièces jointes dans le détail d'un message, avec aperçu et téléchargement.
- Mode plein écran pour la composition sur mobile, avec une barre d'actions condensée.
- États vides et erreur contextuels par dossier et par recherche, plus une notification toast au retour en ligne.

### Version PWA
- `experience-v317`.

## [v316] - 2026-08-18

**Mail : refonte premium Phase 2 — barre d'outils contextuelle, infobulles, filtre/sort avancés**

### Ajoute
- Barre d'outils contextuelle : label "N sélectionné(s)", boutons Déplacer/Étiqueter en sélection, masquage d'Actualiser/Plus.
- Infobulles `data-tooltip` sur tous les boutons d'icône du Mail (menu, recherche, cloche, aide, profil, sélection, actions, filtres, tri, composer, réduction).
- Popover de filtre ancré au bouton Filtres avec champ "Destinataire" (filtrage côté client sur `to_addresses`) et en-tête "Recherche avancée".
- Menu de tri (Plus récent / Plus ancien / Expéditeur / Non lus) avec tri côté client.

### Corrige / Améliore
- Regroupement des actions groupées : déplacer et étiqueter via `showBottomSheet` en sélection active.
- Respect des conventions i18n et des tokens CSS pour les nouveaux éléments.

### Version PWA
- `experience-v316`.

## [v315] - 2026-08-18

**Mail : refonte premium Phase 1 — en-tête, barre d'outils, panneau Latéral et panneau Plus**

### Ajoute
- En-tête collante `v8-mail-header` avec le titre ETHONE Mail, menu mobile, recherche, cloche, profil et aide.
- Barre d'outils collante `v8-mail-toolbar` avec case à cocher principale, actions groupées (Actualiser, Archiver, Supprimer, Lu/Non lu, Snooze, Plus) et filtres/tri/composer.
- Panneau latéral resserré : titre, alias, dossiers avec compteur, bouton de réduction.
- Panneau `v8-mail-more-panel` latéral (desktop) / bottom sheet (mobile) regroupant les sections avancées (Analytique, Règles, Modèles, Notifications, Étiquettes, Comptes, PGP, Push, Listes, Sécurité).
- Support responsive desktop / tablette / mobile avec disposition en grille et volets fixes.
- Version PWA `experience-v315`.

### Corrige / Améliore
- Suppression de l'ancienne `v8-mail-layout` et `v8-mail-list-header` au profit d'une structure flex/grid Gmail-like.
- Déplacement de la cloche, de la recherche et du statut en ligne dans l'en-tête.
- Conservation de toute la logique métier existante (builders, actions, API, bulk).

## [v314] - 2026-08-18

**Signal Center : UI plus propre et espacée**

### Corrige / Améliore
- Chips de filtre (Toutes, Non lues, Important, Messages, Activité, Système, Brain, Sécurité) : style plus carré (`border-radius` moyen), plus gros (padding 8px 12px, icône 16px), espacés.
- Boutons *Tout marquer comme lu* et *Effacer* : hauteur augmentée, padding plus large, espacement accru.
- Items de notification : plus gros (padding, icône 48px, texte plus lisible), espacement augmenté.

### Bordereau PWA
- Mis à jour vers `experience-v314`.

## [v313] - 2026-08-18

**Mail : bouton Analytics, cloche, création d'adresse @ethone.dev**

### Corrige / Améliore
- Bouton **Open** des Analytics : style plus carré/compact (`v8-mail-analytics__open`).
- Bouton cloche Mail agrandi à 40px et badge ajusté.
- Correction du chargement de l'alias dans `mail.mjs` (l'objet alias est maintenant conservé, pas converti en string).

### Ajoute
- Section **Mon adresse** dans la sidebar Mail : affichage de l'alias `@ethone.dev` existant ou formulaire pour en créer un.
- Route Worker `/api/mail/alias` en POST : accepte un alias personnalisé avec validation `@ethone.dev`.
- Client `mailApi.createAlias` et opération `mailAliasCreate`.

### Bordereau PWA
- Mis à jour vers `experience-v313`.

## [v312] - 2026-08-18

**Hotfix UI : empty-state, i18n et PWA v312**

### Corrige
- Correction du `icon is not a function` dans `v8/ui/empty-state.mjs` : le paramètre `icon` masquait l'import `icon` de `dom.mjs` dans `buildEmptyState`.

### Internationalisation
- Traduction du label du skeleton : `Chargement du contenu` et `Chargement de {0}`.

### Bordereau PWA
- Mis à jour vers `experience-v312`.

## [v311] - 2026-08-18

**Hotfix Worker : routes Mail**

### Corrige
- Correction de `request.url.searchParams` dans `worker/src/routes/mail.js` et `worker/src/routes/mail-templates.js` : `request.url` est une string, il faut parser `new URL(request.url)` avant d'accéder aux query params.
- Cela empêchait l'erreur `Cannot read properties of undefined (reading 'get')` sur les appels `/api/mail/inbox`, `/api/mail/search`, `/api/mail/contacts`, `/api/mail/drafts`, `/api/mail/thread` et `/api/mail/templates`.

## [v310] - 2026-08-18

**Hotfix UI : toggle de la sidebar**

### Corrige
- Le bouton de réduction de la sidebar n'est plus positionné en absolu sur le logo ETHONE ; il s'empile proprement sous le logo en rail non étendu.

### Bordereau PWA
- Mis à jour vers `experience-v310`.

## [v309] - 2026-08-18

**Hotfix UI : boutons du centre de notifications**

### Corrige
- Boutons d'action du centre de notifications : taille compacte, alignement propre et icônes réduites pour éviter les chevauchements.
- Classe `.v8-button--sm` manquante ajoutée et normalisée avec `.v8-button--small`.

### Bordereau PWA
- Mis à jour vers `experience-v309`.

## [v296] - 2026-08-18

**Phase F : Quality of Life + UX Polish + Mobile 2.0 + Personalisation**

### Ajoute
- Fondations mobile : safe-areas, touch targets, viewport, gestes de retour et long-press, barre de navigation mobile et bottom sheets.
- Navigation mobile : dock flottant, actions rapides, FAB et feuilles d'action réutilisables.
- Dashboard responsive : grille adaptative, densité, priorisation des widgets et mode "plus de widgets".
- Brain Daily Assistant : briefing quotidien (météo, calendrier, tâches, mail, notifications, Spotify) et bilan de journée.
- Centre de notifications global : catégories, priorités, snooze, recherche, glisser pour supprimer et synchronisation du badge.
- Audit du design system : tokens d'espacement, typographie, boutons, cartes, modaux, états vides/erreur/skeleton et `prefers-reduced-motion`.
- Moteur de personnalisation : densité, thème, accent, fond d'écran, mémoire par workspace et persistance cross-page.
- Refonte des réglages : sections par cartes, recherche en temps réel, favoris, raccourcis, accessibilité (taille de police, daltonisme, contraste élevé) et réglages Mail.
- Accessibilité et performance : classes d'accessibilité, mode faibles données, precache SW étendu et optimisations du rendu.

### Bordereau PWA
- Mis à jour vers `experience-v296`.

## [v297] - 2026-08-18

**Hotfix : i18n, Bills, Interactions, Météo et tutoriels**

### Améliore
- Widget Bills : formulaire personnalisé avec saisie du montant, calendrier de date, catégorie et récurrence, disponible sur Home et Calendrier.
- Météo : suppression de la troncature du texte et traduction des conditions météo.
- Interactions : traduction complète de la page, correction du bouton Refresh, du "Show less" et de la carte d'activité qui n'affichait que le vendredi.
- 3D des cartes : correction de l'effet de profondeur et reflet sur les live cards.
- Heatmap : rendu de tous les jours et effet 3D sur les points d'activité.

### Corrige
- Notes, Drive/Fichiers, Activity Hub et centre de notifications : chaînes manquantes traduites (fr, en, es, de).
- Connexions : tutoriels avec liens directs vers les sources officielles et UIs carrées.
- Bluesky et autres intégrations : affichage de l'icône de marque correcte.

### Bordereau PWA
- Mis à jour vers `experience-v297`.

## [v298] - 2026-08-18

**Hotfix : dock, navbar, quick actions, focus timer, i18n et fluidité**

### Améliore
- Team : traduction des rôles, boutons et statuts.
- Focus Timer : traduction du menu (Pomodoro, Deep Work, Sprint, Pause, etc.) et ouverture au clic.
- Menu profil : labels traduits, layout symétrique et épuré, boutons séparés et moins arrondis.
- Brain briefing : traduction de "Good evening" et autres chaînes restées en anglais ; checkboxes modernisées et épurées.
- Quick actions : FAB déplaçable, fiche d'actions rapides centrée avec effet d'apparition.
- Animations : transitions et easing plus fluides sur les pages, dock, bottom sheets et cartes.

### Corrige
- Bouton d'agrandissement de la navbar déplacé pour ne plus chevaucher le logo ETHONE.
- Bouton notifications du dock connecté au centre de notifications.
- Pomodoro n'ouvre plus son menu au survol, seulement au clic sur l'icône.

### Bordereau PWA
- Mis à jour vers `experience-v298`.

## [v299] - 2026-08-18

**Hotfix : centre de notifications du dock**

### Corrige
- Le panneau de notifications du dock était invisible (`is-open` manquait) mais capturait les clics, ce qui gelait l'interface.
- Le panneau de notifications est maintenant visible avec animation, se referme avec Échap / clic extérieur / bouton X, et a `pointer-events: none` quand il est fermé.
- Robustesse du store : une erreur dans un abonné (ex. panneau de notifications) ne bloque plus les autres abonnés.

### Bordereau PWA
- Mis à jour vers `experience-v299`.

## [v300] - 2026-08-18

**Hotfix : fiche Actions rapides déplaçable et traduite**

### Améliore
- La fiche Actions rapides est maintenant déplaçable : on peut glisser son en-tête pour la positionner où on veut (avec clamping pour garder au moins 48 px visible).
- Tous les libellés de la fiche Actions rapides sont traduits via `translateSource`.

### Bordereau PWA
- Mis à jour vers `experience-v300`.

## [v301] - 2026-08-18

**Hotfix : refonte et i18n de la page ETHONE Mail**

### Améliore
- Page ETHONE Mail entièrement internationalisée (fr/en/es/de) : dossiers, filtres, notifications, règles, modèles, PGP, analytique, rédaction et actions groupées.

### Corrige
- Initialisation de la page Mail protégée par `try/catch` pour éviter un écran vide.
- Correction de la comparaison `state.securityTab` avec la clé technique `blocked` au lieu de sa traduction.
- Remplacement des titres, placeholders, messages d'erreur et libellés en dur par `translateSource`.

### Bordereau PWA
- Mis à jour vers `experience-v301`.

## [v302] - 2026-08-18

**Hotfix : correction des états d'erreur et des notifications dupliquées sur Mail**

### Corrige
- Le bandeau d'erreur `ERREUR` dans `buildErrorState` était en dur en français ; il passe maintenant par `translateSource`.
- Les messages par défaut de `buildErrorState` sont traduits.
- Les notifications d'erreur identiques sur la page Mail sont dédupliquées (5 secondes) pour éviter les toasts en cascade quand le Worker renvoie une 500.

### Bordereau PWA
- Mis à jour vers `experience-v302`.

## [v303] - 2026-08-18

**Hotfix : déduplication du Centre de Signal et traduction des groupes/sources**

### Corrige
- Déduplication au niveau du gestionnaire de notifications : une même notification (même titre, message, type, catégorie, priorité) reçue dans une fenêtre de 30 secondes met à jour l'existante au lieu de créer un doublon.
- Traduction de la source des notifications dans les items (`System` au lieu de `Système` en anglais).
- Traduction du titre des groupes (`4 Système` → `4 System` en anglais).
- Ajout des clés de traduction pour les options de snooze (`10 min`, `1 h`, `Ce soir`).

### Bordereau PWA
- Mis à jour vers `experience-v303`.

## [v304] - 2026-08-18

**Hotfix : diagnostics d'erreur Worker Mail et vérification des migrations**

### Corrige
- Les erreurs Worker incluent maintenant un champ `detail` pour aider le client à distinguer un manque de migration, une erreur de schema ou une configuration incomplète.
- Le Worker détecte les erreurs PostgREST liées à un objet manquant (`relation ... does not exist`, etc.) et renvoie un `DB_SCHEMA_ERROR` 500 avec le détail.
- Le client `mail.mjs` affiche des messages d'erreur spécifiques selon le `detail` :
  - configuration Worker Supabase incomplète,
  - base de données Mail non initialisée (migrations 20260812 à 20260817),
  - erreur Worker générique.
- Vérification : les 7 migrations Supabase Mail (20260812 → 20260817) sont présentes et dans l'ordre.

### Bordereau PWA
- Mis à jour vers `experience-v304`.

## [v305] - 2026-08-18

**Hotfix : icônes Sound Pack, traductions Dock et persistance de la position Actions rapides**

### Corrige
- Icônes personnalisées pour chaque pack sonore (ETHONE, Minimal, Classic, Apple Inspired, Cyber Pulse, Silent) au lieu d'une seule note partout.
- Traduction manquante des libellés du panneau `Personnaliser le Dock` et du `Control Center` (Alignement, Verre & Flou, Masquage Auto, Zoom survol, Audio, Ambiance sonore, Focus Timer, etc.).
- Le bouton Actions rapides (FAB) et la fiche Actions rapides sauvegardent maintenant leur position utilisateur via `localStorage`.
- La fiche Actions rapides revient à sa position initiale (centrée) avec une animation à la fermeture.

### Bordereau PWA
- Mis à jour vers `experience-v305`.

## [v306] - 2026-08-18

**Hotfix Mail : déduplication des erreurs, style du bouton Analytics et header mobile**

### Corrige
- Dédoublonne les notifications d'erreur Mail portant le même message, même si le titre diffère (Templates vs Mail, etc.).
- Bouton "Ouvrir" des Analytics : variante `primary` + icône `bar-chart-3` pour ne plus être "tout plat".
- Header de la liste Mail : `flex-wrap: wrap` et `min-width: 0` sur les enfants pour éviter que les boutons soient coupés à droite.

### Bordereau PWA
- Mis à jour vers `experience-v306`.

## [v307] - 2026-08-18

**Hotfix Mail : titre des notifications d'erreur global**

### Corrige
- Les notifications d'erreur Mail liées au schéma, aux migrations ou à la configuration Worker portent maintenant le titre générique `Mail` au lieu du sous-module (Templates, etc.).

### Bordereau PWA
- Mis à jour vers `experience-v307`.

## [v308] - 2026-08-18

**Hotfix : popups Coming soon et erreur ReadableStream**

### Corrige
- Les boutons internes de Mail (dossiers, nouveaux messages, filtres, etc.) avaient un `data-action` non enregistré ; les clics remontaient au shell et affichaient `Coming soon`. Ils sont maintenant interceptés dans la page Mail pour ne plus déclencher de commande globale.
- `requestJSON` dédoublonne maintenant au niveau du JSON parsé et non plus au niveau du `Response` brut. Empêche l’erreur `Failed to execute 'getReader' on 'ReadableStream'` quand deux appels identiques étaient en cours en parallèle.

### Bordereau PWA
- Mis à jour vers `experience-v308`.

## [v295] - 2026-08-17

**Phase 14/15 : ETHONE Mail — comptes externes, chiffrement, push et listes**

### Ajoute
- Comptes mail externes : Gmail, Outlook et IMAP (création, sync, suppression).
- Chiffrement PGP simplifié via Web Crypto : génération de clés, chiffrement/déchiffrement côté Worker.
- Notifications push Web : souscription, envoi VAPID et webhook `/api/webhooks/mail`.
- Listes de diffusion : alias, membres, forward automatique via Resend.
- Routes Worker : `/api/mail/accounts`, `/api/mail/pgp/keys`, `/api/mail/push/*`, `/api/mail/lists`, `/api/webhooks/mail`.
- Intégration client et Brain pour les nouvelles fonctionnalités.
- Bordereau PWA mis à jour.

### Bordereau PWA
- Mis à jour vers `experience-v295`.

## [v294] - 2026-08-16

**Phase 14 : ETHONE Mail — analytics, sécurité et confiance**

### Ajoute
- Analytics mail : volumes envoyés/reçus, contacts fréquents, heures de pointe, stockage, règles actives, tendances 7/30/90 jours.
- Sécurité et confiance : vérification SPF/DKIM/DMARC, détection d'hameçonnage, expéditeurs bloqués et liste de confiance.
- Dossier Corbeille pour expéditeurs bloqués et contournement de la détection spam pour expéditeurs de confiance.
- Tests E2E du Worker (`worker/test/mail.test.mjs`) : 16 scénarios couvrant envoi, brouillons, recherche, déplacement, étiquettes, règles, templates, signatures, snooze, bulk, programmation, analytics, blocage/confiance et analyse Groq.

### Bordereau PWA
- Mis à jour vers `experience-v294`.

## [v293] - 2026-08-15

**Phase 13b/c : ETHONE Mail — hors-ligne, bulk, snooze, programmation**

### Ajoute
- Mode hors-ligne : cache IndexedDB mail, file d'attente d'actions, synchronisation auto au retour en ligne.
- Actions bulk : sélection multiple, archiver, supprimer, marquer lu/non lu, important, étiqueter, désétiqueter, snooze.
- Snooze : bouton dans le détail et toolbar bulk avec options demain, 1 semaine, date personnalisée.
- Envoi programmé : date d'envoi dans la composition, Worker `scheduled`, table outbox.
- Réponse automatique via règles : `action_auto_reply` et traitement par le Worker `scheduled`.
- Worker : routes `/api/mail/snooze`, `/api/mail/bulk`, `/api/mail/schedule` et exports `scheduled`.

### Bordereau PWA
- Mis à jour vers `experience-v293`.

## [v292] - 2026-08-15

**Phase 13a : ETHONE Mail — recherche avancée et templates**

### Ajoute
- Recherche mail avancée : expéditeur, sujet, corps, dates, pièces jointes, étiquettes, dossier.
- Templates de réponse : CRUD, défaut, sélecteur dans la composition, action Brain `mail.template`.
- Worker : routes `/api/mail/search` étendues et `/api/mail/templates`.

### Bordereau PWA
- Mis à jour vers `experience-v292`.

## [v291] - 2026-08-14

**Phase 12 : ETHONE Mail + Brain**

### Ajoute
- Brain Mail : résumé automatique des messages, réponses suggérées et extraction de tâches/événements via Groq.
- Détection d'importance automatique à la réception (mots-clés, fréquence contact, réponse directe).
- Règles de filtrage personnalisables : déplacement, étiquette, archive, spam, important automatique.
- Notifications mail avec cloche de badge et liste dans la sidebar.
- Worker : nouvelles routes `/api/mail/{analyze, suggest, extract, rules, notifications}`.

### Bordereau PWA
- Mis à jour vers `experience-v291`.

## [v290] - 2026-08-13

**Phase 11 : ETHONE Mail — fondations natives**

### Ajoute
- ETHONE Mail : interface 3 panneaux avec sidebar, liste et lecture, responsive desktop, iPad et mobile.
- Dossiers Mail : Inbox, Favoris, Envoyes, Brouillons, Archive, Spam, Corbeille avec deplacement et badges.
- Composition riche : To/Cc/Bcc, editeur HTML basique, signatures, pieces jointes en base64 et auto-sauvegarde des brouillons.
- Recherche full-text dans les messages, etiquettes personnalisables et carnet de contacts automatique.
- Brain : categorie de permission `mail`, contexte mail et actions (resumer, rechercher, rediger, deplacer, ouvrir).
- Worker : nouvelles routes `/api/mail/{drafts, move, search, labels, contacts, signatures}` et gestion des threads.
- Migration Supabase `202608130001_ethone_mail_phase_a` : folders, labels, signatures, contacts, search_vector et pieces jointes.

### Bordereau PWA
- Mis a jour vers `experience-v290`.

## [v289] - 2026-08-11

**Phase 10 : meteo emoji et icones de presets**

### Ajouté
- Card meteo avec emoji et teinte selon la condition (soleil, pluie, orage, neige, etc.).
- Badge meteo avec emoji, degradé et glow coloré.

### Amélioré
- Popin de détail meteo avec emoji et teinte condition.
- Presets d'apparence : remplacement des initiales par des icones Lucide.

### Bordereau PWA
- Mis à jour vers `experience-v289`.

## [v288] - 2026-08-11

**Phase 10 : redesign du flip météo**

### Amélioré
- Nouveau verso de la carte météo : header, grande température, stats vent/humidité et prévisions.

### Bordereau PWA
- Mis à jour vers `experience-v288`.

## [v287] - 2026-08-11

**Phase 10 : effet 3D restreint aux cartes live**

### Amélioré
- Réintégration d'un effet 3D/spotlight au survol pour les cartes live (Home/Activity).

### Corrigé
- Suppression de l'effet 3D sur les pages statiques (Settings, etc.).

### Bordereau PWA
- Mis à jour vers `experience-v287`.

## [v286] - 2026-08-11

**Phase 10 : amélioration du widget Factures**

### Ajouté
- Icônes de factures par service (Spotify, Netflix, WiFi, etc.) avec brand icons.

### Amélioré
- Marqueur du jour actuel discret (bordure en pointillés) sans confondre avec la sélection.
- Petite animation au changement de jour sélectionné.

### Bordereau PWA
- Mis à jour vers `experience-v286`.

## [v285] - 2026-08-11

**Phase 10 : suppression des effets 3D sur toutes les pages**

### Corrigé
- Suppression de `perspective`, `rotateX` et `rotateY` dans `shell.css` et `depth.css`.
- Flip des live cards remplacé par un basculement `display` sans 3D.

### Bordereau PWA
- Mis à jour vers `experience-v285`.

## [v284] - 2026-08-11

**Phase 10 : overlays Spotify, Last.fm et Minecraft**

### Ajouté
- Spotify : overlay "grand lecteur" au clic avec artwork, progression, contrôles et like (route Worker `/api/spotify/control`).
- Last.fm : overlay détail au clic avec album, écoutes, date et lien.
- Minecraft : overlay détail avec skin/cape en grand et historique des pseudos.

### Bordereau PWA
- Mis à jour vers `experience-v284`.

## [v283] - 2026-08-11

**Phase 10 : correction des badges Discord**

### Corrigé
- Suppression du fallback de faux badges pour l'utilisateur par défaut.
- Fallback icône Lucide si l'image d'un badge Discord ne charge pas.

### Bordereau PWA
- Mis à jour vers `experience-v283`.

## [v282] - 2026-08-11

**Phase 10 : diagnostic et correction du module Mail**

### Corrigé
- Worker : `resolveAliasByEmail` filtre directement côté Supabase au lieu de charger tous les alias.
- Interface Mail : messages d'erreur explicites (timeout, route non déployée, migration manquante).

### Bordereau PWA
- Mis à jour vers `experience-v282`.

## [v281] - 2026-08-11

**Phase 10 : correction des effets 3D et alignements UI**

### Corrigé
- Désactivation de l'effet de tilt 3D sur les cartes, la page Interactions et les réglages.
- Page Interactions : suppression du conflit de `transform`, meilleur espacement des icônes de statistiques.
- Rail : le bouton d'agrandissement est repositionné en haut à droite du logo en mode réduit.

### Bordereau PWA
- Mis à jour vers `experience-v281`.

## [v280] - 2026-08-11

**Phase 10 : fluidité du boot et du Service Worker**

### Corrigé
- Le Service Worker ne recharge plus la page au premier `controllerchange` (`clients.claim`).
- L'écran de boot HTML initial est réutilisé au lieu d'être recréé entre `booting`, profils et connexion.

### Bordereau PWA
- Mis à jour vers `experience-v280`.

## [v279] - 2026-08-11

**Phase 10 : module Mail - navigation et actions**

### Corrigé
- Enregistrement de la commande et de l'action `v8.mail.open` dans le catalogue et le système d'actions.
- Ajout des traductions manquantes pour le module Mail.

### Bordereau PWA
- Mis à jour vers `experience-v279`.

## [v278] - 2026-08-11

**Phase 10 : module ETHONE Mail**

### Ajouté
- **Module Mail** : chaque utilisateur obtient un alias `@ethone.dev`.
- **Réception** : Email Worker qui reçoit les e-mails entrants et les stocke dans Supabase.
- **Envoi** : envoi d'e-mails via Resend depuis l'adresse `@ethone.dev` de l'utilisateur.
- **Page Mail** : boîte de réception, lecture d'e-mail, composition.
- **Routes Worker** : `/api/mail/{send,inbox,thread,read,alias}`.
- **Migrations Supabase** : `ethone_mail_aliases`, `ethone_mail_messages`, `ethone_mail_threads`.

### Bordereau PWA
- Mis à jour vers `experience-v278`.

## [v277] - 2026-08-11

**Phase 10 : activation e-mail Resend**

### Corrigé
- **Worker** : ajout du secret `RESEND_FROM` pour activer l'envoi d'e-mails d'invitation d'équipe.
- **Worker redéployé** avec `RESEND_API_KEY` et `RESEND_FROM` configurés.

### Vérifié
- Aucune clé API Resend n'est présente dans les sources du worker.
- Bordereau PWA mis à jour vers `experience-v277`.

## [v276] - 2026-08-11

**Phase 10 : traductions complètes et i18n**

### Amélioré
- **25 nouvelles chaînes traduites** en anglais, espagnol et allemand (team, interactions, Brain, bills, navigation).
- **Catalogue i18n compacté** pour respecter les budgets JavaScript.
- Bordereau PWA mis à jour vers `experience-v276`.

## [v275] - 2026-08-11

**Phase 10 : fondations audit, sécurité et refactorisation**

### Corrigé
- **Sécurité** : remplacement du hashing SHA-256 par PBKDF2-SHA256 pour les mots de passe de partages et drops.
- **Sécurité** : génération cryptographique des codes OTP via `crypto.getRandomValues`.
- **Sécurité** : génération des tokens d'invitation d'équipe sans fallback `Math.random`.
- **Routage** : ajout de `interactions` et `team` dans `V8_ROUTES`.
- **Mémoire** : nettoyage du focus timer lors de la fermeture du panel.

### Amélioré
- **Refactorisation** : création des modules `v8/utils/format.mjs`, `v8/utils/download.mjs`, `v8/utils/date.mjs` pour éliminer les duplications.
- Bordereau PWA mis à jour vers `experience-v275`.

## [v274] - 2026-08-11

**Phase 9 : corrections topbar et dock mobile**

### Corrigé
- Topbar mobile : passage en 3 colonnes pour eviter le retour a la ligne et le chevauchement des icones.
- Breadcrumbs sur mobile : masque du root en dessous de 430px pour gagner de la place.
- Dock mobile : reduction de la taille des icones (42/38/36/34px) selon le breakpoint.

### Amélioré
- Bordereau PWA mis a jour vers experience-v274.

## [v273] - 2026-08-11

**Phase 9 : avatar Brain thinking enrichi**

### Ajouté
- Nouveau badge Brain 'Thinking' avec étoile tournante, glow pulsant, orbites et particules.

### Amélioré
- Bordereau PWA mis a jour vers experience-v273.

## [v261] - 2026-08-10

**Migration Next.js : dashboard A-Z — Google Drive, changelog et docs**

### Ajoute
- Intégration Google Drive native sur la page Fichiers (`useDriveFiles`, connexion OAuth et liste unifiée avec les fichiers worker).
- Documentation minimaliste du client Next.js (`README.md` : stack, scripts, déploiement).

### Corrige / Améliore
- `CHANGELOG.md` mis à jour avec le suivi de la migration dashboard Next.js A-Z.

### Version PWA
- `experience-v261`.

## [v272] - 2026-08-10

**Phase 9 : team-manager Supabase + interactions reseau**

### Ajouté
- Team Manager branché sur Supabase (table ethone_team_members) avec CRUD asynchrone.
- Invitations d'équipe : génération de token et lien d'invitation.
- Endpoint worker /api/team/invite pour envoi d'e-mail via Resend (prêt si RESEND_API_KEY configuré).
- Interactions Heatmap connecté au journal d'activité ETHONE (ouvertures de page, tâches, notes, etc.).

### Amélioré
- Bordereau PWA mis a jour vers experience-v272.

## [v271] - 2026-08-10

**Phase 9 : ajustements UI mobile Calendrier**

### Corrigé
- Page-heading actions : flex-wrap pour eviter le debordement des boutons sur mobile.
- Titre Calendrier : retour a la ligne et ellipsis du mois en mobile.

### Amélioré
- Bordereau PWA mis a jour vers experience-v271.

## [v270] - 2026-08-10

**Phase 9 : correction bouton Admin Fichiers**

### Corrigé
- Bouton Admin de la page Fichiers : ouvre maintenant la modale de partages et drops.

### Amélioré
- Bordereau PWA mis a jour vers experience-v270.

## [v269] - 2026-08-10

**Phase 9 : Brain conversationnel et thinking anime**

### Ajouté
- Brain repond maintenant aux salutations et aux messages simples (bonjour, ca va, etc.).
- Message 'Brain reflechit...' avec anneaux pulsatiles et points de suspension animes pendant la requete.
- Animation du hero Brain quand il reflechit : halo, ondes concentriques et pulsation de l'icone.

### Amélioré
- Bordereau PWA mis a jour vers experience-v269.

## [v268] - 2026-08-10

**Phase 9 : theme picker anime et v267**

### Ajouté
- Theme picker ameliore avec swatch actif qui pop, anneau d'onde et swatch custom rotatif.
- Effet flash couleur au changement d'accent avec transition douce des couleurs d'interface.

### Amélioré
- Bordereau PWA mis a jour vers experience-v268.

## [v267] - 2026-08-10

**Phase 9 : interactions, heatmap 3D et v266**

### Ajouté
- Nouvelle page Interactions avec une heatmap des 30/90 derniers jours, toggle Less/More et statistiques.
- Service interactions-heatmap pour suivre et simuler l'engagement quotidien.
- Effet 3D sur la heatmap et les cartes de statistiques grace a l'integrateur depth-effect.

### Amélioré
- Bordereau PWA mis a jour vers experience-v267.

## [v266] - 2026-08-10

**Phase 9 : taches, animations et v265**

### Ajouté
- Animation de complétion des tâches : la ligne s'élève, se fade et les tâches restantes glissent en douceur.

### Amélioré
- Bordereau PWA mis a jour vers experience-v266.

## [v264] - 2026-08-10

**Phase 9 : equipe, collaboration et cloud**

### Ajouté
- Nouvelle page Équipe pour inviter des membres, leur attribuer un role et gerer l'acces aux fichiers.
- Service createTeamManager local avec roles (owner, admin, senior, junior, assistant, viewer) et statuts (pending, active, revoked).
- Table Supabase ethone_team_members et ethone_file_collaborators pour la collaboration securisee.
- Avatars generes a partir des initiales et support des URL de photo de profil.

### Amélioré
- Bordereau PWA mis a jour vers experience-v264.

## [v260] - 2026-08-10

**Phase 9 : widget Bills, i18n et stabilite CI**

### Ajouté
- Nouveau widget Bills : calendrier des factures a 7 jours, detail anime, ajout manuel et scan IA.
- Gestionnaire de factures avec recurrences (episode, hebdomadaire, mensuelle, trimestrielle, annuelle) et categories.
- Scan IA d'e-mails ou de fiches de facture (extraction auto du montant, date, categorie et recurrence).

### Amélioré
- 128 traductions manquantes ajoutees (en, es, de) dans le catalogue i18n.
- Bordereau PWA mis a jour vers experience-v260.

### Corrigé
- Barre d'actions groupées du panel de notifications : texte tronque, icones visibles avec aria-label.
- Correction du script RLS QA pour ne plus exiger de lignes seedees pour les utilisateurs de test.
- Ajout du package.json et mise a jour wrangler.toml pour le worker deploy-status.
- Navigation fluide des pages lazy grace aux View Transitions et gestion du cycle de vie.
- Style loader et bordereau PWA synchronises (v263) pour eviter les flashs de contenu.
- Formulaire de connexion : autofill fiable et suppression des animations de layout au focus clavier mobile.

## [v259] - 2026-08-09

**Phase 9 : stabilite, navigation mobile et error boundaries**

### Corrigé
- Correction de la validation GitHub Pages : cache SW v258, lazy-load des pages lourdes et ajustement des budgets JS.

### Ajouté
- Barre de navigation mobile avec drawer Applications (bottom nav).

### Amélioré
- Error boundaries et gestion des erreurs de montage pour eviter les ecrans noirs.
- Lazy-loading des pages Fichiers, Partage, Drop et Matchs pour ameliorer le demarrage.
- Chargement paresseux des modules et renforcement du lifecycle.

## [v258] - 2026-08-08

**ETHONE Cloud : partages, drops, recherche, offline et admin**

### Ajouté
- Synchronisation des metadata Drive vers Supabase (ethone_files) avec tags, favoris et resume Brain.
- Recherche cloud full-text sur noms, tags et resume Brain.
- Partages securises (public, prive, mot de passe, expiration, limite de telechargements).
- Drops pour recevoir des fichiers de tiers sans connexion.
- Pages publiques #/share?slug=... et #/drop?slug=... avec apercu, QR code et drag & drop.
- Analyse Brain sur les fichiers : resume et suggestion de dossier.
- Journal d'activite cloud integre a Activity Hub.
- Cache offline IndexedDB pour metadata, favoris et file d'attente d'uploads.
- Panneau Admin dans Fichiers : dashboard, liste des partages/drops, revocation et nettoyage des expires.
- Cleanup automatique des shares et drops expires via POST /api/cloud/cleanup.

### Amélioré
- Mise a jour du bordereau PWA vers experience-v258.
## [v257] - 2026-08-07

### Ajouté
- **Système de sécurité et d'identité ETHONE** : gestion des appareils, passkeys (WebAuthn), OTP fallback et journal de sécurité.
- **Tables Supabase** : `ethone_devices`, `ethone_passkeys`, `ethone_security_events`, `ethone_device_verification_requests`, `ethone_otp_codes`, `ethone_passkey_challenges`.
- **Routes Worker** : `/api/auth/passkey/*`, `/api/auth/otp/*`, `/api/auth/device*`, `/api/auth/security-events`.
- **Frontend** : connexion par passkey et code email depuis l'écran de login, page `#/security` pour la gestion des appareils et des événements.
- **Tests Worker** : couverture de base pour l'envoi OTP debug, l'authentification des routes et la liste des appareils.

### Modifié
- Bordereau PWA mis à jour vers `experience-v257`.

## [v256] - 2026-08-07

### Corrigé
- **Page Activity** : `ReferenceError` sur `translateSource` dans `v8/pages/activity.mjs` dû à un import manquant.

### Modifié
- Masquage du raccourci clavier `Ctrl+K` dans le bouton de recherche topbar sur mobile.
- Uniformisation du bordereau PWA à `experience-v256` (`sw.js`, `STYLE_RELEASE`, `index.html`, `404.html`).

## [v255] - 2026-08-07

### Corrigé
- **Écran noir après connexion sur mobile** : la variable `focusTimer` était utilisée dans l'objet passé à `mountShell` avant son initialisation, provoquant une `ReferenceError` (temporal dead zone) au montage de l'application.
- Initialisation de `focusTimer` déplacée avant `mountShell` dans `v8/app/app-runtime.mjs`.

### Modifié
- Bordereau PWA mis à jour vers `experience-v255`.

## [v254] - 2026-08-07

### Ajouté
- **Centre de notifications** : historique persistant, catégories, priorité, badge cloche, panneau et mode silencieux par catégorie.
- **Toasts intelligents** : les notifications stockées en `localStorage`, avec compteur de non-lues et signalement des alertes importantes.
- **Suggestions Brain sur le dashboard** : proposition contextuelle de focus, événement, note récente ou ouverture Brain.
- **Import / export complet de la configuration ETHONE** dans les réglages (Système), incluant le `localStorage` et l'état actuel.

### Modifié
- Bordereau PWA mis à jour vers `experience-v254`.

## [v253] - 2026-08-07

### Ajouté
- **Vue tableau Kanban** pour les tâches : bascule entre liste et colonnes "À faire / Terminées".
- **Filtre par priorité** et **bannière de statistiques** avec jauge circulaire sur la page Tâches.
- **Personnalisation du dashboard** : panneau pour masquer/afficher les sections et sauvegarde dans `localStorage`.
- **Nouveau design des tâches** : cartes avec accent de couleur selon la priorité, badges d'échéance et de tag.

### Modifié
- **Notes** : l'éditeur est désormais centré sous forme de feuille blanche avec une largeur de lecture confortable.
- Bordereau PWA mis à jour vers `experience-v253`.

## [v252] - 2026-08-07

### Corrigé
- **Rank LoL** : meilleure récupération depuis l'API Riot et formattage sécurisé du tier/rank.
- **Image de profil LoL** : utilisation de la version DDragon à jour.
- **Items LoL** : masquage des emplacements vides dans le scoreboard.
- **Traduction** : "Unranked" devient "Non Classé" sur la carte LoL Live.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v252`.

## [v251] - 2026-08-07

### Ajouté
- **Menu Pomodero au survol** sur le bouton Pomodoro du Dock et le statut Focus de la barre du haut.
- Actions rapides Focus Timer : démarrer Pomodoro / Deep Work / Sprint, pause/reprendre, arrêter, passer la phase.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v251`.

## [v250] - 2026-08-07

### Ajouté
- **Recommandations explicables sur le dashboard** : carte contextuelle sur l'accueil avec titre, détail et raisons (chips).
- **Moteur de recommandation** basé sur les tâches, événements et connexions actives (GitHub + Notion, Spotify, etc.).

### Amélioré
- Bordereau PWA mis à jour vers `experience-v250`.

## [v249] - 2026-08-07

### Corrigé
- Effet pixelisé au survol des icônes du Dock : suppression du `drop-shadow` et utilisation d'une ombre portée propre sur la plaque.

### Amélioré
- Survol des icônes du Dock : léger soulèvement, agrandissement net et glow doux.
- Bordereau PWA mis à jour vers `experience-v249`.

## [v248] - 2026-08-07

### Ajouté
- **Redesign du Control Center du Dock** : panneaux groupés pour Animations, Ambiance, Pack sonore, Audio, Ambiance sonore et Focus Timer.
- **Interrupteurs à glissière** pour Aura néon et Sons d'interface.
- **Grilles de tuiles** pour Pack sonore et Focus Timer avec icônes.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v248`.

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

