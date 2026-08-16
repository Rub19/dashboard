"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useTeam } from "@/lib/hooks/useTeam";
import { useUserData } from "@/lib/hooks/useUserData";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useFocus } from "@/components/FocusProvider";
import type { UserDataRecord } from "@/lib/hooks/useUserData";

const LANGUAGES = ["fr", "en", "es", "de"];

const WORKSPACES = [
  { id: "personal", icon: "user", color: "emerald", ring: "ring-emerald-500/30" },
  { id: "focus", icon: "target", color: "sky", ring: "ring-sky-500/30" },
  { id: "studio", icon: "sparkles", color: "rose", ring: "ring-rose-500/30" },
  { id: "gaming", icon: "gamepad-2", color: "amber", ring: "ring-amber-500/30" },
] as const;

const ALLOWED_PROFILE_WORKSPACES = new Set(["personal", "focus", "studio"]);

const WORKSPACE_FLOWS: Record<string, string> = {
  personal: "v8FlowPersonal",
  focus: "v8FlowFocus",
  studio: "v8FlowStudio",
};

const ACCENT_BG: Record<string, string> = {
  violet: "bg-violet-500",
  mint: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const ACCENT_TEXT: Record<string, string> = {
  violet: "text-violet-400",
  mint: "text-emerald-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
};

function initials(name?: string) {
  if (!name) return "E";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLabel(i18n: (key: string) => string, label?: string) {
  if (!label) return i18n("personal");
  return i18n(label) || label;
}

function getSpaceWorkspaceId(item: UserDataRecord) {
  const data = (item.data || {}) as Record<string, unknown>;
  return typeof data.workspaceId === "string" ? data.workspaceId : undefined;
}

function Avatar({
  url,
  name,
  accent,
  size = "md",
  active,
}: {
  url?: string;
  name?: string;
  accent?: string;
  size?: "sm" | "md";
  active?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = url && !imgError;
  const className =
    size === "sm"
      ? "h-7 w-7 rounded-full text-[10px]"
      : "h-10 w-10 rounded-full text-sm";
  const wh = size === "sm" ? 28 : 40;
  const color = active || !accent ? "bg-[var(--accent)]" : (ACCENT_BG[accent] || "bg-[var(--accent)]");

  if (showImage) {
    return (
      <Image
        src={url}
        alt=""
        width={wh}
        height={wh}
        unoptimized
        onError={() => setImgError(true)}
        className={`${className} object-cover border border-[var(--border)]`}
      />
    );
  }

  return (
    <span
      className={`${className} ${color} flex items-center justify-center text-white font-medium`}
    >
      {initials(name)}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      {children}
    </p>
  );
}

function QuickAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-raised)] ${
        active ? "border-[var(--accent)] text-[var(--accent)]" : ""
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}

function ActionButton({
  icon,
  label,
  danger,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`flex flex-col items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface)] p-2 text-[10px] font-medium transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50 ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-[var(--foreground)]"
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
      <span className="w-full truncate">{label}</span>
    </button>
  );
}

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { user, signOut } = useAuth();
  const { profile: publicProfile, save: savePublicProfile } = useProfile();
  const { profiles, active, activeProfile, loaded, select, update, remove, duplicate } = useProfiles();
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { settings, update: updateSettings } = useSettings();
  const focus = useFocus();
  const { members } = useTeam();
  const { items: userSpaces } = useUserData("space");
  const [activeSpace, setActiveSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  const [pending, setPending] = useState(false);

  const email = user?.email || i18n("guest");
  const displayName = publicProfile?.display_name || activeProfile?.name || user?.email || i18n("guest");
  const avatarUrl = publicProfile?.avatar_url;

  const currentWorkspaceId = activeProfile?.workspace || activeSpace;
  const currentFlow = WORKSPACE_FLOWS[currentWorkspaceId] || currentWorkspaceId;
  const workspaceLabel = formatLabel(i18n, currentWorkspaceId);
  const spaceLabel = formatLabel(i18n, activeSpace);

  useEffect(() => {
    if (loaded && activeProfile?.workspace) {
      setActiveSpace(activeProfile.workspace);
    }
  }, [loaded, activeProfile?.workspace, setActiveSpace]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const visibleMembers = useMemo(() => members.slice(0, 4), [members]);
  const extraMembers = Math.max(0, members.length - visibleMembers.length);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push("/login");
  }

  async function handleSelectProfile(p: Profile) {
    if (p.id === active) {
      setOpen(false);
      return;
    }
    try {
      setPending(true);
      await select(p.id);
      setActiveSpace(p.workspace);
      success(i18n("switched"));
    } catch {
      showError(i18n("error"));
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  function handleWorkspace(id: string) {
    setActiveSpace(id);
    if (active && ALLOWED_PROFILE_WORKSPACES.has(id)) {
      update(active, { workspace: id as Profile["workspace"] }).catch(() => {});
    }
  }

  function handleSpace(item: UserDataRecord) {
    const spaceId = item.slug || item.id;
    const workspaceId = getSpaceWorkspaceId(item);
    setActiveSpace(spaceId);
    if (active && workspaceId && ALLOWED_PROFILE_WORKSPACES.has(workspaceId)) {
      update(active, { workspace: workspaceId as Profile["workspace"] }).catch(() => {});
    }
  }

  function handleRename() {
    if (!activeProfile) return;
    const next = window.prompt(i18n("renameProfile"), activeProfile.name);
    if (next && next.trim() && next.trim() !== activeProfile.name) {
      update(active, { name: next.trim() })
        .then(() => success(i18n("updated")))
        .catch(() => showError(i18n("error")));
    }
  }

  function handleEditAvatar() {
    const next = window.prompt(i18n("editAvatar"), avatarUrl || "");
    if (next == null) return;
    savePublicProfile({ avatar_url: next.trim() })
      .then(() => success(i18n("updated")))
      .catch(() => showError(i18n("error")));
  }

  function handleExport() {
    if (!activeProfile) return;
    const payload = {
      ...activeProfile,
      publicProfile: publicProfile
        ? {
            display_name: publicProfile.display_name,
            username: publicProfile.username,
            avatar_url: publicProfile.avatar_url,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ethone-${activeProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profile"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success(i18n("exportProfile"));
  }

  async function handleDuplicate() {
    if (!activeProfile) return;
    try {
      setPending(true);
      await duplicate(active);
      success(i18n("duplicate"));
    } catch {
      showError(i18n("error"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!activeProfile) return;
    if (profiles.length <= 1) {
      showError(i18n("error"));
      return;
    }
    if (!window.confirm(`${i18n("deleteProfile")} ?`)) return;
    try {
      setPending(true);
      await remove(active);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  function handleFocus() {
    if (focus.state.phase !== "idle") {
      focus.stop();
      success(i18n("stopped"));
    } else {
      focus.start(settings.focusPreset || "pomodoro");
      router.push("/focus/");
      success(i18n("started"));
    }
    setOpen(false);
  }

  function handleBrain() {
    setOpen(false);
    router.push("/brain/");
  }

  function handleLanguage() {
    const idx = LANGUAGES.indexOf(settings.language || "fr");
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    updateSettings({ language: next });
    success(`${i18n("language")}: ${next}`);
  }

  function handleToggleFab() {
    updateSettings({ dockVisible: !settings.dockVisible });
    success(`${i18n("dock")}: ${!settings.dockVisible ? i18n("on") : i18n("off")}`);
  }

  const focusActive = focus.state.phase !== "idle";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)]"
        aria-label={i18n("profile")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar url={avatarUrl} name={displayName} accent={activeProfile?.accent} size="sm" active />
        <span className="hidden whitespace-nowrap text-sm font-medium 2xl:inline">
          {displayName}
        </span>
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
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" as const }}
            style={{ originX: 1, originY: 0 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl"
          >
            <div className="max-h-[80vh] overflow-y-auto p-0">
              {/* Breadcrumb context */}
              <div className="border-b border-[var(--border)] p-3">
                <nav
                  aria-label={i18n("v8BreadcrumbAria")}
                  className="mb-2 flex flex-wrap items-center gap-1 text-[10px] text-[var(--muted)]"
                >
                  <span className="font-semibold text-[var(--foreground)]">ETHONE</span>
                  <Icon name="chevron-right" className="h-3 w-3" />
                  <span>{i18n("workspace")}</span>
                  <Icon name="chevron-right" className="h-3 w-3" />
                  <span className="max-w-[6rem] truncate">{workspaceLabel}</span>
                  <Icon name="chevron-right" className="h-3 w-3" />
                  <span className="max-w-[6rem] truncate">{spaceLabel}</span>
                </nav>

                <div className="flex items-center gap-3">
                  <Avatar url={avatarUrl} name={displayName} accent={activeProfile?.accent} size="md" active />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{email}</p>
                  </div>
                  {activeProfile && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        ACCENT_TEXT[activeProfile.accent] || "text-[var(--accent)]"
                      }`}
                    >
                      {i18n("active")}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5">
                    {i18n("v8Workspace")}: {workspaceLabel}
                  </span>
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5">
                    {i18n("v8DataSpace")}: {spaceLabel}
                  </span>
                  <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5">
                    {i18n("v8Mode")}: {i18n(currentFlow) || currentFlow}
                  </span>
                </div>
              </div>

              {/* Quick actions topbar */}
              <div className="border-b border-[var(--border)] p-3">
                <SectionTitle>{i18n("v8QuickActions")}</SectionTitle>
                <div className="flex items-center justify-between gap-2">
                  <QuickAction
                    icon={focusActive ? "pause" : "timer"}
                    label={i18n("focusMode")}
                    active={focusActive}
                    onClick={handleFocus}
                  />
                  <QuickAction icon="brain" label={i18n("brain")} onClick={handleBrain} />
                  <QuickAction icon="globe" label={i18n("language")} onClick={handleLanguage} />
                  <QuickAction
                    icon="dock"
                    label={i18n("toggleFab")}
                    active={settings.dockVisible}
                    onClick={handleToggleFab}
                  />
                </div>
              </div>

              {/* Workspace switch */}
              <div className="border-b border-[var(--border)] p-3">
                <SectionTitle>{i18n("switchWorkspace")}</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {WORKSPACES.map((w) => {
                    const isActive = activeSpace === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleWorkspace(w.id)}
                        className={`flex items-center gap-2 rounded-[var(--panel-radius)] border px-2 py-1.5 text-left text-xs transition-colors ${
                          isActive
                            ? `border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ${w.ring}`
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
                        }`}
                      >
                        <Icon name={w.icon} className="h-4 w-4" />
                        <span className="font-medium">{i18n(w.id)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Space switch */}
              {userSpaces.length > 0 && (
                <div className="border-b border-[var(--border)] p-3">
                  <SectionTitle>{i18n("mySpaces")}</SectionTitle>
                  <div className="flex flex-wrap gap-1.5">
                    {userSpaces.slice(0, 8).map((s) => {
                      const isActive = activeSpace === (s.slug || s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSpace(s)}
                          className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                            isActive
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Multi-profile selection */}
              <div className="border-b border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <SectionTitle>{i18n("manageProfiles")}</SectionTitle>
                  {loaded && (
                    <span className="text-[10px] text-[var(--muted)]">
                      {profiles.length}
                    </span>
                  )}
                </div>
                {!loaded ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <Icon name="loader" className="h-4 w-4 animate-spin" />
                    {i18n("loading")}
                  </div>
                ) : profiles.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{i18n("noSpaces")}</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {profiles.map((p) => {
                      const isActive = p.id === active;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={pending}
                          onClick={() => handleSelectProfile(p)}
                          className={`flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-2 py-1.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-[var(--surface-raised)] ring-1 ring-[var(--accent)]"
                              : "hover:bg-[var(--surface)]"
                          }`}
                        >
                          <Avatar
                            url={isActive ? avatarUrl : undefined}
                            name={p.name}
                            accent={p.accent}
                            size="sm"
                            active={isActive}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="truncate text-[10px] text-[var(--muted)]">
                              {i18n(p.workspace)} · {i18n(p.type)}
                            </p>
                          </div>
                          {isActive && (
                            <Icon name="circle-check" className="h-4 w-4 text-[var(--accent)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Profile actions */}
              {activeProfile && (
                <div className="border-b border-[var(--border)] p-3">
                  <SectionTitle>{i18n("profileActions")}</SectionTitle>
                  <div className="grid grid-cols-4 gap-1.5">
                    <ActionButton
                      icon="file-edit"
                      label={i18n("rename")}
                      onClick={handleRename}
                      disabled={pending}
                    />
                    <ActionButton
                      icon="palette"
                      label={i18n("editAvatar")}
                      onClick={handleEditAvatar}
                      disabled={pending}
                    />
                    <ActionButton
                      icon="arrow-down"
                      label={i18n("exportProfile")}
                      onClick={handleExport}
                      disabled={pending}
                    />
                    <ActionButton
                      icon="copy"
                      label={i18n("duplicate")}
                      onClick={handleDuplicate}
                      disabled={pending}
                    />
                    <ActionButton
                      icon="trash-2"
                      label={i18n("deleteProfile")}
                      danger
                      onClick={handleDelete}
                      disabled={pending || profiles.length <= 1}
                    />
                  </div>
                </div>
              )}

              {/* Team quick access */}
              <div className="border-b border-[var(--border)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <SectionTitle>{i18n("teamTitle")}</SectionTitle>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push("/team/");
                    }}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    {i18n("openHere")}
                  </button>
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-[var(--muted)]">{i18n("noTeam")}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {visibleMembers.map((m) => (
                        <div
                          key={m.id}
                          title={m.display_name || m.email}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-raised)] bg-[var(--accent)] text-[10px] font-medium text-white"
                        >
                          {initials(m.display_name || m.email)}
                        </div>
                      ))}
                      {extraMembers > 0 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface-raised)] bg-[var(--surface)] text-[10px] font-medium text-[var(--muted)]">
                          +{extraMembers}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      {members.length} {i18n("members")}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer nav */}
              <nav className="p-2">
                <button
                  type="button"
                onClick={() => {
                    setOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                >
                  <Icon name="user" className="h-4 w-4 text-[var(--muted)]" />
                  {i18n("myProfile")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
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
                  className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                >
                  <Icon name="sparkles" className="h-4 w-4 text-[var(--muted)]" />
                  {i18n("changelog")}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  {i18n("signOut")}
                </button>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
