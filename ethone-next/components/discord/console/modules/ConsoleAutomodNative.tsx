"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ChannelPicker from "../../ChannelPicker";
import { confirmDialog } from "@/lib/confirmDialog";
import { ConsolePage, EmptyLine, GhostButton, Panel, Row, Switch, useGuildApi } from "../kit";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: "keyword" | "spam" | "keyword_preset" | "mention_spam" | "member_profile" | "unknown";
  triggerMetadata: { keywordFilter: string[]; presets: string[]; mentionTotalLimit: number | null; mentionRaidProtectionEnabled: boolean };
  actions: { type: string; durationSeconds?: number }[];
  exemptRoles: string[];
  exemptChannels: string[];
};

const TRIGGER: Record<Rule["triggerType"], string> = {
  keyword: "Mots-clés",
  spam: "Spam suspect",
  keyword_preset: "Listes prédéfinies",
  mention_spam: "Spam de mentions",
  member_profile: "Profil des membres",
  unknown: "Autre",
};
const ACTION: Record<string, string> = { block_message: "bloque le message", send_alert: "alerte le staff", timeout: "exclut temporairement", block_member_interaction: "bloque le membre" };
const PRESET: Record<string, string> = { profanity: "grossièretés", sexual_content: "contenu sexuel", slurs: "insultes" };

/** AutoMod Discord (format Keeper) : règles exécutées par Discord lui-même, même si Etho est hors ligne. */
export default function ConsoleAutomodNative({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [alertChannel, setAlertChannel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ rules: Rule[] }>("/automod-native");
    setRules(r?.rules ?? []);
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (rule: Rule, enabled: boolean) => {
    setRules((l) => l?.map((x) => (x.id === rule.id ? { ...x, enabled } : x)) ?? null);
    if (!(await api(`/automod-native/${rule.id}/toggle`, { method: "PATCH", json: { enabled } }))) void load();
  };
  const remove = async (rule: Rule) => {
    if (!(await confirmDialog(`Supprimer la règle Discord « ${rule.name} » ?`, { title: "Supprimer", confirmLabel: "Supprimer" }))) return;
    if (await api(`/automod-native/${rule.id}`, { method: "DELETE" })) void load();
  };
  const recommended = async () => {
    setBusy("rec");
    const r = await api<{ created: unknown[]; skipped: unknown[] }>("/automod-native/recommended", { method: "POST", json: { alertChannelId: alertChannel || undefined } });
    setBusy(null);
    if (r) {
      setNote(`${r.created.length} règle${r.created.length > 1 ? "s" : ""} créée${r.created.length > 1 ? "s" : ""}${r.skipped.length ? `, ${r.skipped.length} déjà présente${r.skipped.length > 1 ? "s" : ""} ou impossible${r.skipped.length > 1 ? "s" : ""}` : ""}.`);
      void load();
    }
  };

  const summary = (r: Rule) => {
    const md = r.triggerMetadata;
    const what =
      r.triggerType === "keyword"
        ? `${md.keywordFilter.length} mot${md.keywordFilter.length > 1 ? "s" : ""}-clé${md.keywordFilter.length > 1 ? "s" : ""}`
        : r.triggerType === "keyword_preset"
          ? md.presets.map((p) => PRESET[p] ?? p).join(", ")
          : r.triggerType === "mention_spam"
            ? `plus de ${md.mentionTotalLimit ?? "?"} mentions${md.mentionRaidProtectionEnabled ? ", protection anti-raid" : ""}`
            : TRIGGER[r.triggerType];
    const how = r.actions.map((a) => ACTION[a.type] ?? a.type).join(", ");
    return `${what}${how ? ` · ${how}` : ""}${r.exemptRoles.length + r.exemptChannels.length ? ` · ${r.exemptRoles.length + r.exemptChannels.length} exception(s)` : ""}`;
  };

  return (
    <ConsolePage
      title="AutoMod Discord"
      actions={
        <Link href={`/discord/automod-native?guildId=${guildId}`} className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
          Créer ou modifier une règle
        </Link>
      }
    >
      <Panel title="Règles recommandées" subtitle="Grossièretés, contenu sexuel, insultes, spam et raids de mentions, bloqués par Discord avant même d'être publiés.">
        <Row label="Salon d'alerte" hint="Facultatif : Discord y signale chaque message bloqué.">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelPicker guildId={guildId} value={alertChannel} filterTypes={[0]} placeholder="Aucun" onChange={(id) => setAlertChannel(id)} />
            <GhostButton disabled={busy === "rec"} onClick={recommended}>
              {busy === "rec" ? "Création…" : "Créer les règles recommandées"}
            </GhostButton>
          </div>
        </Row>
      </Panel>

      {note && (
        <Panel>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="text-xs text-[var(--text-primary)]">{note}</p>
            <GhostButton onClick={() => setNote(null)}>OK</GhostButton>
          </div>
        </Panel>
      )}

      <Panel title="Règles du serveur" subtitle="Discord limite le nombre de règles par type.">
        {!rules ? (
          <EmptyLine>Chargement…</EmptyLine>
        ) : rules.length === 0 ? (
          <EmptyLine>Aucune règle AutoMod Discord sur ce serveur.</EmptyLine>
        ) : (
          <ul>
            {rules.map((r) => (
              <li key={r.id} className="flex items-center gap-3 border-t border-[var(--panel-border)] px-5 py-3 first:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {r.name} <span className="font-normal text-[var(--text-muted)]">· {TRIGGER[r.triggerType]}</span>
                  </p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{summary(r)}</p>
                </div>
                <GhostButton onClick={() => remove(r)}>Supprimer</GhostButton>
                <Switch checked={r.enabled} onChange={(v) => toggle(r, v)} label={`Activer ${r.name}`} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </ConsolePage>
  );
}
