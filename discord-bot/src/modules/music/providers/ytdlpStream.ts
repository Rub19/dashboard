import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import type { Readable } from 'node:stream';
import { logger } from '../../../utils/logger.js';

const require = createRequire(import.meta.url);

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

// Everything below reads process.env *at call time*, never at import time:
// this module can be pulled in (via the telemetry fs patch → services graph)
// before config.ts has run dotenv.config(), in which case module-level
// constants would freeze YT_DLP_COOKIES_FILE as '' for the whole process —
// the bot then hits YouTube's bot wall while `npm run music:doctor` (env
// passed explicitly) works fine.
const ytDlpPath = (): string => process.env.YT_DLP_PATH || 'yt-dlp';
const cookiesArgs = (): string[] => (process.env.YT_DLP_COOKIES_FILE ? ['--cookies', process.env.YT_DLP_COOKIES_FILE] : []);
// Free-form extra flags, e.g. `--extractor-args youtube:player_client=default,web_embedded`
// when YouTube breaks the default client. Split on whitespace; quote-free values only.
export const extraArgs = (): string[] => (process.env.YT_DLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean);
// YouTube gates format URLs behind an "n" JavaScript challenge; yt-dlp only
// enables the Deno runtime by default and ends up with zero formats ("The page
// needs to be reloaded") without one. The bot already runs under Node, so hand
// yt-dlp our own binary (override with YT_DLP_JS_RUNTIME, e.g. "deno", or "off").
// The challenge-solver scripts are fetched once from GitHub and cached by
// yt-dlp (YT_DLP_REMOTE_EJS=0 to skip).
export const ejsArgs = (): string[] => {
  const runtime = process.env.YT_DLP_JS_RUNTIME || `node:${process.execPath}`;
  if (runtime === 'off') return [];
  return ['--js-runtimes', runtime, ...(process.env.YT_DLP_REMOTE_EJS === '0' ? [] : ['--remote-components', 'ejs:github'])];
};

/** What the bot will actually pass to yt-dlp — surfaced in logs at startup. */
export function describeYtDlpConfig(): string {
  return `binaire=${ytDlpPath()} cookies=${process.env.YT_DLP_COOKIES_FILE || 'AUCUN'} js=${process.env.YT_DLP_JS_RUNTIME || `node:${process.execPath}`} extra=${extraArgs().join(' ') || '-'}`;
}

let availabilityProbe: Promise<boolean> | null = null;

/** Cached one-shot check that the yt-dlp binary exists and runs. */
export function ytDlpAvailable(): Promise<boolean> {
  if (!availabilityProbe) {
    availabilityProbe = new Promise<boolean>((resolve) => {
      try {
        const proc = spawn(ytDlpPath(), ['--version'], { stdio: 'ignore' });
        proc.on('error', () => resolve(false));
        proc.on('close', (code) => resolve(code === 0));
      } catch {
        resolve(false);
      }
    }).then((ok) => {
      if (!ok) {
        logger.error(
          `[ytdlp] Binaire "${ytDlpPath()}" introuvable ou non exécutable. La lecture de musique ne fonctionnera pas — installe-le sur le serveur (apt install yt-dlp / pipx install yt-dlp) ou définis YT_DLP_PATH.`,
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
    ...cookiesArgs(),
    ...extraArgs(),
    input,
  ];
  const json = await new Promise<string>((resolve) => {
    const proc = spawn(ytDlpPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
    ...cookiesArgs(),
    ...ejsArgs(),
    ...extraArgs(),
    // Stream to stdout.
    '-o',
    '-',
    input,
  ];

  const proc = spawn(ytDlpPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] });

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

/**
 * yt-dlp → our own ffmpeg → 48 kHz stereo signed-16 PCM (StreamType.Raw).
 *
 * Why not let @discordjs/voice run ffmpeg (StreamType.Arbitrary)? Because it
 * spawns it with `-loglevel 0`: when the transcode yields nothing the player
 * just flips playing → idle after ~100 ms with playbackDuration 0 and no
 * clue why. Here ffmpeg's stderr is logged, byte counts on both hops are
 * logged, and an ffmpeg that produces no PCM is surfaced as a stream error.
 */
export async function createYtDlpPcmStream(input: string): Promise<Readable | null> {
  const source = await createYtDlpStream(input);
  if (!source) return null;

  const ffmpegBin = resolveFfmpeg();
  const ff = spawn(
    ffmpegBin,
    [
      '-hide_banner',
      '-loglevel', 'warning',
      '-nostdin',
      '-analyzeduration', '0',
      '-i', 'pipe:0',
      '-vn',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );

  let ffErr = '';
  let pcmBytes = 0;
  let inBytes = 0;
  let firstPcmLogged = false;
  const label = input.length > 80 ? `${input.slice(0, 77)}…` : input;

  source.on('data', (c: Buffer) => {
    inBytes += c.length;
  });
  ff.stdout.on('data', (c: Buffer) => {
    pcmBytes += c.length;
    if (!firstPcmLogged) {
      firstPcmLogged = true;
      logger.info(`[ffmpeg] premiers échantillons PCM pour "${label}" (entrée ${Math.round(inBytes / 1024)} Ko)`);
    }
  });
  ff.stderr.on('data', (c: Buffer) => {
    ffErr = (ffErr + c.toString()).slice(-2000);
  });
  ff.on('error', (err) => {
    logger.error(`[ffmpeg] impossible de lancer ${ffmpegBin} :`, err);
    ff.stdout.destroy(err);
  });
  ff.on('close', (code) => {
    const tail = ffErr.trim().split('\n').slice(-3).join(' | ');
    if (pcmBytes === 0) {
      logger.error(`[ffmpeg] aucun PCM produit pour "${label}" (code ${code}, ${Math.round(inBytes / 1024)} Ko reçus de yt-dlp) : ${tail || 'aucun message'}`);
      ff.stdout.destroy(new Error(`ffmpeg: ${tail || `code ${code}`}`));
    } else if (code && code !== 0) {
      logger.warn(`[ffmpeg] sortie ${code} pour "${label}" après ${Math.round(pcmBytes / 1024)} Ko PCM : ${tail}`);
    } else {
      logger.info(`[ffmpeg] fin "${label}" — ${Math.round(inBytes / 1024)} Ko in → ${Math.round(pcmBytes / 1024)} Ko PCM`);
    }
  });

  // Plumbing: yt-dlp → ffmpeg stdin. EPIPE when ffmpeg dies first is expected.
  ff.stdin.on('error', () => {});
  source.on('error', (err) => {
    logger.warn(`[ffmpeg] source yt-dlp en erreur pour "${label}" : ${err.message}`);
    ff.stdin.destroy();
  });
  source.pipe(ff.stdin);

  // Consumer gone (skip/stop) → tear down both processes.
  ff.stdout.once('close', () => {
    if (!ff.killed) ff.kill('SIGKILL');
    source.destroy();
  });

  return ff.stdout;
}

function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const p = (require('ffmpeg-static') as string | null) || '';
    if (p) return p;
  } catch {
    /* fall through */
  }
  return 'ffmpeg';
}
