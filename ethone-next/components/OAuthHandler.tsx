"use client";

import { useEffect, useRef, useState } from "react";
import { exchangeCode, parseOAuthState } from "@/lib/oauth";
import { setUserState } from "@/lib/user-state";
import { useSettings } from "@/components/SettingsProvider";

export default function OAuthHandler() {
  const [status, setStatus] = useState<string | null>(null);
  const handled = useRef(false);
  const { update } = useSettings();

  useEffect(() => {
    if (handled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const rawState = params.get("state");

    if (!code || !rawState) return;
    const state = parseOAuthState(rawState);
    const { provider, clientId } = state;
    if (!provider || !clientId) return;
    handled.current = true;

    exchangeCode(provider, code, clientId)
      .then(() => {
        localStorage.setItem(`ethone:clientId:${provider}`, clientId);
        setUserState(`clientId:${provider}`, clientId).catch(() => {});
        if (provider === "spotify") update({ liveSpotifyClientId: clientId });
        if (provider === "youtube") update({ liveYoutubeClientId: clientId });
        if (provider === "reddit") update({ liveRedditClientId: clientId });
        if (provider === "google-calendar") update({ calendarClientId: clientId });
        if (provider === "google-drive") update({ driveClientId: clientId });
        setStatus("Connecté avec succès.");
      })
      .catch((err) => setStatus(err.message || "Échec de connexion"))
      .finally(() => {
        const url = new URL(window.location.href);
        url.search = "";
        window.history.replaceState({}, "", url);
        setTimeout(() => setStatus(null), 3000);
      });
  }, [update]);

  if (!status) return null;

  return (
    <div className="fixed right-4 top-14 z-[80] rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm shadow-xl">
      {status}
    </div>
  );
}
