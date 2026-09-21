"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Hash, Edit3, ListFilter, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChannelOption {
  id: string;
  name: string;
  type?: number;
}

export interface ChannelPickerProps {
  value: string | null | undefined;
  onChange: (channelId: string, channel?: ChannelOption) => void;
  channels?: ChannelOption[];
  guildId?: string | null;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  filterTypes?: number[]; // ex: [0, 5] pour salons textuels
  size?: "sm" | "default";
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const globalChannelCache = new Map<string, ChannelOption[]>();
const globalChannelLoading = new Map<string, Promise<ChannelOption[]>>();

/**
 * Charge les salons d'un serveur depuis l'API bot avec mise en cache mémoire
 */
async function fetchGuildChannels(guildId: string): Promise<ChannelOption[]> {
  if (globalChannelCache.has(guildId)) {
    return globalChannelCache.get(guildId)!;
  }
  if (globalChannelLoading.has(guildId)) {
    return globalChannelLoading.get(guildId)!;
  }

  const promise = (async () => {
    try {
      // 1. Essayer /server/channels (arborescence complète)
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/channels`, {
        credentials: "include",
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const all = [
            ...(data.categories || []).flatMap((c: any) => c.channels || []),
            ...(data.orphanChannels || []),
            ...(Array.isArray(data.channels) ? data.channels : []),
          ];
          const parsed = all
            .filter((c: any) => c && c.id && c.name)
            .map((c: any) => ({ id: String(c.id), name: String(c.name), type: c.type }));
          if (parsed.length > 0) {
            globalChannelCache.set(guildId, parsed);
            return parsed;
          }
        }
      }

      // 2. Fallback sur /polls/channels ou /giveaways/channels
      const fallbackRes = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/polls/channels`, {
        credentials: "include",
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const data = await fallbackRes.json().catch(() => null);
        if (Array.isArray(data?.channels)) {
          const parsed = data.channels.map((c: any) => ({
            id: String(c.id),
            name: String(c.name),
            type: c.type ?? 0,
          }));
          globalChannelCache.set(guildId, parsed);
          return parsed;
        }
      }
    } catch {
      // Erreur silencieuse
    }
    return [];
  })();

  globalChannelLoading.set(guildId, promise);
  const result = await promise;
  globalChannelLoading.delete(guildId);
  return result;
}

export default function ChannelPicker({
  value,
  onChange,
  channels: propChannels,
  guildId,
  placeholder = "ID du salon (ex: 123456789012345678)",
  emptyLabel = "— Sélectionner un salon —",
  className,
  inputClassName,
  disabled = false,
  allowClear = true,
  filterTypes,
  size = "default",
}: ChannelPickerProps) {
  const [fetchedChannels, setFetchedChannels] = useState<ChannelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger les salons via guildId si non fournis
  useEffect(() => {
    if (propChannels && propChannels.length > 0) return;
    if (!guildId) return;

    if (globalChannelCache.has(guildId)) {
      setFetchedChannels(globalChannelCache.get(guildId)!);
      return;
    }

    let active = true;
    setLoading(true);
    fetchGuildChannels(guildId)
      .then((list) => {
        if (active) {
          setFetchedChannels(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [guildId, propChannels]);

  // Liste finale des salons disponibles
  const rawChannels = (propChannels && propChannels.length > 0) ? propChannels : fetchedChannels;
  const availableChannels = useMemo(() => {
    if (!filterTypes || filterTypes.length === 0) return rawChannels;
    return rawChannels.filter((c) => c.type === undefined || filterTypes.includes(c.type));
  }, [rawChannels, filterTypes]);

  const currentId = (value || "").trim();
  const matchedChannel = useMemo(() => {
    if (!currentId) return null;
    return availableChannels.find((c) => c.id === currentId) || null;
  }, [availableChannels, currentId]);

  // Déterminer le mode initial :
  // Si on a des salons ou si le salon courant correspond à un salon connu -> mode "select"
  // Sinon si currentId est renseigné mais non trouvé dans une liste chargée -> mode "id"
  const [mode, setMode] = useState<"select" | "id">(() => {
    if (currentId && availableChannels.length > 0 && !matchedChannel) {
      return "id";
    }
    return "select";
  });

  // Quand on bascule en mode ID, donner le focus
  const handleToggleMode = () => {
    const nextMode = mode === "select" ? "id" : "select";
    setMode(nextMode);
    if (nextMode === "id") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSelectChange = (newVal: string) => {
    if (newVal === "__MANUAL_ID__") {
      setMode("id");
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    const found = availableChannels.find((c) => c.id === newVal);
    onChange(newVal, found);
  };

  const isSmall = size === "sm";

  return (
    <div className={cn("space-y-1 w-full", className)}>
      <div className="relative flex items-center gap-1.5">
        {mode === "select" ? (
          <div className="relative flex-1 min-w-0">
            <select
              value={currentId}
              onChange={(e) => handleSelectChange(e.target.value)}
              disabled={disabled || loading}
              className={cn(
                "w-full rounded-xl border border-[var(--panel-border)] bg-zinc-900/80 text-white outline-none transition-all appearance-none cursor-pointer focus:border-amber-500/50 disabled:opacity-50",
                isSmall ? "h-8 px-2.5 pr-8 text-[11px]" : "h-9 px-3 pr-8 text-xs",
                inputClassName
              )}
            >
              {allowClear && <option value="">{emptyLabel}</option>}

              {/* Si un ID est défini mais n'est pas dans la liste */}
              {currentId && !matchedChannel && (
                <option value={currentId}>
                  # Salon sélectionné ({currentId})
                </option>
              )}

              {availableChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}

              <option disabled>──────────</option>
              <option value="__MANUAL_ID__">✏️ Saisir un ID manuellement...</option>
            </select>

            {/* Indicateur de chargement ou chevron */}
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>
        ) : (
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Hash className="w-3.5 h-3.5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={currentId}
              onChange={(e) => {
                const val = e.target.value.trim();
                const found = availableChannels.find((c) => c.id === val);
                onChange(val, found);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-xl border border-[var(--panel-border)] bg-zinc-900/80 pl-8 pr-8 text-white font-mono outline-none transition-all focus:border-amber-500/50 disabled:opacity-50",
                isSmall ? "h-8 text-[11px]" : "h-9 text-xs",
                inputClassName
              )}
            />
            {currentId && allowClear && !disabled && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Bouton de bascule Liste <-> Saisie ID */}
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={disabled}
          className={cn(
            "shrink-0 rounded-xl border transition-all flex items-center justify-center cursor-pointer disabled:opacity-40",
            isSmall ? "h-8 px-2 text-[10px]" : "h-9 px-2.5 text-xs",
            mode === "id"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border-[var(--panel-border)] bg-[var(--surface-raised)] text-zinc-400 hover:text-white hover:bg-zinc-800"
          )}
          title={
            mode === "select"
              ? "Basculer vers la saisie manuelle de l'identifiant (ID)"
              : "Basculer vers la liste déroulante des salons"
          }
        >
          {mode === "select" ? (
            <span className="flex items-center gap-1 font-semibold">
              <Edit3 className="w-3 h-3 text-amber-400" />
              <span>ID</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold">
              <ListFilter className="w-3 h-3 text-amber-400" />
              <span>Liste</span>
            </span>
          )}
        </button>
      </div>

      {/* Indication visuelle en mode ID si le salon est reconnu */}
      {mode === "id" && matchedChannel && (
        <div className="flex items-center gap-1 text-[11px] text-emerald-400 pl-1">
          <Check className="w-3 h-3" />
          <span>
            Salon reconnu : <strong className="text-white">#{matchedChannel.name}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
