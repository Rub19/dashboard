"use client";

import { fetchWorker } from "@/lib/api";
import { OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";

export function getSpotifyToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("ethone:token:spotify") ||
    localStorage.getItem("spotify_access_token") ||
    localStorage.getItem("ethone:cred:spotify:accessToken") ||
    null
  );
}

export async function sendSpotifyCommand(
  action: "play" | "pause" | "next" | "previous" | "volume" | "seek" | "save" | "unsave",
  extras?: {
    volumePercent?: number;
    positionMs?: number;
    trackId?: string;
    deviceId?: string;
    clientId?: string;
  }
): Promise<boolean> {
  const token = getSpotifyToken();

  if (token) {
    try {
      let endpoint = "";
      let method = "POST";
      let body: BodyInit | undefined = undefined;

      switch (action) {
        case "play":
          endpoint = "https://api.spotify.com/v1/me/player/play";
          method = "PUT";
          break;
        case "pause":
          endpoint = "https://api.spotify.com/v1/me/player/pause";
          method = "PUT";
          break;
        case "next":
          endpoint = "https://api.spotify.com/v1/me/player/next";
          method = "POST";
          break;
        case "previous":
          endpoint = "https://api.spotify.com/v1/me/player/previous";
          method = "POST";
          break;
        case "volume":
          endpoint = `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(extras?.volumePercent ?? 50)}`;
          method = "PUT";
          break;
        case "seek":
          endpoint = `https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(extras?.positionMs ?? 0)}`;
          method = "PUT";
          break;
        case "save":
          if (extras?.trackId) {
            endpoint = `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(extras.trackId)}`;
            method = "PUT";
          }
          break;
        case "unsave":
          if (extras?.trackId) {
            endpoint = `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(extras.trackId)}`;
            method = "DELETE";
          }
          break;
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        });

        if (res.status === 204 || res.status === 200) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("v8:nowplaying-updated"));
          }
          return true;
        }
      }
    } catch {
      // Fallback to Worker proxy
    }
  }

  // Fallback to Worker proxy if available
  const clientId =
    extras?.clientId ||
    (typeof window !== "undefined" ? localStorage.getItem("ethone:cred:spotify:clientId") : null) ||
    OAUTH_APP_CLIENT_IDS.spotify;

  if (clientId) {
    try {
      const bodyPayload: Record<string, unknown> = { action, clientId, ...extras };
      await fetchWorker("/api/spotify/control", {
        method: "POST",
        body: JSON.stringify(bodyPayload),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("v8:nowplaying-updated"));
      }
      return true;
    } catch {}
  }

  return false;
}
