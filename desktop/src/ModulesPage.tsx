import { Fragment, useState } from "react";
import { ModuleStatus } from "./api";
import { lang, t } from "./i18n";

interface Props {
  modules: ModuleStatus[];
  checking: boolean;
  checkedAt: Date | null;
  busy: Record<string, string>;
  errors: Record<string, string>;
  onRun: (status: ModuleStatus) => void;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
}

const ACTIONABLE = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];
const HINTS = { openToUpdate: "hint.openToUpdate", releasePage: "hint.releasePage", closeToUpdate: "hint.closeToUpdate" } as const;

function statusLabel(status: ModuleStatus): string {
  if (status.module.updatePolicy === "web") return t("webOnly");
  if (status.running) return t("running");
  if (!status.installed) return t("notInstalled");
  if (status.action === "open" && status.latest) return t("upToDate");
  if (status.action !== "open") return t("updateAvailable");
  return "—";
}

export default function ModulesPage({ modules, checking, checkedAt, busy, errors, onRun, onRefresh, onDismiss }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <>
      <div className="pagehead">
        <h1>{t("modules")}</h1>
        <span className="muted" role="status">
          {checking ? t("checking") : checkedAt ? t("checkedAt", { time: checkedAt.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) }) : ""}
        </span>
        <button className="btn" disabled={checking} onClick={onRefresh}>{t("refresh")}</button>
      </div>
      <div className="tablebox">
        <table>
          <thead>
            <tr>
              <th>{t("module")}</th>
              <th>{t("installed")}</th>
              <th>{t("available")}</th>
              <th>{t("status")}</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {modules.map((status) => {
              const { module, installed, latest, feedError, action } = status;
              const open = expanded === module.id;
              const working = busy[module.id];
              const hint = action in HINTS ? t(HINTS[action as keyof typeof HINTS]) : null;
              const primary = action === "update" || action === "install";
              return (
                <Fragment key={module.id}>
                  <tr>
                    <td>
                      <button className="rowname" aria-expanded={open} onClick={() => setExpanded(open ? null : module.id)}>
                        <b>{module.name}</b>
                        <small>{module.summary[lang]}</small>
                      </button>
                    </td>
                    <td className="mono">{installed ?? "—"}</td>
                    <td className={`mono ${action === "update" || action === "openToUpdate" ? "fresh" : ""}`}>
                      {module.updatePolicy === "web" ? "—" : latest?.version ?? (feedError ? "?" : "—")}
                    </td>
                    <td>{statusLabel(status)}</td>
                    <td className="actions">
                      {working ? (
                        <span className="working" role="status">{working}</span>
                      ) : ACTIONABLE.includes(action) ? (
                        <button className={primary ? "btn primary" : "btn"} onClick={() => onRun(status)}>{t(`action.${action}`)}</button>
                      ) : (
                        <span className="muted">{t(`action.${action}`)}</span>
                      )}
                    </td>
                  </tr>
                  {errors[module.id] && (
                    <tr className="errorrow">
                      <td colSpan={5}>
                        <div role="alert">
                          <span>{errors[module.id]}</span>
                          <button className="btn" onClick={() => onRun(status)}>{t("retry")}</button>
                          <button className="btn" onClick={() => onDismiss(module.id)}>{t("dismiss")}</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {feedError && !errors[module.id] && (
                    <tr className="noterow">
                      <td colSpan={5}>{t("feedDown", { error: feedError })}</td>
                    </tr>
                  )}
                  {open && (
                    <tr className="detailrow">
                      <td colSpan={5}>
                        <dl>
                          <dt>{t("source")}</dt>
                          <dd className="mono">{module.repo}</dd>
                          <dt>{t("policy")}</dt>
                          <dd>{t(`policy.${module.updatePolicy}`)}</dd>
                          <dt>{t("platforms")}</dt>
                          <dd>
                            {Object.entries(module.platforms)
                              .map(([platform, level]) => `${platform} : ${t(`platform.${level}`)}`)
                              .join(" · ")}
                          </dd>
                        </dl>
                        {hint && <p>{hint}</p>}
                        {latest?.notes && <p className="notes">{latest.notes.replace(/^#+\s*/gm, "").replace(/[`*]/g, "")}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
