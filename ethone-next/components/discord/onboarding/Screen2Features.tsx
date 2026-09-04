"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Hammer,
  Sparkles,
  Music2,
  BarChart3,
  Ticket,
  Gift,
  Award,
  Lightbulb,
  Code2,
  CheckCircle2,
  Play,
} from "lucide-react";

interface ModuleInfo {
  id: string;
  name: string;
  badge: string;
  desc: string;
  icon: any;
  color: string;
  preview: React.ReactNode;
}

const MODULES: ModuleInfo[] = [
  {
    id: "moderation",
    name: "Modération 3.0",
    badge: "Staff Console",
    desc: "Casiers judiciaires, sanctions instantanées, historique des infractions et gestion des peines.",
    icon: Hammer,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    preview: (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-zinc-800">
          <span className="text-zinc-400">DOSSIER #1842</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">BAN ACTIF</span>
        </div>
        <div className="text-xs text-zinc-300 font-medium">Membre: @ShadowUser (ID: 8849...)</div>
        <div className="text-[11px] text-zinc-400">Motif: Tentative de scam et spam récurrent</div>
        <div className="flex gap-1.5 pt-1">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">3 Avertissements</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px]">1 Mute</span>
        </div>
      </div>
    ),
  },
  {
    id: "automod",
    name: "AutoMod IA",
    badge: "Protection Active",
    desc: "Détection automatique de spam, flood, liens non autorisés, invitations et insultes.",
    icon: ShieldAlert,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    preview: (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-zinc-800">
          <span className="text-zinc-400">FILTRE LIENS & INVITES</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">ACTIF</span>
        </div>
        <div className="text-xs text-zinc-300">Message intercepté: &quot;discord.gg/free-nitro...&quot;</div>
        <div className="text-[11px] text-amber-400 font-medium">Action: Message supprimé + Avertissement auto</div>
      </div>
    ),
  },
  {
    id: "antiraid",
    name: "Anti-Raid 2.0",
    badge: "Haute Sécurité",
    desc: "Détection de vagues de joins, lock d'urgence automatique, vérification CAPTCHA.",
    icon: ShieldCheck,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    preview: (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-zinc-800">
          <span className="text-zinc-400">RISK SCORE SERVEUR</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">14 / 100</span>
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-[14%]" />
        </div>
        <div className="text-[11px] text-zinc-400">Statut: Serveur sous protection maximale • 0 menace active</div>
      </div>
    ),
  },
  {
    id: "welcome",
    name: "Welcome & Onboarding",
    badge: "Accueil Pro",
    desc: "Cartes graphiques générées, messages personnalisés, rôles automatiques et onboarding.",
    icon: Sparkles,
    color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    preview: (
      <div className="space-y-1.5 text-center p-2 rounded-lg bg-teal-950/20 border border-teal-500/20">
        <div className="text-xs font-bold text-teal-300">BIENVENUE SUR LE SERVEUR</div>
        <div className="text-[11px] text-zinc-300">Bienvenue @Alex ! Tu es notre 1,284ème membre.</div>
        <div className="inline-flex items-center gap-1 text-[10px] text-teal-400 font-mono mt-1">
          <CheckCircle2 className="w-3 h-3" /> Auto-rôle @Membre attribué
        </div>
      </div>
    ),
  },
  {
    id: "music",
    name: "Lecteur Musique 2.0",
    badge: "Audio HD",
    desc: "Lecteur intégré au dashboard, file d'attente synchronisée, filtres sonores et mode DJ.",
    icon: Music2,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    preview: (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white">
            <Play className="w-3.5 h-3.5 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">Midnight City - M83</div>
            <div className="text-[10px] text-zinc-400">2:45 / 4:03 • 🔊 Salon Vocal 1</div>
          </div>
        </div>
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
          <div className="bg-violet-400 h-full w-[65%]" />
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    name: "Analytics & Insights",
    badge: "Data",
    desc: "Suivi des messages par minute, nouveaux membres, heures d'affluence et rétention.",
    icon: BarChart3,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    preview: (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-400">ACTIVITÉ DERNIÈRES 24H</span>
          <span className="text-cyan-400 font-mono font-bold">+18.4%</span>
        </div>
        <div className="flex items-end gap-1 h-10 pt-1">
          {[40, 60, 45, 80, 70, 95, 85, 100, 75, 90].map((h, i) => (
            <div key={i} className="flex-1 bg-cyan-500/30 hover:bg-cyan-400 transition rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "tickets",
    name: "Tickets & Support",
    badge: "Helpdesk",
    desc: "Panels de tickets avec formulaires personnalisés, assignation au staff et transcripts HTML.",
    icon: Ticket,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    preview: (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-zinc-800">
          <span className="font-mono text-zinc-300">TICKET #042</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">En cours</span>
        </div>
        <div className="text-xs text-zinc-300">Catégorie: Problème Technique</div>
        <div className="text-[10px] text-zinc-400">Assigné à: @SupportTeam • Réponse il y a 2m</div>
      </div>
    ),
  },
  {
    id: "giveaways",
    name: "Tirages au Sort",
    badge: "Événements",
    desc: "Concours automatisés avec conditions de rôles, tirage cryptographiquement certifié.",
    icon: Gift,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    preview: (
      <div className="space-y-1 text-center p-1.5 rounded bg-rose-950/20 border border-rose-500/20">
        <div className="text-xs font-bold text-rose-300">🎁 Nitro 1 Mois (x3)</div>
        <div className="text-[11px] text-zinc-400">142 participants • Fin dans 2h 15m</div>
      </div>
    ),
  },
  {
    id: "leveling",
    name: "Leveling & XP",
    badge: "Gamification",
    desc: "Expérience par message et en vocal, cartes de rang, rôles récompenses déblocables.",
    icon: Award,
    color: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30",
    preview: (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-white font-semibold">NIVEAU 24</span>
          <span className="text-fuchsia-400 font-mono">3,850 / 4,000 XP</span>
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-fuchsia-500 h-full w-[85%]" />
        </div>
        <div className="text-[10px] text-zinc-400">Prochain déblocage: Rôle @Vétéran</div>
      </div>
    ),
  },
  {
    id: "suggestions",
    name: "Boîte à Idées",
    badge: "Communauté",
    desc: "Système d'idées avec votes positifs/négatifs et gestion des statuts d'approbation.",
    icon: Lightbulb,
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    preview: (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-white">&quot;Ajouter un salon pour les tutoriels de code&quot;</div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-emerald-400 font-bold">▲ 48</span>
          <span className="text-rose-400 font-bold">▼ 2</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] ml-auto">En examen</span>
        </div>
      </div>
    ),
  },
  {
    id: "commands",
    name: "Commandes Custom",
    badge: "No-Code",
    desc: "Création de commandes préfixes et slash personnalisées avec réponses textes et embeds.",
    icon: Code2,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    preview: (
      <div className="space-y-1 font-mono text-[11px]">
        <div className="text-indigo-300">/regles</div>
        <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">
          Embed: &quot;Charte du serveur - Respectez les membres...&quot;
        </div>
      </div>
    ),
  },
];

export default function Screen2Features() {
  const [selectedId, setSelectedId] = useState<string>("moderation");
  const currentModule = MODULES.find((m) => m.id === selectedId) || MODULES[0];

  return (
    <div className="flex flex-col max-w-3xl mx-auto py-2 px-3 sm:px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
          Une suite d'outils complète & intégrée
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          Survolez ou sélectionnez un module pour découvrir ses capacités en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Module Chips / Buttons Grid */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[290px] overflow-y-auto pr-1">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isSelected = m.id === selectedId;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                onMouseEnter={() => setSelectedId(m.id)}
                className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-zinc-800/90 border-indigo-500/60 shadow-md shadow-indigo-500/10 scale-[1.02]"
                    : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`p-1.5 rounded-lg border ${m.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </div>
                <div className="text-xs font-semibold text-white truncate w-full">{m.name}</div>
                <div className="text-[10px] text-zinc-500 truncate w-full">{m.badge}</div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Micro-Preview Box */}
        <div className="md:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between min-h-[260px] relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-xl border ${currentModule.color}`}>
                <currentModule.icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{currentModule.name}</h4>
                <span className="text-[10px] text-indigo-400 font-medium">{currentModule.badge}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              {currentModule.desc}
            </p>
          </div>

          {/* Interactive Live Preview Pane */}
          <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 shadow-inner">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>APERÇU EN DIRECT</span>
              <span className="text-emerald-400 flex items-center gap-1 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Sync
              </span>
            </div>
            {currentModule.preview}
          </div>
        </div>
      </div>
    </div>
  );
}
