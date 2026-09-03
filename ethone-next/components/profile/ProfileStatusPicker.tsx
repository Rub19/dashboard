"use client";

import { useState } from "react";
import {
  Check,
  Smile,
  Clock,
  Sparkles,
  Zap,
  Gamepad2,
  Brain,
  Shield,
  X,
  RefreshCw,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { PresenceStatus, CustomStatus } from "@/lib/personalization/personalization-store";

interface ProfileStatusPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: PresenceStatus;
  currentCustomStatus?: CustomStatus;
  autoStatusEnabled: boolean;
  onSelectStatus: (status: PresenceStatus) => void;
  onSaveCustomStatus: (custom: CustomStatus | undefined) => void;
  onToggleAutoStatus: () => void;
}

const STATUS_OPTIONS: Array<{
  id: PresenceStatus;
  label: string;
  description: string;
  dot: string;
}> = [
  { id: "online", label: "En ligne", description: "Disponible et actif sur le dashboard.", dot: "bg-emerald-500" },
  { id: "focus", label: "Focus (Deep Work)", description: "Concentration intense, notifications réduites.", dot: "bg-purple-500" },
  { id: "gaming", label: "En jeu (Gaming)", description: "Partie en cours, Discord et trackers actifs.", dot: "bg-rose-500" },
  { id: "busy", label: "Occupé", description: "Ne peut pas être interrompu pour le moment.", dot: "bg-amber-500" },
  { id: "dnd", label: "Ne pas déranger", description: "Silence total sur toutes les alertes système.", dot: "bg-red-500" },
  { id: "away", label: "Absent", description: "Inactif ou temporairement éloigné de l'écran.", dot: "bg-zinc-400" },
  { id: "offline", label: "Invisible / Hors ligne", description: "Apparaître déconnecté pour les autres.", dot: "bg-zinc-600" },
];

const EMOJI_PRESETS = ["💻", "🎧", "⚡", "🎮", "☕", "🚀", "📖", "🌴"];

export default function ProfileStatusPicker({
  isOpen,
  onClose,
  currentStatus,
  currentCustomStatus,
  autoStatusEnabled,
  onSelectStatus,
  onSaveCustomStatus,
  onToggleAutoStatus,
}: ProfileStatusPickerProps) {
  const [customText, setCustomText] = useState(currentCustomStatus?.text || "");
  const [selectedEmoji, setSelectedEmoji] = useState(currentCustomStatus?.emoji || "💻");

  const handleSaveCustom = () => {
    if (!customText.trim()) {
      onSaveCustomStatus(undefined);
    } else {
      onSaveCustomStatus({
        text: customText.trim(),
        emoji: selectedEmoji,
      });
    }
    onClose();
  };

  const handleClearCustom = () => {
    setCustomText("");
    onSaveCustomStatus(undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      hideFooter
    >
      <div className="space-y-5 p-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-[var(--accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Statut de présence & Activité
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-muted)] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* System Presence Options */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1">
            Statut de présence
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectStatus(opt.id)}
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-all cursor-pointer",
                  currentStatus === opt.id
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-xs"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className={cn("mt-1.5 h-3 w-3 rounded-full shrink-0", opt.dot)} />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</span>
                    {currentStatus === opt.id && <Check className="h-3.5 w-3.5 text-[var(--accent-primary)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug line-clamp-1 mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Auto Status Sync Switch */}
        <div className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span>Synchronisation automatique intelligente</span>
            </span>
            <p className="text-[11px] text-[var(--text-muted)]">
              Met à jour le statut en "Focus" durant un Pomodoro ou "Gaming" dans l'espace jeu.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleAutoStatus}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              autoStatusEnabled ? "bg-[var(--accent-primary)]" : "bg-zinc-700"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                autoStatusEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Custom Status Message */}
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Message de statut personnalisé
          </label>

          {/* Emoji row + Input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--surface-raised)] border border-[var(--panel-border)] rounded-xl p-1">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer",
                    selectedEmoji === emoji ? "bg-[var(--panel-border)] scale-110" : "hover:bg-white/10"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Que faites-vous ?"
              maxLength={60}
              className="flex-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)]/60">
          {currentCustomStatus && (
            <button
              type="button"
              onClick={handleClearCustom}
              className="text-xs text-rose-400 hover:underline cursor-pointer"
            >
              Effacer le message
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-white cursor-pointer"
            >
              Fermer
            </button>

            <button
              type="button"
              onClick={handleSaveCustom}
              className="rounded-xl bg-[var(--accent-primary)] hover:opacity-90 px-5 py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
