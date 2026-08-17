"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  PlugZap,
  ShieldCheck,
  Loader2,
  Unlink,
} from "lucide-react";
import { useIntegrationStore } from "@/lib/hooks/useIntegrationStore";
import { useToast } from "@/components/ToastProvider";
import { buildAuthUrl } from "@/lib/oauth";
import { fetchWorker } from "@/lib/api";
import { useI18n } from "@/lib/hooks/useI18n";
import CopyableField from "@/components/CopyableField";
import type { PingResult } from "@/lib/connection-config";

export type GitHubIntegrationCardProps = {
  connected?: boolean;
  health?: PingResult;
  onTest?: () => void;
};

export default function GitHubIntegrationCard({ connected: connectedProp, health, onTest }: GitHubIntegrationCardProps) {
  const i18n = useI18n();
  const { success, error: showError } = useToast();
  const { getField, setField } = useIntegrationStore();

  const [origin, setOrigin] = useState("https://ethone.dev");
  const [showGuide, setShowGuide] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(connectedProp ?? false);

  const clientId = getField("github", "clientId");
  const clientSecret = getField("github", "clientSecret");

  const homepageUrl = useMemo(() => origin, [origin]);
  const callbackUrl = useMemo(() => `${origin}/`, [origin]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (connectedProp === undefined) {
      fetchWorker("/api/connections")
        .then((res) => {
          const rows = Array.isArray(res?.data) ? res.data : [];
          const row = rows.find((r: { provider: string; connected: boolean }) => r.provider === "github");
          setConnected(!!row?.connected);
        })
        .catch(() => setConnected(false));
    } else {
      setConnected(connectedProp);
    }
  }, [connectedProp]);

  useEffect(() => {
    if (!connected && onTest) onTest();
  }, [connected, onTest]);

  function updateClientId(value: string) {
    setField("github", "clientId", value);
    try {
      localStorage.setItem("ethone:clientId:github", value);
    } catch {}
  }

  function updateClientSecret(value: string) {
    setField("github", "clientSecret", value);
  }

  async function handleConnect() {
    const id = clientId.trim();
    const secret = clientSecret.trim();
    if (!id || !secret) return;
    setSubmitting(true);
    try {
      window.location.assign(buildAuthUrl("github", id, { provider: "github", clientId: id }));
    } catch {
      showError(i18n("error"));
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetchWorker("/api/github/oauth/disconnect", { method: "POST" });
      setConnected(false);
      success(i18n("disconnectSuccess"));
    } catch {
      showError(i18n("error"));
    }
  }

  const canConnect = clientId.trim().length > 0 && clientSecret.trim().length > 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">GitHub</h3>
              <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                OAUTH 2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400">Commits, Pull Requests et Issues</p>
          </div>
        </div>
        <span
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
            connected
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-white/[0.06] bg-white/[0.03] text-zinc-500"
          }`}
        >
          {connected ? i18n("connected") : i18n("notConfigured")}
        </span>
      </div>

      {health?.error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
          {health.error}
        </div>
      )}

      {/* Guide Toggle */}
      <button
        type="button"
        onClick={() => setShowGuide((v) => !v)}
        className="flex items-center gap-1.5 self-start text-xs text-zinc-400 transition-colors hover:text-white"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span>{showGuide ? "Masquer le guide de configuration" : "Comment obtenir ces identifiants ?"}</span>
      </button>

      {/* Step-by-Step Guide Panel */}
      {showGuide && (
        <div className="flex flex-col gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">Paramètres requis sur GitHub</span>
            <a
              href="https://github.com/settings/applications/new"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-purple-400 transition-colors hover:text-purple-300 hover:underline"
            >
              <span>Créer une OAuth App</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Créez une nouvelle application dans les paramètres développeur GitHub et copiez-collez les valeurs exactes ci-dessous :
          </p>

          <div className="flex flex-col gap-2.5">
            <CopyableField
              label={<>1. Application name</>}
              value="ETHONE OS"
              copyKey="app-name"
            />
            <CopyableField
              label={<>2. Homepage URL <span className="text-red-400">*</span></>}
              value={homepageUrl}
              copyKey="homepage"
            />
            <CopyableField
              label={<>3. Authorization callback URL / Redirect URI <span className="text-red-400">*</span></>}
              value={callbackUrl}
              copyKey="callback"
            />
            <p className="text-[11px] text-zinc-500">
              Collez exactement cette URL dans le champ Redirect URI de GitHub.
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-3">
            <span className="text-[11px] font-medium text-zinc-300">4. Récupération des clés</span>
            <ul className="mt-1.5 list-inside list-disc text-[11px] text-zinc-400">
              <li>Copiez le Client ID affiché sur GitHub.</li>
              <li>Cliquez sur Generate a new client secret et copiez la clé secrète.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Inputs Form */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300">Client ID GitHub</label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => updateClientId(e.target.value)}
            placeholder="ex: Ov23li4..."
            aria-label="Client ID GitHub"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 font-mono text-xs text-zinc-100 outline-none transition-colors placeholder-zinc-600 focus:border-white/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-zinc-300">Client Secret GitHub</label>
          <div className="relative flex items-center">
            <input
              type={showSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => updateClientSecret(e.target.value)}
              placeholder="ex: 8f92ab34c..."
              aria-label="Client Secret GitHub"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 pr-10 font-mono text-xs text-zinc-100 outline-none transition-colors placeholder-zinc-600 focus:border-white/20"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 text-zinc-500 transition-colors hover:text-zinc-300"
              aria-label={showSecret ? i18n("hide") : i18n("show")}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Connect Action Button */}
      {connected ? (
        <button
          type="button"
          onClick={handleDisconnect}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/15 active:scale-[0.99]"
        >
          <Unlink className="h-4 w-4" />
          <span>{i18n("disconnect")}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={!canConnect || submitting}
          style={
            canConnect && !submitting
              ? { background: "var(--accent-color, #10b981)", color: "#09090b" }
              : undefined
          }
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-[0.99] ${
            canConnect && !submitting
              ? "hover:brightness-110 shadow-lg"
              : "cursor-not-allowed border border-white/[0.05] bg-white/[0.05] text-zinc-500"
          }`}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
          <span>Connecter GitHub à ETHONE</span>
        </button>
      )}

      {connected && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{i18n("connected")}</span>
        </div>
      )}
    </div>
  );
}
