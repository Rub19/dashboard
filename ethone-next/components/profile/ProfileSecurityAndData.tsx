"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  KeyRound,
  Download,
  Trash2,
  ExternalLink,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ProfileSecurityAndDataProps {
  onExportData: () => void;
  onResetPersonalization: () => void;
}

export default function ProfileSecurityAndData({
  onExportData,
  onResetPersonalization,
}: ProfileSecurityAndDataProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { success } = useToast();

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Check connected integrations in localStorage
  const integrations = [
    {
      id: "github",
      name: "GitHub",
      connected: typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:github") || localStorage.getItem("github_token")),
    },
    {
      id: "discord",
      name: "Discord",
      connected: typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:discord") || localStorage.getItem("discord_token")),
    },
    {
      id: "spotify",
      name: "Spotify",
      connected: typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:spotify") || localStorage.getItem("spotify_access_token")),
    },
    {
      id: "riot",
      name: "Riot Games (Valorant / LoL)",
      connected: typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:valorant") || localStorage.getItem("ethone:connected:riot")),
    },
    {
      id: "notion",
      name: "Notion",
      connected: typeof window !== "undefined" && Boolean(localStorage.getItem("ethone:connected:notion")),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Account & Security Overview */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--accent-primary)]" />
            <span>Sécurité du compte & Authentification</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Détails de votre session et options de récupération de compte.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Email Card */}
          <div className="rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Adresse e-mail liée
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                {user?.email || "test.ethone.demo@ethone.dev"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                <span>Vérifiée</span>
              </span>
            </div>
          </div>

          {/* Auth Provider Card */}
          <div className="rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Fournisseur d'accès
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Supabase Auth (Cloudflare Isolated)
              </span>
              <span className="text-xs text-sky-400 font-semibold">Chiffré</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/password-recovery")}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Changer de mot de passe</span>
          </button>
        </div>
      </div>

      {/* 2. Connected Integrations Summary */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <span>Services & Intégrations connectées</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Statut des comptes tiers autorisés dans votre environnement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/connections")}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            <span>Gérer dans Connexions</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {integrations.map((integ) => (
            <div
              key={integ.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 p-3"
            >
              <span className="text-xs font-bold text-[var(--text-primary)]">{integ.name}</span>
              {integ.connected ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Lié</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-900/40 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  <span>Non lié</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Data Governance & Export / Reset */}
      <div className="rounded-3xl border border-[var(--panel-border)]/80 bg-[var(--surface-raised)]/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Gestion des données & Exportation</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Exportez une archive complète ou réinitialisez vos préférences sans toucher à vos fichiers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={onExportData}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] px-4 py-3 text-xs font-bold text-[var(--text-primary)] shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Exporter mes données de profil (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 px-4 py-3 text-xs font-bold text-rose-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 text-rose-400" />
            <span>Réinitialiser la personnalisation</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Reset */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title=""
        size="sm"
        hideFooter
      >
        <div className="space-y-4 p-1">
          <div className="flex items-center gap-3 border-b border-[var(--panel-border)]/60 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Réinitialiser la personnalisation ?</h4>
              <p className="text-[11px] text-[var(--text-muted)]">Cette action réinitialise les préférences Brain.</p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-primary)] leading-relaxed">
            Vos centres d'intérêt, scores de recommandation et densités reviendront à l'état initial. Vos fichiers, notes, tâches et connexions externes <strong>resteront inchangés</strong>.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--panel-border)]/60">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(false)}
              className="rounded-xl border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-white"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={() => {
                onResetPersonalization();
                setIsResetConfirmOpen(false);
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
            >
              Confirmer la réinitialisation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
