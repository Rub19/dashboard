import { useEffect, useState } from "react";
import { apiCall, apiData, itemsList, openSite, restCall } from "./api";
import { clearCache } from "./cache";
import { firstArray, Json } from "./generic";
import { errorText, lang, tr } from "./i18n";
import { formatBytes, PageHead, Stat, Status, useLoad } from "./kit";
import { toast } from "./qol";
import { applyInterfacePreferences, currentInterfacePreferences } from "./settings";
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
    </>
  );
}

