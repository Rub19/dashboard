import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const SCOPE = "read:user";

export function beginGithubAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "github", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE, extraParams: { allow_signup: "false" } }, runtime);
}
