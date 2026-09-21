"use client";

import { ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/Card";
import type { BotTab } from "@/app/discord/bot/BotControlClient";

interface SecurityAudit {
  score: number;
  intents: { guildMembers: boolean; messageContent: boolean; guildPresences: boolean };
  adminGuildsCount: number;
  suspiciousRoleCreations24h: number;
  unauthorizedAttempts24h: number;
}

interface BotError {
  id: string;
  message: string;
}

interface SecurityGroupProps {
  activeTab: BotTab;
  securityAudit: SecurityAudit;
  errors: BotError[];
}

export default function SecurityGroup({ activeTab, securityAudit, errors }: SecurityGroupProps) {
  return (
    <>
      {activeTab === "security" && (
        <div className="space-y-6">
          <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--panel-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Sécurité, Anti-Abus & Audit du Bot
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Surveillance des privilèges, intégrité du jeton Discord et protection contre les abus
                </p>
              </div>
              <span
                className={cn(
                  "px-3 py-1 rounded-xl text-xs font-semibold border self-start sm:self-auto",
                  securityAudit.score >= 90
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : securityAudit.score >= 70
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                )}
              >
                Score de Sécurité : {securityAudit.score}/100 ({securityAudit.score >= 90 ? "Optimal" : securityAudit.score >= 70 ? "Correct" : "À corriger"})
              </span>
            </div>

            {/* Security Shield Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="widget" padding="md" className="space-y-2 bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Protection Anti-Raid</span>
                  <span className={cn("w-2 h-2 rounded-full", securityAudit?.intents?.guildMembers ? "bg-emerald-400" : "bg-rose-400")} />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Détection instantanée des vagues d'arrivées massives et verrouillage préventif
                  {!securityAudit?.intents?.guildMembers && " — intent GuildMembers désactivé, détection dégradée"}
                </p>
              </Card>

              <Card variant="widget" padding="md" className="space-y-2 bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">AutoMod & Anti-Spam</span>
                  <span className={cn("w-2 h-2 rounded-full", securityAudit?.intents?.messageContent ? "bg-emerald-400" : "bg-rose-400")} />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Filtrage des mentions abusives, liens malveillants et discord invites
                  {!securityAudit?.intents?.messageContent && " — intent MessageContent désactivé, filtrage désactivé"}
                </p>
              </Card>

              <Card variant="widget" padding="md" className="space-y-2 bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700/80 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Chiffrement des Données</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Sessions JWT HMAC-SHA256 et hashs sécurisés pour toutes les configurations
                </p>
              </Card>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--panel-border)] text-xs text-[var(--text-muted)]">
              <span>Présence (intent GuildPresences) : <strong className="text-zinc-200">{securityAudit?.intents?.guildPresences ? "Activé" : "Désactivé"}</strong></span>
              <span className="font-mono">{securityAudit.adminGuildsCount} serveur(s) surveillé(s)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Card variant="widget" padding="sm" className="p-3.5 flex items-center justify-between bg-zinc-950/60 border-zinc-800/80">
                <span className="text-[var(--text-muted)]">Créations de rôles suspectes (24h)</span>
                <span className={cn("font-mono font-bold text-sm", securityAudit.suspiciousRoleCreations24h > 0 ? "text-amber-400" : "text-emerald-400")}>
                  {securityAudit.suspiciousRoleCreations24h}
                </span>
              </Card>
              <Card variant="widget" padding="sm" className="p-3.5 flex items-center justify-between bg-zinc-950/60 border-zinc-800/80">
                <span className="text-[var(--text-muted)]">Tentatives non autorisées (24h)</span>
                <span className={cn("font-mono font-bold text-sm", securityAudit.unauthorizedAttempts24h > 0 ? "text-amber-400" : "text-emerald-400")}>
                  {securityAudit.unauthorizedAttempts24h}
                </span>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "errors" && (
        <Card variant="default" padding="none" className="p-5 sm:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Incidents & Diagnostic d'Erreurs
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Journal des exceptions d'exécution et alertes d'intégrité signalées par le bot
            </p>
          </div>

          {errors.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--text-muted)] space-y-1.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">Aucun incident actif</p>
              <p>Tous les sous-systèmes du bot fonctionnent normalement sans exception enregistrée.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {errors.map((err) => (
                <div key={err.id} className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300 font-mono">
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
