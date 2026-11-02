import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, CircleCheck, Crosshair, RefreshCw, WifiOff } from "lucide-react";
import { EthoneItem, itemsList, ModuleStatus, Profile } from "./api";
import { dayProgress, connectionStatus, hasModuleUpdate, openTasks, summarizeModules, todayEvents } from "./home";
import { errorText, Key, t } from "./i18n";
import { AppIcon, Busy } from "./ModulesPage";
import { EASE_SNAP, listItem, listStagger } from "./motion";
import { Button } from "./ui";

interface Props {
  profile: Profile;
  modules: ModuleStatus[];
  busy: Record<string, Busy>;
  checking: boolean;
  offline: boolean;
  error: string | null;
  onRefresh: () => void;
  onRun: (status: ModuleStatus) => void;
  onOpenApplications: () => void;
  onOpenProductivity: () => void;
  onOpenTracker: () => void;
}

const RUNNABLE = new Set<ModuleStatus["action"]>(["open", "openWeb", "install", "update", "openToUpdate", "releasePage"]);
const longDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const clockFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function greeting(now: Date): string {
  const hour = now.getHours();
  const key: Key = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return t(key);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Agenda({ onOpen, offline }: { onOpen: () => void; offline: boolean }) {
  const now = useNow();
  const [tasks, setTasks] = useState<EthoneItem[] | null>(null);
  const [events, setEvents] = useState<EthoneItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([itemsList("tasks"), itemsList("events")]).then(
      ([taskList, eventList]) => {
        if (!active) return;
        setTasks(taskList);
        setEvents(eventList);
      },
      (reason) => active && setError(errorText(reason)),
    );
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="today-note">{offline ? t("offlineSession") : error}</p>;
  if (!tasks || !events) return <div className="today-loading" aria-busy="true" aria-label={t("loading")}><span /><span /><span /></div>;

  const agenda = todayEvents(events, now);
  const todo = openTasks(tasks);
  return (
    <div className="today">
      <div className="today-trace" aria-hidden="true">
        <motion.span initial={{ transform: "scaleY(0)" }} animate={{ transform: `scaleY(${dayProgress(now)})` }} transition={{ duration: 0.9, ease: EASE_SNAP }} />
      </div>
      <div className="today-lists">
        <section aria-labelledby="today-events">
          <h2 id="today-events">{t("calendar")}</h2>
          {agenda.length === 0 ? <p className="muted">{t("homeNoEvents")}</p> : (
            <motion.ul variants={listStagger} initial="initial" animate="animate">
              {agenda.map((item) => (
                <motion.li key={item.id} variants={listItem}><time>{item.startAt ? clockFormat.format(new Date(item.startAt)) : ""}</time><b>{item.title}</b></motion.li>
              ))}
            </motion.ul>
          )}
        </section>
        <section aria-labelledby="today-tasks">
          <h2 id="today-tasks">{t("tasks")}{todo.length > 0 && <small>{todo.length}</small>}</h2>
          {todo.length === 0 ? <p className="muted">{t("homeNoTasks")}</p> : (
            <motion.ul variants={listStagger} initial="initial" animate="animate">
              {todo.slice(0, 6).map((item) => <motion.li key={item.id} variants={listItem}><span className="today-dot" /><b>{item.title}</b></motion.li>)}
            </motion.ul>
          )}
        </section>
        <Button onClick={onOpen}><CalendarDays size={15} />{t("homeOpenProductivity")}</Button>
      </div>
    </div>
  );
}

export default function HomePage({ profile, modules, busy, checking, offline, error, onRefresh, onRun, onOpenApplications, onOpenProductivity, onOpenTracker }: Props) {
  const now = useNow();
  const summary = summarizeModules(modules);
  const status = connectionStatus(offline, error);
  const StatusIcon = status === "degraded" ? AlertTriangle : status === "offline" ? WifiOff : CircleCheck;

  return (
    <div className="home">
      <header className="home-hero">
        <div>
          <p className="home-date">{longDate.format(now)}</p>
          <h1>{greeting(now)}, {profile.name}</h1>
        </div>
        <div className="home-meta">
          <span className={`home-link ${status}`}><StatusIcon size={15} />{t(status === "degraded" ? "degraded" : status === "offline" ? "offline" : "operational")}</span>
          <button type="button" className="icon-btn" aria-label={t("refresh")} title={t("refresh")} disabled={checking} onClick={onRefresh}><RefreshCw size={15} className={checking ? "spin" : ""} /></button>
        </div>
      </header>

      {error && (
        <div className="home-error" role="alert">
          <span>{error}</span>
          <Button onClick={onRefresh}>{t("retry")}</Button>
        </div>
      )}

      <div className="home-columns">
        <Agenda onOpen={onOpenProductivity} offline={offline} />
        <div className="home-apps">
          <div className="section-head">
            <div>
              <h2>{t("modules")}</h2>
              <p className="muted small">{t("installedCount", { count: String(summary.installed), total: String(summary.total) })}</p>
            </div>
            <button type="button" className="link" onClick={onOpenApplications}>{t("seeApplications")}<ArrowRight size={13} /></button>
          </div>
          <button type="button" className="home-eval" onClick={onOpenTracker}>
            <Crosshair size={20} />
            <span><b>E:VAL</b><small>{t("evalTagline")}</small></span>
            <ArrowRight size={16} />
          </button>
          {modules.length === 0 && !checking && <p className="muted empty">{t("noApplications")}</p>}
          <ul>
            {modules.map((status) => {
              const running = busy[status.module.id];
              const update = hasModuleUpdate(status);
              return (
                <li key={status.module.id}>
                  <AppIcon id={status.module.id} />
                  <span className="home-app-text">
                    <b>{status.module.name}</b>
                    <small className={update ? "fresh" : "muted"}>{running?.label ?? (update ? t("updateAvailable") : status.running ? t("statRunning") : status.installed ? `v${status.installed}` : t("notInstalled"))}</small>
                  </span>
                  {RUNNABLE.has(status.action) && <Button disabled={Boolean(running)} onClick={() => onRun(status)}>{t(`action.${status.action}` as Key)}</Button>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
