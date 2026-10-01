import { ETHONE, PAGES, clipTab, findPage, quickNote } from "./clip.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "clip-selection", title: "Enregistrer « %s » dans ETHONE", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "task-selection", title: "Ajouter « %s » comme tâche ETHONE", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "clip-page", title: "Enregistrer la page dans ETHONE", contexts: ["page", "link"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  if (info.menuItemId === "clip-selection") clipTab(tab, info.selectionText || "", "note");
  else if (info.menuItemId === "task-selection") clipTab(tab, info.selectionText || "", "task");
  else if (info.menuItemId === "clip-page") {
    // Clic droit sur un lien : on enregistre le lien, pas la page qui le contient.
    clipTab(info.linkUrl ? { ...tab, url: info.linkUrl, title: info.linkUrl } : tab, info.linkUrl ? "" : undefined);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "clip-page") return;
  tab ??= (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (tab) clipTab(tab);
});

// Barre d'adresse : « eth notes » ouvre une page, « eth tâche acheter du pain » crée une tâche,
// tout autre texte devient une note rapide.
const escapeXml = (s) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

chrome.omnibox.setDefaultSuggestion({ description: "Note rapide ETHONE — tape ton texte, ou un nom de page (notes, tâches, brain…)" });

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const q = text.trim().toLowerCase();
  suggest(
    PAGES.filter((p) => q && (p.key.startsWith(q) || p.alias?.some((a) => a.startsWith(q))))
      .slice(0, 5)
      .map((p) => ({ content: p.key, description: `Ouvrir <match>${escapeXml(p.label)}</match> <dim>ethone.dev${escapeXml(p.path)}</dim>` }))
  );
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const page = findPage(text);
  const open = (url) =>
    disposition === "currentTab" ? chrome.tabs.update({ url }) : chrome.tabs.create({ url, active: disposition !== "newBackgroundTab" });
  if (page) return open(ETHONE + page.path);
  const m = text.trim().match(/^(t[âa]che|task)\s+(.+)/i);
  if (m) return quickNote(m[2], "task");
  if (text.trim()) quickNote(text.trim(), "note");
});
