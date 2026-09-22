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
import { useIdentity } from "@/lib/identity";

// Lazy: only needed once the user actually opens the avatar picker, but
// UserProfileDropdown itself is mounted on every page via Shell/TopBar.
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
  const { displayName, avatarUrl, email, initials } = useUserIdentity();
  const { settings, update } = useSettings();
  const { identity } = useIdentity();

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

  const VERSION_LABEL = changelog[0]?.version || "v1.28.13";

  type MenuItem = {
    id: string;
    label: string;
    description: string;
    icon: string;
    action: () => void;
    kbd?: string;
    badge?: string;
    badgeTone?: "success" | "accent";
  };

  const isOwner = Boolean(email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  const accountItems: MenuItem[] = [
    {
      id: "profile",
      label: i18n("tbProfile", "Mon profil"),
      description: i18n("tbProfileDesc", "Identité et statut"),
      icon: "user",
      action: () => router.push("/profile"),
    },
    {
      id: "security",
      label: i18n("tbSecurity", "Sécurité"),
      description: i18n("tbSecurityDesc", "Appareils et connexions"),
      icon: "shield",
      badge: i18n("tbActive", "Actif"),
      badgeTone: "success",
      action: () => router.push("/settings?category=security"),
    },
    ...(isOwner
      ? [
          {
            id: "owner-shield",
            label: "Bouclier Owner",
            description: "Protection suprême & sauvetage",
            icon: "shield",
            badge: "Privé",
            badgeTone: "accent" as const,
            action: () => router.push("/owner/shield"),
          },
        ]
      : []),
  ];

  const appItems: MenuItem[] = [
    {
      id: "settings",
      label: i18n("tbSettings", "Réglages"),
      description: i18n("tbSettingsDesc", "Apparence, son, système"),
      icon: "sliders-horizontal",
      kbd: "⌘,",
      action: () => router.push("/settings"),
    },
    {
      id: "shortcuts",
      label: i18n("tbPalette", "Palette de commandes"),
      description: i18n("tbPaletteDesc", "Recherche et raccourcis"),
      icon: "terminal",
      kbd: "⌘K",
      action: () => setCommandOpen(true),
    },
    {
      id: "changelog",
      label: i18n("tbChangelog", "Notes de version"),
      description: i18n("tbChangelogDesc", "Les nouveautés d'ETHONE"),
      icon: "sparkles",
      badge: VERSION_LABEL,
      action: () => setIsChangelogOpen(true),
    },
  ];

  const renderRow = (item: MenuItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        setOpen(false);
        item.action();
      }}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] focus-visible:outline-none cursor-pointer"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--surface-raised)] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--accent-muted)] group-hover:text-[var(--accent-primary)]">
        <Icon name={item.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-tight text-[var(--text-primary)]">{item.label}</span>
        <span className="block truncate text-[11px] leading-snug text-[var(--text-muted)]">{item.description}</span>
      </span>
      {item.badge && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold",
            item.badgeTone === "success"
              ? "bg-[var(--success)]/15 text-[var(--success)]"
              : "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
          )}
        >
          {item.badge}
        </span>
      )}
      {item.kbd && (
        <kbd className="shrink-0 rounded-md border border-[var(--panel-border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
          {item.kbd}
        </kbd>
      )}
    </button>
  );

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

        {/* User Popover Panel — themed glass panel, matching every other popover
            in the app (LanguageSwitcher, etc.). Was previously a hardcoded
            bg-[#0a0b0e], which never changed with the active theme (stayed
            near-black even on light themes like Arctic) and looked visibly
            inconsistent next to other dropdowns using the real --panel-bg
            token. Kept the opacity high (/95, same as LanguageSwitcher) so
            it reads as solid, just themed instead of frozen black. */}
        {/* Solid --bg-surface-elevated (not the translucent glass --panel-bg,
            which is colorMix(bgSurface, transparent, glassOpacity) and made
            this text-heavy menu hard to read over the busy dashboard behind
            it). Blur kept only for the frosting at the rounded edges. */}
        <PopoverContent className="w-[336px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface-elevated)] p-0 shadow-2xl backdrop-blur-2xl z-[var(--z-dropdown)]">
          <div className="flex w-full flex-col select-none">
            {/* En-tête : avatar, nom, e-mail (copiable), badge vérifié */}
            <div className="flex items-center gap-3 px-4 pb-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setIsAvatarPickerOpen(true);
                }}
                className="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-2xl ring-1 ring-[var(--panel-border)] transition-all hover:ring-[var(--accent-primary)]"
                title={i18n("tbChangeAvatar", "Changer d'avatar")}
                aria-label={i18n("tbChangeAvatar", "Changer d'avatar")}
              >
                <span className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)]/15 text-base font-bold text-[var(--accent-primary)]">
                  {avatarUrl ? (
                    <ClientImage
                      src={avatarUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      fallback={<span>{initials}</span>}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                  <Icon name="camera" className="h-4 w-4 text-white" />
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-[var(--text-primary)]">{displayName}</span>
                  {identity?.badge_ids?.includes("verified") && (
                    <span className="shrink-0 rounded-full bg-[var(--success)]/15 px-1.5 py-px text-[9px] font-bold text-[var(--success)]">
                      ✓ {i18n("tbVerified", "Vérifié")}
                    </span>
                  )}
                </div>
                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    title={i18n("tbCopyEmail", "Copier l'adresse e-mail")}
                    className="mt-0.5 flex max-w-full items-center gap-1 text-left text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <span className="truncate">{email}</span>
                    <Icon name={copied ? "check" : "copy"} className="h-3 w-3 shrink-0" />
                  </button>
                )}
                {identity?.bio && (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]" title={identity.bio}>
                    {identity.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Statut : contrôle segmenté */}
            <div className="px-4 pb-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {i18n("tbStatus", "Statut")}
              </p>
              <div className="grid grid-cols-5 gap-0.5 rounded-xl bg-[var(--surface-raised)] p-0.5">
                {STATUS_KEYS.map((st) => {
                  const cfg = USER_STATUS_CONFIG[st];
                  const isSelected = currentStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-[10px] py-1.5 text-[10px] font-semibold transition-all cursor-pointer",
                        isSelected
                          ? "bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--panel-border)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      <span className="max-w-full truncate px-0.5">{i18n(cfg.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-[var(--panel-border)]/70" />

            {/* Groupes de navigation */}
            <div className="px-2 py-2">
              <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {i18n("tbAccount", "Compte")}
              </p>
              {accountItems.map(renderRow)}
              <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {i18n("tbApp", "Application")}
              </p>
              {appItems.map(renderRow)}
            </div>

            <div className="h-px bg-[var(--panel-border)]/70" />

            {/* Stockage + déconnexion */}
            <div className="flex flex-col gap-3 px-4 py-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--text-primary)]">{i18n("tbStorage", "Stockage cloud")}</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    {storage.used.toFixed(1)} / {storage.total} Go
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>

              {!confirmSignOut ? (
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/25 px-3 py-2 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {i18n("tbSignOut", "Se déconnecter")}
                </button>
              ) : (
                <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3">
                  <p className="text-xs font-bold text-[var(--danger)]">{i18n("tbSignOutConfirm", "Se déconnecter ?")}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {i18n("tbSignOutBody", "Tu devras te reconnecter pour retrouver tes données.")}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmSignOut(false)}
                      className="flex-1 rounded-lg border border-[var(--panel-border)] py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    >
                      {i18n("tbCancel", "Annuler")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex-1 rounded-lg bg-[var(--danger)] py-1.5 text-xs font-bold text-white hover:opacity-90 cursor-pointer"
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
