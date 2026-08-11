"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

const GROUPS = [
  {
    label: "Navigation",
    icon: "navigation",
    shortcuts: [
      { keys: ["1", "…", "9"], label: "Aller à la page correspondante (Accueil → Fichiers)" },
      { keys: ["Ctrl", "K"], label: "Ouvrir le Command Center" },
      { keys: ["/"], label: "Ouvrir le Command Center (alternative)" },
      { keys: ["F2"], label: "Ouvrir Mission Control" },
      { keys: ["?"], label: "Ouvrir Mission Control (alternative)" },
      { keys: ["Esc"], label: "Fermer panneau / dialog ouvert" },
    ],
  },
  {
    label: "Création rapide",
    icon: "plus-circle",
    shortcuts: [
      { keys: ["Ctrl", "Shift", "N"], label: "Nouvelle note" },
      { keys: ["Ctrl", "Shift", "T"], label: "Nouvelle tâche" },
      { keys: ["Ctrl", "Shift", "E"], label: "Nouvel événement calendrier" },
      { keys: ["Ctrl", "Shift", "S"], label: "Ouvrir/fermer le Brouillon rapide" },
    ],
  },
  {
    label: "Interface & Affichage",
    icon: "layout-dashboard",
    shortcuts: [
      { keys: ["Alt", "Z"], label: "Basculer le Mode Zen" },
      { keys: ["Ctrl", "S"], label: "Synchronisation manuelle Cloud" },
      { keys: ["PageDown"], label: "Défiler vers le bas" },
      { keys: ["PageUp"], label: "Défiler vers le haut" },
      { keys: ["Home"], label: "Aller en haut de la page" },
      { keys: ["End"], label: "Aller en bas de la page" },
    ],
  },
  {
    label: "Panneaux & overlays",
    icon: "panels-right-bottom",
    shortcuts: [
      { keys: ["Ctrl", "/"], label: "Raccourcis clavier (cette fenêtre)" },
      { keys: ["Clic avatar"], label: "Ouvrir le panneau Profil / Comptes" },
      { keys: ["Clic 🔔"], label: "Ouvrir le panneau Notifications" },
    ],
  },
];

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const trapRef = useFocusTrap<HTMLElement>(open);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
      if (isEditable(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            ref={trapRef}
            role="dialog"
            aria-label="Raccourcis clavier ETHONE"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-[71] w-[min(90vw,800px)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <div className="flex items-center gap-3">
                <Icon name="keyboard" className="h-5 w-5 text-[var(--accent)]" />
                <strong className="text-lg">Raccourcis clavier</strong>
                <span className="text-xs text-[var(--muted)]">ETHONE</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-[var(--surface)]"
                aria-label="Fermer les raccourcis"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </header>
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto p-5 sm:grid-cols-2">
              {GROUPS.map((group) => (
                <section
                  key={group.label}
                  className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <header className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                    <Icon name={group.icon} className="h-4 w-4" />
                    {group.label}
                  </header>
                  <div className="space-y-2.5">
                    {group.shortcuts.map((shortcut, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 text-xs">
                        <span className="text-[var(--muted)]">{shortcut.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <span key={j}>
                              <kbd className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
                                {key}
                              </kbd>
                              {j < shortcut.keys.length - 1 && <span className="text-[var(--muted)]">+</span>}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <footer className="flex items-center justify-center gap-2 border-t border-[var(--border)] p-3 text-xs text-[var(--muted)]">
              <kbd className="rounded bg-[var(--surface)] px-1 py-0.5">Ctrl</kbd>
              <span>+</span>
              <kbd className="rounded bg-[var(--surface)] px-1 py-0.5">/</kbd>
              <span>pour ouvrir / fermer cette vue</span>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
