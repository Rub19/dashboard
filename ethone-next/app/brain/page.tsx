"use client";

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useBrain } from "@/lib/hooks/useBrain";
import { useMail } from "@/lib/hooks/useMail";
import { usePresence } from "@/components/PresenceProvider";
import { useDynamicIslandQueue } from "@/lib/hooks/useDynamicIslandQueue";
import BrainSidebar from "@/components/brain/BrainSidebar";
import BrainContextDrawer from "@/components/brain/BrainContextDrawer";
import BrainChat from "@/components/BrainChat";
import BrainBriefingPanel from "@/components/BrainBriefingPanel";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type BrainView = "chat" | "briefing" | "memory" | "automations" | "diagnostics";

export default function BrainPage() {
  const i18n = useI18n();
  const mail = useMail();

  const mailClient = useMemo(
    () => ({
      analyzeMessage: mail.analyzeMessage,
      suggestReplies: mail.suggestReplies,
      sendMail: mail.sendMail,
      moveMessages: mail.moveMessages,
      getAnalytics: mail.getAnalytics,
      blockSender: mail.blockSender,
      trustSender: mail.trustSender,
      search: (q: string) =>
        mail.messages
          .filter((m) =>
            `${m.subject} ${m.from_address} ${m.from_name || ""} ${m.snippet || ""}`
              .toLowerCase()
              .includes(q.toLowerCase())
          )
          .slice(0, 10)
          .map((m) => ({ id: m.id, subject: m.subject, from: m.from_address, receivedAt: m.received_at })),
    }),
    [mail]
  );

  const brain = useBrain(mailClient);
  const { setBrain } = usePresence();
  const { register, unregister } = useDynamicIslandQueue();

  const [activeView, setActiveView] = useState<BrainView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  // Sync with Presence & Dynamic Island
  useEffect(() => {
    if (brain.loading) {
      setBrain("thinking");
      register({
        id: "brain-status",
        type: "brain",
        priority: 6,
        content: { title: "Brain · Analyse...", state: "thinking" },
      });
    } else {
      setBrain("ready");
      unregister("brain-status");
    }
  }, [brain.loading, setBrain, register, unregister]);

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-transparent">
      {/* Left Sidebar: Conversations & History */}
      <BrainSidebar
        conversations={brain.conversations}
        activeConvId={brain.activeConvId}
        onSelect={(id) => {
          brain.selectConversation(id);
          setSidebarOpen(false);
        }}
        onNew={() => {
          brain.createNewConversation();
          setSidebarOpen(false);
        }}
        onDelete={(id) => brain.deleteConversation(id)}
        onRename={(id, title) => brain.renameConversation(id, title)}
        onToggleFavorite={(id) => brain.toggleFavoriteConversation(id)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Center Main Workspace */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--panel-bg)]/40 backdrop-blur-2xl">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 px-4 py-2 bg-[var(--surface-raised)]/30">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Icon name="list" className="h-4 w-4" />
            </button>

            {(
              [
                { id: "chat", label: "Conversation", icon: "message-circle" },
                { id: "briefing", label: "Briefing du jour", icon: "sun" },
                { id: "memory", label: "Mémoire", icon: "database" },
                { id: "automations", label: "Automatisations", icon: "workflow" },
                { id: "diagnostics", label: "Diagnostics", icon: "activity" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold transition-all",
                  activeView === tab.id
                    ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]/40"
                )}
              >
                <Icon name={tab.icon} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setContextOpen(!contextOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Icon name="scan-search" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
            <span className="hidden lg:inline">Contexte</span>
          </button>
        </div>

        {/* View Switcher Container */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeView === "chat" && (
            <BrainChat
              brain={brain}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onToggleContext={() => setContextOpen(!contextOpen)}
            />
          )}

          {activeView === "briefing" && (
            <div className="h-full overflow-y-auto os-scroll p-6 max-w-4xl mx-auto">
              <BrainBriefingPanel />
            </div>
          )}

          {activeView === "memory" && (
            <div className="h-full overflow-y-auto os-scroll p-6 max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Mémoire à long terme Brain
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Souvenirs et préférences enregistrés automatiquement ou manuellement
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => brain.clearSensitiveMemory()}
                  className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-all"
                >
                  Effacer les données sensibles
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {brain.recentMemory.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                        {m.category}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{m.id}</span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)]">
                      {typeof m.content === "string" ? m.content : JSON.stringify(m.content)}
                    </p>
                  </div>
                ))}
                {brain.recentMemory.length === 0 && (
                  <p className="col-span-full py-8 text-center text-xs text-[var(--text-muted)]">
                    Aucun souvenir enregistré pour le moment.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeView === "automations" && (
            <div className="h-full overflow-y-auto os-scroll p-6 max-w-4xl mx-auto space-y-4">
              <div className="border-b border-[var(--panel-border)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Automatisations ETHONE
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Règles déclenchées automatiquement par Brain selon vos routines
                </p>
              </div>

              <div className="space-y-2">
                {brain.automations.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">
                        {rule.trigger.type} → {rule.trigger.value}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Action : {rule.actionId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => brain.toggleAutomationRule(rule.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                        rule.enabled
                          ? "bg-[var(--success)]/20 text-[var(--success)]"
                          : "bg-[var(--surface-raised)] text-[var(--text-muted)]"
                      )}
                    >
                      {rule.enabled ? "Active" : "Désactivée"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "diagnostics" && (
            <div className="h-full overflow-y-auto os-scroll p-6 max-w-4xl mx-auto space-y-4">
              <div className="border-b border-[var(--panel-border)] pb-3">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Diagnostics des providers IA
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  État de santé, latence réseau et disponibilité des modèles
                </p>
              </div>

              <div className="space-y-2">
                {brain.providers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{p.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {p.privacy} · {p.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => brain.testProvider(p.id)}
                      className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all"
                    >
                      Tester la latence
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Drawer: Context & Environment */}
      <BrainContextDrawer
        attachments={brain.activeAttachments}
        onRemoveAttachment={(id) => brain.removeAttachment(id)}
        isOpen={contextOpen}
        onClose={() => setContextOpen(false)}
      />
    </div>
  );
}
