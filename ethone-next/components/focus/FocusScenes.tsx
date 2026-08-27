"use client";

import { Icon } from "@/lib/icons";
import { useSound, type SoundAmbient } from "@/lib/sound";
import { useFocus } from "@/components/FocusProvider";
import { useToast } from "@/components/ToastProvider";

interface FocusScene {
  id: string;
  name: string;
  preset: string;
  sound: SoundAmbient;
  durationLabel: string;
  icon: string;
  bgGradient: string;
}

const SCENES: FocusScene[] = [
  {
    id: "night-coding",
    name: "Night Coding",
    preset: "deep-work",
    sound: "rain",
    durationLabel: "Deep Work (50m) · Pluie",
    icon: "moon",
    bgGradient: "from-purple-500/20 to-indigo-500/10",
  },
  {
    id: "cozy-study",
    name: "Cozy Study",
    preset: "pomodoro",
    sound: "cafe",
    durationLabel: "Pomodoro (25m) · Café",
    icon: "coffee",
    bgGradient: "from-amber-500/20 to-orange-500/10",
  },
  {
    id: "stormy-flow",
    name: "Stormy Flow",
    preset: "flow",
    sound: "storm",
    durationLabel: "Flow (90m) · Orage",
    icon: "cloud-lightning",
    bgGradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    id: "deep-forest",
    name: "Deep Forest",
    preset: "study",
    sound: "forest",
    durationLabel: "Study (45m) · Forêt",
    icon: "tree",
    bgGradient: "from-emerald-500/20 to-teal-500/10",
  },
];

export default function FocusScenes() {
  const { start } = useFocus();
  const { playAmbient } = useSound();
  const { success } = useToast();

  const handleLaunchScene = (scene: FocusScene) => {
    start(scene.preset);
    playAmbient(scene.sound);
    success(`Scène "${scene.name}" activée !`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)]/50 pb-2.5">
        <Icon name="sparkles" className="h-4 w-4 text-[var(--accent-primary)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
          Focus Scenes (1-Clic)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => handleLaunchScene(scene)}
            className={`group relative flex items-center justify-between rounded-xl border border-[var(--panel-border)]/60 bg-gradient-to-r ${scene.bgGradient} p-3 text-left transition-all hover:scale-[1.02] hover:border-[var(--accent-primary)]/50 active:scale-[0.98] shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-raised)]/80 text-[var(--accent-primary)] group-hover:scale-110 transition-transform">
                <Icon name={scene.icon} className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{scene.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{scene.durationLabel}</p>
              </div>
            </div>

            <Icon
              name="play"
              className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors fill-current"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
