"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/components/SettingsProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import type { BrainMessage, ReturnTypeOfUseBrain } from "@/lib/hooks/useBrain";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { useI18n } from "@/lib/hooks/useI18n";
import { useNowPlaying } from "@/lib/hooks/useNowPlaying";
import { hapticSuccessPattern, hapticErrorPattern, hapticMediumImpact } from "@/lib/haptics";
import { useToast } from "@/components/ToastProvider";
import { useLiveData } from "@/lib/hooks/useLiveData";
import { useUserData } from "@/lib/hooks/useUserData";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Icon } from "@/lib/icons";
import {
  Sparkles,
  ArrowUp,
  FilePlus,
  CircleCheck,
  Zap,
  Music,
  History,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import TextArea from "@/components/Textarea";

type ActionChip = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function extractContentActions(content: string, handlers: {
  createNote: (title?: string) => void;
  createTask: (title?: string) => void;
  runFlow: (id?: string) => void;
  openMail: () => void;
  openPlanning: () => void;
}): ActionChip[] {
  const chips: ActionChip[] = [];
  const lower = content.toLowerCase();
  const has = (keys: string[]) => keys.some((k) => lower.includes(k));
  if (has(["note", "noter", "noté"]) && !chips.find((c) => c.id === "note")) {
    chips.push({
      id: "note",
      label: "Créer une note",
      icon: <FilePlus className="h-3.5 w-3.5" />,
      onClick: () => handlers.createNote(),
    });
  }
  if (has(["tâche", "task", "taches"]) && !chips.find((c) => c.id === "task")) {
    chips.push({
      id: "task",
      label: "Ajouter une tâche",
      icon: <CircleCheck className="h-3.5 w-3.5" />,
      onClick: () => handlers.createTask(),
    });
  }
  if (has(["flow", "focus", "studio", "personal", "gaming"]) && !chips.find((c) => c.id === "flow")) {
    const flowId = ["focus", "studio", "personal", "gaming"].find((k) => lower.includes(k));
    chips.push({
      id: "flow",
      label: "Lancer un Flow",
      icon: <Zap className="h-3.5 w-3.5" />,
      onClick: () => handlers.runFlow(flowId),
    });
  }
  if (has(["mail", "email", "courriel", "message"]) && !chips.find((c) => c.id === "mail")) {
    chips.push({
      id: "mail",
      label: "Ouvrir le mail",
      icon: <Icon name="mail" className="h-3.5 w-3.5" />,
      onClick: () => handlers.openMail(),
    });
  }
  if (has(["planning", "plan", "agenda", "calendrier"]) && !chips.find((c) => c.id === "planning")) {
    chips.push({
      id: "planning",
      label: "Préparer le planning",
      icon: <History className="h-3.5 w-3.5" />,
      onClick: () => handlers.openPlanning(),
    });
  }
  return chips.slice(0, 4);
}

function renderMarkdown(text: string) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(<MarkdownInline key={parts.length} text={text.slice(last, match.index)} />);
    const lang = match[1] || "code";
    const code = match[2];
    parts.push(
      <div key={parts.length} className="my-2 overflow-hidden rounded-lg border border-white/10 bg-black/50">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] text-zinc-400">
          <span>{lang}</span>
          <CopyButton text={code} />
        </div>
        <pre className="max-h-48 overflow-auto p-3 text-xs text-zinc-200">
          <code className="font-mono">{code}</code>
        </pre>
      </div>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<MarkdownInline key={parts.length} text={text.slice(last)} />);
  if (parts.length === 0) parts.push(<MarkdownInline key={0} text={text} />);
  return parts;
}

