"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/lib/icons";
import { Sparkles, Zap, Brain, Code, Cpu, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  openRouterModel: string;
  name: string;
  provider: string;
  badge?: string;
  badgeType?: "free" | "fast" | "reasoning" | "french" | "local";
  description: string;
  speed: "fast" | "ultra-fast" | "deep";
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "deepseek-r1-free",
    openRouterModel: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 (Gratuit)",
    provider: "OpenRouter Free",
    badge: "100% Gratuit",
    badgeType: "reasoning",
    description: "Modèle de raisonnement de pointe pour le code, les maths et l'analyse",
    speed: "deep",
  },
  {
    id: "deepseek-chat-free",
    openRouterModel: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3 (Gratuit)",
    provider: "OpenRouter Free",
    badge: "100% Gratuit",
    badgeType: "free",
    description: "Modèle ultra-intelligent, rapide et polyvalent sans restriction",
    speed: "fast",
  },
  {
    id: "llama-3-3-70b-free",
    openRouterModel: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Gratuit)",
    provider: "Meta / OpenRouter Free",
    badge: "Ultra Rapide",
    badgeType: "fast",
    description: "Puissance Meta Llama 70B sans coût ni latence",
    speed: "ultra-fast",
  },
  {
    id: "gemini-2-flash-free",
    openRouterModel: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Gratuit)",
    provider: "Google / OpenRouter Free",
    badge: "1M Contexte",
    badgeType: "fast",
    description: "Vitesse éclair et très large fenêtre de contexte",
    speed: "ultra-fast",
  },
  {
    id: "mistral-small-free",
    openRouterModel: "mistralai/mistral-small-24b-instruct-2501:free",
    name: "Mistral 24B (Gratuit)",
    provider: "Mistral AI / Free",
    badge: "FR & Précision",
    badgeType: "french",
    description: "Excellence en langue française, synthèse et rédaction fluide",
    speed: "fast",
  },
  {
    id: "qwen-2-5-72b-free",
    openRouterModel: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B (Gratuit)",
    provider: "Qwen / Free",
    badge: "Code & Math",
    badgeType: "reasoning",
    description: "Capacité exceptionnelle en code et résolution analytique",
    speed: "fast",
  },
  {
    id: "ollama-local",
    openRouterModel: "local",
    name: "Modèle Local (Ollama)",
    provider: "Ollama / LM Studio",
    badge: "100% Privé",
    badgeType: "local",
    description: "Exécution locale sans internet sur votre machine",
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
    AVAILABLE_MODELS.find((m) => m.id === selectedModelId || m.openRouterModel === selectedModelId) ||
    AVAILABLE_MODELS[0];

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
        className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all active:scale-95 cursor-pointer shadow-xs"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_6px_var(--glow-color)]" />
        <span className="truncate max-w-[140px] sm:max-w-none">{activeModel.name}</span>
        <Icon
          name="caret-down"
          className={cn(
            "h-3 w-3 text-[var(--text-muted)] transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#0c0d12] p-1.5 shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-150 select-none">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--panel-border)]/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Modèles IA 100% Gratuits
            </span>
            <span className="rounded-full bg-[var(--accent-primary)]/15 px-1.5 py-0.2 text-[9px] font-bold text-[var(--accent-primary)]">
              OpenRouter Free
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
                    "group flex w-full flex-col gap-0.5 rounded-xl p-2.5 text-left transition-all cursor-pointer",
                    isSelected
                      ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)] border border-[var(--accent-primary)]/30"
                      : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-white transition-colors">
                      {model.name}
                    </span>
                    {model.badge && (
                      <span className="rounded-full bg-[var(--accent-primary)]/20 px-1.5 py-0.2 text-[9px] font-bold text-[var(--accent-primary)] shrink-0">
                        {model.badge}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-muted)]/90 leading-tight mt-0.5">
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
