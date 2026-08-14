import {
  cloudDropsCreateRoute,
  cloudDropsListRoute,
  cloudDropResolveRoute,
  cloudDropRevokeRoute,
  cloudDropUploadRoute,
  cloudShareDownloadRoute,
  cloudShareResolveRoute,
  cloudShareRevokeRoute,
  cloudSharesCreateRoute,
  cloudSharesListRoute
} from "./routes/cloud-shares.js";
import {
  cloudFileDetailRoute,
  cloudFileFavoriteRoute,
  cloudFileUpdateRoute,
  cloudFilesFavoritesRoute,
  cloudFilesListRoute,
  cloudFilesSyncRoute
} from "./routes/cloud-files.js";
import { cloudActivityCreateRoute, cloudActivityListRoute, cloudActivitySummaryRoute } from "./routes/cloud-activity.js";
import { cloudCleanupRoute } from "./routes/cloud-cleanup.js";
import { cloudDashboardRoute } from "./routes/cloud-dashboard.js";
import { cloudFileBrainRoute } from "./routes/cloud-brain.js";
import { brainCompleteRoute } from "./routes/brain.js";
import { aiStatusRoute, aiQuotaRoute, aiPreferencesRoute } from "./routes/ai.js";
import { diagnosticRoute } from "./routes/diagnostic.js";
import { githubOAuthDisconnectRoute, githubOAuthExchangeRoute, githubProfileRoute } from "./routes/github-oauth.js";
import { googleCalendarEventsRoute, googleCalendarOAuthDisconnectRoute, googleCalendarOAuthExchangeRoute } from "./routes/google-calendar-oauth.js";
import {
  googleDriveDownloadRoute,
  googleDriveFileDeleteRoute,
  googleDriveFileRoute,
  googleDriveFileTrashRoute,
  googleDriveFileUpdateRoute,
  googleDriveFilesRoute,
  googleDriveFolderCreateRoute,
  googleDriveOAuthDisconnectRoute,
  googleDriveOAuthExchangeRoute,
  googleDriveQuotaRoute,
  googleDriveUploadRoute
} from "./routes/google-drive-oauth.js";
import { healthRoute } from "./routes/health.js";
import { lanyardRoute } from "./routes/lanyard.js";
import { blueskyProfileRoute } from "./routes/bluesky.js";
import { catalogProfileRoute } from "./routes/catalog-connector.js";
import { lastFmRoute } from "./routes/lastfm.js";
import { minecraftRoute } from "./routes/minecraft.js";
import { notionOAuthDisconnectRoute, notionOAuthExchangeRoute, notionPagesRoute } from "./routes/notion-oauth.js";
import { spotifyControlRoute, spotifyNowPlayingRoute, spotifyOAuthDisconnectRoute, spotifyOAuthExchangeRoute, spotifyTrackSavedRoute } from "./routes/spotify-oauth.js";
import { nowPlayingRoute } from "./routes/nowplaying.js";
import { redditActivityRoute, redditOAuthDisconnectRoute, redditOAuthExchangeRoute } from "./routes/reddit-oauth.js";
import { steamRoute } from "./routes/steam.js";
import { supabaseRoute } from "./routes/supabase.js";
import { todoistOAuthDisconnectRoute, todoistOAuthExchangeRoute, todoistTasksRoute } from "./routes/todoist-oauth.js";
import { trackerLolRoute, trackerRoute, trackerValorantRoute, trackerValorantMatchesRoute, trackerLolMatchesRoute, trackerApexMatchesRoute } from "./routes/tracker.js";
import { twitchRoute } from "./routes/twitch.js";
import { weatherRoute } from "./routes/weather.js";
import { youtubeActivityRoute, youtubeOAuthDisconnectRoute, youtubeOAuthExchangeRoute } from "./routes/youtube-oauth.js";
import { rssRoute } from "./routes/rss.js";
import { signOutRoute } from "./routes/signout.js";
import { teamMembersRoute } from "./routes/team.js";
import { userDataRoute } from "./routes/user-data.js";
import { profileRoute } from "./routes/profile.js";
import { profilesRoute } from "./routes/profiles.js";
import itemsRoute from "./routes/items.js";
import { connectionsListRoute } from "./routes/connections.js";
import { providerCredentialsRoute } from "./routes/provider-credentials.js";
import {
  mailAliasRoute, mailBulkActionRoute, mailContactsRoute, mailDraftsRoute, mailInboxRoute,
  mailLabelsRoute, mailMoveRoute, mailReadRoute, mailScheduleRoute, mailSearchRoute,
  mailSendRoute, mailSignaturesRoute, mailSnoozeRoute, mailThreadRoute
} from "./routes/mail.js";
import { mailTemplatesRoute } from "./routes/mail-templates.js";
import { mailAnalyticsRoute } from "./routes/mail-analytics.js";
import { mailAccountsRoute } from "./routes/mail-accounts.js";
import { mailPgpRoute } from "./routes/mail-pgp.js";
import { mailPushRoute, webhookMailRoute } from "./routes/mail-push.js";
import { mailListsRoute } from "./routes/mail-lists.js";
import {
  mailAnalyzeRoute,
  mailExtractRoute,
  mailNotificationsRoute,
  mailRulesRoute,
  mailSuggestRoute
} from "./routes/mail-brain.js";
import { mailBlockedRoute, mailTrustedRoute } from "./routes/mail-security.js";
import {
  passkeyRegisterOptionsRoute,
  passkeyRegisterRoute,
  passkeyAuthenticateOptionsRoute,
  passkeyAuthenticateRoute,
  passkeyRenameRoute,
  passkeyRevokeRoute,
  passkeyListRoute,
  otpSendRoute,
  otpVerifyRoute,
  deviceUpsertRoute,
  deviceListRoute,
  deviceTrustRoute,
  deviceRevokeRoute,
  deviceRemoveRoute,
  securityEventsRoute
} from "./routes/security-identity.js";

