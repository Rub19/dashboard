import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, LogOut } from "lucide-react";
import { about, JournalEntry, openSite, Profile, readJournal } from "./api";
import { errorText, Key, lang, t } from "./i18n";
import { pageStagger, SPRING_PILL, SPRING_SWAP, staggerItem } from "./motion";
import { AccentId, ACCENTS, applyAppearance, currentAccent, currentTheme, setLanguage, Theme } from "./settings";
import { Button } from "./ui";

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readJournal().then(setEntries, (reason) => setError(errorText(reason)));
  }, []);

  return (
    <>
      <div className="pagehead"><h1>{t("journal")}</h1></div>
      {error && <p role="alert" className="bad">{error}</p>}
      {entries?.length === 0 && <p className="muted empty">{t("emptyJournal")}</p>}
      {!!entries?.length && (
        <div className="panel">
          <table>
            <thead>
              <tr><th>{t("time")}</th><th>{t("module")}</th><th>{t("operation")}</th><th>{t("result")}</th><th>{t("detail")}</th></tr>
            </thead>
            <motion.tbody variants={pageStagger} initial="initial" animate="animate">
              {entries.map((entry, index) => (
                <motion.tr key={`${entry.time}-${index}`} variants={staggerItem}>
                  <td className="mono">{new Date(entry.time * 1000).toLocaleString(lang)}</td>
                  <td>{entry.module}</td>
                  <td>{entry.operation === "install" || entry.operation === "open" ? t(`operation.${entry.operation}` as Key) : entry.operation}</td>
                  <td className={entry.ok ? "fresh" : "bad"}>{entry.ok ? t("success") : t("failure")}</td>
                  <td>{entry.detail}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function SettingsPage({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const [accent, setAccent] = useState<AccentId>(currentAccent);

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    applyAppearance(next, accent);
  };
  const chooseAccent = (next: AccentId) => {
    setAccent(next);
    applyAppearance(theme, next);
  };

  return (
    <>
      <div className="pagehead"><h1>{t("settings")}</h1></div>
      <motion.div className="settings" variants={pageStagger} initial="initial" animate="animate">
        <motion.section className="panel pad" variants={staggerItem}>
          <h2>{t("appearance")}</h2>
          <div className="setting">
            <span>{t("theme")}</span>
            <div className="segmented" role="group" aria-label={t("theme")}>
              {(["system", "dark", "light"] as Theme[]).map((item) => (
                <button key={item} type="button" aria-pressed={theme === item} className={theme === item ? "on" : ""} onClick={() => chooseTheme(item)}>
                  {theme === item && <motion.span layoutId="theme-pill" className="segmented-pill" transition={SPRING_PILL} />}
                  <span>{t(`theme.${item}` as Key)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="setting">
            <span>{t("accent")}</span>
            <div className="swatches" role="group" aria-label={t("accent")}>
              {ACCENTS.map((item) => (
                <motion.button key={item.id} type="button" whileTap={{ scale: 0.88 }} transition={SPRING_SWAP} aria-label={item.id} aria-pressed={accent === item.id} style={{ background: item.color, color: item.on }} onClick={() => chooseAccent(item.id)}>
                  {accent === item.id && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_SWAP} className="tile-swap"><Check size={14} /></motion.span>}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="setting">
            <span>{t("language")}</span>
            <div className="segmented" role="group" aria-label={t("language")}>
              {(["fr", "en"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={lang === item} className={lang === item ? "on" : ""} onClick={() => lang !== item && setLanguage(item)}>
                  {lang === item && <span className="segmented-pill" />}
                  <span>{item === "fr" ? "Français" : "English"}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.section>
        <motion.section className="panel pad" variants={staggerItem}>
          <h2>{t("account")}</h2>
          <div className="setting">
            <span className="stack"><b>{profile.name}</b><small className="muted">{profile.email}</small></span>
            <div className="row">
              <Button onClick={() => openSite("account")}>{t("manageAccount")}</Button>
              <Button onClick={onSignOut}><LogOut size={14} />{t("signOut")}</Button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </>
  );
}

export function AboutPage() {
  const [info, setInfo] = useState<{ version: string; catalogSchema: number } | null>(null);

  useEffect(() => {
    about().then(setInfo);
  }, []);

  return (
    <>
      <div className="pagehead"><h1>{t("about")}</h1></div>
      <div className="panel pad">
        <p className="prose">{t("aboutText")}</p>
        {info && (
          <dl>
            <dt>{t("version")}</dt>
            <dd className="mono">{info.version}</dd>
            <dt>{t("catalog")}</dt>
            <dd className="mono">{info.catalogSchema}</dd>
          </dl>
        )}
      </div>
    </>
  );
}
