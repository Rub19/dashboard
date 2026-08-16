"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useSettingsForm } from "./SettingsFormContext";

export default function SettingsSearch() {
  const { query, setQuery, showAdvanced, setShowAdvanced } = useSettingsForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [counts, setCounts] = useState({ total: 0, visible: 0 });

  useEffect(() => {
    function updateCounts() {
      const all = document.querySelectorAll("[data-setting-key]");
      const visible = document.querySelectorAll("[data-setting-key]:not(.hidden)");
      setCounts({ total: all.length, visible: visible.length });
    }

    updateCounts();

    const observer = new MutationObserver(updateCounts);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [query, showAdvanced]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const active = document.activeElement;
      if (!active) return;

      const tag = active.tagName.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select";
      if (isTyping && active !== inputRef.current) return;

      e.preventDefault();
      const rows = Array.from(document.querySelectorAll("[data-setting-key]:not(.hidden)"));
      const current = active.closest("[data-setting-key]");
      let index = current ? rows.indexOf(current as HTMLElement) : -1;

      if (e.key === "ArrowDown") {
        index = Math.min(index + 1, rows.length - 1);
      } else {
        index = Math.max(index - 1, 0);
      }

      const next = rows[index];
      if (next) {
        const focusable = next.querySelector<HTMLElement>(
          "button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        (focusable ?? (next as HTMLElement)).focus();
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
      <div className="relative min-w-[16rem] flex-1">
        <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un paramètre…"
          className="w-full rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-10 pr-16 text-sm outline-none focus:border-[var(--accent)]"
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
        {query && (
          <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">
            {counts.visible}/{counts.total}
          </span>
        )}
      </div>
      {query && counts.total > 0 && counts.visible < counts.total && (
        <span className="text-[10px] text-[var(--muted)]">
          {counts.total - counts.visible} masqué{counts.total - counts.visible > 1 ? "s" : ""}
        </span>
      )}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={`flex items-center gap-2 rounded-[var(--panel-radius)] border px-3 py-2 text-xs font-medium transition-colors ${
          showAdvanced ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-raised)]"
        }`}
      >
        <Icon name="sliders-horizontal" className="h-4 w-4" />
        Paramètres avancés
      </button>
    </motion.div>
  );
}
