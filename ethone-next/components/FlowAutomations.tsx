"use client";

import { useMemo, useState } from "react";
import { useBrain } from "@/lib/hooks/useBrain";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { actionLabel, triggerLabel, AUTOMATION_ACTIONS, AUTOMATION_TRIGGER_TYPES, type AutomationRule } from "@/lib/brain/automation";
import { AUTOMATION_NAVIGATION, AUTOMATION_SPACES } from "@/lib/brain/automation";
import Select from "@/components/ui/Select";

const TIME_OPTIONS = ["09:00", "12:00", "14:00", "17:00", "18:00", "21:00", "22:00"] as const;

export default function FlowAutomations({ activeFlow }: { activeFlow?: string }) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { preferences, addAutomationRule, toggleAutomationRule, removeAutomationRule } = useBrain();
  const [triggerType, setTriggerType] = useState<"space" | "route" | "time">("space");
  const [triggerValue, setTriggerValue] = useState<string>(activeFlow || "personal");
  const [action, setAction] = useState<string>(AUTOMATION_ACTIONS[0].id);

  const rules = preferences.automations;

  function resetValue(type: "space" | "route" | "time") {
    setTriggerType(type);
    if (type === "space") setTriggerValue(activeFlow || "personal");
    else if (type === "route") setTriggerValue("home");
    else setTriggerValue("09:00");
  }

  async function addAutomation() {
    try {
      addAutomationRule({ type: triggerType, value: triggerValue }, action);
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

  function groupOptions(group: string) {
    return AUTOMATION_ACTIONS.filter((a) => a.group === group);
  }

  const triggerOptions =
    triggerType === "space"
      ? AUTOMATION_SPACES
      : triggerType === "route"
        ? AUTOMATION_NAVIGATION
        : TIME_OPTIONS;

  const actionOptions = useMemo(() => {
    const groups = [
      { label: i18n("space"), actions: groupOptions("space") },
      { label: i18n("densityTitle"), actions: groupOptions("density") },
      { label: i18n("theme"), actions: groupOptions("theme") },
    ];
    const options: { id: string; label: string; disabled?: boolean }[] = [];
    groups.forEach((g) => {
      options.push({ id: `group-${g.label}`, label: g.label, disabled: true });
      g.actions.forEach((a) => options.push({ id: a.id, label: a.label }));
    });
    return options;
  }, [i18n]);

  return (
    <Card3D>
      <h2 className="mb-3 text-sm font-semibold">{i18n("flowAutomations")}</h2>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={triggerType}
            onChange={(value) => resetValue(value as "space" | "route" | "time")}
            options={AUTOMATION_TRIGGER_TYPES.map((t) => ({ id: t, label: i18n(t) }))}
            aria-label={i18n("trigger")}
            className="min-w-0"
          />
          {triggerType === "time" ? (
            <input
              type="time"
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none"
            />
          ) : (
            <Select
              value={triggerValue}
              onChange={setTriggerValue}
              options={triggerOptions.map((v) => ({ id: v, label: i18n(v) }))}
              aria-label={i18n("value")}
              className="min-w-0 flex-1"
            />
          )}
          <Select
            value={action}
            onChange={setAction}
            options={actionOptions}
            aria-label={i18n("action")}
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={addAutomation}
            className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
          >
            {i18n("add")}
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("noAutomations")}</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule: AutomationRule) => {
              const actionLabelText = actionLabel(rule.actionId);
              return (
                <div key={rule.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2">
                  <span className="text-sm">{triggerLabel(rule.trigger)} → {actionLabelText}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAutomationRule(rule.id)}
                      className="rounded p-1 hover:bg-white/5"
                      aria-label={rule.enabled ? i18n("disable") : i18n("enable")}
                    >
                      <Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteAutomation(rule.id)} className="text-red-400">
                      <Icon name="trash-2" className="h-4 w-4" />
                    </button>
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
