import { ETHONE, clipTab, quickNote, readSelection } from "./clip.js";

const $ = (id) => document.getElementById(id);

const LINKS = [
  ["Accueil", "/", '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ["Notes", "/notes", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9.5 13h6M9.5 17h6"/>'],
  ["Tâches", "/tasks", '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'],
  ["Brain", "/brain", '<path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13l-5.6-2 5.6-2z"/>'],
  ["Calendrier", "/calendar", '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'],
  ["Bot Discord", "/discord", '<rect x="4" y="7.5" width="16" height="12" rx="4"/><path d="M12 3.5v4M9 13.5h.01M15 13.5h.01"/>'],
];

const svgDoc = (paths) => new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${paths}</svg>`, "image/svg+xml").documentElement;
const links = LINKS.map(([label, path, icon], i) => {
  const a = Object.assign(document.createElement("a"), { className: "rise", href: ETHONE + path, target: "_blank", rel: "noopener noreferrer" });
  a.style.setProperty("--i", i + 3);
  const kbd = Object.assign(document.createElement("kbd"), { textContent: String(i + 1) });
  a.append(kbd, svgDoc(icon), label);
  $("links").append(a);
  return a;
});

// Statut réel : la version publiée sur ethone.dev, sinon hors ligne.
(async () => {
  const el = $("status");
  try {
    const res = await fetch(`${ETHONE}/version.json`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    const { version } = await res.json();
    el.dataset.state = "online";
    el.lastElementChild.textContent = `En ligne · v${version}`;
  } catch {
    el.dataset.state = "offline";
    el.lastElementChild.textContent = "Hors ligne";
  }
})();

// ---- Note rapide ----
const noteText = $("noteText");
const seg = document.querySelector(".seg");
let kind = "note";
function setKind(next) {
  kind = next;
  seg.dataset.kind = next;
  seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.kind === next)));
  noteText.placeholder = next === "task" ? "Une chose à faire…" : "Une idée, un lien, une chose à retenir…";
}
seg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-kind]");
  if (b) setKind(b.dataset.kind);
});
noteText.addEventListener("input", () => {
  $("sendNote").disabled = !noteText.value.trim();
});
async function sendNote() {
  const text = noteText.value.trim();
  if (!text) return;
  $("sendNote").disabled = true;
  await quickNote(text, kind);
  window.close();
}
$("sendNote").addEventListener("click", sendNote);
noteText.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendNote();
  }
});

// 1 à 6 : accès rapide (hors saisie).
document.addEventListener("keydown", (e) => {
  if (e.target === noteText || e.ctrlKey || e.metaKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= links.length) {
    e.preventDefault();
    chrome.tabs.create({ url: links[n - 1].href });
    window.close();
  }
});

// ---- Onglet courant ----
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const supported = /^https?:/.test(tab?.url || "");

if (tab) {
  $("pageTitle").textContent = tab.title || tab.url || "Onglet actuel";
  try {
    $("pageHost").textContent = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch { /* URL interne */ }
  if (tab.favIconUrl && supported) {
    $("favicon").src = tab.favIconUrl;
    $("favicon").hidden = false;
  }
}

let selection = "";
if (supported) {
  selection = (await readSelection(tab.id)).trim();
  if (selection) {
    $("selection").textContent = selection.slice(0, 400);
    $("selection").hidden = false;
    $("saveLabel").textContent = "Enregistrer la sélection";
  }
} else {
  $("save").disabled = true;
  $("saveTask").disabled = true;
  $("unsupported").hidden = false;
}

async function save(k) {
  $("save").disabled = true;
  $("saveTask").disabled = true;
  await clipTab(tab, selection, k);
  window.close();
}
$("save").addEventListener("click", () => save("note"));
$("saveTask").addEventListener("click", () => save("task"));
