import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { workspaceById } from "../data/workspaces.mjs";

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function itemMarkup(item, activeRoute, expanded) {
  const active = item.id === activeRoute;
  const current = active ? ' aria-current="page"' : "";
  const label = escapeAttribute(item.label);
  const tooltip = expanded ? "" : ` data-tooltip="${label}"`;
  return `<button type="button" class="v8-rail-item${active ? " is-active" : ""}" data-action="${item.actionId}" data-route="${item.id}"${current} aria-label="${label}"${tooltip}><i data-lucide="${item.icon}" aria-hidden="true"></i><span>${label}</span></button>`;
}

export function navigationMarkup(activeRoute = "home", options = {}) {
  const expanded = options.expanded === true;
  const activeSpace = options.space || "personal";
  const workspace = workspaceById(activeSpace);
  const contextName = escapeAttribute(options.contextName || "Personnel");

  const favorites = NAVIGATION_ITEMS.filter((item) => ["home", "notes", "tasks"].includes(item.id));
  const applications = NAVIGATION_ITEMS.filter((item) => !["home", "notes", "tasks"].includes(item.id));
  const favoriteMarkup = favorites.map((item) => itemMarkup(item, activeRoute, expanded)).join("");
  const applicationMarkup = applications.map((item) => itemMarkup(item, activeRoute, expanded)).join("");
  const toggleLabel = expanded ? "Reduire la Sidebar" : "Developper la Sidebar";
  const toggleIcon = expanded ? "panel-left-close" : "panel-left-open";

  return `<nav class="v8-rail${expanded ? " is-expanded" : ""}" aria-label="Navigation principale">
    <div class="v8-rail__top">
      <button type="button" class="v8-rail__brand" data-action="v8.mission.open" aria-label="Ouvrir Mission Control"${expanded ? "" : ' data-tooltip="Mission Control"'}><span aria-hidden="true">E</span><strong>ETHONE</strong></button>
      <button type="button" class="v8-rail__toggle" data-action="v8.sidebar.toggle" aria-label="${toggleLabel}"${expanded ? "" : ` data-tooltip="${toggleLabel}"`}><i data-lucide="${toggleIcon}" aria-hidden="true"></i></button>
    </div>
    <button type="button" class="v8-rail-space" data-action="v8.mission.open" aria-label="Changer de Space">
      <span class="v8-rail-space__mark" aria-hidden="true">${escapeAttribute(workspace.label.slice(0, 1))}</span>
      <span><small>Space actif</small><strong>${escapeAttribute(workspace.label || contextName)}</strong></span>
      <i data-lucide="chevrons-up-down" aria-hidden="true"></i>
    </button>
    <button type="button" class="v8-rail-search" data-action="v8.command.open" aria-label="Rechercher"${expanded ? "" : ' data-tooltip="Rechercher"'}><i data-lucide="search" aria-hidden="true"></i><span>Rechercher</span><kbd>Ctrl K</kbd></button>
    <div class="v8-rail__apps">
      <section class="v8-rail-group" aria-label="Favoris"><span class="v8-rail-group__label">Favoris</span>${favoriteMarkup}</section>
      <section class="v8-rail-group" aria-label="Applications"><span class="v8-rail-group__label">Applications</span>${applicationMarkup}</section>
    </div>
    <div class="v8-rail__footer">
      <button type="button" class="v8-rail-item" data-action="v8.widgets.open" aria-label="Widgets"${expanded ? "" : ' data-tooltip="Widgets"'}><i data-lucide="panels-top-left" aria-hidden="true"></i><span>Widgets</span></button>
      <button type="button" class="v8-rail-profile" data-action="v8.profile.open" aria-label="Ouvrir le profil"><span>R</span><strong>${contextName}</strong><i data-lucide="more-horizontal" aria-hidden="true"></i></button>
    </div>
  </nav>`;
}
