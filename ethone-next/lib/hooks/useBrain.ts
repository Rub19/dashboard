"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { askBrainAI } from "@/lib/brain/ai-engine";
import { listBrainMemories, createBrainMemory, updateBrainMemory, removeBrainMemory, clearBrainMemories, type BrainMemory } from "@/lib/brain/memory";
import { createBrainActionRegistry, type BrainMailClient } from "@/lib/brain/action-registry";
import { createAutomationWatcher, sanitizeAutomationTrigger, type AutomationRule } from "@/lib/brain/automation";
import { supabase } from "@/lib/supabase";

export type BrainAttachment = {
  id: string;
  name: string;
  type: "file" | "image" | "note" | "document" | "context";
  size?: string;
  content?: string;
};

export type ActionExecution = {
  id: string;
  type: "note" | "task" | "event" | "flow" | "search" | "analysis";
  step: "analyzing" | "executing" | "done" | "error";
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
};

export type BrainMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  provider?: string;
  model?: string;
  durationMs?: number;
  fallback?: boolean;
  attachments?: BrainAttachment[];
  actions?: ActionExecution[];
  actionExecution?: ActionExecution;
};

export type BrainConversation = {
  id: string;
  title: string;
  messages: BrainMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  favorite?: boolean;
};

const STORAGE_KEY_CONVERSATIONS = "ethone:brain:conversations";
const STORAGE_KEY_ACTIVE_CONV = "ethone:brain:active_conversation";

