"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Key, Camera, Eye, EyeOff } from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useProfiles } from "@/lib/hooks/useProfiles";
import { useAuth } from "@/components/AuthProvider";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";

function maskId(id: string) {
  if (!id) return "";
  if (id.length <= 8) return "•".repeat(id.length);
  return id.slice(0, 2) + "•".repeat(id.length - 4) + id.slice(-2);
}

export default function UserProfileCard({
  onEditProfile,
  onChangePassword,
}: {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { profile } = useProfile();
  const { active, activeProfile } = useProfiles();
  const { user } = useAuth();

  const displayName = profile?.display_name || profile?.username || i18n("guest") || "Utilisateur";
  const email = user?.email || "";
  const rawPublicId = profile?.public_id || active || user?.id || "local";
  const avatarUrl = profile?.avatar_url;
  const [masked, setMasked] = useState(true);

  const statusConfig = USER_STATUS_CONFIG[settings.status] || USER_STATUS_CONFIG.online;

  const handleChangePassword = useCallback(() => {
    if (onChangePassword) {
      onChangePassword();
      return;
    }
    const el = document.querySelector('[data-setting-key="accountPassword"]') as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [onChangePassword]);

  return (
    <div className="relative overflow-hidden rounded-t-2xl border-b border-[var(--border-5)] bg-white/[0.02]">
      {/* Banner */}
      <div
        className="h-20 w-full bg-gradient-to-r from-[var(--accent)]/30 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-end gap-4 px-5 pb-4 -mt-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/[0.08] bg-[var(--panel-bg)] shadow-lg">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-7 w-7 text-[var(--muted)]" />
            )}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-[var(--panel-bg)] bg-emerald-400"
            title={i18n("statusVerified") || "Vérifiée"}
          />
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <h3 className="truncate text-base font-bold text-[var(--foreground)]">{displayName}</h3>
          {email && (
            <p className="truncate text-xs text-[var(--muted)]">{email}</p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--muted)]">
              {masked ? maskId(rawPublicId) : rawPublicId}
            </span>
            <button
              type="button"
              onClick={() => setMasked((v) => !v)}
              className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--foreground)]"
              aria-label={masked ? "Afficher l'identifiant" : "Masquer l'identifiant"}
              title={masked ? "Afficher" : "Masquer"}
            >
              {masked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5">
        {/* Session badge */}
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-300">{i18n("sessionVerified") || "Session vérifiée"}</span>
        </div>

        {/* Badges */}
        {activeProfile && (
          <div className="flex flex-wrap gap-1.5">
            {activeProfile.name && (
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                {activeProfile.name}
              </span>
            )}
            {activeProfile.workspace && (
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]">
                {i18n(activeProfile.workspace) || activeProfile.workspace}
              </span>
            )}
            {activeProfile.name && (
              <span
                className={cn("rounded-lg px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]", statusConfig.bg)}
              >
                {i18n(statusConfig.labelKey) || settings.status}
              </span>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/profile"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.08]"
          >
            <Camera className="h-3.5 w-3.5" />
            {i18n("editProfile") || "Éditer profil"}
          </Link>
          <Link
            href="/connections?link=discord"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.06]"
          >
            <Icon name="discord" className="h-3.5 w-3.5" />
            {i18n("linkDiscord") || "Lier Discord"}
          </Link>
          <button
            type="button"
            onClick={handleChangePassword}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-white/[0.06]"
          >
            <Key className="h-3.5 w-3.5" />
            {i18n("changePassword") || "Changer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}
