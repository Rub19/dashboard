# Next.js Inventory

## 1. Top-Level Directories and Important Files

### Application Stack
- **Next.js 16.3.0** with App Router and static export (`output: "export"`, `distDir: "dist"`, `trailingSlash: true`)
- **React 19.2.8** with TypeScript
- **Tailwind CSS 4** with custom design tokens and V8 token imports
- **Framer Motion 13.1.0** for animations
- **Supabase JS 2.112.2** for auth
- **Iconify** with Lucide, Phosphor, Tabler, Heroicons, Radix icon sets

### Directory Structure
- **app/** - App Router pages (40+ route files)
- **components/** - React components (80+ .tsx files)
- **lib/** - Core libraries, API clients, auth, settings, i18n, brain, hooks
- **lib/hooks/** - Custom React hooks (40+ files)
- **lib/brain/** - Brain runtime, action registry, memory, preferences, providers, automation
- **public/** - Static assets (icons, manifest, sw.js, legacy)
- **scripts/** - Audit, a11y, responsive scripts
- **tests/** - Unit and E2E tests (Playwright, Jest)

### Important Files
- **next.config.ts** - Static export config
- **app/layout.tsx** - Root layout with providers, theme, service worker
- **lib/auth.ts** - Auth with OTP/Worker, passkey, OAuth, rate limiting
- **lib/api.ts** - Worker API client
- **lib/supabase.ts** - Supabase client
- **lib/settings.ts** - Settings/theming engine
- **lib/i18n.ts** - I18n runtime
- **public/sw.js** - Service worker cache

## 2. Pages/Routes

### Core Pages
- **/** - Dashboard home with live widgets, daily briefing, productivity metrics
- **/activity** - Activity journal/timeline
- **/brain** - AI assistant with context, memory, actions, providers
- **/calendar** - Calendar with month view, agenda, event composer
- **/files** - File browser with Google Drive, shares, drops
- **/connections** - Integration management, OAuth, diagnostics
- **/settings** - Theme, density, sounds, brain permissions, presets
- **/focus** - Focus timer / Pomodoro
- **/bills** - Bill/subscription tracking
- **/drop** - Public file drop page
- **/feature-fallback** - Fallback for unavailable features
- **/flows** - Flows / automations
- **/interactions** - Interactions heatmap
- **/macros** - Macros page
- **/matches** - Gaming match history
- **/notes** - Notes editor
- **/personas** - Personas management
- **/plugins/[id]** - Plugin detail pages (40+ static routes generated)
- **/plugins** - Marketplace listing
- **/rss** - RSS feed page
- **/scratchpad** - Scratchpad page
- **/spaces** - Spaces overview
- **/tasks** - Task management
- **/team** - Team management
- **/weather** - Weather page

### Auth / Entry Pages
- **/login** - Login/Register with OTP, passkeys, OAuth (Google, GitHub)
- **/password-recovery** - Password recovery
- **/reset-password** - Password reset
- **/profile-selection** - Profile selection/creation
- **/profile** - User public profile

### System Pages
- **/changelog** - Changelog
- **/security** - Security center (passkeys, devices, activity log)
- **/system** - System/Spaces & Flows
- **/share** - Public share page
- **/mail** - Mail client

## 3. Core Data/Models (ported from v8)

- **lib/navigation.ts** - Shared navigation catalog for rail/mobile nav
- **lib/workspaces.ts** - Workspace/presets model (Personal, Focus, Studio)
- **lib/integrations.ts** - Integration catalog with categories, auth status, official URLs
- **lib/home-model.ts** - Home model: greeting, recommendations, next tasks, today events, recent notes
- **lib/daily-briefing.ts** - Daily briefing signals (weather, music, GitHub, events, tasks, yesterday activity)
- **lib/lifecycle.ts** - Route/component lifecycle manager (mount/unmount/stats)
- **lib/document-metadata.ts** - Document title/description/OG/Twitter manager by context
- **lib/navigation-session.ts** - Scroll position capture/restore per route
- **lib/oauth.ts** - Public OAuth app Client IDs and `oauthClientId` helper
- **lib/brand-icons.ts** - Brand SVG markup catalog from v8
- **lib/date.ts** - `isExpired` / `isExpiringSoon` from `utils/date.mjs`
- **lib/format.ts** - `formatBytes` from `utils/format.mjs`
- **lib/download.ts** - `downloadJson` from `utils/download.mjs`

## 4. Reusable Components

### Shell / Layout
- **Sidebar** - Collapsible navigation rail
- **LiquidSidebar** - Animated sidebar
- **Dock** - macOS-style dock
- **DockControlCenter** - Dock extras
- **Header / SearchBar / ProfileDropdown / MobileNav**
- **NotificationCenter** - Notification history
- **MissionControl** - Spaces, apps, windows overview
- **BottomSheet** - Mobile bottom sheet
- **SidePanel / FloatingWindow / WindowRenderer** - Layer/window management

