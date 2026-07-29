import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://www.reddit.com/api/v1/authorize";
const SCOPE = "identity history";

export function beginRedditAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "reddit", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE, extraParams: { duration: "permanent" } }, runtime);
}
