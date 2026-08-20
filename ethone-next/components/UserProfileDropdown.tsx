"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile, useSettings } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useI18n } from "@/lib/hooks/useI18n";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import ChangelogModal from "@/components/ChangelogModal";
import {
  CHANGELOG,
  CHANGELOG_BY_LANG,
  type ChangelogEntry,
} from "@/data/changelog";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";

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
  const { setOpen: setCommandOpen } = useCommandPalette();
  const [open, setOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { settings, update } = useSettings();

  const displayName =
    publicProfile?.display_name ||
    activeProfile?.name ||
    user?.email ||
    i18n("guest");
  const avatarUrl = publicProfile?.avatar_url;
  const email = user?.email || "";

  const currentStatus = settings.status in USER_STATUS_CONFIG ? settings.status : "online";

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

  function setStatus(st: keyof typeof USER_STATUS_CONFIG) {
    update({ status: st });
  }

  const changelog = useMemo<ChangelogEntry[]>(() => {
    return CHANGELOG_BY_LANG[settings.language] || CHANGELOG;
  }, [settings.language]);

  const VERSION_LABEL = "v1.7.43";

  const menuItems = [
    {
      id: "changelog",
      label: "Notes de version",
      badge: `${VERSION_LABEL} • NOUVEAU`,
      badgeClass: "text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/25",
      icon: Sparkles,
      action: () => setIsChangelogOpen(true),
    },
    {
      id: "profile",
      label: "Mon profil",
      badge: "Modifier",
      badgeClass: "text-[var(--text-muted)] bg-[var(--text-primary)]/[0.04] border-[var(--text-primary)]/[0.08]",
      icon: User,
      action: () => router.push("/settings?tab=profile"),
    },
    {
      id: "settings",
      label: "Réglages",
      kbd: "⌘,",
      icon: SettingsIcon,
      action: () => router.push("/settings"),
    },
    {
      id: "security",
      label: "Sécurité",
      badge: "actif",
      badgeClass: "text-cyan-300 bg-cyan-500/10 border-cyan-500/25",
      icon: ShieldCheck,
      action: () => router.push("/settings?tab=security"),
    },
    {
      id: "billing",
      label: "Facturation",
      badge: null,
      icon: CreditCard,
      action: () => router.push("/settings?tab=billing"),
    },
    {
      id: "shortcuts",
      label: "Raccourcis",
      kbd: "⌘K",
      icon: Command,
      action: () => setCommandOpen(true),
    },
  ];

  const storagePercent = Math.round((storage.used / storage.total) * 100);

  return (
    <>
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      side="bottom"
      align="end"
      sideOffset={10}
      panelRadius={12}
      gooStrength={0}
    >
      {/* Trigger */}
      <PopoverTrigger>
        <button
          type="button"
          className="group relative flex h-9 items-center gap-2.5 rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--surface)]/80 pl-1.5 pr-3 text-[var(--text-primary)] transition-all hover:border-[var(--text-primary)]/20 active:scale-95 cursor-pointer select-none"
          aria-label={i18n("profile")}
          aria-expanded={open}
          aria-haspopup="true"
        >
        <div className="pointer-events-none relative flex h-7 w-7 shrink-0 items-center justify-center">
          <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[var(--text-primary)]/10 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={36}
                height={36}
                unoptimized
                referrerPolicy="no-referrer"
                className="pointer-events-none h-full w-full object-cover"
              />
            ) : (
              <User className="pointer-events-none h-4 w-4" />
            )}
          </div>
          <span
            className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] ${USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG].dot}`}
          />
        </div>
        <div className="pointer-events-none hidden min-w-0 flex-col text-left sm:flex">
          <span className="pointer-events-none max-w-[14ch] truncate text-sm font-bold leading-tight text-[var(--text-primary)] sm:max-w-[18ch] lg:max-w-[24ch]">
            {displayName}
          </span>
        </div>
        <ChevronDown
          className={`pointer-events-none h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      </PopoverTrigger>

      {/* Dropdown */}
      <PopoverContent className="w-[340px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-[var(--panel-border)] p-4 bg-[var(--panel-bg)]/95 shadow-[0_16px_50px_var(--glow-color)] backdrop-blur-2xl">
        <div className="w-full select-none flex flex-col gap-2.5">
            {/* Header */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] p-2.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--panel-border)] bg-gradient-to-tr from-[var(--accent-primary)]/30 to-[var(--accent-secondary)]/30 text-[var(--text-primary)]">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold">
                      {initials(displayName)}
                    </span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--background)] ${USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG].dot}`}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                    {displayName}
                  </span>
                </div>
                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="mt-0.5 flex items-center gap-1 text-left text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--text-primary)]"
                    title="Cliquer pour copier l'email"
                  >
                    <span className="truncate font-mono">{email}</span>
                    {copied ? (
                      <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Status selector */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] p-1 text-[10px]">
              {(Object.keys(USER_STATUS_CONFIG) as (keyof typeof USER_STATUS_CONFIG)[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatus(st);
                  }}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 transition-all ${
                    currentStatus === st
                      ? "bg-[var(--text-primary)]/[0.08] font-bold text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--text-primary)]/[0.03] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-lg ${USER_STATUS_CONFIG[st].dot}`}
                  />
                  <span>{i18n(USER_STATUS_CONFIG[st].labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Storage gauge */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.04] bg-[var(--text-primary)]/[0.02] p-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    <HardDrive className="h-3 w-3" />
                  </div>
                  <span className="font-medium">Stockage Système</span>
                </div>
                <span className="font-mono text-[var(--text-muted)]">
                  {storage.used.toFixed(1)} / {storage.total} GB
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-xl bg-[var(--text-primary)]/[0.06]">
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
                    className="group flex w-full items-center justify-between rounded-lg border border-transparent p-2 text-xs text-[var(--text-primary)] transition-all hover:border-[var(--text-primary)]/[0.06] hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--text-primary)]/[0.08] group-hover:text-[var(--text-primary)]">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${item.badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.kbd && (
                      <kbd className="rounded-md border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                        {item.kbd}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-[var(--text-primary)]/[0.04] pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="group flex w-full items-center justify-between rounded-lg border border-transparent p-2 text-xs text-[var(--danger)] transition-all hover:border-[var(--danger)]/20 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 transition-colors group-hover:bg-rose-500/20 group-hover:text-rose-300">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">
                    {i18n("signOut") || "Se déconnecter"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-rose-400/60">
                  {i18n("quit") || "Quitter"}
                </span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        entries={changelog}
        versionLabel={VERSION_LABEL}
      />
    </>
  );
}
