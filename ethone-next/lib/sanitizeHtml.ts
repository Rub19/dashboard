"use client";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "A",
  "PRE",
  "CODE",
  "IMG",
  "SPAN",
  "DIV",
]);

const STRIP_ENTIRELY = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "FORM",
  "INPUT",
  "BUTTON",
  "LINK",
  "META",
  "BASE",
  "NOSCRIPT",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel"]),
  CODE: new Set(["class"]),
  IMG: new Set(["src", "alt", "class"]),
  SPAN: new Set(["class"]),
  DIV: new Set(["class"]),
  P: new Set(["class"]),
};

function safeHref(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://ethone.invalid/");
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return raw;
  } catch {
    return "";
  }
}

function sanitizeChildren(node: Node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      return;
    }
    if (child.nodeType === Node.TEXT_NODE) return;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      return;
    }
    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (STRIP_ENTIRELY.has(tag)) {
      el.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      sanitizeChildren(el);
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      el.remove();
      return;
    }
    const allowed = ALLOWED_ATTRS[tag];
    Array.from(el.attributes).forEach((attr) => {
      if (!allowed?.has(attr.name.toLowerCase())) el.removeAttribute(attr.name);
    });
    if (tag === "A") {
      const safe = safeHref(el.getAttribute("href") || "");
      if (safe) {
        el.setAttribute("href", safe);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      } else {
        el.removeAttribute("href");
      }
    }
    if (tag === "IMG") {
      const safe = safeHref(el.getAttribute("src") || "");
      if (safe) {
        el.setAttribute("src", safe);
      } else {
        el.remove();
        return;
      }
    }
    sanitizeChildren(el);
  });
}

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return String(html || "");
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  sanitizeChildren(doc.body);
  return doc.body.innerHTML;
}

export function stripHtmlToText(html: string): string {
  if (typeof window === "undefined" || typeof document === "undefined") return String(html || "").replace(/<[^>]+>/g, " ");
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  return doc.body.textContent || "";
}
