"use client";

import { useEffect, useRef, useState } from "react";
import { exchangeCode, parseOAuthState, OAUTH_APP_CLIENT_IDS } from "@/lib/oauth";
import { setUserState } from "@/lib/user-state";
import { useSettings } from "@/components/SettingsProvider";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";

export default function OAuthHandler() {
  const [status, setStatus] = useState<string | null>(null);
  const handled = useRef(false);
  const { update } = useSettings();
  const { getField, setField } = useIntegrationStore();

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const rawState = params.get("state");
    const errorParam = params.get("error") || params.get("error_description");
    if (errorParam) {
      handled.current = true;
      setStatus(`Connexion refusée : ${errorParam}`);
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url);
      setTimeout(() => setStatus(null), 5000);
      return;
    }

    if (!code || !rawState) return;
    const state = parseOAuthState(rawState);
    const provider = state?.provider;
    if (!provider) return;
    
    const resolvedClientId =
      state?.clientId ||
      (typeof window !== "undefined" ? localStorage.getItem(`ethone:clientId:${provider}`) : "") ||
      OAUTH_APP_CLIENT_IDS[provider] ||
      (provider === "spotify" ? "6619fbf6315e4e68948dc08532251912" : provider === "discord" ? "1539597090232078376" : "");

    if (!resolvedClientId) return;
    handled.current = true;

    const clientSecret = getField(provider, "clientSecret");
    let token: string | { codeVerifier?: string; clientSecret?: string } | undefined = clientSecret || undefined;
    if (provider === "spotify") {
      const verifier = typeof window !== "undefined" ? localStorage.getItem(`ethone:oauth:verifier:${provider}`) : null;
      if (!verifier) {
        setStatus("Code verifier manquant, reconnectez-vous.");
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url);
        setTimeout(() => setStatus(null), 5000);
        return;
      }
      token = { codeVerifier: verifier };
    }
    exchangeCode(provider, code, resolvedClientId, token)
      .then((res) => {
        try {
          localStorage.setItem(`ethone:clientId:${provider}`, resolvedClientId);
          localStorage.setItem(`ethone:connected:${provider}`, "true");
          localStorage.removeItem(`ethone:oauth:verifier:${provider}`);
          const tokenData = res?.data ?? res;
          if (tokenData && typeof tokenData === "object") {
            const accessToken = (tokenData as Record<string, string>).access_token || (tokenData as Record<string, string>).token;
            if (accessToken) {
              localStorage.setItem(`ethone:token:${provider}`, accessToken);
              if (provider === "spotify") {
                localStorage.setItem("spotify_access_token", accessToken);
                localStorage.setItem("ethone:connected:spotify", "true");
              }
              setField(provider, "accessToken", accessToken);
            }
          }
        } catch {}
        setUserState(`clientId:${provider}`, resolvedClientId).catch(() => {});
        if (provider === "spotify") {
          update({ liveSpotifyClientId: resolvedClientId, liveNowPlayingSource: "spotify" } as never);
        }
        if (provider === "discord") {
          localStorage.setItem("ethone:connected:discord", "true");
        }
        if (provider === "youtube") update({ liveYoutubeClientId: resolvedClientId } as never);
        if (provider === "reddit") update({ liveRedditClientId: resolvedClientId } as never);
        if (provider === "google-calendar") update({ calendarClientId: resolvedClientId } as never);
        if (provider === "google-drive") update({ driveClientId: resolvedClientId } as never);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("v8:connection-updated", { detail: { provider, connected: true } }));
        }
        setStatus("✨ Connecté avec succès !");
      })
      .catch((err) => setStatus(err.message || "Échec de connexion"))
      .finally(() => {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url);
        setTimeout(() => setStatus(null), 4000);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update]);

  if (!status) return null;

  return (
    <div className="fixed right-4 top-14 z-[80] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2 text-sm shadow-xl backdrop-blur-[var(--panel-blur)]">
      {status}
    </div>
  );
}
