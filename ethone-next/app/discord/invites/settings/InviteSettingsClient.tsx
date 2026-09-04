"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Settings,
  Shield,
  Bell,
  Download,
  Save,
  CheckCircle2,
  RefreshCw,
  Hash,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const API_BASE = "http://localhost:3001";

export default function InviteSettingsClient() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guildId") || "1128633164290596884";
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [trackBots, setTrackBots] = useState(false);
  const [trackVanity, setTrackVanity] = useState(true);
  const [retentionTracking, setRetentionTracking] = useState(true);
  const [riskSensitivity, setRiskSensitivity] = useState("standard");
  const [minAccountAgeHours, setMinAccountAgeHours] = useState(24);
  const [notificationChannel, setNotificationChannel] = useState("annonces-invitations");
  const [onValidJoin, setOnValidJoin] = useState(true);
  const [onSuspiciousJoin, setOnSuspiciousJoin] = useState(true);
  const [messageTemplate, setMessageTemplate] = useState(
    "🎉 Bienvenue {user} invité par {inviter} ({inviteCount} invitations valides) !"
  );

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/settings`);
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setEnabled(s.enabled);
        setTrackBots(s.trackBots);
        setTrackVanity(s.trackVanity);
        setRetentionTracking(s.retentionTracking);
        setRiskSensitivity(s.riskSensitivity || "standard");
        setMinAccountAgeHours(s.suspiciousThresholds?.minAccountAgeHours || 24);
        setNotificationChannel(s.notificationChannel || "annonces-invitations");
        setOnValidJoin(s.notificationEvents?.onValidJoin ?? true);
        setOnSuspiciousJoin(s.notificationEvents?.onSuspiciousJoin ?? true);
        setMessageTemplate(s.notificationMessageTemplate || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [guildId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/guilds/${guildId}/invites/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          trackBots,
          trackVanity,
          retentionTracking,
          riskSensitivity,
          suspiciousThresholds: {
            minAccountAgeHours,
            burstMaxJoins: 5,
            burstWindowSeconds: 120,
          },
          notificationChannel,
          notificationEvents: {
            onValidJoin,
            onSuspiciousJoin,
            onReward: true,
            onLeave: false,
          },
          notificationMessageTemplate: messageTemplate,
        }),
      });

      if (res.ok) {
        success("Paramètres enregistrés", "La configuration d'Invite Tracker a été mise à jour.");
      } else {
        throw new Error();
      }
    } catch {
      showError("Erreur", "Impossible d'enregistrer les paramètres.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: "csv" | "json") => {
    window.open(`${API_BASE}/api/guilds/${guildId}/invites/export?format=${format}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 sm:p-8 pb-36 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
        <Link
          href={`/discord/invites?guildId=${guildId}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Retour à l'Invite Tracker</span>
        </Link>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 transition cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Sauvegarde..." : "Enregistrer les modifications"}</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Section 1: Tracking Général */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Settings className="w-4 h-4 text-pink-400" />
            <span>Options de Tracking</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Contrôlez les entités et événements pris en compte par le moteur d'invitations.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Module Invite Tracker Actif</div>
                <div className="text-[11px] text-zinc-400">Active la détection différentielle des invitations</div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  enabled ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Tracker les Bots Discord</div>
                <div className="text-[11px] text-zinc-400">Créer un referral pour les bots invités</div>
              </div>
              <button
                onClick={() => setTrackBots(!trackBots)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  trackBots ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    trackBots ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-white">Tracker l'URL Personnalisée (Vanity URL)</div>
                <div className="text-[11px] text-zinc-400">Enregistrer les arrivées directes par l'URL du serveur</div>
              </div>
              <button
                onClick={() => setTrackVanity(!trackVanity)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  trackVanity ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    trackVanity ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Détection & Anti-Raid */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Détection des Faux Joins & Sécurité</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Configuration du calcul du ReferralRiskScore (0-100) et des seuils d'invalidation.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Âge minimum du compte pour être éligible (heures)
              </label>
              <input
                type="number"
                value={minAccountAgeHours}
                onChange={(e) => setMinAccountAgeHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Les comptes créés plus récemment recevront un malus de risque et ne rapporteront pas de récompense immédiatement.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Sensibilité de détection du risque
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["low", "standard", "high"].map((sens) => (
                  <button
                    key={sens}
                    onClick={() => setRiskSensitivity(sens)}
                    className={`py-2 rounded-xl text-xs font-medium border transition cursor-pointer ${
                      riskSensitivity === sens
                        ? "bg-pink-600/20 border-pink-500 text-white font-bold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sens === "low" ? "Basse" : sens === "standard" ? "Standard" : "Haute"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notifications */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-400" />
            <span>Notifications Discord</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Annoncez automatiquement les parrainages dans un salon dédié.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Salon Discord des annonces
              </label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <Hash className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={notificationChannel}
                  onChange={(e) => setNotificationChannel(e.target.value)}
                  placeholder="annonces-invitations"
                  className="bg-transparent text-xs text-white focus:outline-none flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Modèle de message personnalisé
              </label>
              <textarea
                rows={3}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {["{user}", "{inviter}", "{server}", "{inviteCount}"].map((chip) => (
                  <span key={chip} className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Export des Données */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export & Confidentialité</span>
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Exportez l'ensemble des données d'invitations et referrals pour votre archivage ou vos analyses externes.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en CSV</span>
            </button>

            <button
              onClick={() => handleExport("json")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter en JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
