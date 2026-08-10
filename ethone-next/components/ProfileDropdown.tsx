"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronDown, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const initial = user?.email?.[0]?.toUpperCase() || "?";
  const email = user?.email || "Invité";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-white">
          {initial}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--muted)] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-white">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{initial}</p>
                <p className="truncate text-xs text-[var(--muted)]">{email}</p>
              </div>
            </div>
            <nav className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <Settings className="h-4 w-4 text-[var(--muted)]" />
                Réglages
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--muted)]" />
                Notes de version
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
