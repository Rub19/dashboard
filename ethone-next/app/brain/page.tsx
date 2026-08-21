"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import { useMail } from "@/lib/hooks/useMail";
import { usePresence } from "@/components/PresenceProvider";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import TabList from "@/components/tabs/TabList";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/ui/Modal";
import { useItems } from "@/lib/hooks/useItems";
import BrainContextPanel from "@/components/BrainContextPanel";
import BrainBriefingPanel from "@/components/BrainBriefingPanel";
import BrainChat from "@/components/BrainChat";
import { BRAIN_MEMORY_CATEGORIES, BRAIN_PERSONAS, BRAIN_TONES, BRAIN_DETAIL, BRAIN_PROVIDERS, BRAIN_PERMISSION_CATEGORIES, type BrainMemoryCategory } from "@/lib/brain/preferences";
import { AUTOMATION_ACTIONS } from "@/lib/brain/automation";
import { sanitizeMemory, type BrainMemoryItem } from "@/lib/brain-context";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import Button from "@/components/ui/Button";
import Input from "@/components/Input";

type Tab = "chat" | "briefing" | "context" | "memory" | "actions" | "automations" | "providers" | "preferences" | "privacy" | "history" | "diagnostics" | "wrapup";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "chat", icon: "message-circle" },
  { id: "briefing", label: "brainBriefing", icon: "sun" },
  { id: "context", label: "brainContext", icon: "scan-search" },
  { id: "memory", label: "memory", icon: "database" },
  { id: "actions", label: "actions", icon: "zap" },
  { id: "automations", label: "automations", icon: "workflow" },
  { id: "providers", label: "providers", icon: "cpu" },
  { id: "preferences", label: "preferences", icon: "settings" },
  { id: "privacy", label: "brainPrivacy", icon: "shield-check" },
  { id: "history", label: "brainHistory", icon: "history" },
  { id: "diagnostics", label: "brainDiagnostics", icon: "activity" },
  { id: "wrapup", label: "brainWrapup", icon: "sunset" },
];

