import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crosshair, Download, Gamepad2, HardDrive, Play, RefreshCw, Sofa, TrendingUp } from "lucide-react";
import { ModuleStatus } from "./api";
import { Key, lang, t } from "./i18n";
import { EASE_SNAP, pageStagger, SPRING_GLIDE, staggerItem } from "./motion";
import { Button } from "./ui";

export interface Busy {
  label: string;
  value: number | null;
}

interface Props {
  name: string;
  modules: ModuleStatus[];
  checking: boolean;
  checkedAt: Date | null;
  busy: Record<string, Busy>;
  errors: Record<string, string>;
  onRun: (status: ModuleStatus) => void;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
}

const ICONS: Record<string, typeof Crosshair> = {
  kairo: Crosshair,
  "hdv-tracker": TrendingUp,
  "interior-studio": Sofa,
  "nova-pc-suite": HardDrive,
  "ethone-breach": Gamepad2,
};
const ACTIONABLE = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];
const NEEDS_UPDATE = ["update", "closeToUpdate", "openToUpdate"];
const HINTS = { openToUpdate: "hint.openToUpdate", releasePage: "hint.releasePage", closeToUpdate: "hint.closeToUpdate" } as const;

function hasUpdate(status: ModuleStatus) {
  return NEEDS_UPDATE.includes(status.action) || (status.action === "releasePage" && !!status.installed);
}

function statusLabel(status: ModuleStatus): { text: string; tone: string } {
  if (status.module.updatePolicy === "web") return { text: t("webOnly"), tone: "" };
  if (status.running) return { text: t("running"), tone: "live" };
  if (!status.installed) return { text: t("notInstalled"), tone: "" };
  if (hasUpdate(status)) return { text: t("updateAvailable"), tone: "fresh" };
  if (status.latest) return { text: t("upToDate"), tone: "good" };
  return { text: "—", tone: "" };
}

function greeting() {
  const hour = new Date().getHours();
  return t(hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");
}

export default function ModulesPage({ name, modules, checking, checkedAt, busy, errors, onRun, onRefresh, onDismiss }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const updates = modules.filter(hasUpdate).length;
  const stats = [
    { label: t("statInstalled"), value: modules.filter((status) => status.installed).length },
    { label: t("statUpdates"), value: updates },
    { label: t("statRunning"), value: modules.filter((status) => status.running).length },
  ];

  return (
    <>
      <div className="hero">
        <div>
          <h1>{greeting()}, <span className="accent-text">{name}</span></h1>
          <p className="muted">{t("homeLine")}</p>
        </div>
        <span className="muted small" role="status">
          {checking ? t("checking") : checkedAt ? t("checkedAt", { time: checkedAt.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) }) : ""}
        </span>
        <Button disabled={checking} onClick={onRefresh}>
          <RefreshCw size={14} className={checking ? "spin" : ""} />
          {t("refresh")}
        </Button>
      </div>

      <motion.ul className="stats" variants={pageStagger} initial="initial" animate="animate">
        {stats.map((stat) => (
          <motion.li key={stat.label} variants={staggerItem}>
            <b className="mono">{stat.value}</b>
            <span className="muted">{stat.label}</span>
          </motion.li>
        ))}
      </motion.ul>

      <div className="panel">
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
          <motion.tbody variants={pageStagger} initial="initial" animate="animate" key={modules.length}>
            {modules.map((status) => {
              const { module, installed, latest, feedError, action } = status;
              const open = expanded === module.id;
              const working = busy[module.id];
              const hint = action in HINTS ? t(HINTS[action as keyof typeof HINTS]) : null;
              const primary = action === "update" || action === "install";
              const label = statusLabel(status);
              const Icon = ICONS[module.id] ?? Crosshair;
              return (
                <Fragment key={module.id}>
                  <motion.tr variants={staggerItem}>
                    <td>
                      <button type="button" className="rowname" aria-expanded={open} onClick={() => setExpanded(open ? null : module.id)}>
                        <span className="tile"><Icon size={16} /></span>
                        <span className="rowname-text">
                          <b>{module.name}<ChevronDown size={13} className={`chev ${open ? "up" : ""}`} /></b>
                          <small>{module.summary[lang]}</small>
                        </span>
                      </button>
                    </td>
                    <td className="mono">{installed ?? "—"}</td>
                    <td className={`mono ${hasUpdate(status) ? "fresh" : ""}`}>{module.updatePolicy === "web" ? "—" : latest?.version ?? (feedError ? "?" : "…")}</td>
                    <td><span className={`state ${label.tone}`}>{label.text}</span></td>
                    <td className="actions">
                      {working ? (
                        <div className="working" role="status">
                          <span>{working.label}</span>
                          <span className="bar"><motion.i animate={{ scaleX: working.value ?? 1, opacity: working.value === null ? 0.45 : 1 }} transition={SPRING_GLIDE} /></span>
                        </div>
                      ) : ACTIONABLE.includes(action) ? (
                        <Button variant={primary ? "primary" : "ghost"} onClick={() => onRun(status)}>
                          {primary ? <Download size={14} /> : action === "open" ? <Play size={13} /> : null}
                          {t(`action.${action}` as Key)}
                        </Button>
                      ) : (
                        <span className="muted small">{t(`action.${action}` as Key)}</span>
                      )}
                    </td>
                  </motion.tr>
                  {errors[module.id] && (
                    <tr className="errorrow">
                      <td colSpan={5}>
                        <div role="alert">
                          <span>{errors[module.id]}</span>
                          <Button onClick={() => onRun(status)}>{t("retry")}</Button>
                          <Button onClick={() => onDismiss(module.id)}>{t("dismiss")}</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {feedError && !errors[module.id] && (
                    <tr className="noterow"><td colSpan={5}>{t("feedDown", { error: feedError })}</td></tr>
                  )}
                  <tr className="detailrow">
                    <td colSpan={5}>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: EASE_SNAP }} className="detail-clip">
                            <div className="detail">
                              <dl>
                                <dt>{t("source")}</dt>
                                <dd className="mono">{module.repo}</dd>
                                <dt>{t("policy")}</dt>
                                <dd>{t(`policy.${module.updatePolicy}` as Key)}</dd>
                                <dt>{t("platforms")}</dt>
                                <dd>{Object.entries(module.platforms).map(([platform, level]) => `${platform} : ${t(`platform.${level}` as Key)}`).join(" · ")}</dd>
                              </dl>
                              {hint && <p>{hint}</p>}
                              {latest?.notes && <p className="notes">{latest.notes.replace(/^#+\s*/gm, "").replace(/[`*]/g, "")}</p>}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </motion.tbody>
        </table>
      </div>
    </>
  );
}
