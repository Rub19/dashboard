"use client";

import { ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Sécurité, Anti-Abus & Audit du Bot
                </h3>
                <p className="text-xs text-zinc-400">
                  Surveillance des privilèges, intégrité du jeton Discord et protection contre les abus
                </p>
              </div>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border",
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

            {/* Security Shield Grid — dots reflect the intents the bot actually
                has enabled with Discord, read live from the client (see
                botSecurityAuditService.ts). Encryption card stays static —
                it's a fixed architectural fact (JWT HMAC-SHA256), not a metric. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Protection Anti-Raid</span>
                  <span className={cn("w-2 h-2 rounded-full", securityAudit.intents.guildMembers ? "bg-emerald-400" : "bg-rose-400")} />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Détection instantanée des vagues d'arrivées massives et verrouillage préventif
                  {!securityAudit.intents.guildMembers && " — intent GuildMembers désactivé, détection dégradée"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">AutoMod & Anti-Spam</span>
                  <span className={cn("w-2 h-2 rounded-full", securityAudit.intents.messageContent ? "bg-emerald-400" : "bg-rose-400")} />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Filtrage des mentions abusives, liens malveillants et discord invites
                  {!securityAudit.intents.messageContent && " — intent MessageContent désactivé, filtrage désactivé"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Chiffrement des Données</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Sessions JWT HMAC-SHA256 et hashs sécurisés pour toutes les configurations
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-[11px] text-zinc-400">
              <span>Présence (intent GuildPresences) : {securityAudit.intents.guildPresences ? "Activé" : "Désactivé"}</span>
              <span>{securityAudit.adminGuildsCount} serveur(s) surveillé(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400">Créations de rôles suspectes (24h)</span>
                <span className={cn("font-mono font-bold", securityAudit.suspiciousRoleCreations24h > 0 ? "text-amber-400" : "text-emerald-400")}>
                  {securityAudit.suspiciousRoleCreations24h}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400">Tentatives non autorisées (24h)</span>
                <span className={cn("font-mono font-bold", securityAudit.unauthorizedAttempts24h > 0 ? "text-amber-400" : "text-emerald-400")}>
                  {securityAudit.unauthorizedAttempts24h}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "errors" && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Incidents & Diagnostic d'Erreurs
          </h3>
          {errors.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs text-zinc-400 space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-zinc-200">Aucun incident actif</p>
              <p>Tous les sous-systèmes du bot fonctionnent sans erreur.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <div key={err.id} className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-300">
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
