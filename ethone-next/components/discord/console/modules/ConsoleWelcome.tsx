"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, Loader2 } from "lucide-react";
import ChannelPicker from "../../ChannelPicker";
import { CARD_DEFAULTS, type CardImageConfig } from "@/components/discord/WelcomeCardDesigner";
import { useToast } from "@/components/ToastProvider";
import { pageStagger } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ConsolePage, EmptyLine, GhostButton, Panel, RoleChips, Row, Segmented, StatTile, Stepper, Switch, useGuildApi } from "../kit";

type Embed = { enabled: boolean; title: string; description: string; color: string; [k: string]: unknown };
type Welcome = {
  enabled: boolean;
  channelId: string | null;
  messageContent: string;
  mentionUser: boolean;
  sendForBots: boolean;
  embed: Embed;
  image: CardImageConfig;
  dm: { enabled: boolean; attachCard: boolean; messageContent: string; embed: Embed; [k: string]: unknown };
  conditions: { enabled: boolean; minAccountAgeDays: number; [k: string]: unknown };
  autoRoleIds: string[];
  [k: string]: unknown;
};
type Goodbye = { enabled: boolean; channelId: string | null; messageContent: string; sendForBots: boolean; embed: Embed; image: CardImageConfig; [k: string]: unknown };
type Config = { welcome: Welcome; goodbye: Goodbye };
type Overview = { newMembersToday: number; welcomeMessagesToday: number; rolesDistributedToday: number; dmDeliveryRate: string };

const input = "w-full rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]/70";
const VARS = "{user}, {username}, {displayname}, {server}, {membercount}, {accountage}";
const TEMPLATES = [
  ["default", "Classique"],
  ["modern", "Centré"],
  ["minimal", "Minimal"],
  ["gaming", "Gaming"],
] as const;
const FONTS = [
  ["poppins", "Poppins"],
  ["bebas", "Bebas"],
  ["serif", "Serif"],
  ["mono", "Mono"],
] as const;
const SHAPES = [
  ["circle", "Rond"],
  ["rounded", "Arrondi"],
  ["square", "Carré"],
] as const;

function Text({ value, onChange, rows, max = 2000, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; max?: number; placeholder?: string }) {
  return rows ? (
    <textarea value={value} rows={rows} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(input, "py-2")} />
  ) : (
    <input value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(input, "h-9")} />
  );
}

function Color({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#10b981"} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={label} className="h-8 w-10 cursor-pointer rounded-md border border-[var(--panel-border)] bg-transparent" />
      {label}
    </label>
  );
}

