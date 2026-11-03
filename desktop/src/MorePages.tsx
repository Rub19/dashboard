import { FormEvent, useMemo, useState } from "react";
import { usePersisted } from "./qol";
import { Activity, Bell, Crown, Gauge, HardDrive, Keyboard, Lock, RefreshCw, Bot, CloudSun, ExternalLink, Info, KeyRound, MessageSquare, Palette, Plug, Rss, ScrollText, Shield, Sparkles, User, UserPlus, Users, Workflow, Zap } from "lucide-react";
import { apiCall, apiData, openExternal, Profile } from "./api";
import { AboutPage, AccountCard, DesktopSettings, JournalPage, SettingsPage } from "./pages";
import BrainChat from "./BrainChat";
import Connections from "./Connections";
import { BriefingPage, FlowsPage, MacrosPage } from "./BrainExtras";
import { AdminPage, loadAdminStats, PerformancePage, PrivacyPage, ShortcutsPage, StoragePage, SyncPage } from "./SettingsExtra";
import { ConfigForm, firstArray, humanize, Json, JsonFields, JsonList, unwrapConfig, rowTitle } from "./generic";
import { errorText, tr, lang } from "./i18n";
import { Empty, ErrorBox, PageHead, SideNav, Stat, Status, useLoad } from "./kit";
import { activityWeeks } from "./productivity";
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

