import { createLifecycle } from "../core/lifecycle.mjs";
import { createPresentationStore } from "../core/store.mjs";
import { createRouter } from "../core/router.mjs";
import { createActionFacade } from "../core/actions.mjs";
import { createDensityEngine } from "../core/density-engine.mjs";
import { createNavigationSession } from "../core/navigation-session.mjs";
import { createCommandHistory } from "../command/history.mjs";
import { createCommandCenter } from "../command/command-center.mjs";
import { createHomeModel } from "../data/home-model.mjs";
import { claimDailyBriefing } from "../data/daily-briefing.mjs";
import { createActivityJournal } from "../data/activity-journal.mjs";
import { createDocumentMetadataManager, themeColorForState } from "../core/document-metadata.mjs";
import { createThemeWatcher, resolveTheme, systemPrefersLight } from "../core/theme-engine.mjs";
import { actionLabel, createAutomationWatcher } from "../core/automation-engine.mjs";
import { createAmbientEngine } from "../core/experience.mjs";
import { calendarPresenceState, createPresenceEngine } from "../core/presence-engine.mjs";
import { createSpotifyLive } from "../services/spotify-live.mjs";
import { createDiscordLive } from "../services/discord-live.mjs";
import { createWeatherLive } from "../services/weather-live.mjs";
import { createMinecraftLive } from "../services/minecraft-live.mjs";
import { createSteamLive } from "../services/steam-live.mjs";
import { createSpotifyOAuthLive } from "../services/spotify-oauth-live.mjs";
import { createGithubLive } from "../services/github-live.mjs";
import { createGoogleCalendarLive } from "../services/google-calendar-live.mjs";
import { createNotionLive } from "../services/notion-live.mjs";
import { createTodoistLive } from "../services/todoist-live.mjs";
import { createValorantLive } from "../services/valorant-live.mjs";
import { createLeagueLive } from "../services/lol-live.mjs";
import { createTwitchLive } from "../services/twitch-live.mjs";
import { createLastfmLive } from "../services/lastfm-live.mjs";
import { createTrackerLive } from "../services/tracker-live.mjs";
import { createGoogleDriveLive } from "../services/google-drive-live.mjs";
import { createYoutubeLive } from "../services/youtube-live.mjs";
import { createRedditLive } from "../services/reddit-live.mjs";
import { clearPendingOAuthAuthorize, consumeOAuthCallback, readPendingOAuthAuthorize } from "../services/oauth-callback.mjs";
import { mountShell } from "../ui/shell.mjs";
import { createPanelManager } from "../ui/panel.mjs";
import { createToastManager } from "../ui/toast.mjs";
import { createMissionControl } from "../ui/mission-control.mjs";
import { createContextMenu } from "../ui/context-menu.mjs";
import { shouldPreserveBrowserContextMenu } from "../ui/native-behavior.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { skeletonState } from "../ui/empty-state.mjs";
import { enhanceForm, prepareFormControls } from "../ui/form-system.mjs";
import { mountHome } from "../pages/home.mjs";
import { mountNotes } from "../pages/notes.mjs";
import { mountTasks } from "../pages/tasks.mjs";
import { mountCalendar } from "../pages/calendar.mjs";
import { mountFiles } from "../pages/files.mjs";
import { mountSpaces, mountFlows } from "../pages/system.mjs";
import { mountFeatureFallback } from "../pages/feature-fallback.mjs";
import { createScratchpad } from "../ui/scratchpad.mjs";
import { createShortcutsOverlay } from "../ui/shortcuts-overlay.mjs";

