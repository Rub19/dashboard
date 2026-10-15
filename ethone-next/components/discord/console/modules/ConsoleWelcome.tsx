"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Hash, RotateCcw, Send, ShieldCheck } from "lucide-react";
import ChannelPicker, { fetchGuildChannels, type ChannelOption } from "../../ChannelPicker";
import { useToast } from "@/components/ToastProvider";
import { confirmDialog } from "@/lib/confirmDialog";
import { useBotSessionUser } from "@/lib/hooks/useBotSessionUser";
import { SPRING_LAYOUT, SPRING_PILL } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { BOT_API_URL, ChannelAdder, Chip, ConsolePage, EmptyLine, Panel, Row, Segmented, Select, Stepper, Switch, useGuildApi } from "../kit";
import MessageEditor, { VarField } from "../welcome/MessageEditor";
import DiscordPreview, { type Viewer } from "../welcome/DiscordPreview";
import ImageEditor from "../welcome/ImageEditor";
import { DELETE_AFTER, formatOf, type CardImage, type ChannelMessage, type Config, type Format, type MessageCommon, type Meta } from "../welcome/types";

type Tab = "arrival" | "dm" | "leave" | "ghost" | "options";

const DEFAULT_CONTENT: Record<"arrival" | "dm" | "leave", Partial<MessageCommon>> = {
  arrival: {
    contentAbove: "",
    embed: { enabled: true, title: "Un nouveau membre !", url: "", description: "Bienvenue {user} sur **{server}**, tu es notre **{membercount.ordinal}** membre.", color: "#5865F2", authorName: "", authorIconUrl: null, footer: "", footerIconUrl: null, thumbnailUrl: null, imageUrl: null, showTimestamp: false, showThumbnail: false, fields: [], authorIcon: "none", thumbnail: "none", imageSource: "none", footerIcon: "none" },
    buttons: [],
  },
  dm: {
    contentAbove: "",
    embed: { enabled: true, title: "Bienvenue sur {server}", url: "", description: "Salut {displayname}, ravi de t'accueillir ! Prends le temps de lire le règlement.", color: "#5865F2", authorName: "", authorIconUrl: null, footer: "", footerIconUrl: null, thumbnailUrl: null, imageUrl: null, showTimestamp: false, showThumbnail: true, fields: [], authorIcon: "none", thumbnail: "server", imageSource: "none", footerIcon: "none" },
    buttons: [],
  },
  leave: {
    contentAbove: "",
    embed: { enabled: true, title: "Au revoir {displayname}", url: "", description: "**{username}** a quitté le serveur. Nous sommes maintenant **{membercount}**.", color: "#ED4245", authorName: "", authorIconUrl: null, footer: "", footerIconUrl: null, thumbnailUrl: null, imageUrl: null, showTimestamp: false, showThumbnail: true, fields: [], authorIcon: "none", thumbnail: "member", imageSource: "none", footerIcon: "none" },
    buttons: [],
  },
};

const FORMATS: ReadonlyArray<readonly [Format, string]> = [
  ["embed", "Embed"],
  ["container", "Container"],
  ["text", "Texte"],
];

/** Image rendue par le bot (500 ms après le dernier changement) : ce que Discord affichera vraiment. */
function useCardPreview(guildId: string, image: CardImage | null) {
  const [state, setState] = useState<{ url: string | null; loading: boolean; failed: boolean }>({ url: null, loading: false, failed: false });
  const key = image ? JSON.stringify(image) : "";
  useEffect(() => {
    if (!key || !BOT_API_URL) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await fetch(`${BOT_API_URL}/api/guilds/${guildId}/welcome/preview-card`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageConfig: JSON.parse(key) }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        const url = URL.createObjectURL(await res.blob());
        setState((s) => {
          if (s.url) URL.revokeObjectURL(s.url);
          return { url, loading: false, failed: false };
        });
      } catch {
        if (!ctrl.signal.aborted) setState((s) => ({ ...s, loading: false, failed: true }));
      }
    }, 500);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [guildId, key]);
  return key ? state : null;
}

