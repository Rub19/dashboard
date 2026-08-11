"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import Card3D from "@/components/Card3D";
import { Icon } from "@/lib/icons";
import { useToast } from "@/components/ToastProvider";
import { BRAIN_MEMORY_CATEGORIES, BRAIN_PERSONAS, BRAIN_TONES, BRAIN_DETAIL, BRAIN_PROVIDERS, BRAIN_PERMISSION_CATEGORIES, type BrainMemoryCategory } from "@/lib/brain/preferences";
import { AUTOMATION_ACTIONS } from "@/lib/brain/automation";

type Tab = "chat" | "memory" | "actions" | "automations" | "providers" | "preferences";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "chat", icon: "message-circle" },
  { id: "memory", label: "memory", icon: "database" },
  { id: "actions", label: "actions", icon: "zap" },
  { id: "automations", label: "automations", icon: "workflow" },
  { id: "providers", label: "providers", icon: "cpu" },
  { id: "preferences", label: "preferences", icon: "settings" },
];

export default function BrainPage() {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const brain = useBrain();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [prompt, setPrompt] = useState("");
  const [memoryCategory, setMemoryCategory] = useState<BrainMemoryCategory>("interface");
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryValue, setMemoryValue] = useState("");
  const [actionParams, setActionParams] = useState<Record<string, Record<string, unknown>>>({});
  const [autoTrigger, setAutoTrigger] = useState<{ type: string; value: string }>({ type: "route", value: "home" });
  const [autoAction, setAutoAction] = useState<string>(AUTOMATION_ACTIONS[0].id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [brain.messages, brain.loading]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    brain.send(prompt).then(() => setPrompt("")).catch((err) => showError(String(err)));
  }

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
    return (
      <div className="flex h-[60vh] flex-col gap-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {brain.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">{i18n("noBrainMessages")}</p>
          ) : (
            brain.messages.map((message, i) => (
              <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[80%] items-start gap-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${message.role === "user" ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-raised)] text-[var(--foreground)]"}`}>
                  {message.role === "assistant" && <Icon name="brain" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {brain.loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-[var(--muted)]">
                <Icon name="loader-2" className="h-4 w-4 animate-spin" />
                <Icon name="brain" className="h-4 w-4 text-[var(--accent)]" />
              </div>
            </div>
          )}
          {brain.error && <p className="text-center text-sm text-red-400">{brain.error.message}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-wrap gap-2">
          {brain.suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setActionParams({ [s.action]: s.parameters }); brain.executeAction(s.action, s.parameters, false).then((r) => r.ok ? success(r.message || i18n("completed")) : showError(r.message || i18n("error"))).catch((err) => showError(String(err))); }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--surface-raised)]"
            >
              {s.title}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-[var(--border)] pt-4">
          <textarea
            id="brain-prompt"
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
            aria-label={i18n("askQuestion")}
            className="min-h-[2.75rem] w-full flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
            placeholder={i18n("placeholder")}
            disabled={brain.loading}
          />
          <button
            type="submit"
            disabled={brain.loading || !prompt.trim()}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {brain.loading ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="send" className="h-4 w-4" />}
            {i18n("send")}
          </button>
        </form>
      </div>
    );
  }

  function renderMemory() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={memoryCategory} onChange={(e) => setMemoryCategory(e.target.value as BrainMemoryCategory)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
            {BRAIN_MEMORY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" value={memoryKey} onChange={(e) => setMemoryKey(e.target.value)} placeholder={i18n("key")} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <input type="text" value={memoryValue} onChange={(e) => setMemoryValue(e.target.value)} placeholder={i18n("value")} className="min-w-0 flex-[2] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <button type="button" onClick={handleSaveMemory} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">{i18n("save")}</button>
        </div>
        <button type="button" onClick={brain.loadMemories} className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-raised)]">{i18n("loadMemories")}</button>
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
                }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"><Icon name="pencil" className="h-4 w-4" /></button>
                <button type="button" onClick={() => handleDeleteMemory(m.id)} className="rounded p-1 text-red-400 hover:bg-[var(--surface-raised)]"><Icon name="trash-2" className="h-4 w-4" /></button>
              </div>
            </Card3D>
          ))}
        </div>
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
                <button type="button" onClick={() => handleExecute(def.id)} className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">{i18n("execute")}</button>
              </div>
              <p className="text-xs text-[var(--muted)]">{def.description}</p>
              {Object.entries(def.parameters).map(([key, type]) => (
                <input
                  key={key}
                  type="text"
                  value={String(actionParams[def.id]?.[key] ?? "")}
                  onChange={(e) => updateParam(def.id, key, type?.includes("[]") ? e.target.value.split(",") : e.target.value)}
                  placeholder={`${key} (${String(type)})`}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
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
          <select value={autoTrigger.type} onChange={(e) => setAutoTrigger({ type: e.target.value, value: e.target.value === "time" ? "09:00" : "home" })} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
            <option value="route">{i18n("route")}</option>
            <option value="space">{i18n("space")}</option>
            <option value="time">{i18n("time")}</option>
          </select>
          <input type="text" value={autoTrigger.value} onChange={(e) => setAutoTrigger({ ...autoTrigger, value: e.target.value })} placeholder={i18n("value")} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <select value={autoAction} onChange={(e) => setAutoAction(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
            {AUTOMATION_ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <button type="button" onClick={handleAddAutomation} className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">{i18n("add")}</button>
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
                  <button type="button" onClick={() => brain.toggleAutomationRule(rule.id)} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-raised)]"><Icon name={rule.enabled ? "toggle-right" : "toggle-left"} className="h-4 w-4" /></button>
                  <button type="button" onClick={() => brain.removeAutomationRule(rule.id)} className="rounded p-1 text-red-400 hover:bg-[var(--surface-raised)]"><Icon name="trash-2" className="h-4 w-4" /></button>
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
                className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-raised)] disabled:opacity-50"
              >
                {i18n("test")}
              </button>
            </div>
          </Card3D>
        ))}
      </div>
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
                className={`rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs ${brain.preferences.persona === p ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-raised)]"}`}
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
              <button key={t} type="button" onClick={() => brain.patch("tone", t)} className={`rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs ${brain.preferences.tone === t ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-raised)]"}`}>{t}</button>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("detail")}</p>
          <div className="flex flex-wrap gap-2">
            {BRAIN_DETAIL.map((d) => (
              <button key={d} type="button" onClick={() => brain.patch("detail", d)} className={`rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs ${brain.preferences.detail === d ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface-raised)]"}`}>{d}</button>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("activeProvider")}</p>
          <select value={brain.preferences.provider.active} onChange={(e) => brain.patch("provider.active", e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm">
            {BRAIN_PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("permissions")}</p>
          <div className="grid grid-cols-2 gap-2">
            {BRAIN_PERMISSION_CATEGORIES.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={brain.preferences.permissions[p]}
                  onChange={(e) => brain.patch(`permissions.${p}`, e.target.checked)}
                />
                {p}
              </label>
            ))}
          </div>
        </Card3D>
        <Card3D>
          <p className="mb-2 text-sm font-medium">{i18n("memoryCategories")}</p>
          <div className="grid grid-cols-2 gap-2">
            {BRAIN_MEMORY_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={brain.preferences.memory.categories[c]}
                  onChange={(e) => brain.patch(`memory.categories.${c}`, e.target.checked)}
                />
                {c}
              </label>
            ))}
          </div>
        </Card3D>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{i18n("brainTitle")}</h1>
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${activeTab === tab.id ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface-raised)]"}`}
          >
            <Icon name={tab.icon} className="h-4 w-4" />
            {i18n(tab.label)}
          </button>
        ))}
      </div>
      <Card3D>
        {activeTab === "chat" && renderChat()}
        {activeTab === "memory" && renderMemory()}
        {activeTab === "actions" && renderActions()}
        {activeTab === "automations" && renderAutomations()}
        {activeTab === "providers" && renderProviders()}
        {activeTab === "preferences" && renderPreferences()}
      </Card3D>
    </div>
  );
}
