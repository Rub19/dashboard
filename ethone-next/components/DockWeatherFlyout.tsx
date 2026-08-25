"use client";

import { useState } from "react";
import { ChevronUp, CloudSun } from "lucide-react";
import { useLiveData } from "@/lib/hooks/useLiveData";
import WeatherDetailPopover from "@/components/WeatherDetailPopover";
import { cn } from "@/lib/utils";

export default function DockWeatherFlyout() {
  const { weather } = useLiveData(300000);
  const [open, setOpen] = useState(false);
  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);

  const temp =
    typeof weather?.temperature === "number" ? `${Math.round(weather.temperature)}°` : null;

  if (!weather && !open) {
    return null;
  }

  return (
    <>
      <button
        ref={setButtonEl}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Météo"
        className={
          "flex h-11 items-center gap-1.5 rounded-xl border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] " +
          "px-2 text-sm text-[var(--text-primary)] transition-all hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)] " +
          "active:scale-95"
        }
      >
        <CloudSun className="h-5 w-5 shrink-0 text-amber-400" />
        {temp !== null && (
          <span className="hidden font-mono text-[var(--text-primary)] sm:inline">{temp}</span>
        )}
        <ChevronUp
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <WeatherDetailPopover
        open={open}
        onClose={() => setOpen(false)}
        referenceRef={buttonEl}
        placement="top-end"
      />
    </>
  );
}
