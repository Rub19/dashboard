"use client";

import { useMemo, useState } from "react";
import { Zap, Workflow, CheckCircle2, Plus } from "lucide-react";
import FlowCard from "@/components/FlowCard";
import { useI18n } from "@/lib/hooks/useI18n";
import { useUserData } from "@/lib/hooks/useUserData";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import Select from "@/components/ui/Select";
import { useBrain } from "@/lib/hooks/useBrain";
import { AUTOMATION_ACTIONS, actionLabel } from "@/lib/brain/automation";

const WIDGET_ICONS: Record<string, string> = {
  notes: "notebook-pen",
  tasks: "circle-check",
  calendar: "calendar-days",
  files: "folder",
  brain: "brain",
};

const TEMPLATES = [
  {
    id: "personal",
    desc: "Essentiel. Une seule source de vérité pour la journée.",
    icon: "user",
    color: "bg-sky-500/10 text-sky-400",
    badge: "bg-sky-500/20 text-sky-400",
    steps: ["Capturer", "Organiser", "Exécuter"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
  {
    id: "focus",
    desc: "Deep work sans interruption, notifications masquées.",
    icon: "target",
    color: "bg-violet-500/10 text-violet-400",
    badge: "bg-violet-500/20 text-violet-400",
    steps: ["Choisir", "Concentrer", "Terminer"],
    widgets: ["tasks", "calendar", "brain", "notes"],
  },
  {
    id: "studio",
    desc: "Création, notes, médias et espace libre.",
    icon: "palette",
    color: "bg-emerald-500/10 text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-400",
    steps: ["Explorer", "Relier", "Publier"],
    widgets: ["notes", "files", "brain", "calendar"],
  },
  {
    id: "gaming",
    desc: "Stats, trackers et sessions en direct.",
    icon: "gamepad-2",
    color: "bg-amber-500/10 text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
    steps: ["Lancer", "Jouer", "Terminer"],
    widgets: ["notes", "tasks", "calendar", "brain"],
  },
];

const ATTACHABLE_WORKSPACES = ["personal", "focus", "studio"];
const attachableActions = AUTOMATION_ACTIONS.filter((a) => a.group !== "space");

export default function FlowsPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { items: flows, loading, error, create, update, remove } = useUserData("flow");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [newLabel, setNewLabel] = useState("");
  const [activeFlow, setActiveFlow] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const { automations, addAutomationRule, toggleAutomationRule, removeAutomationRule } = useBrain();
  const [selectedAuto, setSelectedAuto] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  function getFlowWorkspace(flow: (typeof flows)[number]) {
    const data = (flow.data || {}) as { templateId?: string; workspaceId?: string };
    const id = data.templateId || data.workspaceId;
    if (id && TEMPLATES.find((t) => t.id === id)) return id;
    return TEMPLATES.find(
      (t) =>
        t.id === flow.label.toLowerCase() ||
        i18n(t.id).toLowerCase() === flow.label.toLowerCase()
    )?.id;
  }

  async function addFlow() {
    const template = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
    const label = newLabel.trim() || i18n(template.id);
    try {
      await create(label, "", { templateId: template.id, workspaceId: template.id });
      setNewLabel("");
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function runFlow(id: string, current: number) {
    const flow = flows.find((f) => f.id === id);
    if (!flow) return;
    const workspaceId = getFlowWorkspace(flow);
    setPendingId(id);
    try {
      await update(id, { count: current + 1 });
      if (workspaceId) setActiveFlow(workspaceId);
      success(i18n("started"));
    } catch {
      showError(i18n("error"));
    } finally {
      setPendingId(null);
    }
  }

  async function runTemplate(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const existing = flows.find((f) => getFlowWorkspace(f) === templateId);
    setPendingId(templateId);
    try {
      if (existing) {
        await update(existing.id, { count: existing.count + 1 });
      } else {
        await create(i18n(template.id), "", { templateId: template.id, workspaceId: template.id }, 1);
      }
      setActiveFlow(templateId);
      success(i18n("started"));
    } catch {
      showError(i18n("error"));
    } finally {
      setPendingId(null);
    }
  }

  async function deleteFlow(id: string) {
    try {
      await remove(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function duplicateFlow(flow: (typeof flows)[number]) {
    try {
      const data = (flow.data || {}) as { templateId?: string; workspaceId?: string };
      const templateId = data.templateId || data.workspaceId;
      const workspaceId = getFlowWorkspace(flow);
      await create(`${flow.label} (copie)`, "", { templateId, workspaceId }, flow.count);
      success(i18n("created"));
    } catch {
      showError(i18n("error"));
    }
  }

  function automationsForWorkspace(workspaceId: string) {
    return automations.filter((rule) => rule.trigger.type === "space" && rule.trigger.value === workspaceId);
  }

  function attachAutomation(flowId: string, workspaceId: string) {
    const actionId = selectedAuto[flowId] || attachableActions[0]?.id;
    if (!actionId) return;
    addAutomationRule({ type: "space", value: workspaceId }, actionId);
    success(i18n("added"));
  }

  const statCards = [
    {
      icon: <Zap className="h-5 w-5 text-emerald-400" />,
      value: activeCount,
      label: "Flows actifs",
    },
    {
      icon: <Workflow className="h-5 w-5 text-amber-400" />,
      value: executions,
      label: "Automatisations déclenchées",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-purple-400" />,
      value: executions,
      label: "Runs",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 backdrop-blur-xl transition-all hover:border-white/15"
          >
            <div>
              <p className="text-2xl font-bold font-mono text-white">{stat.value}</p>
              <p className="text-xs text-zinc-400">{stat.label}</p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
              {stat.icon}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-zinc-950/50 p-4 backdrop-blur-md sm:flex-row sm:items-center">
        <div>
          <h1 className="text-sm font-semibold text-white">Gestionnaire de Flows</h1>
          <p className="text-xs text-zinc-500">Créez, exécutez et automatisez vos flows.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Select
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            options={TEMPLATES.map((t) => ({ id: t.id, label: i18n(t.id) }))}
            aria-label={i18n("workspace")}
            className="min-w-0 sm:min-w-[9rem]"
          />
          <button
            type="button"
            onClick={addFlow}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{
              background: "var(--accent-color, #a855f7)",
              boxShadow: "0 0 16px var(--accent-glow, rgba(168, 85, 247, 0.3))",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau Flow
          </button>
        </div>
      </div>

      <input
        type="text"
        value={newLabel}
        onChange={(e) => setNewLabel(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addFlow()}
        aria-label={i18n("create")}
        placeholder={i18n("create")}
        className="w-full rounded-2xl border border-white/[0.08] bg-zinc-950/50 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/15 backdrop-blur-md"
      />

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-400">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {TEMPLATES.map((template) => (
          <FlowCard
            key={template.id}
            id={template.id}
            title={i18n(template.id)}
            description={i18n(`${template.id}Desc`) || template.desc}
            icon={template.icon}
            iconClass={template.color}
            steps={template.steps}
            active={activeFlow === template.id}
            running={pendingId === template.id}
            count={templateStats[template.id] || 0}
            widgets={template.widgets}
            widgetIcons={WIDGET_ICONS}
            onRun={() => runTemplate(template.id)}
          />
        ))}
      </div>

      {flows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">{i18n("yourFlows")}</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {flows.map((flow) => {
              const workspaceId = getFlowWorkspace(flow);
              const template = TEMPLATES.find((t) => t.id === workspaceId) || TEMPLATES[0];
              const isActive = workspaceId === activeFlow;
              const rules = workspaceId ? automationsForWorkspace(workspaceId) : [];
              const canAutomate = workspaceId && ATTACHABLE_WORKSPACES.includes(workspaceId);

              return (
                <FlowCard
                  key={flow.id}
                  id={flow.id}
                  title={flow.label}
                  description={i18n(`${template.id}Desc`) || template.desc}
                  icon="zap"
                  iconClass={template.color}
                  steps={template.steps}
                  active={isActive}
                  running={pendingId === flow.id}
                  count={flow.count}
                  widgets={template.widgets}
                  widgetIcons={WIDGET_ICONS}
                  onRun={() => runFlow(flow.id, flow.count)}
                  onEdit={() => showError("Édition non disponible")}
                  onDuplicate={() => duplicateFlow(flow)}
                  onLogs={() => success("Logs à venir")}
                  onDelete={() => deleteFlow(flow.id)}
                  menuActions={[
                    {
                      label: "Supprimer",
                      icon: "trash-2",
                      onClick: () => deleteFlow(flow.id),
                      danger: true,
                    },
                  ]}
                >
                  {canAutomate && (
                    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="mb-2 text-xs font-medium text-zinc-500">
                        {i18n("automations")}
                      </p>
                      {rules.length > 0 ? (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {rules.map((rule) => (
                            <div
                              key={rule.id}
                              className={`flex items-center gap-2 rounded-xl border px-2 py-1 text-xs ${
                                rule.enabled
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-white/[0.06] bg-white/[0.02] text-zinc-400"
                              }`}
                            >
                              <Icon name="workflow" className="h-3 w-3" />
                              <span className="truncate">{actionLabel(rule.actionId)}</span>
                              <button
                                type="button"
                                onClick={() => toggleAutomationRule(rule.id)}
                                className="rounded p-1 hover:bg-white/5"
                                aria-label={rule.enabled ? i18n("disabled") : i18n("enabled")}
                              >
                                <Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeAutomationRule(rule.id)}
                                className="rounded p-1 hover:text-red-400"
                                aria-label={i18n("delete")}
                              >
                                <Icon name="trash-2" className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={selectedAuto[flow.id] || attachableActions[0]?.id}
                          onChange={(value) =>
                            setSelectedAuto((prev) => ({ ...prev, [flow.id]: value }))
                          }
                          options={attachableActions.map((a) => ({ id: a.id, label: a.label }))}
                          aria-label={i18n("action")}
                          className="min-w-0 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => attachAutomation(flow.id, workspaceId)}
                          disabled={attachableActions.length === 0}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                        >
                          <Icon name="workflow" className="h-3.5 w-3.5" />
                          {i18n("add")}
                        </button>
                      </div>
                    </div>
                  )}
                </FlowCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
