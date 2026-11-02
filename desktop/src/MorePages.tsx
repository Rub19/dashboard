import { FormEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bot, CloudSun, ExternalLink, Gamepad2, KeyRound, Link2, MessageSquare, Plug, Rss, Send, Shield, Sparkles, Trash2, User, UserPlus, Users, Workflow, Zap } from "lucide-react";
import { apiCall, apiData, openExternal, openSite } from "./api";
import { ConfigForm, firstArray, Json, JsonFields, JsonList, unwrapConfig } from "./generic";
import { errorText, tr } from "./i18n";
import { Empty, ErrorBox, PageHead, SideNav, Skeletons, Stat, Status, useLoad } from "./kit";
import { stepEnter } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

const asRecord = (row: Json): { [key: string]: Json } => (row && typeof row === "object" && !Array.isArray(row) ? row : {});

function Remote({ title, path, text, actions }: { title: string; path: string; text?: string; actions?: { title: string; destructive?: boolean; run: (row: Json) => Promise<unknown> }[] }) {
  const state = useLoad(() => apiCall<Json>(path), [path]);
  return (
    <>
      <PageHead title={title} text={text} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} actions={actions} onChanged={state.reload} />}</Status>
    </>
  );
}

function RemoteFields({ title, path, text }: { title: string; path: string; text?: string }) {
  const state = useLoad(() => apiData<Json>(path), [path]);
  return (
    <>
      <PageHead title={title} text={text} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>{(data) => <JsonFields value={data} />}</Status>
    </>
  );
}

function Split<T extends string>({ id, label, items, value, onChange, children }: { id: string; label: string; items: readonly { id: T; label: string; icon?: React.ReactNode; group?: string }[]; value: T; onChange: (value: T) => void; children: React.ReactNode }) {
  return (
    <div className="kit-split">
      <SideNav id={id} label={label} items={items} value={value} onChange={onChange} />
      <div className="kit-split-body">{children}</div>
    </div>
  );
}

function ProfileEditor() {
  const state = useLoad(() => apiData<Json>("api/profile"));
  return (
    <>
      <PageHead title={tr("Profil", "Profile")} text={tr("Ton identité sur Ethone, partagée avec le site et l'iPhone.", "Your Ethone identity, shared with the website and iPhone.")} />
      <Status state={state} height={120}>
        {(data) => {
          const { body } = unwrapConfig(data);
          const editable = Object.fromEntries(Object.entries(body).filter(([key]) => ["display_name", "username", "bio", "status_text", "pronouns", "location", "website"].includes(key)));
          return (
            <>
              {Object.keys(editable).length > 0 && <ConfigForm value={editable} onSave={async (next) => { await apiData("api/profile", "PATCH", next); state.reload(); }} />}
              <JsonFields value={Object.fromEntries(Object.entries(body).filter(([key]) => !(key in editable) && !["avatar_url", "banner_url", "user_id"].includes(key)))} />
            </>
          );
        }}
      </Status>
    </>
  );
}

function Connections() {
  const state = useLoad(() => apiCall<Json>("api/connections"));
  return (
    <>
      <PageHead title={tr("Connexions", "Connections")} text={tr("Les services reliés à ton compte. Pour en ajouter un, passe par ethone.dev.", "Services linked to your account. To add one, use ethone.dev.")} onRefresh={state.reload} refreshing={state.loading}>
        <Button onClick={() => void openSite("account")}><ExternalLink size={15} />ethone.dev</Button>
      </PageHead>
      <Status state={state}>
        {(data) => {
          const rows = firstArray(data);
          if (rows.length === 0) return <Empty title={tr("Aucune connexion", "No connections")} />;
          return (
            <ul className="connections">
              {rows.map((row, index) => {
                const record = asRecord(row);
                const provider = String(record.provider ?? "");
                const connected = record.connected !== false;
                return (
                  <li key={index}>
                    <span><b>{provider.charAt(0).toUpperCase() + provider.slice(1)}</b><small className={connected ? "ok" : "muted"}>{connected ? tr("Connecté", "Connected") : tr("Non connecté", "Not connected")}{record.username ? `, ${String(record.username)}` : ""}</small></span>
                    {connected && <Button className="danger" onClick={() => void apiData("api/connections/disconnect", "POST", { provider }).then(state.reload).catch(() => state.reload())}>{tr("Déconnecter", "Disconnect")}</Button>}
                  </li>
                );
              })}
            </ul>
          );
        }}
      </Status>
    </>
  );
}

