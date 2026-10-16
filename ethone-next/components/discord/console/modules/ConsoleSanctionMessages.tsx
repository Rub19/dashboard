"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { ConsolePage, EmptyLine, Panel, Row, Segmented, Select, Switch } from "../kit";
import { ColorField } from "../welcome/MessageEditor";
import { INPUT, PageTitle, SavingBadge, useSanctionConfig } from "../sanctions/shared";
import { tx } from "@/lib/tx";

type Template = { enabled: boolean; format: "container" | "embed" | "text"; thumb: "none" | "member" | "moderator" | "server"; title: string; color: string; text: string; footer: string };
type Reply = Template & { visibility: "all" | "mod"; deleteAfterSeconds: number };
type Key = "warn" | "note" | "ban" | "tempban" | "softban" | "kick" | "mute" | "unmute" | "unban";
type Extra = "end" | "appealAccepted" | "appealRefused";
type Cfg = { messages: Record<Key, { reply: Reply; dm: Template }> & Record<Extra, Template>; [k: string]: unknown };

const KEYS: Key[] = ["warn", "note", "ban", "tempban", "softban", "kick", "mute", "unmute", "unban"];
const LABEL: Record<Key, string> = { warn: "Avertissement", note: "Note", ban: "Bannissement", tempban: "Ban temporaire", softban: "Softban", kick: "Expulsion", mute: "Mute", unmute: "Fin de mute", unban: "Débannissement" };
const COLOR: Record<Key, string> = { warn: "#FEE75C", note: "#5865F2", ban: "#ED4245", tempban: "#ED4245", softban: "#ED4245", kick: "#F97316", mute: "#F97316", unmute: "#57F287", unban: "#57F287" };
const VARS: ReadonlyArray<readonly [string, string]> = [
  ["{target}", "Mention du membre"],
  ["{member}", "Nom du membre"],
  ["{moderator}", "Modérateur"],
  ["{reason}", "Raison"],
  ["{case}", "Numéro du dossier"],
  ["{warns}", "Avertissements actifs"],
  ["{type}", "Type de sanction"],
  ["{duration}", "Durée"],
  ["{points}", "Points"],
  ["{server}", "Nom du serveur"],
];
const SAMPLE: Record<string, string> = { "{target}": "@membre", "{member}": "membre", "{moderator}": "Rub", "{reason}": "Spam dans les salons", "{case}": "#42", "{warns}": "2", "{type}": "Avertissement", "{duration}": "1 heure", "{points}": "1", "{server}": "Mon serveur" };
const fill = (t: string) => t.replace(/\{(target|member|moderator|reason|case|warns|server|duration|points|type)\}/g, (m) => SAMPLE[m] ?? m);

const defaultsFor = (k: Key) => ({
  reply: { title: `${LABEL[k]}`, text: k === "warn" ? tx("{target} a reçu un avertissement ({warns} actifs).\n> {reason}") : tx("{target} · {type}\n> {reason}"), footer: "Dossier {case}", color: COLOR[k] },
  dm: { title: tx("{v0} sur {server}", { v0: LABEL[k] }), text: tx("**Raison :** {reason}\n**Dossier :** {case}"), footer: "{server}", color: COLOR[k] },
});
const EXTRA_DEFAULTS: Record<Extra, Partial<Template>> = {
  end: { title: "Ta sanction est terminée", text: "Ta sanction sur {server} ({type}, dossier {case}) est terminée.", footer: "{server}", color: "#57F287" },
  appealAccepted: { title: "Appel accepté", text: "Ton appel du dossier {case} est accepté : la sanction est levée.", footer: "{server}", color: "#57F287" },
  appealRefused: { title: "Appel refusé", text: "Ton appel du dossier {case} est refusé : la sanction est maintenue.", footer: "{server}", color: "#ED4245" },
};

