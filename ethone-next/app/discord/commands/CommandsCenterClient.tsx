"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Code2,
  Terminal,
  Zap,
  Play,
  Sliders,
  Sparkles,
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
  ShieldCheck,
  Hash,
  ExternalLink,
  Clock,
  HelpCircle,
  Copy,
  RefreshCw,
  X,
  FileCode,
} from "lucide-react";

interface CommandItem {
  id: string;
  name: string;
  description: string;
  type: "SLASH" | "PREFIX" | "BOTH";
  prefix?: string;
  responseType: "TEXT" | "EMBED";
  rawText?: string;
  embedData?: {
    title: string;
    description: string;
    color: string;
    footer?: string;
    thumbnailUrl?: string;
    fields?: { name: string; value: string; inline: boolean }[];
  };
  allowedRoles: string[];
  cooldownSeconds: number;
  usageCount: number;
  enabled: boolean;
  buttons?: { label: string; url?: string; style: "PRIMARY" | "LINK" | "SUCCESS" }[];
}

export default function CommandsCenterClient() {
  const [activeTab, setActiveTab] = useState<
    "catalog" | "builder" | "simulator" | "permissions" | "logs"
  >("catalog");

  const [commands, setCommands] = useState<CommandItem[]>([
    {
      id: "cmd-1",
      name: "regles",
      description: "Affiche les règles principales et les consignes du serveur.",
      type: "BOTH",
      prefix: "!",
      responseType: "EMBED",
      embedData: {
        title: "📜 Règlement Officiel du Serveur",
        description: "Bienvenue sur **{server.name}** ! Pour garantir une ambiance agréable, merci de respecter ces consignes :\n\n1. Respect mutuel et courtoisie\n2. Pas de spam ni de publicité non sollicitée\n3. Respectez les thématiques de chaque salon.",
        color: "#6366F1",
        footer: "ETHONE Security & Moderation",
      },
      allowedRoles: ["Tous les membres"],
      cooldownSeconds: 15,
      usageCount: 1420,
      enabled: true,
      buttons: [{ label: "Lire le règlement complet", url: "https://ethone.dev/rules", style: "LINK" }],
    },
    {
      id: "cmd-2",
      name: "vip",
      description: "Consulter les avantages du statut VIP et les critères d'obtention.",
      type: "SLASH",
      responseType: "EMBED",
      embedData: {
        title: "👑 Club VIP & Nitro Boosters",
        description: "Les membres VIP profitent de salons réservés, de badges exclusifs et d'un bitrate audio amélioré à 128 kbps !\n\nVous êtes actuellement **{server.member_count}** membres sur le serveur.",
        color: "#F59E0B",
        footer: "Programme VIP ETHONE",
      },
      allowedRoles: ["Tous les membres"],
      cooldownSeconds: 30,
      usageCount: 890,
      enabled: true,
    },
    {
      id: "cmd-3",
      name: "site",
      description: "Lien vers la plateforme et les services officiels.",
      type: "BOTH",
      prefix: "!",
      responseType: "TEXT",
      rawText: "Découvrez notre plateforme et nos tutoriels complets sur : https://ethone.dev ! Merci à vous, {user} !",
      allowedRoles: ["Tous les membres"],
      cooldownSeconds: 10,
      usageCount: 2310,
      enabled: true,
    },
    {
      id: "cmd-4",
      name: "staff-clear",
      description: "Nettoyer rapidement les derniers messages d'un salon.",
      type: "SLASH",
      responseType: "TEXT",
      rawText: "🧹 Nettoyage de messages exécuté avec succès par {user} à {time}.",
      allowedRoles: ["Modérateur", "Administrateur"],
      cooldownSeconds: 5,
      usageCount: 142,
      enabled: true,
    },
  ]);

  // Command Studio Builder State
  const [builderName, setBuilderName] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderType, setBuilderType] = useState<"SLASH" | "PREFIX" | "BOTH">("BOTH");
  const [builderResponseType, setBuilderResponseType] = useState<"TEXT" | "EMBED">("EMBED");
  const [builderRawText, setBuilderRawText] = useState("");
  const [builderEmbedTitle, setBuilderEmbedTitle] = useState("");
  const [builderEmbedDesc, setBuilderEmbedDesc] = useState("");
  const [builderEmbedColor, setBuilderEmbedColor] = useState("#6366F1");
  const [builderEmbedFooter, setBuilderEmbedFooter] = useState("Serveur Discord Officiel");
  const [builderCooldown, setBuilderCooldown] = useState(15);
  const [builderAllowedRole, setBuilderAllowedRole] = useState("Tous les membres");

  // Simulator State
  const [simInput, setSimInput] = useState("/regles");
  const [simOutput, setSimOutput] = useState<{
    text?: string;
    embed?: CommandItem["embedData"];
    buttons?: CommandItem["buttons"];
  } | null>({
    embed: commands[0].embedData,
    buttons: commands[0].buttons,
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderName.trim()) return;

    const newCmd: CommandItem = {
      id: `cmd-${Date.now().toString(36)}`,
      name: builderName.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
      description: builderDesc || "Commande personnalisée ETHONE",
      type: builderType,
      prefix: "!",
      responseType: builderResponseType,
      rawText: builderResponseType === "TEXT" ? builderRawText : undefined,
      embedData:
        builderResponseType === "EMBED"
          ? {
              title: builderEmbedTitle || `Commande ${builderName}`,
              description: builderEmbedDesc || "Message automatique du serveur.",
              color: builderEmbedColor,
              footer: builderEmbedFooter,
            }
          : undefined,
      allowedRoles: [builderAllowedRole],
      cooldownSeconds: builderCooldown,
      usageCount: 0,
      enabled: true,
    };

    setCommands([newCmd, ...commands]);
    setBuilderName("");
    setBuilderDesc("");
    setBuilderRawText("");
    setBuilderEmbedTitle("");
    setBuilderEmbedDesc("");
    setActiveTab("catalog");
    showToast(`Commande "/${newCmd.name}" créée et prête pour Discord !`);
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = simInput.trim().replace(/^[/!]/, "").toLowerCase();
    const found = commands.find((c) => c.name.toLowerCase() === clean);

    if (found) {
      if (found.responseType === "EMBED") {
        setSimOutput({
          embed: {
            title: (found.embedData?.title || "").replace("{user}", "AlexDev").replace("{server.name}", "ETHONE Hub"),
            description: (found.embedData?.description || "")
              .replace("{user}", "@AlexDev")
              .replace("{server.name}", "ETHONE Hub")
              .replace("{server.member_count}", "5,412")
              .replace("{time}", new Date().toLocaleTimeString()),
            color: found.embedData?.color || "#6366F1",
            footer: found.embedData?.footer,
          },
          buttons: found.buttons,
        });
      } else {
        setSimOutput({
          text: (found.rawText || "")
            .replace("{user}", "@AlexDev")
            .replace("{server.name}", "ETHONE Hub")
            .replace("{server.member_count}", "5,412")
            .replace("{time}", new Date().toLocaleTimeString()),
        });
      }
    } else {
      setSimOutput({
        text: `❌ Commande inconnue "${simInput}". Tapez /regles, /vip, !site pour tester.`,
      });
    }
  };

  const insertVariable = (variable: string) => {
    if (builderResponseType === "TEXT") {
      setBuilderRawText((p) => p + " " + variable);
    } else {
      setBuilderEmbedDesc((p) => p + " " + variable);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  ETHONE Command Studio & Builder 2.0
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ⚙️ Engine v2.4
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Création no-code de commandes Discord (Slash / & Préfixe !), embeds riches, variables dynamiques et simulateur live.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab("simulator")}
              className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              Simulateur Discord
            </button>
            <button
              onClick={() => setActiveTab("builder")}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Créer une Commande
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
            <span className="text-xs text-neutral-500 font-medium">Commandes Actives</span>
            <p className="text-2xl font-bold text-indigo-400">{commands.length}</p>
            <span className="text-[11px] text-emerald-400">Prêtes à l'emploi</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Exécutions (30j)</span>
            <p className="text-2xl font-bold text-white">18,420</p>
            <span className="text-[11px] text-emerald-400">+24% d'appels</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Slash Commands</span>
            <p className="text-2xl font-bold text-cyan-400">
              {commands.filter((c) => c.type === "SLASH" || c.type === "BOTH").length}
            </p>
            <span className="text-[11px] text-cyan-400">Natif Discord (/)</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Commandes Préfixe</span>
            <p className="text-2xl font-bold text-purple-400">
              {commands.filter((c) => c.type === "PREFIX" || c.type === "BOTH").length}
            </p>
            <span className="text-[11px] text-neutral-400">Préfixe (!)</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Restreintes Staff</span>
            <p className="text-2xl font-bold text-amber-400">
              {commands.filter((c) => !c.allowedRoles.includes("Tous les membres")).length}
            </p>
            <span className="text-[11px] text-amber-400">Sécurisées par rôles</span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
            <span className="text-xs text-neutral-500 font-medium">Taux de Succès</span>
            <p className="text-2xl font-bold text-emerald-400">99.8%</p>
            <span className="text-[11px] text-emerald-400">Latence &lt; 50ms</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "catalog", label: `Catalogue (${commands.length})`, icon: Layers },
            { id: "builder", label: "Studio & Embed Builder", icon: Sliders },
            { id: "simulator", label: "Simulateur Discord Live", icon: Terminal },
            { id: "permissions", label: "Permissions & Cooldowns", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white border-b-2 border-indigo-500"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-neutral-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Catalog */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                Commandes actives sur le serveur ({commands.length})
              </h2>
              <button
                onClick={() => setActiveTab("builder")}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Commande
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                          {cmd.type === "SLASH" ? `/${cmd.name}` : cmd.type === "PREFIX" ? `!${cmd.name}` : `/${cmd.name} ou !${cmd.name}`}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                          {cmd.responseType === "EMBED" ? "Embed Rich" : "Texte Brut"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCommands(
                            commands.map((c) =>
                              c.id === cmd.id ? { ...c, enabled: !c.enabled } : c
                            )
                          );
                          showToast(`Commande "${cmd.name}" ${!cmd.enabled ? "activée" : "désactivée"}.`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          cmd.enabled
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {cmd.enabled ? "🟢 Active" : "⚪ Désactivée"}
                      </button>
                    </div>

                    <p className="text-xs text-neutral-400">{cmd.description}</p>

                    {/* Preview of content */}
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-300 font-mono line-clamp-2">
                      {cmd.responseType === "EMBED"
                        ? `[Embed] ${cmd.embedData?.title} - ${cmd.embedData?.description}`
                        : cmd.rawText}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-400 pt-1">
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase">Rôles</span>
                        <span className="text-white font-medium truncate block">
                          {cmd.allowedRoles.join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase">Cooldown</span>
                        <span className="text-white font-medium font-mono">{cmd.cooldownSeconds}s</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px] uppercase">Utilisations</span>
                        <span className="text-indigo-400 font-bold font-mono">
                          {cmd.usageCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSimInput(`/${cmd.name}`);
                        setActiveTab("simulator");
                        handleSimulate({ preventDefault: () => {} } as any);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      Tester dans le simulateur
                    </button>

                    <button
                      onClick={() => {
                        setCommands(commands.filter((c) => c.id !== cmd.id));
                        showToast(`Commande "/${cmd.name}" supprimée.`);
                      }}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Supprimer la commande"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Studio & Embed Builder */}
        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Controls Form */}
            <form
              onSubmit={handleCreateCommand}
              className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Créateur de Commande & Embed Studio</h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Nom du déclencheur (sans slash) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ex: ip, boutique, vocal..."
                      value={builderName}
                      onChange={(e) => setBuilderName(e.target.value)}
                      className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Type de déclencheur</label>
                    <div className="flex gap-1.5">
                      {[
                        { id: "BOTH", label: "Les Deux (/ et !)" },
                        { id: "SLASH", label: "Slash (/)" },
                        { id: "PREFIX", label: "Préfixe (!)" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBuilderType(t.id as any)}
                          className={`flex-1 h-10 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                            builderType === t.id
                              ? "bg-indigo-600 text-white"
                              : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Courte explication affichée dans le menu Discord..."
                    value={builderDesc}
                    onChange={(e) => setBuilderDesc(e.target.value)}
                    className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white"
                  />
                </div>

                {/* Variable Pills Inserter */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">
                    Insérer une variable dynamique en un clic :
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { v: "{user}", desc: "Mention" },
                      { v: "{user.name}", desc: "Pseudo" },
                      { v: "{server.name}", desc: "Serveur" },
                      { v: "{server.member_count}", desc: "Membres" },
                      { v: "{time}", desc: "Heure" },
                      { v: "{random.1-100}", desc: "Hasard" },
                    ].map((item) => (
                      <button
                        key={item.v}
                        type="button"
                        onClick={() => insertVariable(item.v)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-indigo-500/50 text-indigo-300 font-mono text-[11px] transition-colors cursor-pointer"
                        title={item.desc}
                      >
                        {item.v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Response Mode Selector */}
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">
                    Format de réponse du bot
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBuilderResponseType("EMBED")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        builderResponseType === "EMBED"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                      }`}
                    >
                      🎨 Embed Discord Rich (Recommandé)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderResponseType("TEXT")}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        builderResponseType === "TEXT"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                          : "bg-neutral-950 border border-neutral-800 text-neutral-400"
                      }`}
                    >
                      📝 Message Texte Brut
                    </button>
                  </div>
                </div>

                {builderResponseType === "TEXT" ? (
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">
                      Message renvoyé par le bot
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Texte de réponse... Vous pouvez utiliser {user} et les variables."
                      value={builderRawText}
                      onChange={(e) => setBuilderRawText(e.target.value)}
                      className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white"
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      Champs de l'Embed
                    </h4>

                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">Titre de l'Embed</label>
                      <input
                        type="text"
                        placeholder="ex: 🚀 Informations Serveur"
                        value={builderEmbedTitle}
                        onChange={(e) => setBuilderEmbedTitle(e.target.value)}
                        className="w-full h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[11px] mb-1">Description / Corps</label>
                      <textarea
                        rows={3}
                        placeholder="Contenu détaillé... Supporte le Markdown Discord (**gras**, *italique*, [liens](...))"
                        value={builderEmbedDesc}
                        onChange={(e) => setBuilderEmbedDesc(e.target.value)}
                        className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-3 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-neutral-400 text-[11px] mb-1">Couleur de bordure</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={builderEmbedColor}
                            onChange={(e) => setBuilderEmbedColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={builderEmbedColor}
                            onChange={(e) => setBuilderEmbedColor(e.target.value)}
                            className="flex-1 h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-[11px] mb-1">Texte de bas de page (Footer)</label>
                        <input
                          type="text"
                          value={builderEmbedFooter}
                          onChange={(e) => setBuilderEmbedFooter(e.target.value)}
                          className="w-full h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Enregistrer & Déployer la commande
              </button>
            </form>

            {/* Live Visual Preview */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-400" />
                Aperçu en Direct Discord
              </span>

              <div className="bg-[#2B2D31] rounded-2xl p-4 space-y-3 border border-neutral-800 shadow-2xl font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                    ET
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">ETHONE Bot</span>
                      <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">Aujourd'hui à 15:45</span>
                  </div>
                </div>

                {builderResponseType === "TEXT" ? (
                  <p className="text-xs text-neutral-200 whitespace-pre-wrap">
                    {builderRawText || "Texte de la réponse en attente..."}
                  </p>
                ) : (
                  <div
                    className="border-l-4 rounded-r-xl p-3.5 space-y-2 bg-[#1E1F22]"
                    style={{ borderColor: builderEmbedColor }}
                  >
                    <h4 className="text-sm font-bold text-white">
                      {builderEmbedTitle || "Titre de l'Embed"}
                    </h4>
                    <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {builderEmbedDesc || "Description de l'embed affichée ici."}
                    </p>
                    <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
                      {builderEmbedFooter}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Simulator */}
        {activeTab === "simulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  Terminal de Simulation Discord
                </h3>
                <span className="text-xs text-neutral-500 font-mono">Sandbox Local</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Testez vos commandes exactement comme un utilisateur le ferait sur votre serveur Discord.
              </p>

              <form onSubmit={handleSimulate} className="flex gap-2">
                <input
                  type="text"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  placeholder="/regles ou !site"
                  className="flex-1 h-11 rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Exécuter
                </button>
              </form>

              <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400">
                <span>Raccourcis rapides :</span>
                {commands.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSimInput(`/${c.name}`);
                      setTimeout(() => {
                        const evt = { preventDefault: () => {} } as any;
                        // simulate
                        const clean = c.name.toLowerCase();
                        if (c.responseType === "EMBED") {
                          setSimOutput({
                            embed: c.embedData,
                            buttons: c.buttons,
                          });
                        } else {
                          setSimOutput({ text: c.rawText });
                        }
                      }, 50);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-indigo-500 text-indigo-400 font-mono cursor-pointer"
                  >
                    /{c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulator Output Screen */}
            <div className="lg:col-span-5 bg-[#2B2D31] rounded-2xl p-5 border border-neutral-800 shadow-2xl space-y-4 font-sans min-h-[280px]">
              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-neutral-400" />
                  salon-test-bot
                </span>
                <span className="text-[10px] text-neutral-400">Connecté</span>
              </div>

              {simOutput && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                      ET
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">ETHONE Bot</span>
                        <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">À l'instant</span>
                    </div>
                  </div>

                  {simOutput.text && (
                    <p className="text-xs text-neutral-200 whitespace-pre-wrap">
                      {simOutput.text}
                    </p>
                  )}

                  {simOutput.embed && (
                    <div
                      className="border-l-4 rounded-r-xl p-3.5 space-y-2 bg-[#1E1F22]"
                      style={{ borderColor: simOutput.embed.color || "#6366F1" }}
                    >
                      <h4 className="text-sm font-bold text-white">{simOutput.embed.title}</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {simOutput.embed.description}
                      </p>
                      {simOutput.embed.footer && (
                        <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">
                          {simOutput.embed.footer}
                        </p>
                      )}
                    </div>
                  )}

                  {simOutput.buttons && simOutput.buttons.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {simOutput.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="px-3 py-1.5 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center gap-1"
                        >
                          <span>{btn.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Permissions */}
        {activeTab === "permissions" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Permissions Globales & Sécurité
            </h3>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Restriction stricte des commandes Staff</span>
                  <span className="text-neutral-500 text-[11px]">
                    Empêche les membres ordinaires d'exécuter des commandes de gestion
                  </span>
                </div>
                <span className="text-emerald-400 font-bold">Actif</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Protection Anti-Flood de Commandes</span>
                  <span className="text-neutral-500 text-[11px]">
                    Limite à 5 commandes par 10 secondes par utilisateur
                  </span>
                </div>
                <span className="text-emerald-400 font-bold">Actif</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