export function AccountPage() {
  const [section, setSection] = useState<"profile" | "connections" | "devices" | "passkeys" | "events" | "ai" | "profiles">("profile");
  const items = [
    { id: "profile", label: tr("Profil", "Profile"), icon: <User size={16} /> },
    { id: "profiles", label: tr("Espaces de profil", "Profile spaces"), icon: <Users size={16} /> },
    { id: "connections", label: tr("Connexions", "Connections"), icon: <Plug size={16} /> },
    { id: "devices", label: tr("Appareils", "Devices"), icon: <Shield size={16} />, group: tr("Sécurité", "Security") },
    { id: "passkeys", label: tr("Clés d'accès", "Passkeys"), icon: <KeyRound size={16} />, group: tr("Sécurité", "Security") },
    { id: "events", label: tr("Journal de sécurité", "Security log"), icon: <Activity size={16} />, group: tr("Sécurité", "Security") },
    { id: "ai", label: tr("Intelligence artificielle", "AI"), icon: <Sparkles size={16} />, group: tr("Services", "Services") },
  ] as const;
  return (
    <Split id="account" label={tr("Compte", "Account")} items={items} value={section} onChange={setSection}>
      {section === "profile" && <ProfileEditor />}
      {section === "profiles" && <Remote title={tr("Espaces de profil", "Profile spaces")} path="api/profiles" actions={[{ title: tr("Activer", "Activate"), run: (row) => apiData("api/profiles/activate", "POST", { id: asRecord(row).id }) }]} />}
      {section === "connections" && <Connections />}
      {section === "devices" && <Remote title={tr("Appareils", "Devices")} path="api/auth/devices" actions={[{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData("api/auth/device/revoke", "POST", { deviceId: asRecord(row).id }) }]} />}
      {section === "passkeys" && <Remote title={tr("Clés d'accès", "Passkeys")} path="api/auth/passkeys" text={tr("Les clés d'accès se créent sur ethone.dev, car elles sont liées à ce domaine.", "Passkeys are created on ethone.dev because they are tied to that domain.")} actions={[{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData("api/auth/passkey/revoke", "POST", { passkeyId: asRecord(row).id }) }]} />}
      {section === "events" && <Remote title={tr("Journal de sécurité", "Security log")} path="api/auth/security-events" />}
      {section === "ai" && <><RemoteFields title={tr("État de l'IA", "AI status")} path="api/ai/status" /><RemoteFields title={tr("Quota", "Quota")} path="api/ai/quota" /></>}
    </Split>
  );
}

function SharedSpaces() {
  const [name, setName] = useState("");
  const state = useLoad(() => apiCall<Json>("api/shared-spaces"));
  const [error, setError] = useState<string | null>(null);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    apiData("api/shared-spaces", "POST", { name: name.trim() }).then(() => { setName(""); state.reload(); }, (reason) => setError(errorText(reason)));
  };
  return (
    <>
      <PageHead title={tr("Espaces partagés", "Shared spaces")} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={add}><input value={name} placeholder={tr("Nom de l'espace", "Space name")} aria-label={tr("Nom de l'espace", "Space name")} onChange={(event) => setName(event.target.value)} /><Button type="submit" variant="primary" disabled={!name.trim()}>{tr("Créer", "Create")}</Button></form>
      {error && <ErrorBox message={error} />}
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={[{ title: tr("Supprimer", "Delete"), destructive: true, run: (row) => apiData("api/shared-spaces", "DELETE", { id: asRecord(row).id }) }]} />}</Status>
    </>
  );
}

