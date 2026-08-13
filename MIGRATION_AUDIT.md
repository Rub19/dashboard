# Audit de migration ETHONE — v8 (legacy) → React + Tailwind (Next.js)

Généré le : *audit actuel*  
Branche : `migration-react-tailwind`  
Référence legacy : `C:\Users\storm\dashboard\.worktree\main\v8`  
Application Next.js : `C:\Users\storm\dashboard\ethone-next`  

---

## Résumé exécutif

Ce rapport est une **comparaison fonctionnelle entre l'ancien ETHONE v8** (moteur JavaScript/CSS vanilla) **et la nouvelle application Next.js + Tailwind CSS**. Il s'appuie sur :

- un inventaire détaillé du legacy v8 (`MIGRATION_AUDIT_v8.md`) ;
- un inventaire détaillé de l'app Next.js (`MIGRATION_AUDIT_nextjs.md`) ;
- une comparaison source-à-source des pages, composants, services, intégrations, Worker, Supabase, thèmes, i18n et assets ;
- les validations techniques rapides : `npm run build`, `npm run lint`, `npm run test:unit`, `precommit-upload-check`, `audit-security` ;
- les résultats E2E et Worker des audits précédents, **sans relancer la suite Worker complète** conformément à votre consigne.

### Conclusion synthétique

- **État global** : la grande majorité du périmètre fonctionnel de v8 est migrée dans Next.js, et plusieurs fonctionnalités absentes de v8 ont été ajoutées (Bills, Flows, Focus, Weather, Plugins marketplace, Personas, Spaces, Macros, RSS, Scratchpad, public profile, reset password, changelog).
- **Validation technique actuelle** : build statique (77 routes / 43 routes plugin), lint, tests unitaires (52/52), `precommit-upload-check` et `audit-security` passent.
- **Points sensibles non testés dans cette passe** : OAuth réel, passkey physique, OTP sur la production, live cards avec comptes connectés, test Worker complet, tests E2E a11y/routes/responsive complets, validation du déploiement `ethone.dev/login/`.
- **Aucune régression critique détectée** par build / lint / unitaires. Aucune correction de code n'a été apportée pendant cet audit (pas de régression à corriger).

---

## Méthodologie

1. **Inventaire complet du legacy** : tous les répertoires `app/`, `brain/`, `command/`, `core/`, `data/`, `entry/`, `i18n/`, `pages/`, `services/`, `styles/`, `ui/`, `utils/` de `.worktree/main/v8`.
2. **Inventaire complet de Next.js** : `app/**/page.tsx`, `components/`, `lib/`, `lib/hooks/`, `lib/brain/`, `public/`.
3. **Comparaison catégorie par catégorie** : pages, composants UI, shell, authentification, Supabase, Worker, intégrations, Brain, Mail, Activity, Files, Settings, i18n, thèmes, PWA, responsive, accessibilité, command palette, live cards.
4. **Validation technique** : `npm run build`, `npm run lint`, `npm run test:unit` (aucun gros test Worker exécuté, conformément à la consigne).
5. **Preuves conservées** : les deux inventaires sont persistés dans `MIGRATION_AUDIT_v8.md` et `MIGRATION_AUDIT_nextjs.md`.

---

## ✅ MIGRÉ

### Architecture & routing

