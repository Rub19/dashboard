"use client";

import { useModKey } from "@/lib/hooks/useModKey";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ClientImage from "@/components/ClientImage";
import { useRouter } from "next/navigation";
import { LogOut } from "@/components/icons/ph";
import { Icon } from "@/lib/icons";
import { SUPPORT_MAILTO } from "@/lib/support";
import { useAuth } from "@/components/AuthProvider";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useSettings, useActiveProfile } from "@/components/SettingsProvider";
import { useProfiles } from "@/lib/hooks/useProfiles";
import { useFocus } from "@/components/FocusProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useCommandPalette } from "@/components/CommandPaletteProvider";
import ChangelogModal from "@/components/ChangelogModal";

const AvatarLibrary = dynamic(() => import("@/components/profile/AvatarLibrary"), {
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

type SavedAccount = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  lastUsed: number;
};

const ACCENT_DOT_MAP: Record<string, string> = {
  mint: "bg-emerald-400",
  emerald: "bg-emerald-400",
  green: "bg-emerald-400",
  sky: "bg-sky-400",
  blue: "bg-sky-400",
  cyan: "bg-cyan-400",
  amber: "bg-amber-400",
  orange: "bg-amber-400",
  rose: "bg-rose-400",
  pink: "bg-pink-400",
  red: "bg-red-400",
  dyno: "bg-rose-500",
  violet: "bg-violet-400",
  purple: "bg-violet-400",
};

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
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  const { signOut } = useAuth();
  const { displayName, username, avatarUrl, email, initials, bio, verified } = useUserIdentity();
  const { settings, update } = useSettings();
  const { reload: reloadActiveProfile } = useActiveProfile();
  const { profiles, active, activeProfile, select: selectProfile } = useProfiles();

  const isFocusRunning = focus.state.phase !== "idle";
  const currentStatus = isFocusRunning
    ? "focus"
    : settings.status in USER_STATUS_CONFIG
    ? settings.status
    : "online";

  useEffect(() => {
    if (!email || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("ethone_saved_accounts");
      const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex((a) => a.email.toLowerCase() === email.toLowerCase());
      const current: SavedAccount = {
        id: email,
        email,
        displayName: displayName || email.split("@")[0],
        username: username || email.split("@")[0],
        avatarUrl: avatarUrl || undefined,
        lastUsed: Date.now(),
      };
      if (idx >= 0) {
        list[idx] = current;
      } else {
        list.push(current);
      }
      localStorage.setItem("ethone_saved_accounts", JSON.stringify(list));
      setSavedAccounts(list);
    } catch {}
  }, [email, displayName, username, avatarUrl]);

  const handleSelectProfile = useCallback(
    async (profileId: string) => {
      if (profileId === active) return;
      try {
        await selectProfile(profileId);
        await reloadActiveProfile();
        const target = profiles.find((p) => p.id === profileId);
        toast.success(
          target
            ? `${i18n("tbProfileSwitched", "Profil activé")} : ${target.name}`
            : i18n("selected", "Profil sélectionné")
        );
      } catch (err) {
        toast.error(String(err));
      }
    },
    [active, selectProfile, reloadActiveProfile, profiles, toast, i18n]
  );

  const handleSwitchAccount = useCallback(
    async (targetEmail: string) => {
      if (targetEmail.toLowerCase() === (email || "").toLowerCase()) return;
      setOpen(false);
      await signOut();
      router.push(`/login?email=${encodeURIComponent(targetEmail)}`);
    },
    [email, signOut, router]
  );

  const handleAddAccount = useCallback(async () => {
    setOpen(false);
    await signOut();
    router.push("/login?switch=1");
  }, [signOut, router]);

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

  const VERSION_LABEL = changelog[0]?.version || "v1.75.42";

  const isOwner = Boolean(email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const mod = useModKey();

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
      kbd: mod === "⌘" ? "⌘," : "Ctrl ,",
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

        <PopoverContent className="ethone-menu w-[320px] max-w-[calc(100vw-1.5rem)] max-h-[85vh] overflow-y-auto os-scroll [scrollbar-width:thin] p-0 z-[var(--z-dropdown)]">
          <div data-testid={`${dataTestId}-menu`} data-open={open ? "true" : "false"} className="flex w-full select-none flex-col p-2.5">
            <div className="flex items-center gap-3 px-1.5 pb-2.5 pt-1.5">
              <div className="relative h-12 w-12 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsAvatarPickerOpen(true);
                  }}
                  className="group relative block h-12 w-12 cursor-pointer overflow-hidden rounded-2xl"
                  title={i18n("tbChangeAvatar", "Changer d'avatar")}
                  aria-label={i18n("tbChangeAvatar", "Changer d'avatar")}
                >
                  <span className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)]/15 text-base font-bold text-[var(--accent-primary)]">
                    {avatarUrl ? (
                      <ClientImage src={avatarUrl} alt="" width={48} height={48} className="h-full w-full object-cover" fallback={<span>{initials}</span>} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                    <Icon name="camera" className="h-4 w-4 text-white" />
                  </span>
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">
                  {displayName}
                  {verified && <span className="ml-1 text-[11px] text-[var(--success)]">✓</span>}
                </p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs leading-tight text-[var(--text-muted)]">
                  <span className="truncate">@{username}</span>
                  {isOwner && (
                    <span className="shrink-0 rounded-md bg-[var(--menu-kbd-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
                      {i18n("tbOwner", "Propriétaire")}
                    </span>
                  )}
                </p>
                {activeProfile && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--menu-kbd-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ACCENT_DOT_MAP[activeProfile.accent] || "bg-emerald-400")} />
                      <span className="truncate max-w-[14ch]">{activeProfile.name}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {email && (
              <button
                type="button"
                onClick={copyEmail}
                title={i18n("tbCopyEmail", "Copier l'adresse e-mail")}
                className="mx-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-[var(--menu-tile)] px-3 py-2 text-left text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                <span className="truncate">{email}</span>
                <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5 shrink-0" />
              </button>
            )}

            {bio && <p className="mx-2 mt-2 truncate text-[11px] italic text-[var(--text-muted)]">&ldquo;{bio}&rdquo;</p>}

            {/* Statut : cinq puces colorées, la courante est surlignée */}
            <p className="ethone-menu-label px-2 pb-1.5 pt-3.5">{i18n("tbStatus", "Statut")}</p>
            <div className="flex flex-wrap gap-1.5 px-0.5 pb-1" role="group" aria-label={i18n("tbStatus", "Statut")}>
              {STATUS_KEYS.map((st) => {
                const cfg = USER_STATUS_CONFIG[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    aria-pressed={currentStatus === st}
                    title={i18n(cfg.labelKey)}
                    className="ethone-status-chip"
                    style={{ "--chip-color": `var(--status-${st})` } as React.CSSProperties}
                  >
                    <i aria-hidden />
                    {i18n(cfg.labelKey)}
                  </button>
                );
              })}
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
                <Icon name={item.icon} />
                <span className="truncate">{item.label}</span>
                {item.kbd && <span className="ethone-menu-hint font-mono">{item.kbd}</span>}
                {item.badge && <span className="ethone-menu-hint">{item.badge}</span>}
              </button>
            ))}

            <div className="ethone-menu-sep" />

            <button
              type="button"
              onClick={() => setShowProfileSwitcher((prev) => !prev)}
              className="ethone-menu-item justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="users" />
                <span className="truncate">{i18n("tbSwitchProfile", "Changer de profil")}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="ethone-menu-hint max-w-[12ch] truncate">
                  {activeProfile?.name || "Personnel"}
                </span>
                <Icon
                  name="caret-down"
                  className={cn(
                    "h-3 w-3 text-[var(--text-muted)] transition-transform duration-200",
                    showProfileSwitcher ? "rotate-180" : ""
                  )}
                />
              </div>
            </button>

            {showProfileSwitcher && (
              <div className="mx-1 my-1 flex flex-col gap-1 rounded-xl bg-[var(--menu-tile)] p-2 border border-[var(--panel-border)]/50">
                <div className="flex items-center justify-between px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>{i18n("tbProfiles", "Profils")}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push("/profile-selection");
                    }}
                    className="text-[10px] text-[var(--accent-primary)] hover:underline cursor-pointer"
                  >
                    {i18n("tbManage", "Gérer")}
                  </button>
                </div>

                <div className="flex flex-col gap-0.5">
                  {profiles.map((p) => {
                    const isActive = p.id === active;
                    const dotClass = ACCENT_DOT_MAP[p.accent] || "bg-emerald-400";
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProfile(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer",
                          isActive
                            ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                            : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
                          <span className="truncate">{p.name}</span>
                          {p.workspace && (
                            <span className="shrink-0 text-[10px] text-[var(--text-muted)] capitalize">
                              ({p.workspace})
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {savedAccounts.length > 1 && (
                  <>
                    <div className="my-1 border-t border-[var(--panel-border)]/40" />
                    <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {i18n("tbSavedAccounts", "Comptes enregistrés")}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {savedAccounts.map((acc) => {
                        const isCurrent = acc.email.toLowerCase() === (email || "").toLowerCase();
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => !isCurrent && handleSwitchAccount(acc.email)}
                            disabled={isCurrent}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                              isCurrent
                                ? "opacity-80 cursor-default"
                                : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)] cursor-pointer"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[10px] font-bold text-[var(--accent-primary)] overflow-hidden">
                                {acc.avatarUrl ? (
                                  <ClientImage src={acc.avatarUrl} alt="" width={20} height={20} className="h-full w-full object-cover" />
                                ) : (
                                  <span>{acc.displayName.slice(0, 1).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="truncate leading-tight font-medium">{acc.displayName}</span>
                                <span className="truncate text-[10px] text-[var(--text-muted)] leading-tight">{acc.email}</span>
                              </div>
                            </div>
                            {isCurrent && (
                              <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="mt-1 pt-1 border-t border-[var(--panel-border)]/40 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={handleAddAccount}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" />
                    <span>{i18n("tbAddAccount", "Ajouter un compte")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push("/profile-selection");
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <Icon name="settings" className="h-3.5 w-3.5" />
                    <span>{i18n("tbManageProfiles", "Gérer les profils")}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="ethone-menu-sep" />

            {/* Outils */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCommandOpen(true);
              }}
              className="ethone-menu-item"
            >
              <Icon name="terminal" />
              <span>{i18n("tbPalette", "Palette de commandes")}</span>
              <span className="ethone-menu-hint font-mono">{mod === "⌘" ? "⌘K" : "Ctrl K"}</span>
            </button>

            <a href={SUPPORT_MAILTO} onClick={() => setOpen(false)} className="ethone-menu-item">
              <Icon name="envelope-simple" />
              <span>{i18n("tbContactSupport", "Contacter le support")}</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setIsChangelogOpen(true);
              }}
              className="ethone-menu-item"
            >
              <Icon name="sparkles" />
              <span>{i18n("tbWhatsNew", "Nouveautés")}</span>
              <span className="ethone-menu-hint font-mono">{VERSION_LABEL}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ethone:open-cookie-settings"));
                }
              }}
              className="ethone-menu-item"
            >
              <Icon name="shield-check" />
              <span>{i18n("tbCookieSettings", "Gestion des cookies")}</span>
            </button>

            <div className="ethone-menu-sep" />

            {/* Déconnexion */}
            {!confirmSignOut ? (
              <button type="button" data-testid="profile-logout-button" data-menu-tone="danger" onClick={() => setConfirmSignOut(true)} className="ethone-menu-item">
                <LogOut />
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
                  className="h-8 cursor-pointer rounded-lg bg-[var(--status-busy)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
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

      <AvatarLibrary
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
    </>
  );
}
