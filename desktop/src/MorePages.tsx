import { FormEvent, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Bot, CloudSun, ExternalLink, Gamepad2, Info, KeyRound, Link2, MessageSquare, Palette, Plug, Rss, ScrollText, Send, Shield, Sparkles, Trash2, User, UserPlus, Users, Workflow, Zap } from "lucide-react";
import { apiCall, apiData, openExternal, openSite, Profile } from "./api";
import { AboutPage, JournalPage, SettingsPage } from "./pages";
import { ConfigForm, firstArray, humanize, Json, JsonFields, JsonList, unwrapConfig } from "./generic";
import { errorText, tr, lang } from "./i18n";
import { Empty, ErrorBox, PageHead, SideNav, Skeletons, Stat, Status, useLoad } from "./kit";
import { stepEnter } from "./motion";
import { readJson, write } from "./settings";
import { Button } from "./ui";

interface Champion { id: number; name: string; title?: string; icon?: string }
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
          const hidden = ["avatar_url", "banner_url", "user_id", "id", "public_id", "avatar_frame_id", "banner_frame_id", "profile_background_id"];
          const editable = Object.fromEntries(Object.entries(body).filter(([key]) => ["display_name", "username", "bio", "status_text", "pronouns", "location", "website"].includes(key)));
          return (
            <>
              {Object.keys(editable).length > 0 && <ConfigForm value={editable} onSave={async (next) => { await apiData("api/profile", "PATCH", next); state.reload(); }} />}
              <JsonFields value={Object.fromEntries(Object.entries(body).filter(([key]) => !(key in editable) && !hidden.includes(key)))} />
            </>
          );
        }}
      </Status>
    </>
  );
}

