"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { pageStagger } from "@/lib/motion-variants";
import { Chip, ConsolePage, EmptyLine, GhostButton, Panel, Row, Segmented, StatTile, Stepper, Switch, TextField, useGuildApi } from "../kit";

type Mode = "AUTOMATIC" | "MENTION_ONLY" | "COMMAND_ONLY" | "REPLY" | "HYBRID" | "DISABLED";
type Behavior = {
  enabled: boolean;
  defaultMode: Mode;
  hallucinationMode: "STRICT" | "BALANCED" | "CREATIVE";
  memory: { enabled: boolean; contextLength: number; retentionHours: number; userCanForget: boolean };
  dedicatedChannelId: string | null;
  allowImageGeneration: boolean;
  bannedWords: string[];
  thonMood: "SAGE" | "GAMER_SARCASTIQUE" | "PROTECTEUR" | "CYBERPUNK" | "CUSTOM";
};
type Sliders = { friendly: number; humor: number; formality: number; verbosity: number; creativity: number };
type Personality = { name: string; systemInstructions: string; sliders: Sliders; language: string; replyInUserLanguage: boolean };
type Rule = { channelId: string; channelName: string; mode: Mode };
type Source = { id: string; title: string; content: string; tokenCount: number; updatedAt: string };
type Analytics = { requestsToday: number; activeConversations: number; helpfulCount: number; unhelpfulCount: number; avgResponseTimeMs: number };

const MODES: [Mode, string][] = [
  ["MENTION_ONLY", "Si mentionné"],
  ["HYBRID", "Mention ou fil"],
  ["AUTOMATIC", "Tous les messages"],
  ["DISABLED", "Coupé"],
];
const MOODS: [Behavior["thonMood"], string][] = [
  ["SAGE", "Sage"],
  ["PROTECTEUR", "Protecteur"],
  ["GAMER_SARCASTIQUE", "Gamer sarcastique"],
  ["CYBERPUNK", "Cyberpunk"],
  ["CUSTOM", "Mes consignes"],
];
const SLIDERS: [keyof Sliders, string, string, string][] = [
  ["friendly", "Chaleur", "Neutre", "Chaleureux"],
  ["humor", "Humour", "Sérieux", "Drôle"],
  ["formality", "Ton", "Familier", "Soutenu"],
  ["verbosity", "Longueur", "Bref", "Détaillé"],
  ["creativity", "Créativité", "Factuel", "Inventif"],
];
const field =
  "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";

