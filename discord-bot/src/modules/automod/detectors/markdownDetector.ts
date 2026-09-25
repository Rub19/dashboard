import { Message } from 'discord.js';
import { AutoModConfig, DetectionResult, MarkdownType } from '../types/autoMod.js';

/** Une regex par type de mise en forme Discord. `strip` la remplace par le texte brut. */
const RULES: Record<MarkdownType, { test: RegExp; strip: (s: string) => string }> = {
  codeBlock: { test: /```[\s\S]*?```/, strip: (s) => s.replace(/```(?:[\w+-]*\n)?([\s\S]*?)```/g, '$1') },
  inlineCode: { test: /`[^`\n]+`/, strip: (s) => s.replace(/`([^`\n]+)`/g, '$1') },
  spoiler: { test: /\|\|[\s\S]+?\|\|/, strip: (s) => s.replace(/\|\|([\s\S]+?)\|\|/g, '$1') },
  bold: { test: /\*\*[^*\n]+\*\*/, strip: (s) => s.replace(/\*\*([^*\n]+)\*\*/g, '$1') },
  underline: { test: /__[^_\n]+__/, strip: (s) => s.replace(/__([^_\n]+)__/g, '$1') },
  strikethrough: { test: /~~[^~\n]+~~/, strip: (s) => s.replace(/~~([^~\n]+)~~/g, '$1') },
  italic: { test: /(?<![*\w])\*[^*\s][^*\n]*\*(?!\*)|(?<![_\w])_[^_\s][^_\n]*_(?![_\w])/, strip: (s) => s.replace(/(?<![*\w])\*([^*\s][^*\n]*)\*(?!\*)/g, '$1').replace(/(?<![_\w])_([^_\s][^_\n]*)_(?![_\w])/g, '$1') },
  header: { test: /^#{1,3} \S/m, strip: (s) => s.replace(/^#{1,3} /gm, '') },
  subtext: { test: /^-# \S/m, strip: (s) => s.replace(/^-# /gm, '') },
  quote: { test: /^(?:>>> |> )\S/m, strip: (s) => s.replace(/^(?:>>> |> )/gm, '') },
  list: { test: /^(?:[-*] |\d+\. )\S/m, strip: (s) => s.replace(/^(?:[-*] |\d+\. )/gm, '') },
  maskedLink: { test: /\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/, strip: (s) => s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)') },
};

/** Types de mise en forme interdits présents dans le texte. */
export function findMarkdown(content: string, types: MarkdownType[]): MarkdownType[] {
  return types.filter((t) => RULES[t].test.test(content));
}

/** Texte sans les mises en forme interdites (les autres sont conservées). */
export function stripMarkdown(content: string, types: MarkdownType[]): string {
  // Les blocs de code d'abord : leur contenu ne doit pas être re-nettoyé par les autres règles.
  const order: MarkdownType[] = ['codeBlock', 'inlineCode', ...types.filter((t) => t !== 'codeBlock' && t !== 'inlineCode')];
  return [...new Set(order)].filter((t) => types.includes(t)).reduce((acc, t) => RULES[t].strip(acc), content);
}

export class MarkdownDetector {
  public static check(message: Message, config: AutoModConfig): DetectionResult {
    const conf = config.markdown;
    const none: DetectionResult = { detectorName: 'MarkdownDetector', triggered: false, riskPoints: 0, reason: '', actions: [] };
    if (!conf.enabled || conf.types.length === 0) return none;
    const found = findMarkdown(message.content || '', conf.types);
    if (found.length === 0) return none;
    return { detectorName: 'MarkdownDetector', triggered: true, riskPoints: 5, reason: `Mise en forme interdite (${found.join(', ')})`, matchedContent: found.join(', '), actions: conf.actions };
  }
}
