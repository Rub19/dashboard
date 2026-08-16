"use client";

import { useMemo, useState } from "react";
import Card3D from "@/components/Card3D";
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
    try {
      await update(id, { count: current + 1 });
      if (workspaceId) setActiveFlow(workspaceId);
      success(i18n("started"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function runTemplate(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const existing = flows.find((f) => getFlowWorkspace(f) === templateId);
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

  function automationsForWorkspace(workspaceId: string) {
    return automations.filter((rule) => rule.trigger.type === "space" && rule.trigger.value === workspaceId);
  }

  function attachAutomation(flowId: string, workspaceId: string) {
    const actionId = selectedAuto[flowId] || attachableActions[0]?.id;
    if (!actionId) return;
    addAutomationRule({ type: "space", value: workspaceId }, actionId);
    success(i18n("added"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{i18n("flowsTitle")}</h1>
        <span className="rounded-full bg-[var(--panel-bg)] px-3 py-1 text-sm text-[var(--muted)]">
          {flows.length} {flows.length > 1 ? i18n("flows") : i18n("flow")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-emerald-500/10 text-emerald-400">
              <Icon name="workflow" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-[var(--muted)]">
                {i18n(activeCount > 1 ? "flows" : "flow")} {i18n(activeCount > 1 ? "actives" : "active")}
              </p>
            </div>
          </div>
        </Card3D>

        <Card3D>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-amber-500/10 text-amber-400">
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] bg-violet-500/10 text-violet-400">
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
            <Select
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              options={TEMPLATES.map((t) => ({ id: t.id, label: i18n(t.id) }))}
              aria-label={i18n("template")}
              className="min-w-0"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFlow()}
              aria-label={i18n("create")}
              placeholder={i18n("create")}
              className="min-w-0 flex-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
            />
            <button
              type="button"
              onClick={addFlow}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-[var(--panel-radius)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" /> {i18n("add")}
            </button>
          </div>
        </div>
      </Card3D>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((template) => {
          const isActive = activeFlow === template.id;
          return (
            <Card3D key={template.id}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--panel-radius)] ${template.color}`}>
                      <Icon name={template.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold">{i18n(template.id)}</h2>
                      <p className="text-xs text-[var(--muted)]">{templateStats[template.id] || 0} flows</p>
                    </div>
                  </div>
                  {isActive && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${template.badge}`}>
                      {i18n("active")}
                    </span>
                  )}
                </div>

                <p className="text-sm text-[var(--muted)]">{i18n(`${template.id}Desc`)}</p>

                <div className="flex flex-wrap gap-1.5">
                  {template.steps.map((step, i) => (
                    <span
                      key={i}
                      className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--foreground)]"
                    >
                      <b className="mr-1 text-[var(--accent)]">{i + 1}</b>
                      {step}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--panel-border)] pt-3">
                  {template.widgets.map((widgetId) => (
                    <span
                      key={widgetId}
                      className="flex h-7 w-7 items-center justify-center rounded-[var(--panel-radius)] bg-[var(--panel-bg)] text-[var(--muted)]"
                      title={widgetId}
                    >
                      <Icon name={WIDGET_ICONS[widgetId]} className="h-3.5 w-3.5" />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => runTemplate(template.id)}
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-[var(--panel-radius)] px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 ${
                      isActive ? "bg-[var(--accent)] text-white" : "bg-[var(--panel-bg)] text-[var(--foreground)]"
                    } backdrop-blur-[var(--panel-blur)]`}
                  >
                    <Icon name={isActive ? "check" : "play"} className="h-3.5 w-3.5" />
                    {isActive ? i18n("active") : i18n("start")}
                  </button>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>

      {flows.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{i18n("yourFlows")}</h2>
          {flows.map((flow) => {
            const workspaceId = getFlowWorkspace(flow);
            const template = TEMPLATES.find((t) => t.id === workspaceId) || TEMPLATES[0];
            const isActive = workspaceId === activeFlow;
            const rules = workspaceId ? automationsForWorkspace(workspaceId) : [];
            const canAutomate = workspaceId && ATTACHABLE_WORKSPACES.includes(workspaceId);

            return (
              <Card3D key={flow.id}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--panel-radius)] ${template.color}`}>
                        <Icon name="zap" className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium">{flow.label}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {flow.count} {i18n(flow.count > 1 ? "executions" : "execution")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${template.badge}`}>
                          {i18n("active")}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => runFlow(flow.id, flow.count)}
                        className="rounded-[var(--panel-radius)] bg-emerald-500/10 p-2 text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Icon name="play" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFlow(flow.id)}
                        className="rounded-[var(--panel-radius)] p-2 text-[var(--muted)] hover:text-red-400"
                      >
                        <Icon name="trash-2" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {template.steps.map((step, i) => (
                      <span
                        key={i}
                        className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] text-[var(--foreground)]"
                      >
                        <b className="mr-1 text-[var(--accent)]">{i + 1}</b>
                        {step}
                      </span>
                    ))}
                  </div>

                  {canAutomate && (
                    <div className="rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-3">
                      <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                        {i18n("automations")}
                      </p>
                      {rules.length > 0 ? (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {rules.map((rule) => (
                            <div
                              key={rule.id}
                              className={`flex items-center gap-2 rounded-[var(--panel-radius)] border px-2 py-1 text-xs ${
                                rule.enabled
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)]"
                              } backdrop-blur-[var(--panel-blur)]`}
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
                          className="inline-flex items-center gap-1.5 rounded-[var(--panel-radius)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <Icon name="workflow" className="h-3.5 w-3.5" />
                          {i18n("add")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card3D>
            );
          })}
        </div>
      )}
    </div>
  );
}
