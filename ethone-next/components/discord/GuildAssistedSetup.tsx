"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Loader2, Sliders } from "@/components/icons/ph";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
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

const SERVER_TYPES: Array<{ id: ServerType; title: string; hint: string }> = [
  { id: "community", title: "Communauté ouverte", hint: "Serveur public, beaucoup d'arrivées, des inconnus" },
  { id: "friends", title: "Entre amis", hint: "Petit serveur privé, tout le monde se connaît" },
  { id: "large", title: "Grosse communauté avec vocaux", hint: "Beaucoup de monde, un staff, des salons vocaux actifs" },
];

const SEVERITIES: Array<{ id: Severity; title: string; hint: string }> = [
  { id: "watch", title: "Surveillance seulement", hint: "Etho note tout et te prévient, sans sanctionner" },
  { id: "balanced", title: "Équilibré", hint: "Désarme le fautif sans l'exclure, rend muets les spammeurs" },
  { id: "strict", title: "Strict", hint: "Bannit quiconque tente de casser le serveur" },
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

type ChannelOption = { id: string; name: string; category: string };

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
  const [channels, setChannels] = useState<ChannelOption[]>([]);
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

  // Salons textuels du serveur pour l'étape « Alertes ».
  useEffect(() => {
    if (!API_BASE) return;
    let cancelled = false;
    fetch(`${base}/channels`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((tree) => {
        if (cancelled || !tree) return;
        const list: ChannelOption[] = [];
        const isText = (c: { type?: number }) => c.type === 0 || c.type === 5;
        for (const cat of tree.categories ?? []) for (const c of cat.channels ?? []) if (isText(c)) list.push({ id: c.id, name: c.name, category: cat.name });
        for (const c of tree.orphanChannels ?? []) if (isText(c)) list.push({ id: c.id, name: c.name, category: "Sans catégorie" });
        setChannels(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [base]);

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
  const groupedChannels = useMemo(
    () => channels.reduce<Record<string, ChannelOption[]>>((acc, c) => ((acc[c.category] ||= []).push(c), acc), {}),
    [channels]
  );

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
      "w-full rounded-xl border p-4 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99]",
      active
        ? "border-[var(--accent-primary)] bg-[var(--accent-muted)]"
        : "border-[var(--panel-border)] bg-[var(--surface-raised)] hover:border-[var(--accent-primary)]/50"
    );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {i18n("dAssistedSetup", "Configuration assistée")}
        </h1>
        {onManualSetup && (
          <button
            type="button"
            onClick={onManualSetup}
            className="flex items-center gap-1.5 self-start rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] sm:self-auto"
          >
            <Sliders className="h-3.5 w-3.5" />
            Réglage manuel
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]">
        {/* Étapes */}
        <ol className="flex border-b border-[var(--panel-border)]">
          {STEPS.map((label, idx) => (
            <li key={label} className="relative flex-1 px-2 py-3 text-center text-xs font-semibold">
              <span className={idx === step ? "text-[var(--text-primary)]" : idx < step ? "text-[var(--success)]" : "text-[var(--text-muted)]"}>
                {idx < step && !done ? <Check className="mr-1 inline h-3 w-3" /> : null}
                {label}
              </span>
              {idx === step && <motion.span layoutId="setup-step" transition={SPRING_PILL} className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[var(--accent-primary)]" />}
            </li>
          ))}
        </ol>

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
                  <div role="radiogroup" aria-label="Type de serveur" className="space-y-2">
                    {SERVER_TYPES.map((t) => (
                      <button key={t.id} type="button" role="radio" aria-checked={serverType === t.id} onClick={() => setServerType(t.id)} className={optionClass(serverType === t.id)}>
                        <span className="block text-sm font-semibold text-[var(--text-primary)]">{t.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{t.hint}</span>
                      </button>
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
                  <div role="radiogroup" aria-label="Sévérité" className="space-y-2">
                    {SEVERITIES.map((s) => (
                      <button key={s.id} type="button" role="radio" aria-checked={severity === s.id} onClick={() => setSeverity(s.id)} className={optionClass(severity === s.id)}>
                        <span className="block text-sm font-semibold text-[var(--text-primary)]">{s.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : step === 2 ? (
                <>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Où Etho doit-il te prévenir ?</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">Un salon privé, visible par le staff, de préférence.</p>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">Salon des alertes</span>
                    <select
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
                    >
                      <option value="">Pas de salon pour l&apos;instant</option>
                      {Object.entries(groupedChannels).map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((c) => (
                            <option key={c.id} value={c.id}>
                              # {c.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  {!channelId && (
                    <p className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-3 text-xs text-[var(--text-primary)]">
                      Sans salon, les protections agissent mais personne n&apos;est prévenu.
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
              <ChevronLeft className="h-3.5 w-3.5" />
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
              className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition-[filter,transform] hover:brightness-110 active:scale-[0.97]"
            >
              Continuer
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
