import { externalServicesConfig } from "./external-services-config.mjs";

const OPERATIONS = Object.freeze({
  health: Object.freeze({ path: "/health", auth: false, params: [] }),
  diagnostic: Object.freeze({ path: "/api/diagnostic", auth: true, params: ["service"] }),
  steamPlayer: Object.freeze({ path: "/api/steam/player", auth: true, params: ["steamId"] }),
  steamRecentGames: Object.freeze({ path: "/api/steam/recent-games", auth: true, params: ["steamId", "count"] }),
  steamOwnedGames: Object.freeze({ path: "/api/steam/owned-games", auth: true, params: ["steamId", "limit"] }),
  steamAchievements: Object.freeze({ path: "/api/steam/achievements", auth: true, params: ["steamId", "appId"] }),
  trackerApexProfile: Object.freeze({ path: "/api/tracker/apex-profile", auth: true, params: ["platform", "identifier"] }),
  trackerValorantProfile: Object.freeze({ path: "/api/tracker/valorant-profile", auth: true, params: ["name", "tag"] }),
  trackerLolProfile: Object.freeze({ path: "/api/tracker/lol-profile", auth: true, params: ["name", "tag"] }),
  trackerApexMatches: Object.freeze({ path: "/api/tracker/apex-matches", auth: true, params: ["platform", "identifier", "mode"] }),
  trackerValorantMatches: Object.freeze({ path: "/api/tracker/valorant-matches", auth: true, params: ["name", "tag", "mode"] }),
  trackerLolMatches: Object.freeze({ path: "/api/tracker/lol-matches", auth: true, params: ["name", "tag", "mode"] }),
  twitchChannel: Object.freeze({ path: "/api/twitch/channel", auth: true, params: ["login"] }),
  lastFmRecentTracks: Object.freeze({ path: "/api/lastfm/recent-tracks", auth: true, params: ["username", "limit"] }),
  lastFmTopArtists: Object.freeze({ path: "/api/lastfm/top-artists", auth: true, params: ["username", "period", "limit"] }),
  lastFmTopTracks: Object.freeze({ path: "/api/lastfm/top-tracks", auth: true, params: ["username", "period", "limit"] }),
  lanyardPresence: Object.freeze({ path: "/api/lanyard/presence", auth: true, params: ["userId"] }),
  nowPlaying: Object.freeze({ path: "/api/now-playing", auth: true, params: ["source", "username", "userId"] }),
  weatherForecast: Object.freeze({ path: "/api/weather", auth: true, params: ["city"] }),
  minecraftProfile: Object.freeze({ path: "/api/minecraft/profile", auth: true, params: ["username"] }),
  spotifyOAuthExchange: Object.freeze({ path: "/api/spotify/oauth/exchange", method: "POST", auth: true, params: ["code", "codeVerifier", "clientId"] }),
  spotifyNowPlaying: Object.freeze({ path: "/api/spotify/now-playing", auth: true, params: ["clientId"] }),
  spotifyControl: Object.freeze({ path: "/api/spotify/control", method: "POST", auth: true, params: ["action", "clientId", "trackId"] }),
  spotifyTrackSaved: Object.freeze({ path: "/api/spotify/track-saved", auth: true, params: ["clientId", "trackId"] }),
  spotifyOAuthDisconnect: Object.freeze({ path: "/api/spotify/oauth/disconnect", method: "POST", auth: true, params: [] }),
  githubOAuthExchange: Object.freeze({ path: "/api/github/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  githubProfile: Object.freeze({ path: "/api/github/profile", auth: true, params: [] }),
  githubOAuthDisconnect: Object.freeze({ path: "/api/github/oauth/disconnect", method: "POST", auth: true, params: [] }),
  googleCalendarOAuthExchange: Object.freeze({ path: "/api/google-calendar/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  googleCalendarEvents: Object.freeze({ path: "/api/google-calendar/events", auth: true, params: ["clientId"] }),
  googleCalendarOAuthDisconnect: Object.freeze({ path: "/api/google-calendar/oauth/disconnect", method: "POST", auth: true, params: [] }),
  notionOAuthExchange: Object.freeze({ path: "/api/notion/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  notionPages: Object.freeze({ path: "/api/notion/pages", auth: true, params: [] }),
  notionOAuthDisconnect: Object.freeze({ path: "/api/notion/oauth/disconnect", method: "POST", auth: true, params: [] }),
  todoistOAuthExchange: Object.freeze({ path: "/api/todoist/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  todoistTasks: Object.freeze({ path: "/api/todoist/tasks", auth: true, params: [] }),
  todoistOAuthDisconnect: Object.freeze({ path: "/api/todoist/oauth/disconnect", method: "POST", auth: true, params: [] }),
  googleDriveOAuthExchange: Object.freeze({ path: "/api/google-drive/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  googleDriveFiles: Object.freeze({ path: "/api/google-drive/files", auth: true, params: ["clientId", "parentId", "q", "pageToken", "pageSize", "orderBy"] }),
  googleDriveFile: Object.freeze({ path: "/api/google-drive/file", auth: true, params: ["clientId", "id"] }),
  googleDriveFolderCreate: Object.freeze({ path: "/api/google-drive/folders", method: "POST", auth: true, params: ["clientId", "name", "parentId"] }),
  googleDriveFileUpdate: Object.freeze({ path: "/api/google-drive/files/update", method: "PATCH", auth: true, params: ["clientId", "fileId", "name", "addParents", "removeParents"] }),
  googleDriveFileTrash: Object.freeze({ path: "/api/google-drive/files/trash", method: "POST", auth: true, params: ["clientId", "fileId"] }),
  googleDriveFileDelete: Object.freeze({ path: "/api/google-drive/files/delete", method: "DELETE", auth: true, params: ["clientId", "fileId"] }),
  googleDriveQuota: Object.freeze({ path: "/api/google-drive/quota", auth: true, params: ["clientId"] }),
  googleDriveUpload: Object.freeze({ path: "/api/google-drive/upload", method: "POST", auth: true, upload: true }),
  googleDriveDownload: Object.freeze({ path: "/api/google-drive/download", auth: true, params: ["clientId", "fileId"], download: true }),
  googleDriveOAuthDisconnect: Object.freeze({ path: "/api/google-drive/oauth/disconnect", method: "POST", auth: true, params: [] }),
  cloudFilesSync: Object.freeze({ path: "/api/cloud/files/sync", method: "POST", auth: true, rawBody: true }),
  cloudFilesList: Object.freeze({ path: "/api/cloud/files", auth: true, params: ["parentId", "trashed", "q", "limit", "offset"] }),
  cloudFilesFavorites: Object.freeze({ path: "/api/cloud/files/favorites", auth: true, params: ["limit"] }),
  cloudFileDetail: Object.freeze({ path: "/api/cloud/file", auth: true, params: ["driveFileId"] }),
  cloudFileUpdate: Object.freeze({ path: "/api/cloud/file", method: "PATCH", auth: true, params: ["driveFileId", "parentId", "name", "trashed", "tags", "brainSummary", "brainSuggestedFolderId"] }),
  cloudFileFavorite: Object.freeze({ path: "/api/cloud/file/favorite", method: "POST", auth: true, params: ["driveFileId", "favorite"] }),
  cloudFileBrain: Object.freeze({ path: "/api/cloud/file/brain", method: "POST", auth: true, params: ["driveFileId"], rawBody: true }),
  cloudActivityList: Object.freeze({ path: "/api/cloud/activity", auth: true, params: ["limit", "since"] }),
  cloudActivitySummary: Object.freeze({ path: "/api/cloud/activity/summary", auth: true, params: [] }),
  cloudDashboard: Object.freeze({ path: "/api/cloud/dashboard", auth: true, params: [] }),
  cloudCleanup: Object.freeze({ path: "/api/cloud/cleanup", method: "POST", auth: true, params: [] }),
  cloudSharesCreate: Object.freeze({ path: "/api/cloud/shares", method: "POST", auth: true, params: ["fileId", "visibility", "password", "expiresAt", "maxDownloads"], rawBody: true }),
  cloudSharesList: Object.freeze({ path: "/api/cloud/shares", auth: true, params: ["fileId", "limit"] }),
  cloudShareResolve: Object.freeze({ path: "/api/cloud/shares/resolve", auth: false, params: ["slug", "password"] }),
  cloudShareDownload: Object.freeze({ path: "/api/cloud/shares/download", auth: false, params: ["slug", "password"], download: true }),
  cloudShareRevoke: Object.freeze({ path: "/api/cloud/shares/revoke", method: "POST", auth: true, params: ["slug", "shareId"], rawBody: true }),
  cloudDropsCreate: Object.freeze({ path: "/api/cloud/drops", method: "POST", auth: true, params: ["title", "description", "visibility", "password", "expiresAt", "maxFiles", "maxSize", "driveClientId"], rawBody: true }),
  cloudDropsList: Object.freeze({ path: "/api/cloud/drops", auth: true, params: ["limit"] }),
  cloudDropResolve: Object.freeze({ path: "/api/cloud/drops/resolve", auth: false, params: ["slug", "password"] }),
  cloudDropUpload: Object.freeze({ path: "/api/cloud/drops/upload", method: "POST", auth: false, params: ["slug", "password"], upload: true }),
  cloudDropRevoke: Object.freeze({ path: "/api/cloud/drops/revoke", method: "POST", auth: true, params: ["slug"], rawBody: true }),
  youtubeOAuthExchange: Object.freeze({ path: "/api/youtube/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  youtubeActivity: Object.freeze({ path: "/api/youtube/activity", auth: true, params: ["clientId"] }),
  youtubeOAuthDisconnect: Object.freeze({ path: "/api/youtube/oauth/disconnect", method: "POST", auth: true, params: [] }),
  redditOAuthExchange: Object.freeze({ path: "/api/reddit/oauth/exchange", method: "POST", auth: true, params: ["code", "clientId"] }),
  redditActivity: Object.freeze({ path: "/api/reddit/activity", auth: true, params: ["clientId"] }),
  redditOAuthDisconnect: Object.freeze({ path: "/api/reddit/oauth/disconnect", method: "POST", auth: true, params: [] }),
  publicProfile: Object.freeze({ path: "/api/supabase/public-profile", auth: true, params: ["username"] }),
  brainComplete: Object.freeze({ path: "/api/brain/complete", method: "POST", auth: true, params: [], rawBody: true }),
  passkeyRegisterOptions: Object.freeze({ path: "/api/auth/passkey/register-options", method: "POST", auth: true, params: ["email", "name", "deviceName"] }),
  passkeyRegister: Object.freeze({ path: "/api/auth/passkey/register", method: "POST", auth: true, params: ["response", "deviceId"] }),
  passkeyAuthenticateOptions: Object.freeze({ path: "/api/auth/passkey/authenticate-options", method: "POST", auth: false, params: ["email", "userId"] }),
  passkeyAuthenticate: Object.freeze({ path: "/api/auth/passkey/authenticate", method: "POST", auth: false, params: ["response"] }),
  passkeyRename: Object.freeze({ path: "/api/auth/passkey/rename", method: "POST", auth: true, params: ["passkeyId", "name"] }),
  passkeyRevoke: Object.freeze({ path: "/api/auth/passkey/revoke", method: "POST", auth: true, params: ["passkeyId"] }),
  otpSend: Object.freeze({ path: "/api/auth/otp/send", method: "POST", auth: false, params: ["email", "userId"] }),
  otpVerify: Object.freeze({ path: "/api/auth/otp/verify", method: "POST", auth: false, params: ["userId", "email", "code"] }),
  deviceUpsert: Object.freeze({ path: "/api/auth/device", method: "POST", auth: true, params: ["name"] }),
  deviceList: Object.freeze({ path: "/api/auth/devices", auth: true, params: [] }),
  deviceTrust: Object.freeze({ path: "/api/auth/device/trust", method: "POST", auth: true, params: ["deviceId", "trusted"] }),
  deviceRevoke: Object.freeze({ path: "/api/auth/device/revoke", method: "POST", auth: true, params: ["deviceId"] }),
  deviceRemove: Object.freeze({ path: "/api/auth/device/remove", method: "POST", auth: true, params: ["deviceId"] }),
  securityEvents: Object.freeze({ path: "/api/auth/security-events", auth: true, params: ["limit"] }),
  teamInvite: Object.freeze({ path: "/api/team/invite", method: "POST", auth: true, params: ["email", "display_name", "invite_url", "token"], rawBody: true }),
  mailAlias: Object.freeze({ path: "/api/mail/alias", auth: true, params: [] }),
  mailInbox: Object.freeze({ path: "/api/mail/inbox", auth: true, params: ["folder", "label", "search", "direction", "limit", "offset"] }),
  mailThread: Object.freeze({ path: "/api/mail/thread", auth: true, params: ["thread_id"] }),
  mailRead: Object.freeze({ path: "/api/mail/read", method: "POST", auth: true, params: ["id", "is_read", "is_starred", "is_important"], rawBody: true }),
  mailSend: Object.freeze({ path: "/api/mail/send", method: "POST", auth: true, params: ["to", "cc", "bcc", "subject", "text", "html", "from_name", "reply_to", "attachments", "draft_id", "in_reply_to", "references"], rawBody: true }),
  mailSearch: Object.freeze({ path: "/api/mail/search", auth: true, params: ["q", "limit", "offset"] }),
  mailAdvancedSearch: Object.freeze({ path: "/api/mail/search", auth: true, params: ["from", "subject", "body", "date_from", "date_to", "has_attachments", "labels", "folder", "q", "limit", "offset"] }),
  mailTemplates: Object.freeze({ path: "/api/mail/templates", auth: true, params: ["limit"] }),
  mailTemplateSave: Object.freeze({ path: "/api/mail/templates", method: "POST", auth: true, params: ["id", "name", "subject", "content", "is_default"], rawBody: true }),
  mailTemplateUpdate: Object.freeze({ path: "/api/mail/templates", method: "PATCH", auth: true, params: ["id", "name", "subject", "content", "is_default"], rawBody: true }),
  mailTemplateDelete: Object.freeze({ path: "/api/mail/templates", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailDrafts: Object.freeze({ path: "/api/mail/drafts", auth: true, params: ["folder", "limit", "offset"] }),
  mailDraftSave: Object.freeze({ path: "/api/mail/drafts", method: "POST", auth: true, params: ["id", "to", "cc", "bcc", "subject", "text", "html"], rawBody: true }),
  mailDraftDelete: Object.freeze({ path: "/api/mail/drafts", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailMove: Object.freeze({ path: "/api/mail/move", method: "POST", auth: true, params: ["ids", "folder"], rawBody: true }),
  mailLabels: Object.freeze({ path: "/api/mail/labels", auth: true, params: [] }),
  mailLabelSave: Object.freeze({ path: "/api/mail/labels", method: "POST", auth: true, params: ["name", "color"], rawBody: true }),
  mailLabelDelete: Object.freeze({ path: "/api/mail/labels", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailLabelAssign: Object.freeze({ path: "/api/mail/labels", method: "PATCH", auth: true, params: ["ids", "label", "remove"], rawBody: true }),
  mailContacts: Object.freeze({ path: "/api/mail/contacts", auth: true, params: ["limit"] }),
  mailSignatures: Object.freeze({ path: "/api/mail/signatures", auth: true, params: [] }),
  mailSignatureSave: Object.freeze({ path: "/api/mail/signatures", method: "POST", auth: true, params: ["id", "name", "content", "is_default"], rawBody: true }),
  mailSignatureDelete: Object.freeze({ path: "/api/mail/signatures", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailAnalyze: Object.freeze({ path: "/api/mail/analyze", method: "POST", auth: true, params: ["id"], rawBody: true }),
  mailSuggest: Object.freeze({ path: "/api/mail/suggest", method: "POST", auth: true, params: ["id"], rawBody: true }),
  mailExtract: Object.freeze({ path: "/api/mail/extract", method: "POST", auth: true, params: ["id"], rawBody: true }),
  mailRules: Object.freeze({ path: "/api/mail/rules", auth: true, params: ["limit"] }),
  mailRuleSave: Object.freeze({ path: "/api/mail/rules", method: "POST", auth: true, params: ["id", "name", "is_active", "priority", "condition_from", "condition_domain", "condition_subject", "condition_body", "condition_has_attachments", "action_mark_read", "action_mark_important", "action_mark_spam", "action_archive", "action_move_to", "action_label", "action_forward_to", "action_auto_reply"], rawBody: true }),
  mailRuleUpdate: Object.freeze({ path: "/api/mail/rules", method: "PATCH", auth: true, params: ["id", "name", "is_active", "priority", "condition_from", "condition_domain", "condition_subject", "condition_body", "condition_has_attachments", "action_mark_read", "action_mark_important", "action_mark_spam", "action_archive", "action_move_to", "action_label", "action_forward_to", "action_auto_reply"], rawBody: true }),
  mailRuleDelete: Object.freeze({ path: "/api/mail/rules", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailNotifications: Object.freeze({ path: "/api/mail/notifications", auth: true, params: ["unread", "limit"] }),
  mailNotificationRead: Object.freeze({ path: "/api/mail/notifications", method: "PATCH", auth: true, params: ["id", "is_read"], rawBody: true }),
  mailSnooze: Object.freeze({ path: "/api/mail/snooze", method: "POST", auth: true, params: ["id", "snoozed_until"], rawBody: true }),
  mailBulk: Object.freeze({ path: "/api/mail/bulk", method: "POST", auth: true, params: ["ids", "action", "target"], rawBody: true }),
  mailSchedule: Object.freeze({ path: "/api/mail/schedule", method: "POST", auth: true, params: ["to", "cc", "bcc", "subject", "text", "html", "attachments", "scheduled_at"], rawBody: true }),
  mailAnalytics: Object.freeze({ path: "/api/mail/analytics", auth: true, params: ["period", "folder"] }),
  mailBlocked: Object.freeze({ path: "/api/mail/blocked", auth: true, params: ["limit"] }),
  mailBlock: Object.freeze({ path: "/api/mail/blocked", method: "POST", auth: true, params: ["email", "domain", "reason"], rawBody: true }),
  mailUnblock: Object.freeze({ path: "/api/mail/blocked", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailTrusted: Object.freeze({ path: "/api/mail/trusted", auth: true, params: ["limit"] }),
  mailTrust: Object.freeze({ path: "/api/mail/trusted", method: "POST", auth: true, params: ["email", "domain"], rawBody: true }),
  mailUntrust: Object.freeze({ path: "/api/mail/trusted", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailAccounts: Object.freeze({ path: "/api/mail/accounts", auth: true, params: ["limit"] }),
  mailAccountCreate: Object.freeze({ path: "/api/mail/accounts", method: "POST", auth: true, params: ["provider", "email", "label", "credentials"], rawBody: true }),
  mailAccountUpdate: Object.freeze({ path: "/api/mail/accounts", method: "PATCH", auth: true, params: ["id", "provider", "email", "label", "credentials"], rawBody: true }),
  mailAccountDelete: Object.freeze({ path: "/api/mail/accounts", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailAccountSync: Object.freeze({ path: "/api/mail/accounts/sync", method: "POST", auth: true, params: ["id"], rawBody: true }),
  mailPgpKeys: Object.freeze({ path: "/api/mail/pgp/keys", auth: true, params: ["email", "fingerprint"] }),
  mailPgpKeyCreate: Object.freeze({ path: "/api/mail/pgp/keys", method: "POST", auth: true, params: ["email", "public_key", "private_key", "passphrase", "name"], rawBody: true }),
  mailPgpKeyDelete: Object.freeze({ path: "/api/mail/pgp/keys", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailPgpEncrypt: Object.freeze({ path: "/api/mail/pgp/encrypt", method: "POST", auth: true, params: ["body", "public_key", "armored"], rawBody: true }),
  mailPgpDecrypt: Object.freeze({ path: "/api/mail/pgp/decrypt", method: "POST", auth: true, params: ["body", "passphrase"], rawBody: true }),
  mailPushSubscriptions: Object.freeze({ path: "/api/mail/push/subscriptions", auth: true, params: [] }),
  mailPushSubscribe: Object.freeze({ path: "/api/mail/push/subscribe", method: "POST", auth: true, params: ["endpoint", "p256dh", "auth", "email", "keys"], rawBody: true }),
  mailPushUnsubscribe: Object.freeze({ path: "/api/mail/push/subscribe", method: "DELETE", auth: true, params: ["endpoint", "email"], rawBody: true }),
  mailPushSend: Object.freeze({ path: "/api/mail/push/send", method: "POST", auth: true, params: ["title", "body", "endpoint"], rawBody: true }),
  mailPushVapidKey: Object.freeze({ path: "/api/mail/push/vapidkey", auth: true, params: [] }),
  mailLists: Object.freeze({ path: "/api/mail/lists", auth: true, params: ["limit"] }),
  mailListCreate: Object.freeze({ path: "/api/mail/lists", method: "POST", auth: true, params: ["name", "description", "address"], rawBody: true }),
  mailListUpdate: Object.freeze({ path: "/api/mail/lists", method: "PATCH", auth: true, params: ["id", "name", "description", "address"], rawBody: true }),
  mailListDelete: Object.freeze({ path: "/api/mail/lists", method: "DELETE", auth: true, params: ["id"], rawBody: true }),
  mailListMembers: Object.freeze({ path: "/api/mail/lists/members", auth: true, params: ["list_id"] }),
  mailListMemberAdd: Object.freeze({ path: "/api/mail/lists/members", method: "POST", auth: true, params: ["list_id", "email", "name"], rawBody: true }),
  mailListMemberDelete: Object.freeze({ path: "/api/mail/lists/members", method: "DELETE", auth: true, params: ["list_id", "email"], rawBody: true })
});

function clientError(code, message, details = {}) {
  const error = new Error(String(message || "Le service externe est indisponible.").slice(0, 240));
  error.name = "ExternalServicesError";
  error.code = String(code || "EXTERNAL_SERVICE_ERROR").slice(0, 80);
  error.status = Number(details.status) || 0;
  error.retryable = details.retryable === true;
  error.requestId = String(details.requestId || "").slice(0, 80);
  error.retryAfter = Math.max(0, Number(details.retryAfter) || 0);
  error.detail = details.detail ?? null;
  return error;
}

function validBaseUrl(value, environment) {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !(environment === "development" && loopback && url.protocol === "http:")) {
    throw new TypeError("External services URL must use HTTPS.");
  }
  return url.origin;
}

export function createExternalServicesClient(options = {}) {
  const runtime = options.runtime || globalThis;
  const network = options.network;
  const auth = options.auth;
  const config = options.config || externalServicesConfig(runtime);
  if (!network?.requestJSON) {
    if (runtime.console) runtime.console.error("ExternalServicesClient requires a network client");
    return createDegradedExternalServicesClient(runtime, config);
  }
  if (!auth?.getClient) {
    if (runtime.console) runtime.console.error("ExternalServicesClient requires an auth adapter");
    return createDegradedExternalServicesClient(runtime, config);
  }
  const baseUrl = validBaseUrl(config.baseUrl, config.environment);
  const activeControllers = new Set();
  let destroyed = false;
  let status = Object.freeze({
    workerConnected: false,
    lastLatencyMs: null,
    lastError: "",
    lastCheckedAt: null,
    requests: 0,
    successes: 0,
    failures: 0,
    cache: null,
    rateLimit: null,
    services: Object.freeze([]),
    lastRequestId: ""
  });

  function publish(patch) {
    status = Object.freeze({ ...status, ...patch });
  }

  async function accessToken() {
    const client = await auth.getClient();
    if (!client?.auth?.getSession) throw clientError("AUTH_REQUIRED", "La session Supabase est indisponible.", { status: 401 });
    const response = await client.auth.getSession();
    const token = response?.data?.session?.access_token;
    if (response?.error || typeof token !== "string" || token.length < 20) {
      throw clientError("AUTH_REQUIRED", "Reconnectez-vous pour utiliser cette intégration.", { status: 401 });
    }
    return token;
  }

  async function execute(operationName, values = {}, requestOptions = {}) {
    if (destroyed) throw clientError("CLIENT_DESTROYED", "Le client des intégrations est ferme.");
    const operation = OPERATIONS[operationName];
    if (!operation) throw clientError("OPERATION_NOT_ALLOWED", "Cette opération externe n'est pas autorisee.", { status: 400 });
    const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
    const method = allowedMethods.has(String(operation.method).toUpperCase()) ? String(operation.method).toUpperCase() : "GET";
    const url = new URL(operation.path, `${baseUrl}/`);
    const sendsBody = operation.rawBody === true || ["POST", "PUT", "PATCH"].includes(method);
    let body;
    if (sendsBody) {
      body = operation.rawBody === true ? JSON.stringify(values || {}) : JSON.stringify(Object.fromEntries(operation.params
        .map((name) => [name, values?.[name]])
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim())));
    } else {
      operation.params.forEach((name) => {
        const value = values?.[name];
        if (value !== undefined && value !== null && String(value).trim()) url.searchParams.set(name, String(value).trim());
      });
    }
    const controller = new AbortController();
    activeControllers.add(controller);
    const startedAt = Date.now();
    publish({ requests: status.requests + 1, lastError: "" });
    try {
      const headers = new Headers({ accept: "application/json", "x-request-id": runtime.crypto?.randomUUID?.() || `${Date.now()}-ethone` });
      if (sendsBody) headers.set("content-type", "application/json");
      if (operation.auth) headers.set("authorization", `Bearer ${await accessToken()}`);
      if (destroyed || controller.signal.aborted) throw clientError("CLIENT_DESTROYED", "Le client des intégrations est ferme.");
      let payload;
      if (operation.upload) {
        const file = values?.file;
        if (!file) throw clientError("INVALID_PARAMETER", "Aucun fichier fourni pour l'upload.");
        headers.set("x-ethone-client-id", String(values?.clientId || "").slice(0, 100));
        headers.set("x-ethone-file-name", String(values?.name || file.name || "untitled").slice(0, 500));
        headers.set("x-ethone-file-size", String(Number(file.size) || 0));
        headers.set("x-ethone-file-mime", String(file.type || values?.mimeType || "application/octet-stream").slice(0, 120));
        if (values?.parentId) headers.set("x-ethone-file-parent", String(values.parentId).slice(0, 128));
        headers.delete("content-type");
        const response = await network.request(url.href, {
          method,
          body: file,
          headers,
          signal: controller.signal,
          timeoutMs: requestOptions.timeoutMs || 120000,
          retries: 0
        });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw clientError("UPLOAD_FAILED", text || "L'upload a échoué.", { status: response.status });
        }
        payload = await response.json();
      } else if (operation.download) {
        const response = await network.request(url.href, {
          method,
          body,
          headers,
          signal: controller.signal,
          timeoutMs: requestOptions.timeoutMs || 120000,
          retries: 1
        });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw clientError("DOWNLOAD_FAILED", text || "Le téléchargement a échoué.", { status: response.status });
        }
        return Object.freeze({ blob: await response.blob(), meta: Object.freeze({}) });
      } else {
        payload = await network.requestJSON(url.href, {
          method,
          body,
          headers,
          signal: controller.signal,
          timeoutMs: requestOptions.timeoutMs || 8000,
          retries: requestOptions.retries ?? (method === "GET" ? 1 : 0),
          dedupeKey: `ethone-worker:${operationName}:${method === "GET" ? url.search : body}`,
          maxResponseBytes: 1024 * 1024
        });
      }
      if (!payload || payload.ok !== true || typeof payload.meta !== "object") {
        throw clientError(payload?.error?.code, payload?.error?.message || "Réponse Worker invalide.", payload?.error || {});
      }
      const latencyMs = Date.now() - startedAt;
      const result = Object.freeze({ ...payload, meta: Object.freeze({ ...payload.meta, latencyMs }) });
      publish({
        workerConnected: true,
        lastLatencyMs: latencyMs,
        lastCheckedAt: new Date().toISOString(),
        successes: status.successes + 1,
        cache: payload.data?.cache || Object.freeze({ cached: payload.meta.cached === true }),
        rateLimit: payload.meta?.rateLimit || payload.data?.rateLimit || status.rateLimit,
        services: Array.isArray(payload.data?.services) ? Object.freeze(payload.data.services.map((entry) => Object.freeze({
          id: String(entry?.id || "").slice(0, 40),
          available: entry?.available === true,
          routeEnabled: entry?.routeEnabled === true
        }))) : status.services,
        lastRequestId: String(payload.meta.requestId || "").slice(0, 80)
      });
      return result;
    } catch (error) {
      const safeMessage = network.redactMessage?.(error?.message) || "Le Worker ETHONE est indisponible.";
      const reachedWorker = error?.name === "NetworkHttpError" && Number(error?.status) > 0;
      publish({
        workerConnected: reachedWorker ? true : error?.code === "AUTH_REQUIRED" ? status.workerConnected : false,
        lastLatencyMs: Date.now() - startedAt,
        lastError: safeMessage,
        lastCheckedAt: new Date().toISOString(),
        failures: status.failures + 1,
        lastRequestId: String(error?.requestId || "").slice(0, 80)
      });
      if (error?.name === "ExternalServicesError") throw error;
      throw clientError(error?.code, safeMessage, error);
    } finally {
      activeControllers.delete(controller);
    }
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    activeControllers.forEach((controller) => controller.abort());
    activeControllers.clear();
    return true;
  }

  return Object.freeze({
    health: () => execute("health", {}, { retries: 0, timeoutMs: 5000 }),
    diagnostic: (service = "") => execute("diagnostic", service ? { service } : {}, { retries: 0 }),
    steam: Object.freeze({
      player: (steamId) => execute("steamPlayer", { steamId }),
      recentGames: (steamId, count) => execute("steamRecentGames", { steamId, count }),
      ownedGames: (steamId, limit) => execute("steamOwnedGames", { steamId, limit }),
      achievements: (steamId, appId) => execute("steamAchievements", { steamId, appId })
    }),
    tracker: Object.freeze({
      apexProfile: (platform, identifier) => execute("trackerApexProfile", { platform, identifier }),
      valorantProfile: (name, tag) => execute("trackerValorantProfile", { name, tag }),
      lolProfile: (name, tag) => execute("trackerLolProfile", { name, tag }),
      apexMatches: (platform, identifier, mode) => execute("trackerApexMatches", { platform, identifier, mode }),
      valorantMatches: (name, tag, mode) => execute("trackerValorantMatches", { name, tag, mode }),
      lolMatches: (name, tag, mode) => execute("trackerLolMatches", { name, tag, mode })
    }),
    twitch: Object.freeze({ channel: (login) => execute("twitchChannel", { login }) }),
    lastfm: Object.freeze({
      recentTracks: (username, limit) => execute("lastFmRecentTracks", { username, limit }),
      topArtists: (username, period, limit) => execute("lastFmTopArtists", { username, period, limit }),
      topTracks: (username, period, limit) => execute("lastFmTopTracks", { username, period, limit })
    }),
    lanyard: Object.freeze({ presence: (userId) => execute("lanyardPresence", { userId }) }),
    nowPlaying: (source, identity) => execute("nowPlaying", source === "lanyard" ? { source, userId: identity } : { source, username: identity }),
    weather: Object.freeze({ forecast: (city) => execute("weatherForecast", { city }) }),
    minecraft: Object.freeze({ profile: (username) => execute("minecraftProfile", { username }) }),
    spotifyOAuth: Object.freeze({
      exchange: (code, codeVerifier, clientId) => execute("spotifyOAuthExchange", { code, codeVerifier, clientId }),
      nowPlaying: (clientId) => execute("spotifyNowPlaying", { clientId }),
      control: (action, clientId, trackId) => execute("spotifyControl", { action, clientId, trackId }),
      trackSaved: (clientId, trackId) => execute("spotifyTrackSaved", { clientId, trackId }),
      disconnect: () => execute("spotifyOAuthDisconnect", {})
    }),
    githubOAuth: Object.freeze({
      exchange: (code, clientId) => execute("githubOAuthExchange", { code, clientId }),
      profile: () => execute("githubProfile", {}),
      disconnect: () => execute("githubOAuthDisconnect", {})
    }),
    googleCalendarOAuth: Object.freeze({
      exchange: (code, clientId) => execute("googleCalendarOAuthExchange", { code, clientId }),
      events: (clientId) => execute("googleCalendarEvents", { clientId }),
      disconnect: () => execute("googleCalendarOAuthDisconnect", {})
    }),
    notionOAuth: Object.freeze({
      exchange: (code, clientId) => execute("notionOAuthExchange", { code, clientId }),
      pages: () => execute("notionPages", {}),
      disconnect: () => execute("notionOAuthDisconnect", {})
    }),
    todoistOAuth: Object.freeze({
      exchange: (code, clientId) => execute("todoistOAuthExchange", { code, clientId }),
      tasks: () => execute("todoistTasks", {}),
      disconnect: () => execute("todoistOAuthDisconnect", {})
    }),
    googleDriveOAuth: Object.freeze({
      exchange: (code, clientId) => execute("googleDriveOAuthExchange", { code, clientId }),
      files: (clientId, options = {}) => execute("googleDriveFiles", { clientId, ...options }),
      get: (clientId, id) => execute("googleDriveFile", { clientId, id }),
      createFolder: (clientId, name, parentId) => execute("googleDriveFolderCreate", { clientId, name, parentId }),
      update: (clientId, fileId, { name, addParents = [], removeParents = [] } = {}) => execute("googleDriveFileUpdate", { clientId, fileId, name, addParents, removeParents }),
      trash: (clientId, fileId) => execute("googleDriveFileTrash", { clientId, fileId }),
      delete: (clientId, fileId) => execute("googleDriveFileDelete", { clientId, fileId }),
      quota: (clientId) => execute("googleDriveQuota", { clientId }),
      upload: (clientId, file, options = {}) => execute("googleDriveUpload", { clientId, file, ...options }),
      download: (clientId, fileId) => execute("googleDriveDownload", { clientId, fileId }),
      disconnect: () => execute("googleDriveOAuthDisconnect", {})
    }),
    cloudFiles: Object.freeze({
      sync: (files, clientId) => execute("cloudFilesSync", { files, clientId }),
      list: (options = {}) => execute("cloudFilesList", options),
      favorites: (options = {}) => execute("cloudFilesFavorites", options),
      get: (driveFileId) => execute("cloudFileDetail", { driveFileId }),
      update: (driveFileId, patch) => execute("cloudFileUpdate", { driveFileId, ...patch }),
      favorite: (driveFileId, favorite = true) => execute("cloudFileFavorite", { driveFileId, favorite }),
      brain: (driveFileId, folders = []) => execute("cloudFileBrain", { driveFileId, folders })
    }),
    cloudActivity: Object.freeze({
      list: (options = {}) => execute("cloudActivityList", options),
      summary: () => execute("cloudActivitySummary", {})
    }),
    cloudDashboard: Object.freeze({
      get: () => execute("cloudDashboard", {})
    }),
    cloudCleanup: Object.freeze({
      run: () => execute("cloudCleanup", {})
    }),
    cloudShares: Object.freeze({
      create: (options) => execute("cloudSharesCreate", options),
      list: (options = {}) => execute("cloudSharesList", options),
      resolve: (slug, password = "") => execute("cloudShareResolve", { slug, password }),
      download: (slug, password = "") => execute("cloudShareDownload", { slug, password }),
      revoke: (slug, shareId = "") => execute("cloudShareRevoke", { slug, shareId })
    }),
    cloudDrops: Object.freeze({
      create: (options) => execute("cloudDropsCreate", options),
      list: (options = {}) => execute("cloudDropsList", options),
      resolve: (slug, password = "") => execute("cloudDropResolve", { slug, password }),
      upload: (slug, file, options = {}) => execute("cloudDropUpload", { slug, file, ...options }),
      revoke: (slug) => execute("cloudDropRevoke", { slug })
    }),
    youtubeOAuth: Object.freeze({
      exchange: (code, clientId) => execute("youtubeOAuthExchange", { code, clientId }),
      activity: (clientId) => execute("youtubeActivity", { clientId }),
      disconnect: () => execute("youtubeOAuthDisconnect", {})
    }),
    redditOAuth: Object.freeze({
      exchange: (code, clientId) => execute("redditOAuthExchange", { code, clientId }),
      activity: (clientId) => execute("redditActivity", { clientId }),
      disconnect: () => execute("redditOAuthDisconnect", {})
    }),
    publicProfile: (username) => execute("publicProfile", { username }),
    brain: Object.freeze({
      complete: (input) => execute("brainComplete", input, { timeoutMs: 20000, retries: 0 })
    }),
    security: Object.freeze({
      passkeyRegisterOptions: (email, name, deviceName) => execute("passkeyRegisterOptions", { email, name, deviceName }),
      passkeyRegister: (response, deviceId) => execute("passkeyRegister", { response, deviceId }),
      passkeyAuthenticateOptions: (email, userId) => execute("passkeyAuthenticateOptions", { email, userId }),
      passkeyAuthenticate: (response) => execute("passkeyAuthenticate", { response }),
      passkeyRename: (passkeyId, name) => execute("passkeyRename", { passkeyId, name }),
      passkeyRevoke: (passkeyId) => execute("passkeyRevoke", { passkeyId }),
      otpSend: (email, userId) => execute("otpSend", { email, userId }),
      otpVerify: (userId, email, code) => execute("otpVerify", { userId, email, code }),
      deviceUpsert: (name) => execute("deviceUpsert", { name }),
      deviceList: () => execute("deviceList", {}),
      deviceTrust: (deviceId, trusted) => execute("deviceTrust", { deviceId, trusted }),
      deviceRevoke: (deviceId) => execute("deviceRevoke", { deviceId }),
      deviceRemove: (deviceId) => execute("deviceRemove", { deviceId }),
      securityEvents: (limit) => execute("securityEvents", limit ? { limit } : {})
    }),
    mail: Object.freeze({
      alias: () => execute("mailAlias", {}),
      inbox: (options = {}) => execute("mailInbox", options),
      thread: (threadId) => execute("mailThread", { thread_id: threadId }),
      read: (id, flags) => execute("mailRead", { id, ...flags }),
      send: (payload) => execute("mailSend", payload),
      search: (q, options = {}) => execute("mailSearch", { q, ...options }),
      advancedSearch: (filters = {}) => execute("mailAdvancedSearch", filters),
      templates: (limit) => execute("mailTemplates", limit ? { limit } : {}),
      saveTemplate: (payload) => execute("mailTemplateSave", payload),
      updateTemplate: (payload) => execute("mailTemplateUpdate", payload),
      deleteTemplate: (id) => execute("mailTemplateDelete", { id }),
      drafts: (options = {}) => execute("mailDrafts", options),
      saveDraft: (payload) => execute("mailDraftSave", payload),
      deleteDraft: (id) => execute("mailDraftDelete", { id }),
      move: (ids, folder) => execute("mailMove", { ids, folder }),
      labels: () => execute("mailLabels", {}),
      createLabel: (payload) => execute("mailLabelSave", payload),
      deleteLabel: (id) => execute("mailLabelDelete", { id }),
      assignLabel: (ids, label, remove = false) => execute("mailLabelAssign", { ids, label, remove }),
      contacts: (options = {}) => execute("mailContacts", options),
      signatures: () => execute("mailSignatures", {}),
      saveSignature: (payload) => execute("mailSignatureSave", payload),
      deleteSignature: (id) => execute("mailSignatureDelete", { id }),
      analyze: (id) => execute("mailAnalyze", { id }),
      suggest: (id) => execute("mailSuggest", { id }),
      extract: (id) => execute("mailExtract", { id }),
      rules: (limit) => execute("mailRules", limit ? { limit } : {}),
      saveRule: (payload) => execute("mailRuleSave", payload),
      updateRule: (payload) => execute("mailRuleUpdate", payload),
      deleteRule: (id) => execute("mailRuleDelete", { id }),
      snooze: (id, snoozedUntil) => execute("mailSnooze", { id, snoozed_until: snoozedUntil }),
      bulk: (ids, action, target) => execute("mailBulk", { ids, action, target }),
      schedule: (payload) => execute("mailSchedule", payload),
      notifications: ({ unread, limit } = {}) => execute("mailNotifications", { unread, limit }),
      markNotificationRead: (id, isRead) => execute("mailNotificationRead", { id, is_read: isRead }),
      analytics: (period, folder) => execute("mailAnalytics", { period, folder }),
      blocked: (limit) => execute("mailBlocked", limit ? { limit } : {}),
      blockSender: (payload) => execute("mailBlock", payload),
      unblockSender: (id) => execute("mailUnblock", { id }),
      trusted: (limit) => execute("mailTrusted", limit ? { limit } : {}),
      trustSender: (payload) => execute("mailTrust", payload),
      untrustSender: (id) => execute("mailUntrust", { id }),
      accounts: () => execute("mailAccounts", {}),
      createAccount: (payload) => execute("mailAccountCreate", payload),
      updateAccount: (payload) => execute("mailAccountUpdate", payload),
      deleteAccount: (id) => execute("mailAccountDelete", { id }),
      syncAccount: (id) => execute("mailAccountSync", { id }),
      pgpKeys: () => execute("mailPgpKeys", {}),
      createPgpKey: (payload) => execute("mailPgpKeyCreate", payload),
      deletePgpKey: (id) => execute("mailPgpKeyDelete", { id }),
      pgpEncrypt: (payload) => execute("mailPgpEncrypt", payload),
      pgpDecrypt: (payload) => execute("mailPgpDecrypt", payload),
      pushSubscriptions: () => execute("mailPushSubscriptions", {}),
      pushSubscribe: (payload) => execute("mailPushSubscribe", payload),
      pushUnsubscribe: (endpoint) => execute("mailPushUnsubscribe", { endpoint }),
      pushSend: (payload) => execute("mailPushSend", payload),
      pushVapidKey: () => execute("mailPushVapidKey", {}),
      lists: () => execute("mailLists", {}),
      createList: (payload) => execute("mailListCreate", payload),
      updateList: (payload) => execute("mailListUpdate", payload),
      deleteList: (id) => execute("mailListDelete", { id }),
      listMembers: (listId) => execute("mailListMembers", { list_id: listId }),
      addListMember: (payload) => execute("mailListMemberAdd", payload),
      removeListMember: (listId, email) => execute("mailListMemberDelete", { list_id: listId, email })
    }),
    diagnostics: () => Object.freeze({ ...status, activeRequests: activeControllers.size, environment: config.environment, baseUrl: network.redactUrl?.(baseUrl) || baseUrl }),
    destroy
  });
}
