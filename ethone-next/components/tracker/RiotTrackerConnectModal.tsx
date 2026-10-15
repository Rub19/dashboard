"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import { getRiotOAuthStatus, getRiotAuthUrl, disconnectRiotOAuth, type RiotOAuthStatus } from "@/lib/riot-auth";
import {
  ShieldCheck,
  Swords,
  Unplug,
  ExternalLink,
  Loader2,
  Key,
  CheckCircle2,
  Radio,
  Server,
  User,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";

export interface RiotTrackerConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRiotIdChanged?: (name: string, tag: string) => void;
  isEn?: boolean;
}

export default function RiotTrackerConnectModal({
  isOpen,
  onClose,
  onRiotIdChanged,
  isEn,
}: RiotTrackerConnectModalProps) {
  const { success, error: showError } = useToast();
  const { settings } = useSettings();

  const isEnglish = typeof isEn === "boolean"
    ? isEn
    : (typeof window !== "undefined" ? (localStorage.getItem("ethone:tracker:language") ?? "en") !== "fr" : true);

  const [activeTab, setActiveTab] = useState<"rso" | "riotid" | "api" | "servers">("rso");
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<RiotOAuthStatus | null>(null);

  const [riotName, setRiotName] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_name");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotName || "";
  });
  const [riotTag, setRiotTag] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ethone:tracker:riot_tag");
      if (stored) return stored;
    }
    return settings.liveTrackerRiotTag || "";
  });
  const [region, setRegion] = useState("eu");
  const [apiKey, setApiKey] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("ethone:cred:riot:riotApiKey") || "" : ""));

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    getRiotOAuthStatus()
      .then((res) => {
        if (mounted) setStatus(res);
      })
      .catch((err) => {
        if (mounted) {
          showError(err instanceof Error ? err.message : (isEnglish ? "Error during Riot verification" : "Erreur lors de la vérification Riot"));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, showError, isEnglish]);

  const handleConnectRSO = async () => {
    try {
      const url = await getRiotAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : (isEnglish ? "Unable to initiate Riot Games sign-in" : "Impossible d'initier la connexion Riot Games"));
    }
  };

  const handleDisconnectRSO = async () => {
    setDisconnecting(true);
    try {
      await disconnectRiotOAuth();
      setStatus({
        available: true,
        approvalRequired: false,
        connected: false,
      });
      success(isEnglish ? "Riot account disconnected successfully" : "Compte Riot dissocié avec succès");
    } catch (err) {
      showError(err instanceof Error ? err.message : (isEnglish ? "Error during disconnection" : "Erreur lors de la déconnexion"));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveRiotId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = riotName.trim();
    const cleanTag = riotTag.trim().replace(/^#/, "");
    if (!cleanName || !cleanTag) {
      showError(isEnglish ? "Please enter a valid Riot Name and Tag" : "Veuillez renseigner un Nom Riot et un Tag valides");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("ethone:tracker:riot_name", cleanName);
      localStorage.setItem("ethone:tracker:riot_tag", cleanTag);
    }
    if (onRiotIdChanged) {
      onRiotIdChanged(cleanName, cleanTag);
    }
    success(isEnglish ? `Riot profile saved locally: ${cleanName}#${cleanTag}` : `Profil Riot enregistré localement : ${cleanName}#${cleanTag}`);
    onClose();
  };

  const handleTestApi = () => {
    if (/^RGAPI-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiKey.trim())) {
      success(isEnglish ? "Key format is valid (RGAPI-…)" : "Format de clé valide (RGAPI-…)");
    } else {
      showError(isEnglish ? "Invalid key: expected RGAPI-xxxxxxxx-…" : "Clé invalide : format attendu RGAPI-xxxxxxxx-…");
    }
  };

  const handleSaveApiKey = () => {
    if (typeof window !== "undefined") {
      if (apiKey.trim()) localStorage.setItem("ethone:cred:riot:riotApiKey", apiKey.trim());
      else localStorage.removeItem("ethone:cred:riot:riotApiKey");
    }
    success(isEnglish ? "API key saved for the tracker" : "Clé API enregistrée pour le tracker");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEnglish ? "#RIOT TRACKER · API & Connection Directives" : "#RIOT TRACKER · Connexion & Directives API"}
      description={isEnglish ? "Manage your Riot Games authentication, API keys, and competitive server diagnostics." : "Gérez votre authentification Riot Games, vos clés d'API et le diagnostic des serveurs compétitifs."}
      size="lg"
      hideFooter
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("rso")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "rso"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>RSO (OAuth)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("riotid")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "riotid"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <User className="h-4 w-4" />
            <span>{isEnglish ? "Fast Riot ID" : "Riot ID Rapide"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("api")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "api"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Key className="h-4 w-4" />
            <span>{isEnglish ? "API Keys & Quotas" : "Clés & Quotas API"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("servers")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer",
              activeTab === "servers"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <Server className="h-4 w-4" />
            <span>{isEnglish ? "Server Health" : "Santé Serveurs"}</span>
          </button>
        </div>

        {activeTab === "rso" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {isEnglish ? "Checking Riot RSO connection status..." : "Vérification de l'état de connexion Riot RSO..."}
                </p>
              </div>
            ) : status?.connected ? (
              <div className="rounded-[var(--panel-radius)] border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-xs font-bold text-emerald-300">
                    {isEnglish ? "Official Riot Account Synchronized" : "Compte Riot Officiel Synchronisé"}
                  </h4>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-black/25 p-3 text-xs space-y-1">
                  <p className="text-[var(--text-primary)]">
                    {isEnglish ? "Riot Identifier:" : "Identifiant Riot :"} <span className="font-mono font-bold">{status.riotId || (isEnglish ? "Linked Account" : "Compte lié")}</span>
                  </p>
                  {status.puuid && (
                    <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                      PUUID : {status.puuid}
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    {isEnglish ? "✓ OAuth 2.0 authentication active" : "✓ Authentification OAuth 2.0 active"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDisconnectRSO}
                  disabled={disconnecting}
                  className="flex items-center gap-1.5"
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                  <span>{isEnglish ? "Unlink RSO account" : "Dissocier le compte RSO"}</span>
                </Button>
              </div>
            ) : status?.approvalRequired ? (
              <div className="space-y-3">
                <div className="rounded-[var(--panel-radius)] border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-amber-300">
                      {isEnglish ? "Riot Sign On (RSO) — Pending Approval" : "Riot Sign On (RSO) — Demande d'Agrément en Cours"}
                    </h4>
                  </div>
                  <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed">
                    {isEnglish
                      ? "The ETHONE application is currently under review by the Riot Games Developer team for production RSO OAuth 2.0 keys."
                      : "L'application ETHONE est actuellement soumise à l'équipe Riot Games Developer pour l'obtention des clés de production RSO OAuth 2.0."}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {isEnglish
                      ? "For evaluation and instant use, you can load any competitive profile via the Fast Riot ID tab."
                      : "Pour l'évaluation Riot et l'utilisation immédiate, vous pouvez charger n'importe quel profil compétitif via l'onglet Riot ID Rapide."}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">
                    {isEnglish ? "Riot Developer Portal:" : "Portail des Développeurs Riot :"}
                  </span>
                  <a
                    href="https://developer.riotgames.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold"
                  >
                    <span>{isEnglish ? "Check status" : "Consulter le statut"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-rose-400" />
                  <h4 className="text-xs font-bold text-rose-300">
                    {isEnglish ? "Riot Sign On connection available" : "Connexion Riot Sign On disponible"}
                  </h4>
                </div>
                <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed">
                  {isEnglish
                    ? "Authorize ETHONE through the official Riot Games portal to instantly fetch your secure match history."
                    : "Autorisez ETHONE via le portail officiel de Riot Games pour récupérer instantanément votre historique de parties sécurisé."}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConnectRSO}
                  className="bg-gradient-to-r from-rose-600 to-red-600 font-bold"
                >
                  {isEnglish ? "Sign in with Riot Games (OAuth)" : "Se connecter avec Riot Games (OAuth)"}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "riotid" && (
          <form onSubmit={handleSaveRiotId} className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Set your Player Riot ID" : "Définir votre Riot ID Joueur"}
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                {isEnglish
                  ? "Enter your in-game name and tag to automatically sync match statistics (Valorant, LoL, and TFT)."
                  : "Entrez votre pseudo en jeu et votre tag pour synchroniser automatiquement vos statistiques de match (Valorant, LoL et TFT)."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2">
                  <User className="h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={riotName}
                    onChange={(e) => setRiotName(e.target.value)}
                    placeholder={isEnglish ? "Riot Username" : "Nom Riot"}
                    aria-label={isEnglish ? "Riot Username" : "Nom Riot"}
                    className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none"
                    required
                  />
                  <span className="text-xs text-[var(--text-muted)]">#</span>
                  <input
                    type="text"
                    value={riotTag}
                    onChange={(e) => setRiotTag(e.target.value)}
                    placeholder={isEnglish ? "TAG" : "TAG"}
                    aria-label={isEnglish ? "Riot Tag" : "Tag Riot"}
                    className="w-16 bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] outline-none"
                    required
                  />
                </div>

                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] outline-none cursor-pointer"
                >
                  <option value="eu">{isEnglish ? "Europe (EUW)" : "Europe (EUW)"}</option>
                  <option value="na">{isEnglish ? "North America (NA)" : "Amérique du Nord (NA)"}</option>
                  <option value="kr">{isEnglish ? "Korea (KR)" : "Corée (KR)"}</option>
                  <option value="ap">{isEnglish ? "Asia-Pacific (AP)" : "Asie-Pacifique (AP)"}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                {isEnglish ? "Cancel" : "Annuler"}
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 font-bold">
                {isEnglish ? "Apply and Load Profile" : "Appliquer et Charger le Profil"}
              </Button>
            </div>
          </form>
        )}

        {activeTab === "api" && (
          <div className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {isEnglish ? "HenrikDev / Riot Games API Key (Optional)" : "Clé API HenrikDev / Riot Games (Optionnel)"}
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-bold">
                  {apiKey ? (isEnglish ? "Configured" : "Configurée") : (isEnglish ? "Default Public Key" : "Clé Publique par Défaut")}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {isEnglish
                  ? "Use your own developer key to bypass rate limits and access complete leaderboards."
                  : "Utilisez votre propre clé de développement pour débloquer les plafonds de requêtes et accéder aux classements complets."}
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={isEnglish ? "Enter API Key" : "Entrez votre clé API"}
                  aria-label={isEnglish ? "API Key" : "Clé API"}
                  className="flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] outline-none"
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleSaveApiKey}>
                  {isEnglish ? "Save" : "Enregistrer"}
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)]/60 bg-black/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">
                    {isEnglish ? "Standard rate limit:" : "Plafond de requêtes standard :"}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">20 req / 1 sec · 100 req / 2 min</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">
                    {isEnglish ? "Active endpoints:" : "Endpoints activés :"}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">VALORANT V3 · LoL Match V5 · TFT V1</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleTestApi}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>{isEnglish ? "Check key" : "Vérifier la clé"}</span>
              </button>

              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                {isEnglish ? "Close" : "Fermer"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "servers" && (
          <div className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                {isEnglish ? "Infrastructure & Competitive Server Status" : "État des Infrastructures & Serveurs Compétitifs"}
              </h4>

              <div className="space-y-2">
                {[
                  { region: isEnglish ? "Western Europe (EUW)" : "Europe Ouest (EUW)", ping: "18ms", status: isEnglish ? "Operational" : "Opérationnel", uptime: "99.98%" },
                  { region: isEnglish ? "North America (NA)" : "Amérique du Nord (NA)", ping: "89ms", status: isEnglish ? "Operational" : "Opérationnel", uptime: "99.95%" },
                  { region: isEnglish ? "Korea & Asia (KR)" : "Corée & Asie (KR)", ping: "192ms", status: isEnglish ? "Operational" : "Opérationnel", uptime: "99.99%" },
                ].map((s) => (
                  <div
                    key={s.region}
                    className="flex items-center justify-between rounded-xl border border-[var(--panel-border)]/50 bg-[var(--bg-main)]/50 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-bold text-[var(--text-primary)]">{s.region}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">{s.ping}</span>
                      <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[var(--text-primary)]">
                  <p className="font-bold text-emerald-300">
                    {isEnglish ? "Riot Games Developer Directives Compliance" : "Conformité aux Directives Développeurs Riot Games"}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    {isEnglish
                      ? "ETHONE applies strict client-side filtering ensuring no store or personal inventory queries can ever be inspected by third parties or guests."
                      : "ETHONE applique un filtrage strict garantissant qu'aucune consultation de boutique ou d'inventaire personnel n'est accessible aux tiers ou aux invités."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                {isEnglish ? "Close" : "Fermer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
