import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://todoist.com/oauth/authorize";
const SCOPE = "data:read";

export function beginTodoistAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "todoist", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE }, runtime);
}