export function AccountPage({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [section, setSection] = usePersisted<"appearance" | "windows" | "shortcuts" | "privacy" | "sync" | "storage" | "performance" | "admin" | "profile" | "connections" | "devices" | "twofactor" | "passkeys" | "events" | "ai" | "profiles" | "journal" | "about">("ethone-section-settings", "appearance");
  const admin = useLoad(() => loadAdminStats().then(() => true, () => false));
  const items = [
    { id: "appearance", label: tr("Apparence", "Appearance"), icon: <Palette size={16} />, group: tr("Application", "App") },
    { id: "windows", label: tr("Windows et notifications", "Windows and notifications"), icon: <Bell size={16} />, group: tr("Application", "App") },
    { id: "shortcuts", label: tr("Raccourcis", "Shortcuts"), icon: <Keyboard size={16} />, group: tr("Application", "App") },
    { id: "storage", label: tr("Stockage et cache", "Storage and cache"), icon: <HardDrive size={16} />, group: tr("Application", "App") },
    { id: "performance", label: "Performance", icon: <Gauge size={16} />, group: tr("Application", "App") },
    { id: "journal", label: tr("Journal", "Log"), icon: <ScrollText size={16} />, group: tr("Application", "App") },
    { id: "about", label: tr("À propos", "About"), icon: <Info size={16} />, group: tr("Application", "App") },
    { id: "profile", label: tr("Profil", "Profile"), icon: <User size={16} />, group: tr("Compte", "Account") },
    { id: "privacy", label: tr("Confidentialité", "Privacy"), icon: <Lock size={16} />, group: tr("Compte", "Account") },
    { id: "sync", label: tr("Synchronisation", "Sync"), icon: <RefreshCw size={16} />, group: tr("Compte", "Account") },
    { id: "profiles", label: tr("Espaces de profil", "Profile spaces"), icon: <Users size={16} />, group: tr("Compte", "Account") },
    { id: "connections", label: tr("Connexions", "Connections"), icon: <Plug size={16} />, group: tr("Compte", "Account") },
    { id: "devices", label: tr("Appareils", "Devices"), icon: <Shield size={16} />, group: tr("Sécurité", "Security") },
    { id: "twofactor", label: tr("Double authentification", "Two-factor"), icon: <Shield size={16} />, group: tr("Sécurité", "Security") },
    { id: "passkeys", label: tr("Clés d'accès", "Passkeys"), icon: <KeyRound size={16} />, group: tr("Sécurité", "Security") },
    { id: "events", label: tr("Journal de sécurité", "Security log"), icon: <Activity size={16} />, group: tr("Sécurité", "Security") },
    { id: "ai", label: tr("Intelligence artificielle", "AI"), icon: <Sparkles size={16} />, group: tr("Services", "Services") },
    ...(admin.data ? [{ id: "admin", label: tr("Administration", "Administration"), icon: <Crown size={16} />, group: tr("Services", "Services") }] as const : []),
  ] as const;
  return (
    <Split id="account" label={tr("Réglages", "Settings")} items={items} value={section} onChange={setSection}>
      {section === "appearance" && <SettingsPage />}
      {section === "windows" && <DesktopSettings />}
      {section === "shortcuts" && <ShortcutsPage />}
      {section === "privacy" && <PrivacyPage />}
      {section === "sync" && <SyncPage />}
      {section === "storage" && <StoragePage />}
      {section === "performance" && <PerformancePage />}
      {section === "admin" && <AdminPage />}
      {section === "journal" && <JournalPage />}
      {section === "about" && <AboutPage />}
      {section === "profile" && <><AccountCard profile={profile} onSignOut={onSignOut} /><ProfileEditor /></>}
      {section === "profiles" && <Remote title={tr("Espaces de profil", "Profile spaces")} path="api/profiles" actions={[{ title: tr("Activer", "Activate"), run: (row) => apiData("api/profiles/activate", "POST", { id: asRecord(row).id }) }]} />}
      {section === "connections" && <Connections />}
      {section === "devices" && <Devices />}
      {section === "twofactor" && <TwoFactor />}
      {section === "passkeys" && <Remote title={tr("Clés d'accès", "Passkeys")} path="api/auth/passkeys" text={tr("Les clés d'accès se créent sur ethone.dev, car elles sont liées à ce domaine.", "Passkeys are created on ethone.dev because they are tied to that domain.")} actions={[{ title: tr("Révoquer", "Revoke"), destructive: true, run: (row) => apiData("api/auth/passkey/revoke", "POST", { passkeyId: asRecord(row).id }) }]} />}
      {section === "events" && <SecurityLog />}
      {section === "ai" && <AiStatus />}
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

function Devices() {
  const state = useLoad(() => apiCall<Json>("api/auth/devices"));
  const revoke = { title: tr("Révoquer", "Revoke"), destructive: true, run: (row: Json) => apiData("api/auth/device/revoke", "POST", { deviceId: asRecord(row).id }) };
  return (
    <>
      <PageHead title={tr("Appareils", "Devices")} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => {
          const groups = new Map<string, Json[]>();
          for (const row of firstArray(data)) groups.set(rowTitle(row), [...(groups.get(rowTitle(row)) ?? []), row]);
          return <div className="device-groups">{[...groups].map(([name, rows]) => <details key={name} className="generic-details"><summary>{name}<small>{tr(`${rows.length} connexion${rows.length > 1 ? "s" : ""}`, `${rows.length} session${rows.length > 1 ? "s" : ""}`)}</small></summary><JsonList rows={rows} actions={[revoke]} onChanged={state.reload} /></details>)}</div>;
        }}
      </Status>
    </>
  );
}

const SECURITY_LABELS: Record<string, string> = { device_added: "Nouvel appareil connecté", device_revoked: "Appareil révoqué", signed_in: "Connexion", signed_out: "Déconnexion", password_changed: "Mot de passe modifié", mfa_enabled: "Double authentification activée", mfa_disabled: "Double authentification désactivée", passkey_added: "Clé d'accès ajoutée", passkey_removed: "Clé d'accès retirée" };

function SecurityLog() {
  const state = useLoad(() => apiData<{ id?: string; kind?: string; created_at?: string }[]>("api/auth/security-events?limit=20"));
  return (
    <>
      <PageHead title={tr("Journal de sécurité", "Security log")} text={tr("Les 20 derniers événements.", "The last 20 events.")} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>{(rows) => rows.length === 0 ? <Empty title={tr("Aucun événement", "No events")} /> : <ul className="activity-list">{rows.map((row, index) => <li key={row.id ?? index}><b>{(lang === "fr" ? SECURITY_LABELS[row.kind ?? ""] : undefined) ?? humanize(row.kind ?? "")}</b><time>{row.created_at ? new Date(row.created_at).toLocaleString(lang) : ""}</time></li>)}</ul>}</Status>
    </>
  );
}

function AiStatus() {
  const state = useLoad(async () => {
    const [status, quota] = await Promise.all([apiData<{ primary?: string; fallback?: string }>("api/ai/status"), apiData<{ used?: number; budget?: number; requests?: number; errors?: number }>("api/ai/quota")]);
    return { status, quota };
  });
  return (
    <>
      <PageHead title={tr("Intelligence artificielle", "Artificial intelligence")} text={tr("Ce que Brain a consommé aujourd'hui.", "What Brain used today.")} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {({ status, quota }) => {
          const share = (quota.budget ?? 0) > 0 ? Math.min(1, (quota.used ?? 0) / (quota.budget ?? 1)) : 0;
          return (
            <>
              <div className="quota-bar" role="progressbar" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ transform: `scaleX(${share})` }} /></div>
              <div className="focus-stats">
                <Stat label={tr("Quota utilisé", "Quota used")} value={`${Math.round(share * 100)} %`} hint={`${(quota.used ?? 0).toLocaleString(lang)} / ${(quota.budget ?? 0).toLocaleString(lang)}`} />
                <Stat label={tr("Requêtes", "Requests")} value={(quota.requests ?? 0).toLocaleString(lang)} />
                <Stat label={tr("Erreurs", "Errors")} value={(quota.errors ?? 0).toLocaleString(lang)} />
                <Stat label={tr("Service", "Service")} value={humanize(status.primary ?? "–")} hint={status.fallback ? tr(`Secours : ${humanize(status.fallback)}`, `Fallback: ${humanize(status.fallback)}`) : undefined} />
              </div>
            </>
          );
        }}
      </Status>
    </>
  );
}

