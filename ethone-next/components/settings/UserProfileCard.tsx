"use client";

import { User, Mail, Shield, Key, Camera } from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useProfiles } from "@/lib/hooks/useProfiles";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import Image from "next/image";

export default function UserProfileCard({
  onEditProfile,
  onChangePassword,
}: {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}) {
  const i18n = useI18n();
  const { profile } = useProfile();
  const { active, activeProfile } = useProfiles();
  const { user } = useAuth();

  const displayName = profile?.display_name || profile?.username || i18n("guest") || "Utilisateur";
  const email = user?.email || "";
  const publicId = profile?.public_id || active || user?.id || "local";
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl backdrop-blur-2xl">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-zinc-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white">{displayName}</h3>
            <p className="truncate text-xs font-mono text-zinc-400">{publicId}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {email && (
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate text-xs font-mono text-zinc-300">{email}</span>
            </div>
          )}

          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span className="truncate text-xs text-zinc-300">Session vérifiée</span>
          </div>
        </div>

        {activeProfile && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {activeProfile.name && (
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                {activeProfile.name}
              </span>
            )}
            {activeProfile.workspace && (
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                {i18n(activeProfile.workspace) || activeProfile.workspace}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.04] pt-3">
        <button
          type="button"
          onClick={onEditProfile}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/[0.08]"
        >
          <Camera className="h-3.5 w-3.5" />
          {i18n("editProfile") || "Modifier le profil"}
        </button>
        <button
          type="button"
          onClick={onChangePassword}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
        >
          <Key className="h-3.5 w-3.5" />
          {i18n("changePassword") || "Changer le mot de passe"}
        </button>
      </div>
    </div>
  );
}