/** Assistant IA (format Keeper) : où et comment Etho répond, personnalité, connaissances et essai. Seuls les réglages appliqués par le bot sont affichés. */
export default function ConsoleAi({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [b, setB] = useState<Behavior | null>(null);
  const [p, setP] = useState<Personality | null>(null);
  const [instructions, setInstructions] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [newRuleChannel, setNewRuleChannel] = useState("");
  const [word, setWord] = useState("");
  const [kTitle, setKTitle] = useState("");
  const [kContent, setKContent] = useState("");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<{ answer: string; sourcesUsed: string[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, per, ch, k, a] = await Promise.all([
      api<Behavior>("/ai/settings"),
      api<Personality>("/ai/personality", { silent: true }),
      api<{ channelRules: Record<string, Rule> }>("/ai/channels", { silent: true }),
      api<{ sources: Source[] }>("/ai/knowledge", { silent: true }),
      api<Analytics>("/ai/analytics", { silent: true }),
    ]);
    if (s) setB(s);
    if (per) {
      setP(per);
      setInstructions(per.systemInstructions);
    }
    setRules(Object.values(ch?.channelRules ?? {}));
    setSources(k?.sources ?? []);
    if (a) setStats(a);
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  const saveB = async (patch: Partial<Behavior>) => {
    setB((x) => (x ? { ...x, ...patch } : x));
    const r = await api<Behavior>("/ai/settings", { method: "PUT", json: patch });
    if (r) setB(r);
  };
  const saveP = async (patch: Partial<Personality>) => {
    setP((x) => (x ? { ...x, ...patch } : x));
    const r = await api<Personality>("/ai/personality", { method: "PUT", json: patch });
    if (r) setP(r);
  };
  const setRule = async (channelId: string, mode: Mode | "INHERIT") => {
    const r = await api<Record<string, Rule>>("/ai/channels", { method: "PUT", json: { rule: { channelId, channelName: channelName(channelId), mode } } });
    if (r) setRules(Object.values(r));
  };
  const addSource = async () => {
    setBusy("k");
    const r = await api<Source>("/ai/knowledge", { method: "POST", json: { title: kTitle.trim(), content: kContent.trim(), type: "TEXT" } });
    setBusy(null);
    if (r) {
      setSources((l) => [...(l ?? []), r]);
      setKTitle("");
      setKContent("");
    }
  };
  const removeSource = async (s: Source) => {
    if (!(await confirmDialog(`Supprimer « ${s.title} » des connaissances d'Etho ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/ai/knowledge/${s.id}`, { method: "DELETE" })) setSources((l) => l?.filter((x) => x.id !== s.id) ?? null);
  };
  const test = async () => {
    setBusy("test");
    const r = await api<{ answer: string; sourcesUsed: string[] }>("/ai/test", { method: "POST", json: { query: query.trim() } });
    setBusy(null);
    if (r) setAnswer(r);
  };

  if (!b || !p) {
    return (
      <ConsolePage title="Assistant IA">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  }

  return (
    <ConsolePage title="Assistant IA">
      {!b.enabled && (
        <Panel>
          <p className="px-5 py-3 text-xs text-[var(--warning)]">Module désactivé : Etho ne répond pas. Active-le avec l&apos;interrupteur en haut de la page.</p>
        </Panel>
      )}

      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Questions aujourd'hui" value={stats?.requestsToday ?? "—"} />
        <StatTile label="Conversations en cours" value={stats?.activeConversations ?? "—"} />
        <StatTile label="Réponses utiles" value={stats ? `${stats.helpfulCount} / ${stats.helpfulCount + stats.unhelpfulCount}` : "—"} hint="votes 👍 sur les réponses" />
        <StatTile label="Temps de réponse" value={stats?.avgResponseTimeMs ? `${(stats.avgResponseTimeMs / 1000).toFixed(1)} s` : "—"} />
      </motion.div>

      <Panel title="Quand répondre">
        <Row label="Mode général">
          <Segmented label="Mode général" value={MODES.some(([m]) => m === b.defaultMode) ? b.defaultMode : "MENTION_ONLY"} options={MODES} onChange={(v) => saveB({ defaultMode: v })} />
        </Row>
        <Row label="Salon IA dédié" hint="Etho répond à tous les messages de ce salon, quel que soit le mode.">
          <ChannelPicker guildId={guildId} value={b.dedicatedChannelId ?? ""} filterTypes={[0]} placeholder="Aucun" onChange={(id) => saveB({ dedicatedChannelId: id || null })} />
        </Row>
        <Row label="Salons particuliers" hint="Un mode différent pour certains salons ou catégories.">
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r.channelId} className="flex flex-wrap items-center gap-2">
                <span className="w-40 truncate text-xs text-[var(--text-primary)]">#{channelName(r.channelId)}</span>
                <Segmented label={`Mode de ${r.channelName}`} value={MODES.some(([m]) => m === r.mode) ? r.mode : "MENTION_ONLY"} options={MODES} onChange={(v) => setRule(r.channelId, v)} />
                <GhostButton onClick={() => setRule(r.channelId, "INHERIT")}>Retirer</GhostButton>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <ChannelPicker guildId={guildId} value={newRuleChannel} filterTypes={[0, 4]} placeholder="Ajouter un salon" onChange={(id) => setNewRuleChannel(id)} />
              <GhostButton
                disabled={!newRuleChannel || rules.some((r) => r.channelId === newRuleChannel)}
                onClick={() => {
                  void setRule(newRuleChannel, b.defaultMode === "DISABLED" ? "MENTION_ONLY" : "DISABLED");
                  setNewRuleChannel("");
                }}
              >
                Ajouter
              </GhostButton>
            </div>
          </div>
        </Row>
      </Panel>

      <Panel title="Personnalité">
        <Row label="Nom">
          <TextField value={p.name} maxLength={80} onCommit={(v) => saveP({ name: v })} />
        </Row>
        <Row label="Humeur">
          <Segmented label="Humeur" value={b.thonMood} options={MOODS} onChange={(v) => saveB({ thonMood: v })} />
        </Row>
        <Row label="Consignes" hint={b.thonMood === "CUSTOM" ? "Utilisées comme humeur." : "Ajoutées à chaque réponse."}>
          <textarea value={instructions} maxLength={4000} rows={3} onChange={(e) => setInstructions(e.target.value)} onBlur={() => instructions !== p.systemInstructions && saveP({ systemInstructions: instructions })} aria-label="Consignes" className={field} />
        </Row>
        {SLIDERS.map(([key, label, low, high]) => (
          <Row key={key} label={label}>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
              <span className="w-16 text-right">{low}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                defaultValue={p.sliders[key]}
                onPointerUp={(e) => saveP({ sliders: { ...p.sliders, [key]: Number((e.target as HTMLInputElement).value) } })}
                onKeyUp={(e) => saveP({ sliders: { ...p.sliders, [key]: Number((e.target as HTMLInputElement).value) } })}
                aria-label={label}
                className="w-48 accent-[var(--accent-primary)]"
              />
              <span className="w-16">{high}</span>
            </div>
          </Row>
        ))}
        <Row label="Langue de l'utilisateur" hint="Répond dans la langue de la question.">
          <Switch checked={p.replyInUserLanguage} onChange={(v) => saveP({ replyInUserLanguage: v })} label="Langue de l'utilisateur" />
        </Row>
      </Panel>

      <Panel title="Sécurité des réponses">
        <Row label="Précision" hint="Strict : refuse plutôt que d'inventer quand les connaissances ne suffisent pas.">
          <Segmented
            label="Précision"
            value={b.hallucinationMode}
            options={[
              ["STRICT", "Stricte"],
              ["BALANCED", "Équilibrée"],
              ["CREATIVE", "Libre"],
            ]}
            onChange={(v) => saveB({ hallucinationMode: v })}
          />
        </Row>
        <Row label="Images (/imagine)">
          <Switch checked={b.allowImageGeneration} onChange={(v) => saveB({ allowImageGeneration: v })} label="Génération d'images" />
        </Row>
        <Row label="Mots interdits" hint="Etho ne répond pas aux messages qui les contiennent.">
          <div className="flex flex-wrap items-center gap-1.5">
            {b.bannedWords.map((w) => (
              <Chip key={w} label={w} onRemove={() => saveB({ bannedWords: b.bannedWords.filter((x) => x !== w) })} />
            ))}
            <input
              value={word}
              maxLength={50}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && word.trim() && !b.bannedWords.includes(word.trim())) {
                  void saveB({ bannedWords: [...b.bannedWords, word.trim()] });
                  setWord("");
                }
              }}
              placeholder="Ajouter (Entrée)"
              aria-label="Ajouter un mot interdit"
              className="h-8 w-40 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
            />
          </div>
        </Row>
        <Row label="Mémoire de conversation" hint="Etho se souvient des derniers messages échangés.">
          <div className="flex flex-wrap items-center gap-3">
            <Switch checked={b.memory.enabled} onChange={(v) => saveB({ memory: { ...b.memory, enabled: v } })} label="Mémoire de conversation" />
            {b.memory.enabled && <Stepper value={b.memory.contextLength} min={2} max={50} unit="messages" onCommit={(n) => saveB({ memory: { ...b.memory, contextLength: n } })} />}
          </div>
        </Row>
      </Panel>

      <Panel title="Connaissances" subtitle="Textes que l'IA consulte pour répondre (règles, FAQ, infos du serveur).">
        {sources && sources.length > 0 && (
          <ul>
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-[var(--panel-border)] px-5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{s.title}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{s.content.slice(0, 140)}</p>
                </div>
                <GhostButton onClick={() => removeSource(s)}>Supprimer</GhostButton>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 px-5 py-3">
          <input value={kTitle} maxLength={200} onChange={(e) => setKTitle(e.target.value)} placeholder="Titre (ex. Règlement)" aria-label="Titre" className={`${field} h-9 py-0`} />
          <textarea value={kContent} maxLength={50000} rows={3} onChange={(e) => setKContent(e.target.value)} placeholder="Contenu" aria-label="Contenu" className={field} />
          <div className="flex justify-end">
            <GhostButton disabled={!kTitle.trim() || !kContent.trim() || busy === "k"} onClick={addSource}>
              Ajouter aux connaissances
            </GhostButton>
          </div>
        </div>
      </Panel>

      <Panel title="Essayer" subtitle="Pose une question comme un membre, avec les réglages actuels.">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <input
            value={query}
            maxLength={500}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.trim() && test()}
            placeholder="Quelles sont les règles du serveur ?"
            aria-label="Question"
            className={`${field} h-9 min-w-0 flex-1 py-0`}
          />
          <GhostButton disabled={!query.trim() || busy === "test"} onClick={test}>
            {busy === "test" ? "Réflexion…" : "Demander"}
          </GhostButton>
        </div>
        {answer && (
          <div className="border-t border-[var(--panel-border)] px-5 py-3">
            <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{answer.answer}</p>
            {answer.sourcesUsed.length > 0 && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Sources : {answer.sourcesUsed.join(", ")}</p>}
          </div>
        )}
      </Panel>
    </ConsolePage>
  );
}
