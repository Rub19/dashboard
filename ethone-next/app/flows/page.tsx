"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { Icon } from "@/lib/icons";
;

const TEMPLATES = [
  { id: "personal", label: "Personnel", desc: "Essentiel. Une seule source de vérité pour la journée.", icon: "user", color: "bg-sky-500/10 text-sky-400" },
  { id: "focus", label: "Focus", desc: "Deep work sans interruption, notifications masquées.", icon: "target", color: "bg-violet-500/10 text-violet-400" },
  { id: "studio", label: "Studio", desc: "Création, notes, médias et espace libre.", icon: "palette", color: "bg-emerald-500/10 text-emerald-400" },
  { id: "gaming", label: "Gaming", desc: "Stats, trackers et sessions en direct.", icon: "gamepad-2", color: "bg-amber-500/10 text-amber-400" },
];

export default function FlowsPage() {
  const i18n = useI18n();
  const { items: flows, loading, error, create, update, remove } = useUserData("flow");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [newLabel, setNewLabel] = useState("");

  const activeCount = flows.filter((f) => f.count > 0).length;
  const executions = flows.reduce((sum, f) => sum + f.count, 0);

  const templateStats = useMemo(() => {
    const counts: Record<string, number> = {};
    TEMPLATES.forEach((t) => (counts[t.id] = 0));
    flows.forEach((f) => {
      const templateId = typeof f.data === "object" && (f.data as { templateId?: string }).templateId;
      if (templateId) counts[templateId] = (counts[templateId] || 0) + 1;
    });
    return counts;
  }, [flows]);

  function addFlow() {
    const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
    const label = newLabel.trim() || template.label;
    create(label, "", { templateId: template.id });
    setNewLabel("");
  }

  function runFlow(id: string, current: number) {
    update(id, { count: current + 1 });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("flowsTitle")}</h1>
        <span className="rounded-full bg-[var(--surface-raised)] px-3 py-1 text-sm text-[var(--muted)]">{flows.length} {flows.length > 1 ? i18n("flows") : i18n("flow")}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Icon name="workflow" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-[var(--muted)]">{i18n(activeCount > 1 ? "flows" : "flow")} {i18n(activeCount > 1 ? "actives" : "active")}</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Icon name="timer" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{flows.length}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("automations")}</p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Icon name="zap" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{executions}</p>
              <p className="text-xs text-[var(--muted)]">{i18n("executions")}</p>
            </div>
          </div>
        </Card3D>
      </div>

      {error && (
        <Card3D>
          <p className="text-sm text-red-400">{error.message}</p>
        </Card3D>
      )}

      <Card3D>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">{i18n("flowsTitle")}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{i18n("fromTemplates")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{i18n(t.id)}</option>
              ))}
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFlow()}
              placeholder={i18n("create")}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addFlow}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" /> {i18n("add")}
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((template) => (
          <Card3D key={template.id}>
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${template.color}`}>
                <Icon name={template.icon} className="h-5 w-5" />
              </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">{i18n(template.id)}</h2>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {templateStats[template.id] || 0}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{i18n(`${template.id}Desc`)}</p>
                </div>
              </div>
            </Card3D>
          ))}
      </div>

      {flows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{i18n("yourFlows")}</h2>
          {flows.map((flow) => {
            const templateId = typeof flow.data === "object" ? (flow.data as { templateId?: string }).templateId : undefined;
            const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
            return (
              <Card3D key={flow.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${template.color}`}>
                      <Icon name="zap" className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{flow.label}</p>
                      <p className="text-xs text-[var(--muted)]">{flow.count} {i18n(flow.count > 1 ? "executions" : "execution")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => runFlow(flow.id, flow.count)} className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20">
                      <Icon name="play" className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(flow.id)} className="rounded-xl p-2 text-[var(--muted)] hover:text-red-400">
                      <Icon name="trash-2" className="h-4 w-4" />
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
