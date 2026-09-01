"use client";

import { useIdentity } from "@/lib/identity";
import { useUserIdentity } from "@/lib/hooks/useUserIdentity";
import { IDENTITY_PRESENCE_STATUSES } from "@/lib/identity/constants";
import ClientImage from "@/components/ClientImage";
import { cn } from "@/lib/utils";

export function ProfileHeader() {
  const { identity } = useIdentity();
  const { displayName, avatarUrl, email, initials } = useUserIdentity();

  const status = identity?.presence_status ?? "offline";
  const statusConfig = IDENTITY_PRESENCE_STATUSES[status];
  const badges = identity?.badge_ids ?? [];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 backdrop-blur-[var(--panel-blur)]">
      <div
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-violet-600/20 via-cyan-500/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative shrink-0">
          <div
            className={cn(
              "relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-[#141414]",
              identity?.avatar_frame_id ? "ring-amber-400" : "ring-zinc-700"
            )}
          >
            <ClientImage
              src={avatarUrl}
              alt={displayName}
              width={128}
              height={128}
              className="h-full w-full object-cover"
              fallback={
                <span className="flex h-full w-full items-center justify-center bg-[var(--accent)] text-xl font-bold text-white">
                  {initials}
                </span>
              }
            />
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-[#141414]",
              statusConfig.dot
            )}
            aria-label={statusConfig.label}
            title={statusConfig.label}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">{displayName || email}</h2>
            {identity?.username && (
              <span className="text-sm text-[var(--accent)]">@{identity.username}</span>
            )}
          </div>

          {identity?.bio ? (
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{identity.bio}</p>
          ) : (
            <p className="mt-1 max-w-xl text-sm italic text-[var(--muted)]">Aucune bio</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-1 text-xs font-medium">
              <span className={cn("h-2 w-2 rounded-full", statusConfig.dot)} />
              {statusConfig.label}
            </span>

            {badges.length > 0 ? (
              badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]"
                >
                  {badge}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--muted)]">Aucun badge</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
