"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ClientImage from "@/components/ClientImage";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Icon } from "@/lib/icons";
import { useAuth } from "@/components/AuthProvider";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useSettings } from "@/components/SettingsProvider";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import ChangelogModal from "@/components/ChangelogModal";

// Lazy: only loaded once the user opens the avatar picker
const AvatarPickerModal = dynamic(() => import("@/components/AvatarPickerModal"), {
  ssr: false,
});
import {
  CHANGELOG,
  CHANGELOG_BY_LANG,
  type ChangelogEntry,
} from "@/data/changelog";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { ADMIN_EMAIL } from "@/lib/admin";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { cn } from "@/lib/utils";

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
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const { signOut } = useAuth();
  const { displayName, username, avatarUrl, email, initials, bio, verified } = useUserIdentity();
  const { settings, update } = useSettings();

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
      toast.success(i18n("tbCopied", "Adresse e-mail copiée"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [email, toast, i18n]
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

  const VERSION_LABEL = changelog[0]?.version || "v1.28.31";

  const isOwner = Boolean(email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  const quickLinks = [
    {
      id: "profile",
      label: i18n("tbProfile", "Mon profil"),
      icon: "user",
      action: () => router.push("/profile"),
    },
    {
      id: "settings",
      label: i18n("tbSettings", "Paramètres"),
      icon: "settings",
      kbd: "⌘,",
      action: () => router.push("/settings"),
    },
    {
      id: "security",
      label: i18n("tbSecurity", "Sécurité"),
      icon: "shield",
      badge: i18n("tbActive", "Actif"),
      badgeTone: "success" as const,
      action: () => router.push("/settings?category=security"),
    },
    ...(isOwner
      ? [
          {
            id: "owner-shield",
            label: "Bouclier Owner",
            icon: "shield",
            badge: "Privé",
            badgeTone: "accent" as const,
            action: () => router.push("/owner/shield"),
          },
        ]
      : []),
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
        sideOffset={8}
        panelRadius={18}
        gooStrength={0}
      >
        {/* Trigger Button — strictly preserving layout dimensions to prevent Topbar shift */}
        <PopoverTrigger>
          <button
            type="button"
            data-testid={dataTestId}
            aria-label={i18n("tbProfileMenu", "Menu du profil")}
            aria-expanded={open}
            className="group relative flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-2 text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all active:scale-95 cursor-pointer select-none shadow-sm"
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
                    fallback={<span>{initials}</span>}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--panel-bg)]",
                  USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.dot || "bg-emerald-400"
                )}
              />
            </div>

            <span className="hidden sm:inline text-xs font-semibold max-w-[15ch] lg:max-w-[20ch] truncate text-[var(--text-primary)]">
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

        {/* Compact Premium Profile Popover */}
        <PopoverContent className="w-[300px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[18px] border border-[var(--panel-border)]/80 bg-[var(--bg-surface-elevated)] p-0 shadow-2xl backdrop-blur-2xl z-[var(--z-dropdown)]">
          <div
            data-testid={`${dataTestId}-menu`}
            data-open={open ? "true" : "false"}
            className="flex w-full flex-col select-none p-3.5 space-y-3"
          >
            {/* Header: Avatar, Real Display Name, @username, Email, Verified */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsAvatarPickerOpen(true);
                }}
                className="group relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-[var(--panel-border)]/80 transition-all hover:ring-[var(--accent-primary)]/70 shadow-sm"
                title={i18n("tbChangeAvatar", "Changer d'avatar")}
                aria-label={i18n("tbChangeAvatar", "Changer d'avatar")}
              >
                <span className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)]/15 text-sm font-bold text-[var(--accent-primary)]">
                  {avatarUrl ? (
                    <ClientImage
                      src={avatarUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                      fallback={<span>{initials}</span>}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon name="camera" className="h-3.5 w-3.5 text-white" />
                </span>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface-elevated)]",
                    USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.dot || "bg-emerald-400"
                  )}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-[var(--text-primary)] leading-tight">
                    {displayName}
                  </span>
                  {verified && (
                    <span className="shrink-0 rounded-full bg-[var(--success)]/15 px-1.5 py-px text-[9px] font-bold text-[var(--success)]">
                      ✓
                    </span>
                  )}
                </div>

                <p className="truncate font-mono text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                  @{username}
                </p>

                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    title={i18n("tbCopyEmail", "Copier l'adresse e-mail")}
                    className="mt-0.5 flex max-w-full items-center gap-1 text-left text-[10px] text-[var(--text-muted)]/80 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <span className="truncate">{email}</span>
                    <Icon name={copied ? "check" : "copy"} className="h-2.5 w-2.5 shrink-0" />
                  </button>
                )}
              </div>
            </div>

            {/* Profile summary / bio or role */}
            {bio ? (
              <div className="rounded-lg bg-[var(--surface-raised)]/50 border border-[var(--panel-border)]/40 px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] italic truncate">
                &ldquo;{bio}&rdquo;
              </div>
            ) : isOwner ? (
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2 py-0.5 rounded-md self-start border border-[var(--accent-primary)]/20">
                <Icon name="shield-check" className="h-3 w-3" />
                <span>Owner &bull; Administrateur</span>
              </div>
            ) : null}

            {/* Discreet Status Selector */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <span>{i18n("tbStatus", "Statut")}</span>
                <span className="font-medium text-[var(--text-muted)] normal-case flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.dot
                    )}
                  />
                  {i18n(USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.labelKey || "statusOnline")}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-[var(--surface-raised)]/70 p-1 border border-[var(--panel-border)]/40">
                {STATUS_KEYS.map((st) => {
                  const cfg = USER_STATUS_CONFIG[st];
                  const isSelected = currentStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      aria-pressed={isSelected}
                      title={i18n(cfg.labelKey)}
                      className={cn(
                        "flex items-center justify-center gap-1 rounded-lg py-1 px-1 text-[10px] font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-semibold shadow-xs ring-1 ring-[var(--accent-primary)]/40"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
                      <span className="truncate">{i18n(cfg.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[var(--panel-border)]/60" />

            {/* Quick Links */}
            <div className="space-y-0.5">
              {quickLinks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.action();
                  }}
                  className="group flex w-full h-8.5 items-center justify-between rounded-xl px-2.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] hover:text-[var(--accent-primary)] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold",
                        item.badgeTone === "success"
                          ? "bg-[var(--success)]/15 text-[var(--success)]"
                          : "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.kbd && (
                    <kbd className="shrink-0 rounded border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)]">
                      {item.kbd}
                    </kbd>
                  )}
                </button>
              ))}

              {/* Secondary Utility Row (Palette ⌘K & Notes de version) */}
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCommandOpen(true);
                  }}
                  className="flex-1 flex items-center justify-between h-7 rounded-lg px-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/60 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Icon name="terminal" className="h-3 w-3" />
                    <span>Palette</span>
                  </span>
                  <kbd className="font-mono text-[9px] text-[var(--text-muted)]">⌘K</kbd>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsChangelogOpen(true);
                  }}
                  className="flex-1 flex items-center justify-between h-7 rounded-lg px-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/60 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Icon name="sparkles" className="h-3 w-3" />
                    <span>Nouveautés</span>
                  </span>
                  <span className="font-mono text-[9px] text-[var(--accent-primary)] font-semibold">{VERSION_LABEL}</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-[var(--panel-border)]/60" />

            {/* Storage & Sign Out */}
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[var(--text-muted)]">{i18n("tbStorage", "Stockage")}</span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">
                    {storage.used.toFixed(1)} / {storage.total} Go
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>

              {!confirmSignOut ? (
                <button
                  type="button"
                  data-testid="profile-logout-button"
                  onClick={() => setConfirmSignOut(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/25 py-1.5 px-3 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors cursor-pointer active:scale-98"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{i18n("tbSignOut", "Se déconnecter")}</span>
                </button>
              ) : (
                <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2.5 text-center">
                  <p className="text-xs font-bold text-[var(--danger)] mb-1">
                    {i18n("tbSignOutConfirm", "Se déconnecter ?")}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(false)}
                      className="flex-1 rounded-lg border border-[var(--panel-border)] py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      {i18n("tbCancel", "Annuler")}
                    </button>
                    <button
                      type="button"
                      data-testid="profile-logout-confirm"
                      onClick={handleSignOut}
                      className="flex-1 rounded-lg bg-[var(--danger)] py-1 text-xs font-bold text-white hover:opacity-90 cursor-pointer"
                    >
                      {i18n("tbConfirm", "Déconnexion")}
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

      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
    </>
  );
}
