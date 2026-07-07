// Shared JS helpers for the ui/components.css design-system primitives
// (.ui-switch, .ui-tabs). Keep these generic — no page-specific logic here.

// Flips an aria-checked switch element (role="switch") and returns the new
// boolean state so callers can chain it straight into their own handler:
//   onclick="notifToggleCategory('cat', toggleSwitch(this))"
function toggleSwitch(el) {
  if (!el || el.getAttribute('aria-disabled') === 'true') {
    return el ? el.getAttribute('aria-checked') === 'true' : false;
  }
  const next = el.getAttribute('aria-checked') !== 'true';
  el.setAttribute('aria-checked', String(next));
  return next;
}

// Space/Enter activates a switch exactly like a click, per the native
// checkbox/button keyboard contract.
function switchKeydown(e, el) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    el.click();
  }
}

// Wires a .ui-tabs container: click on any .ui-tab child activates it and
// shows the matching panel. Panels are looked up by [data-tab-panel="<id>"]
// within `panelRoot` (defaults to the tabs container's parent).
// Tabs declare their target via data-tab="<id>".
function initTabs(container, onChange, panelRoot) {
  if (!container || container.__uiTabsInit) return;
  container.__uiTabsInit = true;
  const root = panelRoot || container.parentElement || document;
  const tabs = () => Array.from(container.querySelectorAll('.ui-tab'));

  function activate(tab) {
    tabs().forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const id = tab.dataset.tab;
    if (id) {
      root.querySelectorAll('[data-tab-panel]').forEach(p => {
        p.hidden = p.getAttribute('data-tab-panel') !== id;
      });
    }
    if (onChange) onChange(id, tab);
  }

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('.ui-tab');
    if (tab && container.contains(tab)) activate(tab);
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = tabs();
    const i = list.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    next.focus();
    activate(next);
  });

  const current = container.querySelector('.ui-tab.active, .ui-tab[aria-selected="true"]') || tabs()[0];
  if (current) activate(current);
}
