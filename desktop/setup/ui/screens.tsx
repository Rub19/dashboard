import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Check, CircleAlert, FolderOpen, Gamepad2, Loader2, PackagePlus, RotateCcw, SlidersHorizontal, Trash2, X, Zap } from "lucide-react";
import { errorText, hasText, Key, lang, t } from "../../src/i18n";
import { listItem, listStagger, SPRING_GLIDE, SPRING_PILL } from "../../src/motion";
import { BrandMark, Button } from "../../src/ui";
import { Item, Row, SetupState } from "./types";

const ICONS = import.meta.glob<string>("../../src/assets/modules/*.png", { eager: true, import: "default" });
const SELECTABLE = ["available", "update"];

function megabytes(bytes: number) {
  const value = bytes / 1048576;
  if (value >= 1024) return `${Math.round(value / 1024)} ${lang === "fr" ? "Go" : "GB"}`;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${lang === "fr" ? "Mo" : "MB"}`;
}

function Icon({ id }: { id: string }) {
  const icon = ICONS[`../../src/assets/modules/${id}.png`];
  if (icon) return <img className="app-icon" src={icon} alt="" />;
  if (id === "ethone") return <span className="app-icon brand"><BrandMark size={44} /></span>;
  return <span className="app-icon glyph"><Gamepad2 size={20} /></span>;
}

function Head({ title, text }: { title: string; text?: string }) {
  return (
    <div className="setup-head">
      <h1>{title}</h1>
      {text && <p className="muted">{text}</p>}
    </div>
  );
}

export function Legal() {
  return (
    <span className="setup-legal">
      <button type="button" className="link" onClick={() => invoke("setup_link", { page: "terms" })}>{t("terms")}</button>
      <button type="button" className="link" onClick={() => invoke("setup_link", { page: "privacy" })}>{t("privacy")}</button>
    </span>
  );
}

export function WelcomeScreen({ state, onStandard, onCustom }: { state: SetupState; onStandard: () => void; onCustom: () => void }) {
  return (
    <>
      <div className="setup-hero">
        <span className="hero-mark"><BrandMark size={76} /></span>
        <h1>{t("setupWelcome")}</h1>
        <p className="muted">{t("setupWelcomeText")}</p>
      </div>
      <div className="setup-choices">
        <motion.button type="button" className="choice primary" whileTap={{ scale: 0.985 }} onClick={onStandard}>
          <Zap size={20} />
          <span><b>{t("setupStandard")}</b><small>{t("setupStandardText")}</small></span>
          <ChevronRight size={18} />
        </motion.button>
        <button type="button" className="choice" onClick={onCustom}>
          <SlidersHorizontal size={20} />
          <span><b>{t("setupCustom")}</b><small>{t("setupCustomText")}</small></span>
          <ChevronRight size={18} />
        </button>
      </div>
      <footer className="setup-foot"><span className="muted small">{t("setupNoAdmin")}</span><span className="muted small">{t("versionLine", { version: state.version })}</span></footer>
    </>
  );
}

export function MaintenanceScreen({ state, error, onAdd, onRepair, onUninstall, onRecheck }: { state: SetupState; error: string | null; onAdd: () => void; onRepair: () => void; onUninstall: () => void; onRecheck: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const blocked = state.running;
  return (
    <>
      <Head title={t("setupInstalledTitle")} text={t("setupInstalledText", { version: state.installed ?? "" })} />
      {blocked && (
        <div role="alert" className="setup-note">
          <CircleAlert size={16} />
          <span>{t("setupCloseEthone")}</span>
          <Button onClick={onRecheck}>{t("retry")}</Button>
        </div>
      )}
      {error && <p role="alert" className="setup-note bad">{setupError(error)}</p>}
      <div className="setup-actions">
        <button type="button" className="action" onClick={onAdd}><PackagePlus size={20} /><span><b>{t("setupAdd")}</b><small>{t("setupAddText")}</small></span></button>
        <button type="button" className="action" disabled={blocked} onClick={onRepair}><RotateCcw size={20} /><span><b>{t("setupRepair")}</b><small>{t("setupRepairText", { version: state.version })}</small></span></button>
        <button type="button" className="action danger" disabled={blocked} aria-expanded={confirm} onClick={() => setConfirm((value) => !value)}><Trash2 size={20} /><span><b>{t("setupUninstall")}</b><small>{t("setupUninstallText")}</small></span></button>
      </div>
      {confirm && (
        <div className="setup-confirm" role="group">
          <p>{t("setupUninstallConfirm")}</p>
          <span className="row"><Button onClick={() => setConfirm(false)}>{t("cancel")}</Button><Button className="danger-btn" onClick={onUninstall}>{t("setupUninstall")}</Button></span>
        </div>
      )}
    </>
  );
}

function rowNote(row: Row): string {
  if (row.status === "manual") return t("setupManual");
  if (row.status === "web") return t("setupWeb");
  if (row.status === "running") return t("setupRunning");
  if (row.status === "installed") return t("versionLine", { version: row.installed ?? "" });
  if (row.status === "unavailable") return t("action.unavailable");
  const size = row.size ? megabytes(row.size) : "";
  const version = row.status === "update" ? t("newVersionLine", { version: row.latest ?? "" }) : t("versionLine", { version: row.latest ?? "" });
  return size ? `${version}, ${size}` : version;
}

export function ModulesScreen({ rows, selected, onChange, onBack, onNext, nextIsInstall }: { rows: Row[] | null; selected: string[]; onChange: (ids: string[]) => void; onBack: () => void; onNext: () => void; nextIsInstall: boolean }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <>
      <Head title={t("setupModulesTitle")} text={t("setupModulesText")} />
      {rows === null ? (
        <ul className="pick" aria-busy="true" aria-label={t("loading")}>{[0, 1, 2, 3, 4].map((index) => <li key={index} className="pick-row skeleton" />)}</ul>
      ) : (
        <motion.ul className="pick" variants={listStagger} initial="initial" animate="animate">
          {rows.map((row) => {
            const can = SELECTABLE.includes(row.status);
            const on = selected.includes(row.id);
            return (
              <motion.li key={row.id} variants={listItem}>
                <label className={`pick-row ${can ? "" : "off"}`}>
                  <input type="checkbox" checked={on} disabled={!can} onChange={() => toggle(row.id)} />
                  <span className="check" aria-hidden="true">{on && <Check size={13} strokeWidth={3} />}</span>
                  <Icon id={row.id} />
                  <span className="app-text"><b>{row.name}</b><small>{row.summary[lang]}</small></span>
                  <span className="pick-note">{rowNote(row)}</span>
                </label>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
      <footer className="setup-foot">
        <Button onClick={onBack}>{t("setupBack")}</Button>
        <Button variant="primary" disabled={nextIsInstall && selected.length === 0} onClick={onNext}>{t(nextIsInstall ? "action.install" : "setupNext")}</Button>
      </footer>
    </>
  );
}

export function OptionsScreen({ state, rows, selected, dir, desktop, requiredBytes, onDir, onDesktop, onBack, onInstall }: { state: SetupState; rows: Row[] | null; selected: string[]; dir: string; desktop: boolean; requiredBytes: number; onDir: (dir: string) => void; onDesktop: (value: boolean) => void; onBack: () => void; onInstall: () => void }) {
  const names = ["Ethone", ...selected.map((id) => rows?.find((row) => row.id === id)?.name ?? id)];
  const tooBig = state.freeBytes !== null && requiredBytes > state.freeBytes;
  const pick = () => invoke<string | null>("setup_pick_folder", { current: dir }).then((path) => path && onDir(path));
  return (
    <>
      <Head title={t("setupOptionsTitle")} />
      <div className="field">
        <label htmlFor="dir">{t("setupFolder")}</label>
        <div className="setup-folder">
          <div className="field-box"><span className="field-icon"><FolderOpen size={16} /></span><input id="dir" value={dir} spellCheck={false} onChange={(event) => onDir(event.target.value)} /></div>
          <Button onClick={pick}>{t("setupBrowse")}</Button>
        </div>
      </div>
      <label className="switch">
        <input type="checkbox" role="switch" checked={desktop} onChange={(event) => onDesktop(event.target.checked)} />
        <span className="switch-track"><motion.span layout transition={SPRING_PILL} className="switch-thumb" /></span>
        {t("setupDesktop")}
      </label>
      <div className="setup-recap">
        <h2>{t("setupRecap")}</h2>
        <dl>
          <dt>{t("setupWillInstall")}</dt>
          <dd>{names.join(", ")}</dd>
          <dt>{t("setupSpace")}</dt>
          <dd className={tooBig ? "bad" : ""}>{requiredBytes ? t("setupSpaceValue", { size: megabytes(requiredBytes) }) : "—"}{state.freeBytes !== null && ` (${t("setupFree", { size: megabytes(state.freeBytes) })})`}</dd>
          <dt>{t("setupKeep")}</dt>
          <dd>{t("setupKeepText")}</dd>
        </dl>
      </div>
      <footer className="setup-foot">
        <Button onClick={onBack}>{t("setupBack")}</Button>
        <Button variant="primary" disabled={tooBig || !dir.trim()} onClick={onInstall}>{t("action.install")}</Button>
      </footer>
    </>
  );
}

function stageLabel(item: Item): string {
  if (item.stage === "waiting") return t("setupWaiting");
  if (item.stage === "ok") return t("success");
  if (item.stage === "failed") return t("failure");
  if (item.stage === "downloading") return t("progress.downloading", { percent: item.value === null ? "" : `${Math.round(item.value * 100)} %` }).trim();
  return t(`progress.${item.stage}` as Key);
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="progress-list">
      {items.map((item) => {
        const active = !["waiting", "ok", "failed"].includes(item.stage);
        return (
          <li key={item.id} className={`stage-${item.stage}`}>
            <Icon id={item.id} />
            <span className="app-text">
              <b>{item.name}</b>
              <small role="status">{stageLabel(item)}{item.stage === "failed" && item.detail ? ` : ${setupError(item.detail)}` : ""}</small>
              {active && (
                <span className={`line ${item.value === null ? "busy" : ""}`} role="progressbar" aria-label={item.name} aria-valuenow={item.value === null ? undefined : Math.round(item.value * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <motion.i animate={{ transform: `scaleX(${item.value ?? 1})` }} transition={SPRING_GLIDE} />
                </span>
              )}
            </span>
            {item.stage === "ok" && <Check size={18} className="ok" aria-hidden="true" />}
            {item.stage === "failed" && <CircleAlert size={18} className="bad" aria-hidden="true" />}
            {active && <Loader2 size={18} className="spin muted" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
  );
}

function overall(items: Item[]): number {
  if (items.length === 0) return 0;
  const parts = items.map((item) => (item.stage === "ok" || item.stage === "failed" ? 1 : item.stage === "waiting" ? 0 : item.value ?? (item.stage === "downloading" ? 0.1 : 0.85)));
  return parts.reduce((sum, part) => sum + part, 0) / items.length;
}

function Ring({ value, state }: { value: number; state: "busy" | "ok" | "bad" }) {
  const reduced = useReducedMotion();
  const size = 2 * Math.PI * 54;
  const pop = reduced ? {} : { initial: { opacity: 0, scale: 0.7 }, animate: { opacity: 1, scale: 1 }, transition: { type: "spring" as const, duration: 0.45, bounce: 0.3 } };
  return (
    <div className={`ring ${state}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("setupInstalling")}>
      <svg viewBox="0 0 118 118" aria-hidden="true">
        <circle className="track" cx="59" cy="59" r="54" />
        <motion.circle className="fill" cx="59" cy="59" r="54" strokeDasharray={size} initial={false} animate={{ strokeDashoffset: size * (1 - value) }} transition={reduced ? { duration: 0 } : SPRING_GLIDE} />
      </svg>
      {state === "busy" ? <b>{Math.round(value * 100)} %</b> : <motion.span {...pop}>{state === "ok" ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}</motion.span>}
    </div>
  );
}

