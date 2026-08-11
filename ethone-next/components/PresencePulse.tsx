"use client";

import { usePresence } from "@/components/PresenceProvider";
import { useSettings } from "@/components/SettingsProvider";

const STATUS_COLOR: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  dnd: "bg-rose-400",
  offline: "bg-zinc-400",
};

export default function PresencePulse() {
  const { state } = usePresence();
  const { settings } = useSettings();

  if (settings.reducedMotion) {
    return <span className={`inline-block h-2 w-2 rounded-full ${STATUS_COLOR[state.status || "offline"]}`} />;
  }

  const active = state.notification === "new" || state.brain === "thinking" || state.typing;

  return (
    <span className="relative inline-flex h-2 w-2" data-presence-pulse={active ? "active" : "idle"}>
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${active ? "bg-[var(--accent)]" : STATUS_COLOR[state.status || "offline"]}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-[var(--accent)]" : STATUS_COLOR[state.status || "offline"]}`} />
    </span>
  );
}
