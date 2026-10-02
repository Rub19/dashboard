import { lookup } from 'node:dns/promises';
import { isPrivateOrLocalUrl } from './privateUrl.js';

/**
 * Télécharge une image dont l'URL vient d'un utilisateur (fond de carte de bienvenue…) sans laisser le bot
 * appeler le réseau interne du VPS : https uniquement, hôte ni littéral privé ni résolu vers une adresse privée,
 * aucune redirection suivie, délai et taille bornés. Renvoie null au moindre doute.
 */
export async function fetchPublicImage(rawUrl: string, opts: { timeoutMs?: number; maxBytes?: number } = {}): Promise<Buffer | null> {
  const { timeoutMs = 6000, maxBytes = 8 * 1024 * 1024 } = opts;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || isPrivateOrLocalUrl(url.href)) return null;
  try {
    const addrs = await lookup(url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateOrLocalUrl(`https://${a.family === 6 ? `[${a.address}]` : a.address}/`))) return null;
  } catch {
    return null;
  }
  try {
    const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return null;
    if (Number(res.headers.get('content-length') || 0) > maxBytes) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > maxBytes ? null : buf;
  } catch {
    return null;
  }
}
