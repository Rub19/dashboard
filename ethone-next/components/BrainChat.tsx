"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileEdit,
  Calendar,
  Activity,
  FileText,
  Brain,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  List,
  Trash2,
  SlidersHorizontal,
  File,
} from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/lib/hooks/useProfile";
import { hapticSuccessPattern, hapticErrorPattern, hapticMediumImpact, hapticLightImpact } from "@/lib/haptics";
import type { ReturnTypeOfUseBrain, BrainMessage } from "@/lib/hooks/useBrain";
import { useVoiceMode } from "@/lib/hooks/useVoiceMode";
import { useSettings } from "@/components/SettingsProvider";
import BrainComposer from "./brain/BrainComposer";
import BrainActionCard from "./brain/BrainActionCard";
import BrainVoiceOverlay from "./brain/BrainVoiceOverlay";
import MarkdownContent from "./MarkdownContent";
import { cn } from "@/lib/utils";

interface BrainChatProps {
  brain: ReturnTypeOfUseBrain;
  onToggleSidebar?: () => void;
  onToggleContext?: () => void;
  className?: string;
}

export default function BrainChat({
  brain,
  onToggleSidebar,
  onToggleContext,
  className = "",
}: BrainChatProps) {
  const _i18n = useI18n();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { success, error: showError } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userName = profile?.display_name || user?.user_metadata?.full_name || "Utilisateur";

  const langMap: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
  };
  const currentLang = langMap[settings?.language || "fr"] || "fr-FR";

  const voice = useVoiceMode({
    lang: currentLang,
    silenceMs: 1500,
    onFinalTranscript: (text) => {
      if (text.trim()) {
        brain.send(text.trim());
      }
    },
  });

  const lastMessageCountRef = useRef(brain.messages.length);
  useEffect(() => {
    if (voice.isActive && brain.messages.length > lastMessageCountRef.current) {
      const lastMsg = brain.messages[brain.messages.length - 1];
      if (lastMsg && lastMsg.role === "assistant" && lastMsg.content) {
        voice.speak(lastMsg.content);
      }
    }
    lastMessageCountRef.current = brain.messages.length;
  }, [brain.messages, voice.isActive, voice]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabledRef = useRef(true);
  const scrollRafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    isAutoScrollEnabledRef.current = isNearBottom;
  }, []);

  useEffect(() => {
    if (!isAutoScrollEnabledRef.current) return;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: brain.loading ? "auto" : "smooth" });
      }
    });
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [brain.messages, brain.loading]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      hapticLightImpact();
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  }, []);

  const handleCreateNoteFromMessage = useCallback(
    async (content: string) => {
      hapticMediumImpact();
      const res = await brain.executeAction("note.create", {
        title: "Note issue de Brain",
        body: content,
      });
      if (res.ok) {
        hapticSuccessPattern();
        success("Note créée avec succès dans ETHONE Notes !");
      } else {
        hapticErrorPattern();
        showError(res.message || "Erreur lors de la création");
      }
    },
    [brain, success, showError]
  );

  const handleCreateTaskFromMessage = useCallback(
    async (content: string) => {
      hapticMediumImpact();
      const res = await brain.executeAction("task.create", {
        title: content.slice(0, 48),
        priority: "normal",
      });
      if (res.ok) {
        hapticSuccessPattern();
        success("Tâche ajoutée à votre planning !");
      } else {
        hapticErrorPattern();
        showError(res.message || "Erreur lors de la création");
      }
    },
    [brain, success, showError]
  );

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-transparent", className)}>
      {/* Header with Brain Identity & Status Indicator */}
      <header className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/60 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Menu des discussions"
            >
              <List className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold">
              <Brain className="h-4 w-4" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel-bg)]",
                  brain.loading
                    ? "bg-amber-400 animate-ping"
                    : "bg-[var(--success)]"
                )}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Brain Assistant
                </span>
                <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] border border-[var(--panel-border)]">
                  {brain.selectedModel === "auto" ? "⚡ Auto (Intelligent)" : brain.selectedModel}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">
                {brain.loading
                  ? "● Réflexion & Analyse en cours..."
                  : "● Prêt à agir sur ETHONE"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => brain.clearChat()}
            className="flex h-8 items-center gap-1.5 rounded-xl border border-[var(--panel-border)] px-2.5 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--danger)]/50 hover:text-[var(--danger)] transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Effacer</span>
          </button>

          {onToggleContext && (
            <button
              type="button"
              onClick={onToggleContext}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--panel-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Contexte et mémoire"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full overscroll-contain"
      >
        {brain.messages.length === 0 ? (
          renderEmptyState()
        ) : (
          brain.messages.map((m) => renderMessage(m))
        )}

        {/* Typing / Thinking Wave Indicator */}
        {brain.loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3.5 w-fit"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
              <Brain className="h-3.5 w-3.5 animate-pulse" />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--text-muted)]">Brain réfléchit</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer Input Area */}
      <div className="border-t border-[var(--panel-border)] bg-[var(--panel-bg)]/60 backdrop-blur-2xl">
        <BrainComposer
          onSend={(t) => brain.send(t)}
          loading={brain.loading}
          selectedModel={brain.selectedModel}
          onSelectModel={(id) => brain.setSelectedModel(id)}
          attachments={brain.activeAttachments}
          onAddAttachment={(att) => brain.addAttachment(att)}
          onRemoveAttachment={(id) => brain.removeAttachment(id)}
          suggestions={brain.suggestions}
          onSelectSuggestion={(s) => {
            if (s.action) {
              brain.executeAction(s.action, s.parameters);
            } else {
              brain.send(s.title);
            }
          }}
          voiceActive={voice.isActive}
          onVoiceToggle={voice.toggleVoice}
          voiceSupported={voice.isSupported}
        />
      </div>

      {/* Voice Mode Fullscreen Overlay */}
      <AnimatePresence>
        {voice.isActive && (
          <BrainVoiceOverlay
            voiceState={brain.loading ? "thinking" : voice.voiceState}
            interimText={voice.interimText}
            finalText={voice.finalText}
            error={voice.error}
            onClose={voice.exitVoiceMode}
            onStopSpeaking={voice.stopSpeaking}
          />
        )}
      </AnimatePresence>
    </div>
  );

  function renderEmptyState() {
    return (
      <div className="my-auto flex flex-col items-center justify-center text-center py-12 px-4 space-y-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/5 text-[var(--accent-primary)] shadow-2xl ring-2 ring-[var(--accent-primary)]/20">
          <Brain className="h-8 w-8" />
          <div className="absolute -inset-1 rounded-3xl bg-[var(--accent-primary)]/10 blur-xl -z-10" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Bonjour, {userName}
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Brain est connecté à votre espace ETHONE. Demandez une synthèse, créez des notes ou des tâches, ou analysez des documents en langage naturel.
          </p>
        </div>

        {/* Quick Starter Prompts */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-w-lg w-full">
          {[
            { label: "Créer une note de réunion", icon: FileEdit, prompt: "Crée une note résumant mes points clés d'aujourd'hui" },
            { label: "Planifier ma journée", icon: Calendar, prompt: "Aide-moi à organiser mes tâches prioritaires" },
            { label: "Résumer mon activité récente", icon: Activity, prompt: "Fais un récapitulatif de mon activité sur ETHONE" },
            { label: "Analyser un document", icon: FileText, prompt: "Je voudrais analyser un fichier avec toi" },
          ].map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => brain.send(item.prompt)}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-left transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)]/60 active:scale-95 shadow-sm cursor-pointer"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--accent-primary)] group-hover:scale-110 transition-transform shadow-xs">
                  <IconComp className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMessage(m: BrainMessage) {
    const isUser = m.role === "user";

    return (
      <motion.div
        key={m.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
      >
        {/* Message Bubble Container */}
        <div
          className={cn(
            "relative rounded-3xl p-4 max-w-[85%] text-sm leading-relaxed shadow-md",
            isUser
              ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] rounded-br-sm"
              : "border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 text-[var(--text-primary)] rounded-bl-sm backdrop-blur-xl"
          )}
        >
          {/* Attachments if any */}
          {m.attachments && m.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {m.attachments.map((att) => (
                <span
                  key={att.id}
                  className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[11px] font-medium"
                >
                  <File className="h-3 w-3" />
                  {att.name}
                </span>
              ))}
            </div>
          )}

          {/* Text Content */}
          {isUser ? (
            <div className="whitespace-pre-wrap">{m.content}</div>
          ) : (
            <MarkdownContent content={m.content} />
          )}

          {/* Action Card if triggered */}
          {m.actionExecution && (
            <BrainActionCard
              action={m.actionExecution}
              onOpenNote={() => brain.registry.execute("note.create", { title: "Note Brain" })}
            />
          )}
        </div>

        {/* Message Footer Info & Actions */}
        {!isUser && (
          <div className="flex items-center gap-3 px-2 text-[10px] text-[var(--text-muted)]">
            {/* Model & Latency badge */}
            <span className="flex items-center gap-1 font-semibold text-[var(--accent-primary)]">
              <Sparkles className="h-3 w-3" />
              {m.model || "Claude 3.5 Sonnet"}
              {m.durationMs && ` · ${m.durationMs}ms`}
            </span>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => handleCopy(m.content, m.id)}
                className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Copier"
              >
                {copiedId === m.id ? (
                  <Check className="h-3 w-3 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedId === m.id ? "Copié !" : "Copier"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateNoteFromMessage(m.content)}
                className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Transformer en Note"
              >
                <FileEdit className="h-3 w-3" />
                <span>Créer Note</span>
              </button>

              <button
                type="button"
                onClick={() => handleCreateTaskFromMessage(m.content)}
                className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-0.5 cursor-pointer"
                title="Ajouter en Tâche"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Créer Tâche</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
}
