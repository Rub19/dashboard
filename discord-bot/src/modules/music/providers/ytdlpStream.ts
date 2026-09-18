import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { logger } from '../../../utils/logger.js';

/**
 * Audio streaming through yt-dlp instead of play-dl.
 *
 * play-dl (1.9.x, unmaintained since 2023) can no longer pull a usable audio
 * stream from YouTube/SoundCloud from a datacenter IP — YouTube's signature
 * cipher changed repeatedly and tokenless requests get the "confirm you're
 * not a bot" wall — so `play.stream()` either threw or, worse, returned an
 * empty stream: the classic "Now Playing looks right but the bot is silent".
 *
 * yt-dlp is a maintained binary that tracks those changes within a day or
 * two. It handles YouTube, SoundCloud, Bandcamp, Vimeo and ~1800 other
 * sites, plus `ytsearch1:<query>` for a plain text search.
 *
 * Requires the `yt-dlp` binary on the host:
 *   apt install yt-dlp   (or)   pipx install yt-dlp
 * Optional env:
 *   YT_DLP_PATH           absolute path to the binary (default: "yt-dlp" on PATH)
 *   YT_DLP_COOKIES_FILE   path to a Netscape cookies.txt exported from a
 *                         logged-in YouTube session — strongly recommended on
 *                         a VPS, YouTube rate-limits/blocks anonymous
 *                         datacenter traffic.
 */

const YT_DLP_PATH = process.env.YT_DLP_PATH || 'yt-dlp';
const COOKIES_FILE = process.env.YT_DLP_COOKIES_FILE || '';
// Free-form extra flags, e.g. `--extractor-args youtube:player_client=tv,web_safari`
// when YouTube breaks the default client ("The page needs to be reloaded").
// Split on whitespace; quote-free values only.
export const EXTRA_ARGS = (process.env.YT_DLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean);
// YouTube now gates format URLs behind an "n" JavaScript challenge; yt-dlp only
// enables the Deno runtime by default and silently ends up with zero formats
// ("The page needs to be reloaded") without one. The bot already runs under
// Node, so hand yt-dlp our own binary (override with YT_DLP_JS_RUNTIME, e.g.
// "deno", or set it to "off" to opt out). The challenge-solver scripts are
// fetched once from GitHub and cached by yt-dlp (YT_DLP_REMOTE_EJS=0 to skip).
const JS_RUNTIME = process.env.YT_DLP_JS_RUNTIME || `node:${process.execPath}`;
export const EJS_ARGS =
  JS_RUNTIME === 'off'
    ? []
    : ['--js-runtimes', JS_RUNTIME, ...(process.env.YT_DLP_REMOTE_EJS === '0' ? [] : ['--remote-components', 'ejs:github'])];

let availabilityProbe: Promise<boolean> | null = null;

/** Cached one-shot check that the yt-dlp binary exists and runs. */
export function ytDlpAvailable(): Promise<boolean> {
  if (!availabilityProbe) {
    availabilityProbe = new Promise<boolean>((resolve) => {
      try {
        const proc = spawn(YT_DLP_PATH, ['--version'], { stdio: 'ignore' });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      } catch {
        resolve(false);
      }
    }).then((ok) => {
      if (!ok) {
        logger.error(
          `[ytdlp] Binaire "${YT_DLP_PATH}" introuvable ou non exécutable. La lecture de musique ne fonctionnera pas — installe-le sur le serveur (apt install yt-dlp / pipx install yt-dlp) ou définis YT_DLP_PATH.`,
        );
      }
      return ok;
    });
  }
  return availabilityProbe;
}

/** Normalised metadata for one video/track as yt-dlp reports it (flat, no formats). */
export interface YtDlpEntry {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string | null;
  extractor: string;
}

function normaliseEntry(e: any): YtDlpEntry | null {
  if (!e || typeof e !== 'object') return null;
  const id = String(e.id || '');
  const extractor = String(e.ie_key || e.extractor_key || e.extractor || '').toLowerCase();
  let url: string = typeof e.webpage_url === 'string' ? e.webpage_url : typeof e.url === 'string' && /^https?:/.test(e.url) ? e.url : '';
  if (!url && id && extractor.includes('youtube')) url = `https://www.youtube.com/watch?v=${id}`;
  if (!url) return null;
  const thumbs = Array.isArray(e.thumbnails) ? e.thumbnails : [];
  const thumb =
    (typeof e.thumbnail === 'string' && e.thumbnail) ||
    (thumbs.length > 0 && typeof thumbs[thumbs.length - 1]?.url === 'string' ? thumbs[thumbs.length - 1].url : null) ||
    (id && extractor.includes('youtube') ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null);
  return {
    id: id || url,
    url,
    title: String(e.title || e.track || 'Titre inconnu'),
    artist: String(e.artist || e.uploader || e.channel || e.creator || (extractor.includes('soundcloud') ? 'SoundCloud' : 'YouTube')),
    duration: Math.round(Number(e.duration) || 0),
    thumbnail: thumb,
    extractor,
  };
}

