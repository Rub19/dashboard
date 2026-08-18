"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/components/SettingsProvider";
import { activityJournal } from "@/lib/activity-journal";
import { useBrainContext } from "./useBrainContext";
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
import { createBrainActionRegistry, type BrainMailClient } from "@/lib/brain/action-registry";
import { createAutomationWatcher, sanitizeAutomationTrigger, type AutomationRule } from "@/lib/brain/automation";

export type BrainMessage = { role: "user" | "assistant"; content: string; createdAt: number; provider?: string; fallback?: boolean };

export function useBrain(mailClient?: BrainMailClient) {
  const router = useRouter();
  const { settings, update: updateSettings } = useSettings();
  const notes = useItems("notes");
  const tasks = useItems("tasks");
  const events = useItems("events");
  const [preferences, setPreferences] = useState<BrainPreferences>(DEFAULT_BRAIN_PREFERENCES);
  const [messages, setMessages] = useState<BrainMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{ provider: string; latencyMs: number } | null>(null);
  const watcherRef = useRef<ReturnType<typeof createAutomationWatcher> | null>(null);
  const automationsRef = useRef(preferences.automations);
  const brainCtx = useBrainContext();

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
      mailClient,
    });
  }, [preferences.permissions, notes, tasks, events, router, updateSettings, mailClient]);

  const providers = useMemo(() => brainProviderList(), []);

  function isModelUnavailable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const status = (err as { status?: number }).status;
    const code = (err as { code?: string }).code;
    const detail = (err as { detail?: { code?: string; error?: { code?: string; message?: string } } }).detail;
    if (status === 404 && code === "PROVIDER_NOT_FOUND") return true;
    if (detail?.code === "model_not_found" || detail?.code === "model_decommissioned") return true;
    if (detail?.error?.code === "model_not_found" || detail?.error?.code === "model_decommissioned") return true;
    const message = String(err.message || "").toLowerCase();
    const detailMsg = String(detail?.error?.message || "").toLowerCase();
    return message.includes("does not exist or you do not have access") ||
      message.includes("model_not_found") ||
      message.includes("decommissioned") ||
      message.includes("no longer supported") ||
      detailMsg.includes("decommissioned") ||
      detailMsg.includes("no longer supported");
  }

  function normalizeBrainError(err: unknown): Error {
    if (!(err instanceof Error)) return new Error(String(err));
    if (isModelUnavailable(err)) {
      const friendly = new Error("Le modèle IA demandé est indisponible ou a été mis à jour. Nouvelle tentative avec le modèle de secours...");
      (friendly as { retryable?: boolean }).retryable = true;
      return friendly;
    }
    const msg = String(err.message || "");
    if (msg.includes("SERVICE_NOT_CONFIGURED") || msg.includes("501")) {
      const friendly = new Error("Le service IA n'est pas encore configuré avec une clé API active.");
      (friendly as { retryable?: boolean }).retryable = false;
      return friendly;
    }
    if (msg.includes("429") || msg.includes("RATE_LIMIT") || msg.includes("quota")) {
      const friendly = new Error("Limite de requêtes atteinte momentanément. Veuillez patienter quelques secondes.");
      (friendly as { retryable?: boolean }).retryable = true;
      return friendly;
    }
    return err;
  }

  async function completeBrain(currentMessages: BrainMessage[], promptText: string) {
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
        messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        context: {
          persona: preferences.persona,
          tone: preferences.tone,
          detail: preferences.detail,
          language: preferences.language,
          systemContext: brainCtx.context,
          recentMemory: brainCtx.recent,
        },
        baseUrl,
      });
      const content = res?.data?.content || res?.data?.text || "Réponse vide.";
      setMessages((prev) => [...prev, { role: "assistant", content, createdAt: Date.now(), provider: res?.data?.provider, fallback: res?.data?.fallback }]);
      setError(null);
      activityJournal.capture("v8.brain.call", { ok: true, prompt: promptText.slice(0, 80) });
    } catch (err) {
      setError(normalizeBrainError(err));
      activityJournal.capture("v8.brain.call", { ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function send(prompt: string) {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setLastPrompt(prompt.trim());
    const userMessage: BrainMessage = { role: "user", content: prompt.trim(), createdAt: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    await completeBrain(nextMessages, prompt.trim());
  }

  async function retry() {
    if (!lastPrompt || loading) return;
    setLoading(true);
    setError(null);
    await completeBrain(messages, lastPrompt);
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
    lastPrompt,
    retry,
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
    context: brainCtx.context,
    recentMemory: brainCtx.recent,
    remember: brainCtx.remember,
    recall: brainCtx.recall,
    recallByCategory: brainCtx.recallByCategory,
    forget: brainCtx.forget,
    clearSensitiveMemory: brainCtx.clearSensitive,
    pruneExpired: brainCtx.pruneExpired,
  };
}

export type ReturnTypeOfUseBrain = ReturnType<typeof useBrain>;
