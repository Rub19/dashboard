"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { activityJournal } from "@/lib/activity-journal";
import { useItems } from "./useItems";
import {
  type BrainPreferences,
  loadBrainPreferences,
  saveBrainPreferences,
  saveBrainPreferencesAsync,
  loadBrainPreferencesAsync,
  patchBrainPreferences,
  DEFAULT_BRAIN_PREFERENCES,
  BRAIN_PROVIDERS,
  BRAIN_MEMORY_CATEGORIES,
} from "@/lib/brain/preferences";
import { brainComplete, brainDiagnostic, brainProviderList } from "@/lib/brain/providers";
import { listBrainMemories, createBrainMemory, updateBrainMemory, removeBrainMemory, clearBrainMemories, type BrainMemory } from "@/lib/brain/memory";
import { createBrainActionRegistry } from "@/lib/brain/action-registry";
import { createAutomationWatcher, sanitizeAutomationTrigger, type AutomationRule } from "@/lib/brain/automation";

export type BrainMessage = { role: "user" | "assistant"; content: string; createdAt: number };

export function useBrain() {
  const router = useRouter();
  const { settings, update: updateSettings } = useSettings();
  const notes = useItems("notes");
  const tasks = useItems("tasks");
  const events = useItems("events");
  const [preferences, setPreferences] = useState<BrainPreferences>(DEFAULT_BRAIN_PREFERENCES);
  const [messages, setMessages] = useState<BrainMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{ provider: string; latencyMs: number } | null>(null);
  const watcherRef = useRef<ReturnType<typeof createAutomationWatcher> | null>(null);
  const automationsRef = useRef(preferences.automations);

  useEffect(() => {
    automationsRef.current = preferences.automations;
  });

  useEffect(() => {
    watcherRef.current = createAutomationWatcher(
      () => automationsRef.current,
      (rule) => {
        if (rule.actionId.startsWith("v8.density.")) updateSettings({ densityMode: rule.actionId.replace("v8.density.", "") as never });
        if (rule.actionId.startsWith("v8.theme.")) updateSettings({ theme: rule.actionId.replace("v8.theme.", "") as never });
        if (rule.actionId.startsWith("v8.space.")) {
          // spaces not persisted in settings; can be ignored or stored later
        }
      }
    );
    watcherRef.current.prime({ route: "home", space: "personal", localTime: undefined });
  }, [updateSettings]);

  useEffect(() => {
    const local = loadBrainPreferences();
    setPreferences(local);
    loadBrainPreferencesAsync().then((remote) => {
      if (remote) setPreferences((prev) => ({ ...prev, ...remote }));
    });
  }, []);

  useEffect(() => {
    saveBrainPreferences(preferences);
    saveBrainPreferencesAsync(preferences);
  }, [preferences]);

  const registry = useMemo(() => {
    return createBrainActionRegistry({
      permissions: preferences.permissions,
      createNote: (input: { title: string; body: string }) => notes.create(input as never),
      updateNote: (id: string, patch: { title?: string; body?: string }) => notes.update(id, patch as never),
      createTask: (input: { title: string; priority?: string; due?: string }) => tasks.create(input as never),
      completeTask: async (id: string) => {
        const item = tasks.items.find((t) => t.id === id);
        if (item?.done) return;
        await tasks.update(id, { done: true });
      },
      createEvent: (input: { title: string; date: string }) => events.create(input as never),
      changeSetting: async (setting, value) => {
        if (setting === "language") updateSettings({ language: value as "fr" | "en" | "es" | "de" });
        if (setting === "theme") updateSettings({ theme: value as never });
        if (setting === "accent") updateSettings({ accentColor: value as never });
        if (setting === "density") updateSettings({ densityMode: value as never });
      },
      navigate: (route) => router.push(`/${route === "home" ? "" : route}`),
    });
  }, [preferences.permissions, notes, tasks, events, router, updateSettings]);

  const providers = useMemo(() => brainProviderList(), []);

  async function send(prompt: string) {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    const userMessage: BrainMessage = { role: "user", content: prompt.trim(), createdAt: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    const baseUrl =
      preferences.provider.active === "ollama"
        ? settings.liveOllamaUrl
        : preferences.provider.active === "lm-studio"
        ? settings.liveLmStudioUrl
        : undefined;
    try {
      const res = await brainComplete({
        provider: preferences.provider.active,
        model: preferences.provider.model,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        context: { persona: preferences.persona, tone: preferences.tone, detail: preferences.detail, language: preferences.language },
        baseUrl,
      });
      const content = res?.data?.content || res?.data?.text || "Réponse vide.";
      setMessages((prev) => [...prev, { role: "assistant", content, createdAt: Date.now() }]);
      activityJournal.capture("v8.brain.call", { ok: true, prompt: prompt.trim().slice(0, 80) });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      activityJournal.capture("v8.brain.call", { ok: false });
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  function patch(path: string, value: unknown) {
    setPreferences((prev) => patchBrainPreferences(prev, path, value));
  }

  async function loadMemories() {
    setMemoriesLoaded(false);
    try {
      const data = await listBrainMemories();
      setMemories(data);
      setMemoriesLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async function saveMemory(input: { category: (typeof BRAIN_MEMORY_CATEGORIES)[number]; key: string; value: string }) {
    await createBrainMemory({ ...input, retentionDays: preferences.memory.retentionDays });
    await loadMemories();
  }

  async function editMemory(id: string, value: string) {
    await updateBrainMemory(id, value);
    await loadMemories();
  }

  async function deleteMemory(id: string) {
    await removeBrainMemory(id);
    await loadMemories();
  }

  async function clearAllMemories() {
    await clearBrainMemories();
    await loadMemories();
  }

  async function testProvider(id: string) {
    const baseUrl =
      id === "ollama" ? settings.liveOllamaUrl : id === "lm-studio" ? settings.liveLmStudioUrl : undefined;
    const res = await brainDiagnostic(id as (typeof BRAIN_PROVIDERS)[number], baseUrl);
    if (res?.data?.latencyMs) setProviderStatus({ provider: id, latencyMs: res.data.latencyMs });
    return res;
  }

  async function executeAction(id: string, parameters: Record<string, unknown> = {}, confirmed = false) {
    return registry.execute(id, parameters, confirmed);
  }

  function addAutomationRule(trigger: { type: string; value: string }, actionId: string) {
    const rule: AutomationRule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enabled: true,
      trigger: sanitizeAutomationTrigger(trigger),
      actionId,
      createdAt: Date.now(),
    };
    setPreferences((prev) => ({ ...prev, automations: [...prev.automations, rule] }));
  }

  function toggleAutomationRule(id: string) {
    setPreferences((prev) => ({
      ...prev,
      automations: prev.automations.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    }));
  }

  function removeAutomationRule(id: string) {
    setPreferences((prev) => ({ ...prev, automations: prev.automations.filter((r) => r.id !== id) }));
  }

  function runAutomations(state: { route?: string; space?: string; localTime?: string }) {
    if (!watcherRef.current) return [];
    return watcherRef.current.check(state);
  }

  const suggestions = useMemo(() => {
    return [
      { id: "note.create", title: "Créer une note", detail: "Ajoute rapidement une note.", action: "note.create", parameters: { title: "Idée Brain", content: "" } },
      { id: "task.create", title: "Créer une tâche", detail: "Ajoute une tâche avec rappel.", action: "task.create", parameters: { title: "Action Brain", priority: "normal" } },
      { id: "planning.prepare", title: "Préparer un planning", detail: "Crée des tâches et événements.", action: "planning.prepare", parameters: { tasks: [{ title: "Tâche 1", priority: "normal" }], events: [] } },
    ];
  }, []);

  return {
    preferences,
    patch,
    messages,
    loading,
    error,
    send,
    clearChat,
    memories,
    memoriesLoaded,
    loadMemories,
    saveMemory,
    editMemory,
    deleteMemory,
    clearAllMemories,
    providers,
    providerStatus,
    testProvider,
    registry,
    executeAction,
    automations: preferences.automations,
    addAutomationRule,
    toggleAutomationRule,
    removeAutomationRule,
    runAutomations,
    suggestions,
  };
}
