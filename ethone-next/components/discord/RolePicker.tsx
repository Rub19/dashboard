"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Shield, Edit3, ListFilter, X, Check, Loader2 } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import { subscribeGuildLive } from "@/lib/guildLive";

export interface RoleOption {
  id: string;
  name: string;
  color?: string | number;
  manageable?: boolean;
}

export interface RolePickerProps {
  value: string | null | undefined;
  onChange: (roleId: string, role?: RoleOption) => void;
  roles?: RoleOption[];
  guildId?: string | null;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  filterManageable?: boolean;
  size?: "sm" | "default";
}

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const globalRoleCache = new Map<string, RoleOption[]>();
const globalRoleLoading = new Map<string, Promise<RoleOption[]>>();

/**
 * Charge les rôles d'un serveur depuis l'API bot avec mise en cache mémoire
 */
export async function fetchGuildRoles(guildId: string): Promise<RoleOption[]> {
  if (globalRoleCache.has(guildId)) {
    return globalRoleCache.get(guildId)!;
  }
  if (globalRoleLoading.has(guildId)) {
    return globalRoleLoading.get(guildId)!;
  }

  const promise = (async () => {
    try {
      // 1. Essayer /server/roles
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/server/roles`, {
        credentials: "include",
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const list: any[] = Array.isArray(data?.roles)
          ? data.roles
          : Array.isArray(data)
          ? data
          : [];
        const mapped: RoleOption[] = list
          .filter((r) => !r.managed && r.name !== "@everyone")
          .map((r) => ({
            id: String(r.id),
            name: String(r.name),
            color: r.color,
            manageable: r.manageable,
          }));
        globalRoleCache.set(guildId, mapped);
        return mapped;
      }

      // 2. Fallback /welcome/roles
      const fallbackRes = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/welcome/roles`, {
        credentials: "include",
      }).catch(() => null);

      if (fallbackRes && fallbackRes.ok) {
        const data = await fallbackRes.json().catch(() => null);
        const list: any[] = Array.isArray(data?.roles)
          ? data.roles
          : Array.isArray(data)
          ? data
          : [];
        const mapped: RoleOption[] = list
          .filter((r) => !r.managed && r.name !== "@everyone")
          .map((r) => ({
            id: String(r.id),
            name: String(r.name),
            color: r.color,
            manageable: r.manageable,
          }));
        globalRoleCache.set(guildId, mapped);
        return mapped;
      }
    } catch {
      // ignore
    } finally {
      globalRoleLoading.delete(guildId);
    }
    return [];
  })();

  globalRoleLoading.set(guildId, promise);
  return promise;
}

/**
 * Formate une couleur Discord (entier numérique ou hex string) en code couleur hex CSS
 */
function formatColor(color?: string | number): string | null {
  if (!color || color === 0 || color === "0") return null;
  if (typeof color === "string" && color.startsWith("#")) return color;
  const num = typeof color === "number" ? color : parseInt(String(color), 10);
  if (isNaN(num) || num <= 0) return null;
  return `#${num.toString(16).padStart(6, "0")}`;
}

/**
 * Sélecteur universel de rôles Discord :
 * - Mode déroulant : liste des rôles avec pastille couleur + @nom
 * - Mode ID : saisie directe de l'ID du rôle
 * - Switch facile via un bouton [ID] / [Liste]
 * - Cache mémoire partagé
 * - Fallback si l'ID n'est pas dans la liste
 */
