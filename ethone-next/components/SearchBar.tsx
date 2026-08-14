"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandPalette } from "@/components/CommandPaletteProvider";

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const i18n = useI18n();
  const { setOpen: setCommandOpen } = useCommandPalette();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setCommandOpen(true);
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <motion.div
      ref={containerRef}
      animate={{ width: open ? 320 : 40 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative flex h-10 items-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors hover:border-[var(--accent)] focus-within:border-[var(--accent)]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        aria-label={i18n("search")}
      >
        <Icon name="search" className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleSubmit}
            className="flex flex-1 items-center"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("search")}
              className="ml-2 w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (query) setQuery("");
                else setOpen(false);
              }}
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
              aria-label="Clear"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
