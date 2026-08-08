const BILLS_KEY = "ethone_bills_v1";

const RECURRENCE_RULES = Object.freeze({
  oneoff: { label: "Épisode", compute: (base, offset) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset) },
  monthly: { label: "Mensuel", compute: (base, offset) => new Date(base.getFullYear(), base.getMonth() + offset, base.getDate()) },
  quarterly: { label: "Trimestriel", compute: (base, offset) => new Date(base.getFullYear(), base.getMonth() + offset * 3, base.getDate()) },
  yearly: { label: "Annuel", compute: (base, offset) => new Date(base.getFullYear() + offset, base.getMonth(), base.getDate()) },
  weekly: { label: "Hebdomadaire", compute: (base, offset) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset * 7) }
});

const DEFAULT_CATEGORIES = Object.freeze({
  subscription: { label: "Abonnements", icon: "calendar-clock", color: "#8b5cf6" },
  utility: { label: "Services publics", icon: "zap", color: "#3b82f6" },
  rent: { label: "Loyer / Logement", icon: "home", color: "#10b981" },
  insurance: { label: "Assurance", icon: "shield", color: "#f59e0b" },
  finance: { label: "Crédit / Banque", icon: "landmark", color: "#ef4444" },
  other: { label: "Autre", icon: "receipt", color: "#6b7280" }
});

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseStored(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((entry) => ({
      ...entry,
      amount: Number(entry.amount) || 0,
      dueDate: entry.dueDate ? new Date(entry.dueDate) : new Date(),
      createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date()
    }));
  } catch {
    return [];
  }
}

function generateOccurrences(entry, from, to) {
  const rule = RECURRENCE_RULES[entry.recurrence] || RECURRENCE_RULES.oneoff;
  const occurrences = [];
  const base = startOfDay(entry.dueDate);
  let cursor = base;
  let index = 0;
  let safety = 0;
  while (cursor <= to && safety < 120) {
    if (cursor >= from && !entry.skipDates?.some((d) => isSameDay(new Date(d), cursor))) {
      occurrences.push({ ...entry, occurrenceId: `${entry.id}:${index}`, dueDate: new Date(cursor) });
    }
    index += 1;
    if (entry.recurrence === "oneoff" && index > 0) break;
    cursor = startOfDay(rule.compute(base, index));
    safety += 1;
  }
  return occurrences;
}

function readBills(storage) {
  if (!storage) return [];
  try {
    return parseStored(storage.getItem(BILLS_KEY));
  } catch {
    return [];
  }
}

function writeBills(storage, bills) {
  if (!storage) return;
  try {
    storage.setItem(BILLS_KEY, JSON.stringify(bills));
  } catch { /* silent */ }
}

function extractAmount(text) {
  const match = String(text).match(/(?:\$|€|£|USD|EUR|CHF)?\s?(\d{1,6}(?:[.,]\d{2})?)/);
  return match ? Number(match[1].replace(",", ".")) : 0;
}

