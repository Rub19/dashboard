"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingPortal } from "@floating-ui/react";
import {
  ChevronDown,
  User,
  Target,
  Sparkles,
  Gamepad2,
  Pencil,
  Smile,
  Download,
  Copy,
  Trash2,
  Sliders,
  LogOut,
  Check,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { useProfiles, type Profile } from "@/lib/hooks/useProfiles";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useTeam } from "@/lib/hooks/useTeam";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useTopbarDropdown } from "@/lib/hooks/useTopbarDropdown";

const WORKSPACES = [
  { id: "personal", icon: User, color: "text-emerald-400" },
  { id: "focus", icon: Target, color: "text-sky-400" },
  { id: "studio", icon: Sparkles, color: "text-rose-400" },
  { id: "gaming", icon: Gamepad2, color: "text-amber-400" },
] as const;

const ALLOWED_PROFILE_WORKSPACES = new Set(["personal", "focus", "studio"]);

function initials(name?: string) {
  if (!name) return "E";
  return name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({
  url,
  name,
  size = "md",
}: {
  url?: string;
  name?: string;
  size?: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = url && !imgError;
  const className = size === "sm" ? "h-7 w-7 rounded-xl text-[10px]" : "h-10 w-10 rounded-xl text-sm";
  const wh = size === "sm" ? 28 : 40;

  if (showImage) {
    return (
      <Image
        src={url}
        alt=""
        width={wh}
        height={wh}
        unoptimized
        onError={() => setImgError(true)}
        className={`${className} object-cover border border-white/[0.08]`}
      />
    );
  }

  return (
    <span
      className={`${className} flex items-center justify-center font-bold text-zinc-950`}
      style={{ background: "var(--accent-color, #10b981)" }}
    >
      {initials(name)}
    </span>
  );
}

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTrigger, setPanel, floatingStyles } = useTopbarDropdown({
    open,
    onClose: () => setOpen(false),
  });

  const { user, signOut } = useAuth();
  const { profile: publicProfile, save: savePublicProfile } = useProfile();
  const { profiles, active, activeProfile, loaded, select, update, remove, duplicate } = useProfiles();
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { members } = useTeam();
  const [activeSpace, setActiveSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  const [pending, setPending] = useState(false);

  const email = user?.email || i18n("guest");
  const displayName = publicProfile?.display_name || activeProfile?.name || user?.email || i18n("guest");
  const avatarUrl = publicProfile?.avatar_url;

  useEffect(() => {
    if (loaded && activeProfile?.workspace) {
      setActiveSpace(activeProfile.workspace);
    }
  }, [loaded, activeProfile?.workspace, setActiveSpace]);



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

  return (
    <div className="relative">
      <button
        type="button"
        ref={setTrigger as unknown as React.Ref<HTMLButtonElement>}
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 text-zinc-200 transition-colors hover:bg-white/[0.05]"
        aria-label={i18n("profile")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar url={avatarUrl} name={displayName} size="sm" />
        <span className="hidden whitespace-nowrap text-sm font-medium 2xl:inline">{displayName}</span>
        <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={setPanel as unknown as React.Ref<HTMLDivElement>}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" as const }}
              style={{ ...floatingStyles, originX: 1, originY: 0 }}
              className="z-[100] w-80 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
            >
            {/* User Card Header */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar url={avatarUrl} name={displayName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white leading-tight">{displayName}</p>
                  <p className="truncate text-[11px] text-zinc-400 max-w-[160px]">{email}</p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {i18n("active") || "Actif"}
              </span>
            </div>

            {/* Workspace Switcher */}
            <div className="space-y-1.5 pt-2">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{i18n("workspace")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {WORKSPACES.map((w) => {
                  const isActive = activeSpace === w.id;
                  const Icon = w.icon;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => handleWorkspace(w.id)}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-all ${
                        isActive
                          ? "border-white/20 bg-white/[0.08] text-white shadow-sm"
                          : "border-white/[0.04] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: isActive ? "var(--accent-color)" : undefined }}
                      />
                      <span className="truncate">{i18n(w.id) || w.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Profile Actions */}
            {activeProfile && (
              <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-white/[0.05] bg-white/[0.02] p-1 pt-3">
                <button
                  type="button"
                onClick={handleRename}
                disabled={pending}
                  className="group flex flex-col items-center justify-center rounded-lg py-2 px-1 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">{i18n("rename")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleEditAvatar}
                  disabled={pending}
                  className="group flex flex-col items-center justify-center rounded-lg py-2 px-1 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Smile className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">{i18n("editAvatar")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={pending}
                  className="group flex flex-col items-center justify-center rounded-lg py-2 px-1 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Download className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">{i18n("exportProfile")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDuplicate}
                  disabled={pending}
                  className="group flex flex-col items-center justify-center rounded-lg py-2 px-1 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Copy className="h-4 w-4" />
                  <span className="mt-1 text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200">{i18n("duplicate")}</span>
                </button>
              </div>
            )}

            {/* Profile Switcher */}
            <div className="space-y-1.5 border-t border-white/[0.06] pt-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{i18n("manageProfiles")}</p>
                {loaded && <span className="text-[10px] text-zinc-500">{profiles.length}</span>}
              </div>
              {!loaded ? (
                <p className="text-xs text-zinc-500">{i18n("loading")}</p>
              ) : profiles.length === 0 ? (
                <p className="text-xs text-zinc-500">{i18n("noSpaces")}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {profiles.map((p) => {
                    const isActive = p.id === active;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={pending}
                        onClick={() => handleSelectProfile(p)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                          isActive ? "bg-white/[0.08] text-white" : "hover:bg-white/[0.04] text-zinc-300"
                        }`}
                      >
                        <Avatar url={isActive ? avatarUrl : undefined} name={p.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">{i18n(p.workspace)}</p>
                        </div>
                        {isActive && <Check className="h-4 w-4 text-[var(--accent-color)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Team quick access */}
            <div className="border-t border-white/[0.06] pt-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{i18n("teamTitle")}</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/team/");
                  }}
                  className="text-[10px] text-[var(--accent-color)] hover:underline"
                >
                  {i18n("openHere")}
                </button>
              </div>
              {members.length === 0 ? (
                <p className="px-1 pt-1 text-xs text-zinc-500">{i18n("noTeam")}</p>
              ) : (
                <div className="mt-1.5 flex items-center gap-2 px-1">
                  <div className="flex -space-x-2">
                    {visibleMembers.map((m) => (
                      <div
                        key={m.id}
                        title={m.display_name || m.email}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 text-[10px] font-medium text-white"
                        style={{ background: "var(--accent-color, #10b981)" }}
                      >
                        {initials(m.display_name || m.email)}
                      </div>
                    ))}
                    {extraMembers > 0 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-950 bg-zinc-900 text-[10px] font-medium text-zinc-400">
                        +{extraMembers}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {members.length} {i18n("members")}
                  </span>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex flex-col gap-0.5 border-t border-white/[0.06] pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/profile");
                }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.04]"
              >
                <User className="h-4 w-4 text-zinc-400" />
                {i18n("myProfile")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/settings");
                }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.04]"
              >
                <Sliders className="h-4 w-4 text-zinc-400" />
                {i18n("settings")}
                <span className="ml-auto text-[10px] text-zinc-600">⌘,</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/changelog");
                }}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.04]"
              >
                <Sparkles className="h-4 w-4 text-purple-400" />
                {i18n("changelog")}
                <span className="ml-auto text-[10px] text-zinc-500">v1.0</span>
              </button>
              {activeProfile && profiles.length > 1 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  {i18n("deleteProfile")}
                </button>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-1 flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                {i18n("signOut")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </FloatingPortal>
    </div>
  );
}
