"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  STEP_BY_STEP_GUIDES,
  PRACTICAL_SECURITY_GUIDES,
  MODULE_CATEGORIES,
  DOC_COMMANDS,
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

const COMMAND_CATEGORIES = [
  "Toutes",
  "Sécurité",
  "Modération",
  "Configuration",
  "Musique",
  "Spotify",
  "Utilitaires",
  "Fun",
] as const;

export default function DocumentationView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<DocGuide | null>(null);
  const [selectedModule, setSelectedModule] = useState<DocModule | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("accueil");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCommandCategory, setSelectedCommandCategory] = useState<string>("Toutes");
  const [commandSearch, setCommandSearch] = useState("");

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

    const matchedCommands = DOC_COMMANDS.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
    );

    return {
      guides: matchedGuides,
      modules: matchedModules,
      commands: matchedCommands,
      total: matchedGuides.length + matchedModules.length + matchedCommands.length,
    };
  }, [searchQuery, allModules]);

  const filteredCommands = useMemo(() => {
    return DOC_COMMANDS.filter((cmd) => {
      const matchCat =
        selectedCommandCategory === "Toutes" || cmd.category === selectedCommandCategory;
      const q = commandSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        cmd.name.toLowerCase().includes(q) ||
        cmd.syntax.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCommandCategory, commandSearch]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input =
          document.getElementById("docs-search-input") ||
          document.getElementById("docs-sidebar-search-input");
        input?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d0b] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-200">
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
              <a href="#commandes" className="rounded-lg px-3 py-1.5 transition-colors hover:text-white hover:bg-white/5">
                Commandes
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
              className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Connexion
            </Link>

            <Link
              href="/bot"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 text-xs font-bold text-[#060a08] shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all hover:bg-emerald-400 hover:scale-105"
            >
              <span>+ Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 shrink-0 bg-[#090d0b] pt-20 transition-transform lg:static lg:block lg:pt-6 lg:translate-x-0 lg:w-72 xl:w-80 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="sticky top-20 flex h-[calc(100vh-5.5rem)] flex-col overflow-y-auto pr-3 pb-12 [scrollbar-width:thin] [scrollbar-color:#233228_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#233228] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#34483a]">
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

            <div className="space-y-4 text-xs">
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
                        ? "border-emerald-500 font-semibold text-emerald-400"
                        : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <span className="truncate">Accueil</span>
                  </a>
                </li>
              </ul>

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
                              ? "border-emerald-500 font-semibold text-emerald-400"
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
                              ? "border-emerald-500 font-semibold text-emerald-400"
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

              <div>
                <p className="mb-1 mt-5 px-3 text-[12px] font-semibold text-zinc-400">Référence</p>
                <ul className="space-y-0.5">
                  <li>
                    <a
                      href="#commandes"
                      onClick={() => {
                        setActiveSection("commandes");
                        setSelectedGuide(null);
                        setSelectedModule(null);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 border-l-2 py-1.5 pl-3 pr-2 text-[13px] text-left transition-colors ${
                        activeSection === "commandes"
                          ? "border-emerald-500 font-semibold text-emerald-400"
                          : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate">Commandes ({DOC_COMMANDS.length})</span>
                    </a>
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
                          ? "border-emerald-500 font-semibold text-emerald-400"
                          : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate">Tous les modules</span>
                    </a>
                  </li>
                </ul>
              </div>

              {MODULE_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <a
                    href={`#cat-${cat.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="mb-1 mt-5 block px-3 text-[12px] font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    {cat.label}
                  </a>
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
                                ? "border-emerald-500 font-semibold text-emerald-400"
                                : "border-[#1c2820] text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                            }`}
                          >
                            <span className="truncate">{mod.name}</span>
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

        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
          />
        )}

        <main className="min-w-0 flex-1 py-8 pl-0 lg:pl-10 xl:pl-12">
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

                  {searchResults.commands.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">Commandes</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.commands.map((cmd) => (
                          <div
                            key={cmd.name}
                            onClick={() => {
                              setSelectedCommandCategory(cmd.category);
                              const el = document.getElementById("commandes");
                              el?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="cursor-pointer rounded-xl border border-[#18231c] bg-[#0d1410] p-4 transition-all hover:border-emerald-500/40 hover:bg-[#121c15]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-mono font-bold text-emerald-400">/{cmd.name}</span>
                              <span className="text-[10px] text-zinc-500">{cmd.category}</span>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400 line-clamp-2">{cmd.description}</div>
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
                  href="#commandes"
                  className="rounded-lg border border-[#1f2d24] bg-[#0d1410] px-5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:border-zinc-700 hover:bg-[#121c15] hover:text-white"
                >
                  Toutes les commandes
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

          <section id="commandes" className="mb-16 scroll-mt-24">
            <div className="mb-6 border-b border-[#18231c] pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Toutes les commandes d&apos;Etho
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400">
                    Syntaxe détaillée, permissions requises et sous-commandes de chaque commande slash disponible.
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                  <input
                    type="text"
                    value={commandSearch}
                    onChange={(e) => setCommandSearch(e.target.value)}
                    placeholder="Filtrer les commandes…"
                    className="w-full rounded-lg border border-[#1b261f] bg-[#0e1411] py-1.5 pl-9 pr-3 text-xs text-zinc-200 placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5 pt-1">
                {COMMAND_CATEGORIES.map((cat) => {
                  const isActive = selectedCommandCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCommandCategory(cat)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-emerald-500 text-[#060a08]"
                          : "bg-[#0d1410] border border-[#18231c] text-zinc-400 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-2">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="flex flex-col justify-between rounded-xl border border-[#18231c] bg-[#0d1410]/70 p-4 transition-all hover:border-emerald-500/30"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-emerald-400">/{cmd.name}</span>
                        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.permissions && (
                        <span className="rounded border border-[#1f2d24] bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          {cmd.permissions}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                      {cmd.description}
                    </p>

                    <div className="rounded-lg border border-[#18231c] bg-black/50 p-2.5 mb-2 flex items-center justify-between gap-2">
                      <code className="font-mono text-[11px] text-emerald-300 truncate">
                        {cmd.syntax}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(cmd.syntax)}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Copier la syntaxe"
                      >
                        {copiedText === cmd.syntax ? (
                          <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <CopyIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {cmd.subcommands && cmd.subcommands.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#18231c]/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                          Sous-commandes
                        </span>
                        <div className="space-y-1">
                          {cmd.subcommands.map((sub) => (
                            <div key={sub.name} className="flex items-start justify-between gap-2 text-[11px]">
                              <code className="font-mono text-zinc-300 shrink-0">.{sub.name}</code>
                              <span className="text-zinc-500 truncate text-right">{sub.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b2720] bg-[#111914] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-all hover:scale-[1.03] hover:border-emerald-500/40 hover:text-white"
                      >
                        <span>{mod.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-16 mb-8 flex flex-col gap-4 border-t border-[#18231c] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white text-base">Prêt à protéger votre serveur ?</p>
              <a
                href="https://discord.gg"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs text-zinc-400 underline underline-offset-4 hover:text-white transition-colors"
              >
                Besoin d&apos;aide ? Rejoignez notre serveur de support Discord.
              </a>
            </div>
            <Link
              href="/bot"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 px-5 text-xs font-bold text-[#060a08] transition-all hover:bg-emerald-400 shadow-[0_0_18px_rgba(34,197,94,0.3)] hover:scale-[1.02]"
            >
              Ajouter Etho
            </Link>
          </div>
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
