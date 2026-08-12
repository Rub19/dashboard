"use client";

import { useState } from "react";
import { useBrain } from "@/lib/hooks/useBrain";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { actionLabel } from "@/lib/brain/automation";

const WORKSPACES = ["personal", "focus", "studio", "gaming"] as const;

const ACTIONS = [
  { id: "v8.space.personal", label: "Space Personnel" },
  { id: "v8.space.focus", label: "Space Focus" },
  { id: "v8.space.studio", label: "Space Studio" },
  { id: "v8.density.spacious", label: "Densité Spacieuse" },
  { id: "v8.density.comfortable", label: "Densité Confortable" },
  { id: "v8.density.compact", label: "Densité Compacte" },
  { id: "v8.theme.night", label: "Thème Nuit" },
  { id: "v8.theme.day", label: "Thème Jour" },
];

export default function FlowAutomations({ activeFlow }: { activeFlow?: string }) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { preferences, addAutomationRule, toggleAutomationRule, removeAutomationRule } = useBrain();
  const [flow, setFlow] = useState<string>(activeFlow || "personal");
  const [action, setAction] = useState<string>(ACTIONS[0].id);

  const rules = preferences.automations.filter((r) => r.trigger.type === "space");

  async function addAutomation() {
    try {
      addAutomationRule({ type: "space", value: flow }, action);
      success(i18n("saved"));
    } catch {
      showError(i18n("error"));
    }
  }

  async function deleteAutomation(id: string) {
    try {
      removeAutomationRule(id);
      success(i18n("deleted"));
    } catch {
      showError(i18n("error"));
    }
  }

  return (
    <Card3D>
      <h2 className="mb-3 text-sm font-semibold">{i18n("flowAutomations")}</h2>
      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={flow} onChange={(e) => setFlow(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            {WORKSPACES.map((w) => (
              <option key={w} value={w}>{i18n(w)}</option>
            ))}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            {ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <button type="button" onClick={addAutomation} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white">{i18n("add")}</button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("noAutomations")}</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const actionLabelText = actionLabel(rule.actionId);
              return (
                <div key={rule.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                  <span className="text-sm">{i18n(rule.trigger.value)} → {actionLabelText}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAutomationRule(rule.id)}
                      className="rounded p-1 hover:bg-white/5"
                      aria-label={rule.enabled ? i18n("disable") : i18n("enable")}
                    >
                      <Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteAutomation(rule.id)} className="text-red-400"><Icon name="trash-2" className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card3D>
  );
}
