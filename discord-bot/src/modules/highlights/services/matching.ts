/**
 * Logique de correspondance pure du module Highlights — séparée du service pour être
 * testable sans dépendre d'un `discord.js` Client (cf. `test_highlights_v1.ts`).
 *
 * Convention inspirée de `KeywordDetector` (AutoMod, qui teste `\bterm\b`) mais adaptée
 * aux Highlights : ici on veut éviter les faux positifs (`ethone` ne doit pas se
 * déclencher sur `ethoneX`), donc la limite de mot (`\b`) est appliquée strictement
 * quand le mot-clé commence/finit par un caractère "mot" (`\w`). Quand ce n'est pas le
 * cas (emoji, ponctuation en bord de mot-clé — `\b` n'a alors pas de sens), on retombe
 * sur une simple sous-chaîne insensible à la casse.
 */

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_CHAR_RE = /\w/;

/** Retourne `true` si `content` contient `keyword` (insensible à la casse). */
export function matchesKeyword(content: string, keyword: string): boolean {
  const normalizedContent = content.toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return false;

  const startsWithWordChar = WORD_CHAR_RE.test(normalizedKeyword[0]);
  const endsWithWordChar = WORD_CHAR_RE.test(normalizedKeyword[normalizedKeyword.length - 1]);

  if (startsWithWordChar && endsWithWordChar) {
    try {
      const wordRegex = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, 'i');
      return wordRegex.test(normalizedContent);
    } catch {
      // Regex invalide (caractères exotiques) : on retombe sur la sous-chaîne simple.
    }
  }
  return normalizedContent.includes(normalizedKeyword);
}

/** Met le premier segment correspondant à `keyword` en gras dans `content` (best-effort). */
export function boldKeyword(content: string, keyword: string): string {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return content;
  try {
    const regex = new RegExp(`(${escapeRegExp(normalizedKeyword)})`, 'i');
    const match = content.match(regex);
    if (!match) return content;
    return content.replace(regex, '**$1**');
  } catch {
    return content;
  }
}
