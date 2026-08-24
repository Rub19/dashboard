"use client";

import { useMemo, useState } from "react";
import { useBrain } from "@/lib/hooks/useBrain";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import BentoCard from "@/components/BentoCard";
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
      { label: i18n("space", "Espace"), actions: groupOptions("space") },
      { label: i18n("densityTitle", "Densité"), actions: groupOptions("density") },
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
    <BentoCard title={i18n("flowAutomations")} icon="workflow">
      <div className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <Select
            value={triggerType}
            onChange={(value) => resetValue(value as "space" | "route" | "time")}
            options={AUTOMATION_TRIGGER_TYPES.map((t) => ({ id: t, label: i18n(t) }))}
            aria-label={i18n("trigger")}
            className="min-w-0 sm:w-36"
          />

          {triggerType === "time" ? (
            <input
              type="time"
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              className="h-11 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] md:h-10"
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
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-all hover:opacity-90 active:scale-95 md:h-10"
          >
            <Icon name="plus" className="h-4 w-4" />
            {i18n("add")}
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="text-sm text-zinc-400">{i18n("noAutomations")}</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule: AutomationRule) => {
              const actionLabelText = actionLabel(rule.actionId);
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5"
                >
                  <span className="min-w-0 text-sm text-zinc-200">
                    <span className="font-medium text-white">{triggerLabel(rule.trigger)}</span>
                    <span className="mx-2 text-zinc-500">→</span>
                    {actionLabelText}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleAutomationRule(rule.id)}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                      aria-label={rule.enabled ? i18n("disable") : i18n("enable")}
                    >
                      <Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAutomation(rule.id)}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--danger)]"
                      aria-label={i18n("delete")}
                    >
                      <Icon name="trash-2" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BentoCard>
  );
}
