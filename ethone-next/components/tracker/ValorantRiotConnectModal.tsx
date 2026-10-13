"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { getRiotOAuthStatus, getRiotAuthUrl, disconnectRiotOAuth, type RiotOAuthStatus } from "@/lib/riot-auth";
import { ShieldCheck, Swords, Unplug, ExternalLink, Loader2, Key } from "@/components/icons/ph";

export interface ValorantRiotConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}

export default function ValorantRiotConnectModal({
  isOpen,
  onClose,
  onOpenApiKeyModal,
  hasApiKey,
}: ValorantRiotConnectModalProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<RiotOAuthStatus | null>(null);

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
          showError(err instanceof Error ? err.message : "Erreur lors de la vérification Riot");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, showError]);

  const handleConnect = async () => {
    try {
      const url = await getRiotAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Impossible d'initier la connexion Riot Games");
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectRiotOAuth();
      setStatus({
        available: true,
        approvalRequired: false,
        connected: false,
      });
      success("Compte Riot dissocié avec succès");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connexion Compte Riot Games"
      description="Gérez votre authentification officielle Riot Games pour synchroniser votre profil et vos statistiques."
      size="md"
      hideFooter
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            <p className="mt-2 text-xs text-[var(--text-muted)]">Vérification de l&apos;état de connexion Riot...</p>
          </div>
        ) : status?.connected ? (
          <div className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-300">Compte Riot Officiel Associé</h4>
              </div>
              <p className="mt-1 text-xs text-[var(--text-primary)]">
                Identifiant : <span className="font-mono font-bold">{status.riotId || "Compte Riot"}</span>
              </p>
              {status.puuid && (
                <p className="mt-0.5 text-[10px] font-mono text-[var(--text-muted)] truncate">
                  PUUID : {status.puuid}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)]">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Fermer
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5"
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                <span>Dissocier le compte</span>
              </Button>
            </div>
          </div>
        ) : status?.approvalRequired ? (
          <div className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <h4 className="text-xs font-bold text-amber-300">
                  Bientôt disponible — En attente d&apos;approbation Riot Games
                </h4>
              </div>
              <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed">
                Le flux d&apos;authentification officiel Riot Sign On (RSO) nécessite une approbation de clé de production délivrée par le portail développeur Riot Games.
              </p>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                En attendant la validation finale de Riot, vos statistiques sont synchronisées en direct via l&apos;API autorisée et votre Riot ID public.
              </p>
            </div>

            <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Clé API HenrikDev (Optionnel)</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                  {hasApiKey ? "Active" : "Non configurée"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Permet d&apos;enrichir vos parties avec les rangs compétitifs réels de tous les joueurs de votre lobby.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenApiKeyModal();
                }}
                className="w-full text-xs font-bold"
              >
                {hasApiKey ? "Modifier la clé Henrik" : "Configurer une clé Henrik"}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--panel-border)]">
              <a
                href="https://developer.riotgames.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
              >
                <span>Portail Développeur Riot</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <Button type="button" variant="primary" size="sm" onClick={onClose}>
                Compris
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-rose-400" />
                <h4 className="text-xs font-bold text-rose-300">Connexion Riot Sign On disponible</h4>
              </div>
              <p className="text-xs text-[var(--text-primary)]/90 leading-relaxed">
                Connectez votre compte Riot Games de façon sécurisée en 1 clic pour lier vos identifiants à votre espace ETHONE.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConnect}
                className="bg-gradient-to-r from-rose-600 to-red-600 font-bold"
              >
                Se connecter avec Riot Games
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
