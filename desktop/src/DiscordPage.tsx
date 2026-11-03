import { useEffect, useMemo, useState } from "react";
import { usePersisted } from "./qol";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Search } from "lucide-react";
import { botCached, botCall, botLogin, botLogout, botStatus } from "./api";
import { CreateButtons, DISCORD_CREATORS } from "./DiscordCreate";
import { CUSTOM_DISCORD_PAGES } from "./DiscordPages";
import { DISCORD_GROUPS, DISCORD_MODULES as SPEC_MODULES, DiscordModule } from "./discordSpecs";
import { ConfigForm, Directory, factsOf, firstArray, flattenEntries, humanize, Json, JsonList, displayValue, unwrapConfig } from "./generic";
import { errorText, tr } from "./i18n";
import { Empty, ErrorBox, Skeletons, Stagger, StaggerItem, staggerItem, Status, Tabs, useLoad } from "./kit";
import { stepEnter } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

interface Guild { id: string; name: string; icon?: string | null; botPresent?: boolean; owner?: boolean }
const GUILD_KEY = "ethone-discord-guild";
const [MODERATION, COMMUNITY, , , MEDIA] = DISCORD_GROUPS;
const CUSTOM_MODULES: DiscordModule[] = [
  { id: "moderation", title: "Modération et sanctions", group: MODERATION, overview: null, lists: [
    { title: "Sanctions", path: "/cases", key: "cases", idKey: "caseNumber", rowActions: [{ title: "Annuler la sanction", path: "/cases/{id}/revert", destructive: true }] },
    { title: "Bannis", path: "/bans", key: "bans", idKey: "userId", rowActions: [{ title: "Débannir", path: "/unban", destructive: true, idBody: "userId", body: { reason: "Débanni depuis Ethone" } }] },
  ] },
  { id: "members", title: "Membres", group: MODERATION, base: "guilds/{g}/server", overview: null, lists: [{ title: "Membres", path: "/members" }] },
  { id: "anti-raid", title: "Anti-raid", group: MODERATION, overview: null,
    configs: [{ title: "Réglages", get: "/config", put: "/config" }],
    actions: [
      { title: "Activer le mode raid", path: "/raid-mode", body: { active: true, reason: "Action depuis Ethone" } },
      { title: "Désactiver le mode raid", path: "/raid-mode", body: { active: false, reason: "Action depuis Ethone" } },
      { title: "Verrouiller le serveur", path: "/lockdown", destructive: true, body: { active: true, reason: "Action depuis Ethone" } },
      { title: "Déverrouiller le serveur", path: "/lockdown", body: { active: false, reason: "Action depuis Ethone" } },
    ] },
  { id: "anti-nuke", title: "Anti-nuke", group: MODERATION, overview: null, configs: [{ title: "Réglages", get: "/config", put: "/config" }] },
  { id: "audit-log", title: "Journal d'audit", group: MODERATION, base: "guilds/{g}/logs", overview: null, lists: [{ title: "Événements", path: "/events" }] },
  { id: "tickets", title: "Tickets", group: COMMUNITY, overview: null, lists: [{ title: "Tickets", path: "/list", rowActions: [{ title: "Fermer", path: "/tickets/{id}/close", destructive: true, body: { closedBy: "Ethone", reason: "Fermé depuis Ethone" } }] }] },
  { id: "giveaways", title: "Concours", group: COMMUNITY, overview: null, lists: [{ title: "Concours", path: "/list", rowActions: [
    { title: "Terminer", path: "/{id}/end", destructive: true },
    { title: "Retirer un gagnant", path: "/{id}/reroll" },
    { title: "Annuler", path: "/{id}/cancel", destructive: true },
  ] }] },
  { id: "suggestions", title: "Suggestions", group: COMMUNITY, overview: null, lists: [{ title: "Suggestions", path: "/list", rowActions: [
    { title: "Accepter", path: "/{id}/status", body: { status: "accepted" } },
    { title: "Refuser", path: "/{id}/status", destructive: true, body: { status: "rejected" } },
  ] }] },
  { id: "music", title: "Musique", group: MEDIA, overview: "/state", actions: [
    { title: "Pause", path: "/pause" }, { title: "Reprendre", path: "/resume" }, { title: "Suivant", path: "/skip" }, { title: "Précédent", path: "/previous" }, { title: "Mélanger", path: "/shuffle" }, { title: "Arrêter", path: "/stop", destructive: true },
  ] },
];
const DISCORD_MODULES = [...CUSTOM_MODULES, ...SPEC_MODULES.filter((item) => !CUSTOM_MODULES.some((custom) => custom.id === item.id))];

