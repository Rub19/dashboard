"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Hash, Search } from "@/components/icons/ph";
import { fetchGuildChannels, type ChannelOption } from "../ChannelPicker";
import { SPRING_PILL } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ChannelAdder, Chip, ConsolePage, EmptyLine, Panel, RoleChips, Row, Segmented, Switch, useGuildApi } from "./kit";

type Rule = {
  enabled: boolean;
  access: "origin" | "roles";
  allowedRoles: string[];
  deniedRoles: string[];
  allowedChannels: string[];
  ownersBypass: boolean;
  cooldownSeconds: number;
  maxUses: number;
  maxUsesWindowMinutes: number;
};
type Cmd = {
  name: string;
  description: string;
  category: string;
  module: { id: string; label: string; enabled: boolean } | null;
  rule: Rule;
  customized: boolean;
};

const WINDOWS = [
  { minutes: 10, label: "par 10 min" },
  { minutes: 60, label: "par heure" },
  { minutes: 1440, label: "par jour" },
  { minutes: 10080, label: "par semaine" },
];
const INPUT =
  "h-9 w-20 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";


const statusOf = (c: Cmd) => (!c.rule.enabled ? "Désactivée" : c.customized ? "Personnalisée" : "Accès d'origine");
type Filter = "all" | "off" | "custom";
const FILTERS: Record<Filter, (c: Cmd) => boolean> = { all: () => true, off: (c) => !c.rule.enabled, custom: (c) => c.rule.enabled && c.customized };

/**
 * Commandes (format Keeper) : liste des commandes d'Etho, et pour chacune activation, qui peut l'utiliser et limites
 * par membre. Les règles s'ajoutent aux contrôles d'origine du bot (permissions Discord, rôles admin et modo).
 */
