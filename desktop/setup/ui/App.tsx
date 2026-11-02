import { useEffect, useMemo, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import Backdrop from "../../src/Backdrop";
import { lang, t } from "../../src/i18n";
import { stepEnter } from "../../src/motion";
import { setLanguage } from "../../src/settings";
import { WindowControls, WindowLight } from "../../src/ui";
import { DoneScreen, MaintenanceScreen, ModulesScreen, OptionsScreen, ProgressScreen, UninstalledScreen, WelcomeScreen } from "./screens";
import { Item, Row, SetupEvent, SetupState } from "./types";

type Screen = "welcome" | "maintenance" | "modules" | "options" | "progress" | "done" | "uninstalled";

export default function App() {
  const [state, setState] = useState<SetupState | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [selected, setSelected] = useState<string[]>([]);
  const [dir, setDir] = useState("");
  const [desktop, setDesktop] = useState(true);
  const [withEthone, setWithEthone] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = () =>
    invoke<SetupState>("setup_state").then((next) => {
      setState(next);
      setDir((current) => current || next.defaultDir);
      return next;
    });

  useEffect(() => {
    reload().then((next) => {
      if (next.installed) setScreen("maintenance");
      void invoke("window_ready");
    });
    invoke<Row[]>("setup_modules").then(setRows, () => setRows([]));
  }, []);

  const planItems = (ethone: boolean, ids: string[]) => [
    ...(ethone ? [{ id: "ethone", name: "Ethone", stage: "waiting" as const, value: null }] : []),
    ...ids.map((id) => ({ id, name: rows?.find((row) => row.id === id)?.name ?? id, stage: "waiting" as const, value: null })),
  ];

  const start = async (ethone: boolean, ids: string[], installDir: string | null) => {
    setError(null);
    setItems(planItems(ethone, ids));
    setScreen("progress");
    const on = new Channel<SetupEvent>();
    on.onmessage = (event) =>
      setItems((all) =>
        all.map((item) => {
          if (item.id !== event.id) return item;
          if (event.kind === "start") return { ...item, stage: "downloading", value: null };
          if (event.kind === "done") return { ...item, stage: event.ok ? "ok" : "failed", value: null, detail: event.detail };
          const { progress } = event;
          if (progress.stage === "downloading") return { ...item, stage: "downloading", value: progress.total ? progress.received / progress.total : null };
          return { ...item, stage: progress.stage, value: null };
        }),
      );
    try {
      await invoke("setup_run", { plan: { ethone, dir: installDir, desktop, modules: ids }, on });
    } catch (reason) {
      setError(String(reason));
    }
    await reload();
    invoke<Row[]>("setup_modules").then(setRows, () => undefined);
    setScreen("done");
  };

  const firstInstall = !state?.installed;
  const requiredBytes = useMemo(() => {
    const modules = selected.reduce((sum, id) => sum + (rows?.find((row) => row.id === id)?.size ?? 0), 0);
    return (withEthone ? (state?.payloadBytes ?? 0) * 3 : 0) + modules * 3;
  }, [selected, rows, withEthone, state]);

  const uninstall = async () => {
    setError(null);
    try {
      await invoke("setup_uninstall");
      await reload();
      setScreen("uninstalled");
    } catch (reason) {
      setError(String(reason));
    }
  };

  return (
    <motion.div className="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.14 }}>
      <Backdrop />
      <WindowLight success={screen === "done" && items.every((item) => item.stage === "ok")} />
      <header className="login-bar" data-tauri-drag-region>
        <button type="button" className="lang" onClick={() => setLanguage(lang === "fr" ? "en" : "fr")} aria-label={t("language")}>{lang === "fr" ? "Français" : "English"}</button>
        <WindowControls canMaximize={false} />
      </header>
      {state && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={screen} className="setup-main" variants={stepEnter} initial="initial" animate="animate" exit="exit">
            {screen === "welcome" && <WelcomeScreen state={state} onStandard={() => start(true, [], state.defaultDir)} onCustom={() => { setWithEthone(true); setScreen("modules"); }} />}
            {screen === "maintenance" && <MaintenanceScreen state={state} error={error} onAdd={() => { setWithEthone(false); setSelected([]); setScreen("modules"); }} onRepair={() => start(true, [], null)} onUninstall={uninstall} onRecheck={reload} />}
            {screen === "modules" && <ModulesScreen rows={rows} selected={selected} onChange={setSelected} onBack={() => setScreen(firstInstall ? "welcome" : "maintenance")} onNext={() => (withEthone ? setScreen("options") : start(false, selected, null))} nextIsInstall={!withEthone} />}
            {screen === "options" && <OptionsScreen state={state} rows={rows} selected={selected} dir={dir} desktop={desktop} requiredBytes={requiredBytes} onDir={setDir} onDesktop={setDesktop} onBack={() => setScreen("modules")} onInstall={() => start(true, selected, dir)} />}
            {screen === "progress" && <ProgressScreen items={items} />}
            {screen === "done" && <DoneScreen items={items} error={error} installed={!!state.installed} onRetry={() => start(items.some((item) => item.id === "ethone" && item.stage === "failed"), items.filter((item) => item.id !== "ethone" && item.stage === "failed").map((item) => item.id), firstInstall ? dir : null)} />}
            {screen === "uninstalled" && <UninstalledScreen />}
          </motion.main>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
