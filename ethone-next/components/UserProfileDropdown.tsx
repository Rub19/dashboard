"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ClientImage from "@/components/ClientImage";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { Icon } from "@/lib/icons";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile, useSettings } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import ChangelogModal from "@/components/ChangelogModal";
import {
  CHANGELOG,
  CHANGELOG_BY_LANG,
  type ChangelogEntry,
} from "@/data/changelog";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { cn } from "@/lib/utils";

function initials(name?: string) {
  if (!name) return "E";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_KEYS = [
  "online",
  "focus",
  "busy",
  "away",
  "invisible",
] as const satisfies readonly (keyof typeof USER_STATUS_CONFIG)[];

export default function UserProfileDropdown({ dataTestId = "user-profile-trigger" }: { dataTestId?: string }) {
  const i18n = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const focus = useFocus();

  const [open, setOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const { user, signOut } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { settings, update } = useSettings();

  const displayName =
    publicProfile?.display_name ||
    activeProfile?.name ||
    user?.email ||
    "Utilisateur ETHONE";
  const avatarUrl = publicProfile?.avatar_url;
  const email = user?.email || "";

  const isFocusRunning = focus.state.phase !== "idle";
  const currentStatus = isFocusRunning
    ? "focus"
    : settings.status in USER_STATUS_CONFIG
    ? settings.status
    : "online";

  const [storage, setStorage] = useState({ used: 1.2, total: 10 });

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = (est.usage || 1.2e9) / 1e9;
        setStorage({ used: Math.min(used, 10), total: 10 });
      });
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    setIsChangelogOpen(false);
    setConfirmSignOut(false);
    await signOut();
    router.push("/login");
  }, [signOut, router]);

  const copyEmail = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!email) return;
      try {
        await navigator.clipboard.writeText(email);
      } catch {}
      toast.success("Adresse e-mail copiée !");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [email, toast]
  );

  const handleStatusChange = useCallback(
    (st: keyof typeof USER_STATUS_CONFIG) => {
      update({ status: st });
    },
    [update]
  );

  const changelog = useMemo<ChangelogEntry[]>(() => {
    return CHANGELOG_BY_LANG[settings.language] || CHANGELOG;
  }, [settings.language]);

  const VERSION_LABEL = "v1.10.65";

  const menuItems = [
    {
      id: "profile",
      label: "Mon Profil",
      description: "Informations personnelles & compte",
      icon: "user",
      action: () => router.push("/settings?category=profile"),
    },
    {
      id: "settings",
      label: "Réglages Système",
      description: "Centre de contrôle & personnalisation",
      kbd: "⌘,",
      icon: "sliders-horizontal",
      action: () => router.push("/settings"),
    },
    {
      id: "security",
      label: "Sécurité & Sessions",
      description: "Appareils connectés & authentification",
      badge: "Actif",
      icon: "shield",
      action: () => router.push("/settings?category=security"),
    },
    {
      id: "shortcuts",
      label: "Command Palette",
      description: "Recherche globale & raccourcis",
      kbd: "⌘K",
      icon: "terminal",
      action: () => setCommandOpen(true),
    },
    {
      id: "changelog",
      label: "Notes de version",
      description: "Nouveautés et journal des modifications",
      badge: VERSION_LABEL,
      icon: "sparkles",
      action: () => setIsChangelogOpen(true),
    },
  ];

  const storagePercent = Math.min(
    100,
    Math.max(0, Math.round((storage.used / storage.total) * 100))
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmSignOut(false);
        }}
        trigger="click"
        side="bottom"
        align="end"
        sideOffset={10}
        panelRadius={20}
        gooStrength={0}
      >
        {/* Trigger Button */}
        <PopoverTrigger>
          <button
            type="button"
            data-testid={dataTestId}
            aria-label="Menu profil utilisateur"
            aria-expanded={open}
            className="group relative flex h-9 items-center gap-2 rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-2 text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all active:scale-95 cursor-pointer select-none shadow-sm"
          >
            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold text-xs">
                {avatarUrl ? (
                  <ClientImage
                    src={avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="h-full w-full object-cover"
                    fallback={<span>{initials(displayName)}</span>}
                  />
                ) : (
                  <span>{initials(displayName)}</span>
                )}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--panel-bg)]",
                  USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.dot || "bg-emerald-400"
                )}
              />
            </div>

            <span className="hidden xl:inline text-xs font-semibold max-w-[12ch] truncate">
              {displayName}
            </span>

            <Icon
              name="caret-down"
              className={cn(
                "h-3 w-3 text-[var(--text-muted)] transition-transform duration-200",
                open ? "rotate-180" : ""
              )}
            />
          </button>
        </PopoverTrigger>

        {/* User Popover Panel (100% FULL OPAQUE SOLID DARK) */}
        <PopoverContent className="w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#0a0b0e] p-3.5 shadow-2xl z-[var(--z-dropdown)]">
          <div className="flex w-full flex-col gap-3 select-none">
            {/* User Header Profile */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)]/70 bg-[#121319] p-2.5 shadow-xs">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold text-sm">
                  {avatarUrl ? (
                    <ClientImage
                      src={avatarUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                      fallback={<span>{initials(displayName)}</span>}
                    />
                  ) : (
                    <span>{initials(displayName)}</span>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="truncate text-xs font-bold text-[var(--text-primary)]">
                    {displayName}
                  </span>
                  <span className="rounded-full bg-[var(--success)]/15 px-1.5 py-0.2 text-[9px] font-bold text-[var(--success)]">
                    ✓ Vérifié
                  </span>
                </div>

                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <span className="truncate max-w-[170px]">{email}</span>
                    <Icon name={copied ? "check" : "copy"} className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Selector Bar */}
            <div className="grid grid-cols-5 gap-1 rounded-xl border border-[var(--panel-border)]/70 bg-[#121319] p-1 shadow-xs">
              {STATUS_KEYS.map((st) => {
                const cfg = USER_STATUS_CONFIG[st];
                const isSelected = currentStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold transition-all cursor-pointer",
                      isSelected
                        ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm scale-100"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] hover:scale-105"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    <span className="truncate">{i18n(cfg.labelKey)}</span>
                  </button>
                );
              })}
            </div>

            {/* Storage Estimation Bar */}
            <div className="flex flex-col gap-1 rounded-xl border border-[var(--panel-border)]/70 bg-[#121319] p-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[11px] text-[var(--text-primary)]">
                  Stockage Cloud
                </span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                  {storage.used.toFixed(1)} Go / {storage.total} Go
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>

            {/* Navigation Menu List with Distinct Hover Indicators */}
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.action();
                  }}
                  className="group relative flex w-full items-center justify-between rounded-xl border border-transparent p-2.5 text-xs text-[var(--text-muted)] transition-all duration-150 hover:border-[var(--accent-primary)]/40 hover:bg-gradient-to-r hover:from-[var(--accent-primary)]/10 hover:via-[#161720] hover:to-transparent hover:text-[var(--text-primary)] hover:shadow-xs cursor-pointer overflow-hidden"
                >
                  {/* Left glowing hover pill */}
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--accent-primary)] opacity-0 shadow-[0_0_8px_var(--glow-color)] transition-all duration-150 group-hover:opacity-100" />

                  <div className="flex items-center gap-2.5 min-w-0 pl-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#14151e] text-[var(--accent-primary)] transition-transform duration-150 group-hover:scale-110 group-hover:bg-[var(--accent-primary)]/20 shadow-xs">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-white transition-colors truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-muted)]/90 truncate">
                        {item.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.badge && (
                      <span className="rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--accent-primary)]">
                        {item.badge}
                      </span>
                    )}
                    {item.kbd && (
                      <kbd className="rounded-lg border border-[var(--panel-border)]/60 bg-[#14151e] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors group-hover:border-[var(--accent-primary)]/40 group-hover:text-[var(--accent-primary)]">
                        {item.kbd}
                      </kbd>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--accent-primary)] opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                </button>
              ))}
            </div>

            {/* Sign Out Section */}
            <div className="border-t border-[var(--panel-border)]/60 pt-2">
              {!confirmSignOut ? (
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(true)}
                  className="group relative flex w-full items-center justify-between rounded-xl border border-transparent p-2.5 text-xs font-semibold text-[var(--danger)] transition-all duration-150 hover:border-[var(--danger)]/30 hover:bg-[var(--danger)]/10 cursor-pointer overflow-hidden"
                >
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--danger)] opacity-0 shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all duration-150 group-hover:opacity-100" />
                  <div className="flex items-center gap-2.5 pl-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--danger)]/15 text-[var(--danger)] transition-transform duration-150 group-hover:scale-110">
                      <Icon name="sign-out" className="h-4 w-4" />
                    </div>
                    <span>Se déconnecter</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[var(--danger)] opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0" />
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5">
                  <span className="text-xs font-bold text-[var(--danger)]">
                    Confirmer la déconnexion ?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(false)}
                      className="flex-1 rounded-lg border border-[var(--panel-border)] py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex-1 rounded-lg bg-[var(--danger)] py-1 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 cursor-pointer"
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
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
