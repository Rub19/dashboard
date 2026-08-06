import { brandIconMarkup } from "../data/brand-icons.mjs";

export function debounce(fn, wait = 150) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttleFrame(fn) {
  let frame = null;
  let pendingArgs = null;
  return function throttled(...args) {
    pendingArgs = args;
    if (frame != null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      fn.apply(this, pendingArgs);
    });
  };
}

export function element(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text != null) node.textContent = String(options.text);
  if (options.id) node.id = options.id;

  Object.entries(options.attributes || {}).forEach(([name, value]) => {
    if (value == null || value === false) return;
    node.setAttribute(name, value === true ? "" : String(value));
  });

  if (tagName === "img" && !node.hasAttribute("decoding")) {
    node.setAttribute("decoding", "async");
  }
  Object.entries(options.dataset || {}).forEach(([name, value]) => {
    if (value != null) node.dataset[name] = String(value);
  });
  Object.entries(options.events || {}).forEach(([name, listener]) => {
    if (typeof listener === "function") node.addEventListener(name, listener);
  });

  const list = Array.isArray(children) ? children : [children];
  list.flat(Infinity).forEach((child) => {
    if (child == null || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

export function icon(name, className = "") {
  return element("i", {
    className,
    dataset: { lucide: name },
    attributes: { "aria-hidden": "true" }
  });
}

export function brandIcon(brandId, fallbackName, className = "") {
  const markup = brandIconMarkup(brandId);
  if (!markup) return icon(fallbackName, className);
  const wrapper = element("span", { className, attributes: { "aria-hidden": "true" } });
  wrapper.innerHTML = markup;
  return wrapper.firstElementChild || icon(fallbackName, className);
}

export function actionButton(options = {}, children = []) {
  const classes = ["v8-button", options.variant ? `v8-button--${options.variant}` : "", options.className || ""]
    .filter(Boolean)
    .join(" ");
  return element("button", {
    className: classes,
    attributes: {
      type: "button",
      disabled: options.disabled || null,
      "aria-label": options.ariaLabel || null
    },
    dataset: { action: options.actionId }
  }, children);
}

export function attachFlipBehavior(card) {
  if (!card || card._v8FlipAttached) return card;
  card._v8FlipAttached = true;
  card.setAttribute("role", "button");
  if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
  card.setAttribute("aria-expanded", "false");

  const toggle = () => {
    const flipped = card.classList.toggle("is-flipped");
    card.setAttribute("aria-expanded", String(flipped));
  };

  card.addEventListener("click", (event) => {
    if (event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    toggle();
  });
  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  });

  return card;
}

export function attachTypeToSelect(container, selector, getLabel = (el) => el.textContent || "") {
  let buffer = "";
  let timer = null;
  const handler = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
    if (event.key.length !== 1) return;
    buffer += event.key.toLowerCase();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { buffer = ""; }, 800);
    const items = [...container.querySelectorAll(selector)];
    const match = items.find((el) => getLabel(el).trim().toLowerCase().startsWith(buffer)) ||
                  items.find((el) => getLabel(el).trim().toLowerCase().includes(buffer));
    if (match) {
      match.scrollIntoView({ block: "nearest", behavior: "smooth" });
      match.classList.add("is-type-matched");
      setTimeout(() => match.classList.remove("is-type-matched"), 1200);
    }
  };
  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}