function Team() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const state = useLoad(() => apiCall<Json>("api/team/members"));
  const invite = (event: FormEvent) => {
    event.preventDefault();
    if (!email.includes("@")) return;
    setMessage(null);
    apiData("api/team/invite", "POST", { email: email.trim() }).then(() => { setEmail(""); setMessage({ text: tr("Invitation envoyée.", "Invitation sent."), ok: true }); state.reload(); }, (reason) => setMessage({ text: errorText(reason), ok: false }));
  };
  return (
    <>
      <PageHead title={tr("Équipe", "Team")} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={invite}><input type="email" value={email} placeholder={tr("Adresse e-mail à inviter", "Email to invite")} aria-label={tr("Adresse e-mail à inviter", "Email to invite")} onChange={(event) => setEmail(event.target.value)} /><Button type="submit" variant="primary" disabled={!email.includes("@")}><UserPlus size={15} />{tr("Inviter", "Invite")}</Button></form>
      {message && <p className={message.ok ? "ok" : "bad"} role="status">{message.text}</p>}
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={[{ title: tr("Retirer", "Remove"), destructive: true, run: (row) => apiData("api/team/members", "DELETE", { id: asRecord(row).id }) }]} />}</Status>
    </>
  );
}

export function TeamPage() {
  const [section, setSection] = useState<"team" | "shared" | "personal">("team");
  const items = [
    { id: "team", label: tr("Équipe", "Team"), icon: <Users size={16} /> },
    { id: "shared", label: tr("Espaces partagés", "Shared spaces"), icon: <Link2 size={16} /> },
    { id: "personal", label: tr("Mes espaces", "My spaces"), icon: <Zap size={16} /> },
  ] as const;
  return (
    <Split id="team" label={tr("Équipe", "Team")} items={items} value={section} onChange={setSection}>
      {section === "team" && <Team />}
      {section === "shared" && <SharedSpaces />}
      {section === "personal" && <Collection kind="spaces" title={tr("Mes espaces", "My spaces")} placeholder={tr("Nom de l'espace", "Space name")} defaults={{ color: "#3aa8ff" }} />}
    </Split>
  );
}

function Collection({ kind, title, text, placeholder, defaults }: { kind: string; title: string; text?: string; placeholder: string; defaults: { [key: string]: Json } }) {
  const path = `api/user-data/${kind}`;
  const state = useLoad(() => apiCall<Json>(path), [path]);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    setError(null);
    apiData(path, "POST", { slug: `${kind}-${Date.now()}`, label: label.trim(), data: defaults }).then(() => { setLabel(""); state.reload(); }, (reason) => setError(errorText(reason)));
  };
  return (
    <>
      <PageHead title={title} text={text} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={add}><input value={label} placeholder={placeholder} aria-label={placeholder} onChange={(event) => setLabel(event.target.value)} /><Button type="submit" variant="primary" disabled={!label.trim()}>{tr("Créer", "Create")}</Button></form>
      {error && <ErrorBox message={error} />}
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={[{ title: tr("Supprimer", "Delete"), destructive: true, run: (row) => apiData(path, "DELETE", { id: asRecord(row).id }) }]} />}</Status>
    </>
  );
}

interface ChatMessage { role: "user" | "assistant"; content: string }
const CHAT_KEY = "ethone-brain-chat";

function BrainChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readJson<ChatMessage[]>(CHAT_KEY) ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const result = await apiData<{ content?: string; text?: string; message?: string; output?: string }>("api/brain/complete", "POST", { messages: next.slice(-20) });
      const answer = result.content ?? result.text ?? result.message ?? result.output ?? "";
      const stored = [...next, { role: "assistant" as const, content: answer }];
      setMessages(stored);
      write(CHAT_KEY, JSON.stringify(stored.slice(-100)));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth" }));
    }
  };
  const clear = () => {
    setMessages([]);
    write(CHAT_KEY, "[]");
  };
  return (
    <div className="brain">
      <PageHead title="Brain" text={tr("La conversation reste sur ce PC.", "The conversation stays on this PC.")}>
        {messages.length > 0 && <Button onClick={clear}><Trash2 size={15} />{tr("Effacer", "Clear")}</Button>}
      </PageHead>
      <div className="brain-thread" aria-live="polite">
        {messages.length === 0 && <Empty title={tr("Pose ta question", "Ask your question")} text={tr("Brain répond avec les services d'IA de ton compte.", "Brain answers using your account's AI services.")} />}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => <motion.div key={index} className={`brain-bubble ${message.role}`} variants={stepEnter} initial="initial" animate="animate">{message.content}</motion.div>)}
        </AnimatePresence>
        {busy && <div className="brain-bubble assistant brain-typing"><span /><span /><span /></div>}
        <div ref={end} />
      </div>
      {error && <ErrorBox message={error} />}
      <form className="brain-input" onSubmit={(event) => void send(event)}>
        <input value={input} placeholder={tr("Écris à Brain", "Message Brain")} aria-label={tr("Message pour Brain", "Message for Brain")} onChange={(event) => setInput(event.target.value)} />
        <Button type="submit" variant="primary" disabled={busy || !input.trim()}><Send size={15} /></Button>
      </form>
    </div>
  );
}

export function BrainPage() {
  const [section, setSection] = useState<"chat" | "flows" | "macros" | "interactions" | "personas" | "plugins">("chat");
  const items = [
    { id: "chat", label: "Brain", icon: <MessageSquare size={16} /> },
    { id: "flows", label: "Flows", icon: <Workflow size={16} />, group: tr("Automatisations", "Automation") },
    { id: "macros", label: "Macros", icon: <Zap size={16} />, group: tr("Automatisations", "Automation") },
    { id: "interactions", label: tr("Interactions", "Interactions"), icon: <Activity size={16} />, group: tr("Automatisations", "Automation") },
    { id: "personas", label: "Personas", icon: <Bot size={16} />, group: tr("Personnalisation", "Personalization") },
    { id: "plugins", label: "Plugins", icon: <Plug size={16} />, group: tr("Personnalisation", "Personalization") },
  ] as const;
  return (
    <Split id="brain" label="Brain" items={items} value={section} onChange={setSection}>
      {section === "chat" && <BrainChat />}
      {section === "flows" && <Collection kind="flows" title="Flows" placeholder={tr("Nom du flow", "Flow name")} defaults={{ templateId: "focus", workspaceId: "focus" }} />}
      {section === "macros" && <Collection kind="macros" title="Macros" placeholder={tr("Nom de la macro", "Macro name")} defaults={{ action: "navigate", href: "/" }} />}
      {section === "interactions" && <Collection kind="interactions" title={tr("Interactions", "Interactions")} placeholder={tr("Nom de l'interaction", "Interaction name")} defaults={{ action: "navigate" }} />}
      {section === "personas" && <Collection kind="personas" title="Personas" placeholder={tr("Nom du persona", "Persona name")} defaults={{ theme: "obsidian" }} />}
      {section === "plugins" && <Remote title="Plugins" path="api/user-data/plugins" text={tr("Les plugins installés sur ton compte.", "Plugins installed on your account.")} />}
    </Split>
  );
}

function Weather() {
  const [city, setCity] = useState(() => readJson<string>("ethone-weather-city") ?? "Paris");
  const [query, setQuery] = useState(city);
  const state = useLoad(() => apiData<Json>(`api/weather?city=${encodeURIComponent(city)}`), [city]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setCity(query.trim());
    write("ethone-weather-city", JSON.stringify(query.trim()));
  };
  return (
    <>
      <PageHead title={tr("Météo", "Weather")} text={city} />
      <form className="daily-add" onSubmit={submit}><input value={query} placeholder={tr("Ville", "City")} aria-label={tr("Ville", "City")} onChange={(event) => setQuery(event.target.value)} /><Button type="submit">{tr("Afficher", "Show")}</Button></form>
      <Status state={state}>{(data) => <JsonFields value={data} />}</Status>
    </>
  );
}

