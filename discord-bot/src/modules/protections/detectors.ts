/** Détecteurs sans Discord (testables) utilisés par le moteur de protections. */

const URL_RE = /\bhttps?:\/\/[^\s<>()]+/gi;
const INVITE_RE = /\b(?:discord(?:app)?\.com\/invite|discord\.gg|dsc\.gg|discord\.me|discord\.io)\/[a-z0-9-]+/i;
const IMAGE_EXT_RE = /\.(?:png|jpe?g|gif|webp|bmp|svg|avif)(?:\?|$)/i;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** Domaine autorisé : égal ou sous-domaine d'une entrée (« youtube.com » couvre « m.youtube.com »). */
export function domainAllowed(host: string, allowed: string[]): boolean {
  return allowed.some((d) => {
    const a = d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    return a && (host === a || host.endsWith(`.${a}`));
  });
}

/** Le message contient-il un lien interdit ? `types` : general (tout http/https), discord (invitations), images. */
export function findBlockedLink(content: string, types: string[], allowed: string[]): string | null {
  if (types.includes('discord')) {
    const inv = content.match(INVITE_RE);
    if (inv) return inv[0];
  }
  for (const url of content.match(URL_RE) ?? []) {
    const host = hostOf(url);
    if (!host || domainAllowed(host, allowed)) continue;
    if (types.includes('general')) return url;
    if (types.includes('images') && IMAGE_EXT_RE.test(url)) return url;
  }
  return null;
}

/** Mots interdits : mots entiers, sans tenir compte des majuscules ni des accents. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function findBannedWord(content: string, words: string[]): string | null {
  const text = ` ${fold(content).replace(/[^a-z0-9]+/g, ' ')} `;
  for (const w of words) {
    const f = fold(w).replace(/[^a-z0-9]+/g, ' ').trim();
    if (f && text.includes(` ${f} `)) return w;
  }
  return null;
}

/** Nombre d'emojis : un emoji composé (drapeau, famille, teinte) compte pour un. */
export function countEmojis(content: string, countCustom = true, countUnicode = true): number {
  let n = 0;
  if (countCustom) n += (content.match(/<a?:\w{2,32}:\d{5,25}>/g) ?? []).length;
  if (countUnicode) {
    const plain = content.replace(/<a?:\w{2,32}:\d{5,25}>/g, '');
    const seg = new Intl.Segmenter('fr', { granularity: 'grapheme' });
    for (const { segment } of seg.segment(plain)) if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)) n++;
  }
  return n;
}

/** Pavé : trop de caractères ou de lignes (blocs de code ignorés sur demande). */
export function isTextWall(content: string, maxChars: number, maxLines: number, ignoreCodeBlocks: boolean): boolean {
  const text = ignoreCodeBlocks ? content.replace(/```[\s\S]*?```/g, '') : content;
  return [...text].length > maxChars || text.split('\n').length > maxLines;
}

/** Forme comparable d'un message (doublons « très ressemblants » : chiffres et ponctuation ignorés). */
export function normalizeForDuplicate(content: string, mode: 'similar' | 'exact'): string {
  if (mode === 'exact') return content.trim();
  return fold(content).replace(/[0-9]+/g, '#').replace(/[^a-z#]+/g, ' ').trim();
}

/** Ressemblance entre deux messages normalisés (1 = identiques), sur les mots. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const wa = a.split(' ');
  const wb = b.split(' ');
  const setB = new Set(wb);
  const common = wa.filter((w) => setB.has(w)).length;
  return (2 * common) / (wa.length + wb.length || 1);
}

// --- Arnaques ------------------------------------------------------------------------------------------------------

const SCAM_PHRASES = [
  /free\s+(?:discord\s+)?nitro/i,
  /nitro\s+(?:gratuit|offert|free)/i,
  /steam\s+(?:gift|cadeau)\s*(?:card)?.{0,40}https?:\/\//i,
  /(?:i'?m|je)\s+(?:leaving|quitte).{0,40}(?:cs\s?go|cs2|steam).{0,60}(?:skins?|inventory|inventaire)/i,
  /(?:airdrop|giveaway).{0,40}(?:claim|réclame).{0,40}https?:\/\//i,
  /@everyone.{0,80}(?:nitro|steam|gift|cadeau).{0,80}https?:\/\//i,
];
// Faux domaines Discord / Steam (lettres échangées, tirets, extensions exotiques).
const FAKE_DOMAIN_RE = /\b(?:d[il1]sc[o0]r[dcl]?[a-z-]*|dlscord|disc0rd|discorcl|steamc[o0]mm?un[il1]t[yi][a-z-]*|stearn[a-z-]*|steamcommunlty)\.(?!com\b|gg\b|media\b|net\b)[a-z]{2,10}\b/i;
const OFFICIAL_RE = /\b(?:discord\.com|discord\.gg|discordapp\.com|discord\.media|discordapp\.net|steamcommunity\.com|steampowered\.com)\b/i;
// Jeton de compte Discord collé tel quel.
const TOKEN_RE = /\b[MNO][A-Za-z\d_-]{23,25}\.[A-Za-z\d_-]{6}\.[A-Za-z\d_-]{27,38}\b/;

/** Raison si le message ressemble à une arnaque connue, sinon null. */
export function detectScam(content: string): string | null {
  if (TOKEN_RE.test(content)) return 'jeton de compte Discord';
  const fake = content.match(FAKE_DOMAIN_RE);
  if (fake && !OFFICIAL_RE.test(fake[0])) return `faux domaine (${fake[0]})`;
  for (const re of SCAM_PHRASES) if (re.test(content)) return 'message d’arnaque connu';
  return null;
}

// --- Toxicité ------------------------------------------------------------------------------------------------------

// ponytail: lexique local FR/EN, pas de modèle ; un service d'analyse si les faux positifs gênent.
const INSULTS = [
  'connard', 'connasse', 'salope', 'pute', 'encule', 'batard', 'fdp', 'ntm', 'nique ta mere', 'ta mere la', 'pd', 'tg', 'ferme ta gueule',
  'abruti', 'debile', 'gogol', 'mongol', 'attarde', 'cretin', 'idiot', 'imbecile', 'tocard', 'raclure', 'merdeux', 'sac a merde',
  'fuck you', 'motherfucker', 'bitch', 'cunt', 'retard', 'faggot', 'whore', 'slut', 'asshole', 'dickhead', 'kys', 'kill yourself', 'stfu',
];
const SWEARS = ['merde', 'putain', 'bordel', 'chier', 'fuck', 'shit', 'damn', 'crap', 'wtf'];
const TARGET_RE = /\b(?:tu|t'|toi|ta|ton|tes|vous|you|u|your|ur)\b|<@!?\d+>/i;

/** Taux de toxicité 0-100 : insulte visant quelqu'un = très toxique, juron sans cible = modéré. */
export function toxicityScore(content: string, ignoreUntargeted: boolean): number {
  const text = ` ${fold(content).replace(/[^a-z0-9@<>!'\s]+/g, ' ').replace(/\s+/g, ' ')} `;
  const has = (w: string) => text.includes(` ${w} `);
  const insults = INSULTS.filter(has).length;
  const swears = SWEARS.filter(has).length;
  const targeted = TARGET_RE.test(content);
  if (insults > 0) return Math.min(100, (targeted ? 92 : ignoreUntargeted ? 40 : 75) + (insults - 1) * 4);
  if (swears > 0) return ignoreUntargeted && !targeted ? 0 : Math.min(85, (targeted ? 70 : 45) + (swears - 1) * 5);
  return 0;
}
