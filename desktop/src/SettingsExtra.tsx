import { ChangeEvent, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Upload } from "lucide-react";
import Select from "./Select";
import { apiCall, apiData, itemsList, openSite, restCall } from "./api";
import { clearCache } from "./cache";
import { firstArray, Json } from "./generic";
import { errorText, lang, t, tr } from "./i18n";
import { formatBytes, PageHead, Stat, Status, useLoad } from "./kit";
import { toast } from "./qol";
import { MAIN_PAGES } from "./navigation";
import { about } from "./api";
import { applyInterfacePreferences, currentInterfacePreferences, exportSettings, readJson, write } from "./settings";
import { tasksList } from "./tasks";
import { Button } from "./ui";

export function ShortcutsPage() {
  const groups: [string, [string, string][]][] = [
    [tr("Navigation", "Navigation"), [["Ctrl+K", tr("Rechercher une application ou une action", "Search an app or action")], ["Ctrl+1 à 9", tr("Ouvrir une page de la barre latérale", "Open a sidebar page")], ["Ctrl+,", tr("Ouvrir les réglages", "Open settings")], ["Alt+←", tr("Revenir en arrière", "Go back")]]],
    [tr("Fenêtre", "Window"), [["Ctrl+B", tr("Afficher ou réduire la barre latérale", "Show or collapse the sidebar")], ["Ctrl+F", tr("Aller au champ de recherche de la page", "Go to the page search field")], ["F5", tr("Actualiser la page", "Refresh the page")], ["Échap", tr("Fermer un panneau", "Close a panel")]]],
    ["Brain", [[tr("Entrée", "Enter"), tr("Envoyer le message", "Send the message")], [tr("Maj+Entrée", "Shift+Enter"), tr("Aller à la ligne", "New line")]]],
  ];
  return (
    <>
      <PageHead title={tr("Raccourcis", "Shortcuts")} text={tr("Les raccourcis clavier de l'application.", "The app's keyboard shortcuts.")} />
      {groups.map(([title, rows]) => (
        <section key={title}>
          <h2 className="group-title">{title}</h2>
          <ul className="settings settings-grid">{rows.map(([keys, label]) => <li key={keys}><span>{label}</span><kbd>{keys}</kbd></li>)}</ul>
        </section>
      ))}
    </>
  );
}

const LOCAL_DATA: { label: () => string; text: () => string; keys: string[] }[] = [
  { label: () => tr("Conversation Brain", "Brain conversation"), text: () => tr("Tes messages avec Brain, gardés sur ce PC.", "Your Brain messages, kept on this PC."), keys: ["ethone-brain-chat"] },
  { label: () => tr("Mémo", "Scratchpad"), text: () => tr("Le texte de ton mémo.", "Your scratchpad text."), keys: ["ethone-scratchpad"] },
  { label: () => tr("Séances de concentration", "Focus sessions"), text: () => tr("L'historique de tes séances.", "Your session history."), keys: ["ethone-focus-history"] },
  { label: () => tr("Photos des amis", "Friend pictures"), text: () => tr("Les images d'amis mémorisées.", "Remembered friend pictures."), keys: ["ethone-friend-cards", "ethone-friend-icons"] },
];

export function PrivacyPage() {
  const [tick, setTick] = useState(0);
  const size = (keys: string[]) => keys.reduce((total, key) => total + (localStorage.getItem(key)?.length ?? 0), 0);
  const clear = (keys: string[]) => {
    for (const key of keys) localStorage.removeItem(key);
    setTick(tick + 1);
    toast(tr("Effacé de ce PC", "Cleared from this PC"));
  };
  return (
    <>
      <PageHead title={tr("Confidentialité", "Privacy")} text={tr("Ce qu'Ethone garde sur ce PC, et comment l'effacer.", "What Ethone keeps on this PC, and how to clear it.")} />
      <ul className="settings settings-grid">
        {LOCAL_DATA.map((item) => (
          <li key={item.keys[0]}>
            <span className="stack"><b>{item.label()}</b><small className="muted">{item.text()} {formatBytes(size(item.keys))}</small></span>
            <Button disabled={size(item.keys) === 0} onClick={() => clear(item.keys)}>{tr("Effacer", "Clear")}</Button>
          </li>
        ))}
        <li>
          <span className="stack"><b>{tr("Tes données en ligne", "Your online data")}</b><small className="muted">{tr("Export et suppression du compte se font sur ethone.dev.", "Export and account deletion are on ethone.dev.")}</small></span>
          <div className="row">
            <Button onClick={() => openSite("privacy")}>{tr("Politique", "Policy")}</Button>
            <Button onClick={() => openSite("account")}>{tr("Mon compte", "My account")}</Button>
          </div>
        </li>
      </ul>
    </>
  );
}

