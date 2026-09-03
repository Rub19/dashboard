"use client";

import { useState } from "react";
import {
  Camera,
  Copy,
  Check,
  Sparkles,
  Layout,
  Palette,
  ShieldCheck,
  Edit3,
  Flame,
  Gamepad2,
  Code2,
  Compass,
} from "lucide-react";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { useIdentity, PROFILE_FRAMES } from "@/lib/identity";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import { cn } from "@/lib/utils";
import type { PresenceStatus, CustomStatus } from "@/lib/personalization/personalization-store";

interface ProfileHero2026Props {
  presenceStatus: PresenceStatus;
  customStatus?: CustomStatus;
  activeWorkspace: string;
  onOpenAvatarPicker: () => void;
  onOpenStatusPicker: () => void;
  onSwitchWorkspace: (workspace: string) => void;
}

const PRESENCE_CONFIG: Record<PresenceStatus, { label: string; dot: string; glow: string }> = {
  online: { label: "En ligne", dot: "bg-emerald-500", glow: "shadow-emerald-500/50" },
  focus: { label: "Deep Work (Focus)", dot: "bg-purple-500 animate-pulse", glow: "shadow-purple-500/50" },
  gaming: { label: "En jeu (Gaming)", dot: "bg-rose-500", glow: "shadow-rose-500/50" },
  busy: { label: "Occupé", dot: "bg-amber-500", glow: "shadow-amber-500/50" },
  dnd: { label: "Ne pas déranger", dot: "bg-red-500", glow: "shadow-red-500/50" },
  away: { label: "Absent", dot: "bg-zinc-400", glow: "shadow-zinc-400/50" },
  offline: { label: "Hors ligne", dot: "bg-zinc-600", glow: "shadow-zinc-600/50" },
};

export default function ProfileHero2026({
  presenceStatus,
  customStatus,
  activeWorkspace,
  onOpenAvatarPicker,
  onOpenStatusPicker,
  onSwitchWorkspace,
}: ProfileHero2026Props) {
  const { success } = useToast();
  const identity = useUserIdentity();
  const { identity: fullIdentity } = useIdentity();
  const { settings } = useSettings();

  const [copied, setCopied] = useState(false);

  const displayName = identity?.displayName || "Compte";
  const username = fullIdentity?.username || (identity?.email ? identity.email.split("@")[0] : "utilisateur");
  const avatarUrl = identity?.avatarUrl;
  const initials = identity?.initials || displayName.slice(0, 2).toUpperCase();
  const bio = fullIdentity?.bio || "";
  const frameId = fullIdentity?.avatar_frame_id;
  const activeFrame = PROFILE_FRAMES.find((f) => f.id === frameId);

  const statusInfo = PRESENCE_CONFIG[presenceStatus] || PRESENCE_CONFIG.online;

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    success("Nom d'utilisateur copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--panel-border)]/80 bg-gradient-to-b from-[var(--surface-raised)]/90 via-[var(--panel-bg)]/80 to-[var(--surface-raised)]/60 p-5 sm:p-7 shadow-lg backdrop-blur-xl">
      {/* Dynamic Background Aura */}
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--accent-primary)]/15 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -top-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Avatar with Frame + Presence + Details */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            <div
              onClick={onOpenAvatarPicker}
              className={cn(
                "group relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-3xl border-2 bg-[var(--surface-raised)] shadow-md cursor-pointer transition-transform hover:scale-105",
                activeFrame?.cssClass || "border-[var(--panel-border)]"
              )}
              title="Changer d'avatar"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)] text-3xl font-black text-white">
                  {initials}
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
                <span className="text-[10px] font-semibold text-white mt-1">Changer</span>
              </div>
            </div>

            {/* Status Dot */}
            <button
              type="button"
              onClick={onOpenStatusPicker}
              title={`Statut : ${statusInfo.label} (Cliquer pour modifier)`}
              className={cn(
                "absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full border-2 border-[#121212] shadow-md cursor-pointer transition-transform hover:scale-110",
                statusInfo.dot
              )}
            />
          </div>

          {/* User Names & Bio */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {displayName}
              </h2>

              <button
                type="button"
                onClick={handleCopyUsername}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2 py-0.5 text-xs font-mono text-[var(--accent-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                title="Copier le @username"
              >
                <span>@{username}</span>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </button>

              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                <ShieldCheck className="h-3 w-3" />
                <span>Identité Vérifiée</span>
              </span>
            </div>

            {/* Custom Status Display */}
            {customStatus && customStatus.text && (
              <div
                onClick={onOpenStatusPicker}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-950/20 px-2.5 py-1 text-xs font-medium text-purple-200 hover:bg-purple-950/40 transition-colors cursor-pointer"
              >
                <span>{customStatus.emoji}</span>
                <span>{customStatus.text}</span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg leading-relaxed line-clamp-2">
              {bio}
            </p>
          </div>
        </div>

        {/* Right: Active Workspace & Theme Indicators */}
        <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--panel-border)]/40">
          {/* Active Workspace Selector */}
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 p-2.5 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
              <Layout className="h-3 w-3 text-[var(--accent-primary)]" />
              <span>Espace Actif</span>
            </span>

            <div className="flex items-center gap-1">
              {[
                { id: "personal", label: "Personnel", icon: Compass },
                { id: "studio", label: "Studio", icon: Code2 },
                { id: "gaming", label: "Gaming", icon: Gamepad2 },
              ].map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onSwitchWorkspace(ws.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                    activeWorkspace === ws.id
                      ? "bg-[var(--accent-primary)] text-white font-bold shadow-xs"
                      : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-hover)]"
                  )}
                >
                  <ws.icon className="h-3 w-3" />
                  <span>{ws.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Theme & Mode Badge */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/50 px-3 py-2 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span className="capitalize">{settings.theme}</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