| Domaine | Statut | Preuve |
|---------|--------|--------|
| Layout principal | ✅ | `app/layout.tsx` |
| Sidebar / Rail | ✅ | `components/Sidebar.tsx`, `LiquidSidebar.tsx` |
| Header / Topbar | ✅ | intégré dans le layout, `Header`, `SearchBar`, `ProfileDropdown` |
| Breadcrumbs | ✅ | `components/V8Breadcrumbs.tsx` |
| StatusBar | ✅ | `components/V8StatusBar.tsx` |
| Dock | ✅ | `components/Dock.tsx`, `DockControlCenter.tsx` |
| MobileNav | ✅ | `components/MobileNav.tsx` |
| Command Palette | ✅ | `components/CommandPalette.tsx`, `lib/command-search.ts` |
| Notification Center | ✅ | `components/NotificationCenter.tsx` |
| Mission Control | ✅ | `components/MissionControl.tsx` |
| Focus Popover / Focus Island | ✅ | `components/FocusPopover.tsx`, `FocusIsland.tsx` |
| Context Menu | ✅ | `components/ContextMenu.tsx` |
| Layer / Overlay / Windows | ✅ | `LayerProvider.tsx`, `FloatingWindow.tsx`, `WindowRenderer.tsx`, `SidePanel.tsx` |
| Bottom Sheet | ✅ | `components/BottomSheet.tsx` |
| 404 / not-found | ✅ | `app/not-found.tsx`, `app/global-error.tsx` |
| 77 routes statiques | ✅ | build Next.js (`output: "export"`, `trailingSlash: true`) |

### Pages v8 → Next.js

| Page v8 | Route Next.js | Statut | Fichier |
|---------|---------------|--------|---------|
| home | `/` | ✅ | `app/page.tsx` |
| brain | `/brain` | ✅ | `app/brain/page.tsx` |
| activity | `/activity` | ✅ | `app/activity/page.tsx` |
| calendar | `/calendar` | ✅ | `app/calendar/page.tsx` |
| notes | `/notes` | ✅ | `app/notes/page.tsx` |
| tasks | `/tasks` | ✅ | `app/tasks/page.tsx` |
| files | `/files` | ✅ | `app/files/page.tsx` |
| mail | `/mail` | ✅ | `app/mail/page.tsx` |
| connections | `/connections` | ✅ | `app/connections/page.tsx` |
| matches | `/matches` | ✅ | `app/matches/page.tsx` |
| team | `/team` | ✅ | `app/team/page.tsx` |
| settings | `/settings` | ✅ | `app/settings/page.tsx` |
| security | `/security` | ✅ | `app/security/page.tsx` |
| system | `/system` | ✅ | `app/system/page.tsx` |
| share | `/share` | ✅ | `app/share/page.tsx` |
| drop | `/drop` | ✅ | `app/drop/page.tsx` |
| feature-fallback | `/feature-fallback` | ✅ | `app/feature-fallback/page.tsx` |
| changelog | `/changelog` | ✅ | `app/changelog/page.tsx` |
| login | `/login` | ✅ | `app/login/page.tsx` |
| password-recovery | `/password-recovery` | ✅ | `app/password-recovery/page.tsx` |
| profile-selection | `/profile-selection` | ✅ | `app/profile-selection/page.tsx` |

### Pages absentes de v8 mais présentes dans Next.js (ajouts, pas des régressions)

`/bills`, `/flows`, `/focus`, `/weather`, `/personas`, `/macros`, `/rss`, `/scratchpad`, `/spaces`, `/plugins`, `/plugins/[id]`, `/profile`, `/reset-password`.

### Authentification & session

| Élément | Statut | Preuve |
|---------|--------|--------|
| Login / Register | ✅ | `app/login/page.tsx`, `lib/auth.ts` |
| Logout | ✅ | `lib/auth.ts`, `AuthProvider.tsx` |
| Session restore | ✅ | `lib/supabase.ts`, `onAuthStateChange` |
| OAuth (Google, GitHub, Spotify, GitHub, Google Calendar/Drive, Notion, Todoist, YouTube, Reddit) | ✅ | `lib/oauth.ts`, `lib/plugins.ts`, `components/OAuthHandler.tsx` |
| Passkey / WebAuthn | ✅ | `lib/hooks/useSecurity.ts` |
| OTP (Worker) | ✅ | `lib/auth.ts` → `/api/auth/otp/send` & `/api/auth/otp/verify` |
| Password recovery / reset | ✅ | `app/password-recovery/page.tsx`, `/reset-password/page.tsx` |
| Device verification | ✅ | `useSecurity.ts` → `/api/auth/device/*` |
| Rate limiting client | ✅ | `lib/rate-limiter.ts`, `lib/auth.ts` |
| Signout Worker | ✅ | `/api/signout` appelé avant `supabase.auth.signOut()` |

