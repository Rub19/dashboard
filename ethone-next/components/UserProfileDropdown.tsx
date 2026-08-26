"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ClientImage from "@/components/ClientImage";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { Icon } from "@/lib/icons";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile, useSettings } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
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
import { setNativePresence } from "@/lib/apple";
import { hapticSelectionTick } from "@/lib/haptics";
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
    i18n("guest", "Invité");
  const avatarUrl = publicProfile?.avatar_url;
  const email = user?.email || "";

  const currentStatus =
    settings.status in USER_STATUS_CONFIG ? settings.status : "online";

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
      } catch {
        // clipboard permission fallback
      }
      toast.success(i18n("emailCopied", "✓ Adresse copiée"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [email, toast, i18n]
  );

  const handleStatusChange = useCallback(
    (st: keyof typeof USER_STATUS_CONFIG) => {
      void hapticSelectionTick();
      update({ status: st });
      void setNativePresence(USER_STATUS_CONFIG[st].presence);
    },
    [update]
  );

  const changelog = useMemo<ChangelogEntry[]>(() => {
    return CHANGELOG_BY_LANG[settings.language] || CHANGELOG;
  }, [settings.language]);

  const VERSION_LABEL = "v1.9.74";

  const menuItems = [
    {
      id: "profile",
      label: i18n("profile", "Mon profil"),
      description: i18n("profileDesc", "Gérer vos informations personnelles"),
      icon: "user",
      action: () => router.push("/settings?category=profile"),
    },
    {
      id: "settings",
      label: i18n("settings", "Réglages"),
      description: i18n("settingsDesc", "Préférences globales et personnalisation"),
      kbd: "⌘,",
      icon: "settings",
      action: () => router.push("/settings"),
    },
    {
      id: "security",
      label: i18n("security", "Sécurité"),
      description: i18n("securityDesc", "Authentification, 2FA et sessions"),
      badge: i18n("active", "Actif"),
      badgeClass: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/25",
      icon: "shield-check",
      action: () => router.push("/settings?category=security"),
    },
    {
      id: "billing",
      label: i18n("billing", "Facturation"),
      description: i18n("billingDesc", "Abonnement et historique des paiements"),
      icon: "credit-card",
      action: () => router.push("/settings?tab=billing"),
    },
    {
      id: "shortcuts",
      label: i18n("shortcuts", "Raccourcis"),
      description: i18n("shortcutsDesc", "Palette de commandes rapides"),
      kbd: "⌘K",
      icon: "command",
      action: () => setCommandOpen(true),
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
          if (!next) {
            setConfirmSignOut(false);
          }
        }}
        trigger="click"
        side="bottom"
        align="end"
        sideOffset={10}
        panelRadius={16}
        gooStrength={0}
      >
        {/* Trigger */}
        <PopoverTrigger>
          <button
            type="button"
            data-testid={dataTestId}
            data-tooltip="Profil"
            data-tooltip-position="bottom"
            className="group relative flex h-9 items-center gap-2.5 rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--surface)]/80 pl-1.5 pr-3 text-[var(--text-primary)] transition-all hover:border-[var(--text-primary)]/20 active:scale-95 cursor-pointer select-none"
            aria-label={i18n("profile", "Profil")}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <div className="pointer-events-none relative flex h-7 w-7 shrink-0 items-center justify-center">
              <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[var(--text-primary)]/10 bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--info)] text-[var(--accent-primary)]">
                {avatarUrl ? (
                  <ClientImage
                    src={avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="pointer-events-none h-full w-full object-cover"
                    fallback={<User className="pointer-events-none h-4 w-4" />}
                  />
                ) : (
                  <User className="pointer-events-none h-4 w-4" />
                )}
              </div>
              <span
                className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--background)] ${
                  USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG].dot
                }`}
              />
            </div>
            <div className="pointer-events-none hidden min-w-0 flex-col text-left sm:flex">
              <span className="pointer-events-none max-w-[14ch] truncate text-sm font-bold leading-tight text-[var(--text-primary)] sm:max-w-[18ch] lg:max-w-[24ch]">
                {displayName}
              </span>
            </div>
            <Icon
              name="chevron-down"
              pack="phosphor"
              className={`pointer-events-none h-4 w-4 text-[var(--text-muted)] transition-transform motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>
        </PopoverTrigger>

        {/* Dropdown Content */}
        <PopoverContent className="w-[360px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3.5 shadow-[0_16px_50px_var(--glow-color)] backdrop-blur-2xl">
          <div
            data-testid={`${dataTestId}-menu`}
            data-open={open}
            className="flex w-full flex-col gap-2.5 select-none"
          >
            {/* 1. Header du profil */}
            <div className="flex items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.02] p-2.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--panel-border)] bg-gradient-to-tr from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 text-[var(--text-primary)]">
                  {avatarUrl ? (
                    <ClientImage
                      src={avatarUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      fallback={
                        <span className="text-sm font-bold">
                          {initials(displayName)}
                        </span>
                      }
                    />
                  ) : (
                    <span className="text-sm font-bold">
                      {initials(displayName)}
                    </span>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--panel-bg)] ${
                    USER_STATUS_CONFIG[currentStatus as keyof typeof USER_STATUS_CONFIG].dot
                  }`}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="truncate text-xs font-bold text-[var(--text-primary)] max-w-[150px]">
                    {displayName}
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--success)]">
                    <Icon
                      pack="phosphor"
                      name="shield-check"
                      className="h-3 w-3 shrink-0"
                    />
                    <span>{i18n("verifiedAccount", "Compte vérifié")}</span>
                  </div>
                </div>

                {email && (
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="group/copy flex items-center gap-1.5 rounded-md text-left text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] min-h-[24px]"
                    title={i18n("copyEmail", "Copier l'adresse email")}
                    aria-label={i18n("copyEmail", "Copier l'adresse email")}
                  >
                    <span className="truncate font-mono text-[11px] max-w-[200px]">
                      {email}
                    </span>
                    <Icon
                      pack="phosphor"
                      name={copied ? "check" : "copy"}
                      className={`h-3 w-3 shrink-0 transition-colors ${
                        copied
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-muted)] group-hover/copy:text-[var(--text-primary)]"
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Statuts de présence (5 options) */}
            <div
              role="radiogroup"
              aria-label={i18n("presenceStatus", "Statut de présence")}
              className="grid grid-cols-5 gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.02] p-1 text-[10px]"
            >
              {STATUS_KEYS.map((st) => {
                const cfg = USER_STATUS_CONFIG[st];
                const isSelected = currentStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(st);
                    }}
                    aria-label={i18n(cfg.labelKey)}
                    title={i18n(cfg.labelKey)}
                    className={`group/st relative flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 min-h-[44px] sm:min-h-[36px] transition-all motion-reduce:transition-none ${
                      isSelected
                        ? "bg-[var(--text-primary)]/[0.08] font-bold text-[var(--text-primary)] shadow-xs ring-1 ring-[var(--panel-border)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${cfg.dot} ring-2 ring-[var(--panel-bg)] transition-transform motion-reduce:transform-none ${
                        isSelected
                          ? "scale-110"
                          : "opacity-80 group-hover/st:opacity-100"
                      }`}
                    />
                    <span className="truncate text-[10px] leading-tight">
                      {i18n(cfg.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. Stockage */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.02] p-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                    <Icon name="hard-drive" pack="phosphor" className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-[11px]">
                    {i18n("storage", "Stockage")}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">
                  {storage.used.toFixed(1)} GB / {storage.total} GB
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--text-primary)]/[0.08]">
                <div
                  className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300 motion-reduce:transition-none"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  router.push("/settings?category=workspace");
                }}
                className="group/store mt-0.5 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.04] hover:text-[var(--text-primary)] min-h-[36px] sm:min-h-[30px]"
              >
                <span>{i18n("manageStorage", "Gérer le stockage")}</span>
                <Icon
                  pack="phosphor"
                  name="caret-right"
                  className="h-3 w-3 opacity-60 transition-transform group-hover/store:translate-x-0.5 motion-reduce:transform-none"
                />
              </button>
            </div>

            {/* 4. Nouveautés / Changelog */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                setIsChangelogOpen(true);
              }}
              className="group flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--accent-primary)]/25 bg-gradient-to-r from-[var(--accent-primary)]/[0.08] to-transparent p-2.5 text-left transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--accent-primary)]/[0.12] min-h-[44px]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                  <Icon name="sparkles" pack="phosphor" className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {i18n("releaseNotes", "Notes de version")}
                    </span>
                    <span className="inline-flex items-center rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--accent-primary)]">
                      {VERSION_LABEL} • {i18n("newBadge", "NOUVEAU")}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {i18n(
                      "releaseNotesDesc",
                      "Découvrez les dernières améliorations d'ETHONE"
                    )}
                  </p>
                </div>
              </div>
              <Icon
                pack="phosphor"
                name="caret-right"
                className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] opacity-60 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </button>

            {/* 5. Section Compte & Raccourcis */}
            <div className="flex flex-col gap-0.5">
              {menuItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.action();
                    }}
                    className="group flex w-full items-center justify-between gap-2.5 rounded-xl border border-transparent p-2 text-left text-xs transition-all hover:border-[var(--panel-border)] hover:bg-[var(--text-primary)]/[0.04] min-h-[44px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--text-primary)]/[0.06] group-hover:text-[var(--text-primary)]">
                        <Icon pack="phosphor" name={item.icon} className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold ${item.badgeClass}`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.kbd && (
                        <kbd className="rounded-md border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                          {item.kbd}
                        </kbd>
                      )}

                      <Icon
                        pack="phosphor"
                        name="caret-right"
                        className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-40 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 motion-reduce:transform-none"
                      />
                    </div>
                  </button>
              ))}
            </div>

            {/* 6. Déconnexion avec confirmation propre */}
            <div className="border-t border-[var(--panel-border)] pt-2">
              {!confirmSignOut ? (
                <button
                  type="button"
                  data-testid="profile-logout-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmSignOut(true);
                  }}
                  className="group flex w-full items-center justify-between rounded-xl border border-transparent p-2 text-xs text-[var(--danger)] transition-all hover:border-[var(--danger)]/20 hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)] transition-colors group-hover:bg-[var(--danger)]/20 group-hover:text-[var(--danger)]">
                      <Icon name="log-out" pack="phosphor" className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">
                        {i18n("signOut", "Se déconnecter")}
                      </span>
                      <span className="text-[10px] text-[var(--danger)]/70">
                        {i18n("quitSession", "Fermer la session active")}
                      </span>
                    </div>
                  </div>
                  <Icon
                    pack="phosphor"
                    name="caret-right"
                    className="h-3.5 w-3.5 opacity-40 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </button>
              ) : (
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 transition-all motion-reduce:transition-none">
                  <div className="flex items-center gap-2 text-[var(--danger)]">
                    <Icon name="alert-triangle" pack="phosphor" className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">
                      {i18n(
                        "confirmSignOutTitle",
                        "Se déconnecter d'ETHONE ?"
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                    {i18n(
                      "confirmSignOutDesc",
                      "Vous devrez vous reconnecter pour accéder à votre espace."
                    )}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmSignOut(false);
                      }}
                      className="flex-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06] transition-colors min-h-[40px]"
                    >
                      {i18n("cancel", "Annuler")}
                    </button>
                    <button
                      type="button"
                      data-testid="profile-logout-confirm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSignOut();
                      }}
                      className="flex-1 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)] px-3 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:bg-[var(--danger)]/90 transition-colors shadow-sm min-h-[40px]"
                    >
                      {i18n("signOut", "Se déconnecter")}
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
