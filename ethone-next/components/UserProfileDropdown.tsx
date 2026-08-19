"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import {
  User,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Command,
  Settings as SettingsIcon,
  HardDrive,
  LogOut,
  Check,
  Copy,
  X,
  Zap,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile, useSettings } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useDiscordAvatar } from "@/lib/hooks/useDiscordAvatar";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import {
  CHANGELOG,
  CHANGELOG_BY_LANG,
  type ChangelogEntry,
} from "@/data/changelog";
import { useTopbarDropdown } from "@/lib/hooks/useTopbarDropdown";

function initials(name?: string) {
  if (!name) return "E";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string, locale = "fr") {
  return new Date(dateStr).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type StatusKey = "online" | "focus" | "away" | "dnd";

const statusConfig: Record<StatusKey, { label: string; color: string }> = {
  online: { label: "En ligne", color: "bg-emerald-400" },
  focus: { label: "En Focus", color: "bg-purple-400" },
  away: { label: "Absent", color: "bg-amber-400" },
  dnd: { label: "NPD", color: "bg-rose-400" },
};

export default function UserProfileDropdown() {
  const i18n = useI18n();
  const router = useRouter();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const [open, setOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { setTrigger, setPanel, floatingStyles } = useTopbarDropdown({
    open,
    onClose: () => setOpen(false),
  });

  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { settings, update } = useSettings();
  const { avatarUrl: discordAvatar, displayName: discordName } = useDiscordAvatar();

  const displayName =
    discordName ||
    publicProfile?.display_name ||
    activeProfile?.name ||
    user?.email ||
    i18n("guest");
  const avatarUrl = discordAvatar || publicProfile?.avatar_url;
  const email = user?.email || "";

  const currentStatus = useMemo<StatusKey>(() => {
    if (settings.status === "busy") return "dnd";
    if (settings.status === "invisible") return "online";
    if (settings.status in statusConfig) return settings.status as StatusKey;
    return "online";
  }, [settings.status]);

  const [storage, setStorage] = useState({ used: 1.2, total: 10 });

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = (est.usage || 1.2e9) / 1e9;
        setStorage({ used: Math.min(used, 10), total: 10 });
      });
    }
  }, []);



  async function handleSignOut() {
    setOpen(false);
    setIsChangelogOpen(false);
    await signOut();
    router.push("/login");
  }

  async function copyEmail(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // silent
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function setStatus(st: StatusKey) {
    update({ status: st === "dnd" ? "busy" : st });
  }

  const changelog = useMemo<ChangelogEntry[]>(() => {
    return CHANGELOG_BY_LANG[settings.language] || CHANGELOG;
  }, [settings.language]);

  const VERSION_LABEL = "v1.6.15";

  const menuItems = [
    {
      id: "changelog",
      label: "Notes de version",
      badge: `${VERSION_LABEL} • NOUVEAU`,
      badgeClass: "text-purple-300 bg-purple-500/15 border-purple-500/30",
      icon: Sparkles,
      iconBoxClass:
        "bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]",
      action: () => setIsChangelogOpen(true),
    },
    {
      id: "profile",
      label: "Mon profil",
      badge: "Modifier",
      badgeClass: "text-zinc-400 bg-white/[0.04] border-white/[0.08]",
      icon: User,
      iconBoxClass:
        "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]",
      action: () => router.push("/settings?tab=profile"),
    },
    {
      id: "settings",
      label: "Réglages",
      kbd: "⌘,",
      icon: SettingsIcon,
      iconBoxClass:
        "bg-zinc-500/15 border-zinc-500/30 text-zinc-300 shadow-[0_0_10px_rgba(255,255,255,0.05)]",
      action: () => router.push("/settings"),
    },
    {
      id: "security",
      label: "Sécurité",
      badge: "actif",
      badgeClass: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
      icon: ShieldCheck,
      iconBoxClass:
        "bg-cyan-500/15 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]",
      action: () => router.push("/settings?tab=security"),
    },
    {
      id: "billing",
      label: "Facturation",
      badge: null,
      icon: CreditCard,
      iconBoxClass:
        "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
      action: () => router.push("/settings?tab=billing"),
    },
    {
      id: "shortcuts",
      label: "Raccourcis",
      kbd: "⌘K",
      icon: Command,
      iconBoxClass:
        "bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
      action: () => setCommandOpen(true),
    },
  ];

  const storagePercent = Math.round((storage.used / storage.total) * 100);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        ref={setTrigger as unknown as React.Ref<HTMLButtonElement>}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="group relative flex h-9 items-center gap-2.5 rounded-full border border-white/[0.08] bg-zinc-900/80 pl-1.5 pr-3 text-white transition-all hover:border-white/20 active:scale-95 cursor-pointer select-none"
        aria-label={i18n("profile")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="pointer-events-none relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="pointer-events-none h-full w-full object-cover"
            />
          ) : (
            <User className="pointer-events-none h-4 w-4" />
          )}
          <span
            className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${statusConfig[currentStatus].color}`}
          />
        </div>
        <div className="pointer-events-none hidden flex-col text-left sm:flex">
          <span className="pointer-events-none text-sm font-bold leading-tight text-white">
            {displayName}
          </span>
        </div>
        <ChevronDown
          className={`pointer-events-none h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={setPanel as unknown as React.Ref<HTMLDivElement>}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              style={floatingStyles}
              className="z-[100] w-[340px] select-none flex flex-col gap-2.5 rounded-xl border border-white/[0.08] bg-zinc-950/90 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-3xl"
            >
            {/* Header */}
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-tr from-emerald-500/30 to-cyan-500/30 text-emerald-300">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {initials(displayName)}
                  </span>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-950 ${statusConfig[currentStatus].color}`}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold text-white">
                    {displayName}
                  </span>
                </div>
                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="mt-0.5 flex items-center gap-1 text-left text-[11px] text-zinc-400 transition-colors hover:text-white"
                    title="Cliquer pour copier l'email"
                  >
                    <span className="truncate font-mono">{email}</span>
                    {copied ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 shrink-0 text-zinc-500" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Status selector */}
            <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-1 text-[10px]">
              {(Object.keys(statusConfig) as StatusKey[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatus(st);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-all ${
                    currentStatus === st
                      ? "bg-white/[0.08] font-bold text-white shadow-sm"
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-lg ${statusConfig[st].color}`}
                  />
                  <span>{statusConfig[st].label}</span>
                </button>
              ))}
            </div>

            {/* Storage gauge */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-zinc-300">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-teal-500/30 bg-teal-500/15 text-teal-300">
                    <HardDrive className="h-3 w-3" />
                  </div>
                  <span className="font-medium">Stockage Système</span>
                </div>
                <span className="font-mono text-zinc-400">
                  {storage.used.toFixed(1)} / {storage.total} GB
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-xl bg-white/[0.06]">
                <div
                  className="h-full rounded-xl bg-teal-400"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>

            {/* Menu items */}
            <div className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.action();
                    }}
                    className="group flex w-full items-center justify-between rounded-lg border border-transparent p-2 text-xs text-zinc-200 transition-all hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105 ${item.iconBoxClass}`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${item.badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.kbd && (
                      <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {item.kbd}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-white/[0.04] pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="group flex w-full items-center justify-between rounded-lg border border-transparent p-2 text-xs text-rose-400 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-400 transition-transform group-hover:scale-105">
                    <LogOut className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold">
                    {i18n("signOut") || "Se déconnecter"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-rose-400/60">
                  {i18n("quit") || "Quitter"}
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </FloatingPortal>

      {/* Changelog modal */}
      <AnimatePresence>
        {isChangelogOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={() => setIsChangelogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-lg select-none flex-col gap-4 rounded-xl border border-white/[0.08] bg-zinc-950/90 p-6 shadow-2xl backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <span>
                        {i18n("changelogTitle") || "Changelog ETHONE OS"}
                      </span>
                      <span className="rounded-lg border border-purple-500/25 bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                        {VERSION_LABEL}
                      </span>
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {i18n("changelogDescription") ||
                        "Historique des mises à jour"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangelogOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  aria-label={i18n("close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
                {changelog.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.version}
                    className={`flex flex-col gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 ${index > 0 ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${index === 0 ? "text-emerald-400" : "text-zinc-300"}`}
                      >
                        {entry.version} — {entry.title}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {formatDate(entry.date, settings.language)}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5 text-xs text-zinc-300">
                      {entry.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          {index === 0 ? (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          ) : (
                            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          )}
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsChangelogOpen(false)}
                className="w-full rounded-xl bg-purple-500 py-2.5 text-xs font-bold text-zinc-950 transition-all hover:bg-purple-400"
              >
                {i18n("gotIt") || "Compris !"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
