"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, CloudSun } from "@/components/icons/ph";
import { useWeatherOnly } from "@/lib/hooks/useWeatherOnly";
import WeatherDetailPopover from "@/components/WeatherDetailPopover";
import { hapticLightImpact } from "@/lib/haptics";
import { cn } from "@/lib/utils";

export default function DockWeatherFlyout() {
  const { weather } = useWeatherOnly(300000);
  const [open, setOpen] = useState(false);
  const [buttonEl, setButtonEl] = useState<HTMLButtonElement | null>(null);

  const temp =
    typeof weather?.temperature === "number" ? `${Math.round(weather.temperature)}°` : null;

  if (!weather && !open) {
    return null;
  }

  return (
    <>
      <motion.button
        ref={setButtonEl}
        type="button"
        onClick={() => {
          hapticLightImpact();
          setOpen((v) => !v);
        }}
        whileHover={{ scale: 1.08, y: -2 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: "spring", stiffness: 450, damping: 25 }}
        aria-expanded={open}
        aria-label="Météo"
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold select-none cursor-pointer backdrop-blur-md transition-colors",
          open
            ? "border-amber-400/40 bg-amber-400/15 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
            : "border-white/[0.08] bg-white/[0.04] text-[var(--text-primary)] hover:border-amber-400/30 hover:bg-white/[0.08]"
        )}
      >
        <CloudSun className="h-4.5 w-4.5 shrink-0 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
        {temp !== null && (
          <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
            {temp}
          </span>
        )}
        <ChevronUp
          className={cn(
            "h-3 w-3 shrink-0 text-[var(--text-muted)] transition-transform duration-300",
            open && "rotate-180 text-amber-300"
          )}
        />
      </motion.button>
      <WeatherDetailPopover
        open={open}
        onClose={() => setOpen(false)}
        referenceRef={buttonEl}
        placement="top-end"
      />
    </>
  );
}
