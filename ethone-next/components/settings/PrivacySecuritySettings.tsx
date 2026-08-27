"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

export default function PrivacySecuritySettings() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const [clearingHistory, setClearingHistory] = useState(false);

  const handleClearHistory = () => {
    setClearingHistory(true);
    setTimeout(() => {
      update({ commandHistory: [] });
      setClearingHistory(false);
      notify.sync();
    }, 400);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Privacy Section */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Confidentialité & Données
        </h4>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Personnalisation locale Brain
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Permet à l&apos;IA d&apos;adapter ses réponses à vos habitudes de travail
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.brainEnabled}
              onChange={(e) => update({ brainEnabled: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Signaux de présence publics
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Partage votre statut d&apos;activité avec vos collaborateurs
              </p>
            </div>
            <input
              type="checkbox"
              checked={!!settings.presenceShowSignals}
              onChange={(e) => update({ presenceShowSignals: e.target.checked })}
              className="h-5 w-5 rounded accent-[var(--accent-primary)]"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Historique des commandes et recherches
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {settings.commandHistory?.length || 0} commandes enregistrées localement
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={clearingHistory}
            className="flex items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--danger)]/50 hover:text-[var(--danger)] transition-all active:scale-95"
          >
            <Icon name="trash" className="h-3.5 w-3.5 text-[var(--danger)]" />
            Effacer l&apos;historique
          </button>
        </div>
      </div>

      {/* Security & Sessions Section */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Sécurité du compte & Sessions actives
        </h4>

        <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] divide-y divide-[var(--panel-border)]/50">
          {/* Active Device Item 1 */}
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <Icon name="monitor" className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Session actuelle · Windows (Chrome)
                  </p>
                  <span className="rounded-full bg-[var(--success)]/20 px-2 py-0.2 text-[9px] font-bold text-[var(--success)]">
                    Actif
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Paris, France · Dernière activité à l&apos;instant
                </p>
              </div>
            </div>
          </div>

          {/* Active Device Item 2 */}
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-raised)] text-[var(--text-muted)]">
                <Icon name="device-mobile" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  iPhone 15 Pro · Safari Mobile
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Paris, France · Hier à 22:45
                </p>
              </div>
            </div>

            <button
              type="button"
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--danger)]/50 hover:text-[var(--danger)] transition-all"
            >
              Déconnecter
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Alertes de sécurité par notification
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Recevoir un avertissement lors d&apos;une nouvelle connexion inhabituelle
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.securityAlerts}
            onChange={(e) => update({ securityAlerts: e.target.checked })}
            className="h-5 w-5 rounded accent-[var(--accent-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
