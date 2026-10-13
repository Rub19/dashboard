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

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function BookOpenIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function TerminalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function ZapIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
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
        const input = document.getElementById("docs-search-input");
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
    <div className="relative h-dvh w-full overflow-x-hidden overflow-y-auto bg-[#07080d] text-zinc-200 antialiased selection:bg-[#92C8D2]/30 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080d]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white lg:hidden"
              aria-label="Menu de navigation"
            >
              <MenuIcon />
            </button>

            <Link href="/bot" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#92C8D2]/10 ring-1 ring-[#92C8D2]/30 text-[#92C8D2] shadow-[0_0_15px_rgba(146,200,210,0.25)] transition-transform group-hover:scale-105">
                <ShieldIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-tight text-white text-base">Etho Protect</span>
                  <span className="rounded bg-[#92C8D2]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#92C8D2] border border-[#92C8D2]/25">
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
              <Link href="/discord" className="rounded-lg px-3 py-1.5 text-[#92C8D2] font-semibold transition-colors hover:bg-[#92C8D2]/10">
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-48 md:w-64">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="docs-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher... (Ctrl+K)"
                className="w-full rounded-xl border border-white/10 bg-[#0c0d14] py-1.5 pl-9 pr-8 text-xs text-zinc-200 placeholder-zinc-500 transition-colors focus:border-[#92C8D2] focus:outline-none focus:ring-1 focus:ring-[#92C8D2]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              Connexion
            </Link>

            <Link
              href="/discord"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#92C8D2] px-3.5 py-1.5 text-xs font-bold text-[#07080d] shadow-[0_0_18px_rgba(146,200,210,0.35)] transition-all hover:bg-[#a5d5de] hover:scale-[1.02]"
            >
              <span>+ Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 shrink-0 border-r border-white/[0.08] bg-[#07080d] pt-20 transition-transform lg:static lg:block lg:pt-6 lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="sticky top-20 flex h-[calc(100vh-5rem)] flex-col overflow-y-auto px-4 pb-10">
            <div className="mb-4 sm:hidden">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full rounded-xl border border-white/10 bg-[#0c0d14] py-1.5 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-[#92C8D2] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-6 text-xs">
              <div>
                <a
                  href="#accueil"
                  onClick={() => {
                    setActiveSection("accueil");
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-bold transition-colors ${
                    activeSection === "accueil"
                      ? "bg-[#92C8D2]/10 text-[#92C8D2]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <BookOpenIcon className="h-4 w-4" />
                  <span>Accueil Docs</span>
                </a>
              </div>

              <div>
                <div className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Guides pas à pas
                </div>
                <div className="space-y-0.5">
                  {STEP_BY_STEP_GUIDES.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => {
                        setSelectedGuide(guide);
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-zinc-400 transition-colors hover:bg-white/5 hover:text-white group"
                    >
                      <span className="truncate">{guide.title}</span>
                      {guide.badge && (
                        <span className="ml-1 shrink-0 rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-medium text-emerald-400 border border-emerald-500/20">
                          {guide.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Sécurité Discord
                </div>
                <div className="space-y-0.5">
                  {PRACTICAL_SECURITY_GUIDES.slice(0, 8).map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => {
                        setSelectedGuide(guide);
                        setMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <span className="truncate">{guide.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Modules par catégorie
                </div>
                <div className="space-y-0.5">
                  {MODULE_CATEGORIES.map((cat) => (
                    <a
                      key={cat.id}
                      href={`#cat-${cat.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <span>{cat.label}</span>
                      <span className="rounded-full bg-white/5 px-1.5 py-0.2 text-[10px] text-zinc-500">
                        {cat.count}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12">
          {searchResults ? (
            <section className="mb-12">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Résultats de recherche pour <span className="text-[#92C8D2]">« {searchQuery} »</span>
                </h2>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-zinc-400">
                  {searchResults.total} résultat{searchResults.total > 1 ? "s" : ""}
                </span>
              </div>

              {searchResults.total === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14]/70 p-8 text-center">
                  <p className="text-sm text-zinc-400">Aucun résultat trouvé pour cette recherche.</p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-xs text-[#92C8D2] hover:underline"
                  >
                    Effacer la recherche
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {searchResults.guides.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Guides</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {searchResults.guides.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGuide(g)}
                            className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#0c0d14] p-4 transition-all hover:border-[#92C8D2]/40 hover:bg-[#0f101a]"
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
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Modules</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.modules.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedModule(m)}
                            className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#0c0d14] p-4 transition-all hover:border-[#92C8D2]/40 hover:bg-[#0f101a]"
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

          <section id="accueil" className="mb-14 scroll-mt-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#92C8D2]/30 bg-[#92C8D2]/10 px-3 py-1 text-xs font-semibold text-[#92C8D2]">
                <ZapIcon className="h-3.5 w-3.5" />
                <span>Documentation Officielle Etho Protect</span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Documentation de Etho Protect
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Tout ce qu&apos;il faut savoir pour protéger ton serveur Discord : démarrer en deux minutes, comprendre chaque module avec une démo animée, et retrouver toutes les commandes.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#guides"
                  className="rounded-xl bg-[#92C8D2] px-4 py-2 text-xs font-bold text-[#07080d] shadow-[0_0_20px_rgba(146,200,210,0.3)] transition-all hover:bg-[#a5d5de] hover:scale-[1.02]"
                >
                  Commencer
                </a>
                <a
                  href="#modules"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Parcourir les modules
                </a>
              </div>
            </div>
          </section>

          <section id="guides" className="mb-16 scroll-mt-24">
            <div className="mb-6 flex items-center justify-between border-b border-white/[0.08] pb-4">
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

            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#0c0d14]/70 backdrop-blur-xl">
              {STEP_BY_STEP_GUIDES.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="group flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-white/[0.03] cursor-pointer sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                >
                  <div className="sm:w-1/3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#92C8D2] transition-colors">
                        {guide.title}
                      </span>
                      {guide.badge && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          {guide.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-xs leading-relaxed text-zinc-400 sm:text-[13px]">
                    {guide.description}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs">
                    <span className="text-zinc-500 font-mono text-[11px]">{guide.readTime}</span>
                    <ChevronRightIcon className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="securite" className="mb-16 scroll-mt-24">
            <div className="mb-6 border-b border-white/[0.08] pb-4">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Protéger son serveur Discord
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Une page par problème concret : ce qu&apos;il faut faire tout de suite, puis comment l&apos;éviter.
              </p>
            </div>

            <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#0c0d14]/70 backdrop-blur-xl">
              {PRACTICAL_SECURITY_GUIDES.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="group flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-white/[0.03] cursor-pointer sm:flex-row sm:items-center sm:gap-6 sm:p-5"
                >
                  <div className="sm:w-2/5 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-[#92C8D2] transition-colors">
                        {guide.title}
                      </span>
                      {guide.badge && (
                        <span className="rounded bg-[#92C8D2]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#92C8D2] border border-[#92C8D2]/25">
                          {guide.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-xs leading-relaxed text-zinc-400 sm:text-[13px]">
                    {guide.description}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs">
                    <span className="text-zinc-500 font-mono text-[11px]">{guide.readTime}</span>
                    <ChevronRightIcon className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-zinc-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="modules" className="mb-20 scroll-mt-24">
            <div className="mb-6 border-b border-white/[0.08] pb-4">
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
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0d14]/70 p-5 backdrop-blur-xl"
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
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:scale-[1.03] ${
                          mod.isPremium
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-[#92C8D2]/40 hover:text-white"
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

      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGuide(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0d14] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#92C8D2]">
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
                <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <TerminalIcon className="h-3.5 w-3.5 text-[#92C8D2]" />
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
                  <code className="font-mono text-xs text-[#92C8D2] block overflow-x-auto">
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
                      <div key={s.step} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#92C8D2]/15 text-xs font-bold text-[#92C8D2]">
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
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedModule(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0c0d14] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#92C8D2]">{selectedModule.categoryLabel}</span>
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
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="text-zinc-500 text-[11px]">Action par défaut</div>
                  <div className="mt-1 font-semibold text-zinc-200">{selectedModule.defaultAction}</div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="text-zinc-500 text-[11px]">Temps de réaction</div>
                  <div className="mt-1 font-semibold text-[#92C8D2]">{selectedModule.reactionTime}</div>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-zinc-300">
                {selectedModule.description}
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <TerminalIcon className="h-3.5 w-3.5 text-[#92C8D2]" />
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
                <code className="font-mono text-xs text-[#92C8D2] block overflow-x-auto">
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
                        <span className="h-1.5 w-1.5 rounded-full bg-[#92C8D2] mt-1.5 shrink-0" />
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
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="border-t border-white/[0.08] bg-[#07080d] py-10 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4 text-[#92C8D2]" />
            <span className="font-bold text-zinc-300">Etho Protect Documentation</span>
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
