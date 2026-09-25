// Caractères que la police du serveur sait dessiner : latin (avec accents), grec, cyrillique, ponctuation courante.
const DRAWABLE = /[ -~ -ɏͰ-ϿЀ-ӿ‐-‧‰-⁞€™]/u;

/**
 * Texte sûr à dessiner : les lettres décoratives (𝕷𝖔𝖗𝖉 𝕾𝖚𝖕𝖗𝖆, ｆｕｌｌｗｉｄｔｈ, ligatures…) sont ramenées à leur forme normale (NFKC), puis
 * tout ce que la police ne sait pas dessiner (émojis, symboles, écritures rares) est retiré au lieu d'afficher des carrés vides.
 * Si rien de lisible ne reste, `fallback` est utilisé.
 */
export function safeText(text: string, fallback = ''): string {
  const cleaned = Array.from(String(text ?? '').normalize('NFKC'))
    .filter((ch) => DRAWABLE.test(ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : fallback;
}
