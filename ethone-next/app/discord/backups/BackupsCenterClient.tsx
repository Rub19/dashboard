"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Archive,
  Clock,
  HardDrive,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  RotateCcw,
  GitCompare,
  Download,
  Trash2,
  Lock,
  Unlock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sparkles,
  Server,
  X,
  Play,
  Check,
  Calendar,
  Layers,
  Users,
  FolderTree,
  Shield,
  FileCode,
  Zap,
} from "lucide-react";

interface BackupItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: { tag: string; id: string };
  type: "FULL" | "PARTIAL" | "PRE_CHANGE" | "ROLLBACK";
  isProtected: boolean;
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED";
  sizeBytes: number;
  checksum: string;
  counts: {
    categories: number;
    channels: number;
    roles: number;
    permissions: number;
    ethone: number;
  };
}

export default function BackupsCenterClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedBackupForAction, setSelectedBackupForAction] = useState<BackupItem | null>(null);

  // Formulaire Create Wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [backupName, setBackupName] = useState("");
  const [backupDesc, setBackupDesc] = useState("");
  const [backupProtect, setBackupProtect] = useState(false);
  const [backupType, setBackupType] = useState<"FULL" | "PARTIAL">("FULL");
  const [included, setIncluded] = useState({
    roles: true,
    categories: true,
    channels: true,
    permissions: true,
    serverConfig: true,
    emojis: true,
    ethoneConfig: true,
  });
  const [createProgress, setCreateProgress] = useState(0);
  const [createStepName, setCreateStepName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Restore Wizard State
  const [restoreLevel, setRestoreLevel] = useState<"SAFE" | "STANDARD" | "DESTRUCTIVE">("SAFE");
  const [confirmServerName, setConfirmServerName] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStepName, setRestoreStepName] = useState("");

  const [backups, setBackups] = useState<BackupItem[]>([
    {
      id: "BKP-20260904-143000-FULL",
      name: "Full Production Snapshot #42",
      description: "Sauvegarde complète hebdomadaire de la structure Discord et des modules ETHONE",
      createdAt: "2026-09-04T12:30:00.000Z",
      createdBy: { tag: "AlexDev#0001", id: "999888777666" },
      type: "FULL",
      isProtected: true,
      status: "COMPLETED",
      sizeBytes: 1843200,
      checksum: "a7c93e4f8812bf095d3e871239cd841029abce5123984019283401928301293a",
      counts: { categories: 3, channels: 18, roles: 12, permissions: 24, ethone: 14 },
    },
    {
      id: "BKP-20260904-100000-PRE",
      name: "Pre-Rollout Auto-Snapshot",
      description: "Capture automatique avant déploiement du module Voice Channels 2.0",
      createdAt: "2026-09-04T08:00:00.000Z",
      createdBy: { tag: "ETHONE Bot#0000", id: "bot" },
      type: "PRE_CHANGE",
      isProtected: false,
      status: "COMPLETED",
      sizeBytes: 945000,
      checksum: "f83b129840182390192830192840192830192830192830192830192830192830",
      counts: { categories: 2, channels: 15, roles: 12, permissions: 20, ethone: 12 },
    },
    {
      id: "BKP-20260901-000000-WEEKLY",
      name: "Weekly Scheduled Archive #41",
      description: "Sauvegarde automatique planifiée",
      createdAt: "2026-09-01T00:00:00.000Z",
      createdBy: { tag: "ETHONE AutoScheduler", id: "bot" },
      type: "FULL",
      isProtected: true,
      status: "COMPLETED",
      sizeBytes: 1720000,
      checksum: "c384918230192830192830192830192830192830192830192830192830192830",
      counts: { categories: 3, channels: 17, roles: 11, permissions: 22, ethone: 14 },
    },
    {
      id: "BKP-20260828-192000-ROLL",
      name: "Rollback auto avant restauration de Hotfix",
      description: "Snapshot de secours automatique",
      createdAt: "2026-08-28T19:20:00.000Z",
      createdBy: { tag: "ETHONE Disaster Recovery", id: "bot" },
      type: "ROLLBACK",
      isProtected: false,
      status: "COMPLETED",
      sizeBytes: 1680000,
      checksum: "d492019283019283019283019283019283019283019283019283019283019283",
      counts: { categories: 3, channels: 17, roles: 11, permissions: 22, ethone: 13 },
    },
  ]);

  const handleToggleProtect = (id: string) => {
    setBackups((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isProtected: !b.isProtected } : b))
    );
  };

  const handleDelete = (id: string) => {
    const item = backups.find((b) => b.id === id);
    if (!item) return;
    if (item.isProtected) {
      alert("Impossible de supprimer une sauvegarde protégée. Retirez la protection d'abord.");
      return;
    }
    if (confirm(`Confirmez-vous la suppression définitive du snapshot "${item.name}" ?`)) {
      setBackups((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleStartCreateWizard = () => {
    setWizardStep(1);
    setBackupName(`Snapshot Manuel — ${new Date().toLocaleDateString("fr-FR")}`);
    setBackupDesc("Sauvegarde manuelle déclenchée depuis le dashboard");
    setBackupProtect(false);
    setBackupType("FULL");
    setIsCreating(false);
    setCreateProgress(0);
    setShowCreateModal(true);
  };

  const handleExecuteCreate = () => {
    setIsCreating(true);
    setCreateProgress(15);
    setCreateStepName("Scanning server...");

    setTimeout(() => {
      setCreateProgress(35);
      setCreateStepName("Collecting roles...");
    }, 600);

    setTimeout(() => {
      setCreateProgress(60);
      setCreateStepName("Collecting channels & categories...");
    }, 1200);

    setTimeout(() => {
      setCreateProgress(85);
      setCreateStepName("Collecting ETHONE configs & checksum...");
    }, 1800);

    setTimeout(() => {
      setCreateProgress(100);
      setCreateStepName("Sauvegarde créée avec succès !");

      const newBkp: BackupItem = {
        id: `BKP-${Date.now()}`,
        name: backupName,
        description: backupDesc,
        createdAt: new Date().toISOString(),
        createdBy: { tag: "Vous (Dashboard)", id: "user" },
        type: backupType,
        isProtected: backupProtect,
        status: "COMPLETED",
        sizeBytes: 1850000,
        checksum: "e9f0182390192830192830192830192830192830192830192830192830192830",
        counts: { categories: 3, channels: 18, roles: 12, permissions: 24, ethone: 14 },
      };

      setBackups((prev) => [newBkp, ...prev]);

      setTimeout(() => {
        setShowCreateModal(false);
        setIsCreating(false);
      }, 1000);
    }, 2400);
  };

  const handleOpenRestore = (bkp: BackupItem) => {
    setSelectedBackupForAction(bkp);
    setRestoreLevel("SAFE");
    setConfirmServerName("");
    setIsRestoring(false);
    setRestoreProgress(0);
    setShowRestoreModal(true);
  };

  const handleExecuteRestore = () => {
    if (restoreLevel === "DESTRUCTIVE" && confirmServerName !== "ETHONE Gaming & Tech") {
      alert('Veuillez saisir le nom exact du serveur "ETHONE Gaming & Tech" pour confirmer.');
      return;
    }

    setIsRestoring(true);
    setRestoreProgress(15);
    setRestoreStepName("Capture du Rollback automatique de sécurité...");

    setTimeout(() => {
      setRestoreProgress(45);
      setRestoreStepName("Restauration et alignement des rôles...");
    }, 800);

    setTimeout(() => {
      setRestoreProgress(75);
      setRestoreStepName("Restauration des salons et permissions...");
    }, 1600);

    setTimeout(() => {
      setRestoreProgress(95);
      setRestoreStepName("Réapplication des configurations ETHONE...");
    }, 2400);

    setTimeout(() => {
      setRestoreProgress(100);
      setRestoreStepName("Restauration terminée avec succès !");
      setTimeout(() => {
        setShowRestoreModal(false);
        setIsRestoring(false);
      }, 1200);
    }, 3200);
  };

  const filteredBackups = backups.filter((b) => {
    if (selectedType === "PROTECTED" && !b.isProtected) return false;
    if (selectedType !== "ALL" && selectedType !== "PROTECTED" && b.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.createdBy.tag.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalStorageMb = (
    backups.reduce((acc, b) => acc + b.sizeBytes, 0) /
    1024 /
    1024
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Server Backup & Disaster Recovery 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live Engine
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Protect your server configuration and restore it when you need it.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/discord/backups/compare"
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors"
            >
              <GitCompare className="w-4 h-4 text-indigo-400" />
              Comparer
            </Link>

            <Link
              href="/discord/backups/settings"
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              Paramètres
            </Link>

            <button
              onClick={handleStartCreateWizard}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              Créer une Sauvegarde
            </button>
          </div>
        </div>

        {/* 6 Key Metric KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Total Sauvegardes</span>
            <p className="text-2xl font-bold text-white">{backups.length}</p>
            <span className="text-[11px] text-neutral-400">Snapshots actifs</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Dernière Sauvegarde</span>
            <p className="text-2xl font-bold text-emerald-400">Il y a 2h</p>
            <span className="text-[11px] text-neutral-400">Aujourd&apos;hui 14:30</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Stockage Utilisé</span>
            <p className="text-2xl font-bold text-indigo-400">{totalStorageMb} MB</p>
            <span className="text-[11px] text-neutral-400">Quota: 50 MB (4%)</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Planification</span>
            <p className="text-2xl font-bold text-amber-400">Quotidien</p>
            <span className="text-[11px] text-neutral-400">Chaque nuit à 03:00</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Objets Protégés</span>
            <p className="text-2xl font-bold text-rose-400">54</p>
            <span className="text-[11px] text-neutral-400">Salons & Rôles</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Santé Disaster Recovery</span>
            <p className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5" /> Protégé
            </p>
            <span className="text-[11px] text-emerald-500">100% Vérifié</span>
          </div>
        </div>

        {/* Disaster Recovery Health Banner */}
        <div className="bg-gradient-to-r from-indigo-950/40 via-neutral-900 to-emerald-950/40 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Votre serveur Discord est entièrement protégé
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Dernier snapshot validé cryptographiquement (SHA-256). Prochaine sauvegarde automatique programmée demain à 03:00.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedBackupForAction(backups[0]);
                  setShowTestModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
              >
                Tester Intégrité
              </button>
              <button
                onClick={handleStartCreateWizard}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Sauvegarder Maintenant
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, ID ou créateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "Toutes" },
              { id: "FULL", label: "Complètes" },
              { id: "PARTIAL", label: "Partielles" },
              { id: "PRE_CHANGE", label: "Pre-Change" },
              { id: "ROLLBACK", label: "Rollback" },
              { id: "PROTECTED", label: "🔒 Protégées" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedType === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Backups List Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Sauvegarde</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Objets Inclus</th>
                  <th className="px-4 py-3.5">Taille</th>
                  <th className="px-4 py-3.5">Créateur & Date</th>
                  <th className="px-4 py-3.5">Intégrité</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredBackups.map((bkp) => (
                  <tr
                    key={bkp.id}
                    className="hover:bg-neutral-800/30 transition-colors group"
                  >
                    {/* Name & ID */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/discord/backups/${bkp.id}`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors text-sm"
                          >
                            {bkp.name}
                          </Link>
                          {bkp.isProtected && (
                            <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Protégé contre la suppression">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-neutral-500">{bkp.id}</p>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-4">
                      {bkp.type === "FULL" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          FULL
                        </span>
                      )}
                      {bkp.type === "PARTIAL" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          PARTIEL
                        </span>
                      )}
                      {bkp.type === "PRE_CHANGE" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PRE-CHANGE
                        </span>
                      )}
                      {bkp.type === "ROLLBACK" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ROLLBACK
                        </span>
                      )}
                    </td>

                    {/* Objects */}
                    <td className="px-4 py-4 text-neutral-300">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                          {bkp.counts.channels} ch
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                          {bkp.counts.roles} rôles
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                          {bkp.counts.ethone} ETH
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="px-4 py-4 font-mono text-neutral-400">
                      {(bkp.sizeBytes / 1024 / 1024).toFixed(2)} MB
                    </td>

                    {/* Creator & Date */}
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium block">
                          {bkp.createdBy.tag}
                        </span>
                        <span className="text-neutral-500 text-[11px]">
                          {new Date(bkp.createdAt).toLocaleDateString("fr-FR")} à{" "}
                          {new Date(bkp.createdAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Integrity Checksum */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Vérifié
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/discord/backups/${bkp.id}`}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          title="Inspecter en détail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleOpenRestore(bkp)}
                          className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
                          title="Restaurer ce snapshot"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          href={`/discord/backups/compare?backupA=${bkp.id}&backupB=LIVE`}
                          className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 transition-colors"
                          title="Comparer avec le direct"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          onClick={() => handleToggleProtect(bkp.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                          title={bkp.isProtected ? "Retirer protection" : "Protéger"}
                        >
                          {bkp.isProtected ? (
                            <Unlock className="w-3.5 h-3.5" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleDelete(bkp.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: Create Backup Wizard */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-6 relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Créer une Sauvegarde</h3>
                  <p className="text-xs text-neutral-400">
                    Capture instantanée de la configuration Discord et des modules ETHONE.
                  </p>
                </div>
              </div>

              {!isCreating ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Nom du Snapshot
                    </label>
                    <input
                      type="text"
                      value={backupName}
                      onChange={(e) => setBackupName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-300">
                      Description optionnelle
                    </label>
                    <input
                      type="text"
                      value={backupDesc}
                      onChange={(e) => setBackupDesc(e.target.value)}
                      placeholder="Raison ou contexte de la sauvegarde..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Component Selection Checkboxes */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Contenu à Sauvegarder :
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: "roles", label: "Rôles & Hiérarchie" },
                        { key: "categories", label: "Catégories" },
                        { key: "channels", label: "Salons Texte & Vocaux" },
                        { key: "permissions", label: "Permissions Overwrites" },
                        { key: "serverConfig", label: "Configuration Serveur" },
                        { key: "ethoneConfig", label: "Modules ETHONE" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-2 p-2 bg-neutral-950 rounded-lg border border-neutral-800/80 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={(included as any)[item.key]}
                            onChange={(e) =>
                              setIncluded((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked,
                              }))
                            }
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                          />
                          <span className="text-neutral-300">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Protéger ce Snapshot
                      </span>
                      <p className="text-[11px] text-neutral-400">
                        Empêche la suppression manuelle ou la purge automatique de rétention.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={backupProtect}
                      onChange={(e) => setBackupProtect(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-neutral-900 border-neutral-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleExecuteCreate}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      Lancer la Sauvegarde
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Scanning Progress Screen */
                <div className="py-8 space-y-5 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                    <Archive className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{createStepName}</p>
                    <p className="text-xs text-neutral-400 font-mono">Progression : {createProgress}%</p>
                  </div>
                  <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 max-w-md mx-auto">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${createProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 2: Restore Wizard Modal */}
        {showRestoreModal && selectedBackupForAction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 space-y-6 relative">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Restaurer le Serveur</h3>
                  <p className="text-xs text-neutral-400">
                    Cible : <strong>{selectedBackupForAction.name}</strong>
                  </p>
                </div>
              </div>

              {!isRestoring ? (
                <div className="space-y-4">
                  {/* Warning Box */}
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-amber-300">Avertissement de Restauration</p>
                      <p className="text-amber-400/90">
                        La restauration peut modifier vos salons, rôles et permissions. Un snapshot Rollback de secours sera automatiquement créé avant l&apos;application.
                      </p>
                    </div>
                  </div>

                  {/* Safety Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-neutral-300">
                      Niveau de Sécurité :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setRestoreLevel("SAFE")}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          restoreLevel === "SAFE"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="font-bold text-xs block">🛡️ Safe</span>
                        <span className="text-[10px] text-neutral-400">
                          Re-crée ce qui manque, ne supprime rien.
                        </span>
                      </button>

                      <button
                        onClick={() => setRestoreLevel("STANDARD")}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          restoreLevel === "STANDARD"
                            ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="font-bold text-xs block">⚖️ Standard</span>
                        <span className="text-[10px] text-neutral-400">
                          Synchronise salons et propriétés.
                        </span>
                      </button>

                      <button
                        onClick={() => setRestoreLevel("DESTRUCTIVE")}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          restoreLevel === "DESTRUCTIVE"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-neutral-950 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        <span className="font-bold text-xs block">⚠️ Destructif</span>
                        <span className="text-[10px] text-neutral-400">
                          Supprime les salons absents du snapshot.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Preview of changes */}
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2 text-xs">
                    <span className="font-semibold text-neutral-300 block">
                      Aperçu de la restauration :
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="block font-bold">2</span>
                        <span className="text-[10px]">Créés</span>
                      </div>
                      <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <span className="block font-bold">4</span>
                        <span className="text-[10px]">Modifiés</span>
                      </div>
                      <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <span className="block font-bold">
                          {restoreLevel === "DESTRUCTIVE" ? "1" : "0"}
                        </span>
                        <span className="text-[10px]">Supprimés</span>
                      </div>
                      <div className="p-2 rounded bg-neutral-800 text-neutral-400">
                        <span className="block font-bold">2</span>
                        <span className="text-[10px]">Ignorés</span>
                      </div>
                    </div>
                  </div>

                  {/* Extra confirmation for destructive */}
                  {restoreLevel === "DESTRUCTIVE" && (
                    <div className="space-y-1.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs">
                      <label className="font-bold text-rose-300 block">
                        Confirmation requise : saisissez &quot;ETHONE Gaming &amp; Tech&quot;
                      </label>
                      <input
                        type="text"
                        value={confirmServerName}
                        onChange={(e) => setConfirmServerName(e.target.value)}
                        placeholder="ETHONE Gaming & Tech"
                        className="w-full bg-neutral-950 border border-rose-500/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowRestoreModal(false)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleExecuteRestore}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      Confirmer &amp; Appliquer la Restauration
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Progress Screen */
                <div className="py-8 space-y-5 text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-spin">
                    <RotateCcw className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">{restoreStepName}</p>
                    <p className="text-xs text-neutral-400 font-mono">{restoreProgress}%</p>
                  </div>
                  <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 max-w-md mx-auto">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${restoreProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 3: Test Snapshot Modal */}
        {showTestModal && selectedBackupForAction && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 relative">
              <button
                onClick={() => setShowTestModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Test d&apos;Intégrité Snapshot</h3>
                  <p className="text-xs text-neutral-400">Dry-run sans impact sur le serveur</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Prêt pour Restauration (READY)
                  </span>
                  <p className="text-neutral-300">
                    Signature SHA-256 valide et schéma v2 compatible avec le moteur de Disaster Recovery.
                  </p>
                </div>

                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-400 space-y-1">
                  <p>ID: {selectedBackupForAction.id}</p>
                  <p className="truncate">Hash: {selectedBackupForAction.checksum}</p>
                  <p>Objets vérifiés : 54 éléments</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
