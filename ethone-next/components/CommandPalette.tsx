"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Sparkles,
  Command,
  ArrowRight,
  Star,
  AlertTriangle,
  CornerDownLeft,
  Brain,
  Zap,
  Copy,
  Check,
  Terminal,
} from "@/components/icons/ph";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import { useCommandItems, type CommandItem } from "@/lib/commands";
import {
  searchCommands,
  createCommandHistory,
  type SearchableCommandItem,
} from "@/lib/command-search";
import { useSettings } from "@/components/SettingsProvider";
import { useSound } from "@/lib/sound";
import { useFocus } from "@/components/FocusProvider";
import { cn } from "@/lib/utils";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";

const CATEGORY_CHIPS = [
  { id: "all", label: "Tous" },
  { id: "Actions Rapides", label: "Actions" },
  { id: "Navigation", label: "Pages" },
  { id: "Discord", label: "Discord" },
  { id: "Focus", label: "Focus" },
  { id: "Thèmes & Apparence", label: "Thèmes" },
  { id: "Intégrations", label: "Intégrations" },
  { id: "Réglages", label: "Réglages" },
  { id: "Brain", label: "Brain" },
];

interface MathResult {
  expression: string;
  result: number;
  formatted: string;
}

function evaluateMathExpression(raw: string): MathResult | null {
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.startsWith("/")) return null;

  const clean = trimmed.replace(/\s*=\s*$/, "");

  const percentMatch = clean.match(/^([\d.,]+)\s*%\s*(?:of|de|\*)\s*([\d.,]+)$/i);
  if (percentMatch) {
    const p = parseFloat(percentMatch[1].replace(",", "."));
    const total = parseFloat(percentMatch[2].replace(",", "."));
    if (!isNaN(p) && !isNaN(total)) {
      const res = (p / 100) * total;
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const percentMatch2 = clean.match(/^([\d.,]+)\s*\*\s*([\d.,]+)\s*%$/i);
  if (percentMatch2) {
    const total = parseFloat(percentMatch2[1].replace(",", "."));
    const p = parseFloat(percentMatch2[2].replace(",", "."));
    if (!isNaN(p) && !isNaN(total)) {
      const res = (p / 100) * total;
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const sqrtMatch = clean.match(/^sqrt\s*\(\s*([\d.,]+)\s*\)$/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1].replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      const res = Math.sqrt(val);
      const formatted = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result: res, formatted };
    }
  }

  const normalized = clean
    .replace(/[xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/,/g, ".")
    .replace(/\s+/g, "");

  if (!/^[\d+\-*/^().]+$/.test(normalized)) return null;
  if (!/[+\-*/^]/.test(normalized)) return null;

  try {
    let pos = 0;
    const parseNumber = (): number => {
      const start = pos;
      while (pos < normalized.length && (/\d/.test(normalized[pos]) || normalized[pos] === ".")) {
        pos++;
      }
      const numStr = normalized.substring(start, pos);
      const val = parseFloat(numStr);
      if (isNaN(val)) throw new Error("nan");
      return val;
    };

    const parseFactor = (): number => {
      if (pos >= normalized.length) throw new Error("end");
      let sign = 1;
      if (normalized[pos] === "-") {
        sign = -1;
        pos++;
      } else if (normalized[pos] === "+") {
        pos++;
      }
      if (normalized[pos] === "(") {
        pos++;
        const val = parseExpression();
        if (normalized[pos] !== ")") throw new Error("paren");
        pos++;
        return sign * val;
      }
      return sign * parseNumber();
    };

    const parsePower = (): number => {
      let val = parseFactor();
      while (pos < normalized.length && normalized[pos] === "^") {
        pos++;
        const next = parseFactor();
        val = Math.pow(val, next);
      }
      return val;
    };

    const parseTerm = (): number => {
      let val = parsePower();
      while (pos < normalized.length && (normalized[pos] === "*" || normalized[pos] === "/" || normalized[pos] === "%")) {
        const op = normalized[pos];
        pos++;
        const next = parsePower();
        if (op === "*") val *= next;
        else if (op === "/") {
          if (next === 0) throw new Error("divzero");
          val /= next;
        } else if (op === "%") val %= next;
      }
      return val;
    };

    const parseExpression = (): number => {
      let val = parseTerm();
      while (pos < normalized.length && (normalized[pos] === "+" || normalized[pos] === "-")) {
        const op = normalized[pos];
        pos++;
        const next = parseTerm();
        if (op === "+") val += next;
        else if (op === "-") val -= next;
      }
      return val;
    };

    const result = parseExpression();
    if (pos === normalized.length && isFinite(result)) {
      const formatted = Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, "");
      return { expression: trimmed, result, formatted };
    }
    return null;
  } catch {
    return null;
  }
}

