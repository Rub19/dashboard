"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Download,
  RotateCcw,
  GitCompare,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FolderTree,
  Users,
  Shield,
  Settings,
  Sparkles,
  Copy,
  Check,
  Server,
  Hash,
  Volume2,
  Calendar,
  Layers,
} from "lucide-react";

export default function BackupDetailClient() {
  const params = useParams();
  const router = useRouter();
  const backupId = (params?.backupId as string) || "demo";

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "channels" | "roles" | "permissions" | "server" | "ethone" | "raw"
  >("channels");
  const [isProtected, setIsProtected] = useState(true);

  const snapshot = {
    backupId: backupId === "demo" ? "BKP-20260904-143000-FULL" : backupId,
    guildId: "123456789012345678",
    name: "Full Production Snapshot #42",
    description:
      "Sauvegarde complète hebdomadaire de la structure Discord et des modules ETHONE",
    createdAt: "2026-09-04T12:30:00.000Z",
    createdBy: {
      id: "999888777666",
      tag: "AlexDev#0001",
      avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
    },
    type: "FULL",
    status: "COMPLETED",
    isProtected: isProtected,
    sizeBytes: 1843200,
    checksum: "a7c93e4f8812bf095d3e871239cd841029abce5123984019283401928301293a",
    schemaVersion: 2,
    objectCounts: {
      categories: 3,
      channels: 18,
      roles: 12,
      permissions: 24,
      emojis: 8,
      ethoneModules: 14,
    },
    data: {
      guild: {
        name: "ETHONE Gaming & Tech",
        verificationLevel: "Élevé (Téléphone)",
        explicitContentFilter: "Tous les membres",
        defaultMessageNotifications: "Mentions uniquement",
        afkChannel: "💤 AFK Lounge",
        afkTimeout: "5 minutes",
      },
      categories: [
        { id: "cat-1", name: "📢 INFORMATION & ACCUEIL", position: 0 },
        { id: "cat-2", name: "💬 COMMUNAUTÉ & CHAT", position: 1 },
        { id: "cat-3", name: "🎙️ SALONS VOCAUX", position: 2 },
      ],
      channels: [
        {
          id: "c-1",
          name: "bienvenue",
          type: "text",
          category: "📢 INFORMATION & ACCUEIL",
          topic: "Salutations des nouveaux arrivants",
          rateLimit: 0,
        },
        {
          id: "c-2",
          name: "reglement",
          type: "text",
          category: "📢 INFORMATION & ACCUEIL",
          topic: "Règles strictes du serveur",
          rateLimit: 0,
        },
        {
          id: "c-3",
          name: "annonces",
          type: "announcement",
          category: "📢 INFORMATION & ACCUEIL",
          topic: "Mises à jour majeures",
          rateLimit: 0,
        },
        {
          id: "c-4",
          name: "general-chat",
          type: "text",
          category: "💬 COMMUNAUTÉ & CHAT",
          topic: "Discussions libres et détente",
          rateLimit: 5,
        },
        {
          id: "c-5",
          name: "medias-et-clips",
          type: "text",
          category: "💬 COMMUNAUTÉ & CHAT",
          topic: "Partage d'images et vidéos",
          rateLimit: 10,
        },
        {
          id: "c-6",
          name: "Chill Lounge #1",
          type: "voice",
          category: "🎙️ SALONS VOCAUX",
          bitrate: "96 kbps",
          userLimit: 10,
        },
        {
          id: "c-7",
          name: "Ranked Squad #2",
          type: "voice",
          category: "🎙️ SALONS VOCAUX",
          bitrate: "128 kbps",
          userLimit: 5,
        },
      ],
      roles: [
        {
          id: "r-1",
          name: "Administrateur",
          color: "#e74c3c",
          hoist: true,
          mentionable: true,
          permissions: "Administrateur, Gérer Serveur, Bannir, Expulser",
          managed: false,
        },
        {
          id: "r-2",
          name: "Modérateur",
          color: "#3498db",
          hoist: true,
          mentionable: true,
          permissions: "Gérer Messages, Mute, Kick, Timeout",
          managed: false,
        },
        {
          id: "r-3",
          name: "VIP Elite",
          color: "#f1c40f",
          hoist: true,
          mentionable: false,
          permissions: "Accès Salons VIP, Bitrate Élevé",
          managed: false,
        },
        {
          id: "r-4",
          name: "Membre Actif",
          color: "#2ecc71",
          hoist: false,
          mentionable: false,
          permissions: "Envoyer Messages, Connecter Vocal",
          managed: false,
        },
        {
          id: "r-5",
          name: "@everyone",
          color: "#95a5a6",
          hoist: false,
          mentionable: false,
          permissions: "Voir Salons Publics",
          managed: false,
        },
      ],
      permissions: [
        {
          channel: "#reglement",
          target: "@everyone",
          type: "role",
          allow: ["Voir le salon", "Lire l'historique"],
          deny: ["Envoyer des messages", "Ajouter des réactions"],
        },
        {
          channel: "#annonces",
          target: "@everyone",
          type: "role",
          allow: ["Voir le salon", "Lire l'historique"],
          deny: ["Envoyer des messages"],
        },
        {
          channel: "#general-chat",
          target: "Membre Non Vérifié",
          type: "role",
          allow: [],
          deny: ["Envoyer des messages", "Joindre des fichiers"],
        },
        {
          channel: "Chill Lounge #1",
          target: "@everyone",
          type: "role",
          allow: ["Se connecter", "Parler", "Vidéo"],
          deny: [],
        },
      ],
      ethone: [
        {
          module: "Welcome & Onboarding 2.0",
          status: "Actif",
          details: "Message embed + Carte Canvas personnalisée + Rôle Membre",
        },
        {
          module: "Moderation Center 3.0",
          status: "Actif",
          details: "AutoMod strict, Anti-Spam 5 msgs/3s, Auto-Sanctions actives",
        },
        {
          module: "Voice Channels 2.0",
          status: "Actif",
          details: "Join-to-Create Hub Gaming + Hub Chill, Rétention 30s",
        },
        {
          module: "Invite Tracker 2.0",
          status: "Actif",
          details: "Anti-Cheat heuristique, Détection faux joins, 3 Paliers Rôles",
        },
        {
          module: "Tickets Helpdesk 2.0",
          status: "Actif",
          details: "3 Catégories (Support, Signalement, Partenariat)",
        },
        {
          module: "Anti-Raid & Security",
          status: "Actif",
          details: "Seuil 5 joins/10s, Lockdown d'urgence prêt",
        },
      ],
    },
  };

  const handleCopyChecksum = () => {
    navigator.clipboard.writeText(snapshot.checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `${snapshot.backupId}.ethone-backup.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProtected(!isProtected)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isProtected
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
              }`}
            >
              {isProtected ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Protégé (anti-suppression)
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Non protégé
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-medium text-neutral-300 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger .ethone-backup
            </button>

            <Link
              href={`/discord/backups/compare?backupA=${snapshot.backupId}&backupB=LIVE`}
              className="px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Comparer avec le Live
            </Link>

            <Link
              href={`/discord/backups?restore=${snapshot.backupId}`}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurer ce snapshot
            </Link>
          </div>
        </div>

        {/* Snapshot Header Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {snapshot.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {snapshot.type}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Intégrité Vérifiée
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                {snapshot.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  {new Date(snapshot.createdAt).toLocaleString("fr-FR")}
                </span>
                <span>•</span>
                <span>Créé par : <strong className="text-neutral-200">{snapshot.createdBy.tag}</strong></span>
                <span>•</span>
                <span>Taille : <strong className="text-neutral-200">{(snapshot.sizeBytes / 1024 / 1024).toFixed(2)} MB</strong></span>
                <span>•</span>
                <span>Schéma v{snapshot.schemaVersion}</span>
              </div>
            </div>

            {/* Checksum Hash Box */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 max-w-md space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Checksum
                </span>
                <button
                  onClick={handleCopyChecksum}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
              <p className="font-mono text-[11px] text-neutral-300 truncate">
                {snapshot.checksum}
              </p>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-neutral-800/80">
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Catégories</span>
              <p className="text-lg font-bold text-white">
                {snapshot.objectCounts.categories}
              </p>
            </div>
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Salons</span>
              <p className="text-lg font-bold text-indigo-400">
                {snapshot.objectCounts.channels}
              </p>
            </div>
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Rôles</span>
              <p className="text-lg font-bold text-amber-400">
                {snapshot.objectCounts.roles}
              </p>
            </div>
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Permissions</span>
              <p className="text-lg font-bold text-rose-400">
                {snapshot.objectCounts.permissions}
              </p>
            </div>
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Emojis</span>
              <p className="text-lg font-bold text-teal-400">
                {snapshot.objectCounts.emojis}
              </p>
            </div>
            <div className="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/50">
              <span className="text-xs text-neutral-500">Modules ETHONE</span>
              <p className="text-lg font-bold text-emerald-400">
                {snapshot.objectCounts.ethoneModules}
              </p>
            </div>
          </div>
        </div>

        {/* Content Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("channels")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "channels"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FolderTree className="w-4 h-4 text-indigo-400" />
            Salons & Catégories ({snapshot.data.channels.length})
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "roles"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            Rôles & Hiérarchie ({snapshot.data.roles.length})
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "permissions"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Shield className="w-4 h-4 text-rose-400" />
            Permissions ({snapshot.data.permissions.length})
          </button>
          <button
            onClick={() => setActiveTab("server")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "server"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Server className="w-4 h-4 text-cyan-400" />
            Paramètres Serveur
          </button>
          <button
            onClick={() => setActiveTab("ethone")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "ethone"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Modules ETHONE ({snapshot.data.ethone.length})
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === "raw"
                ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <FileCode className="w-4 h-4 text-neutral-400" />
            JSON Brut
          </button>
        </div>

        {/* Tab 1: Channels & Categories */}
        {activeTab === "channels" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-base font-semibold text-white">
              Arborescence des salons sauvegardés
            </h3>
            <div className="space-y-4">
              {snapshot.data.categories.map((cat) => (
                <div
                  key={cat.id}
                  className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40"
                >
                  <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-300">
                    <span className="flex items-center gap-2">
                      <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                      {cat.name}
                    </span>
                    <span className="text-neutral-500">Position #{cat.position}</span>
                  </div>
                  <div className="divide-y divide-neutral-800/40">
                    {snapshot.data.channels
                      .filter((c) => c.category === cat.name)
                      .map((chan) => (
                        <div
                          key={chan.id}
                          className="px-4 py-3 flex items-center justify-between hover:bg-neutral-900/40 text-sm transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {chan.type === "voice" ? (
                              <Volume2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Hash className="w-4 h-4 text-neutral-400" />
                            )}
                            <span className="font-medium text-white">
                              {chan.name}
                            </span>
                            {chan.topic && (
                              <span className="text-xs text-neutral-500 max-w-md truncate">
                                — {chan.topic}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-400">
                            {chan.rateLimit !== undefined && chan.rateLimit > 0 && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                Slowmode: {chan.rateLimit}s
                              </span>
                            )}
                            {chan.bitrate && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {chan.bitrate}
                              </span>
                            )}
                            {chan.userLimit && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                Limite: {chan.userLimit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Roles */}
        {activeTab === "roles" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Hiérarchie et Permissions des Rôles
            </h3>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
              {snapshot.data.roles.map((role) => (
                <div
                  key={role.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: role.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {role.name}
                        </span>
                        {role.hoist && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">
                            Affiché séparément
                          </span>
                        )}
                        {role.mentionable && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">
                            Mentionnable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {role.permissions}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    {role.color}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Permissions */}
        {activeTab === "permissions" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Règles d&apos;écrasement (Overwrites) des Salons
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snapshot.data.permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-white">
                    <span className="text-indigo-400">{perm.channel}</span>
                    <span className="text-xs font-normal text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                      Cible: {perm.target}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {perm.allow.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-emerald-400 font-medium">Autorisé:</span>
                        {perm.allow.map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            ✓ {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {perm.deny.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-rose-400 font-medium">Refusé:</span>
                        {perm.deny.map((d, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          >
                            ✗ {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Server Settings */}
        {activeTab === "server" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white">
              Configuration Serveur Discord
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(snapshot.data.guild).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-center justify-between"
                >
                  <span className="text-sm text-neutral-400 capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: ETHONE Configs */}
        {activeTab === "ethone" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Configurations Modules ETHONE
                </h3>
                <p className="text-xs text-neutral-400">
                  Sauvegardées indépendamment de Discord pour une restauration sans impact sur les salons.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                6 Modules Clés Inclus
              </span>
            </div>

            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
              {snapshot.data.ethone.map((mod, idx) => (
                <div
                  key={idx}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-white text-sm">
                      {mod.module}
                    </span>
                    <p className="text-xs text-neutral-400">{mod.details}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                    {mod.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Raw JSON */}
        {activeTab === "raw" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                Fichier JSON Canonique
              </h3>
              <button
                onClick={handleCopyChecksum}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-300 transition-colors"
              >
                Copier tout
              </button>
            </div>
            <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300 max-h-96 overflow-y-auto">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
