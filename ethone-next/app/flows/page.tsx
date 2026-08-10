"use client";

import { useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { Workflow, Timer, Zap, ArrowRight, User, Target, Palette, Gamepad2 } from "lucide-react";

const FLOWS = [
  {
    id: "personal",
    label: "Personnel",
    desc: "Essentiel. Une seule source de vérité pour la journée.",
    icon: User,
    color: "bg-sky-500/10 text-sky-400",
  },
  {
    id: "focus",
    label: "Focus",
    desc: "Deep work sans interruption, notifications masquées.",
    icon: Target,
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    id: "studio",
    label: "Studio",
    desc: "Création, notes, médias et espace libre.",
    icon: Palette,
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    id: "gaming",
    label: "Gaming",
    desc: "Stats, trackers et sessions en direct.",
    icon: Gamepad2,
    color: "bg-amber-500/10 text-amber-400",
  },
];

export default function FlowsPage() {
  const i18n = useI18n();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("flows")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">
          {FLOWS.length} modèles
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-xs text-[var(--muted)]">Flow actif</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-[var(--muted)]">Automatisations</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-[var(--muted)]">Exécutions aujourd’hui</p>
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Flow Engine</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Automatisez vos routines ETHONE : enchaînez des espaces, déclenchez des actions selon l’heure, l’activité ou des événements, et créez vos propres flows sans code.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotice("Le Flow Engine sera disponible dans une prochaine mise à jour.")}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {i18n("add")} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {notice && <p className="pt-2 text-sm text-amber-400">{notice}</p>}
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FLOWS.map((flow) => {
          const Icon = flow.icon;
          return (
            <Card3D key={flow.id}>
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${flow.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{flow.label}</h2>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      Disponible
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{flow.desc}</p>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}
