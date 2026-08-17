"use client";

import { useEffect, useState } from "react";

export default function LiveFreshness({ updatedAt }: { updatedAt?: Date | string | number | null }) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    if (!updatedAt) {
      setLabel("");
      return;
    }
    const date = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);
    const formatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setLabel(`Mis à jour à ${formatter.format(date)}`);
  }, [updatedAt]);

  if (!updatedAt) return null;

  return (
    <span className="v8-live-freshness inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[11px] font-mono text-[var(--muted)]">
      <span className="v8-live-pulse-dot relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" aria-hidden="true" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
      </span>
      {label}
    </span>
  );
}
