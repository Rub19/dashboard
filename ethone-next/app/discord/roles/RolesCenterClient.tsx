"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  Sliders,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Eye,
  Lock,
  Layers,
  Search,
  ChevronRight,
  Hash,
  ExternalLink,
  Clock,
  Crown,
  Tag,
  RefreshCw,
  X,
  Palette,
  Check,
} from "lucide-react";

interface RoleOption {
  id: string;
  name: string;
  emoji: string;
  color: string;
  buttonStyle: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER";
  membersWithRole: number;
}

interface RolePanel {
  id: string;
  title: string;
  description: string;
  channel: string;
  mode: "MULTIPLE" | "EXCLUSIVE"; // exclusive = 1 seul rôle du groupe
  displayType: "BUTTONS" | "SELECT_MENU";
  options: RoleOption[];
  deployed: boolean;
}

export default function RolesCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "panels" | "builder" | "join_roles" | "timed_roles" | "hierarchy"
  >("panels");

  const [panels, setPanels] = useState<RolePanel[]>([
    {
      id: "pnl-1",
      title: "🔔 Notifications & Alertes Communautaires",
      description: "Choisissez les annonces que vous souhaitez recevoir en cliquant sur les boutons ci-dessous.",
      channel: "choix-rôles",
      mode: "MULTIPLE",
      displayType: "BUTTONS",
      deployed: true,
      options: [
        { id: "r-1", name: "Annonces & Mises à Jour", emoji: "📢", color: "#5865F2", buttonStyle: "PRIMARY", membersWithRole: 2410 },
        { id: "r-2", name: "Concours & Giveaways", emoji: "🎉", color: "#EB459E", buttonStyle: "SUCCESS", membersWithRole: 1890 },
        { id: "r-3", name: "Événements & Tournois", emoji: "🎮", color: "#FEE75C", buttonStyle: "SECONDARY", membersWithRole: 1240 },
        { id: "r-4", name: "Partenariats & Collaborations", emoji: "🤝", color: "#57F287", buttonStyle: "SECONDARY", membersWithRole: 820 },
      ],
    },
    {
      id: "pnl-2",
      title: "💻 Vos Centres d'Intérêt & Métiers Tech",
      description: "Débloquez les salons d'entraide spécialisés en fonction de vos compétences et passions.",
      channel: "choix-rôles",
      mode: "MULTIPLE",
      displayType: "BUTTONS",
      deployed: true,
      options: [
        { id: "r-5", name: "Développeur / Codeur", emoji: "💻", color: "#5865F2", buttonStyle: "PRIMARY", membersWithRole: 1420 },
        { id: "r-6", name: "Graphiste / UI Designer", emoji: "🎨", color: "#EB459E", buttonStyle: "PRIMARY", membersWithRole: 640 },
        { id: "r-7", name: "Gamer / Esport", emoji: "🕹️", color: "#57F287", buttonStyle: "SUCCESS", membersWithRole: 2150 },
        { id: "r-8", name: "Créateur de Contenu / Streamer", emoji: "🎬", color: "#ED4245", buttonStyle: "SECONDARY", membersWithRole: 380 },
      ],
    },
    {
      id: "pnl-3",
      title: "🎮 Plateforme de Jeu Principale (Choix Unique)",
      description: "Sélectionnez votre plateforme de jeu principale (un seul rôle actif possible).",
      channel: "plateformes",
      mode: "EXCLUSIVE",
      displayType: "SELECT_MENU",
      deployed: true,
      options: [
        { id: "r-9", name: "Joueur PC Master Race", emoji: "🖥️", color: "#5865F2", buttonStyle: "PRIMARY", membersWithRole: 1890 },
        { id: "r-10", name: "Joueur PlayStation", emoji: "🎮", color: "#003791", buttonStyle: "SECONDARY", membersWithRole: 810 },
        { id: "r-11", name: "Joueur Xbox", emoji: "🟢", color: "#107C10", buttonStyle: "SECONDARY", membersWithRole: 520 },
        { id: "r-12", name: "Joueur Nintendo Switch", emoji: "🔴", color: "#E60012", buttonStyle: "SECONDARY", membersWithRole: 340 },
      ],
    },
  ]);

  // Builder Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formChannel, setFormChannel] = useState("choix-rôles");
  const [formMode, setFormMode] = useState<"MULTIPLE" | "EXCLUSIVE">("MULTIPLE");
  const [formDisplayType, setFormDisplayType] = useState<"BUTTONS" | "SELECT_MENU">("BUTTONS");
  const [formOptions, setFormOptions] = useState<RoleOption[]>([
    { id: "opt-1", name: "Nouveau Rôle", emoji: "⭐", color: "#5865F2", buttonStyle: "PRIMARY", membersWithRole: 0 },
  ]);

  // Join Roles State
  const [joinRoles, setJoinRoles] = useState([
    { id: "jr-1", roleName: "Membre Non Vérifié", delayMinutes: 0, appliesTo: "Tous les arrivants", active: true },
    { id: "jr-2", roleName: "Membre Actif", delayMinutes: 10, appliesTo: "Après vérification", active: true },
    { id: "jr-3", roleName: "Bot Certifié", delayMinutes: 0, appliesTo: "Uniquement les bots", active: true },
  ]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddOption = () => {
    setFormOptions([
      ...formOptions,
      {
        id: `opt-${Date.now()}`,
        name: `Rôle Option ${formOptions.length + 1}`,
        emoji: "🎯",
        color: "#5865F2",
        buttonStyle: "SECONDARY",
        membersWithRole: 0,
      },
    ]);
  };

  const handleCreatePanel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newPnl: RolePanel = {
      id: `pnl-${Date.now().toString(36)}`,
      title: formTitle,
      description: formDesc || "Cliquez ci-dessous pour obtenir vos rôles.",
      channel: formChannel,
      mode: formMode,
      displayType: formDisplayType,
      options: formOptions,
      deployed: true,
    };

    setPanels([newPnl, ...panels]);
    setFormTitle("");
    setFormDesc("");
    setActiveTab("panels");
    showToast(`Panneau de rôles "${newPnl.title}" créé et déployé sur Discord !`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 text-pink-400 rounded-xl border border-pink-500/30 shadow-lg shadow-pink-500/10">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Reaction Roles & Auto-Roles 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🎭 Role Engine v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Panneaux de rôles par boutons et menus déroulants, rôles à l'arrivée (join roles) et rôles temporaires.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("builder")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer un Panneau
            </button>
            <button
              onClick={() => showToast("Tous les panneaux de rôles ont été synchronisés avec Discord !")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-pink-400" />
              Synchroniser Discord
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {toastMsg}
            </span>
            <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 6 Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Panneaux Actifs</span>
            <p className="text-2xl font-bold text-pink-400">{panels.length}</p>
            <span className="text-[11px] text-emerald-400">En ligne sur Discord</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Rôles en Libre Choix</span>
            <p className="text-2xl font-bold text-white">
              {panels.reduce((acc, p) => acc + p.options.length, 0)}
            </p>
            <span className="text-[11px] text-neutral-400">Options configurées</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Rôles Distribués</span>
            <p className="text-2xl font-bold text-purple-400">4,890</p>
            <span className="text-[11px] text-emerald-400">+14% ce mois-ci</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Auto-Rôles Arrivée</span>
            <p className="text-2xl font-bold text-amber-400">{joinRoles.length}</p>
            <span className="text-[11px] text-amber-400">Rôles automatiques</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Membres Équipés</span>
            <p className="text-2xl font-bold text-cyan-400">3,110</p>
            <span className="text-[11px] text-cyan-400">Ont au moins 1 rôle</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Sécurité Hiérarchie</span>
            <p className="text-2xl font-bold text-emerald-400">100%</p>
            <span className="text-[11px] text-emerald-400">Permissions OK</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "panels", label: `Panneaux de Rôles (${panels.length})`, icon: Tag },
            { id: "builder", label: "Créateur de Panneau", icon: Plus },
            { id: "join_roles", label: `Auto-Rôles à l'Arrivée (${joinRoles.length})`, icon: Users },
            { id: "timed_roles", label: "Rôles Temporaires", icon: Clock },
            { id: "hierarchy", label: "Hiérarchie & Sécurité", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-pink-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-pink-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Panels List */}
        {activeTab === "panels" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-400" />
                Panneaux de réaction actifs sur le serveur ({panels.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {panels.map((pnl) => (
                <div
                  key={pnl.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-pink-500/30 rounded-2xl p-6 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-800 border border-neutral-700">
                        #{pnl.channel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {pnl.mode === "EXCLUSIVE" ? "Choix Unique" : "Choix Multiple"}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{pnl.title}</h3>
                    <p className="text-xs text-neutral-400">{pnl.description}</p>

                    {/* Discord Embed Preview Container */}
                    <div className="bg-[#2B2D31] rounded-xl p-4 space-y-3 border border-neutral-800/80 font-sans">
                      <div className="border-l-4 border-pink-500 bg-[#1E1F22] rounded-r-lg p-3 space-y-1 text-xs">
                        <span className="font-bold text-white block">{pnl.title}</span>
                        <p className="text-neutral-300 text-[11px]">{pnl.description}</p>
                      </div>

                      {/* Discord Buttons Mockup */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {pnl.options.map((opt) => (
                          <div
                            key={opt.id}
                            className="px-3 py-1.5 rounded-lg bg-[#5865F2] text-white text-xs font-bold flex items-center gap-1.5 shadow"
                          >
                            <span>{opt.emoji}</span>
                            <span>{opt.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      {pnl.options.length} rôles disponibles
                    </span>

                    <button
                      onClick={() => {
                        setPanels(panels.filter((p) => p.id !== pnl.id));
                        showToast(`Panneau "${pnl.title}" supprimé de Discord.`);
                      }}
                      className="text-neutral-500 hover:text-rose-400 transition-colors p-1.5 cursor-pointer"
                      title="Supprimer ce panneau"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Builder */}
        {activeTab === "builder" && (
          <form
            onSubmit={handleCreatePanel}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-3xl"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <h3 className="text-base font-bold text-white">Nouveau Panneau de Rôles</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Titre du Panneau Discord *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 🎮 Rôles de Jeux & Plateformes"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">
                  Description / Consignes pour les membres
                </label>
                <textarea
                  rows={2}
                  placeholder="Cliquez sur les boutons pour ajouter ou retirer un rôle..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Salon Discord de publication
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value)}
                      placeholder="choix-rôles"
                      className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Règle de sélection
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormMode("MULTIPLE")}
                      className={`flex-1 h-10 rounded-xl text-xs font-bold cursor-pointer ${
                        formMode === "MULTIPLE"
                          ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                          : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                      }`}
                    >
                      Choix Multiple (Libre)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormMode("EXCLUSIVE")}
                      className={`flex-1 h-10 rounded-xl text-xs font-bold cursor-pointer ${
                        formMode === "EXCLUSIVE"
                          ? "bg-pink-600 text-white shadow-md shadow-pink-600/20"
                          : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                      }`}
                    >
                      Choix Unique (1 seul)
                    </button>
                  </div>
                </div>
              </div>

              {/* Roles Options Builder */}
              <div className="pt-2 border-t border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-pink-400" />
                    Rôles inclus dans ce panneau ({formOptions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter un rôle
                  </button>
                </div>

                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800"
                    >
                      <input
                        type="text"
                        value={opt.emoji}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[idx].emoji = e.target.value;
                          setFormOptions(updated);
                        }}
                        className="w-12 h-9 rounded-lg bg-neutral-900 border border-neutral-700 text-center text-xs"
                      />
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[idx].name = e.target.value;
                          setFormOptions(updated);
                        }}
                        placeholder="Nom du rôle Discord"
                        className="flex-1 h-9 rounded-lg bg-neutral-900 border border-neutral-700 px-3 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormOptions(formOptions.filter((_, i) => i !== idx))}
                        className="text-neutral-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Publier le panneau sur Discord
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: Join Roles */}
        {activeTab === "join_roles" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Rôles Automatiques à l'Arrivée (Join Roles)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Attribués automatiquement dès qu'un utilisateur rejoint le serveur Discord.
            </p>

            <div className="space-y-3">
              {joinRoles.map((jr) => (
                <div
                  key={jr.id}
                  className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">@{jr.roleName}</span>
                    <span className="text-neutral-500 text-[11px]">
                      {jr.appliesTo} &bull; Délai : {jr.delayMinutes} min
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Actif
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Timed Roles */}
        {activeTab === "timed_roles" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Rôles Temporaires & Expirations Automatiques
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Système de temporisation pour les abonnements VIP, concours ou sanctions provisoires. Le bot retire automatiquement le rôle dès l'échéance programmée.
            </p>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-white">Rôle VIP Mensuel (30 jours)</span>
                <span className="text-purple-400">14 membres actifs</span>
              </div>
              <p className="text-neutral-500 text-[11px]">
                Retrait automatique programmé avec notification DM 24h avant l'expiration.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: Hierarchy & Security */}
        {activeTab === "hierarchy" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Audit de Hiérarchie des Rôles Discord
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Pour que le bot ETHONE puisse attribuer un rôle sans erreur Discord (403 Forbidden), son propre rôle <strong className="text-white">@ETHONE Bot</strong> doit être placé au-dessus des rôles qu'il gère dans les paramètres Discord.
            </p>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Hiérarchie parfaitement conforme</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Le bot a les droits d'administration et de gestion des rôles nécessaires sur tous les panneaux configurés.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
