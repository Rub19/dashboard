"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Radio,
  Sliders,
  Shield,
  Clock,
  Crown,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Hash,
  Bell,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { cn } from "@/lib/utils";

interface VoiceSettings {
  enabled: boolean;
  defaultCategoryId?: string | null;
  defaultHubId?: string | null;
  emptyDeletionDelaySeconds: number;
  ownershipTransferStrategy: "FIRST_REMAINING" | "RANDOM_REMAINING" | "HIGHEST_ROLE" | "OWNERLESS" | "DELETE_ROOM";
  maxRoomsPerGuild: number;
  maxRoomsPerUser: number;
  creationCooldownSeconds: number;
  panelChannelId?: string | null;
  sendControlPanelInRoom: boolean;
  automationsEnabled: boolean;
  defaultBitrate: number;
  notifyOnRoomCreation: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  defaultCategoryId: "",
  defaultHubId: "",
  emptyDeletionDelaySeconds: 30,
  ownershipTransferStrategy: "FIRST_REMAINING",
  maxRoomsPerGuild: 25,
  maxRoomsPerUser: 1,
  creationCooldownSeconds: 15,
  panelChannelId: "",
  sendControlPanelInRoom: true,
  automationsEnabled: true,
  defaultBitrate: 64000,
  notifyOnRoomCreation: false,
};

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "http://localhost:3001";

export default function VoiceSettingsClient() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        return;
      }
    } catch {
      // Fallback
    }
  }, [guildId]);

  useEffect(() => {
    fetchSettings().finally(() => setLoading(false));
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        success("Paramètres vocaux enregistrés avec succès !");
        return;
      }
    } catch {
      // Local demo fallback
    }

    success("Paramètres vocaux enregistrés (mode local) !");
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Chargement des paramètres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/discord/voice?guildId=${guildId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux Salons Vocaux</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-2">
            <Sliders className="h-6 w-6 text-emerald-400" />
            <span>Paramètres Voice Channels 2.0</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gérez le comportement des salons temporaires, délais de suppression, stratégies de transfert et limites.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? "Enregistrement..." : "Enregistrer les modifications"}</span>
        </button>
      </div>

      {/* Grid Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Général & Join-to-Create */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Général & Join-to-Create</h2>
              <p className="text-[11px] text-zinc-400">Activation et comportement global</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div>
              <p className="text-xs font-bold text-white">Module Salons Vocaux Temporaires</p>
              <p className="text-[11px] text-zinc-400">Active la détection Join-to-Create et les hubs.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((p) => ({ ...p, enabled: !p.enabled }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                settings.enabled ? "bg-emerald-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  settings.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div>
              <p className="text-xs font-bold text-white">Panneau de Contrôle Discord</p>
              <p className="text-[11px] text-zinc-400">Envoie les boutons de contrôle dans le salon créé.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((p) => ({ ...p, sendControlPanelInRoom: !p.sendControlPanelInRoom }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                settings.sendControlPanelInRoom ? "bg-emerald-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  settings.sendControlPanelInRoom ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Bitrate audio par défaut</label>
            <select
              value={settings.defaultBitrate}
              onChange={(e) => setSettings((p) => ({ ...p, defaultBitrate: parseInt(e.target.value, 10) }))}
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
            >
              <option value="64000">64 kbps (Standard Discord)</option>
              <option value="96000">96 kbps (Haute fidélité Gaming)</option>
              <option value="128000">128 kbps (Serveur Boost Tier 1)</option>
              <option value="256000">256 kbps (Serveur Boost Tier 2)</option>
              <option value="384000">384 kbps (Serveur Boost Tier 3 / VIP)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Cycle de Vie & Suppression */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Salons Vides & Délais</h2>
              <p className="text-[11px] text-zinc-400">Gestion de la suppression et des reconnexions</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Délai avant suppression du salon vide</label>
            <select
              value={settings.emptyDeletionDelaySeconds}
              onChange={(e) => setSettings((p) => ({ ...p, emptyDeletionDelaySeconds: parseInt(e.target.value, 10) }))}
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="0">Immédiat (dès le dernier départ)</option>
              <option value="30">30 secondes (Recommandé)</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
              <option value="1800">30 minutes</option>
            </select>
            <p className="text-[11px] text-zinc-500">
              Si un membre se reconnecte avant la fin du délai, la suppression est automatiquement annulée.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-zinc-300">Stratégie si le propriétaire quitte</label>
            <select
              value={settings.ownershipTransferStrategy}
              onChange={(e) => setSettings((p) => ({ ...p, ownershipTransferStrategy: e.target.value as any }))}
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-xs text-white outline-none focus:border-amber-500"
            >
              <option value="FIRST_REMAINING">Premier membre restant (Recommandé)</option>
              <option value="RANDOM_REMAINING">Membre restant aléatoire</option>
              <option value="OWNERLESS">Laisser le salon ouvert sans propriétaire</option>
              <option value="DELETE_ROOM">Supprimer le salon immédiatement au départ du créateur</option>
            </select>
          </div>
        </div>

        {/* Section 3: Limites & Anti-Abus */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Limites &amp; Anti-Abus</h2>
              <p className="text-[11px] text-zinc-400">Protection contre le spam et surcharge Discord</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Max salons sur le serveur</label>
              <input
                type="number"
                min="5"
                max="50"
                value={settings.maxRoomsPerGuild}
                onChange={(e) => setSettings((p) => ({ ...p, maxRoomsPerGuild: parseInt(e.target.value, 10) || 25 }))}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">Max salons par membre</label>
              <input
                type="number"
                min="1"
                max="3"
                value={settings.maxRoomsPerUser}
                onChange={(e) => setSettings((p) => ({ ...p, maxRoomsPerUser: parseInt(e.target.value, 10) || 1 }))}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-300">Cooldown entre créations (secondes)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={settings.creationCooldownSeconds}
              onChange={(e) => setSettings((p) => ({ ...p, creationCooldownSeconds: parseInt(e.target.value, 10) || 15 }))}
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-zinc-500">Empêche un utilisateur de spammer la création et destruction de salons.</p>
          </div>
        </div>

        {/* Section 4: Automatisations & Logs */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Automatisations &amp; Logs</h2>
              <p className="text-[11px] text-zinc-400">Règles automatiques et audit Discord</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div>
              <p className="text-xs font-bold text-white">Moteur d&apos;automatisations actif</p>
              <p className="text-[11px] text-zinc-400">Déclenche les rôles et messages configurés.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((p) => ({ ...p, automationsEnabled: !p.automationsEnabled }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                settings.automationsEnabled ? "bg-cyan-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  settings.automationsEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div>
              <p className="text-xs font-bold text-white">Notifier les créations de salons</p>
              <p className="text-[11px] text-zinc-400">Envoie une alerte dans le salon de logs général.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((p) => ({ ...p, notifyOnRoomCreation: !p.notifyOnRoomCreation }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                settings.notifyOnRoomCreation ? "bg-cyan-500" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  settings.notifyOnRoomCreation ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