function extractDate(text, base = new Date()) {
  const dmy = String(text).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (dmy) {
    const [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
    const year = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
    const candidate = new Date(year, m - 1, d);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  const ymd = String(text).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const candidate = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const monthMatch = String(text).toLowerCase().match(new RegExp(`(${months.join("|")})\\s+(\\d{1,2})(?:,?\\s+(\\d{4}))?`, "i"));
  if (monthMatch) {
    const month = months.findIndex((m) => m.toLowerCase() === monthMatch[1].toLowerCase());
    const year = monthMatch[3] ? Number(monthMatch[3]) : base.getFullYear();
    const candidate = new Date(year, month, Number(monthMatch[2]));
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  return null;
}

function extractTitle(text) {
  const clean = String(text).replace(/\$|€|£|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}/g, " ").replace(/\s+/g, " ").trim();
  return clean.split(/[,.;]|\n/).map((s) => s.trim()).filter(Boolean)[0] || "Facture";
}

function guessCategory(text) {
  const t = String(text).toLowerCase();
  if (/spotify|netflix|abonnement|subscription|icloud|adobe|microsoft/.test(t)) return "subscription";
  if (/électricité|eau|gaz|internet|wifi|fibre|élec/.test(t)) return "utility";
  if (/loyer|rent|propriétaire|appartement|maison/.test(t)) return "rent";
  if (/assurance|mutuelle|prévoyance/.test(t)) return "insurance";
  if (/crédit|prêt|banque|remboursement|loan/.test(t)) return "finance";
  return "other";
}

function heuristicScan(text) {
  const dueDate = extractDate(text) || new Date();
  return {
    title: extractTitle(text).slice(0, 120),
    amount: extractAmount(text),
    currency: String(text).includes("€") ? "€" : String(text).includes("£") ? "£" : "$",
    dueDate,
    category: guessCategory(text),
    recurrence: /mensuel|monthly|chaque mois|tous les mois/.test(String(text).toLowerCase()) ? "monthly" : /annuel|yearly|tous les ans/.test(String(text).toLowerCase()) ? "yearly" : "oneoff",
    icon: null,
    color: null
  };
}

async function brainScan(text, externalServices) {
  try {
    const reply = await externalServices?.brain?.complete({
      messages: [
        { role: "system", content: "Tu es un extracteur de factures. Réponds UNIQUEMENT avec un objet JSON contenant title, amount (number), currency (string $ € £), dueDate (YYYY-MM-DD), category (subscription, utility, rent, insurance, finance, other), recurrence (oneoff, monthly, quarterly, yearly, weekly)." },
        { role: "user", content: String(text).slice(0, 4000) }
      ]
    });
    const content = reply?.message?.content || reply?.reply || "";
    const json = content.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;
    const parsed = JSON.parse(json);
    return {
      title: String(parsed.title || "").slice(0, 120),
      amount: Number(parsed.amount) || 0,
      currency: String(parsed.currency || "$").slice(0, 3),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : new Date(),
      category: DEFAULT_CATEGORIES[parsed.category] ? parsed.category : "other",
      recurrence: RECURRENCE_RULES[parsed.recurrence] ? parsed.recurrence : "oneoff",
      icon: null,
      color: null
    };
  } catch {
    return null;
  }
}

export function createBillsManager(options = {}) {
  const runtime = options.runtime || globalThis;
  const storage = options.storage || runtime.localStorage || null;
  let bills = readBills(storage);
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn({ bills: [...bills], snapshot: getSnapshot() }));
  }

  function persist() {
    writeBills(storage, bills);
    notify();
  }

  function getSnapshot() {
    const today = startOfDay(new Date());
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const upcoming = [];
    for (const entry of bills) {
      if (entry.paused) continue;
      upcoming.push(...generateOccurrences(entry, today, end));
    }
    upcoming.sort((a, b) => a.dueDate - b.dueDate);
    const total = upcoming.filter((o) => o.dueDate >= today && o.dueDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)).reduce((sum, o) => sum + o.amount, 0);
    return Object.freeze({ total, count: upcoming.length, upcoming });
  }

  function billsForDate(date) {
    const target = startOfDay(date);
    const today = startOfDay(new Date());
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const result = [];
    for (const entry of bills) {
      if (entry.paused) continue;
      const occurrences = generateOccurrences(entry, today, end).filter((o) => isSameDay(o.dueDate, target));
      result.push(...occurrences);
    }
    return Object.freeze(result);
  }

  function addBill(bill) {
    const entry = {
      id: bill.id || uid(),
      title: String(bill.title || "").slice(0, 120),
      amount: Math.max(0, Number(bill.amount) || 0),
      currency: String(bill.currency || "$").slice(0, 3),
      dueDate: startOfDay(bill.dueDate || new Date()),
      recurrence: RECURRENCE_RULES[bill.recurrence] ? bill.recurrence : "oneoff",
      category: DEFAULT_CATEGORIES[bill.category] ? bill.category : "other",
      icon: bill.icon || DEFAULT_CATEGORIES[bill.category]?.icon || "receipt",
      color: bill.color || DEFAULT_CATEGORIES[bill.category]?.color || "#6b7280",
      notes: String(bill.notes || "").slice(0, 500),
      paused: bill.paused === true,
      createdAt: new Date()
    };
    bills = [entry, ...bills];
    persist();
    return entry;
  }

  function updateBill(id, patch) {
    bills = bills.map((entry) => {
      if (entry.id !== id) return entry;
      const updated = { ...entry };
      if (patch.title !== undefined) updated.title = String(patch.title).slice(0, 120);
      if (patch.amount !== undefined) updated.amount = Math.max(0, Number(patch.amount) || 0);
      if (patch.currency !== undefined) updated.currency = String(patch.currency).slice(0, 3);
      if (patch.dueDate !== undefined) updated.dueDate = startOfDay(patch.dueDate);
      if (patch.recurrence !== undefined) updated.recurrence = RECURRENCE_RULES[patch.recurrence] ? patch.recurrence : entry.recurrence;
      if (patch.category !== undefined) {
        updated.category = DEFAULT_CATEGORIES[patch.category] ? patch.category : entry.category;
        updated.icon = patch.icon || DEFAULT_CATEGORIES[updated.category]?.icon || entry.icon;
        updated.color = patch.color || DEFAULT_CATEGORIES[updated.category]?.color || entry.color;
      }
      if (patch.icon !== undefined) updated.icon = String(patch.icon).slice(0, 50);
      if (patch.color !== undefined) updated.color = String(patch.color).slice(0, 20);
      if (patch.notes !== undefined) updated.notes = String(patch.notes).slice(0, 500);
      if (patch.paused !== undefined) updated.paused = patch.paused === true;
      return updated;
    });
    persist();
  }

  function removeBill(id) {
    bills = bills.filter((entry) => entry.id !== id);
    persist();
  }

  async function scan(text, externalServices) {
    const parsed = externalServices?.brain?.complete ? await brainScan(text, externalServices) : null;
    const result = parsed || heuristicScan(text);
    return addBill(result);
  }

  function subscribe(fn) {
    listeners.add(fn);
    fn({ bills: [...bills], snapshot: getSnapshot() });
    return () => listeners.delete(fn);
  }

  return Object.freeze({
    categories: DEFAULT_CATEGORIES,
    recurrences: Object.fromEntries(Object.entries(RECURRENCE_RULES).map(([key, value]) => [key, value.label])),
    add: addBill,
    update: updateBill,
    remove: removeBill,
    get: (id) => bills.find((b) => b.id === id) || null,
    list: () => Object.freeze([...bills]),
    snapshot: getSnapshot,
    forDate: billsForDate,
    scan,
    subscribe
  });
}