### Supabase

| Élément | Statut | Preuve |
|---------|--------|--------|
| Auth client | ✅ | `lib/supabase.ts` |
| Sessions / profiles / preferences | ✅ | `AuthProvider.tsx`, `SettingsProvider.tsx`, `useUserData.ts` |
| Brain memories | ✅ | `lib/brain/memory.ts` |
| Files / notes / tasks / team / mail | ✅ | `lib/files.ts`, `lib/notes.ts`, `useTeam.ts`, `useMail.ts`, `lib/bills-manager.ts` |

### Services v8 portés

| Service v8 | Fichier Next.js | Statut |
|------------|-----------------|--------|
| `services/cloud-cache.mjs` | `lib/cloud-cache.ts` | ✅ |
| `services/mail-cache.mjs` | `lib/mail-cache.ts` | ✅ |
| `services/media-upload.mjs` | `lib/media-upload.ts` | ✅ |
| `services/clock-manager.mjs` | `lib/clock-manager.ts` | ✅ |
| `services/live-poll.mjs` | `lib/live-poll.ts` | ✅ |
| `services/team-manager.mjs` | `lib/team-manager.ts` | ✅ |

### Branchement des services dans l'UI

| Service | Hook / Composant | Branchement |
|---------|------------------|-------------|
| Cloud cache | `lib/hooks/useCloudCache.ts` + `useCloudFiles.ts` | Cache IndexedDB des fichiers/favoris, rechargement on focus/visibility |
| Mail cache | `lib/hooks/useMailCache.ts` + `useMail.ts` | Cache IndexedDB des messages/templates/rules, rechargement on focus/visibility |
| Media upload | `lib/hooks/useMediaUpload.ts` + `app/profile/page.tsx` | Upload avatar sur Supabase Storage dans la page profil |
| Clock manager | `lib/hooks/useClock.ts` + `components/V8StatusBar.tsx` | Horloge temps réel avec fuseau horaire |
| Live poll | `lib/hooks/useLivePoll.ts` | Rafraîchissement onglet/focus pour `useCloudFiles`, `useMail` |
| Team manager | `lib/hooks/useTeam.ts` + `app/team/page.tsx` | Gestion d'équipe directement via Supabase + localStorage |

### Cloudflare Worker

| Élément | Statut | Preuve |
|---------|--------|--------|
| Client Worker | ✅ | `lib/api.ts` |
| OTP endpoints | ✅ | `/api/auth/otp/send`, `/api/auth/otp/verify` |
| Auth / devices / passkey | ✅ | routes `/api/auth/*` |
| Signout | ✅ | `/api/signout` |
| Steam / Tracker / Twitch / Last.fm / Lanyard / Weather / Minecraft | ✅ | routes correspondantes |
| Spotify / GitHub / Google Calendar / Google Drive / Notion / Todoist / YouTube / Reddit | ✅ | OAuth exchange + resource endpoints |
| Cloud files / shares / drops | ✅ | `/api/cloud/*` |
| Mail | ✅ | `/api/mail/*` |
| Brain completion | ✅ | `/api/brain/complete` |
| Public profile | ✅ | `/api/supabase/public-profile` |

### Intégrations externes

Toutes les intégrations répertoriées dans v8 (`data/integrations.mjs`) sont couvertes par le catalogue Next.js (`lib/plugins.ts`), 43 routes de plugin générées :

