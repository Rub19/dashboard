import { stripMarkup } from "./notes";

export const BILL_CATEGORIES = [
  "housing",
  "utilities",
  "transport",
  "health",
  "insurance",
  "subscriptions",
  "food",
  "education",
  "taxes",
  "other",
] as const;

export type BillCategory = (typeof BILL_CATEGORIES)[number] | (string & Record<never, never>);
export type Recurrence = "none" | "weekly" | "monthly" | "yearly";

export type Bill = {
  id: string;
  label: string;
  amount: number;
  currency: string;
  dueDate: string;
  paid: boolean;
  category: BillCategory;
  recurrence: Recurrence;
  createdAt: string;
};

const STORAGE_KEY = "ethone-bills-v1";

function isClient(): boolean {
  return typeof window !== "undefined";
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toISODate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function isBill(value: unknown): value is Bill {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<Bill>;
  return (
    typeof b.id === "string" &&
    typeof b.label === "string" &&
    typeof b.dueDate === "string" &&
    typeof b.amount === "number" &&
    typeof b.paid === "boolean" &&
    typeof b.category === "string" &&
    typeof b.recurrence === "string"
  );
}

export function loadBills(): Bill[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBill);
  } catch {
    return [];
  }
}

function saveBills(bills: Bill[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch {
    // silent
  }
}

export function addBill(input: Omit<Bill, "id" | "createdAt">): Bill {
  const bills = loadBills();
  const bill: Bill = { ...input, id: newId(), createdAt: new Date().toISOString() };
  bills.push(bill);
  saveBills(bills);
  return bill;
}

export function editBill(id: string, patch: Partial<Omit<Bill, "id" | "createdAt">>): Bill {
  const bills = loadBills();
  const index = bills.findIndex((b) => b.id === id);
  if (index === -1) throw new Error("Bill not found");
  bills[index] = { ...bills[index], ...patch };
  saveBills(bills);
  return bills[index];
}

export function removeBill(id: string): boolean {
  const bills = loadBills();
  const next = bills.filter((b) => b.id !== id);
  if (next.length === bills.length) return false;
  saveBills(next);
  return true;
}

export function listBills(): Bill[] {
  const bills = loadBills();
  const from = new Date();
  return [...bills].sort((a, b) => {
    const aNext = getNextDueDate(a, from);
    const bNext = getNextDueDate(b, from);
    if (!aNext) return 1;
    if (!bNext) return -1;
    return parseISODate(aNext).getTime() - parseISODate(bNext).getTime();
  });
}

export function getNextDueDate(bill: Bill, from: Date = new Date()): string | null {
  const due = parseISODate(bill.dueDate);
  if (isNaN(due.getTime())) return null;

  const start = startOfDay(from);
  if (bill.recurrence === "none") {
    const d = startOfDay(due);
    return d >= start ? bill.dueDate : null;
  }

  const current = new Date(due);
  current.setHours(0, 0, 0, 0);
  let safety = 0;
  while (current < start && safety < 120) {
    if (bill.recurrence === "weekly") {
      current.setDate(current.getDate() + 7);
    } else if (bill.recurrence === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else if (bill.recurrence === "yearly") {
      current.setFullYear(current.getFullYear() + 1);
    }
    safety++;
  }

  return toISODate(current);
}

export function upcomingBills(days: number): Bill[] {
  const from = startOfDay(new Date());
  const to = addDays(from, days);
  const upcoming = listBills()
    .filter((b) => !b.paid)
    .map((b) => ({ bill: b, next: getNextDueDate(b, from) }))
    .filter((x): x is { bill: Bill; next: string } => {
      if (!x.next) return false;
      const nextDate = parseISODate(x.next);
      return nextDate >= from && nextDate <= to;
    })
    .sort((a, b) => parseISODate(a.next).getTime() - parseISODate(b.next).getTime())
    .map((x) => x.bill);
  return upcoming;
}

export function totalDueThisMonth(): number {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return listBills().reduce((sum, b) => {
    if (b.paid) return sum;
    const next = getNextDueDate(b, firstDay);
    if (!next) return sum;
    const nextDate = parseISODate(next);
    if (nextDate >= firstDay && nextDate <= lastDay) return sum + b.amount;
    return sum;
  }, 0);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CATEGORY_HINTS: Record<BillCategory, string[]> = {
  housing: [
    "loyer",
    "rent",
    "hypothèque",
    "mortgage",
    "logement",
    "housing",
    "propriétaire",
    "locataire",
    "copropriété",
    "résidence",
    "appartement",
    "maison",
    "apartment",
    "home",
  ],
  utilities: [
    "électricité",
    "electricity",
    "edf",
    "engie",
    "gaz",
    "gas",
    "eau",
    "water",
    "internet",
    "téléphone",
    "phone",
    "mobile",
    "fournisseur",
    "utility",
    "utilities",
    "orange",
    "sfr",
    "bouygues",
    "free",
    "vodafone",
    "fiber",
    "fibre",
  ],
  transport: [
    "transport",
    "transports",
    "metro",
    "bus",
    "train",
    "essence",
    "gasoline",
    "carburant",
    "parking",
    "voiture",
    "car",
    "vélo",
    "taxi",
    "uber",
    "navigo",
    "tch",
    "toll",
  ],
  health: [
    "santé",
    "health",
    "docteur",
    "doctor",
    "médecin",
    "dentiste",
    "dentist",
    "pharmacie",
    "pharmacy",
    "mutuelle",
    "assurance maladie",
    "hospital",
    "hôpital",
    "clinique",
    "clinic",
    "optician",
  ],
  insurance: [
    "assurance",
    "insurance",
    "mutuelle",
    "maaf",
    "axa",
    "allianz",
    "macif",
    "groupama",
    "mma",
    "cover",
  ],
  subscriptions: [
    "abonnement",
    "subscription",
    "netflix",
    "spotify",
    "youtube",
    "prime",
    "disney",
    "streaming",
    "saas",
    "abonnements",
    "canal",
    "lemonde",
    "github",
    "notion",
    "figma",
  ],
  food: [
    "nourriture",
    "food",
    "courses",
    "groceries",
    "supermarché",
    "supermarket",
    "restaurant",
    "cantine",
    "alimentation",
    "doordash",
    "uber eats",
  ],
  education: [
    "école",
    "school",
    "université",
    "university",
    "cours",
    "course",
    "formation",
    "études",
    "scolarité",
    "tuition",
    "cfa",
    "student",
    "étudiant",
  ],
  taxes: [
    "taxe",
    "tax",
    "impôt",
    "impots",
    "tva",
    "fiscalité",
    "urssaf",
    "crs",
    "irs",
    "impôt revenu",
    "property tax",
  ],
  other: [],
};

export function categorizeWithBrain(bills: Bill[], notes: string[]): Bill[] {
  const noteText = notes.map((n) => stripMarkup(n).toLowerCase()).join(" ");
  const allText = `${noteText} ${bills.map((b) => b.label.toLowerCase()).join(" ")}`;

  const next = bills.map((bill) => {
    const label = bill.label.toLowerCase();
    const windows: string[] = [];

    for (const note of notes) {
      const text = stripMarkup(note).toLowerCase();
      let idx = text.indexOf(label);
      while (idx !== -1) {
        windows.push(text.slice(Math.max(0, idx - 80), idx + label.length + 80));
        idx = text.indexOf(label, idx + 1);
      }
    }

    const source = `${allText} ${windows.join(" ")} ${label}`;
    let best: BillCategory = bill.category || "other";
    let bestScore = 0;

    for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
      if (cat === "other") continue;
      let score = 0;
      for (const h of hints) {
        const regex = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(h)}(?:[^a-z0-9]|$)`, "gi");
        const matches = source.match(regex);
        if (matches) score += matches.length;
      }
      if (score > bestScore) {
        bestScore = score;
        best = cat as BillCategory;
      }
    }

    if (bestScore === 0) {
      for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
        if (cat === "other") continue;
        for (const h of hints) {
          if (label.includes(h)) {
            best = cat as BillCategory;
            break;
          }
        }
        if (best !== (bill.category || "other")) break;
      }
    }

    return { ...bill, category: best };
  });

  saveBills(next);
  return next;
}
