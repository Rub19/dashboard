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
    // Stream to stdout.
    '-o',
    '-',
    input,
  ];

  const proc = spawn(YT_DLP_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderrTail = '';
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });
  proc.on('error', (err) => {
    logger.warn(`[ytdlp] spawn error pour "${input}" :`, err);
  });
  proc.on('close', (code) => {
    if (code && code !== 0) {
      logger.warn(`[ytdlp] sortie ${code} pour "${input}" : ${stderrTail.trim().split('\n').pop() || 'aucun détail'}`);
    }
  });

  // Kill the child if the consumer stops reading (skip / stop / disconnect),
  // otherwise yt-dlp keeps downloading in the background.
  proc.stdout?.once('close', () => {
    if (!proc.killed) proc.kill('SIGKILL');
  });

  return proc.stdout ?? null;
}
