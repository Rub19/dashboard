"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useI18n } from "@/lib/hooks/useI18n";

function Avatar({ url, size = "md" }: { url?: string; size?: "sm" | "md" }) {
  const className = size === "sm"
    ? "h-7 w-7 rounded-lg text-xs"
    : "h-10 w-10 rounded-xl text-sm";
  const wh = size === "sm" ? 28 : 40;

  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={wh}
        height={wh}
        unoptimized
        className={`${className} object-cover border border-[var(--border)]`}
      />
    );
  }

  return (
    <span className={`${className} flex items-center justify-center bg-[var(--accent)] text-white`}>
      <Icon name="user" className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const i18n = useI18n();

  const email = user?.email || i18n("guest");
  const displayName = profile?.display_name || profile?.username || email;
  const avatarUrl = profile?.avatar_url;

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
        aria-label={i18n("account")}
      >
        <Avatar url={avatarUrl} size="sm" />
        <Icon
          name="chevronDown"
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
              <Avatar url={avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-[var(--muted)]">{email}</p>
              </div>
            </div>
            <nav className="p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/profile");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <Icon name="user" className="h-4 w-4 text-[var(--muted)]" />
                {i18n("profile")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <Icon name="settings" className="h-4 w-4 text-[var(--muted)]" />
                {i18n("settings")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/changelog");
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
              >
                <Icon name="sparkles" className="h-4 w-4 text-[var(--muted)]" />
                {i18n("changelog")}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <Icon name="logout" className="h-4 w-4" />
                {i18n("signOut")}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