function TwoFactor() {
  const [setup, setSetup] = useState<{ secret?: string; otpauth?: string } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (reason) {
      setMessage({ text: errorText(reason), ok: false });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title={tr("Double authentification", "Two-factor authentication")} text={tr("Une application comme Google Authenticator te donne un code à chaque connexion.", "An app such as Google Authenticator gives you a code at each sign-in.")} />
      {!setup && <div className="row"><Button variant="primary" disabled={busy} onClick={() => void run(async () => setSetup(await apiData("api/auth/totp/setup", "POST", {})))}>{tr("Activer", "Enable")}</Button></div>}
      {setup && <section className="totp"><p>{tr("Ajoute cette clé dans ton application d'authentification, puis saisis le code affiché.", "Add this key to your authenticator app, then enter the code shown.")}</p><code>{setup.secret}</code></section>}
      <form className="daily-add" onSubmit={(event) => { event.preventDefault(); void run(async () => {
        if (setup) {
          await apiData("api/auth/totp/verify", "POST", { code: code.trim() });
          setSetup(null);
          setMessage({ text: tr("Double authentification activée.", "Two-factor enabled."), ok: true });
        } else {
          await apiData("api/auth/totp/disable", "POST", { code: code.trim() });
          setMessage({ text: tr("Double authentification désactivée.", "Two-factor disabled."), ok: true });
        }
        setCode("");
      }); }}>
        <input value={code} inputMode="numeric" autoComplete="one-time-code" placeholder={tr("Code à 6 chiffres", "6-digit code")} aria-label={tr("Code d'authentification", "Authentication code")} onChange={(event) => setCode(event.target.value)} />
        <Button type="submit" className={setup ? "" : "danger"} disabled={busy || code.trim().length < 6}>{setup ? tr("Confirmer", "Confirm") : tr("Désactiver", "Disable")}</Button>
      </form>
      {message && <p className={message.ok ? "ok" : "bad"} role="status">{message.text}</p>}
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

export function AccountPage({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [section, setSection] = useState<"appearance" | "profile" | "connections" | "devices" | "twofactor" | "passkeys" | "events" | "ai" | "profiles" | "journal" | "about">("appearance");
  const items = [
    { id: "appearance", label: tr("Apparence et compte", "Appearance and account"), icon: <Palette size={16} />, group: tr("Application", "App") },
    { id: "journal", label: tr("Journal", "Log"), icon: <ScrollText size={16} />, group: tr("Application", "App") },
    { id: "about", label: tr("À propos", "About"), icon: <Info size={16} />, group: tr("Application", "App") },
    { id: "profile", label: tr("Profil", "Profile"), icon: <User size={16} />, group: tr("Compte", "Account") },
    { id: "profiles", label: tr("Espaces de profil", "Profile spaces"), icon: <Users size={16} />, group: tr("Compte", "Account") },
    { id: "connections", label: tr("Connexions", "Connections"), icon: <Plug size={16} />, group: tr("Compte", "Account") },
    { id: "devices", label: tr("Appareils", "Devices"), icon: <Shield size={16} />, group: tr("Sécurité", "Security") },
    { id: "twofactor", label: tr("Double authentification", "Two-factor"), icon: <Shield size={16} />, group: tr("Sécurité", "Security") },
    { id: "passkeys", label: tr("Clés d'accès", "Passkeys"), icon: <KeyRound size={16} />, group: tr("Sécurité", "Security") },
    { id: "events", label: tr("Journal de sécurité", "Security log"), icon: <Activity size={16} />, group: tr("Sécurité", "Security") },
    { id: "ai", label: tr("Intelligence artificielle", "AI"), icon: <Sparkles size={16} />, group: tr("Services", "Services") },
  ] as const;
  return (
    <Split id="account" label={tr("Réglages", "Settings")} items={items} value={section} onChange={setSection}>
      {section === "appearance" && <SettingsPage profile={profile} onSignOut={onSignOut} />}
      {section === "journal" && <JournalPage />}
      {section === "about" && <AboutPage />}
      {section === "profile" && <ProfileEditor />}
      {section === "profiles" && <Remote title={tr("Espaces de profil", "Profile spaces")} path="api/profiles" actions={[{ title: tr("Activer", "Activate"), run: (row) => apiData("api/profiles/activate", "POST", { id: asRecord(row).id }) }]} />}
      {section === "connections" && <Connections />}
      {section === "devices" && <Remote title={tr("Appareils", "Devices")} path="api/auth/devices" actions={[{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData("api/auth/device/revoke", "POST", { deviceId: asRecord(row).id }) }]} />}
      {section === "twofactor" && <TwoFactor />}
      {section === "passkeys" && <Remote title={tr("Clés d'accès", "Passkeys")} path="api/auth/passkeys" text={tr("Les clés d'accès se créent sur ethone.dev, car elles sont liées à ce domaine.", "Passkeys are created on ethone.dev because they are tied to that domain.")} actions={[{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData("api/auth/passkey/revoke", "POST", { passkeyId: asRecord(row).id }) }]} />}
      {section === "events" && <Remote title={tr("Journal de sécurité", "Security log")} path="api/auth/security-events?limit=20" />}
      {section === "ai" && <><RemoteFields title={tr("État de l'IA", "AI status")} path="api/ai/status" /><RemoteFields title={tr("Quota", "Quota")} path="api/ai/quota" /></>}
    </Split>
  );
}

function RemoveMember({ id, onDone }: { id: string; onDone: () => void }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!asking) return <Button className="danger" onClick={() => setAsking(true)}>{tr("Retirer", "Remove")}</Button>;
  return (
    <span className="row">
      {error && <span className="bad">{error}</span>}
      <Button onClick={() => setAsking(false)}>{tr("Annuler", "Cancel")}</Button>
      <Button className="danger" onClick={() => void apiData("api/team/members", "DELETE", { id }).then(onDone, (reason) => setError(errorText(reason)))}>{tr("Confirmer", "Confirm")}</Button>
    </span>
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

function Diagnostic() {
  const state = useLoad(() => apiData<{ worker?: string; version?: string; services?: { id: string; available: boolean }[] }>("api/diagnostic"));
  return (
    <>
      <PageHead title={tr("Diagnostic", "Diagnostics")} text={tr("L'état des services Ethone vu par ton compte.", "Ethone service status as seen by your account.")} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => (
          <>
            <div className="focus-stats">
              <Stat label="Worker" value={data.worker === "connected" ? tr("Connecté", "Connected") : tr("Indisponible", "Unavailable")} />
              <Stat label={tr("Version", "Version")} value={data.version ?? "–"} />
              <Stat label={tr("Services disponibles", "Available services")} value={`${(data.services ?? []).filter((service) => service.available).length} / ${(data.services ?? []).length}`} />
            </div>
            <ul className="service-grid">
              {(data.services ?? []).map((service) => <li key={service.id} className={service.available ? "up" : "down"}><i />{humanize(service.id)}<small>{service.available ? tr("Disponible", "Available") : tr("Indisponible", "Unavailable")}</small></li>)}
            </ul>
          </>
        )}
      </Status>
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
      <Status state={state}>
        {(data) => {
          const rows = firstArray(data).map(asRecord);
          if (rows.length === 0) return <Empty title={tr("Ton équipe est vide", "Your team is empty")} text={tr("Invite quelqu'un avec son adresse e-mail.", "Invite someone with their email address.")} />;
          return (
            <ul className="card-rows">
              {rows.map((row) => (
                <li key={String(row.id)}>
                  <div>
                    <span><b>{String(row.name ?? row.display_name ?? row.email ?? "")}</b><small>{String(row.email ?? "")}</small></span>
                    {row.role ? <span className="badge">{String(row.role)}</span> : null}
                    {row.status ? <span className="badge">{String(row.status)}</span> : null}
                    <RemoveMember id={String(row.id)} onDone={state.reload} />
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </Status>
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

function Collection({ kind, title, text, placeholder, defaults, choice }: { kind: string; title: string; text?: string; placeholder: string; defaults: { [key: string]: Json }; choice?: { label: string; keys: string[]; options: { id: string; label: string }[] } }) {
  const path = `api/user-data/${kind}`;
  const state = useLoad(() => apiCall<Json>(path), [path]);
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState(choice?.options[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!label.trim()) return;
    setError(null);
    const data = { ...defaults, ...Object.fromEntries((choice?.keys ?? []).map((key) => [key, selected])) };
    apiData(path, "POST", { slug: `${kind}-${Date.now()}`, label: label.trim(), data }).then(() => { setLabel(""); state.reload(); }, (reason) => setError(errorText(reason)));
  };
  return (
    <>
      <PageHead title={title} text={text} onRefresh={state.reload} refreshing={state.loading} />
      <form className="daily-add" onSubmit={add}><input value={label} placeholder={placeholder} aria-label={placeholder} onChange={(event) => setLabel(event.target.value)} />{choice && <select value={selected} aria-label={choice.label} onChange={(event) => setSelected(event.target.value)}>{choice.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>}<Button type="submit" variant="primary" disabled={!label.trim()}>{tr("Créer", "Create")}</Button></form>
      {error && <ErrorBox message={error} />}
      <Status state={state}>{(data) => <JsonList rows={firstArray(data)} onChanged={state.reload} actions={[{ title: tr("Renommer", "Rename"), prompt: tr("Nouveau nom", "New name"), run: (row, text) => apiData(path, "PATCH", { id: asRecord(row).id, label: text }) }, { title: tr("Supprimer", "Delete"), destructive: true, run: (row) => apiData(path, "DELETE", { id: asRecord(row).id }) }]} />}</Status>
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
  const [section, setSection] = useState<"chat" | "flows" | "macros" | "interactions" | "personas">("chat");
  const items = [
    { id: "chat", label: "Brain", icon: <MessageSquare size={16} /> },
    { id: "flows", label: "Flows", icon: <Workflow size={16} />, group: tr("Automatisations", "Automation") },
    { id: "macros", label: "Macros", icon: <Zap size={16} />, group: tr("Automatisations", "Automation") },
    { id: "interactions", label: tr("Interactions", "Interactions"), icon: <Activity size={16} />, group: tr("Automatisations", "Automation") },
    { id: "personas", label: "Personas", icon: <Bot size={16} />, group: tr("Personnalisation", "Personalization") },
  ] as const;
  return (
    <Split id="brain" label="Brain" items={items} value={section} onChange={setSection}>
      {section === "chat" && <BrainChat />}
      {section === "flows" && <Collection kind="flows" title="Flows" placeholder={tr("Nom du flow", "Flow name")} defaults={{}} choice={{ label: tr("Modèle", "Template"), keys: ["templateId", "workspaceId"], options: [{ id: "personal", label: tr("Personnel", "Personal") }, { id: "focus", label: tr("Concentration", "Focus") }, { id: "studio", label: "Studio" }, { id: "gaming", label: "Gaming" }] }} />}
      {section === "macros" && <Collection kind="macros" title="Macros" placeholder={tr("Nom de la macro", "Macro name")} defaults={{ action: "navigate" }} choice={{ label: tr("Page à ouvrir", "Page to open"), keys: ["href"], options: [{ id: "/", label: tr("Accueil", "Home") }, { id: "/tasks", label: tr("Tâches", "Tasks") }, { id: "/notes", label: "Notes" }, { id: "/calendar", label: tr("Calendrier", "Calendar") }, { id: "/mail", label: "Mail" }, { id: "/files", label: tr("Fichiers", "Files") }, { id: "/tracker", label: "Tracker" }, { id: "/discord", label: "Discord" }, { id: "/brain", label: "Brain" }] }} />}
      {section === "interactions" && <Collection kind="interactions" title={tr("Interactions", "Interactions")} placeholder={tr("Nom de l'interaction", "Interaction name")} defaults={{ action: "navigate" }} />}
      {section === "personas" && <Collection kind="personas" title="Personas" placeholder={tr("Nom du persona", "Persona name")} defaults={{ theme: "obsidian" }} />}
    </Split>
  );
}

function Weather() {
  const [city, setCity] = useState(() => readJson<string>("ethone-weather-city") ?? "Paris");
  const [query, setQuery] = useState(city);
  const state = useLoad(() => apiData<{ city?: string; condition?: string; description?: string; temperature?: number; apparentTemperature?: number; humidityPercent?: number; windSpeedKmh?: number; uvIndex?: number; hourly?: { time?: string; temperature?: number; precipitationProbability?: number }[]; daily?: { date?: string; max?: number; min?: number; precipitationProbability?: number }[]; [key: string]: unknown }>(`api/weather?city=${encodeURIComponent(city)}`), [city]);
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
      <Status state={state}>
        {(data) => (
          <>
            <div className="focus-stats">
              {data.temperature !== undefined && <Stat label={data.description ?? tr("Température", "Temperature")} value={`${Math.round(Number(data.temperature))} °C`} hint={data.apparentTemperature !== undefined ? tr(`Ressenti ${Math.round(data.apparentTemperature)} °C`, `Feels like ${Math.round(data.apparentTemperature)} °C`) : undefined} />}
              {data.humidityPercent !== undefined && <Stat label={tr("Humidité", "Humidity")} value={`${data.humidityPercent} %`} />}
              {data.windSpeedKmh !== undefined && <Stat label={tr("Vent", "Wind")} value={`${Math.round(Number(data.windSpeedKmh))} km/h`} />}
              {data.uvIndex !== undefined && <Stat label="UV" value={String(data.uvIndex)} />}
            </div>
            {(data.daily?.length ?? 0) > 0 && <ul className="weather-days">{data.daily?.map((day, index) => <li key={index}><small>{day.date ? new Date(day.date).toLocaleDateString(lang, { weekday: "short" }) : ""}</small><b>{day.max === undefined ? "–" : `${Math.round(day.max)}°`}</b><small>{day.min === undefined ? "–" : `${Math.round(day.min)}°`}</small></li>)}</ul>}
          </>
        )}
      </Status>
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
                <li key={index}><button type="button" disabled={!item.link} onClick={() => item.link && void openExternal(item.link)}><b>{item.title}</b>{item.pubDate && <small>{new Date(item.pubDate).toLocaleString(lang)}</small>}</button></li>
              ))}
            </ul>
          )}
        </Status>
      )}
    </>
  );
}

const ACTIVITY_LABELS: Record<string, string> = { shared: "Partage", uploaded: "Envoi", downloaded: "Téléchargement", deleted: "Suppression", renamed: "Renommage", moved: "Déplacement", restored: "Restauration", viewed: "Consultation", revoked: "Révocation" };

export function ActivityView() {
  const state = useLoad(() => apiData<{ events?: { id?: string; createdAt?: string; eventType?: string; details?: { title?: string } | null }[] }>("api/cloud/activity?limit=200"));
  const dashboard = useLoad(() => apiData<Json>("api/cloud/dashboard").catch(() => null));
  const numbers = useMemo(() => Object.entries(asRecord(dashboard.data ?? null)).filter(([, value]) => typeof value === "number").slice(0, 6), [dashboard.data]);
  return (
    <>
      <PageHead title={tr("Activité", "Activity")} onRefresh={state.reload} refreshing={state.loading} />
      {numbers.length > 0 && <div className="focus-stats">{numbers.map(([key, value]) => <Stat key={key} label={humanize(key)} value={(value as number).toLocaleString(lang)} />)}</div>}
      <Status state={state}>
        {(data) => (data.events ?? []).length === 0 ? <Empty title={tr("Aucune activité", "No activity")} /> : (
          <ul className="activity-list">
            {(data.events ?? []).map((event, index) => <li key={event.id ?? index}><b>{event.details?.title ?? (lang === "fr" ? ACTIVITY_LABELS[event.eventType ?? ""] : undefined) ?? humanize(event.eventType ?? "")}</b><time>{event.createdAt ? new Date(event.createdAt).toLocaleString(lang) : ""}</time></li>)}
          </ul>
        )}
      </Status>
    </>
  );
}

function Support() {
  const links = [
    { label: tr("Nouveautés d'Ethone", "What's new"), url: "https://ethone.dev/changelog" },
    { label: tr("Documentation", "Documentation"), url: "https://ethone.dev/docs" },
    { label: tr("Conditions d'utilisation", "Terms"), url: "https://ethone.dev/terms" },
    { label: tr("Confidentialité", "Privacy"), url: "https://ethone.dev/privacy" },
  ];
  return (
    <>
      <Diagnostic />
      <h2 className="group-title">{tr("Liens", "Links")}</h2>
      <div className="row">{links.map((link) => <Button key={link.url} onClick={() => void openExternal(link.url)}><ExternalLink size={15} />{link.label}</Button>)}</div>
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
      {section === "diagnostic" && <Support />}
    </Split>
  );
}

const riotParts = (value: string) => {
  const [name, tag = ""] = value.split("#");
  return `name=${encodeURIComponent(name.trim())}&tag=${encodeURIComponent(tag.trim())}`;
};

interface LolStat { value?: number; displayValue?: string }
interface LolRaw { id?: string; metadata?: { agentName?: string; agentImageUrl?: string; modeName?: string; result?: string; gameDuration?: string; timestamp?: string }; segments?: { stats?: Record<string, LolStat> }[] }

function LolView() {
  const key = "ethone-lol-id";
  const [value, setValue] = useState(() => readJson<string>(key) ?? "");
  const [data, setData] = useState<{ profile: { handle?: string; avatarUrl?: string; rankSolo?: string; rankFlex?: string; segments?: { stats?: Record<string, LolStat> }[] }; matches: LolRaw[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.includes("#")) {
      setError(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
      return;
    }
    setBusy(true);
    setError(null);
    write(key, JSON.stringify(value.trim()));
    try {
      const [profile, matches] = await Promise.all([apiData<NonNullable<typeof data>["profile"]>(`api/stats/lol-profile?${riotParts(value)}`), apiData<LolRaw[]>(`api/stats/lol-matches?${riotParts(value)}`).catch(() => [])]);
      setData({ profile, matches: Array.isArray(matches) ? matches : [] });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="League of Legends" />
      <form className="daily-add" onSubmit={(event) => void submit(event)}><input value={value} placeholder="Pseudo#TAG" aria-label={tr("Identifiant Riot", "Riot ID")} onChange={(event) => setValue(event.target.value)} /><Button type="submit" variant="primary" disabled={busy}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button></form>
      {error && <ErrorBox message={error} />}
      {busy && <Skeletons count={3} height={70} />}
      {data && !busy && (
        <>
          <div className="lol-head">
            {data.profile.avatarUrl && <img src={data.profile.avatarUrl} alt="" />}
            <div><h2>{data.profile.handle}</h2><p className="muted">{tr("Niveau", "Level")} {data.profile.segments?.[0]?.stats?.level?.displayValue ?? "–"}</p></div>
            <div className="focus-stats"><Stat label="Solo" value={data.profile.rankSolo ?? tr("Non classé", "Unranked")} /><Stat label="Flex" value={data.profile.rankFlex ?? tr("Non classé", "Unranked")} /></div>
          </div>
          <ul className="lol-matches">
            {data.matches.map((match, index) => {
              const stats = match.segments?.[0]?.stats;
              const won = match.metadata?.result === "Victory";
              return (
                <li key={match.id ?? index} className={won ? "won" : "lost"}>
                  {match.metadata?.agentImageUrl && <img src={match.metadata.agentImageUrl} alt="" />}
                  <span><b>{match.metadata?.agentName}</b><small>{match.metadata?.modeName}{match.metadata?.gameDuration ? `, ${match.metadata.gameDuration}` : ""}</small></span>
                  <b>{stats?.kills?.value ?? 0}/{stats?.deaths?.value ?? 0}/{stats?.assists?.value ?? 0}</b>
                  <small>{stats?.cs?.value ?? 0} CS</small>
                  <b className={won ? "ok" : "bad"}>{won ? tr("Victoire", "Win") : tr("Défaite", "Loss")}</b>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

interface TftMatch { id?: string; mode?: string; setNumber?: number; playedAt?: string; me?: { placement?: number; level?: number; traits?: { name?: string; numUnits?: number }[]; units?: { name?: string; tier?: number }[] } | null }

function TftView() {
  const key = "ethone-tft-id";
  const [value, setValue] = useState(() => readJson<string>(key) ?? "");
  const [matches, setMatches] = useState<TftMatch[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.includes("#")) {
      setError(tr("Écris l'identifiant sous la forme Pseudo#TAG.", "Write the ID as Name#TAG."));
      return;
    }
    setBusy(true);
    setError(null);
    write(key, JSON.stringify(value.trim()));
    try {
      const result = await apiData<TftMatch[]>(`api/stats/tft-matches?${riotParts(value)}`);
      setMatches(Array.isArray(result) ? result : []);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  const played = (matches ?? []).filter((match) => match.me?.placement);
  const average = played.length ? played.reduce((total, match) => total + (match.me?.placement ?? 0), 0) / played.length : 0;
  return (
    <>
      <PageHead title="Teamfight Tactics" />
      <form className="daily-add" onSubmit={(event) => void submit(event)}><input value={value} placeholder="Pseudo#TAG" aria-label={tr("Identifiant Riot", "Riot ID")} onChange={(event) => setValue(event.target.value)} /><Button type="submit" variant="primary" disabled={busy}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button></form>
      {error && <ErrorBox message={error} />}
      {busy && <Skeletons count={3} height={70} />}
      {matches && !busy && (matches.length === 0 ? <Empty title={tr("Aucune partie TFT", "No TFT games")} /> : (
        <>
          <div className="focus-stats">
            <Stat label={tr("Parties", "Games")} value={played.length} />
            <Stat label={tr("Place moyenne", "Average place")} value={average.toFixed(1).replace(".", ",")} />
            <Stat label="Top 4" value={played.filter((match) => (match.me?.placement ?? 9) <= 4).length} />
          </div>
          <ul className="tft-list">
            {matches.map((match, index) => (
              <li key={match.id ?? index}>
                <div className="tft-top">
                  <span className={`tft-place ${(match.me?.placement ?? 9) <= 4 ? "good" : ""}`}>{match.me?.placement ?? "–"}</span>
                  <span><b>{match.mode ?? "TFT"}</b><small>Set {match.setNumber}, {tr("niveau", "level")} {match.me?.level}{match.playedAt ? `, ${new Date(match.playedAt).toLocaleString(lang)}` : ""}</small></span>
                </div>
                {(match.me?.traits?.length ?? 0) > 0 && <div className="tft-line">{match.me?.traits?.slice(0, 6).map((trait) => `${trait.name} ${trait.numUnits}`).join(", ")}</div>}
                {(match.me?.units?.length ?? 0) > 0 && <div className="tft-line">{match.me?.units?.slice(0, 9).map((unit) => `${unit.name} ${"★".repeat(unit.tier ?? 1)}`).join(", ")}</div>}
              </li>
            ))}
          </ul>
        </>
      ))}
    </>
  );
}

function SteamView() {
  const key = "ethone-steam-id";
  const [value, setValue] = useState(() => readJson<string>(key) ?? "");
  const [data, setData] = useState<{ player: { displayName?: string; avatarUrl?: string; profileUrl?: string; status?: string; [name: string]: unknown }; games: { name?: string; recentPlaytimeMinutes?: number; playtimeMinutes?: number }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    write(key, JSON.stringify(value.trim()));
    try {
      const id = encodeURIComponent(value.trim());
      const [player, recent] = await Promise.all([apiData<NonNullable<typeof data>["player"]>(`api/steam/player?steamId=${id}`), apiData<Json>(`api/steam/recent-games?steamId=${id}`).catch(() => [])]);
      setData({ player, games: firstArray(recent) as unknown as NonNullable<typeof data>["games"] });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Steam" />
      <form className="daily-add" onSubmit={(event) => void submit(event)}><input value={value} placeholder={tr("SteamID64 ou nom de profil", "SteamID64 or profile name")} aria-label="Steam ID" onChange={(event) => setValue(event.target.value)} /><Button type="submit" variant="primary" disabled={busy || !value.trim()}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button></form>
      {error && <ErrorBox message={error} />}
      {busy && <Skeletons count={3} height={60} />}
      {data && !busy && (
        <>
          <div className="lol-head">{data.player.avatarUrl && <img src={data.player.avatarUrl} alt="" />}<div><h2>{data.player.displayName}</h2>{data.player.profileUrl && <button type="button" className="link" onClick={() => void openExternal(data.player.profileUrl ?? "")}>{tr("Voir le profil", "View profile")}</button>}</div></div>
          <h2 className="group-title">{tr("Joué récemment", "Recently played")}</h2>
          {data.games.length === 0 ? <p className="muted">{tr("Aucun jeu récent visible.", "No visible recent games.")}</p> : <ul className="card-rows">{data.games.map((game, index) => <li key={index}><div><span><b>{game.name}</b><small>{game.playtimeMinutes !== undefined ? tr(`${Math.round(game.playtimeMinutes / 60)} h au total`, `${Math.round(game.playtimeMinutes / 60)} h total`) : ""}</small></span></div></li>)}</ul>}
        </>
      )}
    </>
  );
}

function MinecraftView() {
  const key = "ethone-minecraft-name";
  const [value, setValue] = useState(() => readJson<string>(key) ?? "");
  const [data, setData] = useState<{ username?: string; uuid?: string; skinUrl?: string; avatarUrl?: string; capeUrl?: string; model?: string; nameHistory?: unknown[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    write(key, JSON.stringify(value.trim()));
    try {
      setData(await apiData<NonNullable<typeof data>>(`api/minecraft/profile?username=${encodeURIComponent(value.trim())}`));
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Minecraft" />
      <form className="daily-add" onSubmit={(event) => void submit(event)}><input value={value} placeholder={tr("Pseudo", "Username")} aria-label={tr("Pseudo", "Username")} onChange={(event) => setValue(event.target.value)} /><Button type="submit" variant="primary" disabled={busy || !value.trim()}>{busy ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}</Button></form>
      {error && <ErrorBox message={error} />}
      {data && !busy && (
        <div className="lol-head">
          {(data.avatarUrl || data.skinUrl) && <img className="pixel" src={data.avatarUrl || data.skinUrl} alt="" />}
          <div><h2>{data.username ?? value}</h2>{data.model && <p className="muted">{tr("Modèle", "Model")} {data.model}</p>}</div>
        </div>
      )}
    </>
  );
}

function RotationView() {
  const state = useLoad(() => apiData<{ free?: Champion[]; freeForNewPlayers?: Champion[]; gameVersion?: string; region?: string }>("api/stats/lol-rotation"));
  const group = (title: string, rows?: Champion[]) => (rows?.length ?? 0) > 0 && (
    <>
      <h2 className="group-title">{title}</h2>
      <ul className="rotation-grid">{rows?.map((row) => <li key={row.id}>{row.icon && <img src={row.icon} alt="" />}<b>{row.name}</b><small>{row.title}</small></li>)}</ul>
    </>
  );
  return (
    <>
      <PageHead title={tr("Rotation LoL", "LoL rotation")} text={state.data?.gameVersion ? tr(`Version ${state.data.gameVersion}`, `Version ${state.data.gameVersion}`) : undefined} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>{(data) => <>{group(tr("Gratuits cette semaine", "Free this week"), data.free)}{group(tr("Gratuits pour les nouveaux joueurs", "Free for new players"), data.freeForNewPlayers)}</>}</Status>
    </>
  );
}

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
      {section === "lol" && <LolView />}
      {section === "tft" && <TftView />}
      {section === "rotation" && <RotationView />}
      {section === "steam" && <SteamView />}
      {section === "minecraft" && <MinecraftView />}
    </Split>
  );
}

