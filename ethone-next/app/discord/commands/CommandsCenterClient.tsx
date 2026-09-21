"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Code2,
  Terminal,
  Play,
  Sliders,
  Sparkles,
  Plus,
  Trash2,
  Eye,
  Layers,
  ShieldCheck,
  Hash,
  ExternalLink,
  RefreshCw,
  Copy,
  LayoutTemplate,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth } from "@/lib/hooks/useDiscordOAuth";
import { cn } from "@/lib/utils";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

// Mirrors discord-bot/src/modules/customCommands/types/customCommand.ts.
type TriggerType = "slash" | "prefix" | "both";

interface CustomEmbed {
  title?: string;
  description?: string;
  color: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  fields: { name: string; value: string; inline: boolean }[];
}

interface CustomButton {
  label: string;
  url?: string;
  style: "link" | "primary" | "secondary" | "success" | "danger";
}

interface ResponseBlock {
  content?: string;
  embed?: CustomEmbed;
  buttons: CustomButton[];
}

interface CommandAction {
  type: "send_response" | "add_role" | "remove_role" | "delete_trigger" | "send_dm";
  roleId?: string;
  response?: ResponseBlock;
}

interface CustomCommand {
  id: string;
  guildId: string;
  name: string;
  description: string;
  category: string;
  triggerType: TriggerType;
  enabled: boolean;
  cooldownSeconds: number;
  requiredRoleIds: string[];
  requiredPermission?: string;
  arguments: { name: string; description: string; type: string; required: boolean }[];
  conditions: unknown[];
  defaultActions: CommandAction[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CommandTemplate {
  name: string;
  description?: string;
  category?: string;
}

interface Preview {
  content: string | null;
  embed: { title?: string; description?: string; color?: number; footer?: { text: string } } | null;
  buttons: boolean;
}

/** First send_response block of a command (what the catalog/simulator display). */
function primaryResponse(cmd: CustomCommand): ResponseBlock | null {
  const a = cmd.defaultActions.find((x) => x.type === "send_response" && x.response);
  return a?.response || null;
}

function triggerLabel(cmd: CustomCommand): string {
  if (cmd.triggerType === "slash") return `/${cmd.name}`;
  if (cmd.triggerType === "prefix") return `!${cmd.name}`;
  return `/${cmd.name} ou !${cmd.name}`;
}

const DEMO_COMMANDS: CustomCommand[] = [];

const VARIABLES = [
  { v: "{user}", desc: "Mention" },
  { v: "{username}", desc: "Pseudo" },
  { v: "{server}", desc: "Serveur" },
  { v: "{member_count}", desc: "Membres" },
  { v: "{channel}", desc: "Salon" },
  { v: "{date}", desc: "Date" },
];

export default function CommandsCenterClient() {
  const searchParams = useSearchParams();
  const rawGuildId = searchParams.get("guildId");
  const { profile } = useDiscordOAuth();
  const { success, error: toastError } = useToast();

  const activeGuild = useMemo(() => {
    if (rawGuildId && profile?.guilds) {
      return profile.guilds.find((g) => g.id === rawGuildId) || profile.guilds[0];
    }
    return profile?.guilds?.[0] || null;
  }, [rawGuildId, profile?.guilds]);

  const currentGuildId = activeGuild?.id || "123456789012345678";
  const base = `${BOT_API_URL}/api/guilds/${currentGuildId}/custom-commands`;
  const isRealGuild = Boolean(BOT_API_URL) && currentGuildId !== "123456789012345678";

  const [activeTab, setActiveTab] = useState<"catalog" | "builder" | "simulator" | "templates">("catalog");
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [commands, setCommands] = useState<CustomCommand[]>(DEMO_COMMANDS);
  const [templates, setTemplates] = useState<CommandTemplate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Builder
  const [builderName, setBuilderName] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderType, setBuilderType] = useState<TriggerType>("both");
  const [builderResponseType, setBuilderResponseType] = useState<"TEXT" | "EMBED">("EMBED");
  const [builderRawText, setBuilderRawText] = useState("");
  const [builderEmbedTitle, setBuilderEmbedTitle] = useState("");
  const [builderEmbedDesc, setBuilderEmbedDesc] = useState("");
  const [builderEmbedColor, setBuilderEmbedColor] = useState("#6366F1");
  const [builderEmbedFooter, setBuilderEmbedFooter] = useState("");
  const [builderCooldown, setBuilderCooldown] = useState(5);
  const [builderRoleIds, setBuilderRoleIds] = useState("");
  const [builderButtonLabel, setBuilderButtonLabel] = useState("");
  const [builderButtonUrl, setBuilderButtonUrl] = useState("");

  // Simulator
  const [simInput, setSimInput] = useState("/regles");
  const [simOutput, setSimOutput] = useState<Preview[] | { error: string } | null>(null);

  const load = useCallback(async () => {
    if (!isRealGuild) {
      setIsDemo(true);
      return;
    }
    setLoading(true);
    try {
      const [listRes, tplRes] = await Promise.all([
        fetch(`${base}/list`, { credentials: "include" }),
        fetch(`${base}/templates`, { credentials: "include" }),
      ]);
      const listData = await listRes.json().catch(() => null);
      const tplData = await tplRes.json().catch(() => null);
      if (!listRes.ok || !Array.isArray(listData?.commands)) {
        setIsDemo(true);
        return;
      }
      setIsDemo(false);
      setCommands(listData.commands);
      if (tplRes.ok && Array.isArray(tplData?.templates)) setTemplates(tplData.templates);
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [base, isRealGuild]);

  useEffect(() => {
    load();
  }, [load]);

  const totalUsage = commands.reduce((acc, c) => acc + (c.usageCount || 0), 0);
  const restricted = commands.filter((c) => c.requiredRoleIds.length > 0 || c.requiredPermission).length;

  const resetBuilder = () => {
    setBuilderName("");
    setBuilderDesc("");
    setBuilderRawText("");
    setBuilderEmbedTitle("");
    setBuilderEmbedDesc("");
    setBuilderEmbedFooter("");
    setBuilderButtonLabel("");
    setBuilderButtonUrl("");
    setBuilderRoleIds("");
  };

  const handleCreateCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = builderName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!name) return;

    const response: ResponseBlock = {
      content: builderResponseType === "TEXT" ? builderRawText : undefined,
      embed:
        builderResponseType === "EMBED"
          ? { title: builderEmbedTitle || `Commande ${name}`, description: builderEmbedDesc || "Message automatique du serveur.", color: builderEmbedColor, footerText: builderEmbedFooter || undefined, fields: [] }
          : undefined,
      buttons: builderButtonLabel && builderButtonUrl ? [{ label: builderButtonLabel, url: builderButtonUrl, style: "link" }] : [],
    };
    const payload = {
      name,
      description: builderDesc || "Commande personnalisée ETHONE",
      triggerType: builderType,
      cooldownSeconds: builderCooldown,
      requiredRoleIds: builderRoleIds.split(",").map((s) => s.trim()).filter(Boolean),
      defaultActions: [{ type: "send_response", response }],
    };

    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/create`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.command) throw new Error(data?.error || "create failed");
      setCommands((prev) => [data.command, ...prev]);
      resetBuilder();
      setActiveTab("catalog");
      success(`Commande /${name} créée et active sur Discord.`);
    } catch (err: any) {
      toastError(err?.message || "Échec de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCommand = async (cmd: CustomCommand) => {
    setCommands((prev) => prev.map((c) => (c.id === cmd.id ? { ...c, enabled: !c.enabled } : c)));
    if (isDemo) return;
    try {
      const res = await fetch(`${base}/${cmd.id}/toggle`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.command) throw new Error();
      setCommands((prev) => prev.map((c) => (c.id === cmd.id ? data.command : c)));
    } catch {
      toastError("Échec du changement d'état — rechargez la page.");
    }
  };

  const deleteCommand = async (cmd: CustomCommand) => {
    if (!confirm(`Supprimer la commande /${cmd.name} ?`)) return;
    setCommands((prev) => prev.filter((c) => c.id !== cmd.id));
    if (isDemo) return;
    try {
      await fetch(`${base}/${cmd.id}`, { method: "DELETE", credentials: "include" });
      success(`Commande /${cmd.name} supprimée.`);
    } catch {
      toastError("Échec de la suppression — rechargez la page.");
    }
  };

  const duplicateCommand = async (cmd: CustomCommand) => {
    if (isDemo) {
      toastError("Bot injoignable : rien n'a été enregistré.");
      return;
    }
    try {
      const res = await fetch(`${base}/${cmd.id}/duplicate`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.command) throw new Error(data?.error);
      setCommands((prev) => [data.command, ...prev]);
      success(`Commande dupliquée : /${data.command.name}.`);
    } catch (err: any) {
      toastError(err?.message || "Échec de la duplication.");
    }
  };

  const createFromTemplate = async (templateName: string) => {
    if (isDemo) {
      toastError("Les templates nécessitent un serveur connecté au bot.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/from-template`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.command) throw new Error(data?.error || "template failed");
      setCommands((prev) => [data.command, ...prev]);
      setActiveTab("catalog");
      success(`Commande /${data.command.name} créée depuis le template.`);
    } catch (err: any) {
      toastError(err?.message || "Échec de la création depuis le template.");
    } finally {
      setSubmitting(false);
    }
  };

  const localPreview = (cmd: CustomCommand): Preview[] => {
    const r = primaryResponse(cmd);
    if (!r) return [{ content: "(aucune réponse configurée)", embed: null, buttons: false }];
    const sub = (s?: string) => (s || "").replace(/\{user\}/g, "@Vous").replace(/\{username\}/g, "Vous").replace(/\{server\}/g, activeGuild?.name || "Mon Serveur").replace(/\{member_count\}/g, "128");
    return [{
      content: r.content ? sub(r.content) : null,
      embed: r.embed ? { title: sub(r.embed.title), description: sub(r.embed.description), color: parseInt(r.embed.color.replace("#", ""), 16), footer: r.embed.footerText ? { text: sub(r.embed.footerText) } : undefined } : null,
      buttons: r.buttons.length > 0,
    }];
  };

  const runSimulation = async (nameRaw: string) => {
    const clean = nameRaw.trim().replace(/^[/!]/, "").toLowerCase();
    const found = commands.find((c) => c.name.toLowerCase() === clean);
    if (!found) {
      setSimOutput({ error: `Commande inconnue « ${nameRaw} ». Commandes disponibles : ${commands.map((c) => `/${c.name}`).join(", ") || "aucune"}.` });
      return;
    }
    if (isDemo) {
      setSimOutput(localPreview(found));
      return;
    }
    try {
      const res = await fetch(`${base}/${found.id}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ args: {} }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.previews)) throw new Error(data?.error || "test failed");
      setSimOutput(data.previews.length > 0 ? data.previews : localPreview(found));
    } catch (err: any) {
      setSimOutput({ error: err?.message || "Échec de la simulation côté bot." });
    }
  };

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    runSimulation(simInput);
  };

  const insertVariable = (variable: string) => {
    if (builderResponseType === "TEXT") setBuilderRawText((p) => `${p} ${variable}`);
    else setBuilderEmbedDesc((p) => `${p} ${variable}`);
  };

  const colorToHex = (c?: number | string) => {
    if (typeof c === "string") return c;
    if (typeof c === "number") return `#${c.toString(16).padStart(6, "0")}`;
    return "#6366F1";
  };

  return (
    <div className="h-full overflow-y-auto os-scroll [overscroll-behavior:contain] bg-[var(--bg-main)] text-neutral-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-sm">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ETHONE Command Studio</h1>
              <p className="text-xs text-neutral-400">
                Commandes personnalisées (Slash / et Préfixe !), embeds, boutons et simulateur branché sur le bot.
                {isDemo && <span className="text-amber-400"> (bot injoignable ou absent de ce serveur)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button onClick={load} disabled={loading} className="px-3.5 py-2 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4 text-indigo-400", loading && "animate-spin")} />
              Actualiser
            </button>
            <button onClick={() => setActiveTab("builder")} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              Créer une Commande
            </button>
          </div>
        </div>

        {/* KPI réels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Commandes", value: commands.length, cls: "text-indigo-400", sub: `${commands.filter((c) => c.enabled).length} active(s)` },
            { label: "Exécutions totales", value: totalUsage, cls: "text-white", sub: "Cumul depuis la création" },
            { label: "Slash (/)", value: commands.filter((c) => c.triggerType !== "prefix").length, cls: "text-cyan-400", sub: "Natif Discord" },
            { label: "Préfixe (!)", value: commands.filter((c) => c.triggerType !== "slash").length, cls: "text-purple-400", sub: "Message texte" },
            { label: "Restreintes", value: restricted, cls: "text-amber-400", sub: "Rôle / permission requis" },
            { label: "Templates", value: templates.length, cls: "text-emerald-400", sub: "Prêts à installer" },
          ].map((k) => (
            <div key={k.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{k.label}</span>
              <p className={cn("text-2xl font-bold", k.cls)}>{k.value.toLocaleString("fr-FR")}</p>
              <span className="text-[11px] text-neutral-400">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: "catalog", label: `Catalogue (${commands.length})`, icon: Layers },
            { id: "builder", label: "Studio & Embed Builder", icon: Sliders },
            { id: "simulator", label: "Simulateur", icon: Terminal },
            { id: "templates", label: `Templates (${templates.length})`, icon: LayoutTemplate },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer", isActive ? "bg-neutral-900 text-white border-b-2 border-indigo-500" : "text-neutral-400 hover:text-white")}>
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-neutral-500")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Catalogue */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {commands.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center text-xs text-neutral-500">
                Aucune commande personnalisée. Crée-en une dans le Studio ou installe un template.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {commands.map((cmd) => {
                  const r = primaryResponse(cmd);
                  return (
                    <div key={cmd.id} className="bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-sm text-indigo-400 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 truncate">{triggerLabel(cmd)}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 shrink-0">{r?.embed ? "Embed" : "Texte"}</span>
                          </div>
                          <button type="button" onClick={() => toggleCommand(cmd)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shrink-0", cmd.enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-neutral-800 text-neutral-400")}>
                            {cmd.enabled ? "🟢 Active" : "⚪ Désactivée"}
                          </button>
                        </div>
                        <p className="text-xs text-neutral-400">{cmd.description}</p>
                        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-300 font-mono line-clamp-2">
                          {r?.embed ? `[Embed] ${r.embed.title || ""} — ${r.embed.description || ""}` : r?.content || "(actions sans réponse)"}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-400 pt-1">
                          <div>
                            <span className="text-neutral-500 block text-[10px] uppercase">Accès</span>
                            <span className="text-white font-medium truncate block">{cmd.requiredRoleIds.length > 0 ? `${cmd.requiredRoleIds.length} rôle(s)` : cmd.requiredPermission || "Tous"}</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[10px] uppercase">Cooldown</span>
                            <span className="text-white font-medium font-mono">{cmd.cooldownSeconds}s</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[10px] uppercase">Utilisations</span>
                            <span className="text-indigo-400 font-bold font-mono">{(cmd.usageCount || 0).toLocaleString("fr-FR")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                        <button onClick={() => { setSimInput(`/${cmd.name}`); setActiveTab("simulator"); runSimulation(cmd.name); }} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          Tester
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => duplicateCommand(cmd)} className="p-1.5 rounded-lg text-neutral-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer" title="Dupliquer">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCommand(cmd)} className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Builder */}
        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleCreateCommand} className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Créateur de Commande</h3>
              </div>
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Nom (sans slash) *</label>
                    <input type="text" required placeholder="ex: ip, boutique, vocal..." value={builderName} onChange={(e) => setBuilderName(e.target.value)} className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono" />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Déclencheur</label>
                    <div className="flex gap-1.5">
                      {([{ id: "both", label: "/ et !" }, { id: "slash", label: "Slash (/)" }, { id: "prefix", label: "Préfixe (!)" }] as { id: TriggerType; label: string }[]).map((t) => (
                        <button key={t.id} type="button" onClick={() => setBuilderType(t.id)} className={cn("flex-1 h-10 rounded-xl text-[11px] font-semibold transition-all cursor-pointer", builderType === t.id ? "bg-indigo-600 text-white" : "bg-neutral-950 border border-neutral-800 text-neutral-400")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Description</label>
                  <input type="text" placeholder="Affichée dans le menu Discord..." value={builderDesc} onChange={(e) => setBuilderDesc(e.target.value)} className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Cooldown (secondes)</label>
                    <input type="number" min={0} value={builderCooldown} onChange={(e) => setBuilderCooldown(Number(e.target.value) || 0)} className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-300 mb-1">Rôles autorisés (IDs, virgules)</label>
                    <input type="text" placeholder="vide = tout le monde" value={builderRoleIds} onChange={(e) => setBuilderRoleIds(e.target.value)} className="w-full h-10 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1.5">Variables dynamiques :</label>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map((item) => (
                      <button key={item.v} type="button" onClick={() => insertVariable(item.v)} className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-indigo-500/50 text-indigo-300 font-mono text-[11px] transition-colors cursor-pointer" title={item.desc}>
                        {item.v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Format de réponse</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setBuilderResponseType("EMBED")} className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer", builderResponseType === "EMBED" ? "bg-indigo-600 text-white shadow-sm" : "bg-neutral-950 border border-neutral-800 text-neutral-400")}>🎨 Embed</button>
                    <button type="button" onClick={() => setBuilderResponseType("TEXT")} className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer", builderResponseType === "TEXT" ? "bg-indigo-600 text-white shadow-sm" : "bg-neutral-950 border border-neutral-800 text-neutral-400")}>📝 Texte</button>
                  </div>
                </div>
                {builderResponseType === "TEXT" ? (
                  <textarea rows={4} placeholder="Texte de réponse... {user}, {server}..." value={builderRawText} onChange={(e) => setBuilderRawText(e.target.value)} className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-3 text-xs text-white" />
                ) : (
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <input type="text" placeholder="Titre de l'embed" value={builderEmbedTitle} onChange={(e) => setBuilderEmbedTitle(e.target.value)} className="w-full h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white" />
                    <textarea rows={3} placeholder="Description (Markdown Discord supporté)" value={builderEmbedDesc} onChange={(e) => setBuilderEmbedDesc(e.target.value)} className="w-full rounded-xl bg-neutral-900 border border-neutral-800 p-3 text-xs text-white" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <input type="color" value={builderEmbedColor} onChange={(e) => setBuilderEmbedColor(e.target.value)} className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                        <input type="text" value={builderEmbedColor} onChange={(e) => setBuilderEmbedColor(e.target.value)} className="flex-1 h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white font-mono" />
                      </div>
                      <input type="text" placeholder="Footer" value={builderEmbedFooter} onChange={(e) => setBuilderEmbedFooter(e.target.value)} className="w-full h-9 rounded-xl bg-neutral-900 border border-neutral-800 px-3 text-xs text-white" />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Bouton lien : libellé (optionnel)" value={builderButtonLabel} onChange={(e) => setBuilderButtonLabel(e.target.value)} className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white" />
                  <input type="url" placeholder="https://..." value={builderButtonUrl} onChange={(e) => setBuilderButtonUrl(e.target.value)} className="w-full h-9 rounded-xl bg-neutral-950 border border-neutral-800 px-3 text-xs text-white font-mono" />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50">
                <Plus className="w-4 h-4" />
                Enregistrer & déployer sur Discord
              </button>
            </form>

            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5"><Eye className="w-4 h-4 text-indigo-400" /> Aperçu Discord</span>
              <div className="bg-[#2B2D31] rounded-2xl p-4 space-y-3 border border-neutral-800 shadow-2xl font-sans">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">ET</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">ETHONE Bot</span>
                      <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">À l'instant</span>
                  </div>
                </div>
                {builderResponseType === "TEXT" ? (
                  <p className="text-xs text-neutral-200 whitespace-pre-wrap">{builderRawText || "Texte de la réponse..."}</p>
                ) : (
                  <div className="border-l-4 rounded-r-xl p-3.5 space-y-2 bg-[#1E1F22]" style={{ borderColor: builderEmbedColor }}>
                    <h4 className="text-sm font-bold text-white">{builderEmbedTitle || "Titre de l'Embed"}</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{builderEmbedDesc || "Description de l'embed."}</p>
                    {builderEmbedFooter && <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">{builderEmbedFooter}</p>}
                  </div>
                )}
                {builderButtonLabel && (
                  <button type="button" className="px-3 py-1.5 rounded bg-neutral-700 text-white text-xs font-bold flex items-center gap-1">
                    <span>{builderButtonLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Simulateur */}
        {activeTab === "simulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2"><Terminal className="w-5 h-5 text-emerald-400" /> Simulateur</h3>
                <span className="text-xs text-neutral-500 font-mono">{isDemo ? "Aperçu local" : "Rendu par le bot (dry-run)"}</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {isDemo ? "Aperçu calculé localement." : "Le bot rend la réponse avec ses vraies variables, sans exécuter les actions de rôle."}
              </p>
              <form onSubmit={handleSimulate} className="flex gap-2">
                <input type="text" value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="/regles ou !site" className="flex-1 h-11 rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500" />
                <button type="submit" className="px-5 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer">
                  <Play className="w-4 h-4" />
                  Exécuter
                </button>
              </form>
              <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400 flex-wrap">
                <span>Raccourcis :</span>
                {commands.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setSimInput(`/${c.name}`); runSimulation(c.name); }} className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-indigo-500 text-indigo-400 font-mono cursor-pointer">
                    /{c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#2B2D31] rounded-2xl p-5 border border-neutral-800 shadow-2xl space-y-4 font-sans min-h-[280px]">
              <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-neutral-400" /> salon-test-bot</span>
                <span className="text-[10px] text-neutral-400">{isDemo ? "Démo" : "Connecté"}</span>
              </div>
              {!simOutput && <p className="text-xs text-neutral-500">Lance une commande pour voir le rendu.</p>}
              {simOutput && "error" in simOutput && <p className="text-xs text-rose-300">❌ {simOutput.error}</p>}
              {simOutput && Array.isArray(simOutput) && simOutput.map((p, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">ET</div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">ETHONE Bot</span>
                        <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1 rounded">BOT</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">À l'instant</span>
                    </div>
                  </div>
                  {p.content && <p className="text-xs text-neutral-200 whitespace-pre-wrap">{p.content}</p>}
                  {p.embed && (
                    <div className="border-l-4 rounded-r-xl p-3.5 space-y-2 bg-[#1E1F22]" style={{ borderColor: colorToHex(p.embed.color) }}>
                      {p.embed.title && <h4 className="text-sm font-bold text-white">{p.embed.title}</h4>}
                      {p.embed.description && <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{p.embed.description}</p>}
                      {p.embed.footer?.text && <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800">{p.embed.footer.text}</p>}
                    </div>
                  )}
                  {p.buttons && <span className="text-[10px] text-neutral-400">+ boutons</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-indigo-400" /> Templates prêts à l'emploi</h2>
            {templates.length === 0 ? (
              <p className="text-xs text-neutral-500">{isDemo ? "Connecte un serveur pour charger les templates du bot." : "Aucun template disponible."}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <div key={t.name} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-indigo-400">/{t.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">{t.category || "Général"}</span>
                    </div>
                    <p className="text-xs text-neutral-400">{t.description || "Template de commande."}</p>
                    <button onClick={() => createFromTemplate(t.name)} disabled={submitting} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" />
                      Installer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
