import { PageHead } from "./kit";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, Gamepad2, Pin, PinOff } from "lucide-react";
import { ethoneUpdateCheck, ethoneUpdateInstall, ModuleStatus } from "./api";
import { errorText, Key, lang, t, tr } from "./i18n";
import { EASE_SNAP, listItem, listStagger, SPRING_GLIDE } from "./motion";
import { Button } from "./ui";

export interface Busy {
  label: string;
  value: number | null;
}

interface Props {
  name: string;
  modules: ModuleStatus[];
  checking: boolean;
  busy: Record<string, Busy>;
  errors: Record<string, string>;
  loadError: string | null;
  onRun: (status: ModuleStatus) => void;
  onRefresh: () => void;
  onDismiss: (id: string) => void;
  pinned: string[];
  onPin: (id: string) => void;
}

const ICONS = import.meta.glob<string>("./assets/modules/*.png", { eager: true, import: "default" });
const ACTIONABLE = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];
const NEEDS_UPDATE = ["update", "closeToUpdate", "openToUpdate"];
const HINTS = { openToUpdate: "hint.openToUpdate", releasePage: "hint.releasePage", closeToUpdate: "hint.closeToUpdate" } as const;
const SKELETONS = [0, 1, 2, 3, 4];

function hasUpdate(status: ModuleStatus) {
  return NEEDS_UPDATE.includes(status.action) || (status.action === "releasePage" && !!status.installed);
}

function versionLine(status: ModuleStatus): { text: string; tone: string } {
  if (status.module.updatePolicy === "web") return { text: t("webOnly"), tone: "" };
  if (hasUpdate(status)) return { text: t("newVersionLine", { version: status.latest?.version ?? "" }), tone: "fresh" };
  if (status.installed) return { text: t("versionLine", { version: status.installed }), tone: "" };
  if (status.latest) return { text: t("latestLine", { version: status.latest.version }), tone: "" };
  return { text: t("notInstalledLine"), tone: "" };
}

function summary(modules: ModuleStatus[], checking: boolean, name: string) {
  const count = modules.filter(hasUpdate).length;
  const state = count > 1 ? t("manyUpdates", { count: String(count) }) : count === 1 ? t("oneUpdate") : checking ? t("checking") : t("allUpToDate");
  return `${t("hello", { name })} ${state}`;
}

export function AppIcon({ id }: { id: string }) {
  const icon = ICONS[`./assets/modules/${id}-v2.png`] ?? ICONS[`./assets/modules/${id}.png`];
  if (icon) return <img className="app-icon" src={icon} alt="" />;
  return <span className="app-icon glyph"><Gamepad2 size={20} /></span>;
}

