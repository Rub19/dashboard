// Partagé par la popup et le service worker. Le clip voyage dans le #hash de /clip :
// il n'est jamais envoyé au serveur, et l'extension n'a besoin d'aucun jeton ni compte.
export const ETHONE = "https://ethone.dev";

const cut = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** kind : "note" | "task" présélectionne le type sur la page ETHONE. */
export function clipUrl({ title, url, selection, kind }) {
  const payload = { t: cut(title, 200), u: /^https?:/.test(url || "") ? cut(url, 2048) : "", s: cut(selection, 5000) };
  if (kind === "note" || kind === "task") payload.k = kind;
  return `${ETHONE}/clip/#${encodeURIComponent(JSON.stringify(payload))}`;
}

// Lit la sélection de l'onglet actif (permission activeTab). Échoue proprement sur chrome://, le Web Store, les PDF…
export async function readSelection(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: () => String(getSelection() || "") });
    return res?.result || "";
  } catch {
    return "";
  }
}

export async function clipTab(tab, selection, kind) {
  const text = selection ?? (await readSelection(tab.id));
  await chrome.tabs.create({ url: clipUrl({ title: tab.title, url: tab.url, selection: text, kind }), index: tab.index + 1 });
}

/** Note rapide sans page : le texte seul, la page ETHONE prend la 1re ligne comme titre. */
export async function quickNote(text, kind = "note") {
  await chrome.tabs.create({ url: clipUrl({ selection: text, kind }) });
}

// Pages du dashboard, partagées par la popup et la barre d'adresse (« eth notes »).
export const PAGES = [
  { key: "accueil", label: "Accueil", path: "/" },
  { key: "notes", label: "Notes", path: "/notes" },
  { key: "tâches", label: "Tâches", path: "/tasks", alias: ["taches", "tasks"] },
  { key: "brain", label: "Brain", path: "/brain" },
  { key: "calendrier", label: "Calendrier", path: "/calendar", alias: ["calendar", "agenda"] },
  { key: "bot", label: "Bot Discord", path: "/discord", alias: ["discord"] },
  { key: "météo", label: "Météo", path: "/weather", alias: ["meteo", "weather"] },
  { key: "focus", label: "Focus", path: "/focus" },
  { key: "tracker", label: "Tracker", path: "/matches" },
  { key: "fichiers", label: "Fichiers", path: "/files", alias: ["files"] },
  { key: "mail", label: "Mail", path: "/mail" },
  { key: "réglages", label: "Réglages", path: "/settings", alias: ["reglages", "settings", "paramètres", "parametres"] },
];

export function findPage(word) {
  const w = word.trim().toLowerCase();
  if (!w) return null;
  return PAGES.find((p) => p.key === w || p.alias?.includes(w)) || null;
}