export default function BrainPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const mail = useMail();
  const mailClient = useMemo(
    () => ({
      analyzeMessage: mail.analyzeMessage,
      suggestReplies: mail.suggestReplies,
      sendMail: mail.sendMail,
      moveMessages: mail.moveMessages,
      getAnalytics: mail.getAnalytics,
      blockSender: mail.blockSender,
      trustSender: mail.trustSender,
      search: (q: string) =>
        mail.messages
          .filter((m) =>
            `${m.subject} ${m.from_address} ${m.from_name || ""} ${m.snippet || ""}`.toLowerCase().includes(q.toLowerCase())
          )
          .slice(0, 10)
          .map((m) => ({ id: m.id, subject: m.subject, from: m.from_address, receivedAt: m.received_at })),
    }),
    [mail]
  );
  const brain = useBrain(mailClient);
  const { setBrain } = usePresence();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [memoryCategory, setMemoryCategory] = useState<BrainMemoryCategory>("interface");
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryValue, setMemoryValue] = useState("");
  const [actionParams, setActionParams] = useState<Record<string, Record<string, unknown>>>({});
  const [autoTrigger, setAutoTrigger] = useState<{ type: string; value: string }>({ type: "route", value: "home" });
  const [autoAction, setAutoAction] = useState<string>(AUTOMATION_ACTIONS[0].id);
  const [wrapupOpen, setWrapupOpen] = useState(false);
  const tasks = useItems("tasks");
  const events = useItems("events");

  useEffect(() => {
    if (brain.loading) {
      setBrain("thinking");
      return;
    }
    const hasAssistant = brain.messages.some((m) => m.role === "assistant");
    if (hasAssistant) {
      setBrain("responding");
      const t = setTimeout(() => setBrain("ready"), 1400);
      return () => clearTimeout(t);
    }
    setBrain("ready");
  }, [brain.loading, brain.messages, setBrain]);

  async function handleSaveMemory() {
    try {
      await brain.saveMemory({ category: memoryCategory, key: memoryKey, value: memoryValue });
      success(i18n("saved"));
      setMemoryKey("");
      setMemoryValue("");
    } catch (err) {
      showError(String(err));
    }
  }

  async function handleDeleteMemory(id: string) {
    try {
      await brain.deleteMemory(id);
      success(i18n("removed"));
    } catch (err) {
      showError(String(err));
    }
  }

  async function handleClearSensitiveMemory() {
    const count = brain.clearSensitiveMemory();
    if (count > 0) success(`${count} ${i18n("removed")}`);
    else showError(i18n("noResults"));
  }

  async function handleExecute(id: string) {
    const def = brain.registry.definitions().find((d) => d.id === id);
    if (!def) return;
    const params = actionParams[id] || {};
    if (def.confirmation) {
      const ok = window.confirm(i18n("confirmAction"));
      if (!ok) return;
    }
    const res = await brain.executeAction(id, params, true);
    if (res.ok) success(res.message || i18n("completed"));
    else showError(res.message || i18n("error"));
  }

  function handleAddAutomation() {
    brain.addAutomationRule(autoTrigger, autoAction);
    success(i18n("saved"));
  }

  function updateParam(actionId: string, key: string, value: unknown) {
    setActionParams((prev) => ({ ...prev, [actionId]: { ...(prev[actionId] || {}), [key]: value } }));
  }

  function renderChat() {
    return <BrainChat brain={brain} />;
  }

  function renderMemory() {
    const recentMemories = brain.recentMemory.slice(0, 20).map((m) => sanitizeMemory(m));
    const categoryCounts = brain.recentMemory.reduce<Record<string, number>>((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={memoryCategory}
            onChange={(value) => setMemoryCategory(value as BrainMemoryCategory)}
            options={BRAIN_MEMORY_CATEGORIES.map((c) => ({ id: c, label: c }))}
            aria-label={i18n("category")}
            className="min-w-0"
          />
          <Input type="text" value={memoryKey} onChange={(e) => setMemoryKey(e.target.value)} placeholder={i18n("key")} className="min-w-0 flex-1" />
          <Input type="text" value={memoryValue} onChange={(e) => setMemoryValue(e.target.value)} placeholder={i18n("value")} className="min-w-0 flex-1" />
          <Button type="button" variant="primary" size="md" onClick={handleSaveMemory}>{i18n("save")}</Button>
        </div>
        <button type="button" onClick={brain.loadMemories} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-2 text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]">{i18n("loadMemories")}</button>
        <div className="space-y-2">
          {brain.memories.map((m) => (
            <Card3D key={m.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--muted)]">{m.category}</p>
                  <p className="font-medium">{m.key}</p>
                  <p className="text-sm text-[var(--muted)]">{m.value}</p>
                </div>
                <button type="button" onClick={() => {
                  const value = window.prompt(i18n("editValue"), m.value);
                  if (value !== null) brain.editMemory(m.id, value).then(() => success(i18n("saved"))).catch((err) => showError(String(err)));
                }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-bg)]"><Icon name="pencil" className="h-4 w-4" /></button>
                <button type="button" onClick={() => handleDeleteMemory(m.id)} className="rounded p-1 text-[var(--danger)] hover:bg-[var(--panel-bg)]"><Icon name="trash-2" className="h-4 w-4" /></button>
              </div>
            </Card3D>
          ))}
        </div>

        <Card3D>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{i18n("brainMemoryCategories")}</p>
              <button
                type="button"
                onClick={handleClearSensitiveMemory}
                className="rounded-[var(--panel-radius)] border border-[var(--danger)]/30 px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
              >
                {i18n("brainClearSensitive")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div key={category} className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 backdrop-blur-[var(--panel-blur)]">
                  <p className="text-xs text-[var(--muted)]">{category}</p>
                  <p className="text-lg font-bold">{count}</p>
                </div>
              ))}
              {!brain.recentMemory.length && (
                <p className="col-span-full text-sm text-[var(--muted)]">{i18n("noResults")}</p>
              )}
            </div>

            <p className="text-sm font-medium">{i18n("recent")}</p>
            <div className="space-y-2">
              {recentMemories.map((m: BrainMemoryItem) => {
                const display = typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2);
                return (
                  <Card3D key={m.id}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{m.id}</p>
                        <span className="text-xs text-[var(--muted)]">{m.category}</span>
                      </div>
                      <p className="line-clamp-3 text-xs text-[var(--foreground)]">{display.length > 200 ? `${display.slice(0, 200)}…` : display}</p>
                    </div>
                  </Card3D>
                );
              })}
              {!recentMemories.length && <p className="text-sm text-[var(--muted)]">{i18n("noResults")}</p>}
            </div>
          </div>
        </Card3D>
      </div>
    );
  }

  function renderActions() {
    return (
      <div className="space-y-3">
        {brain.registry.definitions().map((def) => (
          <Card3D key={def.id}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium">{def.title}</p>
                <Button type="button" variant="primary" size="sm" onClick={() => handleExecute(def.id)}>{i18n("execute")}</Button>
              </div>
              <p className="text-xs text-[var(--muted)]">{def.description}</p>
              {Object.entries(def.parameters).map(([key, type]) => (
                <Input
                  key={key}
                  type="text"
                  value={String(actionParams[def.id]?.[key] ?? "")}
                  onChange={(e) => updateParam(def.id, key, type?.includes("[]") ? e.target.value.split(",") : e.target.value)}
                  placeholder={`${key} (${String(type)})`}
                  className="w-full"
                />
              ))}
            </div>
          </Card3D>
        ))}
      </div>
    );
  }

  function renderAutomations() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={autoTrigger.type}
            onChange={(value) => setAutoTrigger({ type: value, value: value === "time" ? "09:00" : "home" })}
            options={[
              { id: "route", label: i18n("route") },
              { id: "space", label: i18n("space") },
              { id: "time", label: i18n("time") },
            ]}
            aria-label={i18n("trigger")}
            className="min-w-0"
          />
          <Input type="text" value={autoTrigger.value} onChange={(e) => setAutoTrigger({ ...autoTrigger, value: e.target.value })} placeholder={i18n("value")} className="min-w-0 flex-1" />
          <Select
            value={autoAction}
            onChange={setAutoAction}
            options={AUTOMATION_ACTIONS.map((a) => ({ id: a.id, label: a.label }))}
            aria-label={i18n("action")}
            className="min-w-0"
          />
          <Button type="button" variant="primary" size="md" onClick={handleAddAutomation}>{i18n("add")}</Button>
        </div>
        <div className="space-y-2">
          {brain.automations.map((rule) => (
            <Card3D key={rule.id}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{rule.trigger.type}: {rule.trigger.value}</p>
                  <p className="text-xs text-[var(--muted)]">{AUTOMATION_ACTIONS.find((a) => a.id === rule.actionId)?.label || rule.actionId}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => brain.toggleAutomationRule(rule.id)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-bg)]"><Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-4 w-4" /></button>
                  <button type="button" onClick={() => brain.removeAutomationRule(rule.id)} className="rounded p-1 text-[var(--danger)] hover:bg-[var(--panel-bg)]"><Icon name="trash-2" className="h-4 w-4" /></button>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>
    );
  }

  function renderProviders() {
    return (
      <div className="space-y-3">
        {brain.providers.map((p) => (
          <Card3D key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-xs text-[var(--muted)]">{p.privacy} — {p.status}</p>
              </div>
              <button
                type="button"
                onClick={() => brain.testProvider(p.id).then((res) => { if (res?.data) success(`${p.label}: ${res.data.latencyMs}ms`); }).catch((err) => showError(String(err)))}
                disabled={p.status !== "backend-ready" && p.status !== "ready"}
                className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs hover:bg-[var(--panel-bg)] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
              >
                {i18n("test")}
              </button>
            </div>
          </Card3D>
        ))}
      </div>
    );
  }

  function renderContext() {
    return (
      <div className="space-y-4">
        <BrainContextPanel />
        <Card3D>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{i18n("brainContextTitle")}</p>
            <span className="text-xs text-[var(--muted)]">{brain.context.route}</span>
          </div>
          <pre className="mt-2 max-h-[40vh] overflow-auto rounded-[var(--panel-radius)] bg-[var(--panel-bg)] p-3 text-xs text-[var(--foreground)]">
            {JSON.stringify(brain.context, null, 2)}
          </pre>
        </Card3D>
      </div>
    );
  }

  function renderPrivacy() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{i18n("brainPrivacyTitle")}</p>
        <Card3D>
          <div className="grid grid-cols-2 gap-2">
            {BRAIN_PERMISSION_CATEGORIES.map((p) => (
              <Checkbox
                key={p}
                checked={brain.preferences.permissions[p]}
                onCheckedChange={(checked) => brain.patch(`permissions.${p}`, checked)}
                label={p}
              />
            ))}
          </div>
        </Card3D>
      </div>
    );
  }

  function renderHistory() {
    if (brain.messages.length === 0) {
      return <p className="text-sm text-[var(--muted)]">{i18n("brainNoHistory")}</p>;
    }
    return (
      <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
        {brain.messages.map((m, i) => (
          <div key={i} className={`rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-3 ${m.role === "user" ? "bg-[var(--panel-bg)]" : "bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}>
            <p className="text-xs text-[var(--muted)]">{m.role === "user" ? i18n("you") : i18n("brainTitle")}</p>
            <p className="text-sm">{m.content}</p>
          </div>
        ))}
      </div>
    );
  }

  function renderDiagnostics() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{i18n("brainDiagnosticsTitle")}</p>
        <div className="space-y-2">
          {brain.providers.map((p) => (
            <Card3D key={p.id}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.label}</span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => brain.testProvider(p.id).then((res) => {
                    if (res?.data?.latencyMs) success(`${p.label} — ${res.data.latencyMs}ms`);
                    else showError(i18n("error"));
                  })}
                  disabled={p.status !== "backend-ready" && p.status !== "ready"}
                >
                  {i18n("brainRunDiagnostics")}
                </Button>
              </div>
              {brain.providerStatus?.provider === p.id && (
                <p className="text-xs text-[var(--muted)]">{i18n("brainLatency")}: {brain.providerStatus.latencyMs}ms</p>
              )}
              <p className="text-xs text-[var(--muted)]">{p.status} — {p.privacy}</p>
            </Card3D>
          ))}
        </div>
      </div>
    );
  }

  function renderWrapup() {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{i18n("brainWrapupTitle")}</p>
        {brain.messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{i18n("brainNoWrapup")}</p>
        ) : (
          <Card3D>
            <p className="text-sm">{brain.messages.length} messages</p>
            <p className="text-xs text-[var(--muted)]">{i18n("brainNoWrapup")}</p>
          </Card3D>
        )}
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => brain.send(i18n("wrapupPrompt"))}
          data-haptic
        >
          {i18n("brainWrapup")}
        </Button>
        <button
          type="button"
          onClick={() => setWrapupOpen(true)}
          data-haptic
          className="flex w-full items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-bg)] backdrop-blur-[var(--panel-blur)]"
        >
          <Icon name="sunset" className="h-4 w-4" /> {i18n("prepareTomorrow")}
        </button>
      </div>
    );
  }

  function renderWrapupSheet() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    function isTomorrow(iso?: string) {
      if (!iso) return false;
      const d = new Date(iso);
      return d >= tomorrow && d < tomorrowEnd;
    }

    const pendingTasks = tasks.items.filter((t) => !t.done);
    const tomorrowTasks = pendingTasks.filter((t) => isTomorrow(t.endAt));
    const tomorrowEvents = events.items.filter((e) => isTomorrow(e.startAt));

    return (
      <Modal
        isOpen={wrapupOpen}
        onClose={() => setWrapupOpen(false)}
        title={i18n("prepareTomorrow")}
        size="sm"
        position="bottom"
        hideFooter
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{i18n("brainWrapupTitle")}</p>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Icon name="tasks" className="h-4 w-4 text-[var(--accent)]" />
              {i18n("tasks")} ({tomorrowTasks.length})
            </h4>
            {tomorrowTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{i18n("noTasks")}</p>
            ) : (
              <ul className="space-y-2">
                {tomorrowTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-sm backdrop-blur-[var(--panel-blur)]">
                    <Icon name="circle" className="h-3 w-3 text-[var(--muted)]" />
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Icon name="calendar" className="h-4 w-4 text-[var(--accent)]" />
              {i18n("events")} ({tomorrowEvents.length})
            </h4>
            {tomorrowEvents.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">{i18n("noEvents")}</p>
            ) : (
              <ul className="space-y-2">
                {tomorrowEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 text-sm backdrop-blur-[var(--panel-blur)]">
                    <Icon name="clock-3" className="h-3 w-3 text-[var(--muted)]" />
                    {e.title}
                    {e.startAt && <span className="ml-auto text-xs text-[var(--muted)]">{new Date(e.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => { brain.send(i18n("wrapupPrompt")); setWrapupOpen(false); }}
            data-haptic
            className="w-full"
          >
            {i18n("brainWrapup")}
          </Button>
        </div>
      </Modal>
    );
  }

  function renderPreferences() {
    return (
      <div className="space-y-4">
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("persona")}</p>
          <div className="flex flex-wrap gap-2">
            {BRAIN_PERSONAS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => brain.patch("persona", p)}
                className={`rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs ${brain.preferences.persona === p ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "hover:bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}
              >
                {p}
              </button>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("tone")}</p>
          <div className="flex flex-wrap gap-2">
            {BRAIN_TONES.map((t) => (
              <button key={t} type="button" onClick={() => brain.patch("tone", t)} className={`rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs ${brain.preferences.tone === t ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "hover:bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}>{t}</button>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("detail")}</p>
          <div className="flex flex-wrap gap-2">
            {BRAIN_DETAIL.map((d) => (
              <button key={d} type="button" onClick={() => brain.patch("detail", d)} className={`rounded-[var(--panel-radius)] border border-[var(--panel-border)] px-3 py-1.5 text-xs ${brain.preferences.detail === d ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]" : "hover:bg-[var(--panel-bg)]"} backdrop-blur-[var(--panel-blur)]`}>{d}</button>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("activeProvider")}</p>
          <Select
            value={brain.preferences.provider.active}
            onChange={(value) => brain.patch("provider.active", value)}
            options={BRAIN_PROVIDERS.map((p) => ({ id: p, label: p }))}
            aria-label={i18n("provider")}
            className="min-w-0"
          />
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("permissions")}</p>
          <div className="grid grid-cols-2 gap-2">
            {BRAIN_PERMISSION_CATEGORIES.map((p) => (
              <Checkbox
                key={p}
                checked={brain.preferences.permissions[p]}
                onCheckedChange={(checked) => brain.patch(`permissions.${p}`, checked)}
                label={p}
              />
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("memoryCategories")}</p>
          <div className="grid grid-cols-2 gap-2">
            {BRAIN_MEMORY_CATEGORIES.map((c) => (
              <Checkbox
                key={c}
                checked={brain.preferences.memory.categories[c]}
                onCheckedChange={(checked) => brain.patch(`memory.categories.${c}`, checked)}
                label={c}
              />
            ))}
          </div>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden">
      <div className="shrink-0 mb-4 space-y-4">
        <h1 className="text-2xl font-bold">{i18n("brainTitle")}</h1>
        <TabList
          tabs={TABS.map((tab) => ({
            id: tab.id,
            label: i18n(tab.label),
            icon: <Icon name={tab.icon} className="h-4 w-4" />,
            content: null,
          }))}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as Tab)}
        />
      </div>
      <div className="min-h-0 w-full flex-1 overflow-hidden">
        <Card3D className="h-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-y-auto os-scroll">
            {activeTab === "chat" && renderChat()}
            {activeTab === "briefing" && <BrainBriefingPanel />}
            {activeTab === "context" && renderContext()}
            {activeTab === "memory" && renderMemory()}
            {activeTab === "actions" && renderActions()}
            {activeTab === "automations" && renderAutomations()}
            {activeTab === "providers" && renderProviders()}
            {activeTab === "preferences" && renderPreferences()}
            {activeTab === "privacy" && renderPrivacy()}
            {activeTab === "history" && renderHistory()}
            {activeTab === "diagnostics" && renderDiagnostics()}
            {activeTab === "wrapup" && renderWrapup()}
          </div>
        </Card3D>
      </div>
      {renderWrapupSheet()}
    </div>
  );
}
