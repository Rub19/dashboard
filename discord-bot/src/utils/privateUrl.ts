/** Vrai si l'adresse pointe vers la machine locale ou un réseau privé (littéral IP ou nom réservé). */
export function isPrivateOrLocalUrl(raw: string): boolean {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^\[|\]$/g, '');
  } catch {
    return true;
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host === '0.0.0.0') return true;
  if (/^(::1?|fe80:|fc|fd)/i.test(host)) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
