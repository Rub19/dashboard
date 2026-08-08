import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { workspaceById } from "../data/workspaces.mjs";

export const BRAND_MARK_SVG = `<svg viewBox="0 0 64 64" role="img" aria-label="ETHONE"><defs><linearGradient id="v8-rail-brand-surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14191f"/><stop offset="1" stop-color="#080a0d"/></linearGradient><linearGradient id="v8-rail-brand-signal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7be5c3"/><stop offset="1" stop-color="#8bc9fa"/></linearGradient></defs><rect x="1.25" y="1.25" width="61.5" height="61.5" rx="15.25" fill="url(#v8-rail-brand-signal)"/><rect x="4.15" y="4.15" width="55.7" height="55.7" rx="12.6" fill="url(#v8-rail-brand-surface)"/><path d="M19 18v28m0-28h26M19 32h20.5M19 46h26" fill="none" stroke="#f4f7fa" stroke-width="6.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function avatarMarkup(avatar, fallback, className = "") {
  const cls = className ? ` class="${escapeAttribute(className)}"` : "";
  if (avatar && avatar.kind === "image" && avatar.value) {
    return `<img${cls} src="${escapeAttribute(avatar.value)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  }
  const glyph = avatar && (avatar.kind === "symbol" || avatar.kind === "initials") ? avatar.value : fallback;
  return `<span${cls} aria-hidden="true">${escapeAttribute(glyph || fallback || "E")}</span>`;
}

function itemMarkup(item, activeRoute, expanded) {
  const active = item.id === activeRoute;
  const current = active ? ' aria-current="page"' : "";
  const label = escapeAttribute(item.label);
  const icon = escapeAttribute(item.icon);
  const tooltip = expanded ? "" : ` data-tooltip="${label}"`;
  return `<button type="button" class="v8-rail-item${active ? " is-active" : ""}" data-action="${item.actionId}" data-route="${item.id}"${current} aria-label="${label}"${tooltip}><i data-lucide="${icon}" aria-hidden="true"></i><span>${label}</span></button>`;
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
      <button type="button" class="v8-rail__brand" data-action="v8.mission.open" aria-label="Ouvrir Mission Control"${expanded ? "" : ' data-tooltip="Mission Control"'}><span class="v8-rail__brand-mark" aria-hidden="true">${BRAND_MARK_SVG}</span><strong>ETHONE</strong></button>
      <button type="button" class="v8-rail__toggle" data-action="v8.sidebar.toggle" aria-label="${toggleLabel}"${expanded ? "" : ` data-tooltip="${toggleLabel}"`}><i data-lucide="${toggleIcon}" aria-hidden="true"></i></button>
    </div>
    <button type="button" class="v8-rail-space" data-action="v8.mission.open" aria-label="Changer de Space">
      <span class="v8-rail-space__mark" aria-hidden="true"><i data-lucide="${escapeAttribute(workspace.icon)}" aria-hidden="true"></i></span>
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
      <button type="button" class="v8-rail-profile" data-action="v8.profile.open" aria-label="Ouvrir le profil">${avatarMarkup(options.avatar, contextName.slice(0, 1).toUpperCase(), "v8-rail-profile__avatar")}<strong>${contextName}</strong><i data-lucide="more-horizontal" aria-hidden="true"></i></button>
    </div>
  </nav>`;
}

export function mobileNavigationMarkup(activeRoute = "home", options = {}) {
  const contextName = escapeAttribute(options.contextName || "Personnel");
  const primary = NAVIGATION_ITEMS.filter((item) => ["home", "notes", "tasks", "calendar", "files"].includes(item.id));
  const more = NAVIGATION_ITEMS.filter((item) => !["home", "notes", "tasks", "calendar", "files"].includes(item.id));
  const primaryMarkup = primary.map((item) => {
    const active = item.id === activeRoute;
    const current = active ? ' aria-current="page"' : "";
    return `<button type="button" class="v8-mobile-nav__item${active ? " is-active" : ""}" data-action="${item.actionId}" data-route="${item.id}"${current} aria-label="${escapeAttribute(item.label)}"><i data-lucide="${escapeAttribute(item.icon)}" aria-hidden="true"></i><span>${escapeAttribute(item.label)}</span></button>`;
  }).join("");
  const moreMarkup = more.map((item) => {
    const active = item.id === activeRoute;
    const current = active ? ' aria-current="page"' : "";
    return `<button type="button" class="v8-mobile-nav__drawer-item${active ? " is-active" : ""}" data-action="${item.actionId}" data-route="${item.id}"${current} aria-label="${escapeAttribute(item.label)}"><i data-lucide="${escapeAttribute(item.icon)}" aria-hidden="true"></i><span>${escapeAttribute(item.label)}</span></button>`;
  }).join("");
  return `<nav class="v8-mobile-nav" aria-label="Navigation mobile">
    <div class="v8-mobile-nav__bar">${primaryMarkup}<button type="button" class="v8-mobile-nav__item" data-action="v8.mobile-nav.more" aria-label="Plus" aria-haspopup="true" aria-expanded="false"><i data-lucide="menu" aria-hidden="true"></i><span>Plus</span></button></div>
    <div class="v8-mobile-nav__drawer" hidden>
      <div class="v8-mobile-nav__drawer-header"><span class="v8-mobile-nav__drawer-title">Applications</span><button type="button" class="v8-icon-button" data-action="v8.mobile-nav.close" aria-label="Fermer"><i data-lucide="x" aria-hidden="true"></i></button></div>
      <div class="v8-mobile-nav__drawer-body">${moreMarkup}</div>
      <div class="v8-mobile-nav__drawer-footer">${avatarMarkup(options.avatar, contextName.slice(0, 1).toUpperCase(), "v8-mobile-nav__avatar")}<span>${contextName}</span></div>
    </div>
  </nav>`;
}
