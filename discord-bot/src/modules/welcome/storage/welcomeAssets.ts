import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'data', 'welcome-assets');
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
export const ASSET_MAX_BYTES = 4 * 1024 * 1024;
export const ASSET_ROUTE = '/api/public/welcome-assets';
const FILE_RE = /^[a-f0-9]{40}\.(png|jpg|gif|webp)$/;

function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export function saveAsset(guildId: string, dataUrl: string): string {
  const m = /^data:image\/[a-z]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw Object.assign(new Error('Image invalide : PNG, JPG, GIF ou WebP attendu.'), { status: 400 });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > ASSET_MAX_BYTES) throw Object.assign(new Error('Image trop lourde : 4 Mo au maximum.'), { status: 413 });
  const type = sniff(buf);
  if (!type) throw Object.assign(new Error('Image invalide : PNG, JPG, GIF ou WebP attendu.'), { status: 400 });
  const file = `${crypto.createHash('sha1').update(buf).digest('hex')}.${TYPES[type]}`;
  const dir = path.join(ROOT, guildId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), buf);
  return `${ASSET_ROUTE}/${guildId}/${file}`;
}

export function assetPath(guildId: string, file: string): string | null {
  if (!/^\d{15,25}$/.test(guildId) || !FILE_RE.test(file)) return null;
  const full = path.join(ROOT, guildId, file);
  return fs.existsSync(full) ? full : null;
}

export function readLocalAsset(url: string): Buffer | null {
  const m = /\/api\/public\/welcome-assets\/(\d{15,25})\/([a-f0-9]{40}\.(?:png|jpg|gif|webp))$/.exec(url);
  const full = m ? assetPath(m[1], m[2]) : null;
  return full ? fs.readFileSync(full) : null;
}
