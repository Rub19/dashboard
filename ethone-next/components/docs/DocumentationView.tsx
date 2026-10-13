"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  STEP_BY_STEP_GUIDES,
  PRACTICAL_SECURITY_GUIDES,
  MODULE_CATEGORIES,
  type DocGuide,
  type DocModule,
} from "@/data/documentationData";

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 shrink-0 ${className}`} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ZapIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function TerminalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 shrink-0 ${className}`} aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function MenuIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 shrink-0 ${className}`} aria-hidden="true">
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export default function DocumentationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<DocGuide | null>(null);
  const [selectedModule, setSelectedModule] = useState<DocModule | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("accueil");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  }, []);

  const allModules = useMemo(() => {
    return MODULE_CATEGORIES.flatMap((c) => c.modules);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedGuides = [...STEP_BY_STEP_GUIDES, ...PRACTICAL_SECURITY_GUIDES].filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.content.some((c) => c.toLowerCase().includes(q))
    );

    const matchedModules = allModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.categoryLabel.toLowerCase().includes(q) ||
        m.commandSnippet.toLowerCase().includes(q)
    );

    return {
      guides: matchedGuides,
      modules: matchedModules,
      total: matchedGuides.length + matchedModules.length,
    };
  }, [searchQuery, allModules]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.getElementById("docs-sidebar-search-input") || document.getElementById("docs-search-input");
        if (input) input.focus();
      }
      if (e.key === "Escape") {
        if (selectedGuide) setSelectedGuide(null);
        if (selectedModule) setSelectedModule(null);
        if (searchQuery) setSearchQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGuide, selectedModule, searchQuery]);

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#090d0b] text-zinc-200 antialiased selection:bg-emerald-500/25 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[#18231c] bg-[#090d0b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f2d24] bg-[#0d1410] text-zinc-400 hover:text-white lg:hidden"
              aria-label="Menu de navigation"
            >
              <MenuIcon />
            </button>

            <Link href="/bot" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-transform group-hover:scale-105">
                <ShieldIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-base">Etho</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/25">
                    Docs
                  </span>
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 md:flex text-xs font-medium text-zinc-400">
              <Link href="/bot" className="rounded-lg px-3 py-1.5 transition-colors hover:text-white hover:bg-white/5">
                Présentation
              </Link>
              <a href="#guides" className="rounded-lg px-3 py-1.5 transition-colors hover:text-white hover:bg-white/5">
                Guides
              </a>
              <a href="#securite" className="rounded-lg px-3 py-1.5 transition-colors hover:text-white hover:bg-white/5">
                Sécurité
              </a>
              <a href="#modules" className="rounded-lg px-3 py-1.5 transition-colors hover:text-white hover:bg-white/5">
                Modules
              </a>
              <Link href="/discord" className="rounded-lg px-3 py-1.5 text-emerald-400 font-semibold transition-colors hover:bg-emerald-500/10">
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:flex items-center w-52 md:w-64">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="docs-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher dans la doc..."
                className="w-full rounded-lg border border-[#1b261f] bg-[#0e1411] py-1.5 pl-9 pr-14 text-xs text-zinc-200 placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-[#1f2d24] bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                  Ctrl+K
                </kbd>
              )}
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-lg border border-[#1f2d24] px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-white/5 hover:text-white"
            >
              Connexion
            </Link>

            <Link
              href="/discord"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-[#060a08] shadow-[0_0_18px_rgba(34,197,94,0.35)] transition-all hover:bg-emerald-400 hover:scale-[1.02]"
            >
              <span>+ Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="mx-auto flex max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Left Sidebar (Keeper-style clean rail, wider and beautiful) */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-76 shrink-0 border-r border-[#18231c] bg-[#090d0b] pt-20 transition-transform lg:static lg:block lg:pt-6 lg:translate-x-0 lg:w-76 xl:w-80 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="sticky top-20 flex h-[calc(100vh-5.5rem)] flex-col overflow-y-auto pr-3 pb-12 [scrollbar-width:thin] [scrollbar-color:#233228_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#233228] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#34483a]">
            {/* Search Input at Top of Sidebar */}
            <div className="mb-3 px-1">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                <input
                  id="docs-sidebar-search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-md border border-[#1b261f] bg-[#0e1411] py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                )}
              </label>
            </div>

            {/* Navigation Rail */}
            <div className="space-y-4 text-xs">
              {/* Accueil */}
              <ul className="space-y-0.5">
                <li>
                  <a
                    href="#accueil"
                    onClick={() => {
                      setActiveSection("accueil");
                      setSelectedGuide(null);
                      setSelectedModule(null);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] transition-colors ${
                      activeSection === "accueil" && !selectedGuide && !selectedModule
                        ? "border-emerald-500 font-semibold text-white"
                        : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span className="truncate">Accueil</span>
                  </a>
                </li>
              </ul>

              {/* Guides */}
              <div>
                <p className="mb-1 mt-4 px-3 text-[12px] font-semibold text-zinc-400">Guides</p>
                <ul className="space-y-0.5">
                  {STEP_BY_STEP_GUIDES.map((guide) => {
                    const isActive = selectedGuide?.id === guide.id;
                    return (
                      <li key={guide.id}>
                        <button
                          type="button"
                          title={guide.title}
                          onClick={() => {
                            setSelectedGuide(guide);
                            setSelectedModule(null);
                            setActiveSection(`guide-${guide.id}`);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] text-left transition-colors ${
                            isActive
                              ? "border-emerald-500 font-semibold text-white"
                              : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                          }`}
                        >
                          <span className="truncate">{guide.title}</span>
                          {guide.badge && (
                            <span className="shrink-0 text-[10px] text-emerald-400 font-medium">
                              {guide.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Sécurité Discord */}
              <div>
                <p className="mb-1 mt-5 px-3 text-[12px] font-semibold text-zinc-400">Sécurité Discord</p>
                <ul className="space-y-0.5">
                  {PRACTICAL_SECURITY_GUIDES.map((guide) => {
                    const isActive = selectedGuide?.id === guide.id;
                    return (
                      <li key={guide.id}>
                        <button
                          type="button"
                          title={guide.title}
                          onClick={() => {
                            setSelectedGuide(guide);
                            setSelectedModule(null);
                            setActiveSection(`guide-${guide.id}`);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] text-left transition-colors ${
                            isActive
                              ? "border-emerald-500 font-semibold text-white"
                              : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                          }`}
                        >
                          <span className="truncate">{guide.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Référence */}
              <div>
                <p className="mb-1 mt-5 px-3 text-[12px] font-semibold text-zinc-400">Référence</p>
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        const slashGuide = STEP_BY_STEP_GUIDES.find((g) => g.id === "commandes-slash");
                        if (slashGuide) {
                          setSelectedGuide(slashGuide);
                          setSelectedModule(null);
                          setActiveSection("commands");
                        }
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] text-left transition-colors ${
                        activeSection === "commands"
                          ? "border-emerald-500 font-semibold text-white"
                          : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate">Commandes</span>
                    </button>
                  </li>
                  <li>
                    <a
                      href="#modules"
                      onClick={() => {
                        setActiveSection("modules");
                        setSelectedGuide(null);
                        setSelectedModule(null);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] transition-colors ${
                        activeSection === "modules"
                          ? "border-emerald-500 font-semibold text-white"
                          : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate">Tous les modules</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Module Categories (Sanctions, Salons, Rôles, etc.) */}
              {MODULE_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <p className="mb-1 mt-5 px-3 text-[12px] font-semibold text-zinc-400">{cat.label}</p>
                  <ul className="space-y-0.5">
                    {cat.modules.map((mod) => {
                      const isActive = selectedModule?.id === mod.id;
                      return (
                        <li key={mod.id}>
                          <button
                            type="button"
                            title={mod.name}
                            onClick={() => {
                              setSelectedModule(mod);
                              setSelectedGuide(null);
                              setActiveSection(`mod-${mod.id}`);
                              setMobileMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] text-left transition-colors ${
                              isActive
                                ? "border-emerald-500 font-semibold text-white"
                                : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                            }`}
                          >
                            <span className="truncate">{mod.name}</span>
                            {mod.isPremium && (
                              <span className="shrink-0 text-[10px] font-medium text-emerald-400">
                                Premium
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Mobile menu backdrop */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 py-8 pl-0 lg:pl-10 xl:pl-12">
          {/* Search results banner if searching */}
          {searchResults ? (
            <section className="mb-12">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Résultats de recherche pour <span className="text-emerald-400">« {searchQuery} »</span>
                </h2>
                <span className="rounded-full bg-[#121c16] border border-[#1f2d24] px-2.5 py-1 text-xs text-zinc-400">
                  {searchResults.total} résultat{searchResults.total > 1 ? "s" : ""}
                </span>
              </div>

              {searchResults.total === 0 ? (
                <div className="rounded-2xl border border-[#18231c] bg-[#0d1410]/70 p-8 text-center">
                  <p className="text-sm text-zinc-400">Aucun résultat trouvé pour cette recherche.</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs text-emerald-400 hover:underline"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {searchResults.guides.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Guides</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {searchResults.guides.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGuide(g)}
                            className="cursor-pointer rounded-xl border border-[#18231c] bg-[#0d1410] p-4 transition-all hover:border-emerald-500/40 hover:bg-[#121c15]"
                          >
                            <div className="text-sm font-bold text-white">{g.title}</div>
                            <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{g.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.modules.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Modules</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.modules.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedModule(m)}
                            className="cursor-pointer rounded-xl border border-[#18231c] bg-[#0d1410] p-4 transition-all hover:border-emerald-500/40 hover:bg-[#121c15]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-white">{m.name}</span>
                              <span className="text-[10px] text-zinc-500">{m.categoryLabel}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{m.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : null}

          {/* Hero Header */}
          <section id="accueil" className="mb-14 scroll-mt-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <ZapIcon className="h-3.5 w-3.5" />
                <span>Documentation Officielle Etho</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl text-balance">
                Documentation officielle d&apos;Etho
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Tout ce qu&apos;il faut savoir pour protéger votre serveur Discord : démarrer en deux minutes, comprendre chaque module avec sa configuration optimale, et retrouver toutes les commandes.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#guides"
                  className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-[#060a08] shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:bg-emerald-400 hover:scale-[1.02]"
                >
                  Commencer
                </a>
                <a
                  href="#modules"
                  className="rounded-lg border border-[#1f2d24] bg-[#0d1410] px-5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:bg-[#121c15] hover:text-white"
                >
                  Parcourir les modules
                </a>
              </div>
            </div>
          </section>

          {/* Step-by-step guides section */}
          <section id="guides" className="mb-16 scroll-mt-24">
            <div className="mb-6 flex items-center justify-between border-b border-[#18231c] pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Guides pas à pas
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Les étapes clés pour installer et maîtriser la protection de votre serveur.
                </p>
              </div>
              <span className="text-xs font-medium text-zinc-500">
                {STEP_BY_STEP_GUIDES.length} guides
              </span>
            </div>

            <div className="divide-y divide-[#18231c] rounded-xl border border-[#18231c] bg-[#0d1410]/70 backdrop-blur-xl">
              {STEP_BY_STEP_GUIDES.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="group grid grid-cols-1 md:grid-cols-[280px_1fr_90px] items-center gap-3 md:gap-6 p-4 sm:p-5 transition-colors hover:bg-white/[0.03] cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {guide.title}
                    </span>
                    {guide.badge && (
                      <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        {guide.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-xs leading-relaxed text-zinc-400 sm:text-[13px] line-clamp-2 md:line-clamp-none">
                    {guide.description}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2.5 text-xs shrink-0">
                    <span className="text-zinc-500 font-mono text-[11px]">{guide.readTime}</span>
                    <ChevronRightIcon className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Security Discord section */}
          <section id="securite" className="mb-16 scroll-mt-24">
            <div className="mb-6 border-b border-[#18231c] pb-4">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Protéger son serveur Discord
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Une page par problème concret : ce qu&apos;il faut faire tout de suite, puis comment l&apos;éviter.
              </p>
            </div>

            <div className="divide-y divide-[#18231c] rounded-xl border border-[#18231c] bg-[#0d1410]/70 backdrop-blur-xl">
              {PRACTICAL_SECURITY_GUIDES.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="group grid grid-cols-1 md:grid-cols-[320px_1fr_90px] items-center gap-3 md:gap-6 p-4 sm:p-5 transition-colors hover:bg-white/[0.03] cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {guide.title}
                    </span>
                    {guide.badge && (
                      <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/25">
                        {guide.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-xs leading-relaxed text-zinc-400 sm:text-[13px] line-clamp-2 md:line-clamp-none">
                    {guide.description}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2.5 text-xs shrink-0">
                    <span className="text-zinc-500 font-mono text-[11px]">{guide.readTime}</span>
                    <ChevronRightIcon className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Modules by category section */}
          <section id="modules" className="mb-20 scroll-mt-24">
            <div className="mb-6 border-b border-[#18231c] pb-4">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Les modules par catégorie
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Retrouvez chaque module de protection avec sa description et ses paramètres recommandés.
              </p>
            </div>

            <div className="space-y-6">
              {MODULE_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  id={`cat-${cat.id}`}
                  className="rounded-xl border border-[#18231c] bg-[#0d1410]/70 p-5 backdrop-blur-xl"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{cat.label}</h3>
                      <span className="text-xs text-zinc-500">
                        {cat.count} module{cat.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {cat.modules.map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedModule(mod)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.03] ${
                          mod.isPremium
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400"
                            : "border-[#1b2720] bg-[#111914] text-zinc-300 hover:border-emerald-500/40 hover:text-white"
                        }`}
                      >
                        <span>{mod.name}</span>
                        {mod.isPremium && (
                          <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-bold uppercase text-amber-300">
                            Ultra
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* Guide Detail Modal */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuide(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#1f2d24] bg-[#0d1410] p-6 shadow-2xl [scrollbar-width:thin] [scrollbar-color:#233228_transparent]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400">
                      {selectedGuide.category === "guides" ? "Guide pas à pas" : "Sécurité Discord"}
                    </span>
                    <span className="text-xs text-zinc-500">• {selectedGuide.readTime}</span>
                  </div>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedGuide.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGuide(null)}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                {selectedGuide.description}
              </p>

              {selectedGuide.commandSnippet && (
                <div className="mt-4 rounded-xl border border-[#1c2820] bg-black/60 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <TerminalIcon className="h-3.5 w-3.5 text-emerald-400" />
                      Commande associée
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedGuide.commandSnippet!)}
                      className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 hover:text-white transition-colors"
                    >
                      {copiedText === selectedGuide.commandSnippet ? (
                        <>
                          <CheckIcon className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copié !</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="h-3 w-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                  <code className="font-mono text-xs text-emerald-400 block overflow-x-auto">
                    {selectedGuide.commandSnippet}
                  </code>
                </div>
              )}

              {selectedGuide.steps && (
                <div className="mt-6 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Étapes de configuration
                  </div>
                  <div className="space-y-2">
                    {selectedGuide.steps.map((s) => (
                      <div key={s.step} className="flex gap-3 rounded-xl border border-[#18231c] bg-[#111914]/50 p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-xs font-bold text-emerald-400">
                          {s.step}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{s.title}</div>
                          <div className="mt-0.5 text-xs text-zinc-400 leading-relaxed">{s.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-2 text-xs leading-relaxed text-zinc-400">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Détails & Recommandations
                </div>
                {selectedGuide.content.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedGuide(null)}
                  className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Module Detail Modal */}
      <AnimatePresence>
        {selectedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModule(null)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#1f2d24] bg-[#0d1410] p-6 shadow-2xl [scrollbar-width:thin] [scrollbar-color:#233228_transparent]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-400">{selectedModule.categoryLabel}</span>
                    {selectedModule.isPremium && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                        Ultra
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-xl font-bold text-white">{selectedModule.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedModule(null)}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#18231c] bg-[#111914]/50 p-3">
                  <div className="text-zinc-500 text-[11px]">Action par défaut</div>
                  <div className="mt-1 font-semibold text-zinc-200">{selectedModule.defaultAction}</div>
                </div>
                <div className="rounded-xl border border-[#18231c] bg-[#111914]/50 p-3">
                  <div className="text-zinc-500 text-[11px]">Temps de réaction</div>
                  <div className="mt-1 font-semibold text-emerald-400">{selectedModule.reactionTime}</div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-zinc-300">
                {selectedModule.description}
              </p>

              <div className="mt-4 rounded-xl border border-[#1c2820] bg-black/60 p-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <TerminalIcon className="h-3.5 w-3.5 text-emerald-400" />
                    Commande Slash
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedModule.commandSnippet)}
                    className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300 hover:text-white transition-colors"
                  >
                    {copiedText === selectedModule.commandSnippet ? (
                      <>
                        <CheckIcon className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copié !</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3 w-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="font-mono text-xs text-emerald-400 block overflow-x-auto">
                  {selectedModule.commandSnippet}
                </code>
              </div>

              {selectedModule.details.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Points clés
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-400">
                    {selectedModule.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedModule(null)}
                  className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-[#18231c] bg-[#090d0b] py-10 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-zinc-300">Etho Documentation</span>
            <span>—</span>
            <span>Infrastructure haute disponibilité</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/discord" className="hover:text-white transition-colors">
              Tableau de bord
            </Link>
            <Link href="/bot" className="hover:text-white transition-colors">
              Vitrine Bot
            </Link>
            <a href="https://discord.gg" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white transition-colors">
              <span>Discord Support</span>
              <ExternalIcon className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
