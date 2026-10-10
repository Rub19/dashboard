"use client";

import { useState } from "react";
import { Plus, Trash2 } from "@/components/icons/ph";
import ChannelPicker from "../../ChannelPicker";
import { GhostButton, Panel, RoleAdder, RoleChips, Row, Segmented, Stepper, Switch, roleColor, useGuildApi } from "../kit";

type Weight = { roleId: string; roleName: string; weightMultiplier: number; color?: string };
const field =
  "h-9 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const MAX_OPTIONS = 25;

/**
 * Sondage Etho (votes par boutons) : seules les options réellement appliquées par le bot sont proposées (qui peut voter,
 * poids par rôle, quorum, anonymat, changement ou retrait du vote, date de fin). Créé, lancé puis publié en une fois.
 */
export default function AdvancedPollForm({ guildId, onCreated }: { guildId: string; onCreated: () => void }) {
  const api = useGuildApi(guildId);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    { label: "", emoji: "" },
    { label: "", emoji: "" },
  ]);
  const [channelId, setChannelId] = useState("");
  const [hours, setHours] = useState(48);
  const [noEnd, setNoEnd] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [allowChange, setAllowChange] = useState(true);
  const [allowRetract, setAllowRetract] = useState(false);
  const [allowedRoles, setAllowedRoles] = useState<string[]>([]);
  const [logic, setLogic] = useState<"ANY" | "ALL">("ANY");
  const [forbiddenRoles, setForbiddenRoles] = useState<string[]>([]);
  const [minAccount, setMinAccount] = useState(0);
  const [minMember, setMinMember] = useState(0);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [quorum, setQuorum] = useState(false);
  const [minParticipants, setMinParticipants] = useState(10);
  const [threshold, setThreshold] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = options.map((o) => ({ label: o.label.trim(), emoji: o.emoji.trim() })).filter((o) => o.label);
  const canCreate = question.trim().length > 0 && clean.length >= 2 && !!channelId && !busy;

  const create = async () => {
    setBusy(true);
    setError(null);
    const created = await api<{ poll: { id: string } }>("/polls", {
      method: "POST",
      json: {
        title: question.trim().slice(0, 100),
        type: "SINGLE_CHOICE",
        anonymity: anonymous ? "ANONYMOUS" : "PUBLIC",
        allowVoteChange: allowChange,
        allowVoteRetract: allowRetract,
        questions: [{ title: question.trim(), options: clean.map((o) => ({ label: o.label, emoji: o.emoji || undefined })) }],
        eligibility: { allowedRoleIds: allowedRoles, forbiddenRoleIds: forbiddenRoles, minAccountAgeDays: minAccount, minGuildMembershipDays: minMember, specificUserIds: [], logicGate: logic },
        roleWeights: weights.map(({ roleId, roleName, weightMultiplier }) => ({ roleId, roleName, weightMultiplier })),
        quorum: { enabled: quorum, minParticipantsCount: quorum ? minParticipants : 0, minParticipationPercentage: 0, approvalThresholdPercentage: threshold },
        endsAt: noEnd ? undefined : new Date(Date.now() + hours * 3_600_000).toISOString(),
        panelConfig: { channelId },
      },
    });
    if (!created?.poll) return setBusy(false);
    // Lancer puis publier le panneau dans le salon ; si la publication échoue, le sondage reste visible dans la liste.
    await api(`/polls/${created.poll.id}/publish`, { method: "POST" });
    const deployed = await api(`/polls/${created.poll.id}/panel/deploy`, { method: "POST", json: { channelId } });
    setBusy(false);
    if (!deployed) setError("Le sondage est créé mais son panneau n'a pas pu être publié : vérifie le salon et les permissions d'Etho.");
    setQuestion("");
    setOptions([
      { label: "", emoji: "" },
      { label: "", emoji: "" },
    ]);
    onCreated();
  };

  return (
    <Panel title="Nouveau sondage avancé" subtitle="Votes par boutons sous le message d'Etho, avec règles de vote.">
      <Row label="Question">
        <input value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="Faut-il ouvrir un salon Minecraft ?" aria-label="Question" className={field} />
      </Row>
      <Row label="Choix" hint={`De 2 à ${MAX_OPTIONS} choix, emoji facultatif.`}>
        <div className="space-y-1.5">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={o.emoji} maxLength={8} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))} placeholder="🙂" aria-label={`Emoji du choix ${i + 1}`} className={`${field} w-14 px-1 text-center`} />
              <input value={o.label} maxLength={80} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={`Choix ${i + 1}`} aria-label={`Choix ${i + 1}`} className={field} />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} aria-label={`Retirer le choix ${i + 1}`} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--danger)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <GhostButton onClick={() => setOptions((l) => [...l, { label: "", emoji: "" }])}>
              <Plus className="h-3.5 w-3.5" /> Choix
            </GhostButton>
          )}
        </div>
      </Row>
      <Row label="Salon">
        <ChannelPicker guildId={guildId} value={channelId} filterTypes={[0, 5, 15]} placeholder="Choisir un salon" onChange={(id) => setChannelId(id)} />
      </Row>
      <Row label="Fin du sondage">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Switch checked={!noEnd} onChange={(v) => setNoEnd(!v)} label="Date de fin" />
            Se termine dans
          </label>
          {!noEnd && <Stepper value={hours} min={1} max={2160} unit="heures" onCommit={setHours} />}
        </div>
      </Row>

      <Row label="Vote anonyme" hint="Les noms des votants ne sont pas affichés.">
        <Switch checked={anonymous} onChange={setAnonymous} label="Vote anonyme" />
      </Row>
      <Row label="Changer de vote">
        <Switch checked={allowChange} onChange={setAllowChange} label="Changer de vote" />
      </Row>
      <Row label="Retirer son vote">
        <Switch checked={allowRetract} onChange={setAllowRetract} label="Retirer son vote" />
      </Row>

      <Row label="Qui peut voter" hint="Vide : tout le monde.">
        <div className="space-y-1.5">
          <RoleChips guildId={guildId} ids={allowedRoles} onChange={setAllowedRoles} />
          {allowedRoles.length > 1 && (
            <Segmented
              label="Rôles requis"
              value={logic}
              options={[
                ["ANY", "Un de ces rôles"],
                ["ALL", "Tous ces rôles"],
              ]}
              onChange={setLogic}
            />
          )}
        </div>
      </Row>
      <Row label="Rôles exclus">
        <RoleChips guildId={guildId} ids={forbiddenRoles} onChange={setForbiddenRoles} />
      </Row>
      <Row label="Compte Discord créé depuis">
        <Stepper value={minAccount} min={0} max={365} unit="jours" onCommit={setMinAccount} />
      </Row>
      <Row label="Sur le serveur depuis">
        <Stepper value={minMember} min={0} max={365} unit="jours" onCommit={setMinMember} />
      </Row>
      <Row label="Poids des votes" hint="Un rôle peut compter plusieurs voix (le plus fort l'emporte).">
        <div className="space-y-1.5">
          {weights.map((w, i) => (
            <div key={w.roleId} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: roleColor(w.color) }} />
              <span className="w-36 truncate text-xs text-[var(--text-primary)]">{w.roleName}</span>
              <Stepper value={w.weightMultiplier} min={1} max={10} unit="voix" onCommit={(n) => setWeights((l) => l.map((x, j) => (j === i ? { ...x, weightMultiplier: n } : x)))} />
              <button type="button" onClick={() => setWeights((l) => l.filter((_, j) => j !== i))} aria-label={`Retirer ${w.roleName}`} className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--danger)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <RoleAdder guildId={guildId} label="Rôle" excludeIds={weights.map((w) => w.roleId)} onPick={(r) => setWeights((l) => [...l, { roleId: r.id, roleName: r.name, weightMultiplier: 2, color: String(r.color ?? "") }])} />
        </div>
      </Row>
      <Row label="Quorum" hint="Le résultat n'est validé que si assez de membres ont voté.">
        <div className="flex flex-wrap items-center gap-3">
          <Switch checked={quorum} onChange={setQuorum} label="Quorum" />
          {quorum && (
            <>
              <Stepper value={minParticipants} min={1} max={10000} unit="votants minimum" onCommit={setMinParticipants} />
              <Segmented
                label="Majorité"
                value={threshold}
                options={[
                  [50, "Simple (50 %)"],
                  [66, "Des deux tiers"],
                ]}
                onChange={setThreshold}
              />
            </>
          )}
        </div>
      </Row>

      {error && <p className="border-t border-[var(--panel-border)] px-5 py-2 text-xs text-[var(--warning)]">{error}</p>}
      <div className="flex justify-end border-t border-[var(--panel-border)] px-5 py-3">
        <button type="button" disabled={!canCreate} onClick={create} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          {busy ? "Publication…" : "Publier le sondage"}
        </button>
      </div>
    </Panel>
  );
}
