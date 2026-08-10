"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, ArrowRight } from "lucide-react";

const COMMANDS = [
  { id: "home", label: "Accueil", shortcut: "H", href: "/" },
  { id: "mail", label: "Mail", shortcut: "M", href: "/mail/" },
  { id: "notes", label: "Notes", shortcut: "N", href: "/notes/" },
  { id: "tasks", label: "Tâches", shortcut: "T", href: "/tasks/" },
  { id: "calendar", label: "Calendrier", shortcut: "C", href: "/calendar/" },
  { id: "files", label: "Fichiers", shortcut: "F", href: "/files/" },
  { id: "brain", label: "Brain", shortcut: "B", href: "/brain/" },
  { id: "matches", label: "Matches", shortcut: "G", href: "/matches/" },
  { id: "connections", label: "Connexions", shortcut: "O", href: "/connections/" },
  { id: "settings", label: "Réglages", shortcut: "S", href: "/settings/" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS;
  }, [query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((o) => !o);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => (i + 1) % filtered.length);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      if (event.key === "Enter" && filtered[index]) {
        event.preventDefault();
        router.push(filtered[index].href);
        setOpen(false);
        setQuery("");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, index, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] lg:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Commandes</span>
        <kbd className="rounded bg-[var(--surface-raised)] px-1 py-0.5 text-[10px]">
          <Command className="inline h-3 w-3" />K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-6 pt-32 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
                <Search className="h-5 w-5 text-[var(--muted)]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une page ou une action..."
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                />
                <kbd className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">ESC</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-[var(--muted)]">Aucun résultat</p>
                ) : (
                  filtered.map((cmd, i) => (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => {
                        router.push(cmd.href);
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                        i === index
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                      }`}
                      onMouseEnter={() => setIndex(i)}
                    >
                      <span className="flex items-center gap-2">
                        {cmd.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] opacity-60">
                        <Command className="h-3 w-3" />
                        {cmd.shortcut}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
