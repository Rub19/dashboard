"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandPalette } from "@/components/CommandPaletteProvider";

function MobileSearchPanel({
  open,
  query,
  setQuery,
  onClose,
  onSubmit,
  i18n,
  inputRef,
}: {
  open: boolean;
  query: string;
  setQuery: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  i18n: (key: string) => string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-[var(--background)]/98 backdrop-blur-xl md:hidden"
        >
          <form
            onSubmit={onSubmit}
            className="flex h-16 items-center gap-2 border-b border-[var(--panel-border)] px-4"
          >
            <Icon name="search" className="h-5 w-5 text-[var(--muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={i18n("search")}
              className="flex-1 bg-transparent text-lg text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                onClose();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
              aria-label={i18n("close")}
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </form>
          <div className="p-6 text-center text-sm text-[var(--muted)]">{i18n("commands")}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const i18n = useI18n();
  const { setOpen: setCommandOpen } = useCommandPalette();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (mobileOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [mobileOpen]);

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
      setMobileOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)] md:hidden"
        aria-label={i18n("search")}
      >
        <Icon name="search" className="h-5 w-5" />
      </button>

      <motion.div
        ref={containerRef}
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: open ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
        transition={{ duration: 0.15, ease: "easeOut" as const }}
        className="relative hidden h-10 w-80 items-center overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 text-sm text-[var(--foreground)] outline-none transition-colors hover:border-[var(--accent)] focus-within:border-[var(--accent)] md:flex backdrop-blur-[var(--panel-blur)]"
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

      <MobileSearchPanel
        open={mobileOpen}
        query={query}
        setQuery={setQuery}
        onClose={() => setMobileOpen(false)}
        onSubmit={handleSubmit}
        i18n={i18n}
        inputRef={mobileInputRef}
      />
    </>
  );
}
