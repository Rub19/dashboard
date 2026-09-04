"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Lock,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Home,
  Plus,
  X,
  Search,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Laptop,
  Smartphone,
  Tablet,
  Terminal,
  Code,
  Copy,
  Check,
  Star,
  Zap,
  Sparkles,
  Layers,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface BrowserClientProps {
  initialId?: string;
}

interface TabItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
}

const PRESET_PAGES: Record<
  string,
  {
    title: string;
    url: string;
    description: string;
    category: string;
    content: React.ReactNode;
  }
> = {
  demo: {
    title: "Portail Démo — ETHONE Web Engine",
    url: "https://demo.ethone.dev",
    description: "Environnement de test interactif avec inspection d'éléments et simulation sandbox.",
    category: "Simulation",
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ETHONE OS Web Sandbox — Mode Démo</h2>
              <p className="text-xs text-zinc-400">
                Moteur de navigation sécurisé avec isolation mémoire et conformité CSP stricte.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Sandbox Isolation</span>
            </div>
            <p className="text-xs text-zinc-400">
              Les scripts tiers sont isolés dans un contexte web-worker sandboxé sans accès au stockage de session hôte.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 mb-2">
              <Zap className="h-4 w-4" />
              <span>Moteur Nitro Render</span>
            </div>
            <p className="text-xs text-zinc-400">
              Pipeline de composition GPU accéléré avec pré-rendu spéculatif des routes internes.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
              <Lock className="h-4 w-4" />
              <span>Strict CSP Enforced</span>
            </div>
            <p className="text-xs text-zinc-400">
              Blocage automatique de toute requête non chiffrée ou hors whitelist de sécurité cloud.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-zinc-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-zinc-400">
            <span>En-têtes de Réponse HTTP Réseau</span>
            <span className="text-[10px] text-emerald-400">200 OK (Cloudflare Edge)</span>
          </div>
          <div className="space-y-1 text-zinc-400">
            <p><span className="text-blue-400">content-security-policy:</span> default-src &apos;self&apos;; connect-src &apos;self&apos; https: wss:;</p>
            <p><span className="text-blue-400">x-frame-options:</span> SAMEORIGIN</p>
            <p><span className="text-blue-400">x-content-type-options:</span> nosniff</p>
            <p><span className="text-blue-400">strict-transport-security:</span> max-age=31536000; includeSubDomains</p>
          </div>
        </div>
      </div>
    ),
  },
  "test-123": {
    title: "Diagnostic Sandbox [test-123]",
    url: "https://audit.ethone.dev/test-123",
    description: "Environnement de validation automatisé pour le monitoring des erreurs et routes.",
    category: "Diagnostic",
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Rapport Diagnostic Session test-123</h2>
              <p className="text-xs text-zinc-400">
                Toutes les assertions de routes statiques et d&apos;absence de fuite CSP sont validées.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Vérification CSP Connect-Src", status: "PASS", detail: "Aucun appel localhost:3001 non sécurisé détecté" },
            { label: "Export Statique Pages Next.js", status: "PASS", detail: "Toutes les routes dynamiques possèdent generateStaticParams" },
            { label: "Redirections SPA Cloudflare", status: "PASS", detail: "Fallback SPA configuré dans public/_redirects" },
            { label: "Ressources Icônes Locales", status: "PASS", detail: "Tolérance de panne SVG offline sans dépendance CDN fragile" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs"
            >
              <div>
                <span className="font-semibold text-white">{item.label}</span>
                <p className="text-[11px] text-zinc-400">{item.detail}</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  google: {
    title: "Recherche Web Sécurisée",
    url: "https://search.ethone.dev/google",
    description: "Index de recherche web intégré avec filtrage strict des traqueurs.",
    category: "Recherche",
    content: (
      <div className="space-y-6 max-w-2xl mx-auto py-8 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-red-500 to-amber-500 text-white shadow-xl mb-4">
          <Globe className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">ETHONE Web Search</h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Moteur de recherche unifié avec indexation temps-réel du dashboard, des bots et des modules cloud.
        </p>

        <div className="relative mt-6">
          <input
            type="text"
            readOnly
            value="ETHONE OS Discord Bot and Performance suite"
            className="w-full rounded-2xl border border-white/20 bg-white/5 py-3.5 pl-12 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        </div>

        <div className="text-left space-y-3 pt-6 border-t border-white/10">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 hover:border-white/20 transition-all">
            <span className="text-[10px] text-blue-400">https://ethone.dev/boost</span>
            <h3 className="text-xs font-bold text-white mt-0.5">Performance & Gaming Boost Hub — ETHONE OS</h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              Optimisation système, nettoyage RAM/CPU, mode Turbo et gestion des perks Discord Boost.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 hover:border-white/20 transition-all">
            <span className="text-[10px] text-emerald-400">https://ethone.dev/discord</span>
            <h3 className="text-xs font-bold text-white mt-0.5">Discord Bot Management Suite — ETHONE</h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              Gestion des tickets, salons vocaux éphémères, logs d&apos;audit, musique et bienvenue.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  docs: {
    title: "Documentation Technique ETHONE",
    url: "https://docs.ethone.dev",
    description: "Spécifications de l&apos;architecture, variables d&apos;environnement et guides d&apos;intégration.",
    category: "Documentation",
    content: (
      <div className="space-y-6">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Documentation Développeur & Référence API</h2>
              <p className="text-xs text-zinc-400">
                Spécifications techniques du dashboard ETHONE OS et des connecteurs Discord.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-bold text-white mb-2">Variables d&apos;Environnement Clés</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="rounded-lg bg-black/40 p-2 text-zinc-300">
                <span className="text-orange-400">NEXT_PUBLIC_DISCORD_BOT_API</span>
                <span className="text-zinc-500"> = </span>
                <span className="text-emerald-400">&quot;https://api.ethone.dev&quot;</span>
                <p className="text-[10px] font-sans text-zinc-400 mt-1">
                  Point d&apos;entrée pour l&apos;API Discord Bot. Si non défini, le dashboard bascule en mode mock démo sécurisé.
                </p>
              </div>
              <div className="rounded-lg bg-black/40 p-2 text-zinc-300">
                <span className="text-orange-400">NEXT_PUBLIC_SITE_URL</span>
                <span className="text-zinc-500"> = </span>
                <span className="text-emerald-400">&quot;https://ethone.dev&quot;</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-xs font-bold text-white mb-2">Règles de Navigation Statique & SPA</h3>
            <p className="text-xs text-zinc-400">
              Le projet utilise <code className="text-blue-400 bg-white/5 px-1 py-0.5 rounded">output: &quot;export&quot;</code> avec Next.js.
              Toutes les routes paramétrées utilisent <code className="text-blue-400 bg-white/5 px-1 py-0.5 rounded">generateStaticParams()</code>
              et le fichier <code className="text-blue-400 bg-white/5 px-1 py-0.5 rounded">public/_redirects</code> assure le fallback Cloudflare Pages.
            </p>
          </div>
        </div>
      </div>
    ),
  },
};

export default function BrowserClient({ initialId }: BrowserClientProps) {
  const { info, success } = useToast();

  const activeId = initialId && PRESET_PAGES[initialId] ? initialId : "demo";

  const [activeTabId, setActiveTabId] = useState<string>(activeId);
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: "demo", title: "Démo Sandbox", url: PRESET_PAGES.demo.url },
    { id: "test-123", title: "Test 123", url: PRESET_PAGES["test-123"].url },
    { id: "google", title: "Web Search", url: PRESET_PAGES.google.url },
    { id: "docs", title: "ETHONE Docs", url: PRESET_PAGES.docs.url },
  ]);

  const [urlInput, setUrlInput] = useState<string>(PRESET_PAGES[activeId].url);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (initialId && PRESET_PAGES[initialId]) {
      setActiveTabId(initialId);
      setUrlInput(PRESET_PAGES[initialId].url);
    }
  }, [initialId]);

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    if (PRESET_PAGES[tabId]) {
      setUrlInput(PRESET_PAGES[tabId].url);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      info("Page actualisée", "Mise à jour du flux d'affichage complétée.");
    }, 450);
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(urlInput);
    setCopied(true);
    success("Lien copié !", urlInput);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPreset = PRESET_PAGES[activeTabId] || PRESET_PAGES.demo;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white p-4 sm:p-8 pb-32">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">ETHONE Web Browser & Test Lab</h1>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400">
                {initialId ? `Session : ${initialId}` : "Moteur Sécurisé"}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Navigateur isolé pour la validation des routes, audit CSP et simulation sandbox.
            </p>
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setViewportMode("desktop")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "desktop" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              )}
              title="Affichage Bureau"
            >
              <Laptop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bureau</span>
            </button>
            <button
              onClick={() => setViewportMode("tablet")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "tablet" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              )}
              title="Affichage Tablette"
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablette</span>
            </button>
            <button
              onClick={() => setViewportMode("mobile")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                viewportMode === "mobile" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              )}
              title="Affichage Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset quick switcher links */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: "demo", title: "Démo", desc: "Sandbox isolée", icon: Sparkles },
          { id: "test-123", title: "Test 123", desc: "Audit CSP & Statique", icon: ShieldCheck },
          { id: "google", title: "Google", desc: "Simulation recherche", icon: Search },
          { id: "docs", title: "Docs", desc: "Guide & Référence", icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeTabId === item.id;
          return (
            <Link
              key={item.id}
              href={`/browser/${item.id}`}
              onClick={() => handleSelectTab(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                isSelected
                  ? "border-blue-500/50 bg-blue-500/10 text-white shadow-sm"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  isSelected ? "bg-blue-500/20 text-blue-400" : "bg-white/5 text-zinc-400"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold truncate text-white">{item.title}</p>
                <p className="text-[10px] text-zinc-500 truncate">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Browser Window Frame */}
      <div
        className={cn(
          "mx-auto rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden transition-all duration-300",
          viewportMode === "desktop" && "w-full",
          viewportMode === "tablet" && "max-w-2xl",
          viewportMode === "mobile" && "max-w-sm"
        )}
      >
        {/* Browser Chrome Header (Tabs Bar) */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900/80 px-4 pt-2.5 overflow-x-auto no-scrollbar">
          {/* Window control dots */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={cn(
                    "group flex items-center gap-2 rounded-t-xl px-3 py-1.5 text-xs transition-all max-w-[180px] truncate cursor-pointer",
                    isActive
                      ? "bg-zinc-950 text-white border-t border-x border-white/10 font-semibold"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  )}
                >
                  <Globe className={cn("h-3 w-3 flex-shrink-0", isActive ? "text-blue-400" : "text-zinc-500")} />
                  <span className="truncate text-[11px]">{tab.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Browser Navigation Bar (URL Bar) */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-zinc-900/40 p-2.5">
          <div className="flex items-center gap-1 text-zinc-400">
            <button
              onClick={() => handleSelectTab("demo")}
              className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              title="Retour"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleSelectTab("test-123")}
              className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              title="Suivant"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all cursor-pointer"
              title="Recharger"
            >
              <RotateCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-blue-400")} />
            </button>
          </div>

          {/* URL Input */}
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-300">
            <Lock className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 font-mono text-[11px]">https://</span>
            <input
              type="text"
              value={urlInput.replace(/^https?:\/\//, "")}
              onChange={(e) => setUrlInput("https://" + e.target.value.replace(/^https?:\/\//, ""))}
              className="flex-1 bg-transparent font-mono text-[11px] text-white focus:outline-none"
            />
            <button
              onClick={handleCopyUrl}
              className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              title="Copier l'URL"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            onClick={() => window.open(urlInput, "_blank")}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Bookmarks Bar */}
        <div className="flex items-center gap-4 border-b border-white/5 bg-zinc-950/40 px-4 py-1.5 text-[10px] text-zinc-400 overflow-x-auto no-scrollbar">
          <Link href="/boost" className="flex items-center gap-1 hover:text-white transition-colors">
            <Zap className="h-3 w-3 text-orange-400" />
            <span>ETHONE Boost Hub</span>
          </Link>
          <Link href="/discord" className="flex items-center gap-1 hover:text-white transition-colors">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Discord Center</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-1 hover:text-white transition-colors">
            <Layers className="h-3 w-3 text-teal-400" />
            <span>Paramètres</span>
          </Link>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>SSL Certifié (Cloudflare ECC)</span>
          </span>
        </div>

        {/* Viewport Content */}
        <div className="p-6 bg-zinc-950 min-h-[460px]">
          {currentPreset.content}
        </div>
      </div>
    </div>
  );
}
