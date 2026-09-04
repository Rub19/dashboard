"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Clock,
  Archive,
  Shield,
  Lock,
  Unlock,
  Check,
  Save,
  AlertTriangle,
  RotateCcw,
  Zap,
  Calendar,
} from "lucide-react";

export default function BackupSettingsClient() {
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<"6h" | "12h" | "daily" | "weekly">("daily");
  const [preferredTime, setPreferredTime] = useState("03:00");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [retentionCount, setRetentionCount] = useState(7);
  const [retentionDays, setRetentionDays] = useState(30);
  const [maxStorageMb, setMaxStorageMb] = useState(50);
  const [autoBackupBeforeMajorChanges, setAutoBackupBeforeMajorChanges] = useState(true);
  const [defaultSafetyLevel, setDefaultSafetyLevel] = useState<"SAFE" | "STANDARD" | "DESTRUCTIVE">("SAFE");
  const [saved, setSaved] = useState(false);

  const [protectedBackups, setProtectedBackups] = useState([
    {
      id: "BKP-20260904-143000-FULL",
      name: "Full Production Snapshot #42",
      date: "2026-09-04 14:30",
      size: "1.8 MB",
    },
    {
      id: "BKP-20260825-000000-GOLD",
      name: "Golden Master Pre-Launch",
      date: "2026-08-25 00:00",
      size: "1.7 MB",
    },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleUnprotect = (id: string) => {
    setProtectedBackups((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/discord/backups"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux sauvegardes
          </Link>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            {saved ? "Modifications Enregistrées !" : "Enregistrer les Paramètres"}
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            Paramètres de Sauvegarde & Rétention
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Configurez la planification automatique, la durée de conservation et la sécurité du Disaster Recovery.
          </p>
        </div>

        {/* Section 1: Planification Automatique */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">
                  Sauvegardes Automatiques Programmées
                </h3>
                <p className="text-xs text-neutral-400">
                  Le bot capture périodiquement un snapshot complet sans intervention.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Fréquence</label>
                <select
                  value={frequency}
                  onChange={(e: any) => setFrequency(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="6h">Toutes les 6 heures</option>
                  <option value="12h">Toutes les 12 heures</option>
                  <option value="daily">Quotidienne (Chaque jour)</option>
                  <option value="weekly">Hebdomadaire (Chaque semaine)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Heure Préférée</label>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Fuseau Horaire</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Europe/Paris">Europe/Paris (UTC+2)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New York (EDT)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Politique de Rétention & Quota */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                Politique de Conservation & Purge
              </h3>
              <p className="text-xs text-neutral-400">
                Gère le nettoyage automatique des anciennes sauvegardes non protégées.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/80">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Conserver au maximum (Nombre)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="100"
                  value={retentionCount}
                  onChange={(e) => setRetentionCount(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-neutral-400">backups</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Âge Maximal de Conservation
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="7"
                  max="365"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-neutral-400">jours</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Quota de Stockage Serveur
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={maxStorageMb}
                  onChange={(e) => setMaxStorageMb(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-neutral-400">MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Sécurité Avancée & Pré-Changements */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                Règles de Sécurité & Disaster Recovery
              </h3>
              <p className="text-xs text-neutral-400">
                Snapshots automatiques de secours et garde-fous de restauration.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-neutral-800/80">
            <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Pre-Change Snapshot Automatique
                </span>
                <p className="text-xs text-neutral-400 max-w-lg">
                  Crée instantanément une sauvegarde automatique avant toute opération majeure (modification massive de rôles, réorganisation de salons).
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoBackupBeforeMajorChanges}
                onChange={(e) => setAutoBackupBeforeMajorChanges(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">
                Mode de Restauration par Défaut
              </label>
              <select
                value={defaultSafetyLevel}
                onChange={(e: any) => setDefaultSafetyLevel(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SAFE">
                  🛡️ SÉCURISÉ (Re-crée ce qui manque, ne supprime JAMAIS rien)
                </option>
                <option value="STANDARD">
                  ⚖️ STANDARD (Synchronise l&apos;état exact des salons et permissions)
                </option>
                <option value="DESTRUCTIVE">
                  ⚠️ DESTRUCTIF (Supprime les salons absents du snapshot — nécessite confirmation)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Sauvegardes Protégées */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">
                  Sauvegardes Protégées ({protectedBackups.length})
                </h3>
                <p className="text-xs text-neutral-400">
                  Ces sauvegardes ne seront jamais supprimées par la rétention automatique.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
            {protectedBackups.map((bkp) => (
              <div
                key={bkp.id}
                className="p-3.5 flex items-center justify-between hover:bg-neutral-800/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{bkp.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> PROTÉGÉ
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {bkp.date} • {bkp.size} • ID: {bkp.id}
                  </span>
                </div>

                <button
                  onClick={() => handleUnprotect(bkp.id)}
                  className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" /> Retirer protection
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
