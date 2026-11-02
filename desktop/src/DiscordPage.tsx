import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Search } from "lucide-react";
import { botCall, botLogin, botLogout, botStatus } from "./api";
import { DISCORD_GROUPS, DISCORD_MODULES, DiscordModule } from "./discordSpecs";
import { ConfigForm, firstArray, Json, JsonFields, JsonList, unwrapConfig } from "./generic";
import { errorText, tr } from "./i18n";
import { Empty, ErrorBox, PageHead, Skeletons, Status, useLoad } from "./kit";
import { stepEnter } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

interface Guild { id: string; name: string; icon?: string | null; botPresent?: boolean; owner?: boolean }
const GUILD_KEY = "ethone-discord-guild";

function moduleUrl(spec: DiscordModule, guild: string, sub: string): string {
  const root = (spec.base ?? `guilds/{g}/${spec.id}`).replace("{g}", guild);
  return `api/${root}${sub === "/" ? "" : sub}`;
}

function ConfigSection({ spec, guild, index }: { spec: DiscordModule; guild: string; index: number }) {
  const config = spec.configs![index];
  const state = useLoad(() => botCall<Json>(moduleUrl(spec, guild, config.get)), [spec.id, guild, config.get]);
  return (
    <section className="discord-section">
      <h2>{config.title}</h2>
      <Status state={state} height={120}>
        {(data) => {
          const { body, wrapper } = unwrapConfig(data);
          return <ConfigForm value={body} onSave={async (next) => {
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
  const actions = (list.rowActions ?? []).filter((action) => !action.textPrompt).map((action) => ({
    title: action.title,
    destructive: action.destructive,
    run: (row: Json) => {
      const record = row && typeof row === "object" && !Array.isArray(row) ? row : {};
      const id = String(record[list.idKey ?? "id"] ?? "");
      return botCall(moduleUrl(spec, guild, action.path.replace("{id}", encodeURIComponent(id))), (action.method ?? "POST") as "POST" | "PATCH" | "DELETE" | "PUT", action.method === "DELETE" ? undefined : action.body ?? {});
    },
  }));
  return (
    <section className="discord-section">
      <h2>{list.title}</h2>
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
    <section className="discord-section">
      <h2>{tr("Actions", "Actions")}</h2>
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
    </section>
  );
}

function Overview({ spec, guild }: { spec: DiscordModule; guild: string }) {
  const state = useLoad(() => botCall<Json>(moduleUrl(spec, guild, spec.overview ?? "/")), [spec.id, guild]);
  if (state.error) return null;
  return <section className="discord-section"><h2>{tr("Vue d'ensemble", "Overview")}</h2><Status state={state} height={80}>{(data) => <JsonFields value={data} />}</Status></section>;
}

function ModuleView({ spec, guild }: { spec: DiscordModule; guild: string }) {
  return (
    <motion.div key={`${spec.id}-${guild}`} className="discord-module" variants={stepEnter} initial="initial" animate="animate">
      <PageHead title={spec.title} />
      {spec.overview && <Overview spec={spec} guild={guild} />}
      {spec.actions && <ActionButtons spec={spec} guild={guild} />}
      {spec.configs?.map((_, index) => <ConfigSection key={index} spec={spec} guild={guild} index={index} />)}
      {spec.lists?.map((_, index) => <ListSection key={index} spec={spec} guild={guild} index={index} />)}
    </motion.div>
  );
}

function GuildOverview({ guild }: { guild: Guild }) {
  const state = useLoad(() => botCall<Json>(`api/guilds/${guild.id}/overview`), [guild.id]);
  return <div className="discord-module"><PageHead title={guild.name} text={tr("Choisis un module à gauche pour le régler.", "Pick a module on the left to configure it.")} /><Status state={state} height={100}>{(data) => <JsonFields value={data} />}</Status></div>;
}

export default function DiscordPage() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guild, setGuild] = useState<string | null>(() => readJson<string>(GUILD_KEY));
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
          <Button variant="primary" disabled={waiting} onClick={connect}>{waiting ? tr("En attente du navigateur…", "Waiting for the browser…") : tr("Se connecter avec Discord", "Sign in with Discord")}</Button>
          {error && <p className="bad" role="alert">{error}</p>}
        </>}
      />
    );
  }

  return (
    <div className="discord">
      <aside className="discord-side">
        {guilds.loading && !guilds.data ? <Skeletons count={1} height={36} /> : (
          <select className="discord-guild" aria-label={tr("Serveur", "Server")} value={guild ?? ""} onChange={(event) => { setGuild(event.target.value); }}>
            {usable.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        <label className="discord-search"><Search size={14} /><input value={query} placeholder={tr("Chercher un module", "Find a module")} aria-label={tr("Chercher un module", "Find a module")} onChange={(event) => setQuery(event.target.value)} /></label>
        <nav aria-label={tr("Modules Discord", "Discord modules")}>
          {DISCORD_GROUPS.map((group) => {
            const items = modules.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <h2>{group}</h2>
                {items.map((item) => <button key={item.id} type="button" className={moduleId === item.id ? "on" : ""} aria-current={moduleId === item.id ? "page" : undefined} onClick={() => setModuleId(item.id)}>{item.title}</button>)}
              </div>
            );
          })}
        </nav>
        <button type="button" className="link discord-logout" onClick={() => void botLogout().then(() => setLinked(false))}><LogOut size={13} />{tr("Déconnecter Discord", "Disconnect Discord")}</button>
      </aside>
      <div className="discord-main">
        {guilds.error && !guilds.data && <ErrorBox message={guilds.error} onRetry={guilds.reload} />}
        {!guilds.loading && usable.length === 0 && !guilds.error && <Empty title={tr("Aucun serveur avec le bot", "No server with the bot")} text={tr("Invite le bot sur un de tes serveurs depuis ethone.dev.", "Invite the bot to one of your servers from ethone.dev.")} />}
        <AnimatePresence mode="wait" initial={false}>
          {guild && current && (spec ? <ModuleView key={`${spec.id}-${guild}`} spec={spec} guild={guild} /> : <GuildOverview key={guild} guild={current} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}
