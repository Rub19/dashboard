"use client";

import { useEffect, useState } from "react";
import { frameById, PRESENCE } from "@/lib/profile/cosmetics";
import type { PresenceStatus } from "@/lib/profile/account-profile";
import { cn } from "@/lib/utils";

/** Avatar rond avec son cadre et, au besoin, la pastille de présence. Si l'image ne charge pas, les initiales prennent le relais. */
export default function ProfileAvatar({
  src,
  initials,
  frameId,
  presence,
  size = 96,
  className,
}: {
  src?: string;
  initials: string;
  frameId?: string;
  presence?: PresenceStatus;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const frame = frameById(frameId);
  const ring = frame.id === "none" ? 0 : Math.max(2, Math.round(size / 32));
  const dot = Math.max(10, Math.round(size / 5.5));

  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full transition-[background,box-shadow] duration-300"
        style={{ background: frame.ring, boxShadow: frame.glow, padding: ring }}
      >
        <span className="block h-full w-full overflow-hidden rounded-full bg-[var(--surface-raised)] ring-1 ring-[var(--panel-border)]">
          {src && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} onError={() => setFailed(true)} className="h-full w-full select-none object-cover" />
          ) : (
            <span
              className="grid h-full w-full place-items-center font-bold text-[var(--accent-contrast)]"
              style={{ background: "linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 55%, #000))", fontSize: size * 0.34 }}
            >
              {initials}
            </span>
          )}
        </span>
      </span>
      {presence && (
        <span
          aria-label={PRESENCE[presence].label}
          title={PRESENCE[presence].label}
          className="absolute rounded-full ring-[3px] ring-[var(--bg-surface)] transition-colors duration-300"
          style={{ width: dot, height: dot, right: size * 0.04, bottom: size * 0.04, background: PRESENCE[presence].color }}
        />
      )}
    </span>
  );
}