function route(id, path, handler, options = {}) {
  return Object.freeze({
    id,
    method: options.method || "GET",
    path,
    handler,
    public: options.public === true,
    rateLimit: options.rateLimit || "standard",
    service: options.service || "core",
    action: options.action || ""
  });
}

export const ROUTES = Object.freeze([
  route("health", "/health", healthRoute, { public: true, rateLimit: "edge" }),
  route("diagnostic", "/api/diagnostic", diagnosticRoute, { rateLimit: "strict" }),
  route("rss.feed", "/api/rss", rssRoute, { service: "rss" }),
  route("brain.complete", "/api/brain/complete", brainCompleteRoute, { method: "POST", service: "brain", rateLimit: "strict" }),
  route("ai.status", "/api/ai/status", aiStatusRoute, { service: "ai", rateLimit: "standard" }),
  route("ai.quota", "/api/ai/quota", aiQuotaRoute, { service: "ai", rateLimit: "standard" }),
  route("ai.preferences", "/api/ai/preferences", aiPreferencesRoute, { service: "ai", rateLimit: "standard" }),
  route("ai.preferences.post", "/api/ai/preferences", aiPreferencesRoute, { method: "POST", service: "ai", rateLimit: "strict" }),
  route("steam.player", "/api/steam/player", steamRoute, { service: "steam", action: "player" }),
  route("steam.recent-games", "/api/steam/recent-games", steamRoute, { service: "steam", action: "recent-games" }),
  route("steam.owned-games", "/api/steam/owned-games", steamRoute, { service: "steam", action: "owned-games" }),
  route("steam.achievements", "/api/steam/achievements", steamRoute, { service: "steam", action: "achievements" }),
  route("tracker.apex-profile", "/api/tracker/apex-profile", trackerRoute, { service: "tracker" }),
  route("tracker.valorant-profile", "/api/tracker/valorant-profile", trackerValorantRoute, { service: "tracker" }),
  route("tracker.lol-profile", "/api/tracker/lol-profile", trackerLolRoute, { service: "tracker" }),
  route("tracker.apex-matches", "/api/tracker/apex-matches", trackerApexMatchesRoute, { service: "tracker" }),
  route("tracker.valorant-matches", "/api/tracker/valorant-matches", trackerValorantMatchesRoute, { service: "tracker" }),
  route("tracker.lol-matches", "/api/tracker/lol-matches", trackerLolMatchesRoute, { service: "tracker" }),
  route("twitch.channel", "/api/twitch/channel", twitchRoute, { service: "twitch" }),
  route("lastfm.recent-tracks", "/api/lastfm/recent-tracks", lastFmRoute, { service: "lastfm", action: "recent-tracks" }),
  route("lastfm.top-artists", "/api/lastfm/top-artists", lastFmRoute, { service: "lastfm", action: "top-artists" }),
  route("lastfm.top-tracks", "/api/lastfm/top-tracks", lastFmRoute, { service: "lastfm", action: "top-tracks" }),
  route("lanyard.presence", "/api/lanyard/presence", lanyardRoute, { service: "lanyard" }),
  route("now-playing", "/api/now-playing", nowPlayingRoute, { service: "nowplaying" }),
  route("bluesky.profile", "/api/bluesky/profile", blueskyProfileRoute, { service: "bluesky" }),
  route("catalog.profile", "/api/catalog/profile", catalogProfileRoute, { service: "catalog" }),
  route("supabase.public-profile", "/api/supabase/public-profile", supabaseRoute, { service: "supabase", rateLimit: "strict" }),
  route("weather.forecast", "/api/weather", weatherRoute, { service: "weather" }),
  route("rss", "/api/rss", rssRoute, { service: "rss" }),
  route("minecraft.profile", "/api/minecraft/profile", minecraftRoute, { service: "minecraft" }),
  route("spotify.oauth.exchange", "/api/spotify/oauth/exchange", spotifyOAuthExchangeRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("spotify.now-playing", "/api/spotify/now-playing", spotifyNowPlayingRoute, { service: "spotify" }),
  route("spotify.control", "/api/spotify/control", spotifyControlRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("spotify.track-saved", "/api/spotify/track-saved", spotifyTrackSavedRoute, { service: "spotify" }),
  route("spotify.oauth.disconnect", "/api/spotify/oauth/disconnect", spotifyOAuthDisconnectRoute, { method: "POST", service: "spotify", rateLimit: "strict" }),
  route("github.oauth.exchange", "/api/github/oauth/exchange", githubOAuthExchangeRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("github.profile", "/api/github/profile", githubProfileRoute, { service: "github" }),
  route("github.oauth.disconnect", "/api/github/oauth/disconnect", githubOAuthDisconnectRoute, { method: "POST", service: "github", rateLimit: "strict" }),
  route("google-calendar.oauth.exchange", "/api/google-calendar/oauth/exchange", googleCalendarOAuthExchangeRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("google-calendar.events", "/api/google-calendar/events", googleCalendarEventsRoute, { service: "google-calendar" }),
  route("google-calendar.oauth.disconnect", "/api/google-calendar/oauth/disconnect", googleCalendarOAuthDisconnectRoute, { method: "POST", service: "google-calendar", rateLimit: "strict" }),
  route("notion.oauth.exchange", "/api/notion/oauth/exchange", notionOAuthExchangeRoute, { method: "POST", service: "notion", rateLimit: "strict" }),
  route("notion.pages", "/api/notion/pages", notionPagesRoute, { service: "notion" }),
  route("notion.oauth.disconnect", "/api/notion/oauth/disconnect", notionOAuthDisconnectRoute, { method: "POST", service: "notion", rateLimit: "strict" }),
  route("todoist.oauth.exchange", "/api/todoist/oauth/exchange", todoistOAuthExchangeRoute, { method: "POST", service: "todoist", rateLimit: "strict" }),
  route("todoist.tasks", "/api/todoist/tasks", todoistTasksRoute, { service: "todoist" }),
  route("todoist.oauth.disconnect", "/api/todoist/oauth/disconnect", todoistOAuthDisconnectRoute, { method: "POST", service: "todoist", rateLimit: "strict" }),
  route("google-drive.oauth.exchange", "/api/google-drive/oauth/exchange", googleDriveOAuthExchangeRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.files", "/api/google-drive/files", googleDriveFilesRoute, { service: "google-drive" }),
  route("google-drive.file", "/api/google-drive/file", googleDriveFileRoute, { service: "google-drive" }),
  route("google-drive.folders", "/api/google-drive/folders", googleDriveFolderCreateRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.files.update", "/api/google-drive/files/update", googleDriveFileUpdateRoute, { method: "PATCH", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.files.trash", "/api/google-drive/files/trash", googleDriveFileTrashRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.files.delete", "/api/google-drive/files/delete", googleDriveFileDeleteRoute, { method: "DELETE", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.quota", "/api/google-drive/quota", googleDriveQuotaRoute, { service: "google-drive" }),
  route("google-drive.upload", "/api/google-drive/upload", googleDriveUploadRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("google-drive.download", "/api/google-drive/download", googleDriveDownloadRoute, { service: "google-drive" }),
  route("google-drive.oauth.disconnect", "/api/google-drive/oauth/disconnect", googleDriveOAuthDisconnectRoute, { method: "POST", service: "google-drive", rateLimit: "strict" }),
  route("cloud.files.sync", "/api/cloud/files/sync", cloudFilesSyncRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.files", "/api/cloud/files", cloudFilesListRoute, { service: "cloud" }),
  route("cloud.files.favorites", "/api/cloud/files/favorites", cloudFilesFavoritesRoute, { service: "cloud" }),
  route("cloud.file", "/api/cloud/file", cloudFileDetailRoute, { service: "cloud" }),
  route("cloud.file.update", "/api/cloud/file", cloudFileUpdateRoute, { method: "PATCH", service: "cloud", rateLimit: "strict" }),
  route("cloud.file.favorite", "/api/cloud/file/favorite", cloudFileFavoriteRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.file.brain", "/api/cloud/file/brain", cloudFileBrainRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.activity", "/api/cloud/activity", cloudActivityListRoute, { service: "cloud" }),
  route("cloud.activity.create", "/api/cloud/activity", cloudActivityCreateRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.activity.summary", "/api/cloud/activity/summary", cloudActivitySummaryRoute, { service: "cloud" }),
  route("cloud.dashboard", "/api/cloud/dashboard", cloudDashboardRoute, { service: "cloud" }),
  route("cloud.cleanup", "/api/cloud/cleanup", cloudCleanupRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.shares.create", "/api/cloud/shares", cloudSharesCreateRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.shares", "/api/cloud/shares", cloudSharesListRoute, { service: "cloud" }),
  route("cloud.shares.resolve", "/api/cloud/shares/resolve", cloudShareResolveRoute, { public: true, service: "cloud", rateLimit: "strict" }),
  route("cloud.shares.download", "/api/cloud/shares/download", cloudShareDownloadRoute, { public: true, service: "cloud", rateLimit: "strict" }),
  route("cloud.shares.revoke", "/api/cloud/shares/revoke", cloudShareRevokeRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.drops.create", "/api/cloud/drops", cloudDropsCreateRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("cloud.drops", "/api/cloud/drops", cloudDropsListRoute, { service: "cloud" }),
  route("cloud.drops.resolve", "/api/cloud/drops/resolve", cloudDropResolveRoute, { public: true, service: "cloud", rateLimit: "strict" }),
  route("cloud.drops.upload", "/api/cloud/drops/upload", cloudDropUploadRoute, { method: "POST", public: true, service: "cloud", rateLimit: "strict" }),
  route("cloud.drops.revoke", "/api/cloud/drops/revoke", cloudDropRevokeRoute, { method: "POST", service: "cloud", rateLimit: "strict" }),
  route("youtube.oauth.exchange", "/api/youtube/oauth/exchange", youtubeOAuthExchangeRoute, { method: "POST", service: "youtube", rateLimit: "strict" }),
  route("youtube.activity", "/api/youtube/activity", youtubeActivityRoute, { service: "youtube" }),
  route("youtube.oauth.disconnect", "/api/youtube/oauth/disconnect", youtubeOAuthDisconnectRoute, { method: "POST", service: "youtube", rateLimit: "strict" }),
  route("reddit.oauth.exchange", "/api/reddit/oauth/exchange", redditOAuthExchangeRoute, { method: "POST", service: "reddit", rateLimit: "strict" }),
  route("reddit.activity", "/api/reddit/activity", redditActivityRoute, { service: "reddit" }),
  route("reddit.oauth.disconnect", "/api/reddit/oauth/disconnect", redditOAuthDisconnectRoute, { method: "POST", service: "reddit", rateLimit: "strict" }),
  route("signout", "/api/signout", signOutRoute, { method: "POST", rateLimit: "standard" }),

  // WebAuthn / Passkey
  route("passkey.register.options", "/api/auth/passkey/register-options", passkeyRegisterOptionsRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("passkey.register", "/api/auth/passkey/register", passkeyRegisterRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("passkey.authenticate.options", "/api/auth/passkey/authenticate-options", passkeyAuthenticateOptionsRoute, { method: "POST", public: true, service: "security", rateLimit: "strict" }),
  route("passkey.authenticate", "/api/auth/passkey/authenticate", passkeyAuthenticateRoute, { method: "POST", public: true, service: "security", rateLimit: "strict" }),
  route("passkey.rename", "/api/auth/passkey/rename", passkeyRenameRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("passkey.revoke", "/api/auth/passkey/revoke", passkeyRevokeRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("passkey.list", "/api/auth/passkeys", passkeyListRoute, { service: "security", rateLimit: "standard" }),

  // OTP fallback
  route("otp.send", "/api/auth/otp/send", otpSendRoute, { method: "POST", public: true, service: "security", rateLimit: "strict" }),
  route("otp.verify", "/api/auth/otp/verify", otpVerifyRoute, { method: "POST", public: true, service: "security", rateLimit: "strict" }),

  // Device management
  route("device.upsert", "/api/auth/device", deviceUpsertRoute, { method: "POST", service: "security", rateLimit: "standard" }),
  route("device.list", "/api/auth/devices", deviceListRoute, { service: "security", rateLimit: "standard" }),
  route("device.trust", "/api/auth/device/trust", deviceTrustRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("device.revoke", "/api/auth/device/revoke", deviceRevokeRoute, { method: "POST", service: "security", rateLimit: "strict" }),
  route("device.remove", "/api/auth/device/remove", deviceRemoveRoute, { method: "POST", service: "security", rateLimit: "strict" }),

  // Security events
  route("security.events", "/api/auth/security-events", securityEventsRoute, { service: "security", rateLimit: "standard" }),

  // Team
  route("team.members.get", "/api/team/members", teamMembersRoute, { service: "team" }),
  route("team.members.post", "/api/team/members", teamMembersRoute, { method: "POST", service: "team", rateLimit: "strict" }),
  route("team.members.patch", "/api/team/members", teamMembersRoute, { method: "PATCH", service: "team", rateLimit: "strict" }),
  route("team.members.delete", "/api/team/members", teamMembersRoute, { method: "DELETE", service: "team", rateLimit: "strict" }),

  // User data (spaces, flows, interactions)
  route("user-data.spaces", "/api/user-data/spaces", userDataRoute, { service: "user-data", action: "space" }),
  route("user-data.spaces.post", "/api/user-data/spaces", userDataRoute, { method: "POST", service: "user-data", action: "space", rateLimit: "strict" }),
  route("user-data.spaces.patch", "/api/user-data/spaces", userDataRoute, { method: "PATCH", service: "user-data", action: "space", rateLimit: "strict" }),
  route("user-data.spaces.delete", "/api/user-data/spaces", userDataRoute, { method: "DELETE", service: "user-data", action: "space", rateLimit: "strict" }),
  route("user-data.flows", "/api/user-data/flows", userDataRoute, { service: "user-data", action: "flow" }),
  route("user-data.flows.post", "/api/user-data/flows", userDataRoute, { method: "POST", service: "user-data", action: "flow", rateLimit: "strict" }),
  route("user-data.flows.patch", "/api/user-data/flows", userDataRoute, { method: "PATCH", service: "user-data", action: "flow", rateLimit: "strict" }),
  route("user-data.flows.delete", "/api/user-data/flows", userDataRoute, { method: "DELETE", service: "user-data", action: "flow", rateLimit: "strict" }),
  route("user-data.interactions", "/api/user-data/interactions", userDataRoute, { service: "user-data", action: "interaction" }),
  route("user-data.interactions.post", "/api/user-data/interactions", userDataRoute, { method: "POST", service: "user-data", action: "interaction", rateLimit: "strict" }),
  route("user-data.interactions.patch", "/api/user-data/interactions", userDataRoute, { method: "PATCH", service: "user-data", action: "interaction", rateLimit: "strict" }),
  route("user-data.interactions.delete", "/api/user-data/interactions", userDataRoute, { method: "DELETE", service: "user-data", action: "interaction", rateLimit: "strict" }),

  // User data (macros, personas, bills)
  route("user-data.macros", "/api/user-data/macros", userDataRoute, { service: "user-data", action: "macro" }),
  route("user-data.macros.post", "/api/user-data/macros", userDataRoute, { method: "POST", service: "user-data", action: "macro", rateLimit: "strict" }),
  route("user-data.macros.patch", "/api/user-data/macros", userDataRoute, { method: "PATCH", service: "user-data", action: "macro", rateLimit: "strict" }),
  route("user-data.macros.delete", "/api/user-data/macros", userDataRoute, { method: "DELETE", service: "user-data", action: "macro", rateLimit: "strict" }),
  route("user-data.personas", "/api/user-data/personas", userDataRoute, { service: "user-data", action: "persona" }),
  route("user-data.personas.post", "/api/user-data/personas", userDataRoute, { method: "POST", service: "user-data", action: "persona", rateLimit: "strict" }),
  route("user-data.personas.patch", "/api/user-data/personas", userDataRoute, { method: "PATCH", service: "user-data", action: "persona", rateLimit: "strict" }),
  route("user-data.personas.delete", "/api/user-data/personas", userDataRoute, { method: "DELETE", service: "user-data", action: "persona", rateLimit: "strict" }),
  route("user-data.bills", "/api/user-data/bills", userDataRoute, { service: "user-data", action: "bill" }),
  route("user-data.bills.post", "/api/user-data/bills", userDataRoute, { method: "POST", service: "user-data", action: "bill", rateLimit: "strict" }),
  route("user-data.bills.patch", "/api/user-data/bills", userDataRoute, { method: "PATCH", service: "user-data", action: "bill", rateLimit: "strict" }),
  route("user-data.bills.delete", "/api/user-data/bills", userDataRoute, { method: "DELETE", service: "user-data", action: "bill", rateLimit: "strict" }),

  // Profile
  route("profile.get", "/api/profile", profileRoute, { service: "profile" }),
  route("profile.post", "/api/profile", profileRoute, { method: "POST", service: "profile", rateLimit: "strict" }),
  route("profile.patch", "/api/profile", profileRoute, { method: "PATCH", service: "profile", rateLimit: "strict" }),

  // Workspace profiles (tied to user account)
  route("profiles.get", "/api/profiles", profilesRoute, { service: "profile" }),
  route("profiles.create", "/api/profiles", profilesRoute, { method: "POST", service: "profile", rateLimit: "strict" }),
  route("profiles.activate", "/api/profiles/activate", profilesRoute, { method: "POST", action: "activate", service: "profile", rateLimit: "strict" }),
  route("profiles.patch", "/api/profiles", profilesRoute, { method: "PATCH", service: "profile", rateLimit: "strict" }),
  route("profiles.delete", "/api/profiles", profilesRoute, { method: "DELETE", service: "profile", rateLimit: "strict" }),

  // Mail
  route("mail.alias", "/api/mail/alias", mailAliasRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.alias.create", "/api/mail/alias", mailAliasRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.inbox", "/api/mail/inbox", mailInboxRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.thread", "/api/mail/thread", mailThreadRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.read", "/api/mail/read", mailReadRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.send", "/api/mail/send", mailSendRoute, { method: "POST", service: "mail", rateLimit: "strict" }),
  route("mail.drafts", "/api/mail/drafts", mailDraftsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.drafts.save", "/api/mail/drafts", mailDraftsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.drafts.delete", "/api/mail/drafts", mailDraftsRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.move", "/api/mail/move", mailMoveRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.search", "/api/mail/search", mailSearchRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.labels", "/api/mail/labels", mailLabelsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.labels.create", "/api/mail/labels", mailLabelsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.labels.assign", "/api/mail/labels", mailLabelsRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),
  route("mail.labels.delete", "/api/mail/labels", mailLabelsRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.contacts", "/api/mail/contacts", mailContactsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.signatures", "/api/mail/signatures", mailSignaturesRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.signatures.save", "/api/mail/signatures", mailSignaturesRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.signatures.delete", "/api/mail/signatures", mailSignaturesRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.templates", "/api/mail/templates", mailTemplatesRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.templates.create", "/api/mail/templates", mailTemplatesRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.templates.update", "/api/mail/templates", mailTemplatesRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),
  route("mail.templates.delete", "/api/mail/templates", mailTemplatesRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.snooze", "/api/mail/snooze", mailSnoozeRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.bulk", "/api/mail/bulk", mailBulkActionRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.schedule", "/api/mail/schedule", mailScheduleRoute, { method: "POST", service: "mail", rateLimit: "strict" }),
  route("mail.analytics", "/api/mail/analytics", mailAnalyticsRoute, { service: "mail", rateLimit: "standard" }),

  // Mail security
  route("mail.blocked", "/api/mail/blocked", mailBlockedRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.block", "/api/mail/blocked", mailBlockedRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.unblock", "/api/mail/blocked", mailBlockedRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.trusted", "/api/mail/trusted", mailTrustedRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.trust", "/api/mail/trusted", mailTrustedRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.untrust", "/api/mail/trusted", mailTrustedRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),

  // Mail brain
  route("mail.analyze", "/api/mail/analyze", mailAnalyzeRoute, { method: "POST", service: "mail", rateLimit: "strict" }),
  route("mail.suggest", "/api/mail/suggest", mailSuggestRoute, { method: "POST", service: "mail", rateLimit: "strict" }),
  route("mail.extract", "/api/mail/extract", mailExtractRoute, { method: "POST", service: "mail", rateLimit: "strict" }),
  route("mail.rules", "/api/mail/rules", mailRulesRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.rules.create", "/api/mail/rules", mailRulesRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.rules.update", "/api/mail/rules", mailRulesRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),
  route("mail.rules.delete", "/api/mail/rules", mailRulesRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.notifications", "/api/mail/notifications", mailNotificationsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.notifications.read", "/api/mail/notifications", mailNotificationsRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),

  // Mail accounts
  route("mail.accounts", "/api/mail/accounts", mailAccountsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.accounts.create", "/api/mail/accounts", mailAccountsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.accounts.update", "/api/mail/accounts", mailAccountsRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),
  route("mail.accounts.delete", "/api/mail/accounts", mailAccountsRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.accounts.sync", "/api/mail/accounts/sync", mailAccountsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),

  // PGP-style keys
  route("mail.pgp.keys", "/api/mail/pgp/keys", mailPgpRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.pgp.keys.create", "/api/mail/pgp/keys", mailPgpRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.pgp.keys.delete", "/api/mail/pgp/keys", mailPgpRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.pgp.keys.generate", "/api/mail/pgp/generate", mailPgpRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.pgp.encrypt", "/api/mail/pgp/encrypt", mailPgpRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.pgp.decrypt", "/api/mail/pgp/decrypt", mailPgpRoute, { method: "POST", service: "mail", rateLimit: "standard" }),

  // Web push
  route("mail.push.vapid", "/api/mail/push/vapid-public-key", mailPushRoute, { public: true, service: "mail", rateLimit: "edge" }),
  route("mail.push.subscriptions", "/api/mail/push/subscriptions", mailPushRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.push.subscribe", "/api/mail/push/subscribe", mailPushRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.push.unsubscribe", "/api/mail/push/subscribe", mailPushRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.push.send", "/api/mail/push/send", mailPushRoute, { method: "POST", service: "mail", rateLimit: "standard" }),

  // Mailing lists
  route("mail.lists", "/api/mail/lists", mailListsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.lists.create", "/api/mail/lists", mailListsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.lists.update", "/api/mail/lists", mailListsRoute, { method: "PATCH", service: "mail", rateLimit: "standard" }),
  route("mail.lists.delete", "/api/mail/lists", mailListsRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.lists.members", "/api/mail/lists/members", mailListsRoute, { service: "mail", rateLimit: "standard" }),
  route("mail.lists.members.add", "/api/mail/lists/members", mailListsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),
  route("mail.lists.members.remove", "/api/mail/lists/members", mailListsRoute, { method: "DELETE", service: "mail", rateLimit: "standard" }),
  route("mail.lists.send", "/api/mail/lists/send", mailListsRoute, { method: "POST", service: "mail", rateLimit: "standard" }),

  // Connections
  route("connections.list", "/api/connections", connectionsListRoute, { service: "sync" }),
  route("provider-credentials", "/api/provider-credentials", providerCredentialsRoute, { service: "sync" }),
  route("provider-credentials.post", "/api/provider-credentials", providerCredentialsRoute, { method: "POST", service: "sync", rateLimit: "strict" }),
  route("provider-credentials.delete", "/api/provider-credentials", providerCredentialsRoute, { method: "DELETE", service: "sync", rateLimit: "strict" }),

  // Sync (notes, tasks, events)
  route("items.notes", "/api/notes", itemsRoute, { service: "sync", action: "note" }),
  route("items.notes.create", "/api/notes", itemsRoute, { method: "POST", service: "sync", action: "note" }),
  route("items.notes.update", "/api/notes", itemsRoute, { method: "PATCH", service: "sync", action: "note" }),
  route("items.notes.delete", "/api/notes", itemsRoute, { method: "DELETE", service: "sync", action: "note" }),
  route("items.tasks", "/api/tasks", itemsRoute, { service: "sync", action: "task" }),
  route("items.tasks.create", "/api/tasks", itemsRoute, { method: "POST", service: "sync", action: "task" }),
  route("items.tasks.update", "/api/tasks", itemsRoute, { method: "PATCH", service: "sync", action: "task" }),
  route("items.tasks.delete", "/api/tasks", itemsRoute, { method: "DELETE", service: "sync", action: "task" }),
  route("items.events", "/api/events", itemsRoute, { service: "sync", action: "event" }),
  route("items.events.create", "/api/events", itemsRoute, { method: "POST", service: "sync", action: "event" }),
  route("items.events.update", "/api/events", itemsRoute, { method: "PATCH", service: "sync", action: "event" }),
  route("items.events.delete", "/api/events", itemsRoute, { method: "DELETE", service: "sync", action: "event" }),

  // Webhook
  route("webhooks.mail", "/api/webhooks/mail", webhookMailRoute, { method: "POST", public: true, rateLimit: "standard" })
]);

function normalizedPath(pathname) {
  const path = String(pathname || "/").replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

export function findRoute(method, pathname) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const path = normalizedPath(pathname);
  return ROUTES.find((candidate) => candidate.method === normalizedMethod && candidate.path === path) || null;
}

export function routesForPath(pathname) {
  const path = normalizedPath(pathname);
  return ROUTES.filter((candidate) => candidate.path === path);
}
