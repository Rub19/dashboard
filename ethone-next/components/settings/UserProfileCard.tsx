"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import ClientImage from "@/components/ClientImage";
import Link from "next/link";
import { User, Key, Camera, Eye, EyeOff, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { USER_STATUS_CONFIG } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import Button from "@/components/ui/Button";
import AvatarPickerModal from "@/components/AvatarPickerModal";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";

function maskId(id: string) {
  if (!id) return "";
  if (id.length <= 8) return "•".repeat(id.length);
  return id.slice(0, 2) + "•".repeat(id.length - 4) + id.slice(-2);
}

const linkBtnClass =
  "relative inline-flex items-center justify-center whitespace-nowrap h-9 px-3 text-xs gap-2 rounded-xl font-semibold transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/60 focus-visible:outline-none border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/30 hover:bg-[var(--text-primary)]/[0.04] cursor-pointer";

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
  const { settings } = useSettings();
  const { displayName, avatarUrl, email } = useUserIdentity();

  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [masked, setMasked] = useState(true);

  const isDiscordLinked = Boolean(discordProfile?.connected);
  const rawPublicId = profile?.public_id || user?.id || "local";

  const statusKey = (settings.status as keyof typeof USER_STATUS_CONFIG) ?? "online";
  const statusConfig = USER_STATUS_CONFIG[statusKey] ?? USER_STATUS_CONFIG.online;

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

  const [frameId, setFrameId] = useState("none");
  const [badgeId, setBadgeId] = useState("verified");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateCosmetics = () => {
        try {
          const f = localStorage.getItem("ethone_user_frame");
          const b = localStorage.getItem("ethone_user_badge");
          if (f) setFrameId(f);
          if (b) setBadgeId(b);
        } catch {}
      };
      updateCosmetics();
      window.addEventListener("ethone:identity:update", updateCosmetics);
      return () => window.removeEventListener("ethone:identity:update", updateCosmetics);
    }
  }, []);

  const activeFrameClass = useMemo(() => {
    switch (frameId) {
      case "ethone-glow":
        return "ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
      case "neon-cyan":
        return "ring-2 ring-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.6)]";
      case "gold-vip":
        return "ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]";
      case "aurora-borealis":
        return "ring-2 ring-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.5)]";
      case "glass-frost":
        return "ring-2 ring-white/50 shadow-[0_0_12px_rgba(255,255,255,0.25)]";
      case "flame-ember":
        return "ring-2 ring-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.6)]";
      default:
        return "border border-[var(--text-primary)]/[0.08]";
    }
  }, [frameId]);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with click-to-change gallery */}
          <div className="relative shrink-0 group cursor-pointer" onClick={() => setIsAvatarPickerOpen(true)} title="Changer l'avatar (Netflix, Crunchyroll, Gaming...)">
            <div className={cn("flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[var(--panel-bg)] shadow-md transition-all group-hover:scale-105", activeFrameClass)}>
              {avatarUrl ? (
                <ClientImage
                  src={avatarUrl}
                  alt={displayName}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover object-top"
                  fallback={<User className="h-6 w-6 text-[var(--text-muted)]" />}
                />
              ) : (
                <User className="h-6 w-6 text-[var(--text-muted)]" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-xs">
                <Camera className="h-5 w-5 text-white drop-shadow" />
              </div>
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-main)]",
                statusConfig.dot,
              )}
              title={i18n(statusConfig.labelKey)}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-[var(--text-primary)]">{displayName}</h3>
              {/* Active Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold">{badgeId === "founder" ? "Founder" : badgeId === "developer" ? "Developer" : badgeId === "brain-master" ? "Brain Master" : badgeId === "power-user" ? "Power User" : "Vérifié"}</span>
              </div>
              {/* Status badge */}
              <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-2 py-0.5", statusConfig.bg, statusConfig.text)}>
                <Icon name={statusConfig.icon} className="h-3 w-3" />
                <span className="text-[10px] font-medium">{i18n(statusConfig.labelKey)}</span>
              </div>
            </div>
            {email && (
              <p className="truncate text-xs text-[var(--text-muted)]">{email}</p>
            )}
            <div className="mt-0.5 flex items-center gap-2">
              <span className="min-w-0 truncate font-mono text-[11px] text-[var(--text-muted)]">
                {masked ? maskId(rawPublicId) : rawPublicId}
              </span>
              <button
                type="button"
                onClick={() => setMasked((v) => !v)}
                className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)] cursor-pointer"
                aria-label={masked ? "Afficher l'identifiant" : "Masquer l'identifiant"}
                title={masked ? "Afficher" : "Masquer"}
              >
                {masked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={() => setIsAvatarPickerOpen(true)}
          >
            Changer d&apos;avatar (Netflix, Anime...)
          </Button>

          <Link
            href="/profile"
            onClick={onEditProfile}
            className={linkBtnClass}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="truncate">{i18n("editProfile", "Modifier le profil")}</span>
          </Link>

          <Link
            href={isDiscordLinked ? "/connections" : "/connections?link=discord"}
            className={linkBtnClass}
          >
            <Icon name="discord" pack="brand" className="h-3.5 w-3.5" />
            <span className="truncate">
              {i18n(isDiscordLinked ? "linkedDiscord" : "linkDiscord", isDiscordLinked ? "Discord lié" : "Lier Discord")}
            </span>
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

      {/* Avatar Picker Gallery Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
      />
    </>
  );
}
