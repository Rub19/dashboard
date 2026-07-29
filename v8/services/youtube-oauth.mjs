import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export function beginYoutubeAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "youtube", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE, extraParams: { access_type: "offline", prompt: "consent" } }, runtime);
}
