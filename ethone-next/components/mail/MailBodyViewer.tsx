"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MailMessage } from "@/lib/hooks/useMail";
import { cn } from "@/lib/utils";
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
  try {
    const parsed = new URL(trimmed, "https://ethone.invalid/");
    return SAFE_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function cleanStyleAttribute(styleValue: string): string {
  if (!styleValue) return "";
  if (/expression\s*\(|behavior\s*:|javascript\s*:/i.test(styleValue)) {
    return "";
  }
  return styleValue;
}

function sanitizeEmailNode(node: Node) {
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

  if (tag === "A") {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }

  if (tag === "STYLE") {
    const cssText = el.textContent || "";
    if (/expression\s*\(|behavior\s*:|javascript\s*:|@import/i.test(cssText)) {
      el.textContent = "";
    }
    return;
  }

  Array.from(el.childNodes).forEach((child) => sanitizeEmailNode(child));
}

export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    sanitizeEmailNode(doc.body);
    if (doc.head) {
      Array.from(doc.head.childNodes).forEach((child) => {
        const el = child as Element;
        if (el.tagName && el.tagName.toUpperCase() === "STYLE") {
          sanitizeEmailNode(el);
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
  const rawHtml = msg.body_html || "";
  const rawText = msg.body_text || msg.snippet || "";
  const hasHtml = Boolean(rawHtml && /<\/?[a-z][\s\S]*/i.test(rawHtml));
  const hasBoth = Boolean(hasHtml && rawText.trim().length > 0);

  const [viewMode, setViewMode] = useState<"html" | "text">(hasHtml ? "html" : "text");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [iframeHeight, setIframeHeight] = useState<number>(380);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setViewMode(hasHtml ? "html" : "text");
  }, [hasHtml, msg.id]);

  const sanitizedHtml = useMemo(() => {
    if (!hasHtml) return "";
    return sanitizeEmailHtml(rawHtml);
  }, [rawHtml, hasHtml]);

  const srcDoc = useMemo(() => {
    if (!hasHtml) return "";
    const isLight = themeMode === "light";
    const bg = isLight ? "#ffffff" : "#141518";
    const text = isLight ? "#111827" : "#e5e7eb";
    const linkColor = isLight ? "#2563eb" : "#60a5fa";
    const quoteBorder = isLight ? "#cbd5e1" : "#334155";
    const quoteText = isLight ? "#64748b" : "#94a3b8";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base target="_blank" />
  <style>
    html, body {
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${text};
      background-color: ${bg};
      line-height: 1.55;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    td img {
      max-width: 100%;
    }
    a {
      color: ${linkColor};
    }
    blockquote {
      margin: 1em 0;
      padding-left: 12px;
      border-left: 3px solid ${quoteBorder};
      color: ${quoteText};
    }
    pre, code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>
  ${sanitizedHtml}
</body>
</html>`;
  }, [sanitizedHtml, hasHtml, themeMode]);

  const syncHeight = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const bHeight = doc.body?.scrollHeight || 0;
      const dHeight = doc.documentElement?.scrollHeight || 0;
      const measured = Math.max(bHeight, dHeight, 160);
      setIframeHeight(measured + 24);
    } catch {
      setIframeHeight(500);
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
      });
      if (typeof ResizeObserver !== "undefined" && doc.body) {
        const ro = new ResizeObserver(() => syncHeight());
        ro.observe(doc.body);
      }
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-1)] shadow-sm">
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
              onClick={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
              title={themeMode === "light" ? "Basculer en mode sombre" : "Basculer sur fond clair"}
            >
              {themeMode === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              <span>{themeMode === "light" ? "Fond clair (original)" : "Mode sombre"}</span>
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
          className={cn(
            "w-full transition-colors",
            themeMode === "light" ? "bg-white" : "bg-[#141518]"
          )}
        >
          <iframe
            ref={iframeRef}
            title={`Message ${msg.id}`}
            srcDoc={srcDoc}
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            onLoad={handleIframeLoad}
            style={{
              height: `${iframeHeight}px`,
              width: "100%",
              border: "none",
              display: "block",
            }}
          />
        </div>
      ) : (
        <div className="p-5 text-[var(--text-primary)]">
          <PlainTextContent text={rawText || "Message vide"} />
        </div>
      )}
    </div>
  );
}
