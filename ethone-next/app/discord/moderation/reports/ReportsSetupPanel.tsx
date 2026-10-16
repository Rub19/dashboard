"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { subscribeGuildLive } from "@/lib/guildLive";
import ChannelPicker from "@/components/discord/ChannelPicker";
import RolePicker from "@/components/discord/RolePicker";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { formatApiError, errorReason } from "@/lib/format-error";
import { tx } from "@/lib/tx";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

interface ReportsConfig {
  enabled: boolean;
  channelId: string | null;
  staffRoleId: string | null;
  pingStaff: boolean;
  cooldownSeconds: number;
}

/** Aperçu du message que l'équipe reçoit (mêmes éléments que sur Discord : sanctions passées, motif, boutons). */
function TeamMessagePreview() {
  return (
    <div className="mx-auto w-full max-w-xl text-left">
      <div className="rounded-xl border-l-4 border-rose-500 bg-[#2b2d31] p-4 text-[13px] text-[#dbdee1]">
        <p className="text-[15px] font-bold text-[var(--text-primary)]">{tx("🚨 Signalement contre Lucas (@ls62)")}</p>
        <p className="mt-1 text-[12px] text-[#949ba4]">{tx("Compte créé il y a 7 ans · Arrivé sur le serveur il y a 3 ans")}</p>
        <p className="mt-2">{tx("🔎 8 exclusions · 1 avertissement")}</p>
        <div className="mt-3 space-y-2 border-t border-[var(--panel-border)] pt-3">
          <div>
            <p>
              <strong>{tx("Signalé par")}</strong> <span className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">{tx("@Glorxis")}</span> {" "}{tx("dans")}{" "} <span className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">{tx("#signalements")}</span> {" "}{tx("il y a une minute")}
            </p>
            <p className="border-l-2 border-[var(--panel-border)] pl-2 text-[#b5bac1]">{tx("Insulte le fondateur")}</p>
          </div>
          <div>
            <p>
              <strong>{tx("Signalé par")}</strong> <span className="rounded bg-[#5865f2]/30 px-1 text-[#c9cdfb]">{tx("@DraftMan")}</span> {" "}{tx("il y a 35 secondes")}
            </p>
            <p className="border-l-2 border-[var(--panel-border)] pl-2 text-[#b5bac1]">{tx("Insultes")}</p>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-[#b5bac1]">{tx("⏳ En attente depuis dimanche 24 mai 2026 19:54.")}</p>
      </div>
      <div className="mt-2 rounded-md bg-[#1e1f22] px-3 py-2 text-[13px] text-[#949ba4]">{tx("Sanctionner le membre ⌄")}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
        <span className="rounded-md bg-[#5865f2] px-3 py-1.5">{tx("Prendre en charge")}</span>
        <span className="rounded-md bg-[#248046] px-3 py-1.5">{tx("Marquer comme traité")}</span>
        <span className="rounded-md bg-[#4e5058] px-3 py-1.5">{tx("Rejeter")}</span>
      </div>
    </div>
  );
}

/**
 * Installation et réglages du système de signalement (à côté de la file des signalements) : tant qu'il n'est pas installé,
 * un écran d'accueil avec aperçu propose l'installation en un clic ; ensuite, les réglages tiennent en quelques lignes.
 */
export default function ReportsSetupPanel({ guildId }: { guildId: string }) {
  const { success, error: showError } = useToast();
  const [config, setConfig] = useState<ReportsConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const base = `${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/report-system`;

  const load = useCallback(async () => {
    if (!guildId || !BOT_API_URL) return;
    try {
      const res = await fetch(`${base}/config`, { credentials: "include" });
      if (res.ok) setConfig((await res.json()).config as ReportsConfig);
    } catch {
      /* bot injoignable : aucun panneau (la page principale l'indique déjà) */
    }
  }, [guildId, base]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!guildId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = subscribeGuildLive(guildId, (e) => {
      if (e.type !== "CONFIG_UPDATED") return;
      if (t) clearTimeout(t);
      t = setTimeout(() => void load(), 300);
    });
    return () => {
      if (t) clearTimeout(t);
      unsub();
    };
  }, [guildId, load]);

  const call = async (path: string, method: string, body: unknown, okTitle: string, okText: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${base}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(data?.error, ""));
      if (data?.config) setConfig(data.config as ReportsConfig);
      success(okTitle, okText);
      return true;
    } catch (err) {
      showError(tx("Action impossible"), errorReason(err, "Le bot n'a pas répondu."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!config) return null;

  if (!config.enabled) {
    return (
      <section className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-6 text-center sm:p-10">
        <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">{tx("Tu n'as pas encore configuré les signalements")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-muted)]">{tx("Laisse tes membres signaler un abus en un clic (clic droit sur un message ou un membre, ou /report), et donne à ton équipe un salon pour les traiter.")}</p>
        <div className="mt-6">
          <TeamMessagePreview />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void call("/setup", "POST", {}, "Signalements installés", "Le salon de l'équipe est créé (visible de l'équipe seulement) et le système est actif.")}
          className="mt-8 cursor-pointer rounded-xl bg-[var(--accent-primary)] px-6 py-3 text-sm font-semibold text-[var(--accent-contrast)] hover:brightness-110 disabled:opacity-50 btn-sheen transition-[filter,transform] duration-200 active:scale-[0.97] relative outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
        >
          {busy ? tx("Installation…") : tx("Installer en quelques secondes")}
        </button>
        <p className="mx-auto mt-3 max-w-md text-xs text-[var(--text-muted)]">{tx("Le bot crée le salon « signalements » visible de l'équipe de modération et du bot seulement. Tu pourras ensuite en choisir un autre.")}</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left" aria-expanded={open}>
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {tx("Système de signalement")}{" "} <span className="ml-2 rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--success)]">{tx("actif")}</span>
        </span>
        <span className="text-xs text-[var(--text-muted)]">{open ? tx("Masquer les réglages") : tx("Réglages")}</span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">{tx("Salon de l'équipe")}</p>
            <ChannelPicker value={config.channelId} guildId={guildId} filterTypes={[0, 5, 15, 16]} disabled={busy} onChange={(id) => void call("/config", "PUT", { channelId: id }, "Salon enregistré", "Les nouveaux signalements arrivent ici.")} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">{tx("Rôle de l'équipe (optionnel)")}</p>
            <RolePicker value={config.staffRoleId} guildId={guildId} disabled={busy} allowClear onChange={(id) => void call("/config", "PUT", { staffRoleId: id || null }, "Rôle enregistré", "Ce rôle peut traiter les signalements.")} />
            <p className="mt-1 text-xs text-[var(--text-muted)]">{tx("Sans rôle, la permission « Exclure temporairement des membres » suffit pour traiter.")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.pingStaff}
            disabled={busy || !config.staffRoleId}
            onClick={() => void call("/config", "PUT", { pingStaff: !config.pingStaff }, "Réglage enregistré", "")}
            className="flex cursor-pointer items-start justify-between gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/40 p-3 text-left transition hover:bg-[var(--surface-raised)]/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              <span className="block text-xs font-semibold text-[var(--text-primary)]">{tx("Mentionner l'équipe à chaque nouveau signalement")}</span>
              <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{config.staffRoleId ? tx("Le rôle de l'équipe est prévenu.") : tx("Choisis d'abord un rôle d'équipe.")}</span>
            </span>
            <span className={cn("relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", config.pingStaff ? "bg-[var(--accent-primary)]" : "bg-[var(--text-primary)]/15")}>
              <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", config.pingStaff ? "translate-x-4" : "translate-x-0")} />
            </span>
          </button>
          <div>
            <Select
              label={tx("Délai entre deux signalements d'un même membre")}
              value={String(config.cooldownSeconds)}
              disabled={busy}
              onChange={(v) => void call("/config", "PUT", { cooldownSeconds: Number(v) }, "Réglage enregistré", "")}
              options={[0, 30, 60, 300, 900, 3600].map((s) => ({
                id: String(s),
                label: s === 0 ? tx("Aucun") : s < 60 ? tx("{s} secondes", { s }) : tx("{v0} minute{v1}", { v0: s / 60, v1: s > 60 ? "s" : "" }),
              }))}
            />
          </div>
          <div className="md:col-span-2">
            <button type="button" disabled={busy} onClick={() => void call("/config", "PUT", { enabled: false }, "Signalements désactivés", "Les membres ne peuvent plus signaler ; l'historique est conservé.")} className="cursor-pointer rounded-xl border border-rose-500/30 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50">
              {tx("Désactiver le système")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
