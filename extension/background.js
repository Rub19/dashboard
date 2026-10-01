import { clipTab } from "./clip.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "clip-selection", title: "Enregistrer « %s » dans ETHONE", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "clip-page", title: "Enregistrer la page dans ETHONE", contexts: ["page", "link"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  if (info.menuItemId === "clip-selection") clipTab(tab, info.selectionText || "");
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
