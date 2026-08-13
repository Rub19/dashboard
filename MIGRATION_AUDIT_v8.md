# v8 Inventory

## 1. Top-Level Directories and Important Files

### Directory Structure
- **app/** - Application runtime and mounting logic
- **brain/** - AI/Brain system (context engine, memory, actions, providers)
- **command/** - Command palette, catalog, search, history
- **core/** - Core systems (actions, automation, density, experience, lifecycle, navigation, preferences, presence, presets, router, store, style-loader, theme-engine)
- **data/** - Data models and configurations (activity-journal, brand-icons, changelog, daily-briefing, home-model, integrations, navigation, oauth-app-config, presets, profile-repository, workspaces)
- **entry/** - Entry flows (entry-coordinator, login, password-recovery, profile-selection)
- **i18n/** - Internationalization (catalog, runtime)
- **pages/** - Page components (activity, activity-style, brain, calendar, calendar-model, connections, connections-model, drop, feature-fallback, files, files-model, home, interactions, mail, matches, notes, notes-model, security, settings, share, system, tasks, tasks-model, team)
- **services/** - External services and integrations (auth-adapter, auth-storage, bills-manager, clock-manager, cloud-cache, discord-live, drive-client, external-diagnostics, external-services-client, external-services-config, focus-timer, github-live, github-oauth, google-calendar-live, google-calendar-oauth, google-drive-live, google-drive-oauth, interactions-heatmap, lastfm-live, live-poll, lol-live, mail-cache, media-upload, minecraft-live, network-client, notion-live, notion-oauth, oauth-callback, provider-credentials, public-auth-config, rate-limiter, reddit-live, reddit-oauth, security-identity, service-worker, sound-manager, spotify-live, spotify-oauth, spotify-oauth-live, steam-live, supabase-state-sync, team-manager, todoist-live, todoist-oauth, tracker-live, twitch-live, valorant-live, weather-live, youtube-live, youtube-oauth)
- **styles/** - CSS stylesheets (activity, base, bills, components, depth, entry, interactions, mail, mobile-ux, presence, share-drop, shell, team, tokens, workspaces)
- **ui/** - UI components (bills-widget, bottom-sheet, context-menu, dense-content, depth-effect, discord-live, dock, dom, empty-state, error-state, focus-island, focus-popover, form-system, github-live, google-calendar-live, google-drive-live, icons, lastfm-live, layer-manager, live-freshness, live-overlay, lol-live, minecraft-live, mission-control, native-behavior, navigation, notification-center, notion-live, panel, reddit-live, rich-text, scratchpad, select, shell, shortcuts-overlay, skeleton, spotify-live, steam-live, toast, todoist-live, tooltip, touch-interactions, tracker-live, twitch-live, valorant-live, visual-haptics, weather-detail, weather-live, window-system, youtube-live)
- **utils/** - Utility functions (date, download, format)

### Important Files
- **main.mjs** - Application entry point and boot sequence
- **app/app-runtime.mjs** - Main application runtime with page mounting
- **core/store.mjs** - State management and persistence
- **core/router.mjs** - Routing system
- **services/public-auth-config.mjs** - Supabase configuration
- **services/external-services-config.mjs** - Worker API configuration

## 2. Pages/Routes

### Core Pages
- **home.mjs** - Dashboard home with live widgets, daily briefing, productivity metrics, session modes, aura themes
- **brain.mjs** - AI assistant with chat, context, memory, actions, automations, providers, privacy, history, diagnostics, wrap-up
- **activity.mjs** - Activity hub with timeline, live cards, filters (today, week, gaming, development, work, study, productivity, media, social, brain)
- **notes.mjs** - Notes editor with rich text, search, sorting, cloud sync
- **tasks.mjs** - Task management with filters, priorities, bulk actions, list/board views
- **calendar.mjs** - Calendar with month view, agenda, event composer, bills widget
- **files.mjs** - File browser with Google Drive integration, folder navigation, preview, shares, drops
- **connections.mjs** - Integration management with OAuth setup, diagnostics, connection inspector
- **settings.mjs** - Settings for theme, density, sounds, brain permissions, presets, accessibility, shortcuts
- **mail.mjs** - Email client with folders, search, analytics
- **team.mjs** - Team management with members, roles, invitations
- **interactions.mjs** - Interactions heatmap and engagement statistics
- **share.mjs** - Public file sharing page
- **drop.mjs** - Public file drop page
- **matches.mjs** - Gaming match history (Valorant, Apex Legends, League of Legends)
- **security.mjs** - Security center with devices, passkeys, activity log
- **system.mjs** - System pages for Spaces and Flows
- **feature-fallback.mjs** - Fallback page for unavailable features

### Entry Pages
- **login.mjs** - Login/register with OAuth (Google, GitHub), passkeys, OTP, password strength
- **password-recovery.mjs** - Password recovery flow
- **profile-selection.mjs** - Profile selection and creation

## 3. Reusable UI Components

### Core UI Components
- **dom.mjs** - DOM utilities (element, icon, brandIcon, actionButton, debounce, throttleFrame, attachFlipBehavior, attachTypeToSelect)
- **form-system.mjs** - Form validation, field management, password controls
- **empty-state.mjs** - Empty state and status state components
- **error-state.mjs** - Error state component
- **skeleton.mjs** - Skeleton loading states
- **select.mjs** - Custom select component
- **panel.mjs** - Panel manager
- **bottom-sheet.mjs** - Bottom sheet modal
- **context-menu.mjs** - Context menu
- **toast.mjs** - Toast notification manager
- **notification-center.mjs** - Notification center with history, categories, priorities
- **window-system.mjs** - Window/layer management system
- **layer-manager.mjs** - Layer management for modals and overlays
- **dock.mjs** - Dock component with app icons, reordering, scaling
- **navigation.mjs** - Navigation rail and mobile navigation
- **shell.mjs** - Main shell layout with sidebar, header, dock
- **mission-control.mjs** - Mission Control (Spaces, apps, windows overview)
- **focus-island.mjs** - Focus timer dynamic island
- **focus-popover.mjs** - Focus popover
- **shortcuts-overlay.mjs** - Keyboard shortcuts overlay
- **scratchpad.mjs** - Scratchpad component
- **rich-text.mjs** - Rich text editor
- **icons.mjs** - Icon system with Lucide icons
- **depth-effect.mjs** - Depth/glassmorphism effects
- **dense-content.mjs** - Density controls, bulk actions, selection, row menus
- **live-freshness.mjs** - Live freshness indicators
- **live-overlay.mjs** - Live overlay components
- **native-behavior.mjs** - Native behavior handling
- **touch-interactions.mjs** - Touch interaction management
- **tooltip.mjs** - Tooltip controller
- **visual-haptics.mjs** - Visual haptics feedback

### Live Widget Components
- **spotify-live.mjs** - Spotify now playing card
- **discord-live.mjs** - Discord presence card
- **weather-live.mjs** - Weather card with detail
- **minecraft-live.mjs** - Minecraft profile card
- **steam-live.mjs** - Steam activity card
- **github-live.mjs** - GitHub activity card
- **google-calendar-live.mjs** - Google Calendar card
- **notion-live.mjs** - Notion activity card
- **todoist-live.mjs** - Todoist tasks card
- **valorant-live.mjs** - Valorant stats card
- **lol-live.mjs** - League of Legends card
- **twitch-live.mjs** - Twitch stream card
- **lastfm-live.mjs** - Last.fm scrobble card
- **tracker-live.mjs** - Tracker.gg stats card
- **google-drive-live.mjs** - Google Drive activity card
- **youtube-live.mjs** - YouTube activity card
- **reddit-live.mjs** - Reddit activity card
- **bills-widget.mjs** - Bills/subscription widget

## 4. Hooks/Services/Utilities

### Core Services
- **auth-adapter.mjs** - Supabase authentication adapter (signIn, signUp, resetPassword, updatePassword, signInWithOAuth, signOut)
- **auth-storage.mjs** - Authentication storage adapter
- **network-client.mjs** - Network client for API calls
- **service-worker.mjs** - Service worker manager
- **external-diagnostics.mjs** - External diagnostics service
- **external-services-client.mjs** - Worker API client with 60+ operations
- **external-services-config.mjs** - Worker API configuration (https://raspy-fog-bf5b.rub19-mailpro.workers.dev)
- **rate-limiter.mjs** - Rate limiting utility
- **provider-credentials.mjs** - Provider credential management
- **public-auth-config.mjs** - Public Supabase configuration
- **cloud-cache.mjs** - Cloud caching service
- **drive-client.mjs** - Google Drive client
- **mail-cache.mjs** - Mail caching service
- **media-upload.mjs** - Media upload service
- **focus-timer.mjs** - Focus timer (Pomodoro, Deep Work)
- **clock-manager.mjs** - Clock/time manager
- **sound-manager.mjs** - Sound system with packs and volume controls
- **bills-manager.mjs** - Bills/subscription manager
- **team-manager.mjs** - Team management service
- **interactions-heatmap.mjs** - Interactions heatmap service
- **live-poll.mjs** - Live polling service
- **security-identity.mjs** - Security identity service
- **supabase-state-sync.mjs** - Supabase state synchronization

### OAuth Services
- **oauth-callback.mjs** - OAuth callback handling with PKCE
- **spotify-oauth.mjs** - Spotify OAuth
- **spotify-oauth-live.mjs** - Spotify OAuth live integration
- **github-oauth.mjs** - GitHub OAuth
- **google-calendar-oauth.mjs** - Google Calendar OAuth
- **google-drive-oauth.mjs** - Google Drive OAuth
- **notion-oauth.mjs** - Notion OAuth
- **todoist-oauth.mjs** - Todoist OAuth
- **youtube-oauth.mjs** - YouTube OAuth
- **reddit-oauth.mjs** - Reddit OAuth

### Live Services
- **discord-live.mjs** - Discord presence (Lanyard)
- **steam-live.mjs** - Steam activity
- **minecraft-live.mjs** - Minecraft profile
- **github-live.mjs** - GitHub activity
- **google-calendar-live.mjs** - Google Calendar events
- **notion-live.mjs** - Notion pages
- **todoist-live.mjs** - Todoist tasks
- **valorant-live.mjs** - Valorant stats (HenrikDev)
- **lol-live.mjs** - League of Legends stats
- **twitch-live.mjs** - Twitch streams
- **lastfm-live.mjs** - Last.fm scrobbles
- **tracker-live.mjs** - Tracker.gg stats
- **google-drive-live.mjs** - Google Drive files
- **youtube-live.mjs** - YouTube activity
- **reddit-live.mjs** - Reddit activity
- **weather-live.mjs** - Weather (Open-Météo)

### Core Systems
- **core/actions.mjs** - Action facade and dispatcher
- **core/automation-engine.mjs** - Automation system with triggers and actions
- **core/density-engine.mjs** - Density/content sizing engine
- **core/document-metadata.mjs** - Document metadata manager
- **core/experience.mjs** - Ambient effects and spotlight
- **core/lifecycle.mjs** - Application lifecycle
- **core/navigation-session.mjs** - Navigation session management
- **core/preferences.mjs** - Preferences system
- **core/presence-engine.mjs** - Presence engine for status indicators
- **core/preset-engine.mjs** - Preset system
- **core/router.mjs** - Router
- **core/store.mjs** - State store with persistence
- **core/style-loader.mjs** - Style loader
- **core/theme-engine.mjs** - Theme engine (night, graphite, day, auto, midnight, obsidian, aurora, minimal, focus, glass, oled)

### Brain System
- **brain/runtime.mjs** - Brain runtime orchestrator
- **brain/controller.mjs** - Brain controller
- **brain/context-engine.mjs** - Context engine
- **brain/action-registry.mjs** - Action registry
- **brain/memory-repository.mjs** - Memory repository
- **brain/provider-manager.mjs** - AI provider manager
- **brain/preferences.mjs** - Brain preferences

### Command System
- **command/command-center.mjs** - Command palette UI
- **command/catalog.mjs** - Command catalog (60+ commands)
- **command/search.mjs** - Command search
- **command/history.mjs** - Command history

### Data Models
- **data/home-model.mjs** - Home page data model
- **data/daily-briefing.mjs** - Daily briefing data
- **data/activity-journal.mjs** - Activity journal
- **data/integrations.mjs** - Integration catalog (30+ integrations)
- **data/navigation.mjs** - Navigation items
- **data/workspaces.mjs** - Workspace definitions
- **data/presets.mjs** - Preset definitions
- **data/profile-repository.mjs** - Profile repository
- **data/brand-icons.mjs** - Brand icon SVGs
- **data/changelog.mjs** - Changelog data
- **data/oauth-app-config.mjs** - OAuth app client IDs

### Utilities
- **utils/date.mjs** - Date utilities (isExpired, isExpiringSoon)
- **utils/download.mjs** - JSON download utility
- **utils/format.mjs** - Byte formatting

### Entry System
- **entry/entry-coordinator.mjs** - Entry flow coordinator
- **entry/login.mjs** - Login page
- **entry/password-recovery.mjs** - Password recovery
- **entry/profile-selection.mjs** - Profile selection

### I18n
- **i18n/catalog.mjs** - Translation catalog (fr, en, es, de)
- **i18n/runtime.mjs** - I18n runtime

## 5. Integration/Connection Types

### Media (7 integrations)
- **Spotify** - OAuth PKCE, now playing, control
- **Plex** - Local server, playback
- **Jellyfin** - Local server, playback
- **Emby** - Local server, playback
- **YouTube** - OAuth, channel activity
- **Twitch** - OAuth/public, streams
- **Last.fm** - API, scrobbles, history

### Social (4 integrations)
- **Discord** - OAuth/Lanyard, presence
- **Reddit** - OAuth/public, posts
- **Bluesky** - Public, posts
- **Email** - OAuth, messages

### Gaming (5 integrations)
- **Steam** - API, games, achievements
- **Riot Games** - API (HenrikDev), Valorant, League of Legends
- **Minecraft** - OAuth/public, profile
- **Tracker.gg** - Restricted, Apex Legends stats
- **Apex Legends** - Via Tracker.gg

### Productivity (9 integrations)
- **Google Calendar** - OAuth, events
- **Google Drive** - OAuth, files
- **Notion** - OAuth, pages
- **Todoist** - OAuth, tasks
- **Linear** - OAuth, issues
- **ClickUp** - OAuth, tasks
- **Jira** - OAuth, issues
- **RSS** - Feed, articles
- **Weather** - API (Open-Météo), forecasts

### Development (4 integrations)
- **GitHub** - OAuth, commits, PRs, issues
- **GitLab** - OAuth, commits, MRs
- **Obsidian** - Local, vault
- **VS Code** - Local, sessions

### Health (1 integration)
- **Fitbit** - OAuth, activity

### AI (5 integrations)
- **LM Studio** - Local, models
- **Ollama** - Local, models
- **OpenAI** - API, via worker relay
- **Anthropic** - API, via worker relay
- **Gemini** - API, via worker relay

## 6. Authentication Flows

### Authentication Methods
- **Email/Password** - Standard Supabase auth with rate limiting
- **OAuth** - Google, GitHub OAuth flows
- **Passkeys** - WebAuthn passkey authentication
- **OTP** - Email one-time password
- **Password Recovery** - Email-based recovery

### Auth States
- initializing, authenticated, unauthenticated, refreshing, recovering, signingIn, signingOut, error

### Rate Limiting Policies
- signIn: 5 attempts/60s
- signUp: 3 attempts/600s
- resetPassword: 3 attempts/900s
- oauth: 6 attempts/60s
- updatePassword: 5 attempts/300s

### Security Features
- Password strength validation (12+ chars, mixed case, number, symbol)
- Session management with Supabase
- PKCE for Spotify OAuth
- Worker signout endpoint
- Device management
- Passkey support

## 7. Widgets, Dashboard Layout, UI Features

### Dashboard Layout
- **Shell** - Main layout with sidebar, header, dock
- **Sidebar/Rail** - Collapsible navigation rail
- **Dock** - macOS-style dock with app icons, reordering, scaling
- **Header** - Page header with breadcrumbs, sync status
- **Mission Control** - Spaces, apps, windows overview (Cmd+Tab style)

### Widgets
- **Live Cards** - 18 live cards (Spotify, Discord, Weather, Minecraft, Steam, GitHub, Google Calendar, Notion, Todoist, Valorant, LoL, Twitch, Last.fm, Tracker.gg, Google Drive, YouTube, Reddit, Bills)
- **Home Widgets** - Continuity, Daystream, Productivity, Briefing Signals
- **Activity Widgets** - Live cards by category (Gaming, Social, Productivity)
- **Focus Island** - Dynamic island for focus timer
- **Bills Widget** - Subscription/bill tracking

### Brain
- **Chat Interface** - AI chat with thinking animation
- **Context Panel** - Context information
- **Memory Panel** - Memory management
- **Actions Panel** - Available actions
- **Automations Panel** - Automation rules
- **Providers Panel** - AI provider settings
- **Privacy Panel** - Privacy controls
- **History Panel** - Chat history
- **Diagnostics Panel** - Brain diagnostics
- **Wrap-up Panel** - Daily wrap-up

### Mail
- **Folders** - Inbox, Starred, Sent, Drafts, Archive, Spam, Trash
- **Search** - With highlighting
- **Analytics** - Activity charts
- **Compose** - Email composition

### Files
- **Folder Navigation** - Breadcrumb navigation
- **File Preview** - File preview panel
- **Views** - List/Grid toggle
- **Bulk Actions** - Selection, delete, move
- **Shares** - File sharing management
- **Drops** - Public file drops
- **Cloud Dashboard** - Cloud storage dashboard

### Activity
- **Timeline** - Activity timeline with filters
- **Live Cards** - Real-time integration cards
- **Filters** - Today, Week, Gaming, Development, Work, Study, Productivity, Media, Social, Brain
- **Search** - Full-text search
- **Sorting** - Recent, Oldest, Source

### Settings
- **Theme** - Night, Graphite, Day, Auto, Midnight, Obsidian, Aurora, Minimal, Focus, Glass, OLED
- **Accent** - Mint, Sky, Amber, Violet, Rose, Custom
- **Aura** - Classic, Boréale, Cyberpunk, Éclipse, Émeraude, Minérale
- **Font** - Inter, Outfit, JetBrains Mono, Editorial Serif
- **Radius** - Rounded, Sharp, Soft
- **Density** - Spacious, Comfortable, Compact, Ultra-compact, Automatic, Custom
- **Sound** - Master, notifications, interface, brain, system volumes
- **Brain Permissions** - Notes, Tasks, Calendar, Connections, Gaming, Activity, Files, Profile, Settings, Mail
- **Brain Memory** - Interface, Habits, Widgets, Schedules, Task Types, Spaces, Flows, Response Style, Goals
- **Presets** - Productivity, Focus, Gaming, Creative, Minimal, Developer
- **Accessibility** - Font size, color blind modes
- **Shortcuts** - Keyboard shortcuts

### Notifications
- **Toast Manager** - Toast notifications
- **Notification Center** - Notification history, categories, priorities
- **Categories** - Important, Messages, Activity, System, Brain, Security
- **Priorities** - Critical, Important, Normal, Silent

### Command Palette
- **Command Center** - Searchable command palette (Ctrl/Cmd+K)
- **60+ Commands** - Navigation, actions, settings, spaces, flows, focus, ambience
- **History** - Command history
- **Pinned** - Pinned commands
- **Context-aware** - Context-sensitive suggestions

### Search
- **Command Search** - Universal command search
- **Page Search** - In-page search (notes, tasks, files, activity, mail)

## 8. Theming, Localization, Design Tokens, Animations, Storage

### Theming
- **Theme Modes** - night, graphite, day, auto, midnight, obsidian, aurora, minimal, focus, glass, oled
- **Accent Colors** - mint, sky, amber, violet, rose, custom, teal, coral
- **Aura Themes** - Classic, Boréale, Cyberpunk, Éclipse, Émeraude, Minérale
- **Font Families** - Inter, Outfit, JetBrains Mono, Editorial Serif
- **Radius Styles** - Rounded, Sharp, Soft
- **Wallpapers** - None, Nebula, Mesh, Aurora, Noise
- **System Preference Detection** - Prefers-color-scheme

### Localization (i18n)
- **Supported Locales** - fr (French), en (English), es (Spanish), de (German)
- **Translation Catalog** - 100+ translated strings
- **Locale Persistence** - localStorage
- **Runtime Switching** - Dynamic locale switching

### Design Tokens (CSS Custom Properties)
- **Color Tokens** --v8-canvas, --v8-surface-1/2/3, --v8-border, --v8-text, --v8-brand, --v8-accent
- **Ambient Tokens** --v8-ambient-phase-light/shadow, --v8-ambient-highlight, --v8-ambient-theme-wash
- **Motion Tokens** --v8-motion-slow, --v8-ease-standard, --v8-ambient-transition
- **Font Tokens** --v8-font, --v8-font-size
- **Spacing Tokens** --v8-spacing-xs/sm/md/lg/xl
- **Radius Tokens** --v8-radius-sm/md/lg
- **Shadow Tokens** --v8-shadow-sm/md/lg

### Animations
- **Spotlight** - Startup spotlight transition
- **Ambient Effects** - Subtle color shifts and glows
- **Presence Animations** - Status indicator animations
- **Focus Island** - Dynamic island transitions
- **Toast** - Toast slide-in/out
- **Panel** - Panel slide transitions
- **Window** - Window layer transitions
- **Live Freshness** - Live card freshness indicators

### Storage/Persistence
- **localStorage** - Preferences, UI state, dock order, live card layout
- **sessionStorage** - OAuth pending state
- **Supabase** - Cloud sync for profiles, notes, tasks, calendar, files
- **Cloud Sync** - Automatic sync with conflict resolution
- **Persistence Key** - "ethone:v8-ui-state"
- **Profile Repository** - Multi-profile support

## 9. External API/Worker Usage

### Worker API
- **Base URL** - https://raspy-fog-bf5b.rub19-mailpro.workers.dev
- **Environment Detection** - localhost (development), staging.* (staging), production (production)

### Worker Operations (60+ endpoints)
- **Health** - /health
- **Steam** - /api/steam/player, /api/steam/recent-games, /api/steam/owned-games, /api/steam/achievements
- **Tracker** - /api/tracker/apex-profile, /api/tracker/valorant-profile, /api/tracker/lol-profile, /api/tracker/apex-matches, /api/tracker/valorant-matches, /api/tracker/lol-matches
- **Twitch** - /api/twitch/channel
- **Last.fm** - /api/lastfm/recent-tracks, /api/lastfm/top-artists, /api/lastfm/top-tracks
- **Lanyard** - /api/lanyard/presence
- **Now Playing** - /api/now-playing
- **Weather** - /api/weather
- **Minecraft** - /api/minecraft/profile
- **Spotify OAuth** - /api/spotify/oauth/exchange, /api/spotify/now-playing, /api/spotify/control, /api/spotify/track-saved, /api/spotify/oauth/disconnect
- **GitHub OAuth** - /api/github/oauth/exchange, /api/github/profile, /api/github/oauth/disconnect
- **Google Calendar OAuth** - /api/google-calendar/oauth/exchange, /api/google-calendar/events, /api/google-calendar/oauth/disconnect
- **Notion OAuth** - /api/notion/oauth/exchange, /api/notion/pages, /api/notion/oauth/disconnect
- **Todoist OAuth** - /api/todoist/oauth/exchange, /api/todoist/tasks, /api/todoist/oauth/disconnect
- **Google Drive OAuth** - /api/google-drive/oauth/exchange, /api/google-drive/files, /api/google-drive/file, /api/google-drive/folders, /api/google-drive/files/update, /api/google-drive/files/trash, /api/google-drive/files/delete, /api/google-drive/quota, /api/google-drive/upload, /api/google-drive/download, /api/google-drive/oauth/disconnect
- **Cloud Files** - /api/cloud/files/sync, /api/cloud/files, /api/cloud/files/favorites, /api/cloud/file, /api/cloud/file/update, /api/cloud/file/favorite, /api/cloud/file/brain, /api/cloud/activity, /api/cloud/activity/summary, /api/cloud/dashboard, /api/cloud/cleanup
- **Cloud Shares** - /api/cloud/shares, /api/cloud/shares/resolve, /api/cloud/shares/download, /api/cloud/shares/revoke
- **Cloud Drops** - /api/cloud/drops, /api/cloud/drops/resolve, /api/cloud/drops/upload
- **Diagnostic** - /api/diagnostic
- **Signout** - /api/signout

### Supabase
- **URL** - https://bvgifyzhpzkbrwdjrqsg.supabase.co
- **Auth** - PKCE flow, session persistence, auto-refresh
- **Storage** - Profiles, notes, tasks, calendar, files sync

### Public APIs
- **Open-Météo** - Weather forecasts
- **Mojang API** - Minecraft profiles
- **HenrikDev API** - Valorant/LoL stats
- **Tracker.gg API** - Apex Legends stats
- **Twitch Helix API** - Twitch streams
- **Last.fm API** - Music scrobbles
- **Reddit API** - Reddit posts

## 10. Assets

### Brand Assets
- **ETHONE Logo** - SVG brand mark (BRAND_MARK_SVG)
- **Brand Icons** - Integration brand icons (brand-icons.mjs)

### Icon System
- **Lucide Icons** - 100+ Lucide icons via data-lucide
- **Brand Icons** - Service-specific brand icons
- **Dynamic Loading** - Icon refresh and scheduling

### Images
- **Avatars** - User avatars with fallback initials
- **Album Art** - Spotify album art
- **Game Art** - Steam/Valorant game art
- **File Previews** - File type icons and previews

### Illustrations
- **Empty States** - Custom empty state illustrations
- **Error States** - Custom error state illustrations
- **Loading States** - Skeleton loaders

### CSS Assets
- **styles/tokens.css** - Design tokens and CSS custom properties
- **styles/base.css** - Base styles and reset
- **styles/components.css** - Component styles
- **styles/shell.css** - Shell layout styles
- **styles/entry.css** - Entry page styles
- **styles/activity.css** - Activity page styles
- **styles/mail.css** - Mail page styles
- **styles/team.css** - Team page styles
- **styles/interactions.css** - Interactions page styles
- **styles/share-drop.css** - Share/Drop page styles
- **styles/workspaces.css** - Workspaces styles
- **styles/depth.css** - Depth/glassmorphism effects
- **styles/presence.css** - Presence indicator styles
- **styles/mobile-ux.css** - Mobile UX styles
- **styles/bills.css** - Bills widget styles

---

**Summary Statistics:**
- **Total Files**: 120+ .mjs files
- **Total CSS Files**: 15 .css files
- **Total Integrations**: 30+
- **Total Commands**: 60+
- **Total Live Cards**: 18
- **Supported Languages**: 4 (fr, en, es, de)
- **Theme Modes**: 11
- **Accent Colors**: 8
- **Worker API Endpoints**: 60+