function VarText({ value, onChange, rows, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const insert = (v: string) => {
    const el = ref.current;
    const a = el?.selectionStart ?? value.length;
    const b = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, a) + v + value.slice(b));
    setOpen(false);
  };
  return (
    <div className="relative space-y-1">
      {rows ? (
        <textarea ref={ref} value={value} rows={rows} maxLength={2000} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, "py-2 leading-relaxed")} />
      ) : (
        <input ref={ref} value={value} maxLength={256} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(INPUT, "h-9")} />
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        {"{ }"} {" "}{tx("Variables")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING_PILL} className="flex flex-wrap gap-1.5">
            {VARS.map(([v, label]) => (
              <button key={v} type="button" title={label} onClick={() => insert(v)} className="rounded-md bg-[var(--surface-hover)] px-2 py-1 font-mono text-[11px] text-[var(--accent-primary)] hover:brightness-125">
                {v}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Editor({ t, onChange }: { t: Template; onChange: (p: Partial<Template>) => void }) {
  return (
    <div className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label={tx("Format")} value={t.format} options={[["container", "Container"], ["embed", "Embed"], ["text", "Texte"]]} onChange={(v) => onChange({ format: v })} />
        {t.format !== "text" && (
          <Select value={t.thumb} aria-label={tx("Vignette")} options={[["none", "Sans vignette"], ["member", "Avatar du membre"], ["moderator", "Avatar du modérateur"], ["server", "Icône du serveur"]]} onChange={(v) => onChange({ thumb: v })} />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="space-y-1.5">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">{tx("Titre")}</span>
          <VarText value={t.title} onChange={(v) => onChange({ title: v })} />
        </label>
        {t.format !== "text" && (
          <div className="space-y-1.5">
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">{tx("Couleur")}</span>
            <ColorField label={tx("Couleur")} value={t.color} onChange={(v) => onChange({ color: v })} />
          </div>
        )}
      </div>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{tx("Texte")}</span>
        <VarText value={t.text} rows={4} onChange={(v) => onChange({ text: v })} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{tx("Pied de page")}</span>
        <VarText value={t.footer} onChange={(v) => onChange({ footer: v })} />
      </label>
    </div>
  );
}

function Preview({ t, dm, original }: { t: Template; dm?: boolean; original: string }) {
  const title = fill(t.title);
  const text = fill(t.text);
  const footer = fill(t.footer);
  const lines = (s: string) =>
    s.split("\n").map((l, i) =>
      l.startsWith("> ") ? (
        <p key={i} className="border-l-4 border-[#4E5058] pl-2">
          {l.slice(2)}
        </p>
      ) : (
        <p key={i}>{l.replace(/\*\*/g, "")}</p>
      )
    );
  const thumb = t.thumb !== "none" && t.format !== "text" && <div className="h-16 w-16 shrink-0 rounded-md bg-gradient-to-br from-[#5865F2] to-[#92C8D2]" />;
  return (
    <div className="space-y-2 p-4">
      <div className="rounded-xl bg-[#313338] p-4 font-[system-ui]">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-[#5865F2]" />
          <div className="min-w-0 flex-1 text-[14px] text-[#DBDEE1]">
            <p className="flex items-center gap-1.5">
              <span className="font-medium text-white">{tx("Etho")}</span>
              <span className="rounded-[3px] bg-[#5865F2] px-1 text-[10px] font-semibold text-white">{tx("APP")}</span>
              <span className="text-[11px] text-[#949BA4]">{dm ? tx("en message privé") : tx("Aujourd'hui à {time}", { time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}</span>
            </p>
            {!t.enabled ? (
              <p className="text-xs italic text-[#949BA4]">{original}</p>
            ) : t.format === "text" ? (
              <div className="mt-1 space-y-0.5">
                {title && <p className="font-semibold text-white">{title}</p>}
                {lines(text)}
                {footer && <p className="text-xs text-[#949BA4]">{footer}</p>}
              </div>
            ) : (
              <motion.div layout transition={SPRING_LAYOUT} className={cn("mt-1 flex gap-3 overflow-hidden bg-[#2B2D31] p-3", t.format === "embed" ? "rounded-[4px]" : "rounded-lg")} style={{ borderLeft: `4px solid ${t.color}` }}>
                <div className="min-w-0 flex-1 space-y-1">
                  {title && <p className={cn("font-semibold text-white", t.format === "container" ? "text-[17px]" : "text-[15px]")}>{title}</p>}
                  <div className="space-y-0.5 text-[13px]">{lines(text)}</div>
                  {footer && <p className={cn("text-[11px] text-[#B5BAC1]", t.format === "container" && "border-t border-white/10 pt-1.5")}>{footer}</p>}
                </div>
                {thumb}
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-[var(--text-muted)]">{t.enabled ? tx("Exemple avec des valeurs fictives.") : tx("Désactivé : Etho garde son message d'origine.")}</p>
    </div>
  );
}

/** Messages de sanction (format Keeper, gratuit) : réponse des commandes et messages privés, personnalisables. */
export default function ConsoleSanctionMessages({ guildId }: { guildId: string }) {
  const { cfg, set, status } = useSanctionConfig<Cfg>(guildId);
  const [key, setKey] = useState<Key>("warn");
  const [extra, setExtra] = useState<Extra>("end");

  if (!cfg)
    return (
      <ConsolePage title={tx("Messages de sanction")}>
        <Panel>
          <EmptyLine>{tx("Chargement…")}</EmptyLine>
        </Panel>
      </ConsolePage>
    );
  const m = cfg.messages;
  const cur = m[key];
  const setPair = (patch: Partial<{ reply: Partial<Reply>; dm: Partial<Template> }>) =>
    set("messages", { ...m, [key]: { reply: { ...cur.reply, ...patch.reply }, dm: { ...cur.dm, ...patch.dm } } });
  const enable = (which: "reply" | "dm", on: boolean) => {
    const t = cur[which];
    const empty = !t.title && !t.text && !t.footer;
    setPair({ [which]: { enabled: on, ...(on && empty ? defaultsFor(key)[which] : {}) } });
  };
  const ex = m[extra];
  const setExtraTpl = (p: Partial<Template>) => set("messages", { ...m, [extra]: { ...ex, ...p } });
  const resetPair = (which: "reply" | "dm") => setPair({ [which]: { ...defaultsFor(key)[which], format: which === "reply" ? "container" : "embed", thumb: "member" } });

  return (
    <ConsolePage title={<PageTitle title={tx("Messages de sanction")} text={tx("La réponse d'Etho après une sanction, et le message privé envoyé au membre sanctionné.")} />} actions={<SavingBadge text={status} />}>
      <div role="tablist" aria-label={tx("Commandes")} className="flex max-w-full flex-wrap gap-1 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1">
        {KEYS.map((k) => (
          <button key={k} role="tab" type="button" aria-selected={key === k} onClick={() => setKey(k)} className={cn("relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] transition-colors", key === k ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
            {key === k && <motion.span layoutId="sanction-msg-tab" transition={SPRING_PILL} className="absolute inset-0 rounded-lg bg-[var(--surface-hover)]" />}
            <span className={cn("relative h-1.5 w-1.5 rounded-full", m[k].reply.enabled || m[k].dm.enabled ? "bg-[var(--success)]" : "bg-[var(--text-muted)]/50")} />
            <span className="relative">/{k}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={key} variants={pageStagger} initial="initial" animate="animate" exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }} transition={SPRING_LAYOUT} className="space-y-3 sm:space-y-5">
          <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Panel title={tx("Réponse de /{key}", { key })} actions={<Switch checked={cur.reply.enabled} onChange={(v) => enable("reply", v)} label={tx("Réponse personnalisée")} />}>
              <Row label={tx("Visible par")}>
                <Segmented label={tx("Visible par")} value={cur.reply.visibility} options={[["all", "Tout le salon"], ["mod", "Le modérateur seul"]]} onChange={(v) => setPair({ reply: { visibility: v } })} />
              </Row>
              <Row label={tx("Supprimer la réponse")}>
                <Select value={cur.reply.deleteAfterSeconds} aria-label={tx("Supprimer la réponse")} options={[[0, "Jamais"], [5, "Après 5 secondes"], [10, "Après 10 secondes"], [30, "Après 30 secondes"], [60, "Après 1 minute"], [300, "Après 5 minutes"]]} onChange={(v) => setPair({ reply: { deleteAfterSeconds: v } })} />
              </Row>
              <Editor t={cur.reply} onChange={(p) => setPair({ reply: p })} />
            </Panel>
            <Panel title={tx("Aperçu")} className="lg:sticky lg:top-4" actions={<button type="button" onClick={() => resetPair("reply")} className="flex items-center gap-1 text-xs font-semibold text-[var(--danger)]"><RotateCcw className="h-3.5 w-3.5" />{tx("Réinitialiser")}</button>}>
              <Preview t={cur.reply} original="Carte de sanction d'Etho (réponse d'origine)." />
            </Panel>
          </div>

          <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Panel title={tx("Message privé au membre")} subtitle={tx("Envoyé avant la sanction : un membre banni ou expulsé ne serait plus joignable. Le bouton d'appel s'ajoute tout seul.")} actions={<Switch checked={cur.dm.enabled} onChange={(v) => enable("dm", v)} label={tx("Message privé personnalisé")} />}>
              <Editor t={cur.dm} onChange={(p) => setPair({ dm: p })} />
            </Panel>
            <Panel title={tx("Aperçu")} className="lg:sticky lg:top-4" actions={<button type="button" onClick={() => resetPair("dm")} className="flex items-center gap-1 text-xs font-semibold text-[var(--danger)]"><RotateCcw className="h-3.5 w-3.5" />{tx("Réinitialiser")}</button>}>
              <Preview t={cur.dm} dm original="Message privé d'origine d'Etho, avec le numéro du dossier." />
            </Panel>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Panel
          title={tx("Autres messages privés")}
          subtitle={extra === "end" ? tx("Envoyé quand un mute ou un ban temporaire se termine, si les rappels de fin sont activés.") : tx("Envoyé au membre quand l'équipe décide de son appel.")}
          actions={<Switch checked={ex.enabled} onChange={(v) => setExtraTpl({ enabled: v, ...(v && !ex.title && !ex.text ? EXTRA_DEFAULTS[extra] : {}) })} label={tx("Message personnalisé")} />}
        >
          <div className="border-b border-[var(--panel-border)] px-5 py-3">
            <Segmented label={tx("Message")} value={extra} options={[["end", "Fin de sanction"], ["appealAccepted", "Appel accepté"], ["appealRefused", "Appel refusé"]]} onChange={setExtra} />
          </div>
          <Editor t={ex} onChange={setExtraTpl} />
        </Panel>
        <Panel title={tx("Aperçu")} className="lg:sticky lg:top-4">
          <Preview t={ex} dm original="Message d'origine d'Etho." />
        </Panel>
      </div>
    </ConsolePage>
  );
}