function createInitialConversation(): BrainConversation {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`,
    title: "Nouvelle discussion",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: "auto",
  };
}

export function useBrain(mailClient?: BrainMailClient) {
  const router = useRouter();
  const { settings, update: updateSettings } = useSettings();
  const notes = useItems("notes");
  const tasks = useItems("tasks");
  const events = useItems("events");
  const [preferences, setPreferences] = useState<BrainPreferences>(DEFAULT_BRAIN_PREFERENCES);
  
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const convStorageKey = currentUserId ? `ethone:brain:convs:${currentUserId}` : `ethone:brain:convs:guest`;
  const activeConvStorageKey = currentUserId ? `ethone:brain:active_conv:${currentUserId}` : `ethone:brain:active_conv:guest`;

  // Conversations State
  const [conversations, setConversations] = useState<BrainConversation[]>(() => {
    if (typeof window === "undefined") return [createInitialConversation()];
    return [createInitialConversation()];
  });

  const [activeConvId, setActiveConvId] = useState<string>("default");

  // Re-sync conversations when current user changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(convStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          const savedId = localStorage.getItem(activeConvStorageKey);
          if (savedId && parsed.some((c: BrainConversation) => c.id === savedId)) {
            setActiveConvId(savedId);
          } else {
            setActiveConvId(parsed[0].id);
          }
          return;
        }
      }
    } catch {}
    const initial = [createInitialConversation()];
    setConversations(initial);
    setActiveConvId(initial[0].id);
  }, [convStorageKey, activeConvStorageKey]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConvId) || conversations[0] || createInitialConversation();
  }, [conversations, activeConvId]);

  const messages = activeConversation.messages;

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "thinking" | "executing" | "done">("idle");
  const [error, setError] = useState<Error | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(activeConversation.model || "auto");
  const [activeAttachments, setActiveAttachments] = useState<BrainAttachment[]>([]);
  const [memories, setMemories] = useState<BrainMemory[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [providerStatus, setProviderStatus] = useState<{ provider: string; latencyMs: number } | null>(null);
  
  const watcherRef = useRef<ReturnType<typeof createAutomationWatcher> | null>(null);
  const automationsRef = useRef(preferences.automations);
  const brainCtx = useBrainContext();

  // Save conversations to localStorage scoped to user
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(convStorageKey, JSON.stringify(conversations));
      localStorage.setItem(activeConvStorageKey, activeConvId);
    } catch {}
  }, [conversations, activeConvId, convStorageKey, activeConvStorageKey]);

  useEffect(() => {
    automationsRef.current = preferences.automations;
  });

  useEffect(() => {
    watcherRef.current = createAutomationWatcher(
      () => automationsRef.current,
      (rule) => {
        if (rule.actionId.startsWith("v8.density.")) updateSettings({ densityMode: rule.actionId.replace("v8.density.", "") as never });
        if (rule.actionId.startsWith("v8.theme.")) updateSettings({ theme: rule.actionId.replace("v8.theme.", "") as never });
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

  // Conversation Helpers
  const createNewConversation = useCallback(() => {
    const newConv = createInitialConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setError(null);
    return newConv.id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setError(null);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length === 0) {
        const fresh = createInitialConversation();
        setActiveConvId(fresh.id);
        return [fresh];
      }
      return filtered;
    });
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
    );
  }, []);

  const toggleFavoriteConversation = useCallback((id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c))
    );
  }, []);

  const setConversationMessages = useCallback(
    (updater: (prev: BrainMessage[]) => BrainMessage[]) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeConvId) return c;
          const nextMessages = updater(c.messages);
          // Auto generate title from first user message if default
          let title = c.title;
          if (c.title === "Nouvelle conversation" && nextMessages.length > 0) {
            const firstUser = nextMessages.find((m) => m.role === "user");
            if (firstUser) {
              title = firstUser.content.slice(0, 32) + (firstUser.content.length > 32 ? "…" : "");
            }
          }
          return { ...c, messages: nextMessages, title, updatedAt: Date.now() };
        })
      );
    },
    [activeConvId]
  );

  const addAttachment = useCallback((att: BrainAttachment) => {
    setActiveAttachments((prev) => [...prev, att]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setActiveAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setActiveAttachments([]);
  }, []);

  async function completeBrain(currentMessages: BrainMessage[], promptText: string, attachments: BrainAttachment[]) {
    const startTime = Date.now();
    setCurrentStep("thinking");
    
    // Check if user is asking for action execution
    const lower = promptText.toLowerCase();
    let actionPlan: ActionExecution | undefined = undefined;
    let pendingNoteTitle: string | null = null;

    if (
      lower.includes("crée une note") ||
      lower.includes("créer une note") ||
      lower.includes("fais une note") ||
      lower.includes("ajoute une note") ||
      lower.startsWith("note :")
    ) {
      const topic = promptText
        .replace(/^(peux-tu|tu peux|stp|s'il te plaît|s'il te plait|merci de)?\s*(créer|crée|ajouter|ajoute|faire|fais)\s*(moi)?\s*(une|la)?\s*note\s*(sur|pour|concernant|:)?/i, "")
        .trim();
      pendingNoteTitle = topic || "Nouvelle note Brain";
      actionPlan = {
        id: `act-${Date.now()}`,
        type: "note",
        step: "executing",
        title: `Note créée : "${pendingNoteTitle}"`,
        detail: "Génération et enregistrement du contenu Markdown...",
      };
    } else if (
      lower.includes("crée une tâche") ||
      lower.includes("créer une tâche") ||
      lower.includes("ajoute une tâche") ||
      lower.includes("nouvelle tâche")
    ) {
      const taskTopic = promptText
        .replace(/^(peux-tu|tu peux|stp|s'il te plaît|s'il te plait|merci de)?\s*(créer|crée|ajouter|ajoute|faire|fais)\s*(moi)?\s*(une|la)?\s*tâche\s*(sur|pour|concernant|:)?/i, "")
        .trim() || "Nouvelle tâche Brain";
      try {
        await tasks.create({
          title: taskTopic,
          body: "Créée par Brain IA",
        });
      } catch {}
      actionPlan = {
        id: `act-${Date.now()}`,
        type: "task",
        step: "done",
        title: `Tâche créée : "${taskTopic}"`,
        detail: "Ajoutée à votre gestionnaire de tâches.",
      };
    } else if (lower.includes("focus") || lower.includes("scène") || lower.includes("scene")) {
      if (lower.includes("nuit") || lower.includes("night") || lower.includes("coding")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ethone:scene:trigger", { detail: { scene: "night-coding" } }));
        }
        actionPlan = {
          id: `act-${Date.now()}`,
          type: "task",
          step: "done",
          title: "Scène 'Night Coding' activée",
          detail: "Ambiance pluie & Deep Work lancés.",
        };
      } else if (lower.includes("forêt") || lower.includes("forest")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ethone:scene:trigger", { detail: { scene: "deep-forest" } }));
        }
        actionPlan = {
          id: `act-${Date.now()}`,
          type: "task",
          step: "done",
          title: "Scène 'Deep Forest' activée",
          detail: "Ambiance forêt lancée.",
        };
      } else if (lower.includes("café") || lower.includes("cozy")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ethone:scene:trigger", { detail: { scene: "cozy-study" } }));
        }
        actionPlan = {
          id: `act-${Date.now()}`,
          type: "task",
          step: "done",
          title: "Scène 'Cozy Study' activée",
          detail: "Ambiance café lancée.",
        };
      }
    } else if (lower.includes("thème sombre") || lower.includes("mode sombre") || lower.includes("dark mode")) {
      updateSettings({ theme: "obsidian" });
      actionPlan = {
        id: `act-${Date.now()}`,
        type: "task",
        step: "done",
        title: "Thème sombre Obsidian appliqué",
        detail: "Apparence ajustée.",
      };
    } else if (lower.includes("thème clair") || lower.includes("mode clair") || lower.includes("light mode")) {
      updateSettings({ theme: "solar-eclipse" });
      actionPlan = {
        id: `act-${Date.now()}`,
        type: "task",
        step: "done",
        title: "Thème Solar Eclipse appliqué",
        detail: "Apparence ajustée.",
      };
    }

    const baseUrl =
      preferences.provider.active === "ollama"
        ? settings.liveOllamaUrl
        : preferences.provider.active === "lm-studio"
        ? settings.liveLmStudioUrl
        : undefined;

    try {
      const aiResponse = await askBrainAI({
        messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
        modelId: selectedModel,
        systemPrompt:
          "Tu es Brain, l'assistant IA intégré à ETHONE OS. Réponds avec un Markdown riche, soigné et bien structuré (titres, listes à puces, citations, cases à cocher, gras). Lorsque l'utilisateur te demande de créer une note, synthétise et rédige le contenu complet de la note en Markdown.",
      });

      const content = aiResponse.content;
      const providerName = aiResponse.provider;
      const modelName = aiResponse.model || selectedModel;

      // If this was a note creation prompt, save the full generated markdown content to Notes
      if (pendingNoteTitle) {
        try {
          await notes.create({
            title: pendingNoteTitle,
            body: content,
          });
        } catch (nErr) {
          console.warn("Error creating note from AI response:", nErr);
        }
      }

    const durationMs = Date.now() - startTime;
    
    if (actionPlan) {
      actionPlan.step = "done";
      actionPlan.detail = "Action exécutée avec succès dans ETHONE OS";
    }

    const assistantMessage: BrainMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content,
      createdAt: Date.now(),
      provider: providerName,
      model: modelName,
      durationMs,
      actionExecution: actionPlan,
    };

      setConversationMessages((prev) => [...prev, assistantMessage]);
      setError(null);
      setCurrentStep("done");
      setTimeout(() => setCurrentStep("idle"), 1500);
      activityJournal.capture("v8.brain.call", { ok: true, prompt: promptText.slice(0, 80) });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setCurrentStep("idle");
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

    const userMessage: BrainMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      createdAt: Date.now(),
      attachments: [...activeAttachments],
    };

    const nextMessages = [...messages, userMessage];
    setConversationMessages((prev) => [...prev, userMessage]);
    const currentAtts = [...activeAttachments];
    setActiveAttachments([]);

    await completeBrain(nextMessages, prompt.trim(), currentAtts);
  }

  async function retry() {
    if (!lastPrompt || loading) return;
    setLoading(true);
    setError(null);
    await completeBrain(messages, lastPrompt, activeAttachments);
  }

  function clearChat() {
    setConversationMessages(() => []);
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
      { id: "note.create", title: "Créer une note", detail: "Ajoute une note rapide.", action: "note.create", parameters: { title: "Idée Brain", body: "" } },
      { id: "task.create", title: "Créer une tâche", detail: "Ajoute une tâche avec rappel.", action: "task.create", parameters: { title: "Action Brain", priority: "normal" } },
      { id: "planning.prepare", title: "Résumer ma journée", detail: "Synthèse de l'activité.", action: "planning.prepare", parameters: { tasks: [], events: [] } },
      { id: "analyze.files", title: "Analyser un fichier", detail: "Examen de documents.", action: "file.analyze", parameters: {} },
    ];
  }, []);

  return {
    preferences,
    patch,
    // Conversation management
    conversations,
    activeConvId,
    activeConversation,
    createNewConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    toggleFavoriteConversation,
    messages,
    loading,
    currentStep,
    error,
    lastPrompt,
    retry,
    send,
    clearChat,
    // Models & Attachments
    selectedModel,
    setSelectedModel,
    activeAttachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    // Memories
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
