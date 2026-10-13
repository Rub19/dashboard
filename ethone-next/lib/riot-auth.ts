import { fetchWorker } from "@/lib/api";

export interface RiotOAuthStatus {
  available: boolean;
  approvalRequired: boolean;
  reason?: string;
  connected: boolean;
  riotId?: string;
  puuid?: string;
  connectedAt?: string;
}

export async function getRiotOAuthStatus(): Promise<RiotOAuthStatus> {
  try {
    const res = await fetchWorker("/api/riot/oauth/status");
    if (res?.data) {
      return res.data as RiotOAuthStatus;
    }
    return {
      available: false,
      approvalRequired: true,
      reason: "Coming soon — Riot approval required",
      connected: false,
    };
  } catch (err) {
    return {
      available: false,
      approvalRequired: true,
      reason: err instanceof Error ? err.message : "Erreur de communication avec le serveur",
      connected: false,
    };
  }
}

export async function getRiotAuthUrl(): Promise<string> {
  const res = await fetchWorker("/api/riot/oauth/url");
  if (!res?.data?.url) {
    throw new Error(res?.error || "Impossible de générer l'URL d'autorisation Riot Games");
  }
  return res.data.url as string;
}

export async function disconnectRiotOAuth(): Promise<void> {
  await fetchWorker("/api/riot/oauth/disconnect", {
    method: "POST",
  });
}