function MarkdownInline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const inlineRegex = /(\*\*|\*|`|\_|\[)(?:(?!\1)[^\\]|\\.)*?\1/g;
  let last = 0;
  let match;
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={parts.length}>{text.slice(last, match.index)}</span>);
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      parts.push(<strong key={parts.length} className="font-semibold text-zinc-100">{raw.slice(2, -2)}</strong>);
    } else if ((raw.startsWith("*") && raw.endsWith("*")) || (raw.startsWith("_") && raw.endsWith("_"))) {
      parts.push(<em key={parts.length} className="text-zinc-300">{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      parts.push(
        <code key={parts.length} className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[11px] text-emerald-300">
          {raw.slice(1, -1)}
        </code>
      );
    }
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push(<span key={parts.length}>{text.slice(last)}</span>);
  if (parts.length === 0) return <>{text}</>;
  return <>{parts}</>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }
  return (
    <button type="button" onClick={handleCopy} className="text-[10px] text-[var(--muted)] hover:text-[var(--text-primary)] transition-colors">
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/[0.08] bg-zinc-950/80 w-fit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-zinc-400"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function BrainChat({ brain, className = "" }: { brain: ReturnTypeOfUseBrain; className?: string }) {
  const i18n = useI18n();
  const { user } = useAuth();
  const { activeProfile } = useActiveProfile();
  const { profile: publicProfile } = useProfile();
  const { success, error: showError } = useToast();
  const { records } = useLiveData(60000);
  const { items: flows } = useUserData("flow");
  const { nowPlaying } = useNowPlaying();
  const [activeWorkspace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const setIsThinking = useBrainActivityStore((s) => s.setIsThinking);

  useEffect(() => {
    setIsThinking(brain.loading);
  }, [brain.loading, setIsThinking]);

  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState<Record<number, number>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userName = publicProfile?.display_name || activeProfile?.name || user?.user_metadata?.full_name || user?.email || i18n("guest");
  const activeFlows = flows.filter((f) => f.count > 0).length;

  const handleSend = useCallback(
    (value = prompt) => {
      const text = value.trim();
      if (!text || pending) return;
      setPrompt("");
      setPending(true);
      hapticMediumImpact();
      brain
        .send(text)
        .then(() => {
          setPending(false);
          hapticSuccessPattern();
        })
        .catch((err) => {
          setPending(false);
          hapticErrorPattern();
          showError(String(err));
        });
    },
    [brain, pending, prompt, showError]
  );

  const handleExecute = useCallback(
    async (actionId: string, parameters: Record<string, unknown> = {}) => {
      hapticMediumImpact();
      const res = await brain.executeAction(actionId, parameters, true);
      if (res.ok) {
        hapticSuccessPattern();
        success(res.message || i18n("completed"));
      } else {
        hapticErrorPattern();
        showError(res.message || i18n("error"));
      }
    },
    [brain, i18n, showError, success]
  );

  const welcomeChips = useMemo<ActionChip[]>(() => {
    return [
      {
        id: "note",
        label: "Créer une nouvelle note",
        icon: <FilePlus className="h-3.5 w-3.5" />,
        onClick: () => handleExecute("note.create", { title: "Idée Brain", body: "" }),
      },
      {
        id: "flow",
        label: `Lancer le flow ${i18n(activeWorkspace || "personal")}`,
        icon: <Zap className="h-3.5 w-3.5" />,
        onClick: () => handleExecute("v8.space.focus", { space: activeWorkspace || "personal" }),
      },
      {
        id: "media",
        label: nowPlaying?.title ? `Résumé média : ${nowPlaying.title}` : "Résumé média",
        icon: <Music className="h-3.5 w-3.5" />,
        onClick: () => handleSend(nowPlaying?.title ? `Résume le média en cours : ${nowPlaying.title}` : "Résume ma musique en cours"),
      },
      {
        id: "activity",
        label: "Rapport d'activité",
        icon: <History className="h-3.5 w-3.5" />,
        onClick: () => handleSend("Fais-moi un rapport de mon activité récente"),
      },
    ];
  }, [activeWorkspace, handleExecute, handleSend, i18n, nowPlaying]);

  const actionHandlers = useMemo(
    () => ({
      createNote: (title?: string) => handleExecute("note.create", { title: title || "Note Brain", body: "" }),
      createTask: (title?: string) => handleExecute("task.create", { title: title || "Tâche Brain", priority: "normal" }),
      runFlow: (id?: string) => handleExecute("v8.space.focus", { space: id || activeWorkspace || "personal" }),
      openMail: () => handleExecute("v8.navigate", { route: "mail" }),
      openPlanning: () => handleExecute("planning.prepare", { tasks: [], events: [] }),
    }),
    [activeWorkspace, handleExecute]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [brain.messages, typed, pending]);

  useEffect(() => {
    if (brain.messages.length === 0) return;
    const lastIdx = brain.messages.length - 1;
    const last = brain.messages[lastIdx];
    if (last.role !== "assistant") return;
    const full = last.content;
    if (typed[lastIdx] >= full.length) return;
    const interval = setInterval(() => {
      setTyped((prev) => {
        const next = (prev[lastIdx] || 0) + 2;
        if (next >= full.length) {
          clearInterval(interval);
          return { ...prev, [lastIdx]: full.length };
        }
        return { ...prev, [lastIdx]: next };
      });
    }, 12);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brain.messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [prompt]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function displayedContent(m: BrainMessage, i: number) {
    if (m.role !== "assistant") return m.content;
    const idx = typed[i] ?? m.content.length;
    return m.content.slice(0, idx);
  }

  function renderProviderBadge(m: BrainMessage, index: number) {
    if (m.role !== "assistant" || index !== brain.messages.length - 1) return null;
    if (!m.provider) return null;
    const isFallback = m.fallback;
    return (
      <span
        className={`mt-1 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] ${
          isFallback
            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
            : "border-purple-500/30 bg-purple-500/10 text-purple-300"
        }`}
      >
        {isFallback ? <Icon name="zap" className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
        {m.provider}
      </span>
    );
  }

  function buildWelcomeMessage() {
    const health = records?.length ? "opérationnel" : "en cours d'initialisation";
    const flowLine = activeFlows > 0 ? `, ${activeFlows} flow${activeFlows > 1 ? "s" : ""} actif${activeFlows > 1 ? "s" : ""}` : "";
    const mediaLine = nowPlaying?.title ? `Tu écoutes/vois actuellement **${nowPlaying.title}**.` : "";
    return `${getGreeting()} ${userName}, ravi de te retrouver sur ETHONE OS. Système **${health}**${flowLine}. ${mediaLine}\n\nQue puis-je faire pour toi aujourd'hui ?`;
  }

  const welcomeMessage = buildWelcomeMessage();

  function renderWelcome() {
    return (
      <div className="flex flex-col gap-3 px-2 max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </span>
          <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/90 px-4 py-3 text-sm text-zinc-200 shadow-xl">
            <div className="leading-relaxed">{renderMarkdown(welcomeMessage)}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {welcomeChips.map((chip) => (
                <ActionChip key={chip.id} chip={chip} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMessage(m: BrainMessage, i: number) {
    const isUser = m.role === "user";
    const chips = isUser ? [] : extractContentActions(m.content, actionHandlers);
    const hasCursor = !isUser && i === brain.messages.length - 1 && (typed[i] ?? 0) < m.content.length;

    return (
      <div key={i} className="max-w-3xl mx-auto w-full px-2">
        <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
          {!isUser && (
            <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </span>
          )}
          <div className={`relative max-w-2xl text-sm ${isUser ? "text-zinc-100" : "text-zinc-200"}`}>
            <div
              className={`px-4 py-2.5 leading-relaxed shadow-sm ${
                isUser
                  ? "rounded-2xl rounded-tr-sm border border-white/10 bg-white/[0.12]"
                  : "rounded-2xl rounded-tl-sm border border-[var(--panel-border)] bg-[var(--surface-raised)]/90 shadow-xl"
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMarkdown(displayedContent(m, i))}</div>
              {hasCursor && (
                <span className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-zinc-400" />
              )}
            </div>
            {renderProviderBadge(m, i)}
            {!isUser && chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <ActionChip key={chip.id} chip={chip} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex-1 space-y-4 overflow-y-auto os-scroll pr-1 pb-4">
        {brain.messages.length === 0 ? renderWelcome() : brain.messages.map((m, i) => renderMessage(m, i))}
        {pending && (
          <div className="max-w-3xl mx-auto w-full px-2 flex justify-start">
            <TypingDots />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="max-w-3xl mx-auto w-full">
        {brain.error && (
          <div className="mb-2 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 shadow-lg backdrop-blur-md">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 text-xs text-amber-200">
              <p className="font-medium">{String(brain.error.message)}</p>
              {(brain.error as { retryable?: boolean }).retryable && (
                <button
                  type="button"
                  onClick={() => {
                    if (!brain.lastPrompt || pending) return;
                    setPending(true);
                    brain.retry().finally(() => setPending(false));
                  }}
                  disabled={pending || brain.loading}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/15 px-2.5 py-1.5 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--warning)]/25 disabled:opacity-50"
                >
                  <RotateCcw className="h-3 w-3" />
                  Réessayer
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => brain.clearChat()}
              className="shrink-0 text-[var(--warning)] transition-colors hover:text-[var(--text-primary)]"
              aria-label={i18n("close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="relative mt-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 shadow-2xl backdrop-blur-[var(--panel-blur)] transition-all duration-200 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/15 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
          <TextArea
            ref={textareaRef}
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Parler à Brain..."
            disabled={pending}
            data-testid="brain-input"
            className="min-h-0 flex-1"
            inputClassName="resize-none min-h-[2.75rem]"
            style={{ maxHeight: 144 }}
          />
          <div className="flex items-center justify-between px-1 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {brain.suggestions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleExecute(s.action, s.parameters)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] px-2 py-1 text-[10px] text-[var(--muted)] transition-colors hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
                >
                  <Sparkles className="h-3 w-3" />
                  {s.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={pending || !prompt.trim()}
              data-testid="brain-send-btn"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--accent-contrast)] font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{ background: "var(--accent-color, var(--accent-primary))" }}
              aria-label="Envoyer"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionChip({ chip }: { chip: ActionChip }) {
  return (
    <button
      type="button"
      onClick={chip.onClick}
      className="group inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-sm transition-all hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.12] hover:text-[var(--text-primary)] hover:shadow-md"
    >
      <span className="transition-transform group-hover:scale-110">{chip.icon}</span>
      {chip.label}
    </button>
  );
}
