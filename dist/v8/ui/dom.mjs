export function element(tagName, options = {}, children = []) {
  const node = document.createElement(tagName);
  if (options.className) node.className = options.className;
  if (options.text != null) node.textContent = String(options.text);
  if (options.html != null) node.innerHTML = String(options.html);
  if (options.id) node.id = options.id;

  Object.entries(options.attributes || {}).forEach(([name, value]) => {
    if (value == null || value === false) return;
    node.setAttribute(name, value === true ? "" : String(value));
  });
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
