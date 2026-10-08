"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

/** Mode raid réel du bot (GET /anti-raid/status, POST /anti-raid/raid-mode), avec confirmation avant activation. */
export function useRaidMode(guildId: string) {
  const { success, info, error: showError } = useToast();
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!BOT_API_URL || !guildId) return;
    let cancelled = false;
    fetch(`${BOT_API_URL}/api/guilds/${guildId}/anti-raid/status`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && typeof d?.metrics?.raidModeActive === "boolean") setActive(d.metrics.raidModeActive);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const toggle = useCallback(async () => {
    if (busy || active === null || !BOT_API_URL) return;
    const next = !active;
    if (
      next &&
      !(await confirmDialog(
        "Activer le mode raid ? Etho bloque les arrivées suspectes et peut verrouiller les salons prévus dans la configuration anti-raid."
      ))
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/anti-raid/raid-mode`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || typeof data?.raidModeActive !== "boolean") throw new Error(data?.error || `Erreur ${res.status}`);
      setActive(data.raidModeActive);
      if (data.raidModeActive) success("Mode raid activé", "Etho bloque les arrivées suspectes.");
      else info("Mode raid désactivé", "Le serveur fonctionne normalement.");
    } catch (err) {
      showError("Mode raid", err instanceof Error ? err.message : "Bot injoignable");
    } finally {
      setBusy(false);
    }
  }, [active, busy, guildId, info, showError, success]);

  return { active, busy, toggle };
}