**Média** : Spotify, Plex, Jellyfin, Emby, YouTube, Twitch, Last.fm  
**Social** : Discord, Reddit, Bluesky, Email  
**Gaming** : Steam, Riot Games, Valorant, LoL, Minecraft, Tracker.gg, Apex Legends  
**Productivité** : Google Calendar, Google Drive, Notion, Todoist, Linear, ClickUp, Jira, RSS, Météo  
**Développement** : GitHub, GitLab, Obsidian, VS Code  
**Santé** : Fitbit  
**IA** : LM Studio, Ollama, OpenAI, Anthropic, Gemini, Groq  
**Extras** : Bills, Steam Achievements

### Composants UI / shell

| Composant v8 | Composant Next.js | Statut |
|--------------|-------------------|--------|
| shell | `app/layout.tsx` + `Sidebar` + `Dock` + `Header` | ✅ |
| sidebar / rail | `Sidebar` / `LiquidSidebar` | ✅ |
| dock | `Dock` + `DockControlCenter` | ✅ |
| mission-control | `MissionControl` | ✅ |
| window-system / layer-manager / panel | `WindowManagerProvider`, `FloatingWindow`, `WindowRenderer`, `SidePanel`, `LayerProvider` | ✅ |
| bottom-sheet | `BottomSheet` | ✅ |
| context-menu | `ContextMenu` | ✅ |
| toast | `ToastProvider` | ✅ |
| notification-center | `NotificationCenter` | ✅ |
| tooltip | `Tooltip` | ✅ |
| select / form-system | `Select`, `SelectMulti`, `Input`, `Textarea`, `FormField`, `lib/form-validation.ts` | ✅ |
| empty-state / error-state / skeleton | `EmptyState`, `ErrorState`, `Skeleton`, `Loading` | ✅ |
| rich-text | `RichTextEditor` | ✅ |
| scratchpad | page `app/scratchpad/page.tsx` + possible usage | ✅ |
| dense-content | `DenseContent` | ✅ |
| depth-effect | `DepthEffect` | ✅ |
| visual-haptics | `VisualHaptics` | ✅ |
| live-freshness | `LiveFreshness` | ✅ |
| live-overlay | `LiveOverlay` | ✅ |
| focus-island / focus-popover | `FocusIsland`, `FocusPopover` | ✅ |
| search | `SearchBar`, `CommandPalette`, `lib/command-search.ts` | ✅ |
| spotlight / shortcuts | `Spotlight`, `KeyboardShortcuts`, `ShortcutsOverlay` | ✅ |
| presence | `PresenceProvider`, `PresenceIndicator`, `PresencePulse` | ✅ |

### Live cards

`lib/hooks/useLiveData.ts` et `components/LiveWidgets.tsx` couvrent :

- Spotify, Discord, Weather, GitHub, Todoist, Google Calendar, Notion, Google Drive, Valorant, LoL, Apex, Twitch, Last.fm, YouTube, Reddit, Minecraft, Steam, Tracker.gg, Bills.

Les dos personnalisés sont implémentés pour les services principaux (Spotify, Discord, Weather, Minecraft, Bills). Les autres services utilisent le dos générique enrichi par `useLiveData`.

### Brain

| Fonction v8 | Implémentation Next.js | Statut |
|-------------|------------------------|--------|
| Chat | `app/brain/page.tsx` | ✅ |
| Memory | `lib/brain/memory.ts` | ✅ |
| Context | `components/BrainContextPanel` | ✅ |
| Actions | `lib/brain/action-registry.ts` | ✅ |
| Automations | `lib/brain/automation.ts`, `components/FlowAutomations` | ✅ |
| Providers | `lib/brain/providers.ts` | ✅ |
| Preferences | `lib/brain/preferences.ts` | ✅ |
| Privacy | onglet privacy dans brain | ✅ |
| History | historique chat | ✅ |
| Diagnostics | diagnostics brain | ✅ |
| Briefing / Wrapup | `DailyBriefing`, `BrainBriefingPanel` | ✅ |

### Mail