export function ProgressScreen({ items }: { items: Item[] }) {
  return (
    <>
      <div className="install-hero">
        <Ring value={overall(items)} state="busy" />
        <div><h1>{t("setupInstalling")}</h1><p className="muted">{t("setupInstallingText")}</p></div>
      </div>
      <ItemList items={items} />
    </>
  );
}

function setupError(code: string): string {
  const key = `setupError.${code}`;
  return hasText(key) ? t(key) : errorText(code);
}

export function DoneScreen({ items, error, installed, onRetry }: { items: Item[]; error: string | null; installed: boolean; onRetry: () => void }) {
  const failed = !!error || items.some((item) => item.stage === "failed");
  return (
    <>
      <div className="install-hero">
        <Ring value={1} state={failed ? "bad" : "ok"} />
        <div><h1>{t(failed ? "setupDoneFailed" : "setupDone")}</h1><p className="muted">{t(failed ? "setupDoneFailedText" : "setupDoneText")}</p></div>
      </div>
      {error && <p role="alert" className="setup-note bad">{setupError(error)}</p>}
      <ItemList items={items} />
      <footer className="setup-foot">
        <button type="button" className="link" onClick={() => invoke("setup_link", { page: "notes" })}>{t("releaseNotes")}</button>
        <span className="row">
          {failed && <Button onClick={onRetry}>{t("retry")}</Button>}
          {installed ? <Button variant="primary" onClick={() => invoke("setup_launch")}>{t("setupOpen")}</Button> : <Button onClick={() => invoke("plugin:window|close", { label: "main" })}>{t("close")}</Button>}
        </span>
      </footer>
    </>
  );
}

export function UninstalledScreen() {
  return (
    <>
      <Head title={t("setupUninstalledTitle")} text={t("setupUninstalledText")} />
      <footer className="setup-foot"><span /><Button variant="primary" onClick={() => invoke("plugin:window|close", { label: "main" })}>{t("close")}</Button></footer>
    </>
  );
}
