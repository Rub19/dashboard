import { httpError } from "../middleware/errors.js";
import { cachedLoad } from "../utils/cache.js";
import { routeResult } from "../utils/response.js";

// raw.githubusercontent.com serves this as text/plain regardless of the
// file's actual content, so it can never be embedded directly as an iframe
// src — the Worker fetches it server-side and re-serves it with the right
// content-type instead. A plain fetch() is used (not utils/external-request.js's
// requestExternal) because that helper unconditionally JSON-parses the
// response body, which is wrong for raw HTML passthrough.
const DINO_SOURCE = "https://raw.githubusercontent.com/Lehnoxzs/HAARPE-DINO-GAME/main/dino.html";

export async function friendGameDinoRoute() {
  const loader = async () => {
    const res = await fetch(DINO_SOURCE, { headers: { accept: "text/plain" } });
    if (!res.ok) throw httpError("UPSTREAM_UNAVAILABLE", 503);
    return res.text();
  };
  const { data: html } = await cachedLoad("friend-game:dino", 300, loader);
  return routeResult(null, {}, {
    raw: true,
    response: new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    }),
  });
}
