/**
 * ETHONE Assistant 2.0 — Intent Detector (Hybrid: Regex + LLM Fallback)
 *
 * Prompt #18 §71 :
 *   message
 *     ↓
 *   light intent detection
 *     ↓
 *   conversation ?
 *     ├── oui → réponse directe
 *     └── non
 *           ↓
 *           question ?  action ?  support ?  search ?
 *
 * Architecture :
 *   1. LanguageDetector : détecte FR/EN/ES/DE par stopwords (instantané).
 *   2. IntentClassifier (regex) : score chaque intent par matching de mots-clés
 *      et de patterns. Renvoie l'intent de score max + confidence.
 *   3. Si confidence < 0.6 → LlmIntentFallback (optionnel) : prompt ultra-court
 *      pour trancher. Skip si aucun provider n'est configuré.
 *
 * Le tout est synchrone pour les cas triviaux (conversation/humor/short_reply)
 * et asynchrone uniquement quand un LLM est requis.
 */

import {
  type IntentCategory,
  type IntentResult,
  type SupportedLanguage,
  FAST_TRACK_INTENTS,
} from './intentTypes.js';

// ──────────────────────────────────────────────────────────────
// 1. LANGUAGE DETECTION
// ──────────────────────────────────────────────────────────────

const STOPWORDS: Record<SupportedLanguage, string[]> = {
  fr: ['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'je', 'tu', 'il', 'elle',
       'nous', 'vous', 'ils', 'elles', 'est', 'sont', 'et', 'ou', 'mais', 'pour',
       'avec', 'sans', 'sur', 'dans', 'ce', 'ça', 'cela', 'merci', 'bonjour',
       'salut', 'comment', 'pourquoi', 'quoi', 'quel', 'quelle', 'voici'],
  en: ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'you', 'he', 'she',
       'we', 'they', 'and', 'or', 'but', 'for', 'with', 'without', 'on', 'in',
       'this', 'that', 'thanks', 'hello', 'hi', 'how', 'why', 'what', 'which',
       'here'],
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'yo',
       'tu', 'el', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'es',
       'son', 'y', 'o', 'pero', 'para', 'con', 'sin', 'sobre', 'en', 'este',
       'esta', 'gracias', 'hola', 'como', 'por que', 'que', 'cual'],
  de: ['der', 'die', 'das', 'ein', 'eine', 'ich', 'du', 'er', 'sie', 'wir',
       'ihr', 'sie', 'ist', 'sind', 'und', 'oder', 'aber', 'für', 'mit',
       'ohne', 'auf', 'in', 'dies', 'das', 'danke', 'hallo', 'wie', 'warum',
       'was', 'welch'],
};

const LANG_ACCENTS: Partial<Record<SupportedLanguage, RegExp>> = {
  fr: /[àâçéèêëîïôùûüœæ]/i,
  es: /[ñ¿¡]/i,
  de: /[äöüß]/i,
};

