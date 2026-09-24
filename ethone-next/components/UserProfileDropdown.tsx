"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ClientImage from "@/components/ClientImage";
import { useRouter } from "next/navigation";
import { LogOut } from "@/components/icons/ph";
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

  const VERSION_LABEL = changelog[0]?.version || "v1.28.32";

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
      action: () => router.push("/settings?category=security"),
    },
    ...(isOwner
      ? [
          {
            id: "owner-shield",
            label: "Bouclier Owner",
            icon: "shield",
            badge: "Privé",
            action: () => router.push("/owner/shield"),
          },
        ]
      : []),
  ];

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

        <PopoverContent className="ethone-menu w-[272px] max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 z-[var(--z-dropdown)]">
          <div data-testid={`${dataTestId}-menu`} data-open={open ? "true" : "false"} className="flex w-full select-none flex-col p-2">
            {/* En-tête : avatar, nom, identifiant, e-mail */}
            <div className="flex items-center gap-3 px-2 pb-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsAvatarPickerOpen(true);
                }}
                className="group relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full"
                title={i18n("tbChangeAvatar", "Changer d'avatar")}
                aria-label={i18n("tbChangeAvatar", "Changer d'avatar")}
              >
                <span className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)]/15 text-sm font-bold text-[var(--accent-primary)]">
                  {avatarUrl ? (
                    <ClientImage src={avatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" fallback={<span>{initials}</span>} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon name="camera" className="h-3.5 w-3.5 text-white" />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">
                  {displayName}
                  {verified && <span className="ml-1 text-[10px] text-[var(--success)]">✓</span>}
                </p>
                <p className="mt-0.5 truncate text-xs leading-tight text-[var(--text-muted)]">
                  @{username}
                  {isOwner && <span> · {i18n("tbOwner", "Propriétaire")}</span>}
                </p>
              </div>
            </div>

            {email && (
              <button
                type="button"
                onClick={copyEmail}
                title={i18n("tbCopyEmail", "Copier l'adresse e-mail")}
                className="mx-1 mb-1 flex items-center gap-1.5 rounded-md px-1 py-1 text-left text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span className="truncate">{email}</span>
                <Icon name={copied ? "check" : "copy"} className="h-3 w-3 shrink-0" />
              </button>
            )}

            {bio && <p className="mx-2 mb-1 truncate text-[11px] italic text-[var(--text-muted)]">&ldquo;{bio}&rdquo;</p>}

            <div className="ethone-menu-sep" />

            {/* Statut : cinq pastilles, le libellé courant à côté */}
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="flex items-center gap-2 text-[13px] text-[var(--text-primary)]">
                <span className={cn("h-2 w-2 rounded-full", USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.dot)} />
                {i18n(USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG]?.labelKey || "statusOnline")}
              </span>
              <span className="flex items-center gap-1" role="group" aria-label={i18n("tbStatus", "Statut")}>
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
                      aria-label={i18n(cfg.labelKey)}
                      className={cn(
                        "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors",
                        isSelected ? "bg-[var(--menu-hover)] ring-1 ring-[var(--accent-primary)]/60" : "hover:bg-[var(--menu-hover)]"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                    </button>
                  );
                })}
              </span>
            </div>

            <div className="ethone-menu-sep" />

            {/* Navigation */}
            {quickLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.action();
                }}
                className="ethone-menu-item"
              >
                <Icon name={item.icon} className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
                {item.kbd && <span className="ethone-menu-hint font-mono">{item.kbd}</span>}
                {item.badge && <span className="ethone-menu-hint">{item.badge}</span>}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCommandOpen(true);
              }}
              className="ethone-menu-item"
            >
              <Icon name="terminal" className="h-4 w-4" />
              <span>{i18n("tbPalette", "Palette de commandes")}</span>
              <span className="ethone-menu-hint font-mono">⌘K</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setIsChangelogOpen(true);
              }}
              className="ethone-menu-item"
            >
              <Icon name="sparkles" className="h-4 w-4" />
              <span>{i18n("tbWhatsNew", "Nouveautés")}</span>
              <span className="ethone-menu-hint font-mono">{VERSION_LABEL}</span>
            </button>

            <div className="ethone-menu-sep" />

            {/* Déconnexion */}
            {!confirmSignOut ? (
              <button type="button" data-testid="profile-logout-button" data-menu-tone="danger" onClick={() => setConfirmSignOut(true)} className="ethone-menu-item">
                <LogOut className="h-4 w-4" />
                <span>{i18n("tbSignOut", "Se déconnecter")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="flex-1 pl-1.5 text-[13px] text-[var(--text-primary)]">{i18n("tbSignOutConfirm", "Se déconnecter ?")}</span>
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="h-8 cursor-pointer rounded-lg px-3 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--menu-hover)]"
                >
                  {i18n("tbCancel", "Annuler")}
                </button>
                <button
                  type="button"
                  data-testid="profile-logout-confirm"
                  onClick={handleSignOut}
                  className="h-8 cursor-pointer rounded-lg bg-[var(--danger)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {i18n("tbConfirm", "Déconnexion")}
                </button>
              </div>
            )}
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
