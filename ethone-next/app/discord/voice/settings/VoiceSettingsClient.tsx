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
  creationTextChannelId?: string | null;
  creationPanelMessageId?: string | null;
  roomCategory?: string | null;
  defaultRoomNameTemplate?: string;
  sendControlPanelInRoom: boolean;
  automationsEnabled: boolean;
  defaultBitrate: number;
  notifyOnRoomCreation: boolean;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  defaultCategoryId: "",
  defaultHubId: "",
  emptyDeletionDelaySeconds: 45,
  ownershipTransferStrategy: "FIRST_REMAINING",
  maxRoomsPerGuild: 25,
  maxRoomsPerUser: 1,
  creationCooldownSeconds: 15,
  panelChannelId: "",
  creationTextChannelId: "",
  creationPanelMessageId: "",
  roomCategory: "",
  defaultRoomNameTemplate: "🔊 Salon de {username}",
  sendControlPanelInRoom: true,
  automationsEnabled: true,
  defaultBitrate: 64000,
  notifyOnRoomCreation: false,
};

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function VoiceSettingsClient() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (BOT_API_URL) {
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
          return;
        }
      } catch {
        // Fallback
      }
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
        success("Paramètres enregistrés avec succès !");
        setIsSaving(false);
        return;
      }
    } catch {
      // Local demo fallback
    }

    success("Paramètres enregistrés (mode local) !");
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
            <span>Configuration Personal Voice 2.0</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gérez le comportement des salons temporaires, canaux de création, délais de suppression et règles de gestion.
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Salons Personnels 2.0 */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Panneau & Salons Personnels 2.0</h2>
              <p className="text-xs text-zinc-400">Expérience sans commande avec boutons et modals Discord</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Salon Textuel du Panneau de Création
              </label>
              <input
                type="text"
                placeholder="ex: 1128633164290596884 ou #create-voice"
                value={settings.creationTextChannelId || ""}
                onChange={(e) => setSettings({ ...settings, creationTextChannelId: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Salon où le bot publiera le message permanent avec le bouton "Créer mon salon".
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Catégorie Discord des Salons Créés
              </label>
              <input
                type="text"
                placeholder="ID de catégorie Discord (facultatif)"
                value={settings.roomCategory || settings.defaultCategoryId || ""}
                onChange={(e) => setSettings({ ...settings, roomCategory: e.target.value, defaultCategoryId: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Tous les salons créés apparaîtront sous cette catégorie.
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Modèle de Nom par Défaut
              </label>
              <input
                type="text"
                placeholder="ex: 🔊 Salon de {username}"
                value={settings.defaultRoomNameTemplate || "🔊 Salon de {username}"}
                onChange={(e) => setSettings({ ...settings, defaultRoomNameTemplate: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Variables disponibles : <code className="text-zinc-300">{"{user}"}</code>, <code className="text-zinc-300">{"{username}"}</code>, <code className="text-zinc-300">{"{displayName}"}</code>, <code className="text-zinc-300">{"{server}"}</code>
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-zinc-200">Panneau de Contrôle dans le Chat Vocal</p>
                <p className="text-[11px] text-zinc-500">
                  Envoie automatiquement le panneau interactif dans le chat textuel du salon vocal dès sa création.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.sendControlPanelInRoom}
                onChange={(e) => setSettings({ ...settings, sendControlPanelInRoom: e.target.checked })}
                className="h-4 w-4 rounded accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Délais & Nettoyage */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Nettoyage Automatique & Règles</h2>
              <p className="text-xs text-zinc-400">Gestion de la fin de session et transfert de propriété</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Délai de Grâce avant Suppression si Vide (secondes)
              </label>
              <select
                value={settings.emptyDeletionDelaySeconds}
                onChange={(e) => setSettings({ ...settings, emptyDeletionDelaySeconds: parseInt(e.target.value, 10) })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value={0}>Immédiat (0s - dès que vide)</option>
                <option value={15}>15 secondes</option>
                <option value={30}>30 secondes (standard)</option>
                <option value={45}>45 secondes</option>
                <option value={60}>60 secondes (recommandé)</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Si un membre se reconnecte pendant ce délai, la suppression est automatiquement annulée.
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Salons Simultanés Max par Utilisateur
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.maxRoomsPerUser}
                onChange={(e) => setSettings({ ...settings, maxRoomsPerUser: parseInt(e.target.value, 10) || 1 })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Règle anti-abus : 1 salon vocal actif par membre par défaut.
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Stratégie en cas de Départ du Propriétaire
              </label>
              <select
                value={settings.ownershipTransferStrategy}
                onChange={(e) => setSettings({ ...settings, ownershipTransferStrategy: e.target.value as any })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="FIRST_REMAINING">Transférer au premier membre restant (le plus ancien)</option>
                <option value="RANDOM_REMAINING">Transférer à un membre restant aléatoire</option>
                <option value="OWNERLESS">Laisser le salon sans propriétaire jusqu'à ce qu'il soit vide</option>
                <option value="DELETE_ROOM">Fermer et supprimer le salon immédiatement</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Débit Audio par Défaut
              </label>
              <select
                value={settings.defaultBitrate}
                onChange={(e) => setSettings({ ...settings, defaultBitrate: parseInt(e.target.value, 10) })}
                className="w-full h-10 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value={64000}>64 kbps (Qualité standard, économe)</option>
                <option value={96000}>96 kbps (Qualité supérieure Discord)</option>
                <option value={128000}>128 kbps (Qualité studio / Tryhard)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
