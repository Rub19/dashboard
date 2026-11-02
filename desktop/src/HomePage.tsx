import { AlertTriangle, ArrowRight, CircleCheck, Download, Play, RefreshCw, WifiOff } from "lucide-react";
import type { ModuleStatus, Profile } from "./api";
import { connectionStatus, summarizeModules } from "./home";
import { Key, t } from "./i18n";
import { Button } from "./ui";

interface Props {
  profile: Profile;
  modules: ModuleStatus[];
  checking: boolean;
  offline: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenApplications: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  const key: Key = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return t(key);
}

export default function HomePage({ profile, modules, checking, offline, error, onRefresh, onOpenApplications }: Props) {
  const summary = summarizeModules(modules);
  const loading = modules.length === 0 && checking;
  const status = connectionStatus(offline, error);
  const StatusIcon = status === "degraded" ? AlertTriangle : status === "offline" ? WifiOff : CircleCheck;

  return (
    <>
      <div className="home-head">
        <div>
          <p className="home-kicker">{t("tagline")}</p>
          <h1>{greeting()}, {profile.name}</h1>
          <p className="muted">{t("homeLine")}</p>
        </div>
        <Button disabled={checking} onClick={onRefresh}>
          <RefreshCw size={14} className={checking ? "spin" : ""} />
          {t("refresh")}
        </Button>
      </div>

      <section className="home-status" aria-labelledby="home-status-title">
        <span className={`status-mark ${status}`}><StatusIcon size={18} /></span>
        <span>
          <b id="home-status-title">{t(status === "degraded" ? "degraded" : status === "offline" ? "offline" : "operational")}</b>
          <small className="muted">{t(status === "degraded" ? "degradedSession" : status === "offline" ? "offlineSession" : "connectedSession")}</small>
        </span>
      </section>

      {error && (
        <div className="home-error" role="alert">
          <span>{error}</span>
          <Button onClick={onRefresh}>{t("retry")}</Button>
        </div>
      )}

      {loading ? (
        <div className="home-loading" aria-busy="true" aria-label={t("loading")}>
          <span /><span /><span />
        </div>
      ) : (
        <section aria-labelledby="home-apps-title">
          <div className="section-head">
            <div>
              <h2 id="home-apps-title">{t("applicationsOverview")}</h2>
              <p className="muted small">{t("installedCount", { count: String(summary.installed), total: String(summary.total) })}</p>
            </div>
            <Button onClick={onOpenApplications}>{t("seeApplications")}<ArrowRight size={14} /></Button>
          </div>
          <dl className="home-stats">
            <div><dt><CircleCheck size={17} />{t("statInstalled")}</dt><dd>{summary.installed}</dd></div>
            <div><dt><Download size={17} />{t("statUpdates")}</dt><dd>{summary.updates}</dd></div>
            <div><dt><Play size={17} />{t("statRunning")}</dt><dd>{summary.running}</dd></div>
          </dl>
          {modules.length === 0 && <p className="muted empty">{t("noApplications")}</p>}
        </section>
      )}
    </>
  );
}
