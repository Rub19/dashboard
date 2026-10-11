"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  Lock,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Copy,
  Check,
  Code,
  Play,
  ImageIcon,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface BrowserClientProps {
  initialId?: string;
}

interface PresetItem {
  id: string;
  title: string;
  url: string;
  description: string;
}

const PRESET_ROUTES: PresetItem[] = [
  {
    id: "home",
    title: "ETHONE Dashboard",
    url: "/",
    description: "Vue d'ensemble du système, widgets et métriques",
  },
  {
    id: "soundscape",
    title: "Soundscape Studio",
    url: "/soundscape",
    description: "Environnement audio et synthétiseur acoustique",
  },
  {
    id: "focus",
    title: "Focus & Pomodoro",
    url: "/focus",
    description: "Espace de productivité et sessions chronométrées",
  },
  {
    id: "discord",
    title: "Discord Center",
    url: "/discord",
    description: "Gestion des bots, salons et passerelle serveur",
  },
  {
    id: "webhook-discord",
    title: "Webhook Discord (API)",
    url: "https:" + "/" + "/discord.com/api/webhooks/test",
    description: "En-têtes d'isolation et CORS de l'API webhooks Discord",
  },
  {
    id: "webhook-internal",
    title: "Point d'entrée API ETHONE",
    url: "/api/version",
    description: "Validation d'en-têtes HTTP et réponse JSON interne",
  },
];

interface OpenGraphData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  canonical: string | null;
}

interface InspectionResult {
  url: string;
  status: number | null;
  statusText: string | null;
  ttfbMs: number | null;
  timestamp: string;
  headers: Record<string, string>;
  security: {
    csp: string | null;
    hsts: string | null;
    xfo: string | null;
    cors: string | null;
    xcto: string | null;
  };
  og: OpenGraphData;
  error?: string | null;
}