function moduleUrl(spec: DiscordModule, guild: string, sub: string): string {
  const root = (spec.base ?? `guilds/{g}/${spec.id}`).replace("{g}", guild);
  return `api/${root}${sub === "/" ? "" : sub}`;
}

function ConfigSection({ spec, guild, index, directory }: { spec: DiscordModule; guild: string; index: number; directory?: Directory }) {
  const config = spec.configs![index];
  const state = useLoad(() => botCall<Json>(moduleUrl(spec, guild, config.get)), [spec.id, guild, config.get]);
  return (
    <section className="discord-pane">
      <Status state={state} height={120}>
        {(data) => {
          const { body, wrapper } = unwrapConfig(data);
          return <ConfigForm value={body} directory={directory} onSave={async (next) => {
            const method = (config.method ?? "PUT") as "PUT" | "PATCH" | "POST";
            await botCall(moduleUrl(spec, guild, config.put), method, config.strict && wrapper ? { [wrapper]: next } : next);
            state.reload();
          }} />;
        }}
      </Status>
    </section>
  );
}

function ListSection({ spec, guild, index }: { spec: DiscordModule; guild: string; index: number }) {
  const list = spec.lists![index];
  const state = useLoad(() => botCall<Json>(moduleUrl(spec, guild, list.path)), [spec.id, guild, list.path]);
  const actions = (list.rowActions ?? []).map((action) => ({
    title: action.title,
    destructive: action.destructive,
    prompt: action.textPrompt,
    run: (row: Json, text?: string) => {
      const record = row && typeof row === "object" && !Array.isArray(row) ? row : {};
      const id = String(record[list.idKey ?? "id"] ?? "");
      return botCall(moduleUrl(spec, guild, action.path.replace("{id}", encodeURIComponent(id))), (action.method ?? "POST") as "POST" | "PATCH" | "DELETE" | "PUT", action.method === "DELETE" ? undefined : { ...action.body, ...(action.idBody ? { [action.idBody]: id } : {}), ...(action.textPrompt ? { [action.textPromptKey ?? "name"]: text } : {}) });
    },
  }));
  return (
    <section className="discord-pane">
      <Status state={state}>{(data) => <JsonList rows={firstArray(data, list.key)} actions={actions} onChanged={state.reload} emptyTitle={tr("Liste vide", "Empty list")} />}</Status>
    </section>
  );
}

