"use client";

import { fetchWorker } from "@/lib/api";

export const DISCORD_REVOCATION_KEY = "ethone:discord_revocation_20260904";

/**
 * Forcibly disconnects and revokes all Discord credentials/tokens across
 * client local stores (localStorage, settings) and remote backends.
 */
export async function forceDisconnectDiscordAll(
  updateSettings?: (patch: Record<string, unknown>) => void
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const isRevoked = localStorage.getItem(DISCORD_REVOCATION_KEY);
    if (isRevoked === "true") {
      return false; // Already performed
    }

    // 1. Purge all Discord entries from localStorage
    localStorage.removeItem("ethone:connected:discord");
    localStorage.removeItem("ethone:token:discord");
    localStorage.removeItem("ethone:clientId:discord");
    localStorage.removeItem("ethone:pub:discord");
    localStorage.removeItem("ethone:cred:discord");
    localStorage.removeItem("ethone:pub:discord:liveLanyardUserId");

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("ethone:pub:discord") ||
          key.startsWith("ethone:cred:discord") ||
          key.startsWith("ethone:token:discord") ||
          key.includes("discord_profile"))
      ) {
        localStorage.removeItem(key);
      }
    }

    // 2. Clear liveLanyardUserId from persistent settings in localStorage
    try {
      const rawSettings = localStorage.getItem("ethone-settings");
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings);
        if (parsed && typeof parsed === "object" && parsed.liveLanyardUserId) {
          parsed.liveLanyardUserId = "";
          localStorage.setItem("ethone-settings", JSON.stringify(parsed));
        }
      }
    } catch {}

    // 3. Update React settings context if provided
    if (updateSettings) {
      updateSettings({ liveLanyardUserId: "" });
    }

    // 4. Remote cleanup via Worker
    try {
      await fetchWorker("/api/connections/disconnect", {
        method: "POST",
        body: JSON.stringify({ provider: "discord", purgeAll: true }),
      }).catch(() => {});

      await fetchWorker("/api/discord/oauth/disconnect", {
        method: "POST",
      }).catch(() => {});
    } catch {}

    // 5. Mark revocation as completed on this client
    localStorage.setItem(DISCORD_REVOCATION_KEY, "true");

    // 6. Broadcast revocation to all hooks, drawers, and tabs
    window.dispatchEvent(
      new CustomEvent("v8:refresh-connections", {
        detail: { provider: "discord", disconnected: true },
      })
    );
    window.dispatchEvent(
      new CustomEvent("ethone:settings:update", {
        detail: { liveLanyardUserId: "" },
      })
    );
    window.dispatchEvent(new Event("storage"));

    return true;
  } catch (err) {
    console.warn("forceDisconnectDiscordAll error:", err);
    return false;
  }
}