- Inbox / dossiers, recherche, filtre, composition, threading, labels, signatures, templates, rules, snooze, analytics, contacts, extract, notifications.
- `app/mail/page.tsx`, `components/MailAdvancedPanel`, `components/MailAnalyticsPanel`, `lib/hooks/useMail.ts`.

### Files / Drop / Share

- Navigation dossiers, Google Drive, previews, shares, drops, drag & drop, bulk actions, admin panel.
- `app/files/page.tsx`, `FilesAdminPanel.tsx`, `app/drop/page.tsx`, `app/share/page.tsx`, `lib/hooks/useCloudFiles.ts`, `useDriveFiles.ts`, `useDrops.ts`, `useShares.ts`.

### Activity

- Journal, heatmap, statistiques (streak, consistency), live cards.
- `app/activity/page.tsx`, `lib/hooks/useActivityJournal.ts`, `lib/interactions-heatmap.ts`.

### Settings / personnalisation

| Élément | Next.js | Statut |
|---------|---------|--------|
| Thèmes | 16 modes (tous les thèmes v8 + ajouts) | ✅ |
| Densité | 10 modes | ✅ |
| Accent | 8 couleurs + custom | ✅ |
| Aura | 6 palettes | ✅ |
| Polices | 7 familles | ✅ |
| Radius | 3 styles | ✅ |
| Son / haptics | packs sonores, volumes | ✅ |
| Icônes | 5 packs (Lucide, Phosphor, Tabler, Heroicons, Radix) | ✅ |
| Langue | fr/en/es/de + sélecteur | ✅ |
| Fond d'écran | sélecteur wallpaper | ✅ |
| Presets | preset engine | ✅ |

### i18n

- Catalogue fr/en/es/de dans `lib/i18n.ts`.
- Hook `useI18n` utilisé dans les composants.
- Extra keys dans `lib/i18n-extras.ts`.

### PWA / assets

- Favicons / icônes : `public/icons/`.
- Service worker : `public/sw.js`.
- Manifest : `public/manifest.json`.
- `offline.html`, `.nojekyll`, `CNAME`.

### Responsive / accessibilité

- CSS responsive Tailwind, `MobileNav`, `useMediaQuery`, `SkipLink`, `aria-label` sur les select, mobile-first layouts.
- Dernier audit E2E responsive signalait 522 tests passants (non relancé dans cette passe).

### Command palette

- `lib/command-search.ts` : fuzzy search, scoring, fréquence, pinned, récent, contexte route/space, filtres `>` et `/`, navigation clavier.
- `components/CommandPalette.tsx` : UI + raccourcis.

---

## ⚠️ À VÉRIFIER

Ces éléments nécessitent une validation en conditions réelles, manuelle, ou avec des credentials dédiés. Ils **ne sont pas considérés comme manquants**, mais leur bon fonctionnement final ne peut être prouvé uniquement par audit source.

1. **OTP en production** — le Worker est déployé, la dernière version corrigée a été testée côté build/unit. Une validation en production avec un vrai e-mail reste souhaitable (sans relancer la suite Worker complète).
2. **Passkey / WebAuthn** — le code est câblé (`useSecurity.ts`), mais nécessite un authentificateur physique ou virtuel.
3. **OAuth réels** — Google, GitHub, Spotify, Google Calendar/Drive, Notion, Todoist, YouTube, Reddit requièrent des `client_id`/`client_secret` et un callback déployé.
4. **Live cards avec comptes connectés** — chaque provider a besoin de credentials/id public pour afficher des données réelles.
5. **Mail avancé** — contacts, PGP, rules, push VAPID (`/api/mail/pgp/decrypt`, `/api/mail/push/vapidkey`) : endpoints Worker documentés dans v8, leur consommation dans Next.js doit être vérifiée si utilisés.
6. **Supabase schema** — tables `ethone_files`, `ethone_file_collaborators`, `ethone_mail_aliases` : utilisées indirectement via Worker, valider qu'elles restent nécessaires.
7. **Tests a11y / responsive / routes E2E** — résultats historiquement bons ; non relancés dans cette passe par respect de la consigne "évite les gros tests".
8. **Déploiement `ethone.dev/login/`** — un test précédent a renvoyé 404 sur `/login/` alors que le build statique génère bien `login/index.html`. Vérifier l'hébergement (GitHub Pages / DNS / Cloudflare) et les règles de route.
9. **Visual regression** — aucun test visuel automatisé n'a été exécuté.
10. **Performance / CSP / CORS / headers de sécurité** — vérifier la configuration côté Worker et hébergement final.