export function mountApplication(root, options = {}) {
  if (!root) throw new TypeError("Application runtime requires a root element");
  const repository = options.repository;
  const i18n = options.i18n;
  const metadata = options.metadata || createDocumentMetadataManager(document);
  const sounds = options.soundManager || null;
  const cloudSync = options.cloudSync || null;
  const clockManager = options.clockManager || null;
  const externalServices = options.externalServices || null;
  if (!repository) throw new TypeError("Application runtime requires a profile repository");

  const startedAt = performance.now();
  const releaseFormSystem = enhanceForm(root);
  const initialSync = cloudSync?.status?.() || {};
  const initialClock = clockManager?.snapshot?.() || {};
  const store = createPresentationStore({
    ...(cloudSync?.preferences?.() || {}),
    syncStatus: initialSync.syncStatus,
    networkStatus: initialSync.networkStatus,
    saveStatus: initialSync.saveStatus,
    sessionStatus: initialSync.sessionStatus,
    localTime: initialClock.time,
    timeZone: initialClock.timeZone
  }, { fallbackState: { accent: options.profile?.accent, space: options.profile?.space, flow: options.profile?.flow } });
  const initialModel = createHomeModel({ snapshot: repository.snapshot() });
  const lifecycle = createLifecycle();
  const densityEngine = createDensityEngine({ target: document.documentElement, runtime: globalThis, getState: () => store.getState() });
  const automationWatcher = createAutomationWatcher({ getRules: () => store.getState().brainPreferences?.automations || [] });
  const history = createCommandHistory();
  const activityJournal = createActivityJournal(repository);
  const ownsAmbientEngine = !options.ambientEngine;
  const ambient = options.ambientEngine || createAmbientEngine({
    target: document.documentElement,
    document,
    runtime: globalThis,
    soundManager: sounds,
    getState: () => store.getState()
  });
  const ownsPresenceEngine = !options.presenceEngine;
  const presence = options.presenceEngine || createPresenceEngine({ target: document.documentElement, document, runtime: globalThis });
  const ownsSpotifyLive = !options.spotifyLive;
  const spotifyLive = options.spotifyLive || createSpotifyLive({
    document,
    runtime: globalThis,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "spotify" && connection.status === "connected"),
    command: (action) => {
      const clientId = repository.snapshot().connections.find((connection) => connection.id === "spotify")?.reference || "";
      return externalServices?.spotifyOAuth?.control(action, clientId);
    }
  });
  const ownsSpotifyOAuthLive = !options.spotifyOAuthLive;
  const spotifyOAuthLive = options.spotifyOAuthLive || createSpotifyOAuthLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "spotify" && connection.methodId === "oauth-pkce" && connection.status === "connected"),
    getClientId: () => repository.snapshot().connections.find((connection) => connection.id === "spotify")?.reference || "",
    onTrack: (track) => spotifyLive.publish?.(track)
  });
  const ownsDiscordLive = !options.discordLive;
  const discordLive = options.discordLive || createDiscordLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "discord" && connection.status === "connected"),
    getUserId: () => repository.snapshot().connections.find((connection) => connection.id === "discord")?.reference || ""
  });
  const ownsWeatherLive = !options.weatherLive;
  const weatherLive = options.weatherLive || createWeatherLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "weather" && connection.status === "connected"),
    getCity: () => repository.snapshot().connections.find((connection) => connection.id === "weather")?.reference || ""
  });
  const ownsMinecraftLive = !options.minecraftLive;
  const minecraftLive = options.minecraftLive || createMinecraftLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "minecraft" && connection.status === "connected"),
    getUsername: () => repository.snapshot().connections.find((connection) => connection.id === "minecraft")?.reference || ""
  });
  const ownsSteamLive = !options.steamLive;
  const steamLive = options.steamLive || createSteamLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "steam" && connection.status === "connected"),
    getSteamId: () => repository.snapshot().connections.find((connection) => connection.id === "steam")?.reference || ""
  });
  const ownsGithubLive = !options.githubLive;
  const githubLive = options.githubLive || createGithubLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "github" && connection.methodId === "oauth-secure" && connection.status === "connected")
  });
  const ownsGoogleCalendarLive = !options.googleCalendarLive;
  const googleCalendarLive = options.googleCalendarLive || createGoogleCalendarLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "google-calendar" && connection.methodId === "oauth-secure" && connection.status === "connected"),
    getClientId: () => repository.snapshot().connections.find((connection) => connection.id === "google-calendar")?.reference || ""
  });
  const ownsNotionLive = !options.notionLive;
  const notionLive = options.notionLive || createNotionLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "notion" && connection.methodId === "public-oauth" && connection.status === "connected")
  });
  const ownsTodoistLive = !options.todoistLive;
  const todoistLive = options.todoistLive || createTodoistLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "todoist" && connection.methodId === "oauth-secure" && connection.status === "connected")
  });
  const ownsValorantLive = !options.valorantLive;
  const valorantLive = options.valorantLive || createValorantLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "riot" && connection.status === "connected"),
    getRiotId: () => repository.snapshot().connections.find((connection) => connection.id === "riot")?.reference || ""
  });
  const ownsLolLive = !options.lolLive;
  const lolLive = options.lolLive || createLeagueLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "riot" && connection.status === "connected"),
    getRiotId: () => repository.snapshot().connections.find((connection) => connection.id === "riot")?.reference || ""
  });
  const ownsTwitchLive = !options.twitchLive;
  const twitchLive = options.twitchLive || createTwitchLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "twitch" && connection.methodId === "public-profile" && connection.status === "connected"),
    getLogin: () => repository.snapshot().connections.find((connection) => connection.id === "twitch")?.reference || ""
  });
  const ownsLastfmLive = !options.lastfmLive;
  const lastfmLive = options.lastfmLive || createLastfmLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "lastfm" && connection.status === "connected"),
    getUsername: () => repository.snapshot().connections.find((connection) => connection.id === "lastfm")?.reference || ""
  });
  const ownsTrackerLive = !options.trackerLive;
  const trackerLive = options.trackerLive || createTrackerLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "tracker-gg" && connection.status === "connected"),
    getIdentifier: () => repository.snapshot().connections.find((connection) => connection.id === "tracker-gg")?.reference || ""
  });
  const ownsGoogleDriveLive = !options.googleDriveLive;
  const googleDriveLive = options.googleDriveLive || createGoogleDriveLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "google-drive" && connection.methodId === "oauth-secure" && connection.status === "connected"),
    getClientId: () => repository.snapshot().connections.find((connection) => connection.id === "google-drive")?.reference || ""
  });
  const ownsYoutubeLive = !options.youtubeLive;
  const youtubeLive = options.youtubeLive || createYoutubeLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "youtube" && connection.methodId === "oauth-secure" && connection.status === "connected"),
    getClientId: () => repository.snapshot().connections.find((connection) => connection.id === "youtube")?.reference || ""
  });
  const ownsRedditLive = !options.redditLive;
  const redditLive = options.redditLive || createRedditLive({
    runtime: globalThis,
    externalServices,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "reddit" && connection.methodId === "oauth-secure" && connection.status === "connected"),
    getClientId: () => repository.snapshot().connections.find((connection) => connection.id === "reddit")?.reference || ""
  });
  let actions = null;
  let router = null;
  let shell = null;
  let destroyed = false;
  let routeRequest = 0;
  let mountedRoute = "";
  let brainRuntime = null;
  let brainRuntimePromise = null;
  let applyingCloudPreferences = false;
  let navigationSession = null;
  let pendingRouteNavigation = null;
  let cloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
  let densityStateKey = JSON.stringify({ density: store.getState().density, settings: store.getState().densitySettings, space: store.getState().space, flow: store.getState().flow, panel: store.getState().panel, rail: store.getState().railExpanded });

  const releaseCloudBinding = cloudSync?.bindRuntime?.({
    readPreferences: () => ({
      ...store.cloudSnapshot(),
      locale: i18n?.locale?.() || "fr",
      sound: sounds?.preferences?.() || null,
      dock: shell?.dockOrder?.() || cloudSync?.preferences?.().dock || null
    }),
    applyPreferences: (preferences) => {
      applyingCloudPreferences = true;
      try {
        store.setState(preferences);
        if (preferences?.locale) i18n?.setLocale?.(preferences.locale, { announce: false });
        if (preferences?.sound) sounds?.setPreferences?.(preferences.sound);
        if (preferences?.dock) shell?.setDockOrder?.(preferences.dock);
      } finally {
        cloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
        applyingCloudPreferences = false;
      }
    }
  }) || (() => {});
  const releaseCloudStatus = cloudSync?.subscribe?.((next) => {
    store.setState({
      syncStatus: next.syncStatus,
      networkStatus: next.networkStatus,
      saveStatus: next.saveStatus,
      sessionStatus: next.sessionStatus
    });
  }) || (() => {});
  const releaseClock = clockManager?.subscribe?.((next) => {
    store.setState({ localTime: next.time, timeZone: next.timeZone });
  }) || (() => {});
  const releaseSoundPreferences = sounds?.subscribe?.(() => {
    if (!applyingCloudPreferences) cloudSync?.queue?.("sound-preferences");
  }) || (() => {});

  function applyTheme(themeValue) {
    const resolved = resolveTheme(themeValue, { systemPrefersLight: systemPrefersLight(globalThis) });
    document.documentElement.dataset.theme = resolved.effective;
    return resolved;
  }
  function applyAccent(nextState) {
    document.documentElement.dataset.accent = nextState.accent;
    if (nextState.accent === "custom") document.documentElement.style.setProperty("--v8-custom-accent-color", nextState.customAccentColor);
  }
  const themeWatcher = createThemeWatcher({
    runtime: globalThis,
    onChange: () => {
      if (store.getState().theme !== "auto") return;
      applyTheme("auto");
      metadata.setThemeColor(themeColorForState(store.getState(), { systemPrefersLight: systemPrefersLight(globalThis) }));
      ambient.refresh(store.getState());
    }
  });
  themeWatcher.start();

  applyAccent(store.getState());
  applyTheme(store.getState().theme);
  const savedAura = globalThis.localStorage?.getItem("v8_home_aura") || "classic";
  document.documentElement.dataset.aura = savedAura;
  const savedFont = globalThis.localStorage?.getItem("v8_font_family") || "inter";
  document.documentElement.dataset.font = savedFont;
  const savedRadiusStyle = globalThis.localStorage?.getItem("v8_radius_style") || "rounded";
  document.documentElement.dataset.radiusStyle = savedRadiusStyle;
  const savedSessionMode = globalThis.localStorage?.getItem("v8_home_session_mode") || "focus";
  document.documentElement.dataset.sessionMode = savedSessionMode;
  document.documentElement.dataset.space = store.getState().space;
  document.documentElement.dataset.spotlight = store.getState().spotlightEnabled === false ? "disabled" : "enabled";
  document.documentElement.dataset.ambientMotion = store.getState().ambientEffectsEnabled === false ? "disabled" : "enabled";
  document.documentElement.dataset.interfaceBlur = store.getState().interfaceBlurEnabled === false ? "disabled" : "enabled";
  if (store.getState().zen) {
    document.documentElement.dataset.v8Zen = "true";
  } else {
    delete document.documentElement.dataset.v8Zen;
  }
  if (store.getState().dockScale && store.getState().dockScale !== "normal") {
    document.documentElement.dataset.v8DockScale = store.getState().dockScale;
  } else {
    delete document.documentElement.dataset.v8DockScale;
  }
  densityEngine.start(store.getState());
  automationWatcher.prime(store.getState());
  if (ownsAmbientEngine) ambient.start(store.getState());
  else ambient.refresh(store.getState());
  if (ownsSpotifyLive) spotifyLive.start();
  else spotifyLive.refresh?.();
  if (ownsDiscordLive) discordLive.start();
  else discordLive.refresh?.();
  if (ownsWeatherLive) weatherLive.start();
  else weatherLive.refresh?.();
  if (ownsMinecraftLive) minecraftLive.start();
  else minecraftLive.refresh?.();
  if (ownsSteamLive) steamLive.start();
  else steamLive.refresh?.();
  if (ownsSpotifyOAuthLive) spotifyOAuthLive.start();
  else spotifyOAuthLive.refresh?.();
  if (ownsGithubLive) githubLive.start();
  else githubLive.refresh?.();
  if (ownsGoogleCalendarLive) googleCalendarLive.start();
  else googleCalendarLive.refresh?.();
  if (ownsNotionLive) notionLive.start();
  else notionLive.refresh?.();
  if (ownsTodoistLive) todoistLive.start();
  else todoistLive.refresh?.();
  if (ownsValorantLive) valorantLive.start();
  else valorantLive.refresh?.();
  if (ownsLolLive) lolLive.start();
  else lolLive.refresh?.();
  if (ownsTwitchLive) twitchLive.start();
  else twitchLive.refresh?.();
  if (ownsLastfmLive) lastfmLive.start();
  else lastfmLive.refresh?.();
  if (ownsTrackerLive) trackerLive.start();
  else trackerLive.refresh?.();
  if (ownsGoogleDriveLive) googleDriveLive.start();
  else googleDriveLive.refresh?.();
  if (ownsYoutubeLive) youtubeLive.start();
  else youtubeLive.refresh?.();
  if (ownsRedditLive) redditLive.start();
  else redditLive.refresh?.();
  const initialSpotify = spotifyLive.state?.() || {};
  const initialMedia = initialSpotify.playing ? "playing" : initialSpotify.available ? "paused" : "idle";
  const initialCalendar = calendarPresenceState(repository.snapshot().events);
  if (ownsPresenceEngine) presence.start({ route: store.getState().route, syncStatus: store.getState().syncStatus, media: initialMedia, calendar: initialCalendar });
  else presence.update({ route: store.getState().route, syncStatus: store.getState().syncStatus, media: initialMedia, calendar: initialCalendar });
  metadata.setThemeColor(themeColorForState(store.getState(), { systemPrefersLight: systemPrefersLight(globalThis) }));
  delete document.documentElement.dataset.entry;

  shell = mountShell(root, {
    initialState: store.getState(),
    user: initialModel.user,
    profileId: options.profile?.id,
    contextName: options.profile?.name || "Personnel",
    dockOrder: cloudSync?.preferences?.().dock,
    spotify: initialSpotify,
    onDockChange: () => cloudSync?.queue?.("dock-layout"),
    onAction: (actionId, context) => actions?.dispatch(actionId, context)
  });
  navigationSession = createNavigationSession({
    runtime: globalThis,
    stage: shell.stage,
    scope: options.profile?.id || options.ownerId || "default"
  });
  const releaseSpotify = spotifyLive.subscribe?.((playback) => {
    presence.update({ media: playback.playing ? "playing" : playback.available ? "paused" : "idle" });
    shell.updateSpotify(playback);
  }, { immediate: false }) || (() => {});
  const releaseDiscordSpotifyBridge = discordLive.subscribe?.((presenceState) => {
    const spotifyConnection = repository.snapshot().connections.find((connection) => connection.id === "spotify");
    if (spotifyConnection?.methodId !== "discord-lanyard" || spotifyConnection.status !== "connected") return;
    const track = presenceState.spotify;
    spotifyLive.publish?.(track?.available ? {
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork,
      is_playing: track.playing,
      progress_ms: track.progressMs,
      duration_ms: track.durationMs,
      id: track.trackId
    } : { track: null });
  }, { immediate: false }) || (() => {});
  presence.signalIcon?.("brain");
  if (initialCalendar === "approaching") presence.signalIcon?.("calendar");
  const toasts = createToastManager(shell.toastRegion, { sounds, presence });
  const oauthCallback = consumeOAuthCallback(globalThis);
  if (oauthCallback) {
    const pendingOAuth = readPendingOAuthAuthorize(globalThis);
    clearPendingOAuthAuthorize(globalThis);
    const provider = pendingOAuth?.provider;
    const providerLabel = { github: "GitHub", "google-calendar": "Google", notion: "Notion", spotify: "Spotify", todoist: "Todoist", "google-drive": "Google Drive", youtube: "YouTube", reddit: "Reddit" }[provider] || "Connexion";
    if (oauthCallback.error) {
      toasts.show({ id: `oauth-error-${provider || "unknown"}`, title: providerLabel, message: `Connexion ${providerLabel} annulée ou refusée.`, type: "warning" });
    } else if (!pendingOAuth || pendingOAuth.state !== oauthCallback.state || !pendingOAuth.clientId) {
      toasts.show({ id: "oauth-error-expired", title: providerLabel, message: `La demande de connexion ${providerLabel} a expiré. Réessayez.`, type: "error" });
    } else if (oauthCallback.code && provider === "spotify" && pendingOAuth.verifier) {
      externalServices?.spotifyOAuth?.exchange(oauthCallback.code, pendingOAuth.verifier, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("spotify", "connected", {
            apiVersion: "OAuth PKCE",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Spotify connecté via OAuth."
          });
          spotifyOAuthLive.refresh?.();
          toasts.show({ id: "spotify-oauth-success", title: "Spotify", message: "Compte Spotify connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "spotify-oauth-error", title: "Spotify", message: "Échec de la connexion Spotify. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "github") {
      externalServices?.githubOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("github", "connected", {
            apiVersion: "GitHub OAuth",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte GitHub connecté via OAuth."
          });
          githubLive.refresh?.();
          toasts.show({ id: "github-oauth-success", title: "GitHub", message: "Compte GitHub connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "github-oauth-error", title: "GitHub", message: "Échec de la connexion GitHub. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "google-calendar") {
      externalServices?.googleCalendarOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("google-calendar", "connected", {
            apiVersion: "Google Calendar API",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Google connecté via OAuth."
          });
          googleCalendarLive.refresh?.();
          toasts.show({ id: "google-calendar-oauth-success", title: "Google", message: "Google Calendar connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "google-calendar-oauth-error", title: "Google", message: "Échec de la connexion Google. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "notion") {
      externalServices?.notionOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("notion", "connected", {
            apiVersion: "Notion API",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Notion connecté via OAuth."
          });
          notionLive.refresh?.();
          toasts.show({ id: "notion-oauth-success", title: "Notion", message: "Notion connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "notion-oauth-error", title: "Notion", message: "Échec de la connexion Notion. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "todoist") {
      externalServices?.todoistOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("todoist", "connected", {
            apiVersion: "Todoist API",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Todoist connecté via OAuth."
          });
          todoistLive.refresh?.();
          toasts.show({ id: "todoist-oauth-success", title: "Todoist", message: "Todoist connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "todoist-oauth-error", title: "Todoist", message: "Échec de la connexion Todoist. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "google-drive") {
      externalServices?.googleDriveOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("google-drive", "connected", {
            apiVersion: "Google Drive API",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Google Drive connecté via OAuth."
          });
          googleDriveLive.refresh?.();
          toasts.show({ id: "google-drive-oauth-success", title: "Google Drive", message: "Google Drive connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "google-drive-oauth-error", title: "Google Drive", message: "Échec de la connexion Google Drive. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "youtube") {
      externalServices?.youtubeOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("youtube", "connected", {
            apiVersion: "YouTube Data API v3",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte YouTube connecté via OAuth."
          });
          youtubeLive.refresh?.();
          toasts.show({ id: "youtube-oauth-success", title: "YouTube", message: "YouTube connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "youtube-oauth-error", title: "YouTube", message: "Échec de la connexion YouTube. Réessayez.", type: "error" });
        });
    } else if (oauthCallback.code && provider === "reddit") {
      externalServices?.redditOAuth?.exchange(oauthCallback.code, pendingOAuth.clientId)
        .then(() => {
          repository.connections.updateStatus("reddit", "connected", {
            apiVersion: "Reddit OAuth2",
            lastSyncAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            detail: "Compte Reddit connecté via OAuth."
          });
          redditLive.refresh?.();
          toasts.show({ id: "reddit-oauth-success", title: "Reddit", message: "Reddit connecté avec succès.", type: "success" });
        })
        .catch(() => {
          toasts.show({ id: "reddit-oauth-error", title: "Reddit", message: "Échec de la connexion Reddit. Réessayez.", type: "error" });
        });
    }
  }
  const panelOptions = {
    user: initialModel.user,
    snapshot: () => repository.snapshot(),
    getState: () => store.getState(),
    repository,
    currentLocale: () => i18n?.locale?.() || "fr",
    onLocaleChange: (locale) => i18n?.setLocale?.(locale),
    onClose: () => actions?.dispatch("v8.panel.close", { source: "keyboard" }),
    onSelectProfile: (profileId) => {
      const result = repository.selectProfile(profileId);
      if (result.ok) {
        sounds?.play?.("profile.switch");
        toasts.show({ id: "profile-switch", title: "Compte changé", message: `Profil « ${result.data?.name || profileId} » activé.`, type: "success" });
        actions?.dispatch("v8.panel.close");
      } else {
        toasts.show({ id: "profile-switch-err", title: "Compte", message: result.message || "Impossible de changer de profil.", type: "error" });
      }
    },
    onCreateProfile: () => {
      actions?.dispatch("v8.panel.close");
    },
    onTimerAction: (type) => {
      if (type === "finish") {
        sounds?.play?.("focus.complete");
        toasts.show({ id: "focus-done", title: "Focus Express", message: "Session terminée ! Bien joué. 🎉", type: "success" });
      }
    },
    onCopyWorldTime: (city, time) => {
      toasts.show({ id: "world-copy", title: city, message: `${time} copié dans le presse-papier`, type: "success" });
      try { navigator.clipboard?.writeText(`${city}: ${time}`); } catch { /* silent */ }
    }
  };
  const panels = createPanelManager(shell.panelHost, panelOptions);
  function applyProfileMediaUpdate(kind, url) {
    if (kind === "avatar") {
      const nextUser = Object.freeze({ ...panelOptions.user, avatar: Object.freeze({ kind: "image", value: url }) });
      panelOptions.user = nextUser;
      shell.updateUser(nextUser);
      return;
    }
    if (kind === "name") {
      panelOptions.user = Object.freeze({ ...panelOptions.user, name: url });
      return;
    }
  }
  let unreadNotifications = panels.notificationCount();
  presence.update({ notifications: unreadNotifications });
  const commandCenter = createCommandCenter(shell.commandHost, {
    history,
    additionalCommands: () => {
      const snapshot = repository.snapshot();
      const makeCommand = (kind, item, index) => {
        const routes = { note: "notes", task: "tasks", file: "files" };
        const icons = { note: "notebook-pen", task: "circle-check-big", file: "file" };
        const labels = { note: "Note", task: "Tache", file: "Fichier" };
        const title = String(item?.title || item?.name || `${labels[kind]} ${index + 1}`).slice(0, 96);
        const detail = String(item?.content || item?.description || "Ouvrir dans ETHONE").replace(/\s+/g, " ").slice(0, 96);
        return Object.freeze({
          id: `content.${kind}.${String(item?.id || index)}`,
          actionId: `v8.${routes[kind]}.open`,
          label: title,
          subtitle: detail,
          category: labels[kind],
          icon: icons[kind],
          keywords: Object.freeze([title, detail, kind]),
          contexts: Object.freeze([routes[kind]]),
          contextPriority: 88
        });
      };
      return Object.freeze([
        ...(snapshot.notes || []).slice(0, 8).map((item, index) => makeCommand("note", item, index)),
        ...(snapshot.tasks || []).slice(0, 8).map((item, index) => makeCommand("task", item, index)),
        ...(snapshot.files || []).slice(0, 8).map((item, index) => makeCommand("file", item, index))
      ]);
    },
    onExecute: (command) => actions?.dispatch(command.actionId, { source: "command-center", command }),
    onClose: () => actions?.dispatch("v8.command.close", { source: "command-center" })
  });
  const missionControl = createMissionControl(shell.missionHost, {
    snapshot: () => repository.snapshot(),
    activity: () => activityJournal.entries(),
    onClose: () => actions?.dispatch("v8.mission.close", { source: "backdrop" })
  });
  const contextMenu = createContextMenu(shell.contextMenuHost);
  const scratchpad = createScratchpad(root, {
    onCopy: (msg) => toasts.show({ id: "scratch-copy", title: "Brouillon", message: msg, type: "success" })
  });
  const shortcutsOverlay = createShortcutsOverlay(root);

  function finishRouteMount(route, focus, settled = true) {
    prepareFormControls(shell.stage);
    i18n?.apply?.(shell.stage);
    presence.revealWidgets(shell.stage);
    metadata.setRoute(route);
    if (settled && pendingRouteNavigation?.route === route) {
      const navigation = pendingRouteNavigation;
      pendingRouteNavigation = null;
      navigationSession.restore(route, { reset: navigation.type === "push" || navigation.type === "hash" });
    }
    if (focus) shell.focusStage();
  }

  function showRouteLoader(route) {
    const layouts={activity:"activity",connections:"connections",brain:"brain",settings:"settings"};
    shell.stage.replaceChildren(skeletonState({ layout: layouts[route] || "page", count: 3, label: `Chargement de ${route}`, className: "v8-page v8-lazy-page", page: route }));
  }

  async function brainProviderTransport(input = {}) {
    const result = await externalServices.brain.complete({
      provider: input.provider,
      operation: input.operation,
      model: input.model,
      messages: input.messages,
      context: input.context
    });
    return result.data;
  }

  function ensureBrainRuntime() {
    if (brainRuntime) return Promise.resolve(brainRuntime);
    if (brainRuntimePromise) return brainRuntimePromise;
    brainRuntimePromise = import("../brain/runtime.mjs").then(({ createBrainRuntime }) => {
      if (destroyed) throw new Error("Application fermee");
      brainRuntime = createBrainRuntime({
        repository,
        actions,
        getState: () => store.getState(),
        externalServices,
        providerTransport: externalServices ? brainProviderTransport : null,
        clientProvider: options.clientProvider,
        ownerId: options.ownerId || repository.owner?.(),
        presence,
        runtime: globalThis
      });
      return brainRuntime;
    }).finally(() => { brainRuntimePromise = null; });
    return brainRuntimePromise;
  }

  const lazyModuleCache = new Map();

  function preloadLazyRoutes() {
    if (destroyed) return;
    const loaders = {
      activity: () => import("../pages/activity.mjs"),
      connections: () => import("../pages/connections.mjs"),
      brain: () => import("../pages/brain.mjs"),
      settings: () => import("../pages/settings.mjs")
    };
    Object.entries(loaders).forEach(([r, loader]) => {
      if (!lazyModuleCache.has(r)) {
        loader().then((mod) => {
          if (!destroyed) lazyModuleCache.set(r, mod);
        }).catch(() => {});
      }
    });
    ensureBrainRuntime().catch(() => {});
  }

  function mountLazyRoute(route, focus, requestId) {
    if (lazyModuleCache.has(route) && (!["brain", "settings"].includes(route) || brainRuntime)) {
      const module = lazyModuleCache.get(route);
      const brain = brainRuntime;
      lifecycle.unmount();
      lifecycle.mount(route, () => {
        if (route === "activity") return module.mountActivity(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), subscribeState: store.subscribe, spotifyLive, discordLive, weatherLive, minecraftLive, steamLive, githubLive, googleCalendarLive, notionLive, todoistLive, valorantLive, lolLive, twitchLive, lastfmLive, trackerLive, googleDriveLive, youtubeLive, redditLive, presence, notify: (notice) => toasts.show(notice) });
        if (route === "connections") return module.mountConnections(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), subscribeState: store.subscribe, spotifyLive, spotifyOAuthLive, discordLive, weatherLive, minecraftLive, steamLive, githubLive, googleCalendarLive, notionLive, todoistLive, valorantLive, lolLive, twitchLive, lastfmLive, trackerLive, googleDriveLive, youtubeLive, redditLive, externalServices, notify: (notice) => toasts.show(notice), clientProvider: options.clientProvider, ownerId: options.ownerId || repository.owner?.() });
        if (route === "brain") return module.mountBrain(shell.stage, { repository, actions, state: store.getState(), presence, brain, notify: (notice) => toasts.show(notice) });
        return module.mountSettings(shell.stage, { repository, actions, state: store.getState(), sounds, externalServices, densityEngine, subscribeState: store.subscribe, brain, notify: (notice) => toasts.show(notice), clientProvider: options.clientProvider, ownerId: options.ownerId || repository.owner?.(), profile: options.profile || repository.activeProfile?.(), onProfileMediaUpdated: applyProfileMediaUpdate });
      });
      finishRouteMount(route, focus);
      return;
    }

    const loaders = {
      activity: () => import("../pages/activity.mjs"),
      connections: () => import("../pages/connections.mjs"),
      brain: () => import("../pages/brain.mjs"),
      settings: () => import("../pages/settings.mjs")
    };
    const loader = loaders[route];
    lifecycle.unmount();
    showRouteLoader(route);
    finishRouteMount(route, focus, false);
    Promise.all([loader(), ["brain", "settings"].includes(route) ? ensureBrainRuntime() : Promise.resolve(null)])
      .then(async ([module, brain]) => {
        if (!destroyed) lazyModuleCache.set(route, module);
        await module.prepare?.();
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => {
          if (route === "activity") return module.mountActivity(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), subscribeState: store.subscribe, spotifyLive, discordLive, weatherLive, minecraftLive, steamLive, githubLive, googleCalendarLive, notionLive, todoistLive, valorantLive, lolLive, twitchLive, lastfmLive, trackerLive, googleDriveLive, youtubeLive, redditLive, presence, notify: (notice) => toasts.show(notice) });
          if (route === "connections") return module.mountConnections(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), subscribeState: store.subscribe, spotifyLive, spotifyOAuthLive, discordLive, weatherLive, minecraftLive, steamLive, githubLive, googleCalendarLive, notionLive, todoistLive, valorantLive, lolLive, twitchLive, lastfmLive, trackerLive, googleDriveLive, youtubeLive, redditLive, externalServices, notify: (notice) => toasts.show(notice), clientProvider: options.clientProvider, ownerId: options.ownerId || repository.owner?.() });
          if (route === "brain") return module.mountBrain(shell.stage, { repository, actions, state: store.getState(), presence, brain, notify: (notice) => toasts.show(notice) });
          return module.mountSettings(shell.stage, { repository, actions, state: store.getState(), sounds, externalServices, densityEngine, subscribeState: store.subscribe, brain, notify: (notice) => toasts.show(notice), clientProvider: options.clientProvider, ownerId: options.ownerId || repository.owner?.(), profile: options.profile || repository.activeProfile?.(), onProfileMediaUpdated: applyProfileMediaUpdate });
        });
        finishRouteMount(route, focus);
      })
      .catch(() => {
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => mountFeatureFallback(shell.stage, route, {
          kind: "error",
          onRetry: () => mountLazyRoute(route, true, ++routeRequest)
        }));
        finishRouteMount(route, focus);
        toasts.show({ id: `lazy-${route}`, title: route === "activity" ? "Activity Hub" : route === "connections" ? "Connections" : route === "settings" ? "Réglages" : "Brain", message: "Le module n'a pas pu être chargé.", type: "error" });
      });
  }

  function mountRoute(route, focus = true, navigation = null) {
    const requestId = ++routeRequest;
    if (mountedRoute !== route) {
      if (mountedRoute) navigationSession.capture(mountedRoute);
      mountedRoute = route;
      pendingRouteNavigation = Object.freeze({ route, type: navigation?.type || "refresh" });
      shell.stage.scrollTo({ top: 0, behavior: "auto" });
    }
    shell.update({ ...store.getState(), route });
    if (["activity", "connections", "brain", "settings"].includes(route)) {
      mountLazyRoute(route, focus, requestId);
      return;
    }
    lifecycle.mount(route, () => {
      if (route === "home") return mountHome(shell.stage, createHomeModel({ snapshot: repository.snapshot() }), { ...store.getState(), spotifyLive, discordLive, weatherLive, minecraftLive, steamLive, githubLive, googleCalendarLive, notionLive, todoistLive, valorantLive, lolLive, twitchLive, lastfmLive, trackerLive, googleDriveLive, youtubeLive, redditLive, presence, sync: cloudSync, subscribeState: store.subscribe });
      if (route === "notes") return mountNotes(shell.stage, { repository, actions, state: store.getState(), subscribeState: store.subscribe, presence, sync: cloudSync, notify: (notice) => toasts.show(notice) });
      if (route === "tasks") return mountTasks(shell.stage, { repository, actions, state: store.getState(), subscribeState: store.subscribe, presence, notify: (notice) => toasts.show(notice) });
      if (route === "calendar") return mountCalendar(shell.stage, { repository, actions, presence, notify: (notice) => toasts.show(notice), state: store.getState(), subscribeState: store.subscribe });
      if (route === "files") return mountFiles(shell.stage, { repository, actions, state: store.getState(), subscribeState: store.subscribe, presence, notify: (notice) => toasts.show(notice) });
      if (route === "spaces") return mountSpaces(shell.stage, { repository, actions, state: store.getState() });
      if (route === "flows") return mountFlows(shell.stage, { repository, actions, state: store.getState(), subscribeState: store.subscribe, notify: (notice) => toasts.show(notice) });
      return mountFeatureFallback(shell.stage, route);
    });
    finishRouteMount(route, focus);
  }

  router = createRouter({
    runtime: globalThis,
    onRoute: (route, navigation) => {
      if (store.getState().route !== route) store.setState({ route });
      activityJournal.captureRoute(route);
      mountRoute(route, root.dataset.bootStatus === "ready", navigation);
    }
  });

  actions = createActionFacade({
    navigate: (route) => router.navigate(route),
    setState: (patch) => store.setState(patch),
    getState: () => store.getState(),
    notify: (notice) => toasts.show(notice),
    signOut: options.onSignOut,
    setLocale: (locale) => {
      const next = i18n?.setLocale?.(locale);
      cloudSync?.queue?.("locale");
      return next;
    },
    getLocale: () => i18n?.locale?.() || "fr",
    sounds,
    sync: cloudSync,
    spotifyLive,
    onActivity: (actionId, result) => activityJournal.capture(actionId, result)
  });

  const unsubscribe = store.subscribe((next, previous) => {
    const nextCloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
    if (!applyingCloudPreferences && nextCloudPreferencesKey !== cloudPreferencesKey) {
      cloudPreferencesKey = nextCloudPreferencesKey;
      cloudSync?.queue?.("préférences");
    }
    if (next.accent !== previous.accent || next.customAccentColor !== previous.customAccentColor) applyAccent(next);
    const nextDensityStateKey = JSON.stringify({ density: next.density, settings: next.densitySettings, space: next.space, flow: next.flow, panel: next.panel, rail: next.railExpanded });
    if (nextDensityStateKey !== densityStateKey) {
      densityStateKey = nextDensityStateKey;
      densityEngine.refresh(next);
    }
    if (next.theme !== previous.theme) applyTheme(next.theme);
    if (next.space !== previous.space) document.documentElement.dataset.space = next.space;
    if (next.spotlightEnabled !== previous.spotlightEnabled) document.documentElement.dataset.spotlight = next.spotlightEnabled ? "enabled" : "disabled";
    if (next.ambientEffectsEnabled !== previous.ambientEffectsEnabled) document.documentElement.dataset.ambientMotion = next.ambientEffectsEnabled ? "enabled" : "disabled";
    if (next.interfaceBlurEnabled !== previous.interfaceBlurEnabled) document.documentElement.dataset.interfaceBlur = next.interfaceBlurEnabled ? "enabled" : "disabled";
    if (next.zen !== previous.zen) {
      if (next.zen) document.documentElement.dataset.v8Zen = "true";
      else delete document.documentElement.dataset.v8Zen;
    }
    if (next.dockScale !== previous.dockScale) {
      if (next.dockScale && next.dockScale !== "normal") document.documentElement.dataset.v8DockScale = next.dockScale;
      else delete document.documentElement.dataset.v8DockScale;
    }
    if (next.flow !== previous.flow || next.space !== previous.space || next.theme !== previous.theme) ambient.refresh(next);
    if (next.theme !== previous.theme || next.space !== previous.space) metadata.setThemeColor(themeColorForState(next, { systemPrefersLight: systemPrefersLight(globalThis) }));
    shell.update(next);
    if (next.panel === "notifications" && previous.panel !== "notifications") unreadNotifications = 0;
    if (next.route !== previous.route || next.syncStatus !== previous.syncStatus || next.panel !== previous.panel) {
      presence.update({ route: next.route, syncStatus: next.syncStatus, notifications: unreadNotifications });
    }
    if (next.commandOpen !== previous.commandOpen) {
      if (next.commandOpen) commandCenter.open(next);
      else commandCenter.close();
    }
    if (next.panel !== previous.panel) {
      panels.close({ restoreFocus: !next.commandOpen && !next.missionOpen });
      if (next.panel) {
        panels.open(next.panel);
        presence.revealWidgets(shell.panelHost);
      }
    }
    if (next.missionOpen !== previous.missionOpen) {
      if (next.missionOpen) {
        missionControl.open(next);
        presence.revealWidgets(shell.missionHost);
      }
      else missionControl.close({ restoreFocus: !next.commandOpen && !next.panel });
    }
    if (next.commandOpen !== previous.commandOpen || next.panel !== previous.panel || next.missionOpen !== previous.missionOpen) {
      metadata.setSurface(next.commandOpen ? "command" : next.missionOpen ? "mission" : next.panel);
    }
    if (next.space !== previous.space) metadata.setRoute(next.route);
    const settingsChanged = next.route === "settings" && (
      next.theme !== previous.theme ||
      next.accent !== previous.accent ||
      next.space !== previous.space ||
      next.spotlightEnabled !== previous.spotlightEnabled ||
      next.ambientEffectsEnabled !== previous.ambientEffectsEnabled ||
      next.interfaceBlurEnabled !== previous.interfaceBlurEnabled
    );
    if (settingsChanged) mountRoute("settings", false);
    if (next.space !== previous.space && ["home", "brain", "spaces", "flows"].includes(next.route)) mountRoute(next.route, false);
    contextMenu.close();
    automationWatcher.check(next).forEach((rule) => {
      const run = () => actions.dispatch(rule.actionId, { source: "automation", automationId: rule.id });
      if (next.brainPreferences?.automationLevel === "trusted") run();
      else if (globalThis.confirm?.(`Automatisation : ${actionLabel(rule.actionId)}\n\nExecuter maintenant ?`)) run();
    });
  });

  function handleGlobalKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      actions.dispatch("v8.sync.refresh", { source: "keyboard" });
      return;
    }
    if (event.key === "F2") {
      event.preventDefault();
      actions.dispatch(store.getState().missionOpen ? "v8.mission.close" : "v8.mission.open", { source: "keyboard" });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      actions.dispatch(store.getState().commandOpen ? "v8.command.close" : "v8.command.open", { source: "keyboard" });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "m") {
      event.preventDefault();
      actions.dispatch(store.getState().missionOpen ? "v8.mission.close" : "v8.mission.open", { source: "keyboard" });
      return;
    }
    if (event.key === "Escape" && store.getState().missionOpen) {
      event.preventDefault();
      actions.dispatch("v8.mission.close", { source: "keyboard" });
      return;
    }
    if (event.key === "Escape" && !store.getState().commandOpen && store.getState().panel) {
      event.preventDefault();
      actions.dispatch("v8.panel.close", { source: "keyboard" });
      return;
    }
    const target = event.target;
    const editable = target?.matches?.("input, textarea, select, [contenteditable='true']");
    if (!editable && event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      actions.dispatch(store.getState().commandOpen ? "v8.command.close" : "v8.command.open", { source: "keyboard" });
      return;
    }
    if (!editable && event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      actions.dispatch(store.getState().missionOpen ? "v8.mission.close" : "v8.mission.open", { source: "keyboard" });
      return;
    }
    if (!editable && !store.getState().commandOpen && !store.getState().missionOpen && !store.getState().panel && ["PageDown", "PageUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const page = Math.max(240, shell.stage.clientHeight * 0.82);
      if (event.key === "PageDown") shell.stage.scrollBy({ top: page, behavior: "auto" });
      if (event.key === "PageUp") shell.stage.scrollBy({ top: -page, behavior: "auto" });
      if (event.key === "Home") shell.stage.scrollTo({ top: 0, behavior: "auto" });
      if (event.key === "End") shell.stage.scrollTo({ top: shell.stage.scrollHeight, behavior: "auto" });
      return;
    }
    if (!editable && !store.getState().commandOpen && !store.getState().missionOpen && !store.getState().panel && /^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const numRoutes = ["home", "activity", "connections", "brain", "settings", "notes", "tasks", "calendar", "files"];
      const labels = ["Accueil", "Activity Hub", "Connexions", "Brain", "Réglages", "Notes", "Tâches", "Calendrier", "Fichiers"];
      const index = Number(event.key) - 1;
      const targetRoute = numRoutes[index];
      if (targetRoute && store.getState().route !== targetRoute) {
        event.preventDefault();
        actions.navigate(targetRoute);
        toasts.show({ id: "shortcut-nav", title: "Navigation rapide", message: `${labels[index]} (${event.key})`, type: "info", duration: 1800 });
      }
      return;
    }
    if (event.altKey && (event.key === "z" || event.key === "Z") && !editable) {
      event.preventDefault();
      actions.dispatch("v8.zen.toggle");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "s" && !editable) {
      event.preventDefault();
      scratchpad.open();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "/" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      shortcutsOverlay.open();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "n" && !editable) {
      event.preventDefault();
      actions.dispatch("v8.notes.new");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "t" && !editable) {
      event.preventDefault();
      actions.dispatch("v8.tasks.new");
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "e" && !editable) {
      event.preventDefault();
      actions.dispatch("v8.calendar.new");
      return;
    }
  }

  function handleContextMenu(event) {
    if (event.defaultPrevented || !shell.stage.contains(event.target)) return;
    const selection = globalThis.getSelection?.()?.toString?.() || "";
    if (shouldPreserveBrowserContextMenu(event.target, { selection, shiftKey: event.shiftKey })) return;
    event.preventDefault();
    contextMenu.open(event.clientX, event.clientY, { anchor: event.target });
  }

  function handleVisibilityRefresh() {
    if (!document.hidden) presence.update({ calendar: calendarPresenceState(repository.snapshot().events) });
  }

  function handleOnline() {
    if (destroyed) return;
    presence.update({ syncStatus: "online" });
    cloudSync?.queue?.("network-restored");
    toasts.show({ id: "network-online", title: "Connexion rétablie", message: "Synchronisation cloud active.", type: "success", duration: 4000 });
  }

  function handleOffline() {
    if (destroyed) return;
    presence.update({ syncStatus: "offline" });
    toasts.show({ id: "network-offline", title: "Mode hors-ligne", message: "Connexion réseau indisponible. Les modifications sont enregistrées localement.", type: "warning", duration: 6000 });
  }

  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("visibilitychange", handleVisibilityRefresh);
  globalThis.addEventListener("online", handleOnline);
  globalThis.addEventListener("offline", handleOffline);
  shell.stage.addEventListener("contextmenu", handleContextMenu);
  const persistedRoute = store.getState().route;
  if (!globalThis.location.hash && persistedRoute !== "home") {
    globalThis.history.replaceState({ ethoneV8Route: persistedRoute }, "", `#/${persistedRoute}`);
  }
  router.start();
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(() => preloadLazyRoutes(), { timeout: 2000 });
  } else {
    setTimeout(() => preloadLazyRoutes(), 300);
  }
  if (store.getState().brainPreferences?.briefing?.enabled !== false && claimDailyBriefing(globalThis.localStorage, initialModel.briefing)) {
    toasts.show({
      id: "daily-brain-briefing",
      title: "Briefing Brain pret",
      message: initialModel.briefing.summary,
      type: "info",
      duration: 6200,
      action: { label: "Voir le briefing", run: () => actions.dispatch("v8.home.open", { source: "daily-briefing" }) }
    });
  }
  document.documentElement.dataset.space = store.getState().space;
  cloudSync?.queue?.("runtime-ready");
  refreshIcons();
  root.dataset.bootStatus = "ready";
  root.dataset.bootMs = Math.round(performance.now() - startedAt);

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    routeRequest += 1;
    document.removeEventListener("keydown", handleGlobalKeydown);
    document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    globalThis.removeEventListener("online", handleOnline);
    globalThis.removeEventListener("offline", handleOffline);
    shell.stage.removeEventListener("contextmenu", handleContextMenu);
    themeWatcher.destroy();
    if (ownsAmbientEngine) ambient.destroy();
    releaseSpotify();
    releaseDiscordSpotifyBridge();
    releaseClock();
    releaseSoundPreferences();
    releaseCloudStatus();
    releaseCloudBinding();
    if (ownsSpotifyLive) spotifyLive.destroy();
    if (ownsDiscordLive) discordLive.destroy();
    if (ownsWeatherLive) weatherLive.destroy();
    if (ownsMinecraftLive) minecraftLive.destroy();
    if (ownsSteamLive) steamLive.destroy();
    if (ownsSpotifyOAuthLive) spotifyOAuthLive.destroy();
    if (ownsGithubLive) githubLive.destroy();
    if (ownsGoogleCalendarLive) googleCalendarLive.destroy();
    if (ownsNotionLive) notionLive.destroy();
    if (ownsTodoistLive) todoistLive.destroy();
    if (ownsValorantLive) valorantLive.destroy();
    if (ownsLolLive) lolLive.destroy();
    if (ownsTwitchLive) twitchLive.destroy();
    if (ownsLastfmLive) lastfmLive.destroy();
    if (ownsTrackerLive) trackerLive.destroy();
    if (ownsGoogleDriveLive) googleDriveLive.destroy();
    if (ownsYoutubeLive) youtubeLive.destroy();
    if (ownsRedditLive) redditLive.destroy();
    if (ownsPresenceEngine) presence.destroy();
    densityEngine.destroy();
    brainRuntime?.destroy?.();
    brainRuntime = null;
    unsubscribe();
    actions.destroy?.();
    router.stop();
    navigationSession.destroy(mountedRoute);
    commandCenter.destroy();
    missionControl.destroy();
    contextMenu.destroy();
    scratchpad.destroy();
    shortcutsOverlay.destroy();
    panels.destroy();
    toasts.destroy();
    activityJournal.destroy();
    lifecycle.unmount();
    releaseFormSystem();
    shell.destroy();
    return true;
  }

  return Object.freeze({
    getState: store.getState,
    dispatch: actions.dispatch,
    navigate: router.navigate,
    refresh: () => mountRoute(router.current(), false),
    notify: (notice) => toasts.show(notice),
    diagnostics: () => Object.freeze({
      bootMs: Number(root.dataset.bootMs || 0),
      route: router.current(),
      mountedSurfaces: lifecycle.stats().mounted,
      navigationMode: shell.navigationMode(),
      storeSubscribers: store.subscriberCount(),
      commandOpen: commandCenter.isOpen(),
      missionOpen: missionControl.isOpen(),
      contextMenuOpen: contextMenu.isOpen(),
      activePanel: panels.current(),
      visualContext: document.documentElement.dataset.context || "neutral",
      ambientPhase: document.documentElement.dataset.ambient || "afternoon",
      ambientEngine: ambient.diagnostics?.() || null,
      presenceEngine: presence.diagnostics?.() || null,
      spotifyLive: spotifyLive.diagnostics?.() || null,
      githubLive: githubLive.diagnostics?.() || null,
      googleCalendarLive: googleCalendarLive.diagnostics?.() || null,
      notionLive: notionLive.diagnostics?.() || null,
      todoistLive: todoistLive.diagnostics?.() || null,
      valorantLive: valorantLive.diagnostics?.() || null,
      lolLive: lolLive.diagnostics?.() || null,
      twitchLive: twitchLive.diagnostics?.() || null,
      lastfmLive: lastfmLive.diagnostics?.() || null,
      trackerLive: trackerLive.diagnostics?.() || null,
      googleDriveLive: googleDriveLive.diagnostics?.() || null,
      youtubeLive: youtubeLive.diagnostics?.() || null,
      redditLive: redditLive.diagnostics?.() || null,
      documentTitle: document.title,
      documentContext: metadata.current(),
      activitySubscribers: activityJournal.subscriberCount(),
      soundSystem: sounds?.diagnostics?.() || null,
      cloudSync: cloudSync?.diagnostics?.() || null,
      clock: clockManager?.diagnostics?.() || null,
      navigationSession: navigationSession.diagnostics(),
      externalServices: externalServices?.diagnostics?.() || null,
      densityEngine: densityEngine.diagnostics(),
      brain: brainRuntime ? Object.freeze({ loaded: true, ...brainRuntime.diagnostics() }) : Object.freeze({ loaded: false })
    }),
    setBrainPresence: presence.setBrain,
    destroy
  });
}