/**
 * Runs yt-dlp in metadata-only mode (`--dump-single-json --flat-playlist`)
 * on a URL or a `ytsearchN:` / `scsearchN:` query and returns the entries.
 * A single video comes back as one entry; a search/playlist as its list.
 */
export async function ytDlpLookup(input: string, limit = 5): Promise<YtDlpEntry[]> {
  if (!(await ytDlpAvailable())) return [];
  const args = [
    '--dump-single-json',
    '--flat-playlist',
    '--no-warnings',
    '--quiet',
    '--playlist-end',
    String(Math.max(1, limit)),
    '--socket-timeout',
    '15',
    ...(COOKIES_FILE ? ['--cookies', COOKIES_FILE] : []),
    ...EXTRA_ARGS,
    input,
  ];
  const json = await new Promise<string>((resolve) => {
    const proc = spawn(YT_DLP_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout?.on('data', (c: Buffer) => (out += c.toString()));
    proc.stderr?.on('data', (c: Buffer) => (err = (err + c.toString()).slice(-1000)));
    proc.on('error', () => resolve(''));
    proc.on('close', (code) => {
      if (code !== 0 && !out.trim()) logger.warn(`[ytdlp] lookup "${input}" a échoué (code ${code}) : ${err.trim().split('\n').pop() || 'aucun détail'}`);
      resolve(out);
    });
  });
  if (!json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    const raw: any[] = Array.isArray(parsed?.entries) ? parsed.entries : [parsed];
    return raw.map(normaliseEntry).filter((e): e is YtDlpEntry => e !== null).slice(0, limit);
  } catch {
    logger.warn(`[ytdlp] JSON illisible pour "${input}"`);
    return [];
  }
}

/** Text search on YouTube through yt-dlp. */
export function ytDlpSearch(query: string, limit = 5): Promise<YtDlpEntry[]> {
  return ytDlpLookup(`ytsearch${Math.max(1, limit)}:${query.trim()}`, limit);
}

/**
 * Spawns yt-dlp and returns its raw audio bytes on stdout as a Readable.
 * The container (webm/opus, m4a, mp3...) is left as-is — @discordjs/voice
 * pipes it through ffmpeg (ffmpeg-static) when the resource is created with
 * `inputType: StreamType.Arbitrary`, so no assumption about the codec here.
 *
 * `input` is either a URL yt-dlp understands or a `ytsearch1:...` query.
 * Returns null if the binary is missing.
 */
export async function createYtDlpStream(input: string): Promise<Readable | null> {
  if (!(await ytDlpAvailable())) return null;

  const args = [
    '--no-playlist',
    '--no-warnings',
    '--quiet',
    // Prefer a directly-usable audio-only format; fall back to best available.
    '-f',
    'bestaudio[acodec=opus]/bestaudio/best',
    // Retry transient network/extractor hiccups instead of failing the play.
    '--retries',
    '3',
    '--socket-timeout',
    '15',
    ...(COOKIES_FILE ? ['--cookies', COOKIES_FILE] : []),
    ...EJS_ARGS,
    ...EXTRA_ARGS,
    // Stream to stdout.
    '-o',
    '-',
    input,
  ];

  const proc = spawn(YT_DLP_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrTail = '';
  let bytesOut = 0;
  proc.stdout?.on('data', (chunk: Buffer) => {
    bytesOut += chunk.length;
  });
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });
  proc.on('error', (err) => {
    logger.warn(`[ytdlp] spawn error pour "${input}" :`, err);
    proc.stdout?.destroy(err);
  });
  proc.on('close', (code) => {
    if (code && code !== 0) {
      const lastLine = stderrTail.trim().split('\n').pop() || 'aucun détail';
      // Exit without ever producing audio = the classic "bot joins but stays
      // silent". Surface it as a stream error (the player listens for it and
      // skips/idles with a loud log) instead of letting ffmpeg see a clean EOF.
      if (bytesOut === 0) {
        const hint = /sign in|confirm you.re not a bot|cookies/i.test(stderrTail)
          ? ' — YouTube bloque l’IP du serveur : définis YT_DLP_COOKIES_FILE (cookies.txt d’une session connectée).'
          : /Unable to extract|nsig|Requested format is not available/i.test(stderrTail)
            ? ' — yt-dlp obsolète : lance `yt-dlp -U` sur le serveur.'
            : '';
        logger.error(`[ytdlp] aucun audio produit pour "${input}" (code ${code}) : ${lastLine}${hint}`);
        proc.stdout?.destroy(new Error(`yt-dlp: ${lastLine}${hint}`));
      } else {
        logger.warn(`[ytdlp] sortie ${code} pour "${input}" après ${Math.round(bytesOut / 1024)} Ko : ${lastLine}`);
      }
    }
  });

  // Kill the child if the consumer stops reading (skip / stop / disconnect),
  // otherwise yt-dlp keeps downloading in the background.
  proc.stdout?.once('close', () => {
    if (!proc.killed) proc.kill('SIGKILL');
  });

  return proc.stdout ?? null;
}