function Row({ status, working, error, onRun, onDismiss, pinned, onPin }: { status: ModuleStatus; working?: Busy; error?: string; onRun: () => void; onDismiss: () => void; pinned: boolean; onPin: () => void }) {
  const [open, setOpen] = useState(false);
  const { module, action, latest, feedError, running } = status;
  const line = versionLine(status);
  const primary = action === "update" || action === "install";
  const hint = action in HINTS ? t(HINTS[action as keyof typeof HINTS]) : null;

  return (
    <motion.li className="app" variants={listItem}>
      <div className="app-row">
        <button type="button" className="app-main" aria-expanded={open} aria-controls={`details-${module.id}`} onClick={() => setOpen((value) => !value)}>
          <AppIcon id={module.id} />
          <span className="app-text">
            <b>{module.name}</b>
            <small>{module.summary[lang]}</small>
          </span>
          <span className="app-state">
            <span className={line.tone}>{line.text}</span>
            {running && <small className="running">{t("running")}</small>}
          </span>
        </button>
        <div className="app-action">
          {working ? (
            <span className="working" role="status">{working.label}</span>
          ) : ACTIONABLE.includes(action) ? (
            <Button variant={primary ? "primary" : "ghost"} onClick={onRun}>
              {primary && <Download size={14} />}
              {t(`action.${action}` as Key)}
            </Button>
          ) : (
            <span className="muted small">{t(`action.${action}` as Key)}</span>
          )}
        </div>
        <button type="button" className={`icon-btn app-pin ${pinned ? "on" : ""}`} aria-pressed={pinned} aria-label={pinned ? tr(`Désépingler ${module.name}`, `Unpin ${module.name}`) : tr(`Épingler ${module.name} dans la barre`, `Pin ${module.name} to the sidebar`)} title={pinned ? tr("Désépingler", "Unpin") : tr("Épingler dans la barre", "Pin to the sidebar")} onClick={onPin}>{pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
        <button type="button" className="app-chev" tabIndex={-1} aria-hidden="true" onClick={() => setOpen((value) => !value)}>
          <ChevronDown size={15} className={`chev ${open ? "up" : ""}`} />
        </button>
      </div>
      {working && (
        <span className={`bar ${working.value === null ? "busy" : ""}`} role="progressbar" aria-label={working.label} aria-valuenow={working.value === null ? undefined : Math.round(working.value * 100)} aria-valuemin={0} aria-valuemax={100}>
          <motion.i animate={{ transform: `scaleX(${working.value ?? 1})` }} transition={SPRING_GLIDE} />
        </span>
      )}
      {error && (
        <div role="alert" className="app-error">
          <span>{error}</span>
          <Button onClick={onRun}>{t("retry")}</Button>
          <Button onClick={onDismiss}>{t("dismiss")}</Button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={`details-${module.id}`} className="app-clip" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE_SNAP }}>
            <div className="app-details">
              <dl>
                <dt>{t("source")}</dt>
                <dd>{module.repo}</dd>
                <dt>{t("policy")}</dt>
                <dd>{t(`policy.${module.updatePolicy}` as Key)}</dd>
                <dt>{t("platforms")}</dt>
                <dd>{Object.entries(module.platforms).map(([platform, level]) => `${t(`platformName.${platform}` as Key)} : ${t(`platform.${level}` as Key)}`).join(", ")}</dd>
                {status.installed && hasUpdate(status) && (<><dt>{t("installed")}</dt><dd>{status.installed}</dd></>)}
              </dl>
              {hint && <p>{hint}</p>}
              {feedError && <p className="muted">{t("feedDown", { error: feedError })}</p>}
              {latest?.notes && (
                <>
                  <h3>{t("releaseNotes")}</h3>
                  <p className="notes">{latest.notes.replace(/^#+\s*/gm, "").replace(/[`*]/g, "")}</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function EthoneUpdate() {
  const [version, setVersion] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ethoneUpdateCheck().then((update) => setVersion(update?.version ?? null), () => undefined);
  }, []);

  if (!version) return null;

  const install = () => {
    setError(null);
    setProgress(0);
    ethoneUpdateInstall(setProgress).catch((reason) => {
      setProgress(null);
      setError(errorText(reason));
    });
  };

  return (
    <div className="ethone-update">
      <span className="app-text">
        <b>{t("updateEthone", { version })}</b>
        <small role={error ? "alert" : undefined}>{error ?? t("updateEthoneText")}</small>
      </span>
      {progress === null ? (
        <Button variant="primary" onClick={install}><Download size={14} />{t("action.update")}</Button>
      ) : (
        <span className="working" role="status">{t("progress.downloading", { percent: `${Math.round(progress * 100)} %` })}</span>
      )}
    </div>
  );
}

export default function ModulesPage({ name, modules, checking, busy, errors, loadError, onRun, onRefresh, onDismiss, pinned, onPin }: Props) {
  return (
    <>
      <PageHead title={t("modules")} text={summary(modules, checking, name)} onRefresh={onRefresh} refreshing={checking} />
      <EthoneUpdate />
      {loadError && (
        <div className="home-error" role="alert">
          <span>{loadError}</span>
          <Button onClick={onRefresh}>{t("retry")}</Button>
        </div>
      )}
      {modules.length === 0 ? (
        <ul className="apps" aria-busy="true" aria-label={t("loading")}>
          {SKELETONS.map((index) => <li key={index} className="app skeleton" />)}
        </ul>
      ) : (
        <motion.ul className="apps" variants={listStagger} initial="initial" animate="animate">
          {modules.map((status) => (
            <Row key={status.module.id} pinned={pinned.includes(status.module.id)} onPin={() => onPin(status.module.id)} status={status} working={busy[status.module.id]} error={errors[status.module.id]} onRun={() => onRun(status)} onDismiss={() => onDismiss(status.module.id)} />
          ))}
        </motion.ul>
      )}
    </>
  );
}