const SERVICE_NAMES: Record<string, string> = { lastfm: "Last.fm", nowplaying: "Lecture en cours", weather: "Météo", github: "GitHub", youtube: "YouTube", "google-calendar": "Google Agenda", "google-drive": "Google Drive" };

function Diagnostic() {
  const state = useLoad(() => apiData<{ worker?: string; version?: string; services?: { id: string; available: boolean }[] }>("api/diagnostic"));
  return (
    <>
      <PageHead title={tr("Diagnostic", "Diagnostics")} text={tr("L'état des services Ethone vu par ton compte.", "Ethone service status as seen by your account.")} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => (
          <>
            <div className="focus-stats">
              <Stat label={tr("Serveur Ethone", "Ethone server")} value={data.worker === "connected" ? tr("Connecté", "Connected") : tr("Indisponible", "Unavailable")} />
              <Stat label={tr("Version", "Version")} value={data.version ?? "–"} />
              <Stat label={tr("Services disponibles", "Available services")} value={`${(data.services ?? []).filter((service) => service.available).length} / ${(data.services ?? []).length}`} />
            </div>
            <ul className="service-grid">
              {(data.services ?? []).map((service) => <li key={service.id} className={service.available ? "up" : "down"}><i />{SERVICE_NAMES[service.id] ?? humanize(service.id)}<small>{service.available ? tr("Disponible", "Available") : tr("Indisponible", "Unavailable")}</small></li>)}
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
  return (
    <div className="kit-split-body team-page">
      <Team />
      <SharedSpaces />
      <Collection kind="spaces" title={tr("Mes espaces", "My spaces")} placeholder={tr("Nom de l'espace", "Space name")} defaults={{ color: "#3aa8ff" }} />
    </div>
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

export function BrainPage() {
  const [section, setSection] = usePersisted<"chat" | "briefing" | "flows" | "macros" | "interactions" | "personas">("ethone-section-brain", "chat");
  const items = [
    { id: "chat", label: "Brain", icon: <MessageSquare size={16} /> },
    { id: "briefing", label: tr("Résumé du jour", "Daily briefing"), icon: <Sparkles size={16} /> },
    { id: "flows", label: "Flows", icon: <Workflow size={16} />, group: tr("Automatisations", "Automation") },
    { id: "macros", label: "Macros", icon: <Zap size={16} />, group: tr("Automatisations", "Automation") },
    { id: "interactions", label: tr("Interactions", "Interactions"), icon: <Activity size={16} />, group: tr("Automatisations", "Automation") },
    { id: "personas", label: "Personas", icon: <Bot size={16} />, group: tr("Personnalisation", "Personalization") },
  ] as const;
  return (
    <Split id="brain" label="Brain" items={items} value={section} onChange={setSection}>
      {section === "chat" && <BrainChat />}
      {section === "briefing" && <BriefingPage />}
      {section === "flows" && <FlowsPage />}
      {section === "macros" && <MacrosPage />}
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
  const state = useLoad(() => apiData<{ events?: { id?: string; createdAt?: string; eventType?: string; details?: { title?: string } | null }[] }>("api/cloud/activity?limit=1000"));
  const dashboard = useLoad(() => apiData<Json>("api/cloud/dashboard").catch(() => null));
  const numbers = useMemo(() => Object.entries(asRecord(dashboard.data ?? null)).filter(([, value]) => typeof value === "number").slice(0, 6), [dashboard.data]);
  return (
    <>
      <PageHead title={tr("Activité", "Activity")} onRefresh={state.reload} refreshing={state.loading} />
      {numbers.length > 0 && <div className="focus-stats">{numbers.map(([key, value]) => <Stat key={key} label={humanize(key)} value={(value as number).toLocaleString(lang)} />)}</div>}
      <Status state={state}>
        {(data) => {
          const weeks = activityWeeks((data.events ?? []).flatMap((event) => (event.createdAt ? [event.createdAt] : [])), new Date());
          const peak = Math.max(1, ...weeks.flat().map((cell) => cell.count));
          const heat = (
            <div className="activity-map" role="img" aria-label={tr(`Activité des ${weeks.length} dernières semaines`, `Activity over the last ${weeks.length} weeks`)}>
              {weeks.map((week) => <span key={week[0].key}>{week.map((cell) => <i key={cell.key} title={`${new Date(`${cell.key}T12:00:00`).toLocaleDateString(lang)} : ${cell.count}`} className={cell.future ? "future" : ""} style={cell.count ? { opacity: 0.3 + 0.7 * (cell.count / peak), background: "var(--accent-text)" } : undefined} />)}</span>)}
            </div>
          );
          const rows: { key: string; title: string; at: string; count: number }[] = [];
          for (const [index, event] of (data.events ?? []).entries()) {
            const title = event.details?.title ?? (lang === "fr" ? ACTIVITY_LABELS[event.eventType ?? ""] : undefined) ?? humanize(event.eventType ?? "");
            const last = rows[rows.length - 1];
            if (last?.title === title) last.count += 1;
            else rows.push({ key: event.id ?? String(index), title, at: event.createdAt ?? "", count: 1 });
          }
          return rows.length === 0 ? <Empty title={tr("Aucune activité", "No activity")} /> : <>{heat}<ul className="activity-list">{rows.map((row) => <li key={row.key}><b>{row.title}{row.count > 1 && <small className="activity-count">×{row.count}</small>}</b><time>{row.at ? new Date(row.at).toLocaleString(lang) : ""}</time></li>)}</ul></>;
        }}
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
  const [section, setSection] = usePersisted<"activity" | "mail" | "weather" | "rss" | "diagnostic">("ethone-section-insights", "activity");
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


export function RotationView() {
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