export default function ConsoleCommands({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const [commands, setCommands] = useState<Cmd[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  // Catégories dépliées : celle de la commande choisie l'est toujours ; une recherche ou un filtre déplie tout.
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const d = await api<{ commands: Cmd[] }>("/console/commands");
    if (d) {
      setCommands(d.commands);
      setSelected((s) => s ?? d.commands[0]?.name ?? null);
    }
  }, [api]);
  useEffect(() => {
    void load();
    fetchGuildChannels(guildId).then(setChannels);
  }, [guildId, load]);

  const cmd = commands?.find((c) => c.name === selected) ?? null;

  const save = async (patch: Partial<Rule>) => {
    if (!cmd) return;
    const name = cmd.name;
    setCommands((list) => list?.map((c) => (c.name === name ? { ...c, rule: { ...c.rule, ...patch } } : c)) ?? null);
    const r = await api<{ rule: Rule; customized: boolean }>(`/console/commands/${name}`, { method: "PATCH", json: patch });
    if (r) setCommands((list) => list?.map((c) => (c.name === name ? { ...c, rule: r.rule, customized: r.customized } : c)) ?? null);
    else void load();
  };

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase().replace(/^\//, "");
    const map = new Map<string, Cmd[]>();
    for (const c of commands ?? []) {
      if (!FILTERS[filter](c)) continue;
      if (query && !c.name.includes(query) && !c.description.toLowerCase().includes(query)) continue;
      map.set(c.category, [...(map.get(c.category) ?? []), c]);
    }
    return [...map.entries()];
  }, [commands, q, filter]);
  const expandAll = q.trim() !== "" || filter !== "all";
  const isOpen = (category: string) => expandAll || openCats.has(category) || cmd?.category === category;
  const toggleCat = (category: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (isOpen(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  // Flèches haut/bas : commande précédente/suivante parmi celles affichées.
  const visible = groups.flatMap(([category, list]) => (isOpen(category) ? list : []));
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const i = visible.findIndex((c) => c.name === selected);
    const next = visible[Math.min(visible.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      setSelected(next.name);
      listRef.current?.querySelector(`[data-cmd="${next.name}"]`)?.scrollIntoView({ block: "nearest" });
    }
  };
  const counts = { off: (commands ?? []).filter(FILTERS.off).length, custom: (commands ?? []).filter(FILTERS.custom).length };
  const filterOptions: [Filter, string][] = [
    ["all", "Toutes"],
    ["off", counts.off ? `Coupées · ${counts.off}` : "Coupées"],
    ["custom", counts.custom ? `Modifiées · ${counts.custom}` : "Modifiées"],
  ];

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;


  return (
    <ConsolePage title="Commandes">
      {!commands ? (
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-[15rem_1fr]">
          <nav aria-label="Commandes" className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] md:sticky md:top-4">
            <div className="flex items-center gap-2 border-b border-[var(--panel-border)] px-3 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Rechercher (${commands.length})`}
                aria-label="Rechercher une commande"
                className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div className="flex gap-1 border-b border-[var(--panel-border)] px-2 py-2">
              {filterOptions.map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors",
                    filter === f ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={onListKey}
              aria-label="Liste des commandes (flèches haut et bas pour naviguer)"
              className="max-h-72 overflow-y-auto p-1.5 outline-none md:max-h-[calc(100vh-15rem)]"
            >
              {groups.length === 0 && <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">Aucune commande.</p>}
              {groups.map(([category, list]) => {
                const open = isOpen(category);
                return (
                  <div key={category} className="mb-0.5">
                    <button
                      type="button"
                      onClick={() => toggleCat(category)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", !open && "-rotate-90")} />
                      <span className="flex-1 truncate">{category}</span>
                      <span className="font-mono font-normal normal-case tracking-normal">{list.length}</span>
                    </button>
                    {open &&
                      list.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          data-cmd={c.name}
                          onClick={() => setSelected(c.name)}
                          aria-current={c.name === selected ? "true" : undefined}
                          title={`${statusOf(c)} — ${c.description}`}
                          className={cn(
                            "relative w-full rounded-lg px-2.5 py-1 text-left transition-colors",
                            c.name === selected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          {c.name === selected && <motion.span layoutId="cmd-active" transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--surface-hover)]" />}
                          <span className="relative flex items-center gap-2">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                !c.rule.enabled ? "bg-[var(--danger)]" : c.customized ? "bg-[var(--warning)]" : "bg-[var(--success)]"
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold">/{c.name}</span>
                            {(!c.rule.enabled || c.customized) && <span className="shrink-0 text-[10px] text-[var(--text-muted)]">{c.rule.enabled ? "modifiée" : "coupée"}</span>}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </nav>

          <AnimatePresence mode="wait" initial={false}>
            {cmd && (
              // Variantes nommées : les blocs (Panel = staggerItem) rejouent leur entrée à chaque commande. Avec des
              // valeurs brutes ici, ils restaient sur leur état initial (invisibles) dès qu'on changeait de commande.
              <motion.div key={cmd.name} variants={pageStagger} initial="initial" animate="animate" exit={{ opacity: 0, transition: { duration: 0.08 } }} className="min-w-0 space-y-4">
                <Panel>
                  <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <h2 className="font-mono text-lg font-bold text-[var(--text-primary)]">/{cmd.name}</h2>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{cmd.description}</p>
                      {cmd.module && !cmd.module.enabled && (
                        <p className="mt-2 text-[11px] text-[var(--warning)]">
                          Le module {cmd.module.label} est coupé : la commande ne répond pas tant qu&apos;il n&apos;est pas réactivé.
                        </p>
                      )}
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                      {cmd.rule.enabled ? "Activée" : "Désactivée"}
                      <Switch checked={cmd.rule.enabled} onChange={(v) => save({ enabled: v })} label={`${cmd.rule.enabled ? "Désactiver" : "Activer"} /${cmd.name}`} />
                    </label>
                  </div>
                </Panel>

                <Panel title="Qui peut l'utiliser">
                  <Row label="Accès" hint="« Rôles choisis » réserve la commande à certains rôles, en plus des droits d'origine.">
                    <Segmented
                      label="Accès"
                      value={cmd.rule.access}
                      options={[
                        ["origin", "Comme d'origine"],
                        ["roles", "Rôles choisis"],
                      ]}
                      onChange={(v) => save({ access: v })}
                    />
                  </Row>
                  {cmd.rule.access === "roles" && (
                    <Row label="Rôles autorisés" hint={cmd.rule.allowedRoles.length ? undefined : "Aucun rôle : seuls les owners peuvent l'utiliser."}>
                      <RoleChips guildId={guildId} addLabel="Ajouter un rôle" ids={cmd.rule.allowedRoles} onChange={(ids) => save({ allowedRoles: ids })} />
                    </Row>
                  )}
                  <Row label="Rôles interdits" hint="Les membres qui ont un de ces rôles ne peuvent pas l'utiliser.">
                    <RoleChips guildId={guildId} addLabel="Ajouter un rôle" ids={cmd.rule.deniedRoles} onChange={(ids) => save({ deniedRoles: ids })} />
                  </Row>
                  <Row label="Salons autorisés" hint="Vide : partout. Les fils suivent leur salon.">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cmd.rule.allowedChannels.map((id) => (
                        <Chip key={id} label={channelName(id)} onRemove={() => save({ allowedChannels: cmd.rule.allowedChannels.filter((x) => x !== id) })}>
                          <Hash className="h-3 w-3 text-[var(--text-muted)]" />
                        </Chip>
                      ))}
                      <ChannelAdder
                        guildId={guildId}
                        label="Ajouter un salon"
                        excludeIds={cmd.rule.allowedChannels}
                        onPick={(c) => save({ allowedChannels: [...cmd.rule.allowedChannels, c.id] })}
                      />
                    </div>
                  </Row>
                  <Row label="Owners Etho" hint="Le propriétaire et les owners Etho ignorent ces règles.">
                    <Switch checked={cmd.rule.ownersBypass} onChange={(v) => save({ ownersBypass: v })} label="Les owners ignorent ces règles" />
                  </Row>
                </Panel>

                <Panel title="Limites par membre">
                  <Row label="Délai entre deux utilisations">
                    <div className="flex items-center gap-3">
                      <Switch checked={cmd.rule.cooldownSeconds > 0} onChange={(v) => save({ cooldownSeconds: v ? 30 : 0 })} label="Délai entre deux utilisations" />
                      {cmd.rule.cooldownSeconds > 0 && (
                        <NumberField key={`cd-${cmd.name}`} value={cmd.rule.cooldownSeconds} min={1} max={86400} suffix="secondes" onCommit={(n) => save({ cooldownSeconds: n })} />
                      )}
                    </div>
                  </Row>
                  <Row label="Nombre d'utilisations">
                    <div className="flex flex-wrap items-center gap-3">
                      <Switch checked={cmd.rule.maxUses > 0} onChange={(v) => save({ maxUses: v ? 5 : 0 })} label="Limiter le nombre d'utilisations" />
                      {cmd.rule.maxUses > 0 && (
                        <>
                          <NumberField key={`mu-${cmd.name}`} value={cmd.rule.maxUses} min={1} max={1000} onCommit={(n) => save({ maxUses: n })} />
                          <select
                            value={cmd.rule.maxUsesWindowMinutes}
                            onChange={(e) => save({ maxUsesWindowMinutes: Number(e.target.value) })}
                            aria-label="Période"
                            className="h-9 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70"
                          >
                            {WINDOWS.some((w) => w.minutes === cmd.rule.maxUsesWindowMinutes) ? null : (
                              <option value={cmd.rule.maxUsesWindowMinutes}>par {cmd.rule.maxUsesWindowMinutes} min</option>
                            )}
                            {WINDOWS.map((w) => (
                              <option key={w.minutes} value={w.minutes}>
                                {w.label}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  </Row>
                  <p className="border-t border-[var(--panel-border)] px-5 py-3 text-[11px] text-[var(--text-muted)]">
                    Les contrôles d&apos;origine (permissions Discord, rôles admin et modo, hiérarchie des rôles) restent toujours vérifiés.
                  </p>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </ConsolePage>
  );
}


/** Champ numérique enregistré à la sortie du champ (ou Entrée), borné. */
function NumberField({ value, min, max, suffix, onCommit }: { value: number; min: number; max: number; suffix?: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Math.min(max, Math.max(min, Math.round(Number(draft) || min)));
    setDraft(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={INPUT}
      />
      {suffix}
    </span>
  );
}
