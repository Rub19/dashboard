"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Radio,
  Sliders,
  Clock,
  RefreshCw,
  Bot,
} from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useDiscordOAuth, type DiscordGuild, canManageGuild, getStoredDiscordGuilds } from "@/lib/hooks/useDiscordOAuth";
import { useBotGuildIds, pickBotGuild } from "@/lib/hooks/useBotGuildIds";
import { GuildSelector } from "@/components/GuildSelector";
import ChannelPicker from "@/components/discord/ChannelPicker";
import { formatApiError } from "@/lib/format-error";
import { cn } from "@/lib/utils";
import Select from "@/components/ui/Select";

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

const BOT_CLIENT_ID = "1545139931154878464";
const BOT_INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

export default function VoiceSettingsClient() {
  const searchParams = useSearchParams();
  const { profile } = useDiscordOAuth();
  const allGuilds: DiscordGuild[] = useMemo(() => {
    if (profile?.guilds && profile.guilds.length > 0) return profile.guilds;
    return getStoredDiscordGuilds();
  }, [profile?.guilds]);

  const botGuildIds = useBotGuildIds(allGuilds);
  const manageableGuilds: DiscordGuild[] = useMemo(() => {
    if (allGuilds.length === 0) return [];
    const manageable = allGuilds.filter((g) => canManageGuild(g) || (botGuildIds && botGuildIds.includes(g.id)));
    return manageable.length > 0 ? manageable : allGuilds;
  }, [allGuilds, botGuildIds]);

  const appliedQueryGuild = useRef<string | null>(null);
  const userSelectedRef = useRef(false);
  const queryGuildId = searchParams.get("guildId");
  const [selectedGuild, setSelectedGuild] = useState<DiscordGuild | null>(null);

  useEffect(() => {
    if (manageableGuilds.length === 0) return;
    if (queryGuildId && appliedQueryGuild.current !== queryGuildId) {
      const match = manageableGuilds.find((g) => g.id === queryGuildId);
      if (match) {
        appliedQueryGuild.current = queryGuildId;
        setSelectedGuild(match);
        return;
      }
    }
    if (!userSelectedRef.current && !queryGuildId) {
      if (!selectedGuild) {
        if (botGuildIds !== null) {
          setSelectedGuild(pickBotGuild(manageableGuilds, botGuildIds)!);
        }
      } else if (botGuildIds && botGuildIds.length > 0 && !botGuildIds.includes(selectedGuild.id)) {
        const botGuild = pickBotGuild(manageableGuilds, botGuildIds);
        if (botGuild && botGuild.id !== selectedGuild.id && botGuildIds.includes(botGuild.id)) {
          setSelectedGuild(botGuild);
        }
      }
    }
  }, [manageableGuilds, queryGuildId, selectedGuild, botGuildIds]);

  const guildId = selectedGuild?.id || "";
  const isBotPresent = Boolean(guildId && botGuildIds && botGuildIds.includes(guildId));
  const { success, error: showError } = useToast();

  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = useCallback(async (notify = false) => {
    if (!BOT_API_URL || !guildId || !isBotPresent) return;
    setLoadingCategories(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/channels`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const cats = Array.isArray(data?.categories)
          ? data.categories.map((c: any) => ({ id: c.id, name: c.name }))
          : [];
        setCategories(cats);
        if (notify) success("Catégories actualisées !");
      } else if (notify) {
        const errBody = await res.json().catch(() => null);
        showError("Impossible d'actualiser les catégories.", formatApiError(errBody?.error, `Erreur HTTP ${res.status}`));
      }
    } catch {
      // Silencieux au chargement initial ; sur une actualisation demandée par l'utilisateur, on le signale.
      if (notify) showError("Impossible d'actualiser les catégories.", "Le bot n'a pas répondu.");
    } finally {
      setLoadingCategories(false);
    }
  }, [guildId, isBotPresent, success, showError]);

  const fetchSettings = useCallback(async () => {
    if (!BOT_API_URL || !guildId || !isBotPresent) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/settings`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [guildId, isBotPresent]);

  useEffect(() => {
    Promise.all([fetchSettings(), fetchCategories(false)]).finally(() => setLoading(false));
  }, [fetchSettings, fetchCategories]);

  const handleSave = async () => {
    if (!guildId || !BOT_API_URL) {
      showError("Bot injoignable", "Rien n'a été enregistré.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/voice/settings`, {
        credentials: "include",
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));

      success("Paramètres enregistrés avec succès !");
    } catch (err: any) {
      showError("Erreur", formatApiError(err, "Impossible d'enregistrer les paramètres."));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-muted)]">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Chargement des paramètres...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 space-y-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/discord/voice${guildId ? `?guildId=${guildId}` : ""}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour aux Salons Vocaux</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-2 mt-2">
            <Sliders className="h-6 w-6 text-emerald-400" />
            <span>Configuration Personal Voice</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Gérez le comportement des salons temporaires, canaux de création, délais de suppression et règles de gestion.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {manageableGuilds.length > 0 && (
            <GuildSelector
              guilds={manageableGuilds}
              value={selectedGuild?.id || ""}
              onChange={(g) => {
                userSelectedRef.current = true;
                setSelectedGuild(g);
              }}
            />
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 text-xs font-bold text-[var(--accent-contrast)] hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Enregistrement..." : "Enregistrer les modifications"}</span>
          </button>
        </div>
      </div>

      {selectedGuild && botGuildIds !== null && !botGuildIds.includes(selectedGuild.id) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 shrink-0 mt-0.5">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Le bot ETHONE n&apos;est pas installé sur ce serveur</p>
              <p className="mt-0.5 text-[var(--text-muted)]">
                Invitez le bot sur « {selectedGuild.name} » pour activer les salons vocaux temporaires et le panneau de contrôle.
              </p>
            </div>
          </div>
          <a
            href={`${BOT_INVITE_URL}&guild_id=${selectedGuild.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:brightness-110 shrink-0 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            Inviter le bot
          </a>
        </div>
      )}

      {/* Grid Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Salons Personnels */}
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Panneau & Salons Personnels</h2>
              <p className="text-xs text-[var(--text-muted)]">Expérience sans commande avec boutons et modals Discord</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Salon Textuel du Panneau de Création
              </label>
              <ChannelPicker
                guildId={guildId}
                value={settings.creationTextChannelId || ""}
                onChange={(val) => setSettings({ ...settings, creationTextChannelId: val || "" })}
                placeholder="Sélectionner un salon textuel pour le panneau..."
                size="sm"
                allowClear
              />
              <span className="text-xs text-[var(--text-muted)] mt-1 block">
                Salon où le bot publiera le message permanent avec le bouton "Créer mon salon".
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[var(--text-muted)] font-semibold text-xs">
                  Catégorie Discord des Salons Créés
                </label>
                <button
                  type="button"
                  onClick={() => fetchCategories(true)}
                  disabled={loadingCategories}
                  className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
                  title="Rafraîchir les catégories Discord"
                >
                  <RefreshCw className={cn("h-3 w-3", loadingCategories && "animate-spin text-emerald-300")} />
                  <span>Actualiser</span>
                </button>
              </div>

              {categories.length > 0 ? (
                <Select
                  value={settings.roomCategory || settings.defaultCategoryId || ""}
                  onChange={(v) => setSettings({ ...settings, roomCategory: v, defaultCategoryId: v })}
                  className="w-full"
                  aria-label="Catégorie Discord des salons créés"
                  options={[
                    { id: "", label: "⚡ Automatique : Même catégorie que le salon de création (Recommandé)" },
                    ...categories.map((cat) => ({ id: cat.id, label: `📁 ${cat.name}` })),
                  ]}
                />
              ) : (
                <input
                  type="text"
                  placeholder="Laisser vide pour automatique, ou ID de catégorie (facultatif)"
                  value={settings.roomCategory || settings.defaultCategoryId || ""}
                  onChange={(e) => setSettings({ ...settings, roomCategory: e.target.value, defaultCategoryId: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs focus:outline-none focus:border-[var(--input-border-hover)]"
                />
              )}
              <span className="text-xs text-[var(--text-muted)] mt-1.5 block">
                Par défaut (recommandé), le bot place automatiquement le salon vocal dans la même catégorie que le salon de création (salon déclencheur Join-to-Create ou panneau). Vous pouvez aussi forcer une catégorie spécifique.
              </span>
            </div>

            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Modèle de Nom par Défaut
              </label>
              <input
                type="text"
                placeholder="ex: 🔊 Salon de {username}"
                value={settings.defaultRoomNameTemplate || "🔊 Salon de {username}"}
                onChange={(e) => setSettings({ ...settings, defaultRoomNameTemplate: e.target.value })}
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--input-border-hover)] font-mono"
              />
              <span className="text-xs text-[var(--text-muted)] mt-1 block">
                Variables disponibles : <code className="text-[var(--text-muted)]">{"{user}"}</code>, <code className="text-[var(--text-muted)]">{"{username}"}</code>, <code className="text-[var(--text-muted)]">{"{displayName}"}</code>, <code className="text-[var(--text-muted)]">{"{server}"}</code>
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Panneau de Contrôle dans le Chat Vocal</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Envoie automatiquement le panneau interactif dans le chat textuel du salon vocal dès sa création.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.sendControlPanelInRoom}
                onChange={(e) => setSettings({ ...settings, sendControlPanelInRoom: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Délais & Nettoyage */}
        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Nettoyage Automatique & Règles</h2>
              <p className="text-xs text-[var(--text-muted)]">Gestion de la fin de session et transfert de propriété</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Délai de Grâce avant Suppression si Vide (secondes)
              </label>
              <Select
                value={String(settings.emptyDeletionDelaySeconds)}
                onChange={(v) => setSettings({ ...settings, emptyDeletionDelaySeconds: parseInt(v, 10) })}
                className="w-full"
                aria-label="Délai de grâce avant suppression si vide"
                options={[
                  { id: "0", label: "Immédiat (0s - dès que vide)" },
                  { id: "15", label: "15 secondes" },
                  { id: "30", label: "30 secondes (standard)" },
                  { id: "45", label: "45 secondes" },
                  { id: "60", label: "60 secondes (recommandé)" },
                  { id: "120", label: "2 minutes" },
                  { id: "300", label: "5 minutes" },
                ]}
              />
              <span className="text-xs text-[var(--text-muted)] mt-1 block">
                Si un membre se reconnecte pendant ce délai, la suppression est automatiquement annulée.
              </span>
            </div>

            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Salons Simultanés Max par Utilisateur
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={settings.maxRoomsPerUser}
                onChange={(e) => setSettings({ ...settings, maxRoomsPerUser: parseInt(e.target.value, 10) || 1 })}
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--surface-raised)]/40 border border-[var(--panel-border)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-[var(--text-muted)] mt-1 block">
                Règle anti-abus : 1 salon vocal actif par membre par défaut.
              </span>
            </div>

            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Stratégie en cas de Départ du Propriétaire
              </label>
              <Select
                value={settings.ownershipTransferStrategy}
                onChange={(v) => setSettings({ ...settings, ownershipTransferStrategy: v as any })}
                className="w-full"
                aria-label="Stratégie en cas de départ du propriétaire"
                options={[
                  { id: "FIRST_REMAINING", label: "Transférer au premier membre restant (le plus ancien)" },
                  { id: "RANDOM_REMAINING", label: "Transférer à un membre restant aléatoire" },
                  { id: "OWNERLESS", label: "Laisser le salon sans propriétaire jusqu'à ce qu'il soit vide" },
                  { id: "DELETE_ROOM", label: "Fermer et supprimer le salon immédiatement" },
                ]}
              />
            </div>

            <div>
              <label className="block text-[var(--text-muted)] font-semibold mb-1">
                Débit Audio par Défaut
              </label>
              <Select
                value={String(settings.defaultBitrate)}
                onChange={(v) => setSettings({ ...settings, defaultBitrate: parseInt(v, 10) })}
                className="w-full"
                aria-label="Débit audio par défaut"
                options={[
                  { id: "64000", label: "64 kbps (Qualité standard, économe)" },
                  { id: "96000", label: "96 kbps (Qualité supérieure Discord)" },
                  { id: "128000", label: "128 kbps (Qualité studio / Tryhard)" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
