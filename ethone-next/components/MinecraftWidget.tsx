"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  LogOut,
  Server,
  Clock,
  Shirt,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  Gamepad2,
  Users,
  Check,
} from "lucide-react";
import { useMinecraftLive } from "@/lib/hooks/useMinecraftLive";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";

type McStatus = {
  online: boolean;
  host?: string;
  ip_address?: string;
  version?: { name?: string; protocol?: number };
  players?: { online?: number; max?: number };
  motd?: { raw?: string; clean?: string; html?: string };
  icon?: string;
  software?: string;
  eula_blocked?: boolean;
};

function formatLastSeen(value?: string | null) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export default function MinecraftWidget({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();

  const { profile, username, uuid, avatarUrl, lastSeen, loading, error, refresh } = useMinecraftLive(60000);

  const [skinIndex, setSkinIndex] = useState(0);
  const [serverAddress, setServerAddress] = useState("");
  const [serverStatus, setServerStatus] = useState<McStatus | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const serverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = profile?.username || profile?.name || username || settings.liveMinecraftUsername;
  const uuidText = profile?.uuidWithDashes || uuid || "";
  const shortUuid = uuidText ? `${uuidText.slice(0, 8)}…` : "";

  const skinUrls = useMemo(() => {
    if (!displayName && !uuid) return [];
    const name = displayName || uuid;
    return [
      profile?.bodyUrl || `https://crafatar.com/renders/body/${uuidText}?overlay&scale=6&width=256&height=256`,
      `https://mc-heads.net/body/${name}/128`,
      `https://mc-heads.net/avatar/${name}/64`,
      avatarUrl || `https://crafatar.com/avatars/${uuidText}?overlay&size=128`,
      `https://mc-heads.net/avatar/Steve/64`,
    ].filter(Boolean) as string[];
  }, [profile, displayName, uuid, uuidText, avatarUrl]);

  const currentSkin = skinUrls[skinIndex] || skinUrls[skinUrls.length - 1];

  useEffect(() => {
    setSkinIndex(0);
  }, [displayName, uuid]);

  const fetchServer = useCallback(async (address: string) => {
    if (!address.trim()) {
      setServerStatus(null);
      return;
    }
    setServerLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(address.trim())}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("offline");
      const data = (await res.json()) as McStatus;
      setServerStatus(data);
    } catch {
      setServerStatus({ online: false });
    } finally {
      setServerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current);
    serverTimeoutRef.current = setTimeout(() => fetchServer(serverAddress), 500);
    return () => {
      if (serverTimeoutRef.current) clearTimeout(serverTimeoutRef.current);
    };
  }, [serverAddress, fetchServer]);

  const handleCopyUuid = useCallback(async () => {
    if (!uuidText) return;
    try {
      await navigator.clipboard.writeText(uuidText);
      success("UUID copié");
    } catch {
      showError("Impossible de copier l'UUID");
    }
  }, [uuidText, success, showError]);

  const handleDownloadSkin = useCallback(async () => {
    const skinUrl = profile?.skinUrl;
    if (!skinUrl) {
      showError("Aucun skin disponible");
      return;
    }
    try {
      const res = await fetch(skinUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${displayName || "minecraft"}-skin.png`;
      a.click();
      URL.revokeObjectURL(url);
      success("Skin téléchargé");
    } catch {
      window.open(skinUrl, "_blank");
    }
  }, [profile, displayName, success, showError]);

  const handleLogout = useCallback(() => {
    update({ liveMinecraftUsername: "" });
    router.push("/connections/");
  }, [update, router]);

  const isOnline = Boolean(profile && !error);

  const capeType = useMemo(() => {
    if (!profile?.capeUrl) return null;
    if (profile.capeUrl.includes("textures.minecraft.net")) return "Mojang";
    if (profile.capeUrl.includes("optifine.net")) return "OptiFine";
    return "Cape";
  }, [profile?.capeUrl]);

  if (!settings.liveMinecraftUsername) {
    return (
      <div className={`w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/70 p-6 text-center shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Gamepad2 className="h-6 w-6 text-zinc-400" />
          </div>
        </div>
        <p className="text-sm font-semibold text-zinc-200">Aucun compte Minecraft lié</p>
        <p className="mb-4 text-xs text-zinc-500">Renseigne ton pseudo dans les connexions pour voir le widget.</p>
        <button
          type="button"
          onClick={() => router.push("/connections/")}
          className="rounded-lg bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          Configurer Minecraft
        </button>
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className={`w-full max-w-md animate-pulse rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/[0.05]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-white/[0.05]" />
            <div className="h-3 w-16 rounded bg-white/[0.05]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-center shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm font-semibold text-red-200">Compte introuvable</p>
        <p className="text-xs text-red-300/70">{error.message}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition-colors hover:bg-red-500/20"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/80 backdrop-blur-xl ${className}`}>
      <div className="flex items-start gap-4">
        <div className="relative flex h-48 w-36 shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3 shadow-xl group">
          {currentSkin && (
            <Image
              key={currentSkin}
              src={currentSkin}
              alt={displayName || "Minecraft skin"}
              fill
              unoptimized
              onError={() => {
                if (skinIndex < skinUrls.length - 1) setSkinIndex((i) => i + 1);
              }}
              className="scale-105 object-contain transition-transform duration-200 group-hover:scale-110"
              style={{ imageRendering: "pixelated" }}
            />
          )}

          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-zinc-500"}`} />
            <span className="text-[10px] font-medium text-zinc-200">
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-zinc-100">{displayName || "—"}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono uppercase text-emerald-300">
              Java Edition
            </span>
            {profile?.model && profile.model !== "classic" && (
              <span className="rounded-lg border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono uppercase text-sky-300">
                {profile.model}
              </span>
            )}
          </div>

          {uuidText && (
            <button
              type="button"
              onClick={handleCopyUuid}
              className="mt-2 flex items-center gap-1 text-xs font-mono text-zinc-500 transition-colors hover:text-zinc-300"
              title={uuidText}
            >
              <Copy className="h-3 w-3" />
              <span className="truncate">{shortUuid}</span>
            </button>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-1 flex items-center gap-1 text-zinc-500">
                <Server className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase">Serveur</span>
              </div>
              <p className="text-xs font-medium text-zinc-200">
                {serverStatus?.online ? (serverStatus.host || serverAddress || "En ligne") : "—"}
              </p>
              {serverStatus?.online && typeof serverStatus.players?.online === "number" && (
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  <Users className="inline h-3 w-3" /> {serverStatus.players.online}/{serverStatus.players.max}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-1 flex items-center gap-1 text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase">Session</span>
              </div>
              <p className="truncate text-xs font-medium text-zinc-200">{formatLastSeen(lastSeen)}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
              <div className="mb-1 flex items-center gap-1 text-zinc-500">
                <Shirt className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase">Cape</span>
              </div>
              {capeType ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300">
                  <Check className="h-3 w-3" /> {capeType}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500">Aucune</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-200">Surveillance serveur</span>
          {serverStatus?.online ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
              <Wifi className="h-3 w-3" /> Online
            </span>
          ) : serverAddress ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="play.hypixel.net"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/50"
          />
          <button
            type="button"
            onClick={() => fetchServer(serverAddress)}
            disabled={serverLoading || !serverAddress.trim()}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:opacity-40"
          >
            {serverLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
          </button>
        </div>
        {serverStatus?.online && (
          <div className="mt-2 space-y-1 text-xs">
            {serverStatus.version?.name && (
              <p className="text-zinc-500">
                Version : <span className="text-zinc-300">{serverStatus.version.name}</span>
              </p>
            )}
            {serverStatus.motd?.html && (
              <div
                className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-zinc-400"
                dangerouslySetInnerHTML={{ __html: serverStatus.motd.html }}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopyUuid}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" />
          Copier UUID
        </button>
        <button
          type="button"
          onClick={handleDownloadSkin}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] py-2 text-xs text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          Télécharger
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
}