function TabBar({ tab, onChange, dots }: { tab: Tab; onChange: (t: Tab) => void; dots: Partial<Record<Tab, boolean>> }) {
  const tabs: Array<[Tab, string]> = [
    ["arrival", "Arrivée"],
    ["dm", "Message privé"],
    ["leave", "Départ"],
    ["ghost", "Ghost ping"],
    ["options", "Options"],
  ];
  return (
    <div role="tablist" aria-label="Sections" className="inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] p-1 [scrollbar-width:none]">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={tab === id}
          onClick={() => onChange(id)}
          className={cn("relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors", tab === id ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}
        >
          {tab === id && <motion.span layoutId="welcome-tab" transition={SPRING_PILL} className="absolute inset-0 rounded-lg border border-[var(--panel-border)] bg-[var(--surface-hover)]" />}
          {id in dots && (
            <motion.span
              className="relative h-1.5 w-1.5 rounded-full"
              animate={{ backgroundColor: dots[id] ? "var(--success)" : "var(--text-muted)", scale: dots[id] ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.4 }}
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function PreviewPanel({ children, onReset, onTest, testing, testLabel = "Tester", hint }: { children: ReactNode; onReset: () => void; onTest: () => void; testing: boolean; testLabel?: string; hint: string }) {
  return (
    <Panel
      title="Aperçu"
      className="lg:sticky lg:top-4"
      actions={
        <div className="flex items-center gap-2">
          <button type="button" onClick={onReset} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10">
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {testing ? "Envoi…" : testLabel}
          </button>
        </div>
      }
    >
      <div className="p-4">{children}</div>
      <p className="px-4 pb-4 text-[11px] text-[var(--text-muted)]">{hint}</p>
    </Panel>
  );
}

/** Bienvenue et départs (format Keeper) : arrivée, message privé, départ, ghost ping et options. */
export default function ConsoleWelcome({ guildId }: { guildId: string }) {
  const api = useGuildApi(guildId);
  const { success } = useToast();
  const session = useBotSessionUser();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [tab, setTab] = useState<Tab>(() => {
    const t = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return (["arrival", "dm", "leave", "ghost", "options"] as const).find((x) => x === t) ?? "arrival";
  });
  const [saving, setSaving] = useState<"idle" | "pending" | "saved">("idle");
  const [testing, setTesting] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const latest = useRef<Config | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api<{ config: Config; meta: Meta }>("/welcome").then((r) => {
      if (!r) return;
      setCfg(r.config);
      setMeta(r.meta);
    });
    fetchGuildChannels(guildId).then(setChannels);
  }, [api, guildId]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const c = latest.current;
    if (!c) return;
    const r = await api<{ config: Config }>("/welcome", { method: "PATCH", json: { welcome: c.welcome, goodbye: c.goodbye, ghostPing: c.ghostPing, options: c.options } });
    setSaving(r ? "saved" : "idle");
  }, [api]);
  useEffect(() => () => void (timer.current !== undefined && flush()), [flush]);

  const edit = useCallback(
    (fn: (c: Config) => Config) => {
      setCfg((c) => {
        if (!c) return c;
        const next = fn(c);
        latest.current = next;
        return next;
      });
      setSaving("pending");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 700);
    },
    [flush]
  );

  const w = (patch: Partial<Config["welcome"]>) => edit((c) => ({ ...c, welcome: { ...c.welcome, ...patch } }));
  const dm = (patch: Partial<Config["welcome"]["dm"]>) => edit((c) => ({ ...c, welcome: { ...c.welcome, dm: { ...c.welcome.dm, ...patch } } }));
  const g = (patch: Partial<Config["goodbye"]>) => edit((c) => ({ ...c, goodbye: { ...c.goodbye, ...patch } }));
  const gp = (patch: Partial<Config["ghostPing"]>) => edit((c) => ({ ...c, ghostPing: { ...c.ghostPing, ...patch } }));
  const opt = (patch: Partial<Config["options"]>) => edit((c) => ({ ...c, options: { ...c.options, ...patch } }));
  const welcomeImg = useCallback((patch: Partial<CardImage>) => edit((c) => ({ ...c, welcome: { ...c.welcome, image: { ...c.welcome.image, ...patch } } })), [edit]);
  const goodbyeImg = useCallback((patch: Partial<CardImage>) => edit((c) => ({ ...c, goodbye: { ...c.goodbye, image: { ...c.goodbye.image, ...patch } } })), [edit]);

  const welcomeCard = useCardPreview(guildId, cfg && (cfg.welcome.image.enabled || cfg.welcome.dm.attachCard) ? cfg.welcome.image : null);
  const goodbyeCard = useCardPreview(guildId, cfg?.goodbye.image.enabled ? cfg.goodbye.image : null);

  const test = async (type: "welcome" | "goodbye" | "ghostping", target: "channel" | "dm" = "channel") => {
    if (timer.current !== undefined) await flush();
    setTesting(`${type}:${target}`);
    const r = await api<{ channelName?: string; note?: string }>("/welcome/test", { method: "POST", json: { type, target } });
    setTesting(null);
    if (r) success("Test envoyé", target === "dm" ? "Regarde tes messages privés." : r.channelName ? `Dans #${r.channelName}.` : r.note ?? "Sur Discord.");
  };
  const reset = async (kind: "arrival" | "dm" | "leave") => {
    if (!(await confirmDialog("Remettre le contenu par défaut ? Le texte, l'embed, les champs et les boutons de ce message seront remplacés.", { title: "Réinitialiser", confirmLabel: "Réinitialiser" }))) return;
    const d = DEFAULT_CONTENT[kind];
    if (kind === "arrival") w(d as Partial<Config["welcome"]>);
    else if (kind === "dm") dm(d);
    else g(d as Partial<Config["goodbye"]>);
  };

  if (!cfg || !meta)
    return (
      <ConsolePage title="Bienvenue et départs">
        <Panel>
          <EmptyLine>Chargement…</EmptyLine>
        </Panel>
      </ConsolePage>
    );

  const viewer: Viewer = { id: session?.id ?? "0", name: session?.globalName || session?.username || "Toi", username: session?.username ?? "toi", avatar: session?.avatarUrl ?? null };
  const previews = { server: meta.guildIcon, member: viewer.avatar };
  const { welcome, goodbye, ghostPing, options } = cfg;

  const channelSettings = (m: ChannelMessage, set: (p: Partial<ChannelMessage>) => void, label: string) => (
    <Panel title={label} actions={<Switch checked={m.enabled} onChange={(v) => set({ enabled: v })} label={label} />}>
      <div className={cn("transition-opacity duration-300", !m.enabled && "opacity-60")}>
        <Row label="Salon">
          <ChannelPicker guildId={guildId} value={m.channelId ?? ""} filterTypes={[0, 5]} allowClear={false} placeholder="Choisir un salon" onChange={(id) => set({ channelId: id })} />
        </Row>
        <Row label="Format" hint="Le container (Components V2) affiche le message en carte moderne.">
          <Segmented label="Format" value={formatOf(m)} options={FORMATS} onChange={(v) => set({ format: v, embed: { ...m.embed, enabled: v !== "text" } })} />
        </Row>
        <Row label="Image personnalisée" hint="Une image générée avec l'avatar du membre.">
          <Switch checked={m.image.enabled} onChange={(v) => set({ image: { ...m.image, enabled: v } })} label="Image personnalisée" />
        </Row>
        <Row label="Auteur du message" hint={meta.canWebhook ? "Au nom du serveur : publié avec le nom et l'icône du serveur." : "Etho a besoin de la permission « Gérer les webhooks » pour publier au nom du serveur."}>
          <Segmented
            label="Auteur du message"
            value={m.asServer ? "server" : "etho"}
            disabled={!meta.canWebhook && !m.asServer}
            options={[
              ["etho", meta.botName],
              ["server", "Le serveur"],
            ]}
            onChange={(v) => set({ asServer: v === "server" })}
          />
        </Row>
        <Row label="Mentionner le membre" hint="Le membre reçoit une notification.">
          <Switch checked={m.mentionUser} onChange={(v) => set({ mentionUser: v })} label="Mentionner le membre" />
        </Row>
        <Row label="Notifier les rôles mentionnés" hint="Sinon, les rôles cités dans le texte ne reçoivent pas de notification.">
          <Switch checked={m.notifyRoles} onChange={(v) => set({ notifyRoles: v })} label="Notifier les rôles mentionnés" />
        </Row>
        <Row label="Suppression automatique">
          <Select value={m.deleteAfterSeconds} options={DELETE_AFTER} onChange={(v) => set({ deleteAfterSeconds: v })} aria-label="Suppression automatique" />
        </Row>
      </div>
    </Panel>
  );

  const editorBlock = (
    kind: "arrival" | "dm" | "leave",
    message: MessageCommon & { mentionUser?: boolean; asServer?: boolean },
    set: (p: Partial<MessageCommon>) => void,
    imageOn: boolean,
    onImage: (v: boolean) => void,
    card: ReturnType<typeof useCardPreview>,
    onTest: () => void,
    testKey: string,
    hint: string
  ) => (
    <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <Panel title="Contenu">
        <MessageEditor guildId={guildId} message={message} onChange={set} dm={kind === "dm"} imageOn={imageOn} onImageToggle={onImage} previews={previews} />
      </Panel>
      <PreviewPanel onReset={() => reset(kind)} onTest={onTest} testing={testing === testKey} hint={hint}>
        <DiscordPreview message={message} meta={meta} viewer={viewer} dm={kind === "dm"} card={imageOn ? card : null} />
      </PreviewPanel>
    </div>
  );

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? id;

  return (
    <ConsolePage
      title={
        <span className="block">
          Bienvenue et départs
          <span className="mt-1 block max-w-xl text-sm font-normal tracking-normal text-[var(--text-muted)]">Accueille les nouveaux membres et annonce les départs, avec une image à l&apos;image du serveur.</span>
        </span>
      }
      actions={<span className="self-start text-xs text-[var(--text-muted)]">{saving === "pending" ? "Enregistrement…" : saving === "saved" ? "Enregistré" : ""}</span>}
    >
      <div className="space-y-3 sm:space-y-5">
        <TabBar tab={tab} onChange={setTab} dots={{ arrival: welcome.enabled, dm: welcome.dm.enabled, leave: goodbye.enabled, ghost: ghostPing.enabled }} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }} transition={SPRING_LAYOUT} className="space-y-3 sm:space-y-5">
            {tab === "arrival" && (
              <>
                {channelSettings(welcome, (p) => w(p as Partial<Config["welcome"]>), "Arrivée")}
                {editorBlock("arrival", welcome, (p) => w(p as Partial<Config["welcome"]>), welcome.image.enabled, (v) => welcomeImg({ enabled: v }), welcomeCard, () => test("welcome"), "welcome:channel", "Toi dans le rôle du nouveau membre. Le test part dans le salon choisi, sans notifier personne d'autre.")}
                <AnimatePresence initial={false}>
                  {welcome.image.enabled && (
                    <motion.div key="img" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={SPRING_LAYOUT}>
                      <Panel title="Image personnalisée">
                        <ImageEditor guildId={guildId} image={welcome.image} onChange={welcomeImg} viewer={viewer} meta={meta} />
                      </Panel>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {tab === "dm" && (
              <>
                <Panel title="Message privé" actions={<Switch checked={welcome.dm.enabled} onChange={(v) => dm({ enabled: v })} label="Message privé" />}>
                  <div className={cn("transition-opacity duration-300", !welcome.dm.enabled && "opacity-60")}>
                    <Row label="Format">
                      <Segmented label="Format" value={formatOf(welcome.dm)} options={FORMATS} onChange={(v) => dm({ format: v, embed: { ...welcome.dm.embed, enabled: v !== "text" } })} />
                    </Row>
                    <Row label="Image personnalisée" hint="Joint l'image de l'onglet Arrivée.">
                      <Switch checked={welcome.dm.attachCard} onChange={(v) => dm({ attachCard: v })} label="Image personnalisée" />
                    </Row>
                  </div>
                </Panel>
                {editorBlock("dm", welcome.dm, (p) => dm(p), welcome.dm.attachCard, (v) => dm({ attachCard: v }), welcomeCard, () => test("welcome", "dm"), "welcome:dm", "Toi dans le rôle du nouveau membre. Le test arrive dans tes messages privés.")}
              </>
            )}

            {tab === "leave" && (
              <>
                {channelSettings(goodbye, (p) => g(p), "Départ")}
                {editorBlock("leave", goodbye, (p) => g(p as Partial<Config["goodbye"]>), goodbye.image.enabled, (v) => goodbyeImg({ enabled: v }), goodbyeCard, () => test("goodbye"), "goodbye:channel", "Toi dans le rôle du membre qui part. Le test part dans le salon choisi, sans notifier personne d'autre.")}
                <AnimatePresence initial={false}>
                  {goodbye.image.enabled && (
                    <motion.div key="img" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={SPRING_LAYOUT}>
                      <Panel title="Image personnalisée">
                        <ImageEditor guildId={guildId} image={goodbye.image} onChange={goodbyeImg} viewer={viewer} meta={meta} goodbye />
                      </Panel>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {tab === "ghost" && (
              <Panel title="Ghost ping" actions={<Switch checked={ghostPing.enabled} onChange={(v) => gp({ enabled: v })} label="Ghost ping" />}>
                <div className={cn("transition-opacity duration-300", !ghostPing.enabled && "opacity-60")}>
                  <Row label="Salons" hint="Le nouveau membre y est mentionné, puis le message disparaît : il voit une notification qui l'amène au bon endroit.">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AnimatePresence initial={false}>
                        {ghostPing.channelIds.map((id) => (
                          <motion.span key={id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING_PILL}>
                            <Chip label={channelName(id)} onRemove={() => gp({ channelIds: ghostPing.channelIds.filter((x) => x !== id) })}>
                              <Hash className="h-3 w-3 text-[var(--text-muted)]" />
                            </Chip>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      {ghostPing.channelIds.length < 10 && <ChannelAdder guildId={guildId} label="Ajouter un salon" excludeIds={ghostPing.channelIds} onPick={(c) => gp({ channelIds: [...ghostPing.channelIds, c.id] })} />}
                    </div>
                  </Row>
                  <Row label="Texte">
                    <VarField label="Texte du ghost ping" value={ghostPing.text} max={500} onChange={(v) => gp({ text: v || "{user}" })} />
                  </Row>
                  <Row label="Suppression">
                    <Select
                      value={ghostPing.deleteAfterSeconds}
                      aria-label="Suppression du ghost ping"
                      options={[
                        [0, "Immédiate"],
                        [1, "Après 1 seconde"],
                        [3, "Après 3 secondes"],
                        [5, "Après 5 secondes"],
                        [10, "Après 10 secondes"],
                        [30, "Après 30 secondes"],
                        [60, "Après 1 minute"],
                      ]}
                      onChange={(v) => gp({ deleteAfterSeconds: v })}
                    />
                  </Row>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--panel-border)] px-5 py-3.5">
                    <p className="text-xs text-[var(--text-muted)]">Suit l&apos;option « Attendre la vérification ». Le ghost ping ne vise jamais {meta.botName}.</p>
                    <button
                      type="button"
                      onClick={() => test("ghostping")}
                      disabled={testing !== null || !ghostPing.channelIds.length}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-black transition-[filter,transform] hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {testing === "ghostping:channel" ? "Envoi…" : "Tester"}
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {tab === "options" && (
              <Panel title="Options">
                <Row label="Attendre la vérification" hint="L'accueil part quand le membre a accepté les règles du serveur, pas avant.">
                  <Switch checked={options.waitVerification} onChange={(v) => opt({ waitVerification: v })} label="Attendre la vérification" />
                </Row>
                <Row label="Ignorer les bots" hint="Aucun accueil ni départ pour les bots ajoutés ou retirés.">
                  <Switch checked={options.ignoreBots} onChange={(v) => opt({ ignoreBots: v })} label="Ignorer les bots" />
                </Row>
                <Row label="Départ rapide" hint="Quand un membre repart dans les 10 minutes qui suivent son arrivée.">
                  <Select
                    value={options.quickLeave}
                    aria-label="Départ rapide"
                    options={[
                      ["keep", "Bienvenue gardée"],
                      ["delete", "Bienvenue supprimée"],
                      ["deleteSilent", "Bienvenue supprimée, sans départ"],
                    ]}
                    onChange={(v) => opt({ quickLeave: v })}
                  />
                </Row>
                <Row label="Ignorer les comptes récents" hint="Pas d'accueil pour un compte Discord plus jeune. 0 : désactivé.">
                  <Stepper
                    value={welcome.conditions.enabled ? welcome.conditions.minAccountAgeDays : 0}
                    min={0}
                    max={365}
                    unit="jours"
                    onCommit={(n) => w({ conditions: { ...welcome.conditions, enabled: n > 0, minAccountAgeDays: n } })}
                  />
                </Row>
                <p className="flex items-start gap-2 border-t border-[var(--panel-border)] px-5 py-3.5 text-xs text-[var(--text-muted)]">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
                  {meta.botName} n&apos;accueille jamais un compte que la protection retire (blacklist, anti-alt, raidmode) et limite à 10 messages d&apos;accueil par minute pendant une vague d&apos;arrivées.
                </p>
              </Panel>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ConsolePage>
  );
}
