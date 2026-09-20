/**
 * Analyse une demande du type « Crée une note intitulée Courses avec la liste : lait, pain »
 * pour en tirer un TITRE propre et, s'il est fourni, le CONTENU exact voulu.
 *
 * Avant, tout ce qui suivait « crée une note » devenait le titre (« intitulée Test Brain avec la
 * liste : lait, pain, œufs ») et le corps de la note était la réponse de conversation de l'IA
 * (« Note **Test Brain** créée : … n'hésite pas si… »).
 */
export interface NoteRequest {
  title: string;
  /** Contenu explicitement demandé (markdown), ou null si l'utilisateur n'en a pas donné. */
  content: string | null;
}

const LEAD =
  /^(?:peux-tu|peux tu|tu peux|pourrais-tu|stp|s'il te pla[iî]t|merci de|je voudrais|je veux)?\s*(?:cr[ée]{1,2}r?|ajoute[r]?|fais|faire)\s*(?:moi)?\s*(?:une|la)?\s*note\s*/i;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function toMarkdown(raw: string): string {
  const text = raw.trim().replace(/[.!\s]+$/g, "");
  if (!text) return "";
  const parts = text
    .split(/\s*(?:,|;|\n|\s+et\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.map((p) => `- ${p}`).join("\n") : text;
}

export function parseNoteRequest(prompt: string): NoteRequest {
  const rest = prompt.replace(LEAD, "").trim();

  // « intitulée X », « nommée X », « appelée X », « titrée X » (jusqu'à « avec », « : », « contenant »)
  const named = rest.match(
    /^(?:intitul[ée]e?|nomm[ée]e?|appel[ée]e?|titr[ée]e?)\s+(.+?)(?=\s+(?:avec|contenant|qui contient)\b|\s*:|$)/i
  );

  // Contenu : après « avec (la liste / le texte / le contenu) », « contenant », ou après « : »
  let content: string | null = null;
  const withContent = rest.match(
    /(?:avec|contenant|qui contient)\s+(?:la liste|le texte|le contenu|les [ée]l[ée]ments|:)?\s*:?\s*(.+)$/i
  );
  if (withContent?.[1]) content = withContent[1];
  else {
    const colon = rest.match(/:\s*(.+)$/);
    if (colon?.[1]) content = colon[1];
  }

  let title: string;
  if (named?.[1]) {
    title = named[1];
  } else {
    // « sur / pour / concernant X » → X, sinon ce qui précède « avec » / « : »
    const topic = rest
      .replace(/^(?:sur|pour|concernant|à propos de|:)\s*/i, "")
      .split(/\s+(?:avec|contenant|qui contient)\b|\s*:/i)[0]
      .trim();
    title = topic;
  }

  title = capitalize(title.replace(/^["«“']+|["»”']+$/g, "").trim()).slice(0, 80);
  return {
    title: title || "Nouvelle note Brain",
    content: content ? toMarkdown(content) : null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tâches : « Crée une tâche appeler le plombier demain, c'est urgent »       */
/* -------------------------------------------------------------------------- */

export interface TaskRequest {
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  /** Échéance ISO (midi, heure locale) ou null si aucune date n'est mentionnée. */
  dueDate: string | null;
}

const TASK_LEAD =
  /^(?:peux-tu|peux tu|tu peux|pourrais-tu|stp|s'il te pla[iî]t|merci de|je voudrais|je veux)?\s*(?:cr[ée]{1,2}r?|ajoute[r]?|faire|fais)\s*(?:moi)?\s*(?:une|la)?\s*(?:nouvelle\s+)?t[aâ]che\s*(?:sur|pour|concernant|:)?\s*/i;

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function atNoon(base: Date, plusDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + plusDays, 12, 0, 0, 0);
  return d.toISOString();
}

export function parseTaskRequest(prompt: string, now: Date = new Date()): TaskRequest {
  let rest = prompt.replace(TASK_LEAD, "").trim();
  let dueDate: string | null = null;

  const dateRules: Array<[RegExp, () => string]> = [
    [/\baujourd['’]?hui\b|\bce soir\b|\bce matin\b|\bcet apr[eè]s-midi\b/i, () => atNoon(now, 0)],
    [/\bapr[eè]s[- ]demain\b/i, () => atNoon(now, 2)],
    [/\bdemain\b/i, () => atNoon(now, 1)],
  ];
  for (const [re, fn] of dateRules) {
    if (re.test(rest)) {
      dueDate = fn();
      rest = rest.replace(re, " ");
      break;
    }
  }
  if (!dueDate) {
    const day = rest.match(/\b(?:ce |ce prochain |prochain )?(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi)\b/i);
    if (day) {
      const target = WEEKDAYS.indexOf(day[1].toLowerCase());
      let delta = (target - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7;
      dueDate = atNoon(now, delta);
      rest = rest.replace(day[0], " ");
    }
  }

  let priority: TaskRequest["priority"] = "medium";
  if (/\burgent(?:e)?\b|\basap\b|\btr[eè]s important\b/i.test(rest)) priority = "urgent";
  else if (/\bimportant(?:e)?\b|\bprioritaire\b|\bpriorit[ée]\b/i.test(rest)) priority = "high";
  else if (/\bpas press[ée]e?\b|\bquand j['’]ai le temps\b/i.test(rest)) priority = "low";
  rest = rest
    .replace(/[,;]?\s*(?:c['’]est\s+|c'est\s+)?(?:tr[eè]s\s+)?(?:urgent(?:e)?|asap|important(?:e)?|prioritaire|pas press[ée]e?|quand j['’]ai le temps)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "")
    .trim();

  const title = (rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "Nouvelle tâche Brain").slice(0, 120);
  return { title, priority, dueDate };
}
