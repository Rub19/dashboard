// Partagé par la popup et le service worker. Le clip voyage dans le #hash de /clip :
// il n'est jamais envoyé au serveur, et l'extension n'a besoin d'aucun jeton ni compte.
export const ETHONE = "https://ethone.dev";

const cut = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function clipUrl({ title, url, selection }) {
  const payload = { t: cut(title, 200), u: /^https?:/.test(url || "") ? cut(url, 2048) : "", s: cut(selection, 5000) };
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

export async function clipTab(tab, selection) {
  const text = selection ?? (await readSelection(tab.id));
  await chrome.tabs.create({ url: clipUrl({ title: tab.title, url: tab.url, selection: text }), index: tab.index + 1 });
}