### UI Controls
- **CommandPalette / CommandPaletteProvider** - Universal command search
- **ContextMenu** - Right-click context menus
- **Tooltip** - Tooltip controller
- **KeyboardShortcuts / ShortcutsOverlay / ShortcutsProvider**
- **ToastProvider** - Toast notifications
- **Select / SelectMulti / Input / Textarea / FormField**
- **EmptyState / ErrorState / Skeleton / Loading**

### Visual / Motion
- **AmbientParticles / Spotlight** - Ambient effects
- **DepthEffect** - 3D tilt/glassmorphism
- **VisualHaptics** - Haptic-like visual feedback
- **PresenceIndicator / PresencePulse / PresenceProvider**
- **PageTransition** - View transitions
- **BrandMark** - ETHONE logo
- **Card3D** - 3D card effect

### Live / Dashboard
- **LiveWidgets** - Live data cards
- **LiveFreshness / LiveOverlay / LiveStats / LiveSettings**
- **BillsWidget / BillsCalendarWidget**
- **DailyBriefing** - Home briefing panel
- **BrainBriefingPanel / BrainContextPanel**
- **MailAdvancedPanel / MailAnalyticsPanel**
- **FilesAdminPanel**
- **FlowAutomations**
- **FocusIsland / FocusPopover / FocusProvider**
- **ConnectionDiagnostics / ConnectionInspector**
- **ProfileSync**

### V8 Compatibility
- **V8Breadcrumbs / V8StatusBar / V8WindowControls**

### Providers
- **AuthProvider, SettingsProvider, UIProvider, LayerProvider, WindowManagerProvider, PresenceProvider, ActivityJournalProvider, CommandPaletteProvider, ShortcutsProvider, ToastProvider, FocusProvider**

## 5. Hooks / Lib

