"use client";

import { useEffect, useState } from "react";

export default function LiveClock({ language }: { language?: string }) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <span className="font-mono text-xs font-medium tabular-nums text-[var(--text-muted)]" aria-hidden="true">—</span>;

  return (
    <span className="font-mono text-xs font-medium tabular-nums text-[var(--accent)]" aria-live="off">
      {time.toLocaleTimeString(language || "fr", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
