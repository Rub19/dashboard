import { beginOAuthAuthorize } from "./oauth-callback.mjs";

const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SCOPE = "user-read-currently-playing user-read-playback-state user-modify-playback-state";

export function beginSpotifyAuthorize(clientId, runtime = globalThis) {
  return beginOAuthAuthorize({ provider: "spotify", clientId, authorizeUrl: AUTHORIZE_URL, scope: SCOPE, pkce: true }, runtime);
}
