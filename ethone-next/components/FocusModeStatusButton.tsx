"use client";

import { useRouter } from "next/navigation";
import { Timer } from "@/components/icons/ph";
import { useFocus } from "@/components/FocusProvider";

// Isolated on purpose: useFocus() re-renders its subscriber once per second
// whenever a focus/Pomodoro session is running (FocusProvider pushes a new
// state object on every tick). Reading it directly inside DashboardOverview
// used to force the entire widget grid (9 widgets, including heavy ones) to
// re-render every second any time a session was active. This tiny button is
// the only consumer of live focus state on the dashboard, so it's the only
// thing that needs to re-render that often.
export default function FocusModeStatusButton() {
  const router = useRouter();
  const focus = useFocus();
  const active = focus?.state?.phase && focus.state.phase !== "idle";

  return (
    <button
      type="button"
      onClick={() => router.push("/focus")}
      className="group flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--surface-raised)]/70 cursor-pointer"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
        <Timer className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Focus Mode</p>
        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
          {active ? "Session en cours (" + focus.state.phase + ")" : "Prêt à démarrer"}
        </p>
      </div>
    </button>
  );
}
