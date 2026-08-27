"use client";

import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils";
import type { BrainAttachment } from "@/lib/hooks/useBrain";

interface BrainContextDrawerProps {
  attachments: BrainAttachment[];
  onRemoveAttachment: (id: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export default function BrainContextDrawer({
  attachments,
  onRemoveAttachment,
  isOpen,
  onClose,
}: BrainContextDrawerProps) {
  const i18n = useI18n();
  const { settings } = useSettings();
  const [activeWorkspace] = useLocalStorage<string>("ethone-active-workspace", "personal");

  return (
    <aside
      className={cn(
        "flex h-full w-80 shrink-0 flex-col border-l border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-xl transition-all duration-300",
        isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0 hidden lg:flex"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--panel-border)]/60">
        <div className="flex items-center gap-2">
          <Icon name="scan-search" className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Contexte Actif
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto os-scroll p-4 space-y-6">
        {/* Workspace & Env */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Environnement ETHONE
          </span>
          <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Espace de travail</span>
              <span className="rounded-full bg-[var(--accent-primary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)] capitalize">
                {activeWorkspace}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Thème actif</span>
              <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                {settings.theme}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Mode de session</span>
              <span className="text-xs font-medium text-[var(--text-primary)] capitalize">
                {settings.sessionMode}
              </span>
            </div>
          </div>
        </div>

        {/* Attached Files & Context Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Fichiers & Documents ({attachments.length})
            </span>
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              Glissez-déposez des fichiers ou utilisez le bouton +
            </p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      name={att.type === "image" ? "image" : "file-text"}
                      className="h-4 w-4 shrink-0 text-[var(--accent-primary)]"
                    />
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {att.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Services */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Services connectés
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Spotify", connected: true, icon: "music" },
              { name: "Google Drive", connected: false, icon: "hard-drive" },
              { name: "Discord", connected: false, icon: "chat-circle" },
              { name: "GitHub", connected: true, icon: "code" },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-2.5"
              >
                <Icon
                  name={s.icon}
                  className={cn(
                    "h-4 w-4",
                    s.connected ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
                  )}
                />
                <span className="text-[11px] font-medium truncate text-[var(--text-primary)]">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Capabilities */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Capacités Brain
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Créer des notes",
              "Planifier des tâches",
              "Résumer des fichiers",
              "Gérer les e-mails",
              "Automatiser ETHONE",
            ].map((cap) => (
              <span
                key={cap}
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--surface-raised)]/30 px-2 py-1 text-[10px] font-medium text-[var(--text-muted)]"
              >
                ✓ {cap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
