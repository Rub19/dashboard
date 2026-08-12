import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function beginGoogleCalendarAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "google-calendar", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE, extraParams: { access_type: "offline", prompt: "consent" } }, runtime);
}