function RssReader() {
  const [feeds, setFeeds] = useState<string[]>(() => readJson<string[]>("ethone-rss-feeds") ?? []);
  const [url, setUrl] = useState("");
  const [current, setCurrent] = useState<string | null>(feeds[0] ?? null);
  const state = useLoad(async () => (current ? apiData<{ title?: string; items?: { title?: string; link?: string; pubDate?: string; description?: string }[] }>(`api/rss?url=${encodeURIComponent(current)}`) : null), [current]);
  const add = (event: FormEvent) => {
    event.preventDefault();
    const value = url.trim();
    if (!/^https?:\/\//.test(value)) return;
    const next = [...new Set([...feeds, value])];
    setFeeds(next);
    write("ethone-rss-feeds", JSON.stringify(next));
    setCurrent(value);
    setUrl("");
  };
  return (
    <>
      <PageHead title={tr("Flux RSS", "RSS feeds")} text={tr("Ta liste de flux reste sur ce PC.", "Your feed list stays on this PC.")} />
      <form className="daily-add" onSubmit={add}><input value={url} placeholder="https://…" aria-label={tr("Adresse du flux", "Feed address")} onChange={(event) => setUrl(event.target.value)} /><Button type="submit">{tr("Ajouter", "Add")}</Button></form>
      {feeds.length > 0 && <div className="eval-tags rss-feeds">{feeds.map((feed) => <button key={feed} type="button" className={feed === current ? "on" : ""} onClick={() => setCurrent(feed)}>{(() => { try { return new URL(feed).hostname; } catch { return feed; } })()}</button>)}</div>}
      {!current ? <Empty title={tr("Aucun flux", "No feeds")} /> : (
        <Status state={state}>
          {(data) => (
            <ul className="rss-list">
              {(data?.items ?? []).slice(0, 50).map((item, index) => (
                <li key={index}><button type="button" disabled={!item.link} onClick={() => item.link && void openExternal(item.link)}><b>{item.title}</b>{item.pubDate && <small>{new Date(item.pubDate).toLocaleString()}</small>}</button></li>
              ))}
            </ul>
          )}
        </Status>
      )}
    </>
  );
}

function ActivityView() {
  const state = useLoad(() => apiData<{ events?: Json[] }>("api/cloud/activity?limit=200"));
  const summary = useLoad(() => apiData<Json>("api/cloud/activity/summary").catch(() => null));
  const dashboard = useLoad(() => apiData<Json>("api/cloud/dashboard").catch(() => null));
  const numbers = useMemo(() => Object.entries(asRecord(dashboard.data ?? null)).filter(([, value]) => typeof value === "number").slice(0, 6), [dashboard.data]);
  return (
    <>
      <PageHead title={tr("Activité", "Activity")} onRefresh={state.reload} refreshing={state.loading} />
      {numbers.length > 0 && <div className="focus-stats">{numbers.map(([key, value]) => <Stat key={key} label={key.replace(/([A-Z_])/g, " $1").toLowerCase()} value={(value as number).toLocaleString()} />)}</div>}
      {summary.data ? <JsonFields value={summary.data} /> : null}
      <Status state={state}>{(data) => <JsonList rows={data.events ?? []} />}</Status>
    </>
  );
}

export function InsightsPage() {
  const [section, setSection] = useState<"activity" | "mail" | "weather" | "rss" | "diagnostic">("activity");
  const items = [
    { id: "activity", label: tr("Activité", "Activity"), icon: <Activity size={16} /> },
    { id: "mail", label: tr("Statistiques mail", "Mail stats"), icon: <MessageSquare size={16} /> },
    { id: "weather", label: tr("Météo", "Weather"), icon: <CloudSun size={16} />, group: tr("Infos", "Info") },
    { id: "rss", label: tr("Flux RSS", "RSS feeds"), icon: <Rss size={16} />, group: tr("Infos", "Info") },
    { id: "diagnostic", label: tr("Diagnostic", "Diagnostics"), icon: <Shield size={16} />, group: tr("Support", "Support") },
  ] as const;
  return (
    <Split id="insights" label={tr("Analyses", "Insights")} items={items} value={section} onChange={setSection}>
      {section === "activity" && <ActivityView />}
      {section === "mail" && <RemoteFields title={tr("Statistiques mail", "Mail stats")} path="api/mail/analytics" />}
      {section === "weather" && <Weather />}
      {section === "rss" && <RssReader />}
      {section === "diagnostic" && <RemoteFields title={tr("Diagnostic", "Diagnostics")} path="api/diagnostic" text={tr("L'état des services Ethone vu par ton compte.", "Ethone service status as seen by your account.")} />}
    </Split>
  );
}

function Lookup({ title, label, placeholder, load }: { title: string; label: string; placeholder: string; load: (value: string) => Promise<Json> }) {
  const key = `ethone-lookup-${title}`;
  const [value, setValue] = useState(() => readJson<string>(key) ?? "");
  const [result, setResult] = useState<Json>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    write(key, JSON.stringify(value.trim()));
    try {
      setResult(await load(value.trim()));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title={title} />
      <form className="daily-add" onSubmit={(event) => void submit(event)}><input value={value} placeholder={placeholder} aria-label={label} onChange={(event) => setValue(event.target.value)} /><Button type="submit" variant="primary" disabled={busy || !value.trim()}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button></form>
      {error && <ErrorBox message={error} />}
      {busy ? <Skeletons count={2} height={110} /> : result !== null && <JsonFields value={result} />}
    </>
  );
}

const riotParts = (value: string) => {
  const [name, tag = ""] = value.split("#");
  return `name=${encodeURIComponent(name.trim())}&tag=${encodeURIComponent(tag.trim())}`;
};

export function GamesPage() {
  const [section, setSection] = useState<"lol" | "tft" | "rotation" | "steam" | "minecraft">("lol");
  const items = [
    { id: "lol", label: "League of Legends", icon: <Gamepad2 size={16} />, group: "Riot" },
    { id: "tft", label: "Teamfight Tactics", icon: <Gamepad2 size={16} />, group: "Riot" },
    { id: "rotation", label: tr("Rotation LoL", "LoL rotation"), icon: <Gamepad2 size={16} />, group: "Riot" },
    { id: "steam", label: "Steam", icon: <Gamepad2 size={16} />, group: tr("Autres jeux", "Other games") },
    { id: "minecraft", label: "Minecraft", icon: <Gamepad2 size={16} />, group: tr("Autres jeux", "Other games") },
  ] as const;
  return (
    <Split id="games" label={tr("Jeux", "Games")} items={items} value={section} onChange={setSection}>
      {section === "lol" && <Lookup key="lol" title="League of Legends" label={tr("Identifiant Riot", "Riot ID")} placeholder="Pseudo#TAG" load={async (value) => ({ profil: await apiData<Json>(`api/stats/lol-profile?${riotParts(value)}`), matchs: await apiData<Json>(`api/stats/lol-matches?${riotParts(value)}`) })} />}
      {section === "tft" && <Lookup key="tft" title="Teamfight Tactics" label={tr("Identifiant Riot", "Riot ID")} placeholder="Pseudo#TAG" load={(value) => apiData<Json>(`api/stats/tft-matches?${riotParts(value)}`)} />}
      {section === "rotation" && <RemoteFields title={tr("Rotation LoL", "LoL rotation")} path="api/stats/lol-rotation" />}
      {section === "steam" && <Lookup key="steam" title="Steam" label="Steam ID" placeholder="SteamID64" load={async (value) => ({ joueur: await apiData<Json>(`api/steam/player?steamId=${encodeURIComponent(value)}`), recents: await apiData<Json>(`api/steam/recent-games?steamId=${encodeURIComponent(value)}`).catch(() => null) })} />}
      {section === "minecraft" && <Lookup key="minecraft" title="Minecraft" label={tr("Pseudo", "Username")} placeholder={tr("Pseudo", "Username")} load={(value) => apiData<Json>(`api/minecraft/profile?username=${encodeURIComponent(value)}`)} />}
    </Split>
  );
}