### Core Libraries
- **api.ts** - Worker API client with fetch wrapper, bearer token, auth
- **auth.ts** - OTP Worker, passkeys, OAuth, rate limiter, signout
- **supabase.ts** - Supabase client, session, auth events
- **settings.ts** - Theme, accent, aura, density, font, radius, sound, brain preferences
- **i18n.ts** - I18n catalog and runtime
- **oauth.ts** - OAuth exchange, state management
- **rate-limiter.ts** - Rate limiting utility
- **plugins.ts** - Plugin catalog and marketplace
- **files.ts / notes.ts / calendar.ts / bills-manager.ts / interactions-heatmap.ts / focus-timer.ts / activity-journal.ts**
- **cloud-cache.ts, mail-cache.ts, media-upload.ts, clock-manager.ts, live-poll.ts, team-manager.ts** - services v8 portés
- **brain-context.ts, brain-memory.ts, lib/brain/* - Brain engine, memory, providers, automation
- **density-engine.ts, ambient-engine.ts, presence-engine.ts, preset-engine.ts, user-state.ts**
- **command-search.ts** - Command history, catalog, scoring
- **form-validation.ts** - Form validators

### Custom Hooks
- useActivityJournal, useAmbientEngine, useBrain, useBrainContext, useCalendarEvents, useCloudCache, useCloudFiles, useClock, useConnections, useDashboard, useDiscordLive, useDriveFiles, useDrops, useFocusTrap, useHaptics, useI18n, useItems, useLiveData, useLiveFetch, useLivePoll, useLocalStorage, useLolLive, useMail, useMailCache, useMediaQuery, useMediaUpload, useMinecraftLive, useNativeBehavior, useNotifications, useProfile, useProfiles, useProviderCredentials, usePublicProfile, useSecurity, useSelection, useShares, useTeam, useTeamManager, useTracker, useUserData, useUserState, useWorker, useZenMode

## 6. Integration/Connection Types (Plugins)

### Media
- Spotify, Plex, Jellyfin, Emby, YouTube, Twitch, Last.fm

### Social
- Discord, Reddit, Bluesky, Email

### Gaming
- Steam, Riot Games, Valorant, LoL, Minecraft, Tracker.gg, Apex Legends, Steam Achievements

### Productivity
- Google Calendar, Google Drive, Notion, Todoist, Linear, ClickUp, Jira, RSS, Weather

### Development
- GitHub, GitLab, Obsidian, VS Code

### Health
- Fitbit

### AI
- LM Studio, Ollama, OpenAI, Anthropic, Gemini, Groq

### Extras
- Bills

**Total**: 43 plugin routes.

## 7. Authentication Flows

- **Email/Password** - Supabase auth + rate limiting
- **OTP** - Worker-based `/api/auth/otp/send` and `/api/auth/otp/verify`
- **Passkeys** - WebAuthn via Worker
- **OAuth** - Google, GitHub via Supabase; Spotify, GitHub, Google Calendar/Drive, Notion, Todoist, YouTube, Reddit via Worker exchange
- **Password Recovery/Reset** - Supabase reset flows
- **Session** - Supabase session + Worker signout
- **Device management** - `/api/auth/devices`, trust/revoke

## 8. Widgets, Dashboard Layout, UI Features

### Dashboard Layout
- **Shell** - layout.tsx with Sidebar, Dock, Header
- **Sidebar** - LiquidSidebar with route states, badges, tooltips
- **Dock** - App icons with Mission Control / Control Center
- **Header** - Search, profile, notifications
- **Mission Control** - Spaces overview

### Widgets
- **LiveWidgets** - Live cards for Spotify, Discord, Weather, Steam, GitHub, Google Calendar, Notion, Todoist, Valorant, LoL, Twitch, Last.fm, Tracker, Google Drive, YouTube, Reddit, Bills
- **BillsCalendarWidget / BillsWidget**
- **DailyBriefing**

### Brain
- **Chat**, **Context**, **Memory**, **Actions**, **Automations**, **Providers**, **Preferences**, **Diagnostics**

### Mail
- **Inbox, Starred, Sent, Drafts, Archive, Spam, Trash, Search, Compose, Analytics**

### Files
- **Google Drive sync, folder navigation, shares, drops, bulk actions, admin panel**

### Settings
- **Theme (16 modes), Accent (8), Aura (6), Font (7 families), Radius (3), Density (10 modes), Sound (9 packs), Wallpapers, Brain permissions, Presets, Shortcuts**

### Notifications
- **NotificationCenter with categories, priorities, realtime via IndexedDB/Supabase**

### Command Palette
- **CommandPalette, keyboard shortcuts, context-aware search**

## 9. Theming, Localization, Design Tokens, Animations, Storage

### Theming
- 16 theme modes
- 10 density modes
- 8 accent colors
- 6 aura palettes
- 7 font families
- 3 radius styles
- 9 sound packs

### Localization
- 4 locales: fr, en, es, de
- I18n extras for form validation

### Design Tokens
- Tailwind theme v4 with CSS custom properties
- V8 token compatibility in globals.css
- Background, surface, border, text, accent, ambient tokens

### Animations
- Framer Motion transitions
- Spotlight / AmbientParticles
- DepthEffect 3D tilt
- Page transitions
- PresencePulse
- Equalizer visualizer

### Storage/Persistence
- **localStorage** - UI state, command history, settings cache
- **IndexedDB** - Service worker cache
- **Supabase** - Profiles, notes, tasks, calendar, files, cloud state
- **Service Worker** - PWA, offline.html, sw.js

## 10. External API/Worker Usage

### Worker API
- **Base URL** - `https://raspy-fog-bf5b.rub19-mailpro.workers.dev`
- Client in `lib/api.ts` with bearer token attachment

### Worker Endpoints Used
- `/health`
- `/api/auth/otp/send`, `/api/auth/otp/verify`
- `/api/auth/passkey/*`
- `/api/auth/devices`, `/api/auth/device/trust`, etc.
- `/api/signout`
- `/api/steam/*`, `/api/tracker/*`, `/api/twitch/*`, `/api/lastfm/*`, `/api/lanyard/presence`, `/api/now-playing`, `/api/weather`, `/api/minecraft/profile`
- `/api/spotify/*`, `/api/github/*`, `/api/google-calendar/*`, `/api/google-drive/*`, `/api/notion/*`, `/api/todoist/*`, `/api/youtube/*`, `/api/reddit/*`
- `/api/cloud/*` (files, shares, drops, activity, dashboard)
- `/api/mail/*`, `/api/brain/complete`, `/api/supabase/public-profile`, `/api/rss`, `/api/diagnostic`

### Supabase
- Auth, profiles, settings, mail, files, notes, tasks, realtime

## 11. Assets

- **Logos** - `public/icons/ethone-*.png/svg`
- **Icons** - Iconify/Lucide/Phosphor sets
- **Brand icons** - V8 brand icon data
- **Manifest** - `public/manifest.json`
- **Service worker** - `public/sw.js`
- **PWA** - offline.html, .nojekyll, CNAME

---

**Summary Statistics:**
- **App routes**: 38+
- **Components**: 80+ .tsx
- **Hooks**: 40+
- **Lib files**: 60+
- **Plugins**: 43
- **Locales**: 4
- **Theme modes**: 16
- **Worker endpoints used**: 50+
