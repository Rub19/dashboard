"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettingsForm } from "./SettingsFormContext";

export default function SettingsSearch() {
  const { query, setQuery, showAdvanced, setShowAdvanced } = useSettingsForm();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-20 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 pb-4 pt-2 backdrop-blur-md"
    >
      <div className="relative flex-1 min-w-[16rem]">
        <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un paramètre…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--accent)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
            aria-label="Effacer"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
          showAdvanced ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-raised)]"
        }`}
      >
        <Icon name="sliders-horizontal" className="h-4 w-4" />
        Paramètres avancés
      </button>
    </motion.div>
  );
}