/** Lignes « embed » communes à l'accueil, au message privé et au départ. */
function EmbedRows({ embed, onChange }: { embed: Embed; onChange: (patch: Partial<Embed>) => void }) {
  return (
    <>
      <Row label="Encadré (embed)" hint="Sinon, message en texte simple.">
        <Switch checked={embed.enabled} onChange={(v) => onChange({ enabled: v })} label="Encadré" />
      </Row>
      <AnimatePresence initial={false}>
        {embed.enabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Row label="Titre">
              <Text value={embed.title} max={256} onChange={(v) => onChange({ title: v })} />
            </Row>
            <Row label="Description" hint={VARS}>
              <Text value={embed.description} rows={3} max={4000} onChange={(v) => onChange({ description: v })} />
            </Row>
            <Row label="Couleur">
              <Color value={embed.color} label={embed.color} onChange={(v) => onChange({ color: v })} />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Aperçu réel de la carte, généré par le bot 500 ms après le dernier changement. */
function CardPreview({ guildId, image }: { guildId: string; image: CardImageConfig }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify(image);
  useEffect(() => {
    if (!BOT_API_URL) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/welcome/preview-card`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageConfig: JSON.parse(key) }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        const next = URL.createObjectURL(await res.blob());
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return next;
        });
        setFailed(false);
      } catch {
        if (!ctrl.signal.aborted) setFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [guildId, key]);
  useEffect(
    () => () =>
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      }),
    []
  );
  return (
    <div className="relative overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--surface-base,var(--bg-main))]" style={{ aspectRatio: "8 / 3" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Aperçu de la carte" className={cn("h-full w-full object-cover transition-opacity", loading && "opacity-70")} />
      ) : (
        <div className="grid h-full place-items-center text-xs text-[var(--text-muted)]">
          <span className="flex flex-col items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {failed ? "Aperçu indisponible : le bot ne répond pas." : "Génération de l'aperçu…"}
          </span>
        </div>
      )}
      {loading && url && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-white/80" />}
    </div>
  );
}

/** Bienvenue (format Keeper) : message d'accueil, carte, message privé, rôles donnés à l'arrivée et message de départ. */
export default function ConsoleWelcome({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [ov, setOv] = useState<Overview | null>(null);
  const [cardKind, setCardKind] = useState<"welcome" | "goodbye">("welcome");
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const [testing, setTesting] = useState<string | null>(null);
  const latest = useRef<Config | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api<{ config: Config }>("/welcome").then((r) => r && setCfg(r.config));
    api<Overview>("/welcome/overview", { silent: true }).then((r) => r && setOv(r));
  }, [api]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const c = latest.current;
    if (!c) return;
    const r = await api("/welcome", { method: "PATCH", json: { welcome: c.welcome, goodbye: c.goodbye } });
    setSaving(r ? "saved" : "idle");
  }, [api]);
  // Enregistre ce qui reste en attente quand on quitte la page.
  useEffect(() => () => void (timer.current !== undefined && flush()), [flush]);

  /** Modifie la config localement puis enregistre 700 ms après la dernière frappe. */
  const edit = (fn: (c: Config) => Config) => {
    setCfg((c) => {
      if (!c) return c;
      const next = fn(c);
      latest.current = next;
      return next;
    });
    setSaving("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 700);
  };
  const w = (patch: Partial<Welcome>) => edit((c) => ({ ...c, welcome: { ...c.welcome, ...patch } }));
  const g = (patch: Partial<Goodbye>) => edit((c) => ({ ...c, goodbye: { ...c.goodbye, ...patch } }));
  const img = (patch: Partial<CardImageConfig>) => edit((c) => ({ ...c, [cardKind]: { ...c[cardKind], image: { ...CARD_DEFAULTS, ...c[cardKind].image, ...patch } } }));

  const test = async (type: "welcome" | "goodbye", target: "channel" | "dm") => {
    if (timer.current !== undefined) await flush();
    setTesting(`${type}:${target}`);
    const r = await api<{ channelName?: string }>("/welcome/test", { method: "POST", json: { type, target } });
    setTesting(null);
    if (r) success("Test envoyé", target === "dm" ? "Regarde tes messages privés." : r.channelName ? `Dans #${r.channelName}.` : "Sur Discord.");
  };

  if (!cfg)
    return (
      <ConsolePage title="Bienvenue">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );

  const { welcome, goodbye } = cfg;
  const card: CardImageConfig = { ...CARD_DEFAULTS, ...cfg[cardKind].image };
  const minAge = welcome.conditions.enabled ? welcome.conditions.minAccountAgeDays : 0;

  return (
    <ConsolePage title="Bienvenue" actions={<span className="text-xs text-[var(--text-muted)]">{saving === "pending" ? "Enregistrement…" : saving === "saved" ? "Enregistré" : ""}</span>}>
      <motion.div variants={pageStagger} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Arrivées aujourd'hui" value={ov?.newMembersToday ?? "—"} />
        <StatTile label="Messages envoyés" value={ov?.welcomeMessagesToday ?? "—"} />
        <StatTile label="Rôles donnés" value={ov?.rolesDistributedToday ?? "—"} />
        <StatTile label="MP délivrés" value={ov?.dmDeliveryRate ?? "—"} />
      </motion.div>

      <Panel
        title="Message d'accueil"
        actions={
          <div className="flex items-center gap-2">
            {welcome.enabled && welcome.channelId && (
              <GhostButton onClick={() => test("welcome", "channel")} disabled={testing !== null}>
                {testing === "welcome:channel" ? "Envoi…" : "Tester"}
              </GhostButton>
            )}
            <Switch checked={welcome.enabled} onChange={(v) => w({ enabled: v })} label="Message d'accueil" />
          </div>
        }
      >
        <div className={cn("transition-opacity", !welcome.enabled && "pointer-events-none opacity-50")}>
          <Row label="Salon">
            <ChannelPicker guildId={guildId} value={welcome.channelId ?? ""} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => w({ channelId: id })} />
          </Row>
          <EmbedRows embed={welcome.embed} onChange={(p) => w({ embed: { ...welcome.embed, ...p } })} />
          {welcome.embed.enabled ? (
            <Row label="Mentionner le membre" hint="Une mention dans l'encadré ne notifie pas.">
              <Switch checked={welcome.mentionUser} onChange={(v) => w({ mentionUser: v })} label="Mentionner le membre" />
            </Row>
          ) : (
            <Row label="Message" hint={VARS}>
              <Text value={welcome.messageContent} rows={3} onChange={(v) => w({ messageContent: v })} />
            </Row>
          )}
          <Row label="Accueillir aussi les bots">
            <Switch checked={welcome.sendForBots} onChange={(v) => w({ sendForBots: v })} label="Accueillir les bots" />
          </Row>
        </div>
      </Panel>

      <Panel
        title="Carte"
        subtitle="L'image jointe au message."
        actions={
          <Segmented
            label="Carte"
            value={cardKind}
            options={[
              ["welcome", "Accueil"],
              ["goodbye", "Départ"],
            ]}
            onChange={setCardKind}
          />
        }
      >
        <Row label="Joindre la carte">
          <Switch checked={card.enabled} onChange={(v) => img({ enabled: v })} label="Joindre la carte" />
        </Row>
        <AnimatePresence initial={false}>
          {card.enabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-[var(--panel-border)] px-5 py-4">
                <CardPreview guildId={guildId} image={card} />
              </div>
              <Row label="Mise en page">
                <Segmented label="Mise en page" value={card.template} options={TEMPLATES} onChange={(v) => img({ template: v })} />
              </Row>
              <Row label="Ligne du haut">
                <Text value={card.titleText} max={60} onChange={(v) => img({ titleText: v })} />
              </Row>
              <Row label="Ligne principale" hint="{displayname}, {username}, {server}, {membercount}.">
                <Text value={card.subtitleText} max={80} onChange={(v) => img({ subtitleText: v })} />
              </Row>
              <Row label="Ligne secondaire">
                <Text value={card.tagText} max={120} onChange={(v) => img({ tagText: v })} />
              </Row>
              <Row label="Couleurs">
                <div className="flex flex-wrap gap-4">
                  <Color label="Accent" value={card.accentColor} onChange={(v) => img({ accentColor: v })} />
                  <Color label="Fond" value={card.backgroundColor} onChange={(v) => img({ backgroundColor: v })} />
                  <Color label="Texte" value={card.textColor} onChange={(v) => img({ textColor: v })} />
                </div>
              </Row>
              <Row label="Police">
                <Segmented label="Police" value={card.font} options={FONTS} onChange={(v) => img({ font: v })} />
              </Row>
              <Row label="Avatar">
                <Segmented label="Avatar" value={card.avatarShape} options={SHAPES} onChange={(v) => img({ avatarShape: v })} />
              </Row>
              <Row label="Image de fond" hint="Lien https direct. Vide : fond uni.">
                <BackgroundField value={card.customBackgroundUrl} onCommit={(v) => img({ customBackgroundUrl: v })} />
              </Row>
              {card.customBackgroundUrl ? (
                <Row label="Voile sur l'image" hint="Pour garder le texte lisible.">
                  <Stepper value={card.overlayOpacity} min={0} max={90} step={5} unit="%" onCommit={(n) => img({ overlayOpacity: n })} />
                </Row>
              ) : (
                <Row label="Carte animée" hint="GIF en boucle.">
                  <Switch checked={card.animated} onChange={(v) => img({ animated: v })} label="Carte animée" />
                </Row>
              )}
              <Row label="Nom du serveur">
                <Switch checked={card.showServerName} onChange={(v) => img({ showServerName: v })} label="Afficher le nom du serveur" />
              </Row>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <Panel title="À l'arrivée">
        <Row label="Rôles donnés" hint="À chaque nouveau membre.">
          <RoleChips guildId={guildId} ids={welcome.autoRoleIds} onChange={(ids) => w({ autoRoleIds: ids })} />
        </Row>
        <Row label="Ignorer les comptes récents" hint="Pas de message pour un compte Discord plus jeune. 0 : désactivé.">
          <Stepper value={minAge} min={0} max={365} unit="jours" onCommit={(n) => w({ conditions: { ...welcome.conditions, enabled: n > 0, minAccountAgeDays: n } })} />
        </Row>
      </Panel>

      <Panel
        title="Message privé"
        subtitle="Envoyé au nouveau membre, en plus du message d'accueil."
        actions={
          <div className="flex items-center gap-2">
            {welcome.dm.enabled && (
              <GhostButton onClick={() => test("welcome", "dm")} disabled={testing !== null}>
                {testing === "welcome:dm" ? "Envoi…" : "Tester"}
              </GhostButton>
            )}
            <Switch checked={welcome.dm.enabled} onChange={(v) => w({ dm: { ...welcome.dm, enabled: v } })} label="Message privé" />
          </div>
        }
      >
        <div className={cn("transition-opacity", !welcome.dm.enabled && "pointer-events-none opacity-50")}>
          <Row label="Message" hint={VARS}>
            <Text value={welcome.dm.messageContent} rows={2} onChange={(v) => w({ dm: { ...welcome.dm, messageContent: v } })} />
          </Row>
          <EmbedRows embed={welcome.dm.embed} onChange={(p) => w({ dm: { ...welcome.dm, embed: { ...welcome.dm.embed, ...p } } })} />
          <Row label="Joindre la carte d'accueil">
            <Switch checked={welcome.dm.attachCard} onChange={(v) => w({ dm: { ...welcome.dm, attachCard: v } })} label="Joindre la carte" />
          </Row>
        </div>
      </Panel>

      <Panel
        title="Message de départ"
        actions={
          <div className="flex items-center gap-2">
            {goodbye.enabled && goodbye.channelId && (
              <GhostButton onClick={() => test("goodbye", "channel")} disabled={testing !== null}>
                {testing === "goodbye:channel" ? "Envoi…" : "Tester"}
              </GhostButton>
            )}
            <Switch checked={goodbye.enabled} onChange={(v) => g({ enabled: v })} label="Message de départ" />
          </div>
        }
      >
        <div className={cn("transition-opacity", !goodbye.enabled && "pointer-events-none opacity-50")}>
          <Row label="Salon">
            <ChannelPicker guildId={guildId} value={goodbye.channelId ?? ""} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => g({ channelId: id })} />
          </Row>
          <EmbedRows embed={goodbye.embed} onChange={(p) => g({ embed: { ...goodbye.embed, ...p } })} />
          {!goodbye.embed.enabled && (
            <Row label="Message" hint="{username}, {server}, {membercount}.">
              <Text value={goodbye.messageContent} rows={2} onChange={(v) => g({ messageContent: v })} />
            </Row>
          )}
          <Row label="Aussi pour les bots">
            <Switch checked={goodbye.sendForBots} onChange={(v) => g({ sendForBots: v })} label="Départ des bots" />
          </Row>
        </div>
      </Panel>
    </ConsolePage>
  );
}

function BackgroundField({ value, onCommit }: { value: string | null; onCommit: (v: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const valid = !draft.trim() || /^https:\/\/\S+$/i.test(draft.trim());
  return (
    <div>
      <input
        value={draft}
        placeholder="https://…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => valid && (draft.trim() || null) !== value && onCommit(draft.trim() || null)}
        className={cn(input, "h-9", !valid && "border-[var(--danger)]")}
      />
      {!valid && <p className="mt-1 text-[11px] text-[var(--danger)]">Le lien doit commencer par https://</p>}
    </div>
  );
}
