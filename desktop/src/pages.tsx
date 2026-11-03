import { PageHead } from "./kit";
import { ChangeEvent, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DesktopPrefs, hdvBackground, notifyWindows, readDesktopPrefs, saveDesktopPrefs } from "./notifications";
import { motion } from "framer-motion";
import { Check, CheckCircle2, LogOut, XCircle } from "lucide-react";
import { about, JournalEntry, openSite, Profile, readJournal, SitePage } from "./api";
import { errorText, Key, lang, t, tr } from "./i18n";
import { listItem, listStagger, SPRING_PILL, SPRING_SWAP } from "./motion";
import { AccentId, ACCENTS, applyAppearance, applyInterfacePreferences, currentAccent, currentInterfacePreferences, currentLook, currentTheme, applyLook, LookId, LOOKS, DEFAULT_INTERFACE_PREFERENCES, Density, exportSettings, InterfacePreferences, MotionPreference, parseSettings, setLanguage, TextScale, Theme, TransparencyPreference, write } from "./settings";
import { Button } from "./ui";
import { toast } from "./qol";
import { UiPack } from "./sounds";
import { choosePack, currentPack } from "./ui-sound";

const LEGAL: [SitePage, Key][] = [["terms", "terms"], ["privacy", "privacy"], ["cookies", "cookies"], ["legal", "legal"]];

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readJournal().then(setEntries, (reason) => setError(errorText(reason)));
  }, []);

  return (
    <>
      <PageHead title={t("journal")} />
      {error && <p role="alert" className="bad">{error}</p>}
      {entries?.length === 0 && <p className="muted empty">{t("emptyJournal")}</p>}
      {!!entries?.length && (
        <motion.ul className="log" variants={listStagger} initial="initial" animate="animate">
          {entries.map((entry, index) => (
            <motion.li key={`${entry.time}-${index}`} variants={listItem}>
              {entry.ok ? <CheckCircle2 size={16} className="ok" aria-label={t("success")} /> : <XCircle size={16} className="bad" aria-label={t("failure")} />}
              <span className="log-main">
                <b>{entry.module}</b>
                <small className="muted">{entry.operation === "install" || entry.operation === "open" ? t(`operation.${entry.operation}` as Key) : entry.operation} : {entry.detail}</small>
              </span>
              <time className="muted small">{new Date(entry.time * 1000).toLocaleString(lang)}</time>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </>
  );
}

function DesktopSwitch({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <li>
      <span className="stack"><b>{title}</b><small className="muted">{text}</small></span>
      <label className="switch" aria-label={title}>
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="switch-track"><motion.span layout transition={SPRING_PILL} className="switch-thumb" /></span>
      </label>
    </li>
  );
}

export function DesktopSettings() {
  const [autostart, setAutostart] = useState(false);
  const [prefs, setPrefs] = useState<DesktopPrefs>(readDesktopPrefs);
  const [hdv, setHdv] = useState<string | null>(null);
  useEffect(() => {
    void invoke<boolean>("autostart_get").then(setAutostart).catch(() => undefined);
    void hdvBackground(prefs.hdvBackground).then(setHdv).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleHdv = (next: boolean) => {
    change({ hdvBackground: next });
    hdvBackground(next).then(setHdv, () => toast(tr("HDV Tracker n'a pas répondu", "HDV Tracker did not respond"), { tone: "bad" }));
  };
  const hdvText = hdv === "absent" ? tr("HDV Tracker n'est pas installé.", "HDV Tracker is not installed.") : hdv === "needsUpdate" ? tr("Mets à jour HDV Tracker en version 1.6 pour l'activer.", "Update HDV Tracker to version 1.6 to enable this.") : hdv === "running" ? tr("Actif : les prix sont relevés tant qu'Ethone est ouvert.", "Active: prices are tracked while Ethone is open.") : tr("Relève les prix sans fenêtre tant qu'Ethone est ouvert.", "Tracks prices with no window while Ethone is open.");
  const change = (next: Partial<DesktopPrefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveDesktopPrefs(merged);
  };
  const toggleAutostart = (next: boolean) => {
    invoke("autostart_set", { enabled: next }).then(() => setAutostart(next), () => toast(tr("Réglage Windows non modifié", "Windows setting not changed"), { tone: "bad" }));
  };
  const save = () => {
    invoke<string>("settings_export", { content: exportSettings() }).then((path) => toast(tr(`Réglages enregistrés dans ${path}`, `Settings saved to ${path}`)), () => toast(tr("Export impossible", "Export failed"), { tone: "bad" }));
  };
  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      for (const [key, value] of parseSettings(await file.text())) write(key, value);
      window.location.reload();
    } catch {
      toast(tr("Ce fichier n'est pas un export d'Ethone", "This file is not an Ethone export"), { tone: "bad" });
    }
  };
  return (
    <>
      <PageHead title={tr("Windows et notifications", "Windows and notifications")} text={tr("Comment Ethone se comporte sur ce PC.", "How Ethone behaves on this PC.")} />
      <ul className="settings settings-grid">
        <DesktopSwitch title={tr("Lancer avec Windows", "Start with Windows")} text={tr("Ethone démarre réduit dans la zone de notification.", "Ethone starts minimized to the notification area.")} checked={autostart} onChange={toggleAutostart} />
        <DesktopSwitch title={tr("Réduire à la fermeture", "Minimize on close")} text={tr("La croix garde Ethone actif dans la zone de notification.", "The close button keeps Ethone running in the notification area.")} checked={prefs.closeToTray} onChange={(closeToTray) => change({ closeToTray })} />
        <DesktopSwitch title={tr("HDV Tracker en arrière-plan", "HDV Tracker in the background")} text={hdvText} checked={prefs.hdvBackground} onChange={toggleHdv} />
        <DesktopSwitch title={tr("Notifier les nouveaux mails", "Notify new mail")} text={tr("Vérifié toutes les 2 minutes tant qu'Ethone est ouvert.", "Checked every 2 minutes while Ethone is open.")} checked={prefs.notifyMail} onChange={(notifyMail) => change({ notifyMail })} />
        <DesktopSwitch title={tr("Rappeler les événements", "Remind events")} text={tr("Une notification 10 minutes avant le début.", "A notification 10 minutes before the start.")} checked={prefs.notifyEvents} onChange={(notifyEvents) => change({ notifyEvents })} />
        <li>
          <span className="stack"><b>{tr("Tester les notifications", "Test notifications")}</b><small className="muted">{tr("Envoie une notification Windows.", "Sends a Windows notification.")}</small></span>
          <Button onClick={() => void notifyWindows("Ethone", tr("Les notifications fonctionnent.", "Notifications work.")).catch(() => toast(tr("Notification impossible", "Notification failed"), { tone: "bad" }))}>{tr("Tester", "Test")}</Button>
        </li>
        <li>
          <span className="stack"><b>{tr("Sauvegarder les réglages", "Back up settings")}</b><small className="muted">{tr("Exporte tes préférences dans Téléchargements, ou les restaure depuis un fichier.", "Exports your preferences to Downloads, or restores them from a file.")}</small></span>
          <div className="row">
            <Button onClick={save}>{tr("Exporter", "Export")}</Button>
            <label className="btn files-add">{tr("Importer", "Import")}<input type="file" accept=".json" onChange={(event) => void load(event)} /></label>
          </div>
        </li>
      </ul>
    </>
  );
}

export function SettingsPage() {
  const [look, setLook] = useState<LookId>(currentLook);
  const [pack, setPack] = useState<UiPack>(currentPack);
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const [accent, setAccent] = useState<AccentId>(currentAccent);
  const [preferences, setPreferences] = useState<InterfacePreferences>(currentInterfacePreferences);

  const chooseLook = (next: LookId) => {
    applyLook(next);
    setLook(next);
    setTheme(currentTheme());
    setAccent(currentAccent());
  };
  const chooseAccent = (next: AccentId) => {
    setAccent(next);
    applyAppearance(theme, next);
  };
  const choosePreference = <K extends keyof InterfacePreferences>(key: K, value: InterfacePreferences[K]) => {
    setPreferences(applyInterfacePreferences({ ...preferences, [key]: value }));
  };
  const reset = () => {
    setPreferences(applyInterfacePreferences(DEFAULT_INTERFACE_PREFERENCES));
    chooseLook("ethone");
    toast(tr("Apparence réinitialisée", "Appearance reset"));
  };

  return (
    <>
      <PageHead title={tr("Apparence", "Appearance")} text={tr("Choisis l'ambiance de toute l'application.", "Choose the mood of the whole app.")} />
      <div className="theme-gallery" role="group" aria-label={t("theme")}>
        {LOOKS.map((item) => (
          <motion.button key={item.id} type="button" className={look === item.id ? "theme-card on" : "theme-card"} aria-pressed={look === item.id} whileTap={{ scale: 0.98 }} transition={SPRING_SWAP} onClick={() => chooseLook(item.id)}>
            <span className="theme-preview" style={{ backgroundColor: item.colors[0], backgroundImage: `radial-gradient(70% 90% at 90% 0%, ${item.colors[1]}, transparent 70%), radial-gradient(70% 90% at 0% 100%, ${item.colors[2]}, transparent 70%)` }}>
              <i className={item.id === "daylight" ? "light" : ""} /><i className={item.id === "daylight" ? "light" : ""} /><em style={{ background: item.colors[1] }} />
              {look === item.id && <motion.b initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SWAP}><Check size={13} /></motion.b>}
            </span>
            <span className="theme-name"><b>{lang === "fr" ? item.fr : item.en}</b><small>{lang === "fr" ? item.textFr : item.textEn}</small></span>
          </motion.button>
        ))}
      </div>
      <ul className="settings settings-grid">
        <li>
          <span>{t("accent")}</span>
          <div className="swatches" role="group" aria-label={t("accent")}>
            {ACCENTS.map((item) => (
              <motion.button key={item.id} type="button" whileTap={{ scale: 0.9 }} transition={SPRING_SWAP} aria-label={item.id} aria-pressed={accent === item.id} style={{ background: item.color, color: item.on }} onClick={() => chooseAccent(item.id)}>
                {accent === item.id && <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING_SWAP} className="swap"><Check size={14} /></motion.span>}
              </motion.button>
            ))}
          </div>
        </li>
        <li>
          <span>{t("language")}</span>
          <div className="segmented" role="group" aria-label={t("language")}>
            {(["fr", "en"] as const).map((item) => (
              <button key={item} type="button" aria-pressed={lang === item} className={lang === item ? "on" : ""} onClick={() => lang !== item && setLanguage(item)}>
                {lang === item && <span className="segmented-pill" />}
                <span>{item === "fr" ? "Français" : "English"}</span>
              </button>
            ))}
          </div>
        </li>
        <li>
          <span className="stack"><b>{tr("Densité", "Density")}</b><small className="muted">{tr("Adapte les espacements et la hauteur des contrôles.", "Adjusts spacing and control height.")}</small></span>
          <div className="segmented" role="group" aria-label={tr("Densité", "Density")}>
            {(["comfortable", "compact"] as Density[]).map((item) => (
              <button key={item} type="button" className={preferences.density === item ? "on" : ""} aria-pressed={preferences.density === item} onClick={() => choosePreference("density", item)}>
                {preferences.density === item && <span className="segmented-pill" />}
                <span>{item === "comfortable" ? tr("Confortable", "Comfortable") : tr("Compact", "Compact")}</span>
              </button>
            ))}
          </div>
        </li>
        <li>
          <span className="stack"><b>{tr("Taille du texte", "Text size")}</b><small className="muted">{tr("Agrandit les textes sans changer le scaling Windows.", "Enlarges text without changing Windows scaling.")}</small></span>
          <select className="settings-select" value={preferences.textScale} aria-label={tr("Taille du texte", "Text size")} onChange={(event) => choosePreference("textScale", Number(event.target.value) as TextScale)}>
            {([90, 100, 110, 125] as TextScale[]).map((value) => <option key={value} value={value}>{value} %</option>)}
          </select>
        </li>
        <li>
          <span className="stack"><b>{tr("Animations", "Animations")}</b><small className="muted">{tr("Suit Windows ou réduit les mouvements dans toute l'application.", "Follows Windows or reduces motion throughout the app.")}</small></span>
          <div className="segmented" role="group" aria-label={tr("Animations", "Animations")}>
            {(["system", "reduced"] as MotionPreference[]).map((item) => (
              <button key={item} type="button" className={preferences.motion === item ? "on" : ""} aria-pressed={preferences.motion === item} onClick={() => choosePreference("motion", item)}>
                {preferences.motion === item && <span className="segmented-pill" />}
                <span>{item === "system" ? "Windows" : tr("Réduites", "Reduced")}</span>
              </button>
            ))}
          </div>
        </li>
        <li>
          <span className="stack"><b>{tr("Transparence", "Transparency")}</b><small className="muted">{tr("Suit Windows ou utilise des surfaces opaques.", "Follows Windows or uses opaque surfaces.")}</small></span>
          <div className="segmented" role="group" aria-label={tr("Transparence", "Transparency")}>
            {(["system", "reduced"] as TransparencyPreference[]).map((item) => (
              <button key={item} type="button" className={preferences.transparency === item ? "on" : ""} aria-pressed={preferences.transparency === item} onClick={() => choosePreference("transparency", item)}>
                {preferences.transparency === item && <span className="segmented-pill" />}
                <span>{item === "system" ? "Windows" : tr("Opaque", "Opaque")}</span>
              </button>
            ))}
          </div>
        </li>
        <li>
          <span className="stack"><b>{tr("Sons de l'interface", "Interface sounds")}</b><small className="muted">{tr("Un petit son quand tu cliques sur un bouton.", "A small sound when you click a button.")}</small></span>
          <select className="settings-select" value={pack} aria-label={tr("Sons de l'interface", "Interface sounds")} onChange={(event) => { const next = event.target.value as UiPack; setPack(next); choosePack(next); }}>
            <option value="off">{tr("Aucun", "None")}</option>
            <option value="soft">{tr("Doux", "Soft")}</option>
            <option value="crisp">{tr("Net", "Crisp")}</option>
            <option value="retro">{tr("Rétro", "Retro")}</option>
          </select>
        </li>
        <li>
          <span className="stack"><b>{tr("Réinitialiser l'apparence", "Reset appearance")}</b><small className="muted">{tr("Restaure le thème automatique et les réglages par défaut.", "Restores the automatic theme and default settings.")}</small></span>
          <Button onClick={reset}>{tr("Réinitialiser", "Reset")}</Button>
        </li>
      </ul>
    </>
  );
}

export function AccountCard({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  return (
    <ul className="settings">
      <li>
        <span className="stack"><b>{profile.name}</b><small className="muted">{profile.email}</small></span>
        <div className="row">
          <Button onClick={() => openSite("account")}>{t("manageAccount")}</Button>
          <Button onClick={onSignOut}><LogOut size={14} />{t("signOut")}</Button>
        </div>
      </li>
    </ul>
  );
}

export function AboutPage() {
  const [info, setInfo] = useState<{ version: string; catalogSchema: number } | null>(null);

  useEffect(() => {
    about().then(setInfo);
  }, []);

  return (
    <>
      <PageHead title={t("about")} />
      <p className="prose">{t("aboutText")}</p>
      <ul className="settings">
        <li><span>{t("version")}</span><span className="muted">{info?.version ?? "—"}</span></li>
        <li><span>{t("catalog")}</span><span className="muted">{info?.catalogSchema ?? "—"}</span></li>
        <li>
          <span>{t("legalLinks")}</span>
          <span className="row">
            {LEGAL.map(([page, label]) => <button key={page} type="button" className="link" onClick={() => openSite(page)}>{t(label)}</button>)}
          </span>
        </li>
      </ul>
    </>
  );
}