export default function RolePicker({
  value,
  onChange,
  roles: propRoles,
  guildId,
  placeholder = "Sélectionner ou saisir un ID...",
  emptyLabel = "— Aucun rôle —",
  className,
  inputClassName,
  disabled = false,
  required = false,
  allowClear = true,
  filterManageable = false,
  size = "default",
}: RolePickerProps) {
  const [fetchedRoles, setFetchedRoles] = useState<RoleOption[]>(() => {
    if (guildId && globalRoleCache.has(guildId)) {
      return globalRoleCache.get(guildId)!;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Un rôle est créé, renommé ou supprimé sur Discord : on oublie le cache et on recharge la liste (sans recharger la page).
  useEffect(() => {
    if (!guildId) return;
    return subscribeGuildLive(guildId, (ev) => {
      if (ev.type === "DISCORD_EVENT" && ev.payload?.kind === "roles") {
        globalRoleCache.delete(guildId);
        setRefreshTick((t) => t + 1);
      }
    });
  }, [guildId]);

  // Charger automatiquement si guildId est fourni et propRoles non fourni
  useEffect(() => {
    if (propRoles && propRoles.length > 0) return;
    if (!guildId) return;

    if (globalRoleCache.has(guildId)) {
      setFetchedRoles(globalRoleCache.get(guildId)!);
      return;
    }

    let active = true;
    setLoading(true);
    fetchGuildRoles(guildId).then((data) => {
      if (active) {
        setFetchedRoles(data);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [guildId, propRoles, refreshTick]);

  // Liste finale des rôles disponibles
  const availableRoles = useMemo(() => {
    const base = propRoles && propRoles.length > 0 ? propRoles : fetchedRoles;
    if (filterManageable) {
      return base.filter((r) => r.manageable !== false);
    }
    return base;
  }, [propRoles, fetchedRoles, filterManageable]);

  const currentId = (value || "").trim();
  const matchedRole = useMemo(() => {
    if (!currentId) return null;
    return availableRoles.find((r) => r.id === currentId) || null;
  }, [availableRoles, currentId]);

  // Déterminer le mode initial
  const [mode, setMode] = useState<"select" | "id">(() => {
    if (currentId && availableRoles.length > 0 && !matchedRole) {
      return "id";
    }
    return "select";
  });

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
    const found = availableRoles.find((r) => r.id === newVal);
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
                "w-full rounded-xl border border-[var(--panel-border)] bg-zinc-900/80 text-white outline-none transition-all appearance-none cursor-pointer focus:border-indigo-500/50 disabled:opacity-50",
                isSmall ? "h-8 px-2.5 pr-8 text-[11px]" : "h-9 px-3 pr-8 text-xs",
                inputClassName
              )}
            >
              {allowClear && <option value="">{emptyLabel}</option>}

              {/* Si un ID est défini mais n'est pas dans la liste */}
              {currentId && !matchedRole && (
                <option value={currentId}>
                  @Rôle sélectionné ({currentId})
                </option>
              )}

              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  @{r.name}
                </option>
              ))}

              <option disabled>──────────</option>
              <option value="__MANUAL_ID__">✏️ Saisir un ID manuellement...</option>
            </select>

            {/* Indicateur de chargement ou icône bouclier */}
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>
        ) : (
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={currentId}
              onChange={(e) => {
                const val = e.target.value.trim();
                const found = availableRoles.find((r) => r.id === val);
                onChange(val, found);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-xl border border-[var(--panel-border)] bg-zinc-900/80 pl-8 pr-8 text-white font-mono outline-none transition-all focus:border-indigo-500/50 disabled:opacity-50",
                isSmall ? "h-8 text-[11px]" : "h-9 text-xs",
                inputClassName
              )}
            />
            {currentId && (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title="Effacer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Bouton de bascule Mode Déroulant / Mode ID */}
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={disabled}
          title={
            mode === "select"
              ? "Saisir un ID manuellement (mode expert)"
              : "Choisir dans la liste des rôles"
          }
          className={cn(
            "shrink-0 flex items-center justify-center gap-1 rounded-xl border border-[var(--panel-border)] bg-white/5 font-semibold transition-all cursor-pointer hover:bg-white/10 hover:text-white disabled:opacity-50",
            isSmall ? "h-8 px-2 text-[10px]" : "h-9 px-2.5 text-xs",
            mode === "id"
              ? "text-indigo-400 border-indigo-500/40 bg-indigo-500/10"
              : "text-zinc-400"
          )}
        >
          {mode === "select" ? (
            <>
              <Edit3 className="w-3 h-3" />
              <span className="hidden sm:inline">ID</span>
            </>
          ) : (
            <>
              <ListFilter className="w-3 h-3" />
              <span className="hidden sm:inline">Liste</span>
            </>
          )}
        </button>
      </div>

      {/* Détail du rôle sélectionné */}
      {matchedRole && (
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-zinc-400">
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="truncate">
            Rôle :{" "}
            <span
              className="font-semibold"
              style={{ color: formatColor(matchedRole.color) || "#818cf8" }}
            >
              @{matchedRole.name}
            </span>
          </span>
          <span className="text-zinc-600 font-mono text-[10px]">
            ({matchedRole.id})
          </span>
        </div>
      )}
    </div>
  );
}
