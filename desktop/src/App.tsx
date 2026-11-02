import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Action, installModule, ModuleStatus, modulesLocal, modulesRemote, openModule, openReleases, Progress } from "./api";
import { t } from "./i18n";
import { AboutPage, JournalPage } from "./pages";
import Palette, { Command } from "./Palette";
import ModulesPage from "./ModulesPage";

export type Page = "modules" | "journal" | "about";
const CHECK_EVERY = 6 * 60 * 60 * 1000;
const PAGES: Page[] = ["modules", "journal", "about"];
const CAN_RUN: Action[] = ["open", "openWeb", "install", "update", "openToUpdate", "releasePage"];

function progressLabel(progress: Progress): string {
  if (progress.stage !== "downloading") return t(`progress.${progress.stage}`);
  const percent = progress.total ? `${Math.round((progress.received / progress.total) * 100)} %` : `${Math.round(progress.received / 1048576)} Mo`;
  return t("progress.downloading", { percent });
}

export default function App() {
  const [page, setPage] = useState<Page>("modules");
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [palette, setPalette] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      setModules(await modulesRemote());
      setCheckedAt(new Date());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    modulesLocal().then(setModules).then(refresh);
    const timer = setInterval(refresh, CHECK_EVERY);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback(
    async (status: ModuleStatus) => {
      const id = status.module.id;
      setErrors(({ [id]: _, ...rest }) => rest);
      try {
        if (status.action === "install" || status.action === "update") {
          await installModule(id, (progress) => setBusy((all) => ({ ...all, [id]: progressLabel(progress) })));
          await refresh();
        } else if (status.action === "releasePage") {
          await openReleases(id);
        } else {
          await openModule(id);
        }
      } catch (error) {
        setErrors((all) => ({ ...all, [id]: String(error) }));
      } finally {
        setBusy(({ [id]: _, ...rest }) => rest);
      }
    },
    [refresh],
  );

  const commands = useMemo<Command[]>(
    () => [
      ...modules
        .filter((status) => CAN_RUN.includes(status.action))
        .map((status) => ({
          id: `run-${status.module.id}`,
          label: `${t(`action.${status.action}`)} · ${status.module.name}`,
          run: () => run(status),
        })),
      ...PAGES.map((target) => ({ id: `page-${target}`, label: t(target), run: () => setPage(target) })),
      { id: "refresh", label: t("refresh"), run: refresh },
    ],
    [modules, run, refresh],
  );

  const appWindow = getCurrentWindow();

  return (
    <div className="app">
      <header className="titlebar" onMouseDown={(event) => event.button === 0 && event.target === event.currentTarget && appWindow.startDragging()}>
        <b className="brand">ETHONE</b>
        <div className="winbtns">
          <button aria-label={t("minimize")} onClick={() => appWindow.minimize()}>
            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 5h8" /></svg>
          </button>
          <button aria-label={t("maximize")} onClick={() => appWindow.toggleMaximize()}>
            <svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1.5" y="1.5" width="7" height="7" /></svg>
          </button>
          <button className="close" aria-label={t("close")} onClick={() => appWindow.close()}>
            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" /></svg>
          </button>
        </div>
      </header>
      <nav className="side">
        {PAGES.map((target) => (
          <button key={target} className={page === target ? "on" : ""} aria-current={page === target ? "page" : undefined} onClick={() => setPage(target)}>
            {t(target)}
          </button>
        ))}
        <button className="palette-hint" onClick={() => setPalette(true)}>
          {t("commands")} <kbd>Ctrl K</kbd>
        </button>
      </nav>
      <main className="content">
        {page === "modules" && (
          <ModulesPage modules={modules} checking={checking} checkedAt={checkedAt} busy={busy} errors={errors} onRun={run} onRefresh={refresh} onDismiss={(id) => setErrors(({ [id]: _, ...rest }) => rest)} />
        )}
        {page === "journal" && <JournalPage />}
        {page === "about" && <AboutPage />}
      </main>
      {palette && <Palette commands={commands} onClose={() => setPalette(false)} />}
    </div>
  );
}
