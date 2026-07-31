import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { computeFloatingPosition, getLayerManager } from "./layer-manager.mjs";

function readOptions(optionNodes) {
  return (Array.isArray(optionNodes) ? optionNodes : []).map((node) => ({
    value: String(node?.value ?? node?.getAttribute?.("value") ?? ""),
    label: String(node?.textContent ?? ""),
    disabled: Boolean(node?.disabled)
  }));
}

export function createSelect(config = {}, optionNodes = []) {
  const documentRef = config.document || globalThis.document;
  const runtime = documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  const options = readOptions(optionNodes);
  let currentValue = String(config.value ?? options.find((entry) => !entry.disabled)?.value ?? options[0]?.value ?? "");
  let listbox = null;
  let layerRegistration = null;

  const triggerLabel = element("span", { className: "v8-select__label" });
  const trigger = element("button", {
    className: `v8-select ${config.className || ""}`.trim(),
    attributes: { type: "button", "aria-haspopup": "listbox", "aria-expanded": "false", disabled: config.disabled || null, ...(config.attributes || {}) },
    dataset: { v8Kind: "select", ...(config.dataset || {}) }
  }, [triggerLabel, icon("chevron-down")]);

  function syncLabel() {
    const active = options.find((entry) => entry.value === currentValue);
    triggerLabel.textContent = active?.label ?? "";
  }
  syncLabel();

  function closeList(restoreFocus = false) {
    if (!listbox) return;
    const current = listbox;
    listbox = null;
    layerRegistration?.release?.({ restoreFocus });
    layerRegistration = null;
    current.remove();
    trigger.setAttribute("aria-expanded", "false");
  }

  function pick(value) {
    const changed = value !== currentValue;
    currentValue = value;
    syncLabel();
    closeList(true);
    if (changed) trigger.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openList() {
    if (listbox || trigger.disabled) return;
    listbox = element("div", {
      className: "v8-select__listbox",
      attributes: { role: "listbox", "aria-label": trigger.getAttribute("aria-label") || "", translate: trigger.getAttribute("translate") || null }
    }, options.map((entry) => element("button", {
      className: "v8-select__option",
      attributes: { type: "button", role: "option", "aria-selected": String(entry.value === currentValue), disabled: entry.disabled || null },
      dataset: { value: entry.value },
      events: { click: () => pick(entry.value) }
    }, [entry.value === currentValue ? icon("check") : element("span", { className: "v8-select__option-spacer" }), element("span", { text: entry.label })])));
    documentRef.body.append(listbox);
    refreshIcons();
    const anchorRect = trigger.getBoundingClientRect();
    const position = computeFloatingPosition({
      anchor: anchorRect,
      floating: listbox.getBoundingClientRect(),
      viewport: { width: runtime.innerWidth, height: runtime.innerHeight },
      preferred: "bottom-start"
    });
    listbox.style.left = `${position.x}px`;
    listbox.style.top = `${position.y}px`;
    listbox.style.minWidth = `${Math.round(anchorRect.width)}px`;
    listbox.style.maxHeight = `${position.maxHeight}px`;
    layerRegistration = layerManager.register({
      element: listbox,
      anchor: trigger,
      returnFocus: trigger,
      kind: "popover",
      closeOnEscape: true,
      closeOnOutside: true,
      closeOnScroll: true,
      closeOnResize: true,
      rovingSelector: "button.v8-select__option:not([disabled])",
      onDismiss: (reason) => closeList(reason === "escape" || reason === "tab")
    });
    (listbox.querySelector('[aria-selected="true"]') || listbox.querySelector("button:not([disabled])"))?.focus({ preventScroll: true });
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", () => (listbox ? closeList(true) : openList()));
  trigger.addEventListener("keydown", (event) => {
    if (!listbox && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      openList();
    }
  });

  Object.defineProperty(trigger, "value", {
    get: () => currentValue,
    set: (next) => {
      currentValue = String(next ?? "");
      syncLabel();
    }
  });

  trigger.closeSelect = () => closeList(false);

  return trigger;
}
