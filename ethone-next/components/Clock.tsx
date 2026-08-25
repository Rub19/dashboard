"use client";

import { memo, useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function Clock() {
  const [time, setTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    let mounted = true;
    const update = () => {
      if (!mounted) return;
      setTime(formatTime(new Date()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
      <ClockIcon className="h-3 w-3 text-[var(--text-muted)]" />
      <span className="font-mono text-[var(--text-primary)]">{time}</span>
    </span>
  );
}

export default memo(Clock);
