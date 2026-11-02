import { useEffect, useState } from "react";
import { about, JournalEntry, readJournal } from "./api";
import { lang, t } from "./i18n";

export function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readJournal().then(setEntries, (reason) => setError(String(reason)));
  }, []);

  return (
    <>
      <div className="pagehead"><h1>{t("journal")}</h1></div>
      {error && <p role="alert" className="bad">{error}</p>}
      {entries?.length === 0 && <p className="muted">{t("emptyJournal")}</p>}
      {!!entries?.length && (
        <div className="tablebox">
          <table>
            <thead>
              <tr><th>{t("time")}</th><th>{t("module")}</th><th>{t("operation")}</th><th>{t("result")}</th><th>{t("detail")}</th></tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={`${entry.time}-${index}`}>
                  <td className="mono">{new Date(entry.time * 1000).toLocaleString(lang)}</td>
                  <td>{entry.module}</td>
                  <td>{entry.operation === "install" || entry.operation === "open" ? t(`operation.${entry.operation}`) : entry.operation}</td>
                  <td className={entry.ok ? "fresh" : "bad"}>{entry.ok ? t("success") : t("failure")}</td>
                  <td>{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
      <p className="prose">{t("aboutText")}</p>
      {info && (
        <dl className="facts">
          <dt>{t("version")}</dt>
          <dd className="mono">{info.version}</dd>
          <dt>{t("catalog")}</dt>
          <dd className="mono">{info.catalogSchema}</dd>
        </dl>
      )}
    </>
  );
}