interface DirectSlashCommand {
  command: string;
  label: string;
  description: string;
  badge: string;
  execute: (param: string) => void;
}

export default function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const pathname = usePathname();
  const router = useRouter();
  const isTouch = useTouchCapable();
  const prefersReduced = useReducedMotion();

  const { settings, update: updateSettings } = useSettings();
  const { playAmbient, stopAmbient } = useSound();
  const focus = useFocus();
  const [copiedMath, setCopiedMath] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [sensitivePrompt, setSensitivePrompt] = useState<CommandItem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createCommandHistory());

  const allCommands = useCommandItems(setOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveCategory("all");
      setActiveIndex(0);
      setSensitivePrompt(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const searchContext = useMemo(() => {
    if (!open) {
      return {
        route: pathname,
        pinned: new Set<string>(),
        recent: new Set<string>(),
        frequency: {},
        categoryFilter: activeCategory === "all" ? "" : activeCategory,
      };
    }
    const hist = historyRef.current;
    return {
      route: pathname,
      pinned: new Set(hist.pinned()),
      recent: new Set(hist.recent()),
      frequency: hist.frequency(),
      categoryFilter: activeCategory === "all" ? "" : activeCategory,
    };
  }, [pathname, activeCategory, open]);

  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands as SearchableCommandItem[], query, searchContext, 40);
  }, [allCommands, query, searchContext]);

  const pinnedIds = useMemo(() => (open ? new Set(historyRef.current.pinned()) : new Set<string>()), [open]);
  const recentIds = useMemo(() => (open ? new Set(historyRef.current.recent()) : new Set<string>()), [open]);

  const mathResult = useMemo(() => {
    return evaluateMathExpression(query);
  }, [query]);

  const slashCommands = useMemo<DirectSlashCommand[]>(() => {
    return [
      {
        command: "/zen",
        label: "Basculer le Mode Zen",
        description: "Plein écran épuré sans chrome applicatif",
        badge: "Zen OS",
        execute: () => {
          updateSettings({ zenMode: !settings.zenMode });
        },
      },
      {
        command: "/mute",
        label: "Couper les Sons",
        description: "Désactiver les ambiances et sons d'interface",
        badge: "Audio",
        execute: () => {
          stopAmbient();
          updateSettings({ masterVolume: !settings.masterVolume });
        },
      },
      {
        command: "/rain",
        label: "Lancer la Pluie",
        description: "Démarrer l'ambiance sonore naturelle de pluie",
        badge: "Soundscape",
        execute: () => {
          playAmbient("rain", 65);
          router.push("/soundscape");
        },
      },
      {
        command: "/focus",
        label: "Démarrer un Focus",
        description: "Lancer un chronomètre de productivité (ex: /focus 25)",
        badge: "Pomodoro",
        execute: (param) => {
          const mins = param ? parseInt(param, 10) : 25;
          focus.start(isNaN(mins) ? "standard" : String(mins));
          router.push("/focus");
        },
      },
      {
        command: "/theme",
        label: "Changer de Thème",
        description: "Basculer vers un thème (ex: /theme midnight, /theme day)",
        badge: "Apparence",
        execute: (param) => {
          const themeName = param.toLowerCase().trim();
          if (themeName) {
            const aliasMap: Record<string, string> = {
              dark: "obsidian",
              night: "midnight",
              oled: "midnight",
              light: "arctic",
              teal: "aurora",
              pink: "dyno-rose",
              purple: "purple-space",
            };
            const targetTheme = aliasMap[themeName] || themeName;
            updateSettings({ theme: targetTheme as unknown as typeof settings.theme });
          } else {
            router.push("/settings");
          }
        },
      },
      {
        command: "/notes",
        label: "Ouvrir les Notes",
        description: "Accéder au carnet de notes et idées",
        badge: "Notes",
        execute: () => router.push("/notes"),
      },
      {
        command: "/tasks",
        label: "Ouvrir les Tâches",
        description: "Accéder au gestionnaire de tâches",
        badge: "Tâches",
        execute: () => router.push("/tasks"),
      },
      {
        command: "/soundscape",
        label: "Studio Soundscape",
        description: "Mixeur d'ambiances et fréquences binaurales",
        badge: "Audio",
        execute: () => router.push("/soundscape"),
      },
      {
        command: "/discord",
        label: "Discord Center",
        description: "Centre de contrôle des serveurs Discord",
        badge: "Discord",
        execute: () => router.push("/discord"),
      },
      {
        command: "/boost",
        label: "Diagnostic Performance",
        description: "Fluidité FPS, mémoire tas et latence réelle",
        badge: "Système",
        execute: () => router.push("/boost"),
      },
      {
        command: "/browser",
        label: "Inspecteur Web & Sandbox",
        description: "Test de routes et analyse d'en-têtes HTTP",
        badge: "Outils",
        execute: () => router.push("/browser"),
      },
    ];
  }, [settings, updateSettings, stopAmbient, playAmbient, router, focus]);

  const activeSlashCommands = useMemo(() => {
    if (!query.startsWith("/")) return [];
    const lower = query.toLowerCase();
    const parts = lower.slice(1).split(" ");
    const cmdPart = parts[0] || "";
    return slashCommands.filter((sc) => sc.command.slice(1).startsWith(cmdPart));
  }, [query, slashCommands]);

  const handleCopyMathResult = useCallback(() => {
    if (!mathResult) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(mathResult.formatted);
    }
    setCopiedMath(true);
    setTimeout(() => {
      setCopiedMath(false);
      setOpen(false);
    }, 350);
  }, [mathResult, setOpen]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      if (cmd.isSensitive) {
        setSensitivePrompt(cmd);
        return;
      }
      historyRef.current.record(cmd.id);
      cmd.action();
      setOpen(false);
    },
    [setOpen]
  );

  const confirmSensitive = () => {
    if (sensitivePrompt) {
      historyRef.current.record(sensitivePrompt.id);
      sensitivePrompt.action();
      setSensitivePrompt(null);
      setOpen(false);
    }
  };

  const togglePin = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      historyRef.current.togglePin(id);
      setActiveIndex((prev) => prev);
    },
    []
  );

  useEffect(() => {
    if (!open || sensitivePrompt) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const maxLen = query.startsWith("/") ? activeSlashCommands.length : filteredCommands.length;
        setActiveIndex((prev) => (prev + 1 < maxLen ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const maxLen = query.startsWith("/") ? activeSlashCommands.length : filteredCommands.length;
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, maxLen - 1)));
      } else if (e.key === "Enter") {
        e.preventDefault();

        if (mathResult) {
          handleCopyMathResult();
          return;
        }

        if (query.startsWith("/")) {
          const selectedSlash = activeSlashCommands[activeIndex];
          if (selectedSlash) {
            const parts = query.trim().split(/\s+/);
            const param = parts.slice(1).join(" ");
            selectedSlash.execute(param);
            setOpen(false);
            return;
          }
        }

        if (query.trim().startsWith("ask ") || query.trim().startsWith("demande ")) {
          const q = query.replace(/^(ask|demande)\s+/i, "").trim();
          router.push(`/brain/?q=${encodeURIComponent(q)}`);
          setOpen(false);
          return;
        }

        const active = filteredCommands[activeIndex];
        if (active) executeCommand(active);
      } else if (e.key === "Tab") {
        e.preventDefault();
        const currentCatIdx = CATEGORY_CHIPS.findIndex((c) => c.id === activeCategory);
        const nextCat = CATEGORY_CHIPS[(currentCatIdx + 1) % CATEGORY_CHIPS.length];
        setActiveCategory(nextCat.id);
        setActiveIndex(0);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    open,
    sensitivePrompt,
    filteredCommands,
    activeSlashCommands,
    activeIndex,
    activeCategory,
    query,
    mathResult,
    handleCopyMathResult,
    router,
    executeCommand,
    setOpen,
  ]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.15 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-[var(--bg-overlay)] backdrop-blur-md"
          />

          <motion.div
            initial={isTouch ? { y: "100%" } : { opacity: 0, scale: 0.96, y: -10 }}
            animate={isTouch ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isTouch ? { y: "100%" } : { opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex flex-col w-full max-w-2xl overflow-hidden border border-[var(--panel-border)] shadow-2xl backdrop-blur-2xl",
              isTouch
                ? "rounded-t-3xl max-h-[88dvh] bg-[var(--bg-surface)] pb-[env(safe-area-inset-bottom)]"
                : "rounded-3xl max-h-[640px] bg-[var(--panel-bg)]"
            )}
          >
            {isTouch && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1.5 w-12 rounded-full bg-[var(--text-muted)]/30" />
              </div>
            )}

            <div className="relative flex items-center border-b border-[var(--panel-border)]/60 px-4 py-3.5 gap-3">
              <Search className="h-5 w-5 text-[var(--accent-primary)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Taper un calcul (150*1.2), une commande (/zen, /mute) ou rechercher..."
                className="flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2 py-1 font-mono text-[10px] text-[var(--text-muted)]">
                ESC
              </kbd>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-[var(--panel-border)]/40 no-scrollbar">
              {CATEGORY_CHIPS.map((chip) => {
                const active = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(chip.id);
                      setActiveIndex(0);
                    }}
                    className={cn(
                      "rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all touch-manipulation cursor-pointer",
                      active
                        ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                        : "border border-[var(--panel-border)]/40 bg-[var(--surface-raised)]/30 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {sensitivePrompt ? (
              <div className="p-6 space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">
                    Confirmer l&apos;action sensible
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Êtes-vous sûr de vouloir exécuter : <strong className="text-[var(--text-primary)]">{sensitivePrompt.label}</strong> ?
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSensitivePrompt(null)}
                    className="rounded-[var(--inset-radius)] border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={confirmSensitive}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-600 cursor-pointer"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-2 py-2 space-y-1 divide-y divide-transparent no-scrollbar max-h-[380px] sm:max-h-[440px]"
              >
                {mathResult && (
                  <div
                    onClick={handleCopyMathResult}
                    className="group mx-2 mb-2 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 transition-all cursor-pointer hover:bg-emerald-500/20 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black shadow-md">
                        <Zap className="h-5 w-5 fill-current" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Moteur de Calcul Instantané
                        </span>
                        <p className="font-mono text-base font-bold text-[var(--text-primary)]">
                          {mathResult.expression} = <span className="text-emerald-400">{mathResult.formatted}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                      {copiedMath ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedMath ? "Copié !" : "Copier (Entrée)"}</span>
                    </div>
                  </div>
                )}

                {query.startsWith("/") && activeSlashCommands.length > 0 && (
                  <div className="space-y-1 px-1 mb-2">
                    <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                      Commandes Directes Disponibles
                    </span>
                    {activeSlashCommands.map((sc, idx) => {
                      const isSelected = activeIndex === idx;
                      return (
                        <div
                          key={sc.command}
                          data-index={idx}
                          onClick={() => {
                            const parts = query.trim().split(/\s+/);
                            const param = parts.slice(1).join(" ");
                            sc.execute(param);
                            setOpen(false);
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-all cursor-pointer",
                            isSelected
                              ? "bg-[var(--surface-hover)] border border-[var(--accent-primary)]/40 shadow-sm"
                              : "hover:bg-[var(--surface-raised)]/40 border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                              <Terminal className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                                  {sc.command}
                                </span>
                                <span className="rounded-md bg-[var(--accent-primary)]/20 px-1.5 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
                                  {sc.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)]">{sc.description}</p>
                            </div>
                          </div>
                          <CornerDownLeft className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {!query.startsWith("/") && query.trim().length > 1 && !mathResult && (
                  <div
                    onClick={() => {
                      router.push(`/brain/?q=${encodeURIComponent(query.trim())}`);
                      setOpen(false);
                    }}
                    className="group mx-2 mb-2 flex items-center justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/10 p-3.5 transition-all cursor-pointer hover:bg-[var(--accent-primary)]/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-md">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          Demander à ETHONE Brain
                        </p>
                        <p className="text-[11px] text-[var(--accent-primary)] font-medium line-clamp-1">
                          &quot;{query}&quot;
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--accent-primary)] group-hover:translate-x-1 transition-transform" />
                  </div>
                )}

                {!query.startsWith("/") && filteredCommands.length === 0 && !mathResult ? (
                  <div className="py-12 text-center space-y-2">
                    <Command className="mx-auto h-8 w-8 text-[var(--text-muted)] opacity-40" />
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      Aucun résultat trouvé pour &quot;{query}&quot;
                    </p>
                  </div>
                ) : (
                  !query.startsWith("/") && filteredCommands.map((cmd, idx) => {
                    const isSelected = activeIndex === idx;
                    const isPinned = pinnedIds.has(cmd.id);
                    const isRecent = recentIds.has(cmd.id);

                    return (
                      <div
                        key={cmd.id}
                        data-index={idx}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "group relative flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 transition-all cursor-pointer",
                          isSelected
                            ? "bg-[var(--surface-hover)] border border-[var(--accent-primary)]/30 shadow-md"
                            : "hover:bg-[var(--surface-raised)]/40 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border text-sm transition-all",
                              isSelected
                                ? "border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm"
                                : "border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/60 text-[var(--text-muted)]"
                            )}
                          >
                            {cmd.icon || <Sparkles className="h-4 w-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {cmd.label}
                              </span>
                              {isPinned && (
                                <span className="rounded-md bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                                  Favori
                                </span>
                              )}
                              {isRecent && !isPinned && (
                                <span className="rounded-md bg-[var(--text-primary)]/6 px-1 py-0.2 text-[9px] font-medium text-[var(--text-primary)]/85">
                                  Récent
                                </span>
                              )}
                              {cmd.badge && (
                                <span className="rounded-md bg-[var(--accent-primary)]/20 px-1 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
                                  {cmd.badge}
                                </span>
                              )}
                            </div>
                            {cmd.subtitle && (
                              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                                {cmd.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => togglePin(cmd.id, e)}
                            className={cn(
                              "p-1 rounded-lg transition-all",
                              isPinned
                                ? "text-amber-400 bg-amber-400/10"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100"
                            )}
                            title={isPinned ? "Retirer des favoris" : "Épingler en favori"}
                          >
                            <Star className="h-3.5 w-3.5" fill={isPinned ? "currentColor" : "none"} />
                          </button>

                          {cmd.shortcut && (
                            <kbd className="hidden sm:inline-flex items-center rounded-md border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                              {cmd.shortcut}
                            </kbd>
                          )}

                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="hidden sm:flex items-center justify-between border-t border-[var(--panel-border)]/60 px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">↑↓</kbd> Naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">↵</kbd> Exécuter
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1 font-mono text-[9px]">TAB</kbd> Catégories
                </span>
              </div>
              <span className="font-semibold text-[var(--accent-primary)]">
                ETHONE Command Center 2.0
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
