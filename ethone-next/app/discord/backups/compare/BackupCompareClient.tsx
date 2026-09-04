"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  GitCompare,
  PlusCircle,
  AlertCircle,
  MinusCircle,
  CheckCircle2,
  Filter,
  Layers,
  Users,
  FolderTree,
  Shield,
  Sparkles,
  ArrowRight,
  Server,
} from "lucide-react";

export default function BackupCompareClient() {
  const searchParams = useSearchParams();
  const initialA = searchParams?.get("backupA") || "BKP-20260904-143000-FULL";
  const initialB = searchParams?.get("backupB") || "LIVE";

  const [backupA, setBackupA] = useState(initialA);
  const [backupB, setBackupB] = useState(initialB);
  const [filterType, setFilterType] = useState<"ALL" | "CHANGES_ONLY">("CHANGES_ONLY");
  const [componentFilter, setComponentFilter] = useState<
    "ALL" | "ROLES" | "CHANNELS" | "PERMISSIONS" | "ETHONE"
  >("ALL");

  const availableSnapshots = [
    { id: "BKP-20260904-143000-FULL", name: "Full Production Snapshot #42 (2h ago)" },
    { id: "BKP-20260904-100000-PRE", name: "Pre-Rollout Auto-Snapshot (6h ago)" },
    { id: "BKP-20260901-000000-WEEKLY", name: "Weekly Archive #41 (3 days ago)" },
    { id: "LIVE", name: "⚡ Serveur Live Actuel" },
  ];

  const diffSummary = {
    added: 3,
    modified: 4,
    removed: 1,
    unchanged: 32,
  };

  const diffItems = [
    {
      id: "diff-role-1",
      component: "ROLES",
      name: "@VIP Elite",
      status: "ADDED",
      before: null,
      after: "Couleur #f1c40f, Hoist: Oui, Mentionable: Non",
      details: "Nouveau rôle ajouté dans le serveur",
    },
    {
      id: "diff-role-2",
      component: "ROLES",
      name: "@Modérateur",
      status: "MODIFIED",
      before: "Couleur #3498db, Permissions: Standard Staff",
      after: "Couleur #e67e22 (Orange), Permissions: Mute + Ban ajoutés",
      details: "Couleur et droits de modération modifiés",
    },
    {
      id: "diff-role-3",
      component: "ROLES",
      name: "@Ancien Grade Test",
      status: "REMOVED",
      before: "Rôle temporaire d'événement",
      after: null,
      details: "Supprimé du serveur",
    },
    {
      id: "diff-chan-1",
      component: "CHANNELS",
      name: "#annonces-importantes",
      status: "ADDED",
      before: null,
      after: "Salon texte dans Catégorie INFORMATION",
      details: "Nouveau salon d'annonces créé",
    },
    {
      id: "diff-chan-2",
      component: "CHANNELS",
      name: "#general-chat",
      status: "MODIFIED",
      before: "Slowmode: 0s",
      after: "Slowmode: 5s activé",
      details: "Anti-spam slowmode mis en place",
    },
    {
      id: "diff-perm-1",
      component: "PERMISSIONS",
      name: "#reglement Overwrites",
      status: "MODIFIED",
      before: "@everyone: Envoyer messages (Autorisé)",
      after: "@everyone: Envoyer messages (REFUSÉ)",
      details: "Verrouillage en lecture seule pour @everyone",
    },
    {
      id: "diff-ethone-1",
      component: "ETHONE",
      name: "Voice Channels 2.0 Hub",
      status: "ADDED",
      before: null,
      after: "Hub Gaming + Hub Chill actifs avec auto-suppression 30s",
      details: "Nouveau module de salons temporaires configuré",
    },
    {
      id: "diff-ethone-2",
      component: "ETHONE",
      name: "Anti-Raid Strict Mode",
      status: "MODIFIED",
      before: "Seuil: 10 joins / 10s",
      after: "Seuil renforcé: 5 joins / 10s avec Quarantaine auto",
      details: "Sécurité renforcée sur les arrivées massives",
    },
    {
      id: "diff-role-unchanged",
      component: "ROLES",
      name: "@everyone",
      status: "UNCHANGED",
      before: "Configuration de base",
      after: "Configuration de base",
      details: "Aucune modification",
    },
  ];

  const filteredItems = diffItems.filter((item) => {
    if (filterType === "CHANGES_ONLY" && item.status === "UNCHANGED") return false;
    if (componentFilter !== "ALL" && item.component !== componentFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation retour */}
        <div className="flex items-center justify-between">
          <Link
            href="/discord/backups"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux sauvegardes
          </Link>
          <span className="text-xs text-neutral-500 flex items-center gap-1.5">
            <GitCompare className="w-3.5 h-3.5 text-indigo-400" /> Comparateur de Diff Visuel
          </span>
        </div>

        {/* Snapshot Selector Box */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Snapshot A */}
            <div className="w-full md:w-5/12 space-y-2">
              <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                Source A (Référence / Passé)
              </label>
              <select
                value={backupA}
                onChange={(e) => setBackupA(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {availableSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Comparison Arrow */}
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
              <ArrowRight className="w-5 h-5 text-indigo-400" />
            </div>

            {/* Snapshot B */}
            <div className="w-full md:w-5/12 space-y-2">
              <label className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
                Cible B (Comparaison / Présent)
              </label>
              <select
                value={backupB}
                onChange={(e) => setBackupB(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {availableSnapshots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff Summary Metric Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
              <PlusCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs text-neutral-400">Éléments Ajoutés</span>
                <p className="text-lg font-bold text-emerald-400">+{diffSummary.added}</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs text-neutral-400">Éléments Modifiés</span>
                <p className="text-lg font-bold text-amber-400">~{diffSummary.modified}</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3">
              <MinusCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="text-xs text-neutral-400">Éléments Supprimés</span>
                <p className="text-lg font-bold text-rose-400">-{diffSummary.removed}</p>
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-neutral-400 shrink-0" />
              <div>
                <span className="text-xs text-neutral-400">Éléments Identiques</span>
                <p className="text-lg font-bold text-neutral-300">{diffSummary.unchanged}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setComponentFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                componentFilter === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              Tous les composants
            </button>
            <button
              onClick={() => setComponentFilter("ROLES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                componentFilter === "ROLES"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Rôles
            </button>
            <button
              onClick={() => setComponentFilter("CHANNELS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                componentFilter === "CHANNELS"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" /> Salons
            </button>
            <button
              onClick={() => setComponentFilter("PERMISSIONS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                componentFilter === "PERMISSIONS"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Permissions
            </button>
            <button
              onClick={() => setComponentFilter("ETHONE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                componentFilter === "ETHONE"
                  ? "bg-indigo-600 text-white"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> ETHONE
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Affichage :</span>
            <button
              onClick={() => setFilterType("CHANGES_ONLY")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterType === "CHANGES_ONLY"
                  ? "bg-neutral-800 text-white border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Changements uniquement
            </button>
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filterType === "ALL"
                  ? "bg-neutral-800 text-white border border-neutral-700"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Tout afficher
            </button>
          </div>
        </div>

        {/* Detailed Diff Cards List */}
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 transition-all hover:border-neutral-700 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {item.status === "ADDED" && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      🟢 AJOUTÉ
                    </span>
                  )}
                  {item.status === "MODIFIED" && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      🟡 MODIFIÉ
                    </span>
                  )}
                  {item.status === "REMOVED" && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      🔴 SUPPRIMÉ
                    </span>
                  )}
                  {item.status === "UNCHANGED" && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-neutral-800 text-neutral-400">
                      ⚪ INCHANGÉ
                    </span>
                  )}

                  <span className="font-semibold text-white text-sm">
                    {item.name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    ({item.component})
                  </span>
                </div>
                <span className="text-xs text-neutral-400">{item.details}</span>
              </div>

              {/* Before / After Panel if modified or added/removed */}
              {item.status !== "UNCHANGED" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-500 font-medium block mb-1">
                      Avant (Source A) :
                    </span>
                    <p className={item.before ? "text-neutral-300" : "text-neutral-600 italic"}>
                      {item.before || "N'existait pas"}
                    </p>
                  </div>
                  <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-500 font-medium block mb-1">
                      Après (Cible B) :
                    </span>
                    <p className={item.after ? "text-indigo-300 font-medium" : "text-rose-400 italic"}>
                      {item.after || "Supprimé"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
