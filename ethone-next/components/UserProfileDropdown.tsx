"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, User, Sliders, LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useI18n } from "@/lib/hooks/useI18n";

function initials(name?: string) {
  if (!name) return "E";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function UserProfileDropdown() {
  const i18n = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();

  const displayName = publicProfile?.display_name || activeProfile?.name || user?.email || i18n("guest");
  const avatarUrl = publicProfile?.avatar_url;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/login");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5 text-zinc-200 transition-colors hover:bg-white/[0.08]"
        aria-label={i18n("profile")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 rounded-lg object-cover"
          />
        ) : (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "var(--accent-color, #10b981)", color: "#09090b" }}
          >
            {initials(displayName)}
          </span>
        )}
        <span className="hidden text-xs font-semibold text-zinc-200 lg:inline">{displayName}</span>
        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <User className="h-4 w-4 text-zinc-500" />
              {i18n("myProfile")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <Sliders className="h-4 w-4 text-zinc-500" />
              {i18n("settings")}
            </button>
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              {i18n("signOut")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
