"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Eye, Home, Loader2, Scale, ShieldAlert, Sliders, Users, Volume2 } from "@/components/icons/ph";
import ChannelPicker from "./ChannelPicker";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { DiscordGuild } from "@/lib/hooks/useDiscordOAuth";

const API_BASE = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

type ServerType = "community" | "friends" | "large";
type Severity = "watch" | "balanced" | "strict";
type PlanStatus = "enable" | "update" | "already" | "unavailable";
interface PlanItem {
  id: string;
  label: string;
  category: string;
  sanction: string;
  status: PlanStatus;
}

export interface GuildAssistedSetupProps {
  guild: DiscordGuild;
  onFinish?: () => void;
  onCancel?: () => void;
  onManualSetup?: () => void;
}

const STEPS = ["Ton serveur", "Sévérité", "Alertes", "Vérifier"] as const;

const SERVER_TYPES: Array<{ id: ServerType; title: string; hint: string; icon: typeof Users }> = [
  { id: "community", title: "Communauté ouverte", hint: "Serveur public, beaucoup d'arrivées, des inconnus", icon: Users },
  { id: "friends", title: "Entre amis", hint: "Petit serveur privé, tout le monde se connaît", icon: Home },
  { id: "large", title: "Grosse communauté avec vocaux", hint: "Beaucoup de monde, un staff, des salons vocaux actifs", icon: Volume2 },
];

const SEVERITIES: Array<{ id: Severity; title: string; hint: string; icon: typeof Users }> = [
  { id: "watch", title: "Surveillance seulement", hint: "Etho note tout et te prévient, sans sanctionner", icon: Eye },
  { id: "balanced", title: "Équilibré", hint: "Désarme le fautif sans l'exclure, rend muets les spammeurs", icon: Scale },
  { id: "strict", title: "Strict", hint: "Bannit quiconque tente de casser le serveur", icon: ShieldAlert },
];

const STATUS_LABEL: Record<PlanStatus, string> = {
  enable: "À activer",
  update: "Mise à jour",
  already: "Déjà active",
  unavailable: "Indisponible",
};
const STATUS_COLOR: Record<PlanStatus, string> = {
  enable: "var(--success)",
  update: "var(--warning)",
  already: "var(--text-muted)",
  unavailable: "var(--text-muted)",
};

/**
 * Configuration assistée, comme celle de Keeper : le type de serveur choisit les protections, la sévérité choisit
 * la sanction selon le type d'abus, un salon reçoit les alertes, puis le récapitulatif calculé par le bot
 * (« Voilà ce qui va changer ») est appliqué en un clic.
 */