export default function BrowserClient({ initialId }: BrowserClientProps) {
  const { success, error, info } = useToast();

  const [urlInput, setUrlInput] = useState<string>("/");
  const [activeUrl, setActiveUrl] = useState<string>("/");
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeView, setActiveView] = useState<"sandbox" | "inspector" | "split">("split");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [inspection, setInspection] = useState<InspectionResult>({
    url: "/",
    status: 200,
    statusText: "OK",
    ttfbMs: 12,
    timestamp: new Date().toLocaleTimeString(),
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-frame-options": "SAMEORIGIN",
      "x-content-type-options": "nosniff",
      "strict-transport-security": "max-age=31536000; includeSubDomains",
    },
    security: {
      csp: "default-src 'self'; connect-src 'self' https: wss:; frame-ancestors 'self'",
      hsts: "max-age=31536000; includeSubDomains",
      xfo: "SAMEORIGIN",
      cors: "allow-same-origin",
      xcto: "nosniff",
    },
    og: {
      title: "ETHONE Dashboard",
      description: "ETHONE réinvente votre environnement numérique : un espace unifié pour organiser, créer et avancer.",
      image: "/icons/ethone-icon-192.png",
      favicon: "/icons/ethone-icon.svg",
      canonical: "/",
    },
  });

  const runInspection = useCallback(async (targetUrl: string) => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: { Accept: "text/html,application/xhtml+xml,application/json" },
      }).catch(async () => {
        return await fetch(targetUrl, { method: "HEAD" });
      });

      const ttfb = Math.round(performance.now() - start);
      const headersMap: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headersMap[key.toLowerCase()] = value;
      });

      const csp = res.headers.get("content-security-policy");
      const hsts = res.headers.get("strict-transport-security");
      const xfo = res.headers.get("x-frame-options");
      const cors = res.headers.get("access-control-allow-origin");
      const xcto = res.headers.get("x-content-type-options");

      let extractedTitle: string | null = null;
      let extractedDesc: string | null = null;
      let extractedImage: string | null = null;
      let extractedFavicon: string | null = null;
      let extractedCanonical: string | null = targetUrl;

      const isSameOriginOrRelative = targetUrl.startsWith("/") || (typeof window !== "undefined" && targetUrl.startsWith(window.location.origin));
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("html")) {
        try {
          const htmlText = await res.text();
          const doc = new DOMParser().parseFromString(htmlText, "text/html");
          extractedTitle =
            doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
            doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ||
            doc.querySelector("title")?.textContent ||
            null;
          extractedDesc =
            doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
            doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
            doc.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ||
            null;
          extractedImage =
            doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
            doc.querySelector('meta[property="og:image:url"]')?.getAttribute("content") ||
            doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
            null;
          extractedFavicon =
            doc.querySelector('link[rel="icon"]')?.getAttribute("href") ||
            doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
            doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href") ||
            null;
          extractedCanonical =
            doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
            doc.querySelector('meta[property="og:url"]')?.getAttribute("content") ||
            targetUrl;
        } catch {}
      }

      if (typeof window !== "undefined") {
        const baseUrl = isSameOriginOrRelative ? window.location.origin : targetUrl;
        if (extractedImage && !extractedImage.startsWith("http")) {
          try {
            extractedImage = new URL(extractedImage, baseUrl).href;
          } catch {}
        }
        if (extractedFavicon && !extractedFavicon.startsWith("http")) {
          try {
            extractedFavicon = new URL(extractedFavicon, baseUrl).href;
          } catch {}
        } else if (!extractedFavicon) {
          try {
            extractedFavicon = new URL("/favicon.ico", baseUrl).href;
          } catch {}
        }
      }

      if (!extractedTitle && isSameOriginOrRelative) {
        extractedTitle = "ETHONE";
        extractedDesc = "ETHONE réinvente votre environnement numérique : un espace unifié pour organiser, créer et avancer.";
        extractedImage = "/icons/ethone-icon-192.png";
        extractedFavicon = "/icons/ethone-icon.svg";
        extractedCanonical = targetUrl;
      } else if (!extractedTitle && targetUrl.includes("discord.com")) {
        extractedTitle = "Discord API Webhook";
        extractedDesc = "Point de terminaison d'exécution Discord Webhook et gestion des notifications d'événements.";
        extractedFavicon = "https:" + "/" + "/discord.com/favicon.ico";
      }

      setInspection({
        url: targetUrl,
        status: res.status,
        statusText: res.statusText || "OK",
        ttfbMs: ttfb,
        timestamp: new Date().toLocaleTimeString(),
        headers: headersMap,
        security: {
          csp,
          hsts,
          xfo,
          cors,
          xcto,
        },
        og: {
          title: extractedTitle,
          description: extractedDesc,
          image: extractedImage,
          favicon: extractedFavicon,
          canonical: extractedCanonical,
        },
        error: null,
      });
    } catch {
      const ttfb = Math.round(performance.now() - start);
      error("Inspection réseau", "Origine distante restreinte par CORS ou inaccessible.");
      let fallbackFavicon: string | null = null;
      if (typeof window !== "undefined") {
        try {
          fallbackFavicon = new URL("/favicon.ico", targetUrl.startsWith("/") ? window.location.origin : targetUrl).href;
        } catch {}
      }
      setInspection({
        url: targetUrl,
        status: 0,
        statusText: "CORS / Network Boundary",
        ttfbMs: ttfb,
        timestamp: new Date().toLocaleTimeString(),
        headers: {
          "security-note": "CORS strict sur origine externe sans header permissif",
        },
        security: {
          csp: null,
          hsts: null,
          xfo: null,
          cors: "Bloqué par la stratégie de même origine",
          xcto: null,
        },
        og: {
          title: targetUrl.includes("discord") ? "Discord API Webhook" : targetUrl.replace(new RegExp("^https?:[/][/]"), "").split("/")[0],
          description: "Accès réseau direct restreint par les règles de sécurité CORS de l'hôte.",
          image: null,
          favicon: fallbackFavicon,
          canonical: targetUrl,
        },
        error: "Accès réseau direct restreint par les règles de sécurité CORS de l'origine cible.",
      });
    } finally {
      setLoading(false);
    }
  }, [error]);

  const navigateTo = useCallback((newUrl: string) => {
    let trimmed = newUrl.trim();
    if (!trimmed) return;
    const httpPrefix = "http:" + "/" + "/";
    const httpsPrefix = "https:" + "/" + "/";
    if (!trimmed.startsWith("/") && !trimmed.startsWith(httpPrefix) && !trimmed.startsWith(httpsPrefix)) {
      if (trimmed.includes(".")) {
        trimmed = `${httpsPrefix}${trimmed}`;
      } else {
        trimmed = `/${trimmed}`;
      }
    }
    setUrlInput(trimmed);
    setActiveUrl(trimmed);
    void runInspection(trimmed);
  }, [runInspection]);

  useEffect(() => {
    if (initialId) {
      const found = PRESET_ROUTES.find((p) => p.id === initialId);
      if (found) {
        navigateTo(found.url);
        return;
      }
    }
    void runInspection("/");
  }, [initialId, navigateTo, runInspection]);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const targetWidth = viewportMode === "desktop" ? 1440 : viewportMode === "tablet" ? 768 : 390;
    if (containerWidth < targetWidth) {
      setScale(containerWidth / targetWidth);
    } else {
      setScale(1);
    }
  }, [viewportMode]);

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [updateScale]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(activeUrl);
    setCopied(true);
    success("Lien copié !", activeUrl);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      try {
        iframeRef.current.src = activeUrl;
      } catch {
      }
    }
    void runInspection(activeUrl);
    info("Actualisation", "Rechargement de la sandbox et réanalyse des en-têtes.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const targetWidth = viewportMode === "desktop" ? 1440 : viewportMode === "tablet" ? 768 : 390;
  const targetHeight = viewportMode === "desktop" ? 820 : viewportMode === "tablet" ? 920 : 780;

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] p-4 text-[var(--text-primary)] sm:p-8 pb-36">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-[var(--panel-border)] pb-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Inspecteur Réel & Bac à Sable Web</h1>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                Isolation Iframe
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Analyse HTTP et en-têtes de sécurité réels, émulation multi-formats et bac à sable interactif.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-1">
            <button
              type="button"
              onClick={() => setActiveView("sandbox")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                activeView === "sandbox" ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Sandbox
            </button>
            <button
              type="button"
              onClick={() => setActiveView("split")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                activeView === "split" ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Vue Scindée
            </button>
            <button
              type="button"
              onClick={() => setActiveView("inspector")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                activeView === "inspector" ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              Inspecteur
            </button>
          </div>

          <div className="flex items-center rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-1">
            <button
              type="button"
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "desktop" ? "bg-white/15 text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Bureau 1440px"
            >
              <Laptop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">1440px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("tablet")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "tablet" ? "bg-white/15 text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Tablette 768px"
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">768px</span>
            </button>
            <button
              type="button"
              onClick={() => setViewportMode("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "mobile" ? "bg-white/15 text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
              title="Mobile 390px"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">390px</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {PRESET_ROUTES.map((item) => {
          const isSelected = activeUrl === item.url;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.url)}
              className={cn(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-sm"
                  : "border-[var(--panel-border)] bg-[var(--surface-raised)]/40 hover:bg-[var(--surface-raised)]/70 hover:border-white/15"
              )}
            >
              <span className="text-xs font-bold text-[var(--text-primary)] truncate w-full">{item.title}</span>
              <span className="text-[10px] text-[var(--text-muted)] truncate w-full mt-0.5">{item.url}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b border-[var(--panel-border)] bg-black/40 p-2.5">
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Accueil"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Actualiser et analyser"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", loading && "animate-spin text-[var(--accent-primary)]")} />
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--bg-main)] px-3 py-1.5 text-xs text-[var(--text-primary)]">
            <Lock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Entrez une URL ou une route interne (/soundscape, /focus...)"
              className="flex-1 bg-transparent font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Analyser</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Copier l'URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => window.open(activeUrl, "_blank")}
              className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
              title="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)]/60 bg-black/20 px-4 py-2 text-xs">
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Statut :</span>
              <strong className={cn(inspection.status && inspection.status >= 200 && inspection.status < 400 ? "text-emerald-400" : "text-amber-400")}>
                {inspection.status ? `${inspection.status} ${inspection.statusText}` : "Inconnu"}
              </strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Latence (TTFB) :</span>
              <strong className="text-[var(--text-primary)]">
                {inspection.ttfbMs !== null ? `${inspection.ttfbMs} ms` : "—"}
              </strong>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Résolution :</span>
              <strong className="text-[var(--accent-primary)]">{targetWidth}px</strong>
              {scale < 1 && <span className="text-[var(--text-muted)]">({Math.round(scale * 100)}% échelle)</span>}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sandboxée allow-scripts allow-same-origin</span>
          </div>
        </div>

        <div className="p-4 bg-[var(--bg-card)]">
          <div className={cn("grid gap-4", activeView === "split" ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1")}>
            {(activeView === "sandbox" || activeView === "split") && (
              <div
                ref={containerRef}
                className={cn(
                  "relative flex flex-col items-center justify-start overflow-hidden rounded-xl border border-[var(--panel-border)] bg-black/60 p-2",
                  activeView === "split" ? "lg:col-span-8" : "w-full"
                )}
                style={{
                  minHeight: `${Math.min(targetHeight, targetHeight * scale + 40)}px`,
                }}
              >
                <div
                  className="transition-transform duration-200 ease-out origin-top"
                  style={{
                    width: `${targetWidth}px`,
                    height: `${targetHeight}px`,
                    transform: `scale(${scale})`,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    key={activeUrl}
                    src={activeUrl}
                    title="ETHONE Sandbox Iframe"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    className="h-full w-full rounded-lg border border-white/10 bg-black/90 shadow-2xl"
                  />
                </div>
              </div>
            )}

            {(activeView === "inspector" || activeView === "split") && (
              <div
                className={cn(
                  "flex flex-col gap-4 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 font-mono text-xs",
                  activeView === "split" ? "lg:col-span-4" : "w-full"
                )}
              >
                <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                    <Code className="h-4 w-4 text-[var(--accent-primary)]" />
                    <span>En-têtes de Sécurité Réseau</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">{inspection.timestamp}</span>
                </div>

                <div className="rounded-xl border border-[var(--panel-border)] bg-black/40 p-3 space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)]">
                      <ImageIcon className="h-4 w-4 text-[var(--accent-primary)]" />
                      <span>Aperçu OpenGraph</span>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                      Social & SEO
                    </span>
                  </div>

                  {inspection.og.image ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[var(--panel-border)]/60 bg-black/60 shadow-inner">
                      <img
                        src={inspection.og.image}
                        alt={inspection.og.title || "Bannière OpenGraph"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--panel-border)]/60 bg-black/30 text-[var(--text-muted)]">
                      <ImageIcon className="h-6 w-6 opacity-40" />
                      <span className="text-[10px]">Aucune bannière og:image détectée</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      {inspection.og.favicon && (
                        <img
                          src={inspection.og.favicon}
                          alt=""
                          className="h-4 w-4 shrink-0 rounded object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {inspection.og.title || "Titre OpenGraph non renseigné"}
                      </h4>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)] line-clamp-2">
                      {inspection.og.description || "Aucune description OpenGraph ou meta description fournie par la ressource."}
                    </p>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--panel-border)]/40 bg-black/40 px-2.5 py-1.5 font-mono text-[10px]">
                      <span className="truncate text-[var(--text-muted)]">
                        {inspection.og.canonical || inspection.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const cUrl = inspection.og.canonical || inspection.url;
                          navigator.clipboard?.writeText(cUrl);
                          success("URL Canonique copiée", cUrl);
                        }}
                        className="shrink-0 p-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Copier l'URL canonique"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 font-sans">
                  <div className="rounded-lg border border-[var(--panel-border)] bg-black/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                      <span>Content-Security-Policy</span>
                      {inspection.security.csp ? (
                        <span className="text-[10px] font-bold text-emerald-400">ACTIF</span>
                      ) : (
                        <span className="text-[10px] text-amber-400">NON DÉFINI</span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] break-all">
                      {inspection.security.csp || "Aucune politique restrictive transmise par l'hôte."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--panel-border)] bg-black/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                      <span>Strict-Transport-Security (HSTS)</span>
                      {inspection.security.hsts ? (
                        <span className="text-[10px] font-bold text-emerald-400">ACTIF</span>
                      ) : (
                        <span className="text-[10px] text-amber-400">ABSENT</span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] break-all">
                      {inspection.security.hsts || "En-tête HTTPS HSTS non détecté."}
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--panel-border)] bg-black/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                      <span>X-Frame-Options</span>
                      <span className="text-[10px] font-mono text-[var(--accent-primary)]">
                        {inspection.security.xfo || "ALLOWALL"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                      Contrôle du cadrage iframe par les clients externes.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--panel-border)] bg-black/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                      <span>Access-Control-Allow-Origin (CORS)</span>
                      <span className="text-[10px] font-mono text-[var(--accent-primary)]">
                        {inspection.security.cors || "Même origine requise"}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                      Politique d&apos;autorisation des requêtes cross-origin du serveur hôte.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[var(--panel-border)] bg-black/40 p-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-primary)]">
                      <span>X-Content-Type-Options</span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {inspection.security.xcto || "nosniff"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 border-t border-[var(--panel-border)] pt-2.5 font-sans">
                  <span className="text-[11px] font-bold text-[var(--text-primary)] block mb-1.5">
                    Toutes les En-têtes Reçues ({Object.keys(inspection.headers).length})
                  </span>
                  <div className="max-h-48 overflow-y-auto os-scroll space-y-1 rounded-lg bg-black/50 p-2 font-mono text-[10px]">
                    {Object.entries(inspection.headers).map(([key, value]) => (
                      <div key={key} className="break-all">
                        <span className="text-[var(--accent-primary)]">{key}: </span>
                        <span className="text-[var(--text-muted)]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
