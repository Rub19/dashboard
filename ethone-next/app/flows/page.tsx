"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Workflow, Timer, Zap, User, Target, Palette, Gamepad2, Play, Trash2, Plus } from "lucide-react";

const TEMPLATES = [
  { id: "personal", label: "Personnel", desc: "Essentiel. Une seule source de vérité pour la journée.", icon: User, color: "bg-sky-500/10 text-sky-400" },
  { id: "focus", label: "Focus", desc: "Deep work sans interruption, notifications masquées.", icon: Target, color: "bg-violet-500/10 text-violet-400" },
  { id: "studio", label: "Studio", desc: "Création, notes, médias et espace libre.", icon: Palette, color: "bg-emerald-500/10 text-emerald-400" },
  { id: "gaming", label: "Gaming", desc: "Stats, trackers et sessions en direct.", icon: Gamepad2, color: "bg-amber-500/10 text-amber-400" },
];

type Flow = { id: string; label: string; templateId: string; runs: number };

export default function FlowsPage() {
  const i18n = useI18n();
  const [flows, setFlows] = useLocalStorage<Flow[]>("ethone:flows", []);
  const [executions, setExecutions] = useLocalStorage<number>("ethone:flow-executions", 0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [newLabel, setNewLabel] = useState("");

  const activeCount = flows.filter((f) => f.runs > 0).length;

  const templateStats = useMemo(() => {
    const counts: Record<string, number> = {};
    TEMPLATES.forEach((t) => (counts[t.id] = 0));
    flows.forEach((f) => (counts[f.templateId] = (counts[f.templateId] || 0) + 1));
    return counts;
  }, [flows]);

  function addFlow() {
    const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
    const label = newLabel.trim() || template.label;
    setFlows([...flows, { id: String(Date.now()), label, templateId: template.id, runs: 0 }]);
    setNewLabel("");
  }

  function runFlow(id: string) {
    setFlows(flows.map((f) => (f.id === id ? { ...f, runs: f.runs + 1 } : f)));
    setExecutions(executions + 1);
  }

  function removeFlow(id: string) {
    setFlows(flows.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("flows")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">{flows.length} flow{flows.length > 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Workflow className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-[var(--muted)]">Flow{activeCount > 1 ? "s" : ""} actif</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{flows.length}</p>
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
              <p className="text-2xl font-bold">{executions}</p>
              <p className="text-xs text-[var(--muted)]">Exécutions aujourd’hui</p>
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">Flow Engine</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">Créez des flows à partir de modèles, exécutez-les, et suivez le nombre de runs.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFlow()}
              placeholder="Nom du flow..."
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addFlow}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> {i18n("add")}
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <Card3D key={template.id}>
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${template.color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{template.label}</h2>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {templateStats[template.id] || 0}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{template.desc}</p>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>

      {flows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Vos flows</h2>
          {flows.map((flow) => {
            const template = TEMPLATES.find((t) => t.id === flow.templateId) || TEMPLATES[0];
            return (
              <Card3D key={flow.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${template.color}`}>
                      <Zap className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{flow.label}</p>
                      <p className="text-xs text-[var(--muted)]">{flow.runs} exécution{flow.runs > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => runFlow(flow.id)} className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20">
                      <Play className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeFlow(flow.id)} className="rounded-xl p-2 text-[var(--muted)] hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card3D>
            );
          })}
        </div>
      )}
    </div>
  );
}
