"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MailMessage, MailAttachment } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/SettingsProvider";
import { THEME_DEFINITIONS, resolveLegacyTheme } from "@/lib/theme-engine";
import {
  ShieldCheck,
  Sun,
  Moon,
  FileText,
  Code2,
  ExternalLink,
} from "@/components/icons/ph";

const DANGEROUS_TAGS = new Set([
  "SCRIPT",
  "OBJECT",
  "EMBED",
  "APPLET",
  "FORM",
  "INPUT",
  "BUTTON",
  "TEXTAREA",
  "SELECT",
  "IFRAME",
  "FRAME",
  "FRAMESET",
  "META",
  "BASE",
  "NOSCRIPT",
]);

const SAFE_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

export function isSafeUrl(rawUrl: string): boolean {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return false;
  if (/^data:image\/(png|jpeg|jpg|gif|svg\+xml|webp);base64,/i.test(trimmed)) {
    return true;
  }
  if (/^cid:/i.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("//")) {
    return true;
  }
  try {
    const parsed = new URL(trimmed, "https://ethone.invalid/");
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function resolveCidUrl(rawCid: string, attachments?: MailAttachment[]): string | null {
  if (!attachments || attachments.length === 0) return null;
  const clean = rawCid.replace(/^cid:\s*/i, "").replace(/[<>]/g, "").trim().toLowerCase();
  if (!clean) return null;
  const found = attachments.find((a) => {
    const fn = (a.filename || "").toLowerCase();
    return fn === clean || fn.includes(clean) || clean.includes(fn);
  });
  if (!found) return null;
  if (found.content) {
    return `data:${found.mime_type || "image/png"};base64,${found.content}`;
  }
  if (found.url) {
    return found.url;
  }
  return null;
}

function cleanStyleAttribute(styleValue: string): string {
  if (!styleValue) return "";
  if (/expression\s*\(|behavior\s*:|javascript\s*:/i.test(styleValue)) {
    return "";
  }
  return styleValue.replace(/url\(\s*['"]?http:\/\//gi, "url('https://");
}

function sanitizeEmailNode(node: Node, attachments?: MailAttachment[]) {
  if (node.nodeType === Node.COMMENT_NODE) {
    (node as ChildNode).remove();
    return;
  }
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) {
    (node as ChildNode).remove();
    return;
  }
  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (DANGEROUS_TAGS.has(tag)) {
    el.remove();
    return;
  }

  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      return;
    }
    if (name === "href" || name === "src" || name === "action" || name === "poster") {
      if (!isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
    if (name === "style") {
      const cleaned = cleanStyleAttribute(attr.value);
      if (cleaned) {
        el.setAttribute("style", cleaned);
      } else {
        el.removeAttribute("style");
      }
    }
  });

  if (tag === "IMG") {
    el.setAttribute("referrerpolicy", "no-referrer");
    el.setAttribute("loading", "eager");
    el.setAttribute("decoding", "async");
    const src = el.getAttribute("src") || "";
    if (src.startsWith("cid:")) {
      const resolved = resolveCidUrl(src, attachments);
      if (resolved) {
        el.setAttribute("src", resolved);
      }
    } else if (src.startsWith("http://")) {
      el.setAttribute("src", `https://${src.slice(7)}`);
    } else if (src.startsWith("//")) {
      el.setAttribute("src", `https:${src}`);
    }
    const srcset = el.getAttribute("srcset");
    if (srcset && srcset.includes("http://")) {
      el.setAttribute("srcset", srcset.replace(/http:\/\//gi, "https://"));
    }
  }

  if (tag === "A") {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
    el.setAttribute("referrerpolicy", "no-referrer");
  }

  if (tag === "STYLE") {
    const cssText = el.textContent || "";
    if (/expression\s*\(|behavior\s*:|javascript\s*:|@import/i.test(cssText)) {
      el.textContent = "";
    }
    return;
  }

  Array.from(el.childNodes).forEach((child) => sanitizeEmailNode(child, attachments));
}

export function sanitizeEmailHtml(html: string, attachments?: MailAttachment[]): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    sanitizeEmailNode(doc.body, attachments);
    if (doc.head) {
      Array.from(doc.head.childNodes).forEach((child) => {
        const el = child as Element;
        if (el.tagName && el.tagName.toUpperCase() === "STYLE") {
          sanitizeEmailNode(el, attachments);
        } else {
          el.remove();
        }
      });
    }
    const styles = doc.head ? doc.head.innerHTML : "";
    return `${styles}${doc.body.innerHTML}`;
  } catch {
    return "";
  }
}

function PlainTextContent({ text }: { text: string }) {
  const parts = useMemo(() => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const isQuote = line.trimStart().startsWith(">");
      const urlRegex = /(https?:\/\/[^\s<]+)/g;
      const segments = line.split(urlRegex);

      return (
        <div
          key={idx}
          className={cn(
            "min-h-[1.25rem]",
            isQuote
              ? "border-l-2 border-[var(--accent-primary)]/40 pl-3 italic text-[var(--text-muted)]"
              : "text-[var(--text-primary)]"
          )}
        >
          {segments.map((seg, sIdx) => {
            if (/^https?:\/\//i.test(seg)) {
              return (
                <a
                  key={sIdx}
                  href={seg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-primary)] underline hover:opacity-80"
                >
                  {seg}
                </a>
              );
            }
            return <span key={sIdx}>{seg}</span>;
          })}
        </div>
      );
    });
  }, [text]);

  return <div className="space-y-1 font-sans text-sm leading-relaxed">{parts}</div>;
}

export default function MailBodyViewer({ msg }: { msg: MailMessage }) {
  const { settings } = useSettings();
  const rawHtml = msg.body_html || "";
  const rawText = msg.body_text || msg.snippet || "";
  const hasHtml = Boolean(rawHtml && /<\/?[a-z][\s\S]*/i.test(rawHtml));
  const hasBoth = Boolean(hasHtml && rawText.trim().length > 0);

  const activeThemeDef = useMemo(() => {
    const rawTheme = settings?.theme || "obsidian";
    const custom = settings?.customThemes?.find((t) => t.id === rawTheme);
    if (custom) return custom;
    const legacyKey = resolveLegacyTheme(rawTheme);
    return THEME_DEFINITIONS[legacyKey] || THEME_DEFINITIONS.obsidian;
  }, [settings?.theme, settings?.customThemes]);

  const [viewMode, setViewMode] = useState<"html" | "text">(hasHtml ? "html" : "text");
  const [themeMode, setThemeMode] = useState<"theme" | "light">("theme");
  const [iframeHeight, setIframeHeight] = useState<number>(550);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMode(hasHtml ? "html" : "text");
  }, [hasHtml, msg.id]);

  const sanitizedHtml = useMemo(() => {
    if (!hasHtml) return "";
    return sanitizeEmailHtml(rawHtml, msg.attachments);
  }, [rawHtml, hasHtml, msg.attachments]);

  const isThemeMode = themeMode === "theme";
  const bg = isThemeMode ? activeThemeDef.bgMain : "#ffffff";
  const text = isThemeMode ? activeThemeDef.textPrimary : "#111827";
  const linkColor = isThemeMode ? (activeThemeDef.accentPrimary || "#60a5fa") : "#2563eb";
  const quoteBorder = isThemeMode ? (activeThemeDef.borderSubtle || "#334155") : "#cbd5e1";
  const quoteText = isThemeMode ? (activeThemeDef.textMuted || "#94a3b8") : "#64748b";
  const colorScheme = isThemeMode ? (activeThemeDef.colorScheme || "dark") : "light";

  const srcDoc = useMemo(() => {
    if (!hasHtml) return "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <meta name="color-scheme" content="${colorScheme}" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data: blob: cid: https: http:; style-src 'unsafe-inline'; font-src * data:; media-src *;" />
  <base target="_blank" />
  <style>
    :root {
      color-scheme: ${colorScheme};
    }
    html, body {
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${text};
      background-color: ${bg} !important;
      line-height: 1.55;
      word-break: break-word;
      overflow-wrap: break-word;
      min-height: 100%;
      -webkit-user-select: text;
      user-select: text;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      max-width: 100% !important;
    }
    img {
      max-width: 100% !important;
      height: auto;
      border-style: none;
      display: inline-block;
      vertical-align: middle;
    }
    td img {
      max-width: 100% !important;
    }
    a {
      color: ${linkColor};
      word-break: break-all;
    }
    blockquote {
      margin: 1em 0;
      padding-left: 12px;
      border-left: 3px solid ${quoteBorder};
      color: ${quoteText};
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;
  }, [sanitizedHtml, hasHtml, colorScheme, text, bg, linkColor, quoteBorder, quoteText]);

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const bHeight = doc.body?.scrollHeight || 0;
      const dHeight = doc.documentElement?.scrollHeight || 0;
      const contentHeight = Math.max(bHeight, dHeight);
      const minH = containerRef.current ? Math.max(containerRef.current.clientHeight - 48, 520) : 520;
      const finalHeight = Math.max(contentHeight + 24, minH);
      setIframeHeight(finalHeight);
    } catch {
      setIframeHeight(600);
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    syncHeight();
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const imgs = doc.querySelectorAll("img");
      imgs.forEach((img) => {
        img.addEventListener("load", syncHeight);
        img.addEventListener("error", syncHeight);
      });
      if (typeof ResizeObserver !== "undefined" && doc.body) {
        const ro = new ResizeObserver(() => syncHeight());
        ro.observe(doc.body);
      }
      setTimeout(syncHeight, 100);
      setTimeout(syncHeight, 350);
      setTimeout(syncHeight, 800);
    } catch {}
  }, [syncHeight]);

  useEffect(() => {
    window.addEventListener("resize", syncHeight);
    return () => window.removeEventListener("resize", syncHeight);
  }, [syncHeight]);

  const handleOpenExternal = useCallback(() => {
    const content = hasHtml ? srcDoc : `<!DOCTYPE html><html><body><pre>${rawText}</pre></body></html>`;
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [hasHtml, srcDoc, rawText]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 min-h-0 w-full overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-1)] shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-border)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-xs select-none">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--text-secondary)]">Rendu isolé & assaini</span>
          {hasHtml && (
            <span className="rounded-md bg-[var(--surface-3)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {viewMode === "html" ? "Format HTML" : "Texte brut"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasBoth && (
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "html" ? "text" : "html")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            >
              {viewMode === "html" ? <FileText className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
              <span>{viewMode === "html" ? "Texte brut" : "Rendu HTML"}</span>
            </button>
          )}

          {viewMode === "html" && (
            <button
              type="button"
              onClick={() => setThemeMode(themeMode === "theme" ? "light" : "theme")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              title={themeMode === "theme" ? "Basculer sur fond clair (original)" : "Appliquer le thème Ethone"}
            >
              {themeMode === "theme" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span>{themeMode === "theme" ? "Thème Ethone" : "Fond clair (original)"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenExternal}
            className="flex items-center gap-1 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {viewMode === "html" ? (
        <div
          className="w-full flex-1 min-h-0 transition-colors"
          style={{ backgroundColor: bg }}
        >
          <iframe
            ref={iframeRef}
            title={`Message ${msg.id}`}
            srcDoc={srcDoc}
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            referrerPolicy="no-referrer"
            onLoad={handleIframeLoad}
            style={{
              minHeight: "100%",
              height: `${iframeHeight}px`,
              width: "100%",
              border: "none",
              display: "block",
              backgroundColor: bg,
            }}
          />
        </div>
      ) : (
        <div className="p-5 text-[var(--text-primary)] flex-1 min-h-0 overflow-y-auto os-scroll select-text">
          <PlainTextContent text={rawText || "Message vide"} />
        </div>
      )}
    </div>
  );
}