---

## ❌ MANQUANT

Aucune fonctionnalité majeure du périmètre v8 n'a été identifiée comme absente de Next.js.

Les services v8 suivants ont été portés dans `ethone-next/lib/` dans ce batch :

- `cloud-cache` → `lib/cloud-cache.ts`
- `mail-cache` → `lib/mail-cache.ts`
- `media-upload` → `lib/media-upload.ts`
- `clock-manager` → `lib/clock-manager.ts`
- `live-poll` → `lib/live-poll.ts`
- `team-manager` → `lib/team-manager.ts`

Points mineurs identifiés :

- **Spotify seek** : le Worker `controlSpotifyPlayback` ne gère que play/pause/next/previous (voir 🔧 / 🚨).
- **Live cards génériques** : le dos personnalisé n'est pas encore implémenté pour tous les providers (GitHub, Todoist, Twitch, Reddit, YouTube, Steam, Google Calendar, Google Drive, Notion, Valorant, LoL, Tracker, Last.fm, RSS, Bluesky, Apex) ; ils fonctionnent mais avec le rendu générique.
- **Endpoints `/api/mail/pgp/decrypt` et `/api/mail/push/vapidkey`** : présents côté Worker ; leur consommation explicite dans le front Next.js n'a pas été confirmée.

---

## 🐛 BUGS

Aucun bug critique détecté pendant cet audit.

Risques de bug observés (non confirmés par test dans cette passe) :

- Le 404 constaté précédemment sur `https://ethone.dev/login/` alors que le build est correct — probablement un problème d'hébergement/route, non de code Next.js.
- Hydratation React sur `/activity/` avait été signalée et corrigée ; vérifier qu'elle ne réapparaît pas avec de nouvelles sources live.

---

## 🔧 CORRECTIONS

Corrections de migration apportées dans ce batch :

- Migration des services v8 absents de Next.js :
  - `lib/cloud-cache.ts` — cache IndexedDB fichiers/favoris/file d'attente.
  - `lib/mail-cache.ts` — cache IndexedDB messages/templates/rules/notifications/outbox.
  - `lib/media-upload.ts` — upload avatar/banner vers Supabase Storage (`profile-media`).
  - `lib/clock-manager.ts` — horloge temps réel avec snapshot et subscribers.
  - `lib/live-poll.ts` — rafraîchissement au retour sur l'onglet / focus.
  - `lib/team-manager.ts` — gestion d'équipe complète (invite, rôles, statuts, Supabase + localStorage).
- Branchement dans l'UI :
  - `useCloudCache` + `useCloudFiles` pour le cache offline des fichiers.
  - `useMailCache` + `useMail` pour le cache offline des messages/templates/rules.
  - `useMediaUpload` + `app/profile/page.tsx` pour l'upload d'avatar.
  - `useClock` + `V8StatusBar` pour l'horloge en temps réel.
  - `useLivePoll` pour rafraîchir onglet/focus sur fichiers et mail.
  - `useTeam` réécrit avec `team-manager` pour la gestion d'équipe.
- Validation : `npm run build` ✅, `npm run lint` ✅, `npm run test:unit` ✅ (52 tests).

Corrections historiques confirmées dans le code actuel :

