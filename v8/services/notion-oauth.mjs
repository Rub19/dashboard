import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";

export function beginNotionAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "notion", clientId, authorizeUrl: AUTHORIZE_URL, extraParams: { owner: "user" } }, runtime);
}