const SYNC_CHECKS: { label: () => string; run: () => Promise<number> }[] = [
  { label: () => tr("Tâches", "Tasks"), run: async () => (await tasksList()).length },
  { label: () => "Notes", run: async () => (await itemsList("notes")).length },
  { label: () => tr("Calendrier", "Calendar"), run: async () => (await itemsList("events")).length },
  { label: () => tr("Habitudes", "Habits"), run: async () => (await restCall<unknown[]>("ethone_habits?select=id&archived=eq.false")).length },
  { label: () => "Mail", run: async () => firstArray(await apiCall<Json>("api/mail/inbox?folder=inbox&limit=50")).length },
  { label: () => tr("Fichiers", "Files"), run: async () => firstArray(await apiCall<Json>("api/cloud/files?limit=500")).length },
];

export function SyncPage() {
  const [rows, setRows] = useState<{ label: string; count?: number; ms: number; error?: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    setRows(await Promise.all(SYNC_CHECKS.map(async (item) => {
      const started = performance.now();
      try {
        const count = await item.run();
        return { label: item.label(), count, ms: Math.round(performance.now() - started) };
      } catch (reason) {
        return { label: item.label(), error: errorText(reason), ms: Math.round(performance.now() - started) };
      }
    })));
    setBusy(false);
  };
  useEffect(() => {
    void check();
  }, []);
  return (
    <>
      <PageHead title={tr("Synchronisation", "Sync")} text={tr("Chaque ligne interroge ton compte Ethone maintenant.", "Each row asks your Ethone account right now.")} onRefresh={() => void check()} refreshing={busy} />
      <ul className="settings settings-grid">
        {(rows ?? []).map((row) => (
          <li key={row.label}>
            <span className="stack"><b>{row.label}</b><small className={row.error ? "bad" : "muted"}>{row.error ?? tr(`${row.count} élément(s), ${row.ms} ms`, `${row.count} item(s), ${row.ms} ms`)}</small></span>
            <span className={row.error ? "bad" : "ok"}>{row.error ? tr("Erreur", "Error") : tr("À jour", "Up to date")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StoragePage() {
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [local, setLocal] = useState(0);
  const measure = () => {
    void navigator.storage?.estimate().then((estimate) => setUsage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }));
    setLocal(Object.keys(localStorage).reduce((total, key) => total + key.length + (localStorage.getItem(key)?.length ?? 0), 0));
  };
  useEffect(measure, []);
  const empty = () => {
    clearCache();
    setTimeout(measure, 400);
    toast(tr("Cache vidé : les données seront rechargées", "Cache cleared: data will reload"));
  };
  return (
    <>
      <PageHead title={tr("Stockage et cache", "Storage and cache")} text={tr("La place utilisée par Ethone sur ce PC.", "The space Ethone uses on this PC.")} onRefresh={measure} />
      <div className="focus-stats">
        <Stat label={tr("Espace utilisé", "Space used")} value={usage ? (usage.usage ? formatBytes(usage.usage) : "—") : "…"} />
        <Stat label={tr("Préférences", "Preferences")} value={formatBytes(local)} />
        <Stat label={tr("Espace disponible", "Space available")} value={usage ? formatBytes(usage.quota) : "…"} />
      </div>
      <ul className="settings">
        <li>
          <span className="stack"><b>{tr("Vider le cache", "Clear the cache")}</b><small className="muted">{tr("Efface les données de jeu et les matchs mémorisés. Tes réglages restent.", "Clears remembered game data and matches. Your settings stay.")}</small></span>
          <Button onClick={empty}>{tr("Vider", "Clear")}</Button>
        </li>
      </ul>
    </>
  );
}

export function PerformancePage() {
  const [fps, setFps] = useState<number | null>(null);
  const [memory, setMemory] = useState<number | null>(null);
  const [saving, setSaving] = useState(() => {
    const preferences = currentInterfacePreferences();
    return preferences.motion === "reduced" && preferences.transparency === "reduced";
  });
  const measure = () => {
    setFps(null);
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    setMemory(heap?.usedJSHeapSize ?? null);
    let frames = 0;
    const started = performance.now();
    const step = (now: number) => {
      frames++;
      if (now - started < 1000) requestAnimationFrame(step);
      else setFps(Math.round((frames * 1000) / (now - started)));
    };
    requestAnimationFrame(step);
  };
  useEffect(measure, []);
  const toggle = () => {
    const next = !saving;
    applyInterfacePreferences({ ...currentInterfacePreferences(), motion: next ? "reduced" : "system", transparency: next ? "reduced" : "system" });
    setSaving(next);
  };
  return (
    <>
      <PageHead title={tr("Performance", "Performance")} text={tr("Mesures prises maintenant dans cette fenêtre.", "Measured now in this window.")} onRefresh={measure} />
      <div className="focus-stats">
        <Stat label={tr("Images par seconde", "Frames per second")} value={fps === null ? "…" : String(fps)} />
        <Stat label={tr("Mémoire de l'interface", "Interface memory")} value={memory === null ? "—" : formatBytes(memory)} />
      </div>
      <ul className="settings">
        <li>
          <span className="stack"><b>{tr("Mode économique", "Saver mode")}</b><small className="muted">{tr("Réduit les animations et retire la transparence.", "Reduces animations and removes transparency.")}</small></span>
          <Button variant={saving ? "primary" : "ghost"} aria-pressed={saving} onClick={toggle}>{saving ? tr("Activé", "On") : tr("Activer", "Turn on")}</Button>
        </li>
      </ul>
    </>
  );
}

export interface AdminStats {
  users?: number;
  content?: Record<string, number>;
  mail?: Record<string, number>;
  activity?: Record<string, number>;
  generatedAt?: string;
}

export const loadAdminStats = () => apiData<AdminStats>("api/admin/stats");

export function AdminPage() {
  const state = useLoad(loadAdminStats);
  const labels: Record<string, string> = { items: tr("Éléments", "Items"), notes: "Notes", tasks: tr("Tâches", "Tasks"), events: tr("Événements", "Events"), files: tr("Fichiers", "Files"), aliases: tr("Alias", "Aliases"), messages: tr("Messages", "Messages"), threads: tr("Conversations", "Threads"), aiUsage: tr("Appels IA", "AI calls"), userData: tr("Données utilisateur", "User data"), teamMembers: tr("Membres d'équipe", "Team members") };
  const block = (title: string, values?: Record<string, number>) => (
    <section key={title}>
      <h2 className="group-title">{title}</h2>
      <div className="focus-stats">{Object.entries(values ?? {}).map(([key, value]) => <Stat key={key} label={labels[key] ?? key} value={value.toLocaleString(lang)} />)}</div>
    </section>
  );
  return (
    <>
      <PageHead title={tr("Administration", "Administration")} text={state.data?.generatedAt ? tr(`Chiffres du ${new Date(state.data.generatedAt).toLocaleString(lang)}`, `Figures from ${new Date(state.data.generatedAt).toLocaleString(lang)}`) : undefined} onRefresh={state.reload} refreshing={state.loading} />
      <Status state={state}>
        {(data) => (
          <>
            <div className="focus-stats"><Stat label={tr("Comptes", "Accounts")} value={(data.users ?? 0).toLocaleString(lang)} /></div>
            {block(tr("Contenu", "Content"), data.content)}
            {block("Mail", data.mail)}
            {block(tr("Activité", "Activity"), data.activity)}
          </>
        )}
      </Status>
      <GameOverride />
    </>
  );
}

function PageSwitch({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <li>
      <span className="stack"><b>{title}</b><small className="muted">{text}</small></span>
      <label className="switch" aria-label={title}>
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="switch-track"><span className="switch-thumb" /></span>
      </label>
    </li>
  );
}

export function AccessibilityPage() {
  const [contrast, setContrast] = useState(() => document.documentElement.dataset.contrast === "more");
  const [motion, setMotion] = useState(() => currentInterfacePreferences().motion === "reduced");
  const [opaque, setOpaque] = useState(() => currentInterfacePreferences().transparency === "reduced");
  const toggleContrast = (next: boolean) => {
    setContrast(next);
    write("ethone-contrast", next ? "more" : "normal");
    document.documentElement.dataset.contrast = next ? "more" : "normal";
  };
  return (
    <>
      <PageHead title={tr("Accessibilité", "Accessibility")} text={tr("Rendre l'application plus lisible et plus calme.", "Make the app easier to read and calmer.")} />
      <ul className="settings settings-grid">
        <PageSwitch title={tr("Contraste renforcé", "Higher contrast")} text={tr("Textes plus nets, bordures plus visibles et liens soulignés.", "Sharper text, stronger borders and underlined links.")} checked={contrast} onChange={toggleContrast} />
        <PageSwitch title={tr("Réduire les animations", "Reduce motion")} text={tr("Retire les mouvements de toute l'application.", "Removes movement across the app.")} checked={motion} onChange={(next) => { setMotion(next); applyInterfacePreferences({ ...currentInterfacePreferences(), motion: next ? "reduced" : "system" }); }} />
        <PageSwitch title={tr("Surfaces opaques", "Opaque surfaces")} text={tr("Retire les effets de transparence.", "Removes transparency effects.")} checked={opaque} onChange={(next) => { setOpaque(next); applyInterfacePreferences({ ...currentInterfacePreferences(), transparency: next ? "reduced" : "system" }); }} />
      </ul>
    </>
  );
}

export function WorkspacePage() {
  const [start, setStart] = useState(() => readJson<string>("ethone-start-page") ?? "last");
  const choose = (next: string) => {
    setStart(next);
    write("ethone-start-page", JSON.stringify(next));
  };
  return (
    <>
      <PageHead title={tr("Espace de travail", "Workspace")} text={tr("Ce que tu retrouves en ouvrant Ethone.", "What you see when opening Ethone.")} />
      <ul className="settings settings-grid">
        <li>
          <span className="stack"><b>{tr("Page d'ouverture", "Start page")}</b><small className="muted">{tr("La page affichée au lancement.", "The page shown at launch.")}</small></span>
          <Select className="settings-select" value={start} aria-label={tr("Page d'ouverture", "Start page")} onChange={(event) => choose(event.target.value)}>
            <option value="last">{tr("Dernière page ouverte", "Last opened page")}</option>
            {MAIN_PAGES.map(({ id }) => <option key={id} value={id}>{id === "tracker" ? "E:VAL" : id === "games" ? "E:LOL" : t(id)}</option>)}
          </Select>
        </li>
        <li>
          <span className="stack"><b>{tr("Blocs de l'Accueil", "Home blocks")}</b><small className="muted">{tr("Choisis-les avec le bouton de réglage en haut de l'Accueil.", "Pick them with the settings button at the top of Home.")}</small></span>
        </li>
      </ul>
    </>
  );
}

export function AdvancedPage() {
  const [asking, setAsking] = useState(false);
  const copyDiagnostic = async () => {
    const info = await about().catch(() => null);
    const text = [`Ethone ${info?.version ?? "?"}`, navigator.userAgent, `Écran ${screen.width}x${screen.height} @${devicePixelRatio}`, `Thème ${document.documentElement.dataset.look}`, `Langue ${lang}`].join("\n");
    await navigator.clipboard.writeText(text);
    toast(tr("Diagnostic copié", "Diagnostic copied"));
  };
  const saveRaw = () => {
    invoke<string>("settings_export", { content: exportSettings() }).then((path) => toast(tr(`Réglages enregistrés dans ${path}`, `Settings saved to ${path}`)), () => toast(tr("Export impossible", "Export failed"), { tone: "bad" }));
  };
  const reset = () => {
    for (const key of Object.keys(localStorage)) if (key.startsWith("ethone-") && key !== "ethone-brain-chat") localStorage.removeItem(key);
    clearCache();
    window.location.reload();
  };
  return (
    <>
      <PageHead title={tr("Avancé", "Advanced")} text={tr("Maintenance de l'application sur ce PC.", "App maintenance on this PC.")} />
      <ul className="settings settings-grid">
        <li><span className="stack"><b>{tr("Copier le diagnostic", "Copy diagnostic")}</b><small className="muted">{tr("Version, système et écran, sans donnée personnelle.", "Version, system and screen, no personal data.")}</small></span><Button onClick={() => void copyDiagnostic()}>{tr("Copier", "Copy")}</Button></li>
        <li><span className="stack"><b>{tr("Exporter les réglages", "Export settings")}</b><small className="muted">{tr("Dans ton dossier Téléchargements.", "To your Downloads folder.")}</small></span><Button onClick={saveRaw}>{tr("Exporter", "Export")}</Button></li>
        <li>
          <span className="stack"><b>{tr("Réinitialiser l'application", "Reset the app")}</b><small className="muted">{tr("Efface les préférences et le cache de ce PC. Ton compte, tes données en ligne et la conversation Brain restent.", "Clears preferences and cache on this PC. Your account, online data and Brain chat stay.")}</small></span>
          {asking ? <span className="row"><Button onClick={() => setAsking(false)}>{tr("Annuler", "Cancel")}</Button><Button className="danger" onClick={reset}>{tr("Confirmer", "Confirm")}</Button></span> : <Button className="danger" onClick={() => setAsking(true)}>{tr("Réinitialiser", "Reset")}</Button>}
        </li>
      </ul>
    </>
  );
}

export function GameOverride() {
  const state = useLoad(() => apiData<{ active?: boolean; uploadedAt?: string; sizeBytes?: number } | null>("api/games/dino/override"));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    action().then(() => { toast(done); state.reload(); }, (reason) => setError(errorText(reason))).finally(() => setBusy(false));
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) run(async () => invoke("admin_game_upload", { html: await file.text() }), tr("Jeu mis à jour", "Game updated"));
  };
  return (
    <section>
      <h2 className="group-title">{tr("Jeu Dino Corridor", "Dino Corridor game")}</h2>
      <ul className="settings">
        <li>
          <span className="stack"><b>{state.data?.active ? tr("Version manuelle active", "Manual version active") : tr("Version automatique", "Automatic version")}</b><small className="muted">{state.data?.active ? `${formatBytes(state.data.sizeBytes ?? 0)}${state.data.uploadedAt ? `, ${new Date(state.data.uploadedAt).toLocaleString(lang)}` : ""}` : tr("Le serveur utilise GitHub, puis sa copie de secours.", "The server uses GitHub, then its fallback copy.")}</small></span>
          <span className="row">
            <label className="btn files-add"><Upload size={14} />{tr("Envoyer un fichier HTML", "Upload an HTML file")}<input type="file" accept=".html,text/html" disabled={busy} onChange={(event) => void upload(event)} /></label>
            {state.data?.active && <Button className="danger" disabled={busy} onClick={() => run(() => apiData("api/games/dino/override", "DELETE"), tr("Version manuelle retirée", "Manual version removed"))}>{tr("Retirer", "Remove")}</Button>}
          </span>
        </li>
      </ul>
      {error && <p className="bad small" role="alert">{error}</p>}
    </section>
  );
}