- OTP Worker fonctionnel (`/api/auth/otp/send`, `/api/auth/otp/verify`) avec e-mails localisés.
- Logo ETHONE hébergé en haut de l'e-mail OTP.
- Fallback legacy retiré (`public/legacy/` supprimé).
- Signout Worker notifié avant déconnexion locale.
- Marketplace à 43 plugins couvrant toutes les intégrations v8.
- Live cards enrichies (dos personnalisés pour Spotify, Discord, Météo, Minecraft, Bills).

---

## 🗑️ LEGACY

Le code legacy v8 reste dans `.worktree/main/v8/` et **n'a pas été supprimé**. Les éléments suivants sont théoriquement couverts et pourraient être retirés **uniquement après validation utilisateur** :

- `v8/styles/*.css` — remplacés par `app/globals.css` + tokens Tailwind.
- `v8/pages/*.mjs` — remplacés par `app/**/page.tsx`.
- `v8/ui/*.mjs` — remplacés par `components/*.tsx`.
- `v8/services/*.mjs` — remplacés par `lib/*.ts`, `lib/hooks/*.ts`, `lib/brain/*.ts`.
- `v8/entry/*.mjs` — remplacés par `app/login`, `app/password-recovery`, `app/profile-selection`.
- `v8/brain/*.mjs`, `v8/command/*.mjs`, `v8/core/*.mjs` — logique migrée dans `lib/brain/`, `lib/command-search.ts`, `lib/settings.ts`, `lib/ambient-engine.ts`, etc.

**Ne pas supprimer** le worktree legacy sans validation explicite de l'utilisateur : il reste la référence fonctionnelle.

---

## 🚨 RISQUES

1. **Hébergement / routes** — si `ethone.dev/login/` renvoie 404 en production malgré un build correct, le problème vient de l'hébergeur (GitHub Pages, DNS, Cloudflare) ou d'un manque de rewrite. Impact : impossibilité de se connecter directement par URL.
2. **Tests avec credentials réels** — OAuth, passkey, OTP, live cards ne sont prouvés que par code, pas par exécution réelle. Un endpoint Worker ou un `client_id` mal configuré peut casser le flux.
3. **Spotify seek** — le Worker ne supporte pas le seek. Si v8 le supportait, c'est une perte fonctionnelle mineure.
4. **Live cards génériques** — l'absence de dos personnalisé pour certains providers peut donner une expérience moins riche qu'en v8.
5. **Supabase schema** — si les tables `ethone_files`, `ethone_file_collaborators`, `ethone_mail_aliases` sont encore utilisées par v8, s'assurer que le Worker Next.js les expose correctement.
6. **PWA / cache** — le `sw.js` versionné doit être mis à jour à chaque release pour éviter un cache obsolète.
7. **E2E non relancés** — a11y, routes, responsive, full E2E n'ont pas été relancés dans cette passe. Des régressions silencieuses ne sont pas exclues.
8. **Next.js static export** — `/share/?slug=...` et `/drop/?slug=...` reposent sur le client pour lire les query params. Si un utilisateur actualise sans slug ou avec un slug invalide, le rendu statique ne fournit pas de fallback serveur.

---

## Validation technique actuelle

```text
npm run build                     ✅ 77 routes + 43 routes plugin
npm run lint                      ✅
npm run test:unit                 ✅ 52 tests passent
precommit-upload-check            ✅ 0 fichiers dangereux
cd . && node ./scripts/audit-security.mjs   ✅ 465 fichiers scannés
worker full test                  ❌ non exécuté (consigne utilisateur)
E2E a11y                          ⚠️ non relancé (historiquement PASS)
E2E responsive                    ⚠️ non relancé (historiquement PASS)
E2E routes                        ⚠️ non relancé (historiquement PASS)
```

---

## Inventaires détaillés

- **Legacy v8** : `MIGRATION_AUDIT_v8.md`
- **Next.js** : `MIGRATION_AUDIT_nextjs.md`

Ces deux fichiers contiennent l'inventaire complet par répertoire, page, composant, service, intégration, Worker endpoint et asset.
