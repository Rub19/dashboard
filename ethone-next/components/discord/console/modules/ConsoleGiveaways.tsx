"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { useToast } from "@/components/ToastProvider";
import { sinceLabel } from "@/lib/discord/security-scan";
import { SPRING_LAYOUT } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";

type Participant = { userId: string; username: string };
type Giveaway = {
  id: string;
  channelId: string;
  prize: string;
  description: string;
  winnerCount: number;
  status: "scheduled" | "active" | "paused" | "ended" | "cancelled";
  endsAt: string;
  participants: Participant[];
  winnerIds: string[];
  hostedByTag: string;
};
type Overview = { activeCount: number; endedCount: number; totalParticipants: number; totalWinners: number };

const UNITS = [
  ["min", "minutes", 1],
  ["h", "heures", 60],
  ["d", "jours", 1440],
] as const;
const EMPTY_FORM = {
  prize: "",
  description: "",
  channelId: "",
  duration: 1,
  unit: "d" as (typeof UNITS)[number][0],
  winnerCount: 1,
  rewardRoleId: [] as string[],
  requiredRoleIds: [] as string[],
  roleMode: "any" as "any" | "all",
  excludedRoleIds: [] as string[],
  minAccountAgeDays: 0,
  minLevel: 0,
  requireClaim: false,
  claimTimeoutHours: 24,
};

function untilLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "terminé";
  const m = Math.round(ms / 60000);
  if (m < 60) return `dans ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `dans ${h} h`;
  return `dans ${Math.round(h / 24)} j`;
}

/** Giveaways (format Keeper) : lancer un tirage avec ses conditions, suivre ceux en cours et relancer les terminés. */
export default function ConsoleGiveaways({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [list, setList] = useState<Giveaway[] | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [l, o] = await Promise.all([api<{ giveaways: Giveaway[] }>("/giveaways/list"), api<Overview>("/giveaways/overview", { silent: true })]);
    setList(l?.giveaways ?? []);
    if (o) setOv(o);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));
  const minutes = form.duration * (UNITS.find((u) => u[0] === form.unit)?.[2] ?? 1);

  const create = async () => {
    if (!form.prize.trim() || !form.channelId || creating) return;
    setCreating(true);
    const r = await api<{ giveaway: Giveaway }>("/giveaways/create", {
      method: "POST",
      json: {
        channelId: form.channelId,
        prize: form.prize.trim(),
        description: form.description.trim(),
        winnerCount: form.winnerCount,
        durationMinutes: minutes,
        rewardRoleId: form.rewardRoleId[0] ?? null,
        requirements: { requiredRoleIds: form.requiredRoleIds, roleMode: form.roleMode, excludedRoleIds: form.excludedRoleIds, minAccountAgeDays: form.minAccountAgeDays, minLevel: form.minLevel },
        requireClaim: form.requireClaim,
        claimTimeoutHours: form.claimTimeoutHours,
      },
    });
    setCreating(false);
    if (r) {
      success("Giveaway lancé", `${form.prize} est publié sur Discord.`);
      setForm(EMPTY_FORM);
      void load();
    }
  };

  const act = async (g: Giveaway, action: "end" | "cancel" | "extend" | "reroll") => {
    if (action === "cancel" && !(await confirmDialog(`Annuler « ${g.prize} » ? Aucun gagnant ne sera tiré.`, { title: "Annuler le giveaway", confirmLabel: "Annuler le giveaway" }))) return;
    if (action === "end" && !(await confirmDialog(`Terminer « ${g.prize} » maintenant et tirer ${g.winnerCount} gagnant${g.winnerCount > 1 ? "s" : ""} ?`, { title: "Terminer", confirmLabel: "Tirer au sort" }))) return;
    setBusy(`${g.id}:${action}`);
    const r = await api(`/giveaways/${g.id}/${action}`, { method: "POST", json: action === "extend" ? { minutes: 1440 } : action === "reroll" ? { count: 1 } : {} });
    setBusy(null);
    if (r) void load();
  };

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? "salon supprimé";
  const winners = (g: Giveaway) => g.winnerIds.map((id) => g.participants.find((p) => p.userId === id)?.username ?? `membre ${id.slice(-4)}`);
  const running = (list ?? []).filter((g) => g.status === "active" || g.status === "scheduled" || g.status === "paused");
  const done = (list ?? []).filter((g) => g.status === "ended" || g.status === "cancelled").slice(0, 15);
  const input = "h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

  return (
    <ConsolePage title="Giveaways">
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="En cours" value={ov?.activeCount ?? "—"} />
        <StatTile label="Terminés" value={ov?.endedCount ?? "—"} />
        <StatTile label="Participations" value={ov?.totalParticipants ?? "—"} />
        <StatTile label="Gagnants" value={ov?.totalWinners ?? "—"} />
      </motion.div>

      <Panel title="Nouveau giveaway" actions={<GhostButton onClick={create} disabled={creating || !form.prize.trim() || !form.channelId}>{creating ? "Publication…" : "Lancer"}</GhostButton>}>
        <Row label="Lot">
          <input value={form.prize} maxLength={120} onChange={(e) => set({ prize: e.target.value })} placeholder="Nitro 1 mois" className={input} />
        </Row>
        <Row label="Description" hint="Facultatif.">
          <textarea value={form.description} maxLength={1000} rows={2} onChange={(e) => set({ description: e.target.value })} className={`${input} h-auto py-2`} />
        </Row>
        <Row label="Salon">
          <ChannelPicker guildId={guildId} value={form.channelId} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => set({ channelId: id })} />
        </Row>
        <Row label="Durée">
          <div className="flex flex-wrap items-center gap-2">
            <Stepper value={form.duration} min={1} max={form.unit === "min" ? 600 : form.unit === "h" ? 336 : 60} onCommit={(n) => set({ duration: n })} />
            <Segmented label="Unité" value={form.unit} options={UNITS.map(([id, label]) => [id, label] as const)} onChange={(v) => set({ unit: v })} />
          </div>
        </Row>
        <Row label="Gagnants">
          <Stepper value={form.winnerCount} min={1} max={50} onCommit={(n) => set({ winnerCount: n })} />
        </Row>
        <Row label="Rôle donné aux gagnants" hint="Facultatif.">
          <RoleChips guildId={guildId} ids={form.rewardRoleId} max={1} onChange={(ids) => set({ rewardRoleId: ids })} />
        </Row>
        <Row label="Rôles requis" hint="Vide : tout le monde peut participer.">
          <div className="flex flex-wrap items-center gap-2">
            <RoleChips guildId={guildId} ids={form.requiredRoleIds} onChange={(ids) => set({ requiredRoleIds: ids })} />
            {form.requiredRoleIds.length > 1 && (
              <Segmented
                label="Rôles requis"
                value={form.roleMode}
                options={[
                  ["any", "Un des rôles"],
                  ["all", "Tous les rôles"],
                ]}
                onChange={(v) => set({ roleMode: v })}
              />
            )}
          </div>
        </Row>
        <Row label="Rôles exclus">
          <RoleChips guildId={guildId} ids={form.excludedRoleIds} onChange={(ids) => set({ excludedRoleIds: ids })} />
        </Row>
        <Row label="Compte Discord d'au moins">
          <Stepper value={form.minAccountAgeDays} min={0} max={365} unit="jours" onCommit={(n) => set({ minAccountAgeDays: n })} />
        </Row>
        <Row label="Niveau minimum" hint="Module Niveaux ; 0 = aucun.">
          <Stepper value={form.minLevel} min={0} max={500} onCommit={(n) => set({ minLevel: n })} />
        </Row>
        <Row label="Réclamation" hint="Le gagnant doit confirmer, sinon un autre est tiré.">
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={form.requireClaim} onChange={(v) => set({ requireClaim: v })} label="Réclamation obligatoire" />
            {form.requireClaim && <Stepper value={form.claimTimeoutHours} min={1} max={72} unit="h pour réclamer" onCommit={(n) => set({ claimTimeoutHours: n })} />}
          </div>
        </Row>
      </Panel>

      <Panel title="En cours">
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : running.length === 0 ? (
          <EmptyLine>Aucun giveaway en cours.</EmptyLine>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {running.map((g) => (
                <motion.li key={g.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={SPRING_LAYOUT} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{g.prize}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">
                      #{channelName(g.channelId)} · {g.participants.length} participant{g.participants.length > 1 ? "s" : ""} · {g.winnerCount} gagnant{g.winnerCount > 1 ? "s" : ""} · fin {untilLabel(g.endsAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <GhostButton onClick={() => act(g, "extend")} disabled={busy !== null}>
                      +1 jour
                    </GhostButton>
                    <GhostButton onClick={() => act(g, "end")} disabled={busy !== null}>
                      Tirer maintenant
                    </GhostButton>
                    <GhostButton onClick={() => act(g, "cancel")} disabled={busy !== null}>
                      Annuler
                    </GhostButton>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Panel title="Terminés">
        {!list ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : done.length === 0 ? (
          <EmptyLine>Aucun giveaway terminé.</EmptyLine>
        ) : (
          <ul>
            {done.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{g.prize}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">
                    {g.status === "cancelled" ? "Annulé" : winners(g).length ? `Gagnant${winners(g).length > 1 ? "s" : ""} : ${winners(g).join(", ")}` : "Aucun participant"} · {sinceLabel(g.endsAt)}
                  </p>
                </div>
                {g.status === "ended" && g.participants.length > 0 && (
                  <GhostButton onClick={() => act(g, "reroll")} disabled={busy !== null}>
                    Relancer le tirage
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
