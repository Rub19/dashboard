"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  badge?: string;
  description: string;
  speed: "fast" | "ultra-fast" | "deep";
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    badge: "Recommandé",
    description: "Équilibre parfait entre intelligence, style et code",
    speed: "fast",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Modèle multimodal puissant et structuré",
    speed: "fast",
  },
  {
    id: "gemini-1-5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    badge: "1M Contexte",
    description: "Analyse documentaire et raisonnement contextuel",
    speed: "fast",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    badge: "Code & Math",
    description: "Raisonnement algorithmique et résolution de problèmes",
    speed: "fast",
  },
  {
    id: "llama-3-3-70b",
    name: "Llama 3.3 70B",
    provider: "Groq / Cloudflare",
    badge: "Ultra Rapide",
    description: "Réponse instantanée à très faible latence",
    speed: "ultra-fast",
  },
  {
    id: "ollama-local",
    name: "Modèle Local",
    provider: "Ollama / LM Studio",
    badge: "100% Privé",
    description: "Exécution locale sur votre machine",
    speed: "deep",
  },
];

interface BrainModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  className?: string;
}

export default function BrainModelSelector({
  selectedModelId,
  onSelectModel,
  className,
}: BrainModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all active:scale-95"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />
        <span>{activeModel.name}</span>
        <Icon
          name="caret-down"
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-[var(--panel-border)]/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Sélectionner le modèle IA
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto os-scroll py-1 space-y-1">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === activeModel.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-xl p-2.5 text-left transition-all",
                    isSelected
                      ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]/40 hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {model.name}
                    </span>
                    {model.badge && (
                      <span className="rounded-full bg-[var(--accent-primary)]/20 px-1.5 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-[10px] text-[var(--text-muted)]">
                    {model.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
