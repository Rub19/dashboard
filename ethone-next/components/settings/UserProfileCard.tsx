"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Key, Camera, Eye, EyeOff } from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import Button from "@/components/ui/Button";

function maskId(id: string) {
  if (!id) return "";
  if (id.length <= 8) return "•".repeat(id.length);
  return id.slice(0, 2) + "•".repeat(id.length - 4) + id.slice(-2);
}

const actionBtnClass =
  "relative inline-flex items-center justify-center whitespace-nowrap h-9 px-3 text-xs gap-2 rounded-xl font-semibold transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none bg-[var(--text-primary)]/4 text-[var(--text-primary)] border border-[var(--panel-border)] hover:bg-[var(--text-primary)]/8 hover:border-[var(--accent-primary)]/40 active:scale-[0.98]";

export default function UserProfileCard({
  onEditProfile,
  onChangePassword,
}: {
  onEditProfile?: () => void;
  onChangePassword?: () => void;
}) {
  const i18n = useI18n();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { profile: discordProfile } = useDiscordOAuth();

  const meta = (user?.user_metadata || {}) as Record<string, unknown>;
  const discordName =
    discordProfile?.user?.displayName ||
    discordProfile?.user?.globalName ||
    discordProfile?.user?.username;

  const fromMeta =
    (typeof meta.full_name === "string" ? meta.full_name : undefined) ||
    (typeof meta.name === "string" ? meta.name : undefined) ||
    (typeof meta.username === "string" ? meta.username : undefined) ||
    (typeof meta.user_name === "string" ? meta.user_name : undefined) ||
    (typeof meta.preferred_username === "string" ? meta.preferred_username : undefined);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    discordName ||
    fromMeta ||
    (user?.email ? user.email.split("@")[0] : "") ||
    i18n("guest", "Utilisateur");

  const email = user?.email || "";
  const rawPublicId = profile?.public_id || user?.id || "local";
  const avatarUrl =
    profile?.avatar_url ||
    discordProfile?.user?.avatarUrl ||
    (typeof meta.avatar_url === "string" ? meta.avatar_url : undefined) ||
    (typeof meta.picture === "string" ? meta.picture : undefined);

  const [masked, setMasked] = useState(true);

  const statusConfig = USER_STATUS_CONFIG["online"] || USER_STATUS_CONFIG.online;

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

      <div className="-mt-6 flex items-end gap-4 px-5 pb-4">
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
            className={cn(
              "absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-main)] ring-2 ring-[var(--bg-main)]",
              statusConfig.dot,
            )}
            title={i18n("statusVerified", "Vérifiée")}
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
              className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]"
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
          <span className="text-[11px] font-medium text-emerald-300">{i18n("sessionVerified", "Session vérifiée")}</span>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/profile"
            onClick={onEditProfile}
            className={actionBtnClass}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="truncate">{i18n("editProfile", "Modifier le profil")}</span>
          </Link>

          <Link
            href="/connections?link=discord"
            className={actionBtnClass}
          >
            <Icon name="discord" pack="brand" className="h-3.5 w-3.5" />
            <span className="truncate">{i18n("linkDiscord", "Lier Discord")}</span>
          </Link>

          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={<Key className="h-3.5 w-3.5" />}
            onClick={handleChangePassword}
          >
            {i18n("changePassword", "Changer le mot de passe")}
          </Button>
        </div>
      </div>
    </div>
  );
}
