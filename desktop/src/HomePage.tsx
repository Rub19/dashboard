import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CalendarDays, CircleCheck, RefreshCw, WifiOff } from "lucide-react";
import { apiCall, apiData, EthoneItem, itemsList, ModuleStatus, Profile, riotRank, riotStatus } from "./api";
import { rankName, tierIcon } from "./eval";
import { firstArray, Json } from "./generic";
import { dayProgress, connectionStatus, hasModuleUpdate, openTasks, summarizeModules, todayEvents } from "./home";
import { errorText, Key, lang, t, tr } from "./i18n";
import { readJson } from "./settings";
import { AppIcon, Busy } from "./ModulesPage";
import { EASE_SNAP, listItem, listStagger } from "./motion";
import { Button, ValorantMark } from "./ui";

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
  onOpenMail: () => void;
  onOpenInsights: () => void;
  onOpenDaily: () => void;
}

const RUNNABLE = new Set<ModuleStatus["action"]>(["open", "openWeb", "install", "update", "openToUpdate", "releasePage"]);
const longDate = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" });
const clockFormat = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });

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

function useQuiet<T>(load: () => Promise<T>) {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    load().then((result) => active && setValue(result), () => null);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

function HomeTiles({ onMail, onTracker, onWeather, onDaily }: { onMail: () => void; onTracker: () => void; onWeather: () => void; onDaily: () => void }) {
  const unread = useQuiet(async () => (await apiCall<{ meta?: { unread?: number } }>("api/mail/inbox?folder=inbox&limit=1")).meta?.unread ?? 0);
  const rank = useQuiet(async () => ((await riotStatus()) ? riotRank<{ tier?: number; rr?: number }>() : null));
  const weather = useQuiet(async () => {
    const city = readJson<string>("ethone-weather-city") ?? "Paris";
    const data = await apiData<{ temperature?: number }>(`api/weather?city=${encodeURIComponent(city)}`);
    return { city, temperature: data.temperature };
  });
  const focus = readJson<{ completedAt: string; seconds: number }[]>("ethone-focus-history") ?? [];
  const today = new Date().toDateString();
  const focusMinutes = Math.round(focus.filter((entry) => new Date(entry.completedAt).toDateString() === today).reduce((total, entry) => total + entry.seconds, 0) / 60);
  return (
    <div className="home-tiles">
      {unread !== null && <button type="button" className="home-tile" onClick={onMail}><small>{tr("Mails non lus", "Unread mail")}</small><b>{unread}</b></button>}
      {rank && (rank.tier ?? 0) > 0 && <button type="button" className="home-tile eval" onClick={onTracker}><small>VALORANT</small><b><img src={tierIcon(rank.tier ?? 0)} alt="" />{rank.rr} RR</b><small>{rankName(rank.tier ?? 0)}</small></button>}
      {weather?.temperature !== undefined && <button type="button" className="home-tile" onClick={onWeather}><small>{weather.city}</small><b>{Math.round(Number(weather.temperature))} °C</b></button>}
      <button type="button" className="home-tile" onClick={onDaily}><small>{tr("Concentration aujourd'hui", "Focus today")}</small><b>{focusMinutes} min</b></button>
    </div>
  );
}

function RecentMail({ onOpen }: { onOpen: () => void }) {
  const mail = useQuiet(async () => {
    return firstArray(await apiCall<Json>("api/mail/inbox?folder=inbox&limit=5")) as unknown as { id: string; from_address: string; from_name?: string; subject: string }[];
  });
  if (!mail || mail.length === 0) return null;
  return (
    <section className="home-mail">
      <h2>{tr("Derniers mails", "Latest mail")}</h2>
      <ul>{mail.map((item) => <li key={item.id}><button type="button" onClick={onOpen}><b>{item.from_name || item.from_address}</b><span>{item.subject || tr("(sans objet)", "(no subject)")}</span></button></li>)}</ul>
    </section>
  );
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

export default function HomePage({ profile, modules, busy, checking, offline, error, onRefresh, onRun, onOpenApplications, onOpenProductivity, onOpenTracker, onOpenMail, onOpenInsights, onOpenDaily }: Props) {
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

      <HomeTiles onMail={onOpenMail} onTracker={onOpenTracker} onWeather={onOpenInsights} onDaily={onOpenDaily} />

      <div className="home-columns">
        <div className="home-left">
          <Agenda onOpen={onOpenProductivity} offline={offline} />
          <RecentMail onOpen={onOpenMail} />
        </div>
        <div className="home-apps">
          <div className="section-head">
            <div>
              <h2>{t("modules")}</h2>
              <p className="muted small">{t("installedCount", { count: String(summary.installed), total: String(summary.total) })}</p>
            </div>
            <button type="button" className="link" onClick={onOpenApplications}>{t("seeApplications")}<ArrowRight size={13} /></button>
          </div>
          <button type="button" className="home-eval" onClick={onOpenTracker}>
            <ValorantMark size={22} />
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