function ActionButtons({ spec, guild }: { spec: DiscordModule; guild: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const run = async (action: NonNullable<DiscordModule["actions"]>[number]) => {
    setBusy(action.title);
    setMessage(null);
    try {
      await botCall(moduleUrl(spec, guild, action.path), (action.method ?? "POST") as "POST", action.body ?? {});
      setMessage({ text: tr("Action effectuée.", "Done."), ok: true });
      setConfirm(null);
    } catch (reason) {
      setMessage({ text: errorText(reason), ok: false });
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="discord-actions">
      <div className="row">
        {spec.actions?.map((action) => confirm === action.title ? (
          <span key={action.title} className="row">
            <span className="bad">{action.title} ?</span>
            <Button onClick={() => setConfirm(null)}>{tr("Annuler", "Cancel")}</Button>
            <Button className="danger" disabled={Boolean(busy)} onClick={() => void run(action)}>{tr("Confirmer", "Confirm")}</Button>
          </span>
        ) : (
          <Button key={action.title} disabled={Boolean(busy)} className={action.destructive ? "danger" : ""} onClick={() => (action.destructive ? setConfirm(action.title) : void run(action))}>{action.title}</Button>
        ))}
      </div>
      {message && <p className={message.ok ? "ok" : "bad"} role="status">{message.text}</p>}
    </div>
  );
}

function Overview({ spec, guild }: { spec: DiscordModule; guild: string }) {
  const state = useLoad(() => botCall<Json>(moduleUrl(spec, guild, spec.overview ?? "/")), [spec.id, guild]);
  if (state.error) return null;
  if (!state.data) return <Skeletons count={1} height={28} />;
  const facts = factsOf(state.data).filter((fact) => /^(total|active|pending|live|open)|(Count|Today|Rate|Score)$/.test(fact.key));
  if (facts.length === 0) return null;
  return <dl className="discord-facts">{facts.map((fact) => <div key={fact.key}><dt>{humanize(fact.key)}</dt><dd>{displayValue(fact.value)}</dd></div>)}</dl>;
}

function useDirectory(guild: string): Directory | undefined {
  const channels = useLoad(() => botCached<Json>(`api/guilds/${guild}/server/channels`), [guild]);
  const roles = useLoad(() => botCached<Json>(`api/guilds/${guild}/server/roles`), [guild]);
  if (!channels.data || !roles.data) return undefined;
  return { channels: flattenEntries(channels.data), roles: flattenEntries(roles.data) };
}

function ModuleView({ spec, guild }: { spec: DiscordModule; guild: string }) {
  const directory = useDirectory(guild);
  const [created, setCreated] = useState(0);
  const [pane, setPane] = useState("0");
  const Custom = CUSTOM_DISCORD_PAGES[spec.id];
  if (Custom) return <motion.div key={`${spec.id}-${guild}`} className="discord-module" variants={stepEnter} initial="initial" animate="animate"><Custom guild={guild} /></motion.div>;
  const panes: { id: string; label: string; config?: number; list?: number }[] = [
    ...(spec.configs ?? []).map((config, index) => ({ id: String(index), label: config.title, config: index })),
    ...(spec.lists ?? []).map((list, index) => ({ id: `l${index}`, label: list.title, list: index })),
  ];
  const active = panes.some((item) => item.id === pane) ? pane : panes[0]?.id;
  return (
    <motion.div key={`${spec.id}-${guild}`} className="discord-module" variants={stepEnter} initial="initial" animate="animate">
      <header className="discord-module-head">
        <h1>{spec.title}</h1>
        {spec.actions && <ActionButtons spec={spec} guild={guild} />}
        {DISCORD_CREATORS[spec.id] && <CreateButtons key={created} specs={DISCORD_CREATORS[spec.id]} root={moduleUrl(spec, guild, "/")} directory={directory} onCreated={() => setCreated((value) => value + 1)} />}
      </header>
      {spec.overview && <Overview spec={spec} guild={guild} />}
      {panes.length > 1 && <Tabs id={`module-${spec.id}`} label={spec.title} value={active} onChange={setPane} tabs={panes} />}
      {panes.filter((item) => item.id === active).map((item) => (item.list !== undefined
        ? <ListSection key={`${item.id}-${created}`} spec={spec} guild={guild} index={item.list} />
        : <ConfigSection key={item.id} spec={spec} guild={guild} index={item.config ?? 0} directory={directory} />))}
    </motion.div>
  );
}

interface GuildData { guild?: { memberCount?: number; channelsCount?: number; rolesCount?: number }; botStatus?: { online?: boolean; pingMs?: number; uptimeMs?: number }; stats?: { totalCommands?: number; commandsToday?: number; recentActivities?: { id?: string; message?: string; description?: string; action?: string; title?: string; user?: string; timestamp?: string }[] } }
interface ModuleState { id: string; name: string; description?: string; enabled: boolean }

const GROUP_LABELS: Record<string, string> = { "Modération et sécurité": "Modération", "IA, musique et vocal": "IA et musique", "Bot (propriétaire)": "Bot" };

function uptime(milliseconds: number) {
  const hours = Math.floor(milliseconds / 3600000);
  return hours >= 24 ? tr(`${Math.floor(hours / 24)} j ${hours % 24} h`, `${Math.floor(hours / 24)}d ${hours % 24}h`) : `${hours} h ${Math.floor((milliseconds % 3600000) / 60000)} min`;
}

function ActivityChart({ guild }: { guild: string }) {
  const state = useLoad(() => botCall<{ timeSeries?: { timestamp: string; messages?: number; commands?: number }[] }>(`api/guilds/${guild}/analytics/overview?period=7d`), [guild]);
  const points = state.data?.timeSeries ?? [];
  if (points.length === 0) return null;
  const value = (point: { messages?: number; commands?: number }) => (point.messages ?? 0) + (point.commands ?? 0);
  const peak = Math.max(...points.map(value));
  const total = points.reduce((sum, point) => sum + value(point), 0);
  return (
    <section className="discord-section">
      <h2>{tr("Activité sur 7 jours", "Activity over 7 days")}<small className="discord-count">{tr(`${total} messages et commandes`, `${total} messages and commands`)}</small></h2>
      {total === 0 ? <p className="muted">{tr("Aucun message ni commande compté sur cette période.", "No messages or commands counted in this period.")}</p> : (
        <div className="discord-chart" role="img" aria-label={tr(`${total} messages et commandes sur 7 jours`, `${total} messages and commands over 7 days`)}>
          {points.map((point) => <span key={point.timestamp} title={`${new Date(point.timestamp).toLocaleDateString()} : ${value(point)}`}><i style={{ height: `${Math.max(value(point) ? 4 : 1, (value(point) / peak) * 100)}%` }} /></span>)}
        </div>
      )}
    </section>
  );
}

function GuildOverview({ guild, onOpen }: { guild: Guild; onOpen: (id: string) => void }) {
  const state = useLoad(() => botCall<GuildData>(`api/guilds/${guild.id}/overview`), [guild.id]);
  const modules = useLoad(() => botCall<{ modules?: ModuleState[] }>(`api/guilds/${guild.id}/modules`), [guild.id]);
  const [error, setError] = useState<string | null>(null);
  const toggle = async (item: ModuleState) => {
    setError(null);
    modules.set({ modules: modules.data?.modules?.map((other) => (other.id === item.id ? { ...other, enabled: !item.enabled } : other)) });
    try {
      await botCall(`api/guilds/${guild.id}/modules/${item.id}`, "PATCH", { enabled: !item.enabled });
    } catch (reason) {
      setError(errorText(reason));
      modules.reload();
    }
  };
  const data = state.data;
  const activities = data?.stats?.recentActivities ?? [];
  return (
    <div className="discord-module">
      <header className="discord-hero">
        {guild.icon ? <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`} alt="" /> : <span className="discord-hero-icon">{guild.name.charAt(0)}</span>}
        <div>
          <h1>{guild.name}</h1>
          {data?.botStatus && <p className={data.botStatus.online ? "ok" : "bad"}>{data.botStatus.online ? tr("Bot en ligne", "Bot online") : tr("Bot hors ligne", "Bot offline")}{data.botStatus.pingMs ? `, ${data.botStatus.pingMs} ms` : ""}</p>}
        </div>
      </header>
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {!data ? (state.loading ? <Skeletons count={1} height={28} /> : null) : (
        <dl className="discord-facts">
          <div><dt>{tr("Membres", "Members")}</dt><dd>{(data.guild?.memberCount ?? 0).toLocaleString()}</dd></div>
          <div><dt>{tr("Salons", "Channels")}</dt><dd>{data.guild?.channelsCount ?? 0}</dd></div>
          <div><dt>{tr("Rôles", "Roles")}</dt><dd>{data.guild?.rolesCount ?? 0}</dd></div>
          <div><dt>{tr("Commandes", "Commands")}</dt><dd>{(data.stats?.totalCommands ?? 0).toLocaleString()}</dd></div>
          <div><dt>{tr("Aujourd'hui", "Today")}</dt><dd>{data.stats?.commandsToday ?? 0}</dd></div>
          {data.botStatus?.uptimeMs ? <div><dt>{tr("En ligne depuis", "Up for")}</dt><dd>{uptime(data.botStatus.uptimeMs)}</dd></div> : null}
        </dl>
      )}
      <ActivityChart guild={guild.id} />
      <section className="discord-section">
        <h2>{tr("Modules du serveur", "Server modules")}{modules.data?.modules && <small className="discord-count">{tr(`${modules.data.modules.filter((item) => item.enabled).length} actifs sur ${modules.data.modules.length}`, `${modules.data.modules.filter((item) => item.enabled).length} on, ${modules.data.modules.length} total`)}</small>}</h2>
        {error && <ErrorBox message={error} />}
        {!modules.data ? (modules.loading ? <Skeletons count={4} height={56} /> : modules.error ? <ErrorBox message={modules.error} onRetry={modules.reload} /> : null) : (
          <Stagger className="discord-modules">
            {(modules.data.modules ?? []).map((item) => {
              const openable = DISCORD_MODULES.some((spec) => spec.id === item.id);
              return (
                <StaggerItem key={item.id} variants={staggerItem}>
                  <button type="button" className="discord-module-open" title={item.description} disabled={!openable} onClick={() => onOpen(item.id)}><b>{item.name}</b></button>
                  <input type="checkbox" role="switch" aria-label={item.name} checked={item.enabled} onChange={() => void toggle(item)} />
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </section>
      {activities.length > 0 && (
        <section className="discord-section">
          <h2>{tr("Activité récente", "Recent activity")}</h2>
          <ul className="activity-list">{activities.slice(0, 6).map((item, index) => <li key={item.id ?? index}><b>{item.message ?? item.description ?? item.title ?? item.action}</b>{item.timestamp && <time>{new Date(item.timestamp).toLocaleString()}</time>}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

export default function DiscordPage() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guild, setGuild] = useState<string | null>(() => readJson<string>(GUILD_KEY));
  const [savedModule, saveModule] = usePersisted<string>("ethone-discord-module", "");
  const moduleId = savedModule || null;
  const setModuleId = (next: string | null) => saveModule(next ?? "");
  const [query, setQuery] = useState("");
  const [section, setSection] = usePersisted<string>("ethone-section-discord", "home");
  const searching = query.trim().length > 0;
  const openSection = (next: string) => {
    setQuery("");
    setSection(next);
    setModuleId(next === "home" ? null : DISCORD_MODULES.find((item) => item.group === next)?.id ?? null);
  };

  useEffect(() => {
    botStatus().then(setLinked, () => setLinked(false));
    const stop = listen<{ ok: boolean; error?: string }>("discord-login", ({ payload }) => {
      setWaiting(false);
      if (payload.ok) setLinked(true);
      else setError(errorText(payload.error));
    });
    return () => void stop.then((unlisten) => unlisten());
  }, []);

  const guilds = useLoad(async () => {
    if (!linked) return [] as Guild[];
    const response = await botCall<{ guilds?: Guild[] }>("api/guilds");
    return [...(response.guilds ?? [])].sort((left, right) => Number(right.botPresent ?? false) - Number(left.botPresent ?? false) || left.name.localeCompare(right.name));
  }, [linked]);

  useEffect(() => {
    if (guilds.error && /Connecte|discordRequired|Sign in/.test(guilds.error)) setLinked(false);
  }, [guilds.error]);

  const usable = useMemo(() => (guilds.data ?? []).filter((item) => item.botPresent !== false), [guilds.data]);
  useEffect(() => {
    if (usable.length && !usable.some((item) => item.id === guild)) setGuild(usable[0].id);
  }, [guild, usable]);
  useEffect(() => {
    if (guild) write(GUILD_KEY, JSON.stringify(guild));
  }, [guild]);

  const modules = useMemo(() => {
    const text = query.trim().toLowerCase();
    return DISCORD_MODULES.filter((item) => !text || item.title.toLowerCase().includes(text) || item.id.includes(text));
  }, [query]);
  const spec = DISCORD_MODULES.find((item) => item.id === moduleId);
  const current = usable.find((item) => item.id === guild);

  const connect = () => {
    setWaiting(true);
    setError(null);
    botLogin().catch((reason) => {
      setWaiting(false);
      setError(errorText(reason));
    });
  };

  if (linked === null) return <Skeletons />;
  if (!linked) {
    return (
      <Empty
        title={tr("Connecte ton compte Discord", "Link your Discord account")}
        text={tr("La connexion s'ouvre dans ton navigateur, puis revient dans Ethone. Elle donne accès à la gestion du bot sur tes serveurs.", "Sign-in opens in your browser, then returns to Ethone. It gives access to bot management on your servers.")}
        action={<>
          <Button variant="primary" onClick={connect}>{waiting ? tr("Rouvrir le navigateur", "Reopen the browser") : tr("Se connecter avec Discord", "Sign in with Discord")}</Button>
          {error && <p className="bad" role="alert">{error}</p>}
        </>}
      />
    );
  }

  return (
    <div className="discord">
      <header className="discord-bar">
        {guilds.loading && !guilds.data ? <Skeletons count={1} height={34} /> : (
          <select className="discord-guild" aria-label={tr("Serveur", "Server")} value={guild ?? ""} onChange={(event) => { setGuild(event.target.value); }}>
            {usable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <label className="discord-search"><Search size={14} /><input value={query} placeholder={tr("Chercher un module", "Find a module")} aria-label={tr("Chercher un module", "Find a module")} onChange={(event) => setQuery(event.target.value)} /></label>
        <button type="button" className="link discord-logout" onClick={() => void botLogout().then(() => setLinked(false))}><LogOut size={13} />{tr("Déconnecter", "Disconnect")}</button>
      </header>
      <nav className="discord-nav" aria-label={tr("Modules Discord", "Discord modules")}>
        <Tabs id="discord-groups" label={tr("Catégories", "Categories")} value={searching ? "" : section} onChange={openSection} tabs={[{ id: "home", label: tr("Vue d'ensemble", "Overview") }, ...DISCORD_GROUPS.map((item) => ({ id: item, label: GROUP_LABELS[item] ?? item }))]} />
        {(searching || section !== "home") && (
          <div className="discord-chips">
            {modules.filter((item) => searching || item.group === section).map((item) => <button key={item.id} type="button" className={moduleId === item.id ? "on" : ""} aria-current={moduleId === item.id ? "page" : undefined} onClick={() => { setModuleId(item.id); setSection(item.group); setQuery(""); }}>{item.title}</button>)}
            {searching && modules.length === 0 && <p className="muted">{tr("Aucun module trouvé.", "No module found.")}</p>}
          </div>
        )}
      </nav>
      <div className="discord-main">
        {guilds.error && !guilds.data && <ErrorBox message={guilds.error} onRetry={guilds.reload} />}
        {!guilds.loading && usable.length === 0 && !guilds.error && <Empty title={tr("Aucun serveur avec le bot", "No server with the bot")} text={tr("Invite le bot sur un de tes serveurs depuis ethone.dev.", "Invite the bot to one of your servers from ethone.dev.")} />}
        <AnimatePresence mode="wait" initial={false}>
          {guild && current && (spec ? <ModuleView key={`${spec.id}-${guild}`} spec={spec} guild={guild} /> : <GuildOverview key={guild} guild={current} onOpen={(id) => { setModuleId(id); setSection(DISCORD_MODULES.find((item) => item.id === id)?.group ?? "home"); }} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
