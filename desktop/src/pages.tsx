import { PageHead } from "./kit";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, LogOut, XCircle } from "lucide-react";
import { about, JournalEntry, openSite, Profile, readJournal, SitePage } from "./api";
import { errorText, Key, lang, t, tr } from "./i18n";
import { listItem, listStagger, SPRING_PILL, SPRING_SWAP } from "./motion";
import { AccentId, ACCENTS, applyAppearance, currentAccent, currentTheme, setLanguage, Theme } from "./settings";
import { Button } from "./ui";

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
      <PageHead title={tr("Apparence et compte", "Appearance and account")} />
      <h2 className="group-title">{t("appearance")}</h2>
      <ul className="settings">
        <li>
          <span>{t("theme")}</span>
          <div className="segmented" role="group" aria-label={t("theme")}>
            {(["system", "dark", "light"] as Theme[]).map((item) => (
              <button key={item} type="button" aria-pressed={theme === item} className={theme === item ? "on" : ""} onClick={() => chooseTheme(item)}>
                {theme === item && <motion.span layoutId="theme-pill" className="segmented-pill" transition={SPRING_PILL} />}
                <span>{t(`theme.${item}` as Key)}</span>
              </button>
            ))}
          </div>
        </li>
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
      </ul>
      <h2 className="group-title">{t("account")}</h2>
      <ul className="settings">
        <li>
          <span className="stack"><b>{profile.name}</b><small className="muted">{profile.email}</small></span>
          <div className="row">
            <Button onClick={() => openSite("account")}>{t("manageAccount")}</Button>
            <Button onClick={onSignOut}><LogOut size={14} />{t("signOut")}</Button>
          </div>
        </li>
      </ul>
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