export function detectLanguage(text: string): SupportedLanguage {
  const tokens = text.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return 'fr'; // défaut bot Discord FR

  // 1. Indices forts : accents diacritiques
  for (const [lang, re] of Object.entries(LANG_ACCENTS) as [SupportedLanguage, RegExp][]) {
    if (re.test(text)) {
      // Vérifier que ce n'est pas un faux positif (ex: "café" en anglais)
      const matches = tokens.filter((t) => STOPWORDS[lang].includes(t)).length;
      if (matches >= 1) return lang;
    }
  }

  // 2. Stopwords scoring
  let bestLang: SupportedLanguage = 'fr';
  let bestScore = 0;
  for (const lang of Object.keys(STOPWORDS) as SupportedLanguage[]) {
    const score = tokens.filter((t) => STOPWORDS[lang].includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  return bestLang;
}

// ──────────────────────────────────────────────────────────────
// 2. INTENT CLASSIFICATION (regex + scoring)
// ──────────────────────────────────────────────────────────────

interface IntentPattern {
  intent: IntentCategory;
  patterns: RegExp[];
  /** Bonus si on est dans un thread/réponse à un message précédent */
  contextBonus?: number;
  /** Score de base quand au moins un pattern matche */
  baseScore: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'conversation',
    baseScore: 0.95,
    patterns: [
      /^(salut|bonjour|bonsoir|coucou|hello|hi|hey|yo|cc|wesh|bonjour à tous|hello everyone)\s*[!.?…]*$/i,
      /^(ça va|ca va|comment (tu vas|vous allez)|ça gaze|ça roule|how are you|how's it going)\s*\??$/i,
      /^(merci|thanks|thank you|gracias|danke|thx|merci beaucoup|thanks a lot)\s*[!.?…]*$/i,
      /^(bonne (nuit|journée|soirée)|good (night|day|evening)|buenas (noches|dias)|gute (nacht|nacht)|see you|à plus|a\+)\s*[!.?…]*$/i,
      /^(mdr|lol|haha|ptdr|😂|🤣|😅|jajaja|xD)\s*[!.?…]*$/i,
      /^(t'es là|tu es là|you there|are you there)\s*\??$/i,
      /^(ok|d'accord|d accord|okay|alright|c'est noté|noted|got it|c est ok)\s*[!.?…]*$/i,
      /^(bien|cool|super|top|nice|parfait|great|awesome|bueno|genial)\s*[!.?…]*$/i,
    ],
  },
  {
    intent: 'humor',
    baseScore: 0.9,
    patterns: [
      /t'es nul/i,
      /tu sers à rien/i,
      /c'est (nul|bidon|de la merde)/i,
      /you're useless/i,
      /this sucks/i,
      /n'importe quoi/i,
      /c'est quoi ce bordel/i,
      /wsh/i,
      /\b(ptdr|xdd|😂😂|🤣|lol)\b/i,
    ],
  },
  {
    intent: 'short_reply',
    baseScore: 0.85,
    patterns: [
      /^(oui|non|ouais|nope|yep|yup|yes|no|si|claro|nein|ja|non merci|yes please)\s*[!.?…]*$/i,
      /^(vas[- ]y|go|let's go|let's do it|adelante|los|auf gehts|let's go)\s*[!.?…]*$/i,
      /^(arrête|stop|attend|wait|halt)\s*[!.?…]*$/i,
      /^(quoi|pardon|hein|what|huh|que)\s*\??$/i,
      /^(ah|oh|eh|hmm|hm)\s*[!.?…]*$/i,
    ],
  },
  {
    intent: 'support',
    baseScore: 0.8,
    patterns: [
      /\b(problème|probleme|bug|erreur|crash|planté|cassé|cassè|down|outage|incident)\b/i,
      /\b(ne (marche|fonctionne) plus|doesn't work|not working|broken|failed)\b/i,
      /\b(aide moi|help me|au secours|help|besoin d'aide|need help)\b/i,
      /\b(support|ticket|assistance|modérateur|moderator|staff)\b/i,
      /\b(j'ai une erreur|got an error|i have an issue)\b/i,
      /\b(mon bot|mon serveur|my bot|my server)\b.*\b(ne|marche|fonctionne|répond|responds)\b/i,
    ],
  },
  {
    intent: 'ethone_info',
    baseScore: 0.75,
    patterns: [
      /\b(ethone|brain|assistant)\b/i,
      /\b(spotify|discord|github|notion|todoist|google)\b.*\b(comment|how|connect|configurer|setup)\b/i,
      /\b(dashboard|widget|theme|thème|crimson)\b/i,
      /\b(mémoire|memory|note|tâche|task|focus)\b.*\b(comment|how)\b/i,
    ],
  },
  {
    intent: 'action',
    baseScore: 0.8,
    patterns: [
      /^(lance|démarre|start|launch|commence|begin)\b/i,
      /\b(crée|create|ajoute|add|new|nouvelle|nouveau)\s+(une?\s+)?(note|tâche|task|event|événement|timer|focus|session)\b/i,
      /\b(ouvre|open|ferme|close|stop|pause|resume|reprise)\b/i,
      /\b(connecte|connect|déconnecte|disconnect|reconnecte|reconnect|link)\b/i,
      /\b(supprime|delete|efface|remove|clear)\b/i,
      /^\/(play|pause|skip|stop|note|task|focus|timer|focus)\b/i,
    ],
  },
  {
    intent: 'search',
    baseScore: 0.75,
    patterns: [
      /\b(trouve|find|cherche|search|look for|montre|show|affiche|display)\b/i,
      /\b(où est|where is|où sont|where are)\b/i,
      /\b(dernier|last|récent|recent|previous|précédent)\b.*\b(fichier|file|commit|message|notification|tâche|task)\b/i,
    ],
  },
  {
    intent: 'informational',
    baseScore: 0.6, // plus bas car ambigu
    patterns: [
      /^(c'est quoi|qu'est-ce que|what is|what's|que es|was ist)\b/i,
      /\?$/, // se termine par un point d'interrogation
      /\b(comment (ça marche|ça fonctionne|faire)|how does|how to|how can)\b/i,
      /\b(explique|explain|décris|describe|dis-moi|teach me|apprends-moi)\b/i,
    ],
  },
];

const FOLLOW_UP_PATTERNS: RegExp[] = [
  /^(et|and|y|ou|or)\s+/i,
  /^(aussi|also|trop|too)\s+/i,
  /^(celui-là|celle-là|that one|this one|esto|das)\s*/i,
  /^(sur mobile|sur pc|on mobile|on pc|en anglais|en français)\s*\??$/i,
  /^(de (même|plus)|also|mais encore)\s+/i,
];

const CONFIRMATION_PATTERNS: RegExp[] = [
  /^(oui|ouais|yep|yup|yes|si|claro|ja|go|vas[- ]y|c'est parti|let's go|do it|fais[- ]le|allons[- ]y)\s*[!.?…]*$/i,
  /^(non|nope|no|nein|cancel|annule|pas maintenant|not now)\s*[!.?…]*$/i,
];

const ACTION_VERBS = ['lance', 'démarre', 'start', 'launch', 'crée', 'create', 'ajoute',
  'add', 'ouvre', 'open', 'ferme', 'close', 'stop', 'pause', 'reprise', 'resume',
  'connecte', 'connect', 'supprime', 'delete', 'efface', 'remove', 'joue', 'play',
  'envoie', 'send', 'cherche', 'find', 'trouve'];

const SERVICE_HINTS = ['spotify', 'discord', 'github', 'notion', 'todoist', 'google',
  'brain', 'ethone', 'focus', 'note', 'notes', 'task', 'tâche', 'timer', 'mail',
  'calendar', 'calendrier', 'weather', 'météo', 'file', 'fichier', 'dashboard'];

function extractEntities(text: string): IntentResult['entities'] {
  const lower = text.toLowerCase();
  const actionVerb = ACTION_VERBS.find((v) => lower.includes(v));
  const serviceHint = SERVICE_HINTS.find((s) => lower.includes(s));
  const isFollowUp = FOLLOW_UP_PATTERNS.some((p) => p.test(text));
  const isConfirmation = CONFIRMATION_PATTERNS.some((p) => p.test(text.trim()));
  return { actionVerb, serviceHint, isFollowUp, isConfirmation };
}

/**
 * Classifie un message par regex + scoring.
 * Renvoie `null` si aucun pattern ne matche (confidence 0).
 */
function classifyByRegex(text: string, trimmed: string): {
  intent: IntentCategory;
  confidence: number;
} {
  let bestIntent: IntentCategory = 'clarification';
  let bestScore = 0;

  for (const def of INTENT_PATTERNS) {
    let matches = 0;
    for (const pattern of def.patterns) {
      if (pattern.test(text) || pattern.test(trimmed)) matches++;
    }
    if (matches > 0) {
      // baseScore * (1 - decay) : décay léger pour pénaliser les faux positifs
      const score = def.baseScore * Math.min(1, matches / def.patterns.length + 0.5);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = def.intent;
      }
    }
  }

  // Bonus : si le message est très court (< 4 mots) et match "conversation", on garde haut
  if (bestIntent === 'conversation' && trimmed.split(/\s+/).length <= 3) {
    bestScore = Math.max(bestScore, 0.95);
  }

  // Bonus : si le message se termine par ? et n'a pas matché autre chose → informational
  if (bestScore < 0.5 && trimmed.endsWith('?')) {
    return { intent: 'informational', confidence: 0.55 };
  }

  return { intent: bestIntent, confidence: bestScore };
}

// ──────────────────────────────────────────────────────────────
// 3. LLM FALLBACK (optionnel)
// ──────────────────────────────────────────────────────────────

interface LlmFallbackOptions {
  enabled: boolean;
  /** Fonction async qui classifie via un LLM. Renvoie intent+confidence. */
  classify?: (text: string, lang: SupportedLanguage) => Promise<{ intent: IntentCategory; confidence: number } | null>;
  /** Timeout max (ms) avant de tomber en "clarification" */
  timeoutMs?: number;
}

/**
 * Détecte l'intent d'un message.
 *
 * Mode rapide (synchrone) :
 *   - Language detection (instantané)
 *   - Regex classification (instantané)
 *   - Pour intents fast-track (confidence > 0.8) → retour immédiat
 *
 * Mode lent (async) :
 *   - Si confidence < 0.6 ET `opts.classify` fourni ET `opts.enabled`
 *   - Appelle `opts.classify(text, lang)` avec timeout
 *   - Sinon → intent "clarification" avec confidence basse
 */
export async function detectIntent(
  text: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  opts: LlmFallbackOptions = { enabled: false },
): Promise<IntentResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      intent: 'clarification',
      confidence: 0,
      language: 'fr',
      entities: {},
      usedLlmFallback: false,
    };
  }

  const language = detectLanguage(trimmed);
  const entities = extractEntities(trimmed);
  const { intent, confidence } = classifyByRegex(trimmed, trimmed);

  // Fast-track : intents triviaux, pas besoin de LLM
  if (FAST_TRACK_INTENTS.includes(intent) && confidence >= 0.8) {
    return { intent, confidence, language, entities, usedLlmFallback: false };
  }

  // Si on a un historique et que le message est très court → regarder si c'est un follow-up
  if (history.length > 0 && trimmed.split(/\s+/).length <= 3) {
    const lastAssistant = history.filter((m) => m.role === 'assistant').slice(-1)[0];
    if (lastAssistant && /\?|choisis|dis-moi|souhaites-tu|veux-tu|que veux-tu/i.test(lastAssistant.content)) {
      // Réponse courte après une question → confirmation probable
      entities.isFollowUp = true;
      if (entities.isConfirmation || confidence < 0.4) {
        return {
          intent: 'short_reply',
          confidence: 0.9,
          language,
          entities,
          usedLlmFallback: false,
        };
      }
    }
  }

  // Confidence suffisante → retour direct
  if (confidence >= 0.6) {
    return { intent, confidence, language, entities, usedLlmFallback: false };
  }

  // Confidence basse + LLM activé → fallback
  if (opts.enabled && opts.classify) {
    try {
      const timeoutMs = opts.timeoutMs ?? 2000;
      const llmResult = await Promise.race([
        opts.classify(trimmed, language),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
      if (llmResult && llmResult.confidence > confidence) {
        return {
          intent: llmResult.intent,
          confidence: llmResult.confidence,
          language,
          entities,
          usedLlmFallback: true,
        };
      }
    } catch {
      // silencieux → tombe en clarification
    }
  }

  // Dernier recours : clarification
  return {
    intent: 'clarification',
    confidence: Math.max(confidence, 0.3),
    language,
    entities,
    usedLlmFallback: false,
  };
}

// ──────────────────────────────────────────────────────────────
// 4. SHORT REPLIES (par intent + langue)
// ──────────────────────────────────────────────────────────────

/**
 * Réponses courtes et naturelles quand le LLM n'est pas dispo ou que
 * l'intent est trivial. Le ton reste cohérent avec la personnalité
 * configurée (`personality.name`) — ici générique "ETHONE".
 */
export const SHORT_REPLIES: Record<IntentCategory, Partial<Record<SupportedLanguage, string[]>>> = {
  conversation: {
    fr: [
      "Ça va bien 😄 Merci de demander ! Et toi, comment tu vas ?",
      "Au top ! Prêt à t'aider sur ce que tu veux faire sur ETHONE.",
      "Salut ! 👀 Je suis là si tu as besoin.",
    ],
    en: [
      "Doing great 😄 Thanks for asking! How are you?",
      "All good! Ready to help with whatever you need on ETHONE.",
      "Hey! 👀 I'm here if you need anything.",
    ],
    es: [
      "¡Todo bien 😄! Gracias por preguntar. ¿Y tú?",
      "¡Listo para ayudarte en lo que necesites en ETHONE!",
    ],
    de: [
      "Mir geht's gut 😄 Danke der Nachfrage! Und dir?",
      "Bereit, dir bei allem zu helfen, was du auf ETHONE brauchst.",
    ],
  },
  humor: {
    fr: [
      "😂 Touché ! Je mérite ça. Bon, on fait quoi maintenant ?",
      "Haha, je note la blague. Et sinon, je peux t'aider ?",
      "Aïe 😄 Mais je suis toujours opérationnel, tu sais.",
    ],
    en: [
      "😂 Fair enough! What can I actually help you with?",
      "Haha, noted. So, what do you actually need?",
    ],
    es: ["😂 ¡Me lo merezco! ¿En qué puedo ayudarte?"],
    de: ["😂 Verdient! Wobei kann ich dir wirklich helfen?"],
  },
  short_reply: {
    fr: ["Parfait, j'enchaîne !", "OK, c'est parti !", "Bien reçu 👍"],
    en: ["Got it 👍", "Sounds good!", "On it!"],
    es: ["¡Perfecto!", "¡Vamos!"],
    de: ["Verstanden!", "Auf gehts!"],
  },
  clarification: {
    fr: [
      "Je veux bien t'aider, mais ta demande est un peu floue pour moi. Tu peux préciser ce que tu attends ?",
      "Hmm, je ne suis pas sûr de bien saisir. Tu veux dire quoi exactement ?",
    ],
    en: [
      "I want to help, but your request is a bit unclear. Could you clarify?",
      "Hmm, I'm not sure I follow. What exactly do you mean?",
    ],
    es: ["¿Puedes ser un poco más específico?", "No estoy seguro de entender, ¿qué quieres decir?"],
    de: ["Kannst du das bitte genauer erklären?", "Ich bin nicht sicher, was du meinst."],
  },
  // Les intents ci-dessous n'ont PAS de short-reply : ils passent toujours par le LLM
  informational: {},
  ethone_info: {},
  support: {},
  action: {},
  search: {},
};

export function pickShortReply(intent: IntentCategory, language: SupportedLanguage, seed = 0): string | null {
  const replies = SHORT_REPLIES[intent]?.[language] ?? SHORT_REPLIES[intent]?.['fr'] ?? [];
  if (replies.length === 0) return null;
  return replies[seed % replies.length];
}
