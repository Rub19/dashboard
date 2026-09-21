"""Service « yt-dlp » : renvoie l'adresse directe d'un flux audio YouTube.

Tourne sur la MÊME machine (donc la même IP publique) que Lavalink : une adresse de flux YouTube
n'est valable que pour l'IP qui l'a demandée. Lavalink la charge ensuite comme un simple flux HTTP.

  GET /resolve?id=<id vidéo à 11 caractères>   (en-tête Authorization: <jeton>)
      -> {"url": "...", "duration": 244, "title": "..."}
  GET /health                                    (sans jeton) -> {"ok": true, "yt_dlp": "<version>"}

N'écoute qu'en local (127.0.0.1) ; accessible depuis le VPS uniquement à travers le tunnel SSH.
"""

import hmac
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import yt_dlp

PORT = int(os.environ.get("PORT", "8765"))
HOST = os.environ.get("HOST", "127.0.0.1")
TOKEN = open(os.environ.get("TOKEN_FILE", "/run/token"), encoding="utf-8").read().strip()
if len(TOKEN) < 16:
    raise SystemExit("jeton trop court (16 caractères minimum)")

ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
CACHE_TTL = 300  # secondes
# 2 extractions à la fois au maximum : le NAS n'a que ~200 Mo de RAM libres.
SLOTS = threading.BoundedSemaphore(2)
_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()


def probe(url: str) -> int:
    """Lit 2 octets de l'adresse : la même vérification que fait Lavalink en la chargeant."""
    req = urllib.request.Request(url, headers={"Range": "bytes=0-1", "User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return res.status
    except urllib.error.HTTPError as err:
        return err.code
    except Exception:
        return 0


def extract(video_id: str) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "socket_timeout": 15,
        # Opus (251) de préférence, puis un autre audio seul, puis AAC (140).
        "format": "251/bestaudio[ext=webm]/140/bestaudio",
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
    url = info.get("url")
    if not url and info.get("requested_formats"):
        url = info["requested_formats"][0].get("url")
    if not url:
        raise RuntimeError("aucune adresse de flux audio trouvée")
    return {"url": url, "duration": info.get("duration"), "title": info.get("title")}


def resolve(video_id: str, fresh: bool = False) -> dict:
    now = time.time()
    if not fresh:
        with _cache_lock:
            hit = _cache.get(video_id)
            if hit and now - hit[0] < CACHE_TTL:
                return hit[1]

    # Une adresse refusée à la lecture (intermittent) n'est jamais renvoyée ni mise en cache :
    # on en redemande une, jusqu'à 3 essais.
    out: dict = {}
    status = 0
    for attempt in range(1, 4):
        out = extract(video_id)
        status = probe(out["url"])
        itag = re.search(r"[?&]itag=(\d+)", out["url"])
        client = re.search(r"[?&]c=([A-Z_0-9]+)", out["url"])
        print(
            f"[resolver] {video_id} essai {attempt} : itag={itag.group(1) if itag else '?'} "
            f"client={client.group(1) if client else '?'} lecture={status}",
            flush=True,
        )
        if status in (200, 206):
            break
    else:
        raise RuntimeError(f"adresse refusée par YouTube (HTTP {status}) après 3 essais")

    with _cache_lock:
        if len(_cache) > 100:
            _cache.clear()
        _cache[video_id] = (now, out)
    return out


class Handler(BaseHTTPRequestHandler):
    server_version = "yt-resolver"

    def _send(self, status: int, body: dict) -> None:
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:  # noqa: N802 (nom imposé par http.server)
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return self._send(200, {"ok": True, "yt_dlp": yt_dlp.version.__version__})
        if parsed.path != "/resolve":
            return self._send(404, {"error": "not found"})
        if not hmac.compare_digest(self.headers.get("Authorization", ""), TOKEN):
            return self._send(401, {"error": "unauthorized"})
        query = parse_qs(parsed.query)
        video_id = (query.get("id") or [""])[0]
        fresh = (query.get("fresh") or [""])[0] == "1"
        if not ID_RE.match(video_id):
            return self._send(400, {"error": "invalid id"})
        if not SLOTS.acquire(timeout=30):
            return self._send(503, {"error": "busy"})
        try:
            return self._send(200, resolve(video_id, fresh))
        except Exception as err:  # yt-dlp lève des erreurs variées (« Sign in… », réseau…)
            print(f"[resolver] {video_id} : {str(err)[:200]}", flush=True)
            return self._send(502, {"error": str(err)[:200]})
        finally:
            SLOTS.release()

    def log_message(self, fmt: str, *args) -> None:  # journal minimal
        return


if __name__ == "__main__":
    print(f"[resolver] yt-dlp {yt_dlp.version.__version__} — écoute sur {HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