export default function GuildAssistedSetup({ guild, onFinish, onCancel, onManualSetup }: GuildAssistedSetupProps) {
  const i18n = useI18n();
  const reduced = useReducedMotion();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(0);
  const [serverType, setServerType] = useState<ServerType>("community");
  const [severity, setSeverity] = useState<Severity>("balanced");
  const [channelId, setChannelId] = useState<string>("");
  const [overwrite, setOverwrite] = useState(false);
  const [plan, setPlan] = useState<PlanItem[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<ServerType, number>>>({});
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  const base = `${API_BASE}/api/guilds/${encodeURIComponent(guild.id)}/server`;

  const fetchPlan = useCallback(
    async (type: ServerType, sev: Severity, ow: boolean, apply = false): Promise<PlanItem[]> => {
      const res = await fetch(`${base}/protection-setup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverType: type, severity: sev, alertChannelId: channelId || null, overwrite: ow, apply }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.items)) throw new Error(data?.error || `Erreur ${res.status}`);
      return data.items;
    },
    [base, channelId]
  );

  // Nombre de protections par type (affiché sous le choix, comme Keeper).
  useEffect(() => {
    if (!API_BASE) return;
    let cancelled = false;
    Promise.all(SERVER_TYPES.map((t) => fetchPlan(t.id, "balanced", false).then((items) => [t.id, items.filter((i) => i.status !== "unavailable").length] as const)))
      .then((pairs) => !cancelled && setCounts(Object.fromEntries(pairs)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Une seule fois par serveur : les compteurs ne dépendent pas de la sévérité ni du salon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild.id]);

  // Récapitulatif : recalculé par le bot à l'arrivée sur « Vérifier » et quand l'option d'écrasement change.
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    setLoadingPlan(true);
    fetchPlan(serverType, severity, overwrite)
      .then((items) => !cancelled && setPlan(items))
      .catch((err) => !cancelled && showError("Configuration assistée", err instanceof Error ? err.message : "Bot injoignable"))
      .finally(() => !cancelled && setLoadingPlan(false));
    return () => {
      cancelled = true;
    };
  }, [step, serverType, severity, overwrite, fetchPlan, showError]);

  const changes = useMemo(() => (plan ?? []).filter((i) => i.status === "enable" || i.status === "update"), [plan]);
  const grouped = useMemo(() => {
    const out: Record<string, PlanItem[]> = {};
    for (const it of plan ?? []) (out[it.category] ||= []).push(it);
    return out;
  }, [plan]);
  const apply = async () => {
    setApplying(true);
    try {
      const items = await fetchPlan(serverType, severity, overwrite, true);
      setPlan(items);
      setDone(true);
      success("Etho est configuré", `${changes.length} protection${changes.length > 1 ? "s" : ""} réglée${changes.length > 1 ? "s" : ""}.`);
    } catch (err) {
      showError("Configuration assistée", err instanceof Error ? err.message : "Bot injoignable");
    } finally {
      setApplying(false);
    }
  };

  const optionClass = (active: boolean) =>
    cn(
      "flex h-full w-full flex-col gap-1 rounded-xl border p-3.5 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]",
      active
        ? "border-[var(--accent-primary)]/70 bg-[var(--accent-primary)]/[0.08]"
        : "border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]/40 hover:border-[var(--text-primary)]/20"
    );
  const OptionCard = ({ active, onPick, title, hint, Icon }: { active: boolean; onPick: () => void; title: string; hint: string; Icon: typeof Users }) => (
    <button type="button" role="radio" aria-checked={active} onClick={onPick} className={optionClass(active)}>
      <span className={cn("flex items-center gap-2 text-[13px] font-semibold", active ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]")}>
        <Icon className="h-4 w-4 shrink-0" />
        {title}
      </span>
      <span className="text-xs leading-relaxed text-[var(--text-muted)]">{hint}</span>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{i18n("dAssistedSetup", "Configuration assistée")}</h1>
        {onManualSetup && (
          <button
            type="button"
            onClick={onManualSetup}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Sliders className="h-3.5 w-3.5" />
            Réglage manuel
          </button>
        )}
      </div>

      <ol className="grid grid-cols-4 gap-2" aria-label="Étapes">
        {STEPS.map((label, idx) => {
          const reached = done || idx <= step;
          return (
            <li key={label} className="space-y-2">
              <div className="h-1 overflow-hidden rounded-full bg-[var(--panel-border)]">
                <motion.div className="h-full rounded-full bg-[var(--accent-primary)]" initial={false} animate={{ width: reached ? "100%" : "0%" }} transition={SPRING_LAYOUT} />
              </div>
              <span className={cn("block text-xs", idx === step && !done ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={done ? "done" : step}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
              transition={SPRING_LAYOUT}
              className="space-y-4"
            >
              {done ? (
                <div className="space-y-3 py-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                    <Check className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Etho est configuré</h2>
                  <p className="text-sm text-[var(--text-muted)]">Tu peux affiner chaque protection quand tu veux.</p>
                </div>
              ) : step === 0 ? (
                <>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Quel genre de serveur as-tu ?</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">Etho choisit les protections adaptées.</p>
                  </div>
                  <div role="radiogroup" aria-label="Type de serveur" className="grid gap-2 sm:grid-cols-3">
                    {SERVER_TYPES.map((t) => (
                      <OptionCard key={t.id} active={serverType === t.id} onPick={() => setServerType(t.id)} title={t.title} hint={t.hint} Icon={t.icon} />
                    ))}
                  </div>
                  {counts[serverType] !== undefined && (
                    <p className="text-xs font-medium text-[var(--text-muted)]">
                      {counts[serverType]} protections seront actives.
                      {serverType === "large" && " Les 4 protections vocales de ce type ne sont pas encore disponibles sur Etho."}
                    </p>
                  )}
                </>
              ) : step === 1 ? (
                <>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">À quel point Etho doit-il être sévère ?</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">La sanction est adaptée au type d&apos;abus.</p>
                  </div>
                  <div role="radiogroup" aria-label="Sévérité" className="grid gap-2 sm:grid-cols-3">
                    {SEVERITIES.map((s) => (
                      <OptionCard key={s.id} active={severity === s.id} onPick={() => setSeverity(s.id)} title={s.title} hint={s.hint} Icon={s.icon} />
                    ))}
                  </div>
                </>
              ) : step === 2 ? (
                <>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Où Etho doit-il te prévenir ?</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">Un salon privé, visible par le staff, de préférence.</p>
                  </div>
                  <div className="grid items-center gap-2 sm:grid-cols-[10rem_1fr]">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">Salon des alertes</span>
                    <ChannelPicker
                      guildId={guild.id}
                      value={channelId}
                      onChange={(id) => setChannelId(id)}
                      filterTypes={[0, 5]}
                      allowClear
                      emptyLabel="Pas de salon pour l'instant"
                      placeholder="Choisir un salon"
                    />
                  </div>
                  {!channelId && (
                    <p className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs text-[var(--text-primary)]">
                      Sans salon, les protections agissent mais personne n&apos;est prévenu. Sur Discord, la commande /setup peut créer ce salon pour toi.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Voilà ce qui va changer</h2>
                  {loadingPlan && !plan ? (
                    <div className="flex items-center gap-2 py-6 text-xs text-[var(--text-muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Calcul par le bot…
                    </div>
                  ) : plan ? (
                    <>
                      {changes.length === 0 && <p className="text-xs text-[var(--text-muted)]">Tout est déjà en place : rien à appliquer.</p>}
                      <div className={cn("space-y-4", loadingPlan && "opacity-60")}>
                        {Object.entries(grouped).map(([cat, list]) => (
                          <div key={cat} className="space-y-1.5">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{cat}</h3>
                            <ul className="divide-y divide-[var(--panel-border)] rounded-lg border border-[var(--panel-border)]">
                              {list.map((it) => (
                                <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                  <span className={cn("min-w-0 flex-1", it.status === "unavailable" ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>{it.label}</span>
                                  <span className="hidden shrink-0 text-[var(--text-muted)] sm:inline">{it.sanction}</span>
                                  <span className="shrink-0 rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: STATUS_COLOR[it.status] }}>
                                    {STATUS_LABEL[it.status]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--panel-border)] p-3">
                        <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="mt-0.5 accent-[var(--accent-primary)]" />
                        <span>
                          <span className="block text-xs font-semibold text-[var(--text-primary)]">Appliquer le niveau aussi aux protections déjà réglées</span>
                          <span className="block text-[11px] text-[var(--text-muted)]">Sinon, elles sont activées en gardant leurs réglages actuels.</span>
                        </span>
                      </label>
                    </>
                  ) : null}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--panel-border)] px-5 py-4 sm:px-6">
          {done ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => (step === 0 ? onCancel?.() : setStep((s) => s - 1))}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </button>
          )}
          {done ? (
            <button type="button" onClick={onFinish} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]">
              Voir la vue d&apos;ensemble
            </button>
          ) : step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
            >
              Continuer
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={apply}
              disabled={applying || loadingPlan || !plan || changes.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
            >
              {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {changes.length ? `Appliquer (${changes.length})` : "Appliquer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
